import { VectorTileFeature } from "@mapbox/vector-tile";
import { LineString, Polygon, Point } from "@turf/turf";
import { ImageryLayerFeatureInfo } from "cesium";

import { evalFeature } from "./styleEvaluator/evaluator";
import { Feature, Geometry, LayerSimple } from "./styleEvaluator/types";
import { TileCoordinates } from "./types";
import { generateIDWithMD5 } from "./utils";

export const onSelectFeature = (
  mvtFeature: VectorTileFeature,
  tile: TileCoordinates,
  layer?: LayerSimple,
) => {
  if (!layer) {
    return;
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
  if (!appearanceType) return;

  const id = mvtFeature.id
    ? String(mvtFeature.id)
    : idFromGeometry(mvtFeature.loadGeometry(), tile);
  const feature = evalFeature(layer, makeFeature(id, mvtFeature, tile, appearanceType));
  const info = new ImageryLayerFeatureInfo();
  info.data = {
    layerId: layer?.id,
    featureId: id,
    feature,
    appearanceType: VectorTileFeature.types[mvtFeature.type].toLowerCase(),
  };
  return info;
};

const idFromGeometry = (
  geometry: ReturnType<VectorTileFeature["loadGeometry"]>,
  tile: TileCoordinates,
) => {
  const id = [tile.x, tile.y, tile.level, ...geometry.flatMap(i => i.map(j => [j.x, j.y]))].join(
    ":",
  );

  return generateIDWithMD5(id);
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
