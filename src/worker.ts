import { VectorTile, type VectorTileFeature } from "@mapbox/vector-tile";
import Pbf from "pbf";

import { renderCanvas } from "./canvas";
import type {
  RenderRequest,
  RenderRequests,
  RenderResponse,
  Style,
  TileCoordinates,
} from "./types";

self.addEventListener("message", (e: MessageEvent<RenderRequest | RenderRequests>) => {
  const requests =
    e.data?.type === "renderAll" ? e.data.requests : e.data?.type === "render" ? [e.data] : [];
  for (const req of requests) {
    const res = processRequest(req);
    self.postMessage(res);
  }
});

function processRequest(request: RenderRequest): RenderResponse {
  try {
    const tile = parseMVT(request.data);
    renderCanvas({
      tile,
      canvas: request.canvas,
      layerName: request.layerName,
      requestedTile: request.requestedTile,
      styler,
    });
    return {
      type: "ok",
      id: request.id,
    };
  } catch (error) {
    return {
      type: "error",
      id: request.id,
      error,
    };
  }
}

function parseMVT(ab: ArrayBuffer): VectorTile {
  return new VectorTile(new Pbf(ab));
}

// TODO: style features on worker
function styler(_feature: VectorTileFeature, _requestedTiles: TileCoordinates): Style {
  return {
    fillStyle: "red",
  };
}
