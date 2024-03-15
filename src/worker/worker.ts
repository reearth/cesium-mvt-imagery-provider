import { ImageryLayerFeatureInfo } from "cesium";
import { type TransferDescriptor } from "threads";
import { expose } from "threads/worker";

import { Renderer, RendererOption } from "../renderer";
import { LayerSimple } from "../styleEvaluator/types";
import { TileCoordinates } from "../types";

const tileRenderers = new Map<string, Renderer>();

function createTileRenderKey({ urlTemplate }: RendererOption): string {
  return `${urlTemplate}`;
}

export interface RenderTileParams extends RendererOption {
  requestedTile: TileCoordinates;
  canvas: OffscreenCanvas;
  scaleFactor: number;
  currentLayer?: LayerSimple;
  updatedAt?: number;
}

export interface PickTileParams extends RendererOption {
  requestedTile: TileCoordinates;
  longitude: number;
  latitude: number;
  currentLayer?: LayerSimple;
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

const renderTile = async ({
  requestedTile,
  canvas,
  scaleFactor,
  ...renderOptions
}: RenderTileParams): Promise<void> => {
  const context = canvas.getContext("2d") as OffscreenCanvasRenderingContext2D;
  if (!context) {
    return;
  }
  const tileRenderer = await getTileRenderer(renderOptions);
  await tileRenderer.render(
    context,
    requestedTile,
    scaleFactor,
    renderOptions.currentLayer,
    renderOptions.updatedAt,
  );

  await new Promise(resolve => {
    requestAnimationFrame(resolve);
  });
};

const pickTile = async ({
  requestedTile,
  longitude,
  latitude,
  currentLayer,
  ...renderOptions
}: PickTileParams): Promise<ImageryLayerFeatureInfo[]> => {
  const tileRenderer = await getTileRenderer(renderOptions);
  return await tileRenderer.pickFeatures(requestedTile, longitude, latitude, currentLayer);
};

expose({
  renderTile,
  pickTile,
});

export type RendererWorker = object & {
  renderTile: (params: TransferDescriptor<RenderTileParams>) => void;
  pickTile: (params: TransferDescriptor<PickTileParams>) => ImageryLayerFeatureInfo[];
};
