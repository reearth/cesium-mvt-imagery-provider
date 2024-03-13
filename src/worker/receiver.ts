import { Renderer, RendererOption } from "../renderer";
import { LayerSimple } from "../styleEvaluator/types";
import { TileCoordinates } from "../types";

import { WorkerInstructionMessage, WorkerResultMessage } from "./type";

let CACHED_RENDERER: Renderer | undefined = undefined;

onmessage = async (evt: MessageEvent<WorkerInstructionMessage>) => {
  console.log("Worker: Receive message: ", evt.data);
  switch (evt.data.type) {
    case "init": {
      const options: RendererOption = {
        ...evt.data.options,
      };
      initialize(options, evt.data.time);
      break;
    }
    case "render": {
      console.log("render message recieved!!!");
      await render(
        evt.data.canvas,
        evt.data.requestedTile,
        evt.data.scaleFactor,
        evt.data.time,
        evt.data.currentLayer,
      );
      break;
    }
    case "pick": {
      await pick(evt.data.requestedTile, evt.data.longitude, evt.data.latitude, evt.data.time);
      break;
    }
  }
};

const initialize = (options: RendererOption, time: string) => {
  const renderer = new Renderer(options);
  CACHED_RENDERER = renderer;

  const msg: WorkerResultMessage = {
    type: "init",
    time,
    worker: true,
  };
  postMessage(msg);
};

const render = async (
  canvas: OffscreenCanvas,
  requestedTile: TileCoordinates,
  scaleFactor: number,
  time: string,
  currentLayer?: LayerSimple,
) => {
  const renderer = CACHED_RENDERER;
  if (!renderer) {
    const msg: WorkerResultMessage = {
      type: "render",
      time,
      worker: true,
    };
    postMessage(msg);
    return;
  }

  const ctx = canvas.getContext("2d") as OffscreenCanvasRenderingContext2D;
  if (!ctx) {
    return;
  }

  try {
    await renderer.render(ctx, requestedTile, scaleFactor, currentLayer);
  } catch {
    // noop
  }

  await new Promise(resolve => {
    requestAnimationFrame(resolve);
  });

  const msg: WorkerResultMessage = {
    type: "render",
    time,
    worker: true,
  };
  postMessage(msg);
};

const pick = async (
  requestedTile: TileCoordinates,
  longitude: number,
  latitude: number,
  time: string,
) => {
  const renderer = CACHED_RENDERER;
  if (!renderer) {
    return;
  }

  const info = await renderer.pickFeatures(requestedTile, longitude, latitude);

  const msg: WorkerResultMessage = {
    type: "pick",
    info,
    time,
    worker: true,
  };
  postMessage(msg);
};
