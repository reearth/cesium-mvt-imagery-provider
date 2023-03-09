import { type VectorTile, VectorTileFeature } from "@mapbox/vector-tile";

import { FeatureHandler, Style, TileCoordinates } from "./types";

export function renderCanvas({
  tile,
  layerName,
  canvas,
  requestedTile,
  styler,
  onFeatureRender,
  onFeaturesRendered,
}: {
  tile: VectorTile;
  layerName: string;
  canvas: HTMLCanvasElement | OffscreenCanvas;
  requestedTile: TileCoordinates;
  styler?: FeatureHandler<Style>;
  onFeatureRender?: FeatureHandler<boolean | void>;
  onFeaturesRendered?: () => void;
}) {
  const layer = tile?.layers[layerName];
  if (!layer) {
    throw new Error("layer not found: " + layerName);
  }

  const context = canvas.getContext("2d") as
    | CanvasRenderingContext2D
    | OffscreenCanvasRenderingContext2D
    | null;
  if (!context) {
    throw new Error("context is null");
  }

  context.strokeStyle = "black";
  context.lineWidth = 1;

  // Vector tile works with extent [0, 4095], but canvas is only [0,255]
  const extentFactor = canvas.width / layer.extent;

  for (let i = 0; i < layer.length; i++) {
    const feature = layer.feature(i);

    // Early return.
    if (onFeatureRender && !onFeatureRender(feature, requestedTile)) {
      continue;
    }

    if (VectorTileFeature.types[feature.type] === "Polygon") {
      const style = styler?.(feature, requestedTile);
      if (!style) {
        continue;
      }
      context.fillStyle = style.fillStyle ?? context.fillStyle;
      context.strokeStyle = style.strokeStyle ?? context.strokeStyle;
      context.lineWidth = style.lineWidth ?? context.lineWidth;
      context.lineJoin = style.lineJoin ?? context.lineJoin;

      context.beginPath();

      const coordinates = feature.loadGeometry();

      // Polygon rings
      for (let i2 = 0; i2 < coordinates.length; i2++) {
        let pos = coordinates[i2][0];
        context.moveTo(pos.x * extentFactor, pos.y * extentFactor);

        // Polygon ring points
        for (let j = 1; j < coordinates[i2].length; j++) {
          pos = coordinates[i2][j];
          context.lineTo(pos.x * extentFactor, pos.y * extentFactor);
        }
      }

      if ((style.lineWidth ?? 1) > 0) {
        context.stroke();
      }
      context.fill();
    } else {
      console.log(
        `Unexpected geometry type: ${feature.type} in region map on tile ${[
          requestedTile.level,
          requestedTile.x,
          requestedTile.y,
        ].join("/")}`,
      );
    }
  }

  // if ("commit" in context) {
  //   context.commit();
  // }

  onFeaturesRendered?.();
}
