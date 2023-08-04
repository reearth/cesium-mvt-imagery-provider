import { ImageryLayerFeatureInfo } from "cesium";

import { RendererOption } from "../renderer";
import { TileCoordinates } from "../types";

export type WorkerInstructionMessage =
  | {
      type: "init";
      options: RendererOption;
      time: string;
    }
  | {
      type: "render";
      canvas: OffscreenCanvas;
      requestedTile: TileCoordinates;
      scaleFactor: number;
      time: string;
    }
  | {
      type: "pick";
      requestedTile: TileCoordinates;
      longitude: number;
      latitude: number;
      time: string;
    };

export type WorkerResultMessage = (
  | {
      type: "init";
      time: string;
    }
  | { type: "render"; time: string }
  | { type: "pick"; info: ImageryLayerFeatureInfo[]; time: string }
) & { worker: true };
