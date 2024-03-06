import type { ImageryLayerFeatureInfo } from "cesium";

import { RendererOption } from "./RenderWorker";
import type { TileCoordinates } from "./types";
import { Layer } from "./styleEvaluator/types";

export abstract class RenderHandler {
  abstract init(options: RendererOption): Promise<void>;
  abstract render(options: {
    canvas: HTMLCanvasElement;
    requestedTile: TileCoordinates;
    scaleFactor: number;
    currentLayer?: Layer;
  }): Promise<void>;
  abstract pick(options: {
    requestedTile: TileCoordinates;
    longitude: number;
    latitude: number;
  }): Promise<ImageryLayerFeatureInfo[]>;
  abstract dispose(): void;
}
