import { VectorTile, VectorTileFeature } from "@mapbox/vector-tile";
import { ImageryLayerFeatureInfo } from "cesium";
import { LayerSimple } from "./styleEvaluator/types";

export type Style = {
  fillStyle?: string;
  strokeStyle?: string;
  lineWidth?: number;
  lineJoin?: CanvasLineJoin;
};

export type URLTemplate = `${
  | `http${"s" | ""}://`
  | ""}${string}/{z}/{x}/{y}${string}`;

export type FeatureHandler<R> = (
  feature: VectorTileFeature,
  tileCoords: TileCoordinates
) => R;

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
  onRenderFeature?: FeatureHandler<boolean | void>;
  onFeaturesRendered?: () => void;
  style?: FeatureHandler<Style>;
  onSelectFeature?: FeatureHandler<ImageryLayerFeatureInfo | void>;
  parseTile?: (url?: string) => Promise<VectorTile | undefined>;
};

export const CESIUM_CANVAS_SIZE = 256;

/// <reference types="offscreencanvas" />
