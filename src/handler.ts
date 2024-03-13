import { Renderer, RendererOption } from "./renderer";
import { RenderHandler } from "./renderHandler";
import { Layer } from "./styleEvaluator/types";
import { TileCoordinates } from "./types";

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
    currentLayer?: Layer;
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

  async pick(options: { requestedTile: TileCoordinates; longitude: number; latitude: number }) {
    return (
      (await this.renderer?.pickFeatures(
        options.requestedTile,
        options.longitude,
        options.latitude,
      )) ?? []
    );
  }

  dispose(): void {}
}
