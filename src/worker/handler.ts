import { RendererOption } from "../renderer";
import { RenderHandler } from "../renderHandler";
import { TileCoordinates } from "../types";

import { WorkerInstructionMessage, WorkerResultMessage } from "./type";

export class RenderWorkerHandler extends RenderHandler {
  worker: Worker;
  constructor(worker: Worker) {
    super();
    this.worker = worker;
  }

  async init(options: RendererOption) {
    const time = new Date().toISOString();
    const msg: WorkerInstructionMessage = {
      type: "init",
      options,
      time,
    };
    this.worker.postMessage(msg);
    await this.wait("init", time);
  }

  async render(options: {
    canvas: HTMLCanvasElement;
    requestedTile: TileCoordinates;
    scaleFactor: number;
  }) {
    const offscreen = options.canvas.transferControlToOffscreen();
    const time = new Date().toISOString();
    const msg: WorkerInstructionMessage = {
      ...options,
      type: "render",
      canvas: offscreen,
      time,
    };
    this.worker.postMessage(msg, [offscreen]);
    await this.wait("render", time);
  }

  pick(options: { requestedTile: TileCoordinates; longitude: number; latitude: number }) {
    const time = new Date().toISOString();
    const msg: WorkerInstructionMessage = {
      type: "pick",
      time,
      ...options,
    };
    this.worker.postMessage(msg);
    return this.wait("pick", time).then(msg => (msg.type === "pick" ? msg.info : []));
  }

  wait = (type: WorkerResultMessage["type"], time: string) =>
    new Promise<WorkerResultMessage>(resolve => {
      const f = (msg: MessageEvent<WorkerResultMessage>) => {
        if (!msg.data.worker || msg.data.type !== type || msg.data.time !== time) {
          return;
        }

        resolve(msg.data);

        this.worker.removeEventListener("message", f);
      };
      this.worker.addEventListener("message", f);
    });

  dispose(): void {
    this.worker.terminate();
  }
}
