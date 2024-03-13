import { WebMercatorTilingScheme } from "@cesium/engine";
import { VectorTile, VectorTileFeature } from "@mapbox/vector-tile";
import Pbf from "pbf";

import { evalStyle } from "./style";
import { Layer, LayerSimple } from "./styleEvaluator/types";
import { TileCoordinates, URLTemplate, CESIUM_CANVAS_SIZE, ImageryProviderOption } from "./types";

const defaultParseTile = async (url?: string) => {
  const ab = await fetchResourceAsArrayBuffer(url);
  if (!ab) {
    return;
  }
  const tile = parseMVT(ab);
  return tile;
};

const parseMVT = (ab?: ArrayBuffer) => {
  return new VectorTile(new Pbf(ab));
};

const fetchResourceAsArrayBuffer = (url?: string) => {
  if (!url) {
    throw new Error("fetch request is failed because request url is undefined");
  }

  return fetch(url)
    .then(r => r.arrayBuffer())
    ?.catch(() => {});
};

let currentTime: number | undefined;

export type RendererOption = Pick<ImageryProviderOption, "urlTemplate" | "maximumLevel"> & {
  layerNames: string[];
  tilingScheme: WebMercatorTilingScheme;
};

export interface RenderTileParams extends RendererOption {
  coords: TileCoordinates;
  canvas: OffscreenCanvas;
  scaleFactor: number;
  currentLayer?: LayerSimple;
}

