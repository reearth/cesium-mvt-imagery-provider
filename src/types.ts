import type { VectorTileFeature } from "@mapbox/vector-tile";

export type RenderRequest = {
  type: "render";
  id: string;
  layerName: string;
  canvas: OffscreenCanvas;
  data: ArrayBuffer;
  requestedTile: TileCoordinates;
};

export type RenderRequests = {
  type: "renderAll";
  requests: RenderRequest[];
};

export type RenderResponse = {
  type: "ok" | "error";
  id: string;
  error?: any;
};

export type TileCoordinates = {
  x: number;
  y: number;
  level: number;
};

export type Style = {
  fillStyle?: string;
  strokeStyle?: string;
  lineWidth?: number;
  lineJoin?: CanvasLineJoin;
};

export type FeatureHandler<R> = (feature: VectorTileFeature, tileCoords: TileCoordinates) => R;
