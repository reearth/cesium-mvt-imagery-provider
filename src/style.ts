import { VectorTileFeature } from "@mapbox/vector-tile";
import { LineString, Point, Polygon } from "@turf/turf";
import { LRUCache } from "lru-cache";

import { evalFeature } from "./styleEvaluator/evaluator";
import { ComputedFeature, Feature, Geometry, Layer } from "./styleEvaluator/types";
import { Style, TileCoordinates } from "./types";

const cachedStyleMap = new LRUCache<string, any>({ max: 1000 });

export const evalStyle = (
  mvtFeature: VectorTileFeature,
  tile: TileCoordinates,
  layer?: Layer,
): Style | void => {
  const styleCacheKey = JSON.stringify(mvtFeature.properties);
  const cachedStyle = cachedStyleMap.get(styleCacheKey);
  if (cachedStyle) {
    return cachedStyle;
  }
  const appearanceType = (() => {
    switch (VectorTileFeature.types[mvtFeature.type]) {
      case "Polygon":
        return "polygon";
      case "LineString":
        return "polyline";
      case "Point":
        return "marker";
      default:
        return;
    }
  })();
  const computedFeature = ((): ComputedFeature | void => {
    if (layer?.type !== "simple" || !appearanceType) {
      return;
    }
    const feature = makeFeature("", mvtFeature, tile, appearanceType);
    if (feature) {
      return evalFeature?.(layer, feature);
    }
  })();

  const style = (() => {
    if (appearanceType === "polygon") {
      const polygon = computedFeature?.polygon;
      return {
        fillStyle:
          (polygon?.fill ?? true) && (polygon?.show ?? true) ? polygon?.fillColor : "rgba(0,0,0,0)", // hide the feature
        strokeStyle:
          polygon?.stroke && (polygon?.show ?? true) ? polygon?.strokeColor : "rgba(0,0,0,0)", // hide the feature
        lineWidth: polygon?.strokeWidth,
        lineJoin: polygon?.lineJoin,
      };
    }
    if (appearanceType === "polyline") {
      const polyline = computedFeature?.polyline;
      return {
        fillStyle:
          (polyline?.strokeColor ?? true) && (polyline?.show ?? true)
            ? polyline?.strokeColor
            : "rgba(0,0,0,0)", // hide the feature
        strokeStyle:
          polyline?.strokeColor && (polyline?.show ?? true)
            ? polyline?.strokeColor
            : "rgba(0,0,0,0)", // hide the feature
        lineWidth: polyline?.strokeWidth,
      };
    }
    if (appearanceType === "marker") {
      const marker = computedFeature?.marker;
      return {
        fillStyle:
          (marker?.pointColor ?? true) && (marker?.show ?? true)
            ? marker?.pointColor
            : "rgba(0,0,0,0)", // hide the feature
        strokeStyle:
          marker?.pointColor && (marker?.show ?? true) ? marker?.pointColor : "rgba(0,0,0,0)", // hide the feature
        lineWidth: marker?.pointSize,
      };
    }
    return;
  })();
  cachedStyleMap.set(styleCacheKey, style);
  return style;
};

const makeFeature = (
  id: string,
  feature: VectorTileFeature,
  tile: TileCoordinates,
  appearance: "polygon" | "polyline" | "marker",
): Feature => {
  const geometry = feature.loadGeometry();
  const [type, coordinates] = (() => {
    if (appearance === "polygon") {
      return [
        "Polygon" as Polygon["type"],
        geometry.map(points => points.map(p => [p.x, p.y])) as Polygon["coordinates"],
      ];
    }
    if (appearance === "polyline") {
      return [
        "LineString" as LineString["type"],
        geometry[0].map(p => [p.x, p.y]) as LineString["coordinates"],
      ];
    }
    if (appearance === "marker") {
      return [
        "Point" as Point["type"],
        [geometry[0][0].x, geometry[0][0].y] as Point["coordinates"],
      ];
    }

    throw new Error(`Unexpected appearance ${appearance}`);
  })();
  return {
    type: "feature",
    id,
    geometry: {
      type,
      coordinates,
    } as Geometry,
    properties: feature.properties,
    range: {
      x: tile.x,
      y: tile.y,
      z: tile.level,
    },
  };
};
