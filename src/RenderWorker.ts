import { WebMercatorTilingScheme } from "cesium";
import { type TransferDescriptor } from "threads";
import { expose } from "threads/worker";

import { Renderer } from "./Renderer";
import { ImageryProviderOption, TileCoordinates } from "./types";
import { LayerSimple } from "./styleEvaluator/types";

export type RendererOption = Pick<
  ImageryProviderOption,
  | "onFeaturesRendered"
  | "onRenderFeature"
  | "parseTile"
  | "style"
  | "onSelectFeature"
  | "urlTemplate"
  | "maximumLevel"
> & { layerNames: string[]; tilingScheme: WebMercatorTilingScheme; currentLayer?: LayerSimple };

export interface RenderTileParams extends RendererOption {
  coords: TileCoordinates;
  canvas: OffscreenCanvas;
  scaleFactor: number;
}

const tileRenderers = new Map<string, Renderer>();

function createTileRenderKey({ urlTemplate, style, maximumLevel }: RendererOption): string {
  return `${urlTemplate}:${
    typeof style === "string" ? style : JSON.stringify(style)
  }:${maximumLevel}`;
}

async function getTileRenderer(options: RendererOption): Promise<Renderer> {
  const key = createTileRenderKey(options);
  let tileRenderer = tileRenderers.get(key);
  if (tileRenderer == null) {
    tileRenderer = new Renderer(options); 
    tileRenderers.set(key, tileRenderer);
  }
  return tileRenderer;
}

expose({
  renderTile: async ({
    coords,
    canvas,
    scaleFactor,
    ...renderOptions
  }: RenderTileParams): Promise<void> => {
    const context = canvas.getContext("2d") as OffscreenCanvasRenderingContext2D;
    if (!context) {
      return;
    }
    const tileRenderer = await getTileRenderer(renderOptions);

    await tileRenderer.render(context, coords, scaleFactor, renderOptions.currentLayer);

    await new Promise(resolve => {
      requestAnimationFrame(resolve);
    });
  },
});

export type RendererWorker = object & {
  renderTile: (params: TransferDescriptor<RenderTileParams>) => void;
};
