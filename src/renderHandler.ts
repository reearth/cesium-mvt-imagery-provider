import type { ImageryLayerFeatureInfo } from "cesium";

import type { RendererOption } from "./renderer";
import type { TileCoordinates } from "./types";

export abstract class RenderHandler {
  abstract init(options: RendererOption): Promise<void>;
  abstract render(options: {
    canvas: HTMLCanvasElement;
    requestedTile: TileCoordinates;
    scaleFactor: number;
  }): Promise<void>;
  abstract pick(options: {
    requestedTile: TileCoordinates;
    longitude: number;
    latitude: number;
  }): Promise<ImageryLayerFeatureInfo[]>;
  abstract dispose(): void;
}