export type RenderingContext2D = CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D;

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export class Renderer {
  private _urlTemplate: URLTemplate;
  private _parseTile: (url?: string) => Promise<VectorTile | undefined>;
  // private readonly _tilingScheme: WebMercatorTilingScheme;
  private readonly _layerNames: string[];
  private readonly _tileWidth: number;
  private readonly _tileHeight: number;

  private readonly _tileCaches = new Map<string, VectorTile>();

  constructor(options: RendererOption) {
    this._parseTile = defaultParseTile;
    this._urlTemplate = options.urlTemplate;
    this._tileWidth = CESIUM_CANVAS_SIZE;
    this._tileHeight = CESIUM_CANVAS_SIZE;
    this._layerNames = options.layerNames;
    // this._tilingScheme = new WebMercatorTilingScheme();
  }

  async render(
    context: RenderingContext2D,
    requestedTile: TileCoordinates,
    scaleFactor: number,
    currentLayer?: Layer,
    updatedAt?: number,
  ) {
    const url = buildURLWithTileCoordinates(this._urlTemplate, requestedTile);
    await Promise.all(
      this._layerNames.map(n =>
        this._renderCanvas(url, context, requestedTile, n, scaleFactor, currentLayer, updatedAt),
      ),
    );
  }

  async _renderCanvas(
    url: string,
    context: RenderingContext2D,
    requestedTile: TileCoordinates,
    layerName: string,
    scaleFactor: number,
    currentLayer?: Layer,
    updatedAt?: number,
  ): Promise<void> {
    if (!url) return;

    const tile = await this._cachedTile(url);

    const layerNames = layerName.split(/, */).filter(Boolean);
    const layers = layerNames.map(ln => tile?.layers[ln]);

    if (!layers) {
      return;
    }

    context.strokeStyle = "black";
    context.fillStyle = "black";
    context.lineWidth = 1;

    // Improve resolution
    context.miterLimit = 2;
    context.setTransform(
      (this._tileWidth * scaleFactor) / CESIUM_CANVAS_SIZE,
      0,
      0,
      (this._tileHeight * scaleFactor) / CESIUM_CANVAS_SIZE,
      0,
      0,
    );

    layers.forEach(layer => {
      if (!layer) return;
      // Vector tile works with extent [0, 4095], but canvas is only [0,255]
      const extentFactor = CESIUM_CANVAS_SIZE / layer.extent;

      for (let i = 0; i < layer.length; i++) {
        const feature = layer.feature(i);

        // Early return.
        if (onRenderFeature(updatedAt)) {
          continue;
        }

        const style = evalStyle(feature, requestedTile, currentLayer);

        if (!style) {
          continue;
        }
        context.fillStyle = style.fillStyle ?? context.fillStyle;
        context.strokeStyle = style.strokeStyle ?? context.strokeStyle;
        context.lineWidth = style.lineWidth ?? context.lineWidth;
        context.lineJoin = style.lineJoin ?? context.lineJoin;

        if (VectorTileFeature.types[feature.type] === "Polygon") {
          this._renderPolygon(context, feature, extentFactor, (style.lineWidth ?? 1) > 0);
        } else if (VectorTileFeature.types[feature.type] === "Point") {
          this._renderPoint(context, feature, extentFactor);
        } else if (VectorTileFeature.types[feature.type] === "LineString") {
          this._renderLineString(context, feature, extentFactor);
        } else {
          console.error(
            `Unexpected geometry type: ${feature.type} in region map on tile ${[
              requestedTile.level,
              requestedTile.x,
              requestedTile.y,
            ].join("/")}`,
          );
        }
      }
    });
  }

  _renderPolygon(
    context: RenderingContext2D,
    feature: VectorTileFeature,
    extentFactor: number,
    shouldRenderLine: boolean,
  ) {
    context.beginPath();

    const coordinates = feature.loadGeometry();

    const draw = () => {
      if (shouldRenderLine) {
        context.stroke();
      }
      context.fill();
    };

    let verticesLength = 0;
    // Polygon rings
    for (let i2 = 0; i2 < coordinates.length; i2++) {
      const v = coordinates[i2];
      if (verticesLength + v.length > 5400) {
        draw();
        verticesLength = 0;
        context.beginPath();
      }

      let pos = v[0];
      context.moveTo(pos.x * extentFactor, pos.y * extentFactor);

      // Polygon ring points
      for (let j = 1; j < v.length; j++) {
        pos = v[j];
        context.lineTo(pos.x * extentFactor, pos.y * extentFactor);
      }
      verticesLength += v.length;
    }

    if (verticesLength > 0) draw();
  }

  _renderPoint(context: RenderingContext2D, feature: VectorTileFeature, extentFactor: number) {
    context.beginPath();

    const coordinates = feature.loadGeometry();

    for (let i2 = 0; i2 < coordinates.length; i2++) {
      const pos = coordinates[i2][0];
      const [x, y] = [pos.x * extentFactor, pos.y * extentFactor];

      // Handle lineWidth as radius
      const radius = context.lineWidth;

      context.beginPath();
      context.arc(x, y, radius, 0, 2 * Math.PI);
      context.fill();
    }
  }

  _renderLineString(context: RenderingContext2D, feature: VectorTileFeature, extentFactor: number) {
    context.beginPath();

    const coordinates = feature.loadGeometry();

    for (let i2 = 0; i2 < coordinates.length; i2++) {
      let pos = coordinates[i2][0];
      context.moveTo(pos.x * extentFactor, pos.y * extentFactor);

      for (let j = 1; j < coordinates[i2].length; j++) {
        pos = coordinates[i2][j];
        context.lineTo(pos.x * extentFactor, pos.y * extentFactor);
      }
    }
    context.stroke();
  }

  pickFeatures(requestedTile: TileCoordinates, longitude: number, latitude: number) {
    const url = buildURLWithTileCoordinates(this._urlTemplate, requestedTile);
    return this._pickFeaturesFromLayer(url, requestedTile, longitude, latitude);
  }

  async _pickFeaturesFromLayer(
    url: string,
    _requestedTile: TileCoordinates,
    _longitude: number,
    _latitude: number,
  ) {
    const tile = await this._cachedTile(url);

    const pf = await Promise.all(
      this._layerNames.map(async name => {
        const layer = tile?.layers[name];
        if (!layer) {
          return []; // return empty list of features for empty tile
        }
        let f: any;
        if (f) {
          return f;
        }
        return [];
      }),
    );

    return pf.flat();
  }

  // async _pickFeatures(
  //   requestedTile: TileCoordinates,
  //   longitude: number,
  //   latitude: number,
  //   layer: VectorTileLayer,
  // ): Promise<ImageryLayerFeatureInfo[]> {
  //   const boundRect = this._tilingScheme.tileXYToNativeRectangle(
  //     requestedTile.x,
  //     requestedTile.y,
  //     requestedTile.level,
  //   );
  //   const x_range = [boundRect.west, boundRect.east];
  //   const y_range = [boundRect.north, boundRect.south];

  //   const map = function (
  //     pos: Cartesian2,
  //     in_x_range: number[],
  //     in_y_range: number[],
  //     out_x_range: number[],
  //     out_y_range: number[],
  //   ) {
  //     const offset = new Cartesian2();
  //     // Offset of point from top left corner of bounding box
  //     Cartesian2.subtract(pos, new Cartesian2(in_x_range[0], in_y_range[0]), offset);
  //     const scale = new Cartesian2(
  //       (out_x_range[1] - out_x_range[0]) / (in_x_range[1] - in_x_range[0]),
  //       (out_y_range[1] - out_y_range[0]) / (in_y_range[1] - in_y_range[0]),
  //     );
  //     return Cartesian2.add(
  //       Cartesian2.multiplyComponents(offset, scale, new Cartesian2()),
  //       new Cartesian2(out_x_range[0], out_y_range[0]),
  //       new Cartesian2(),
  //     );
  //   };

  //   const features: ImageryLayerFeatureInfo[] = [];

  //   const vt_range = [0, layer.extent - 1];
  //   const pos = map(
  //     Cartesian2.fromCartesian3(
  //       this._tilingScheme.projection.project(new Cartographic(longitude, latitude)),
  //     ),
  //     x_range,
  //     y_range,
  //     vt_range,
  //     vt_range,
  //   );
  //   const point = new MPoint(pos.x, pos.y);

  //   for (let i = 0; i < layer.length; i++) {
  //     const feature = layer.feature(i);
  //     if (
  //       VectorTileFeature.types[feature.type] === "Polygon" &&
  //       isFeatureClicked(feature.loadGeometry(), point)
  //     ) {
  //       const feat = onSelectFeature(feature, requestedTile);
  //       if (feat) {
  //         features.push(feat);
  //       }
  //     }
  //   }

  //   return features;
  // }

  async _cachedTile(currentUrl: string) {
    if (!currentUrl) return;
    const cachedTile = this._tileCaches.get(currentUrl);
    if (cachedTile) return cachedTile;
    const tile = tileToCacheable(await this._parseTile(currentUrl));
    if (tile) this._tileCaches.set(currentUrl, tile);
    return tile;
  }
}

