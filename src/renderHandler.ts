import { RendererOption } from "./renderer";
import { LayerSimple } from "./styleEvaluator/types";
import type { TileCoordinates, URLTemplate } from "./types";

export abstract class RenderHandler {
  abstract init(options: RendererOption): Promise<void>;
  abstract render(options: {
    canvas: HTMLCanvasElement;
    requestedTile: TileCoordinates;
    scaleFactor: number;
    urlTemplate: URLTemplate;
    layerNames: string[];
    maximumLevel: number;
    currentLayer?: LayerSimple;
  }): Promise<void>;
  abstract dispose(): void;
}
