import { type TransferDescriptor } from "threads";
import { expose } from "threads/worker";

import { RenderTileParams, Renderer, RendererOption } from "./renderer";

const tileRenderers = new Map<string, Renderer>();

function createTileRenderKey({ urlTemplate, maximumLevel }: RendererOption): string {
  return `${urlTemplate}:${maximumLevel}`;
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
    console.log("TileRenderer: ", tileRenderer);

    await tileRenderer.render(
      context,
      coords,
      scaleFactor,
      renderOptions.currentLayer,
      renderOptions.updatedAt,
    );

    await new Promise(resolve => {
      requestAnimationFrame(resolve);
    });
  },
});

export type RendererWorker = object & {
  renderTile: (params: TransferDescriptor<RenderTileParams>) => void;
};
