import { Transfer } from "threads";

import { RendererOption } from "../renderer";
import { RenderHandler } from "../renderHandler";
import { LayerSimple } from "../styleEvaluator/types";
import { TileCoordinates, URLTemplate } from "../types";

import { destroy, queue } from "./workerPool";

export class RenderWorkerHandler extends RenderHandler {
  constructor() {
    super();
  }

  async init(_options: RendererOption) {}

  async render(options: {
    canvas: HTMLCanvasElement;
    requestedTile: TileCoordinates;
    scaleFactor: number;
    urlTemplate: URLTemplate;
    layerNames: string[];
    maximumLevel: number;
    currentLayer?: LayerSimple;
  }): Promise<void> {
    const { canvas, ...optionsWithoutCanvas } = options;
    const offscreen = canvas.transferControlToOffscreen();

    await queue(async task => {
      await task.renderTile(
        Transfer(
          {
            canvas: offscreen,
            ...optionsWithoutCanvas,
          },
          [offscreen],
        ),
      );
    });
  }

  dispose(): void {
    destroy();
  }
}
