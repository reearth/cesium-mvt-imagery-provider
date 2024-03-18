import { VectorTileFeature } from "@mapbox/vector-tile";

import { LayerSimple } from "./styleEvaluator/types";

export type Style = {
  fillStyle?: string;
  strokeStyle?: string;
  lineWidth?: number;
  lineJoin?: CanvasLineJoin;
};

export type URLTemplate = `${`http${"s" | ""}://` | ""}${string}/{z}/{x}/{y}${string}`;

export type FeatureHandler<R> = (feature: VectorTileFeature, tileCoords: TileCoordinates) => R;

export type TileCoordinates = {
  x: number;
  y: number;
  level: number;
};

export type ImageryProviderOption = {
  urlTemplate: URLTemplate;
  layerName: string;
  minimumLevel?: number;
  maximumLevel?: number;
  maximumNativeZoom?: number;
  credit?: string;
  resolution?: number;
  worker?: boolean;
  layer?: LayerSimple;
};

export const CESIUM_CANVAS_SIZE = 256;

/// <reference types="offscreencanvas" />
