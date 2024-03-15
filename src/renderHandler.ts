import type { ImageryLayerFeatureInfo } from "cesium";

import { RendererOption } from "./renderer";
import { LayerSimple } from "./styleEvaluator/types";
import type { TileCoordinates } from "./types";

export abstract class RenderHandler {
  abstract init(options: RendererOption): Promise<void>;
  abstract render(options: {
    canvas: HTMLCanvasElement;
    requestedTile: TileCoordinates;
    scaleFactor: number;
    currentLayer?: LayerSimple;
    updatedAt?: number;
  }): Promise<void>;
  abstract pick(options: {
    requestedTile: TileCoordinates;
    longitude: number;
    latitude: number;
    currentLayer?: LayerSimple;
  }): Promise<ImageryLayerFeatureInfo[]>;
  abstract dispose(): void;
}
