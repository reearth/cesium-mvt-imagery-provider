import { Renderer, RendererOption } from "./renderer";
import { RenderHandler } from "./renderHandler";
import { LayerSimple } from "./styleEvaluator/types";
import { TileCoordinates, URLTemplate } from "./types";

export class RenderMainHandler extends RenderHandler {
  renderer?: Renderer;
  constructor() {
    super();
  }

  async init(options: RendererOption) {
    this.renderer = new Renderer(options);
  }

  async render(options: {
    canvas: HTMLCanvasElement;
    requestedTile: TileCoordinates;
    scaleFactor: number;
    urlTemplate: URLTemplate;
    layerNames: string[];
    currentLayer?: LayerSimple;
    updatedAt?: number;
  }) {
    const ctx = options.canvas.getContext("2d");
    if (!ctx) {
      return;
    }
    await this.renderer?.render(
      ctx,
      options.requestedTile,
      options.scaleFactor,
      options.currentLayer,
      options.updatedAt,
    );
  }

  async pick(options: {
    requestedTile: TileCoordinates;
    longitude: number;
    latitude: number;
    urlTemplate: URLTemplate;
    layerNames: string[];
    currentLayer?: LayerSimple;
  }) {
    return (
      (await this.renderer?.pickFeatures(
        options.requestedTile,
        options.longitude,
        options.latitude,
        options.currentLayer,
      )) ?? []
    );
  }

  dispose(): void {}
}