const tileToCacheable = (v: VectorTile | undefined) => {
  if (!v) return;
  const layers: VectorTile["layers"] = {};
  for (const [key, value] of Object.entries(v.layers)) {
    const features: VectorTileFeature[] = [];
    const layer = value;
    for (let i = 0; i < layer.length; i++) {
      const feature = layer.feature(i);
      const geo = feature.loadGeometry();
      const bbox = feature.bbox?.();
      const f: VectorTileFeature = {
        ...feature,
        id: feature.id,
        loadGeometry: () => geo,
        bbox: bbox ? () => bbox : undefined,
        toGeoJSON: feature.toGeoJSON,
      };
      features.push(f);
    }
    layers[key] = {
      ...layer,
      feature: i => features[i],
    };
  }
  return { layers };
};

const buildURLWithTileCoordinates = (template: URLTemplate, tile: TileCoordinates) => {
  const decodedTemplate = decodeURIComponent(template);
  const z = decodedTemplate.replace("{z}", String(tile.level));
  const x = z.replace("{x}", String(tile.x));
  const y = x.replace("{y}", String(tile.y));
  return y;
};

const onRenderFeature = (updatedAt?: number): boolean => {
  if (!currentTime && !updatedAt) {
    currentTime = updatedAt;
  }
  return currentTime === updatedAt;
};
