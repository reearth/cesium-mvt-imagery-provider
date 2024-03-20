import { WebMercatorTilingScheme } from "@cesium/engine";
import Point from "@mapbox/point-geometry";
import { VectorTile, VectorTileFeature, VectorTileLayer } from "@mapbox/vector-tile";
import { Cartesian2, Cartographic, ImageryLayerFeatureInfo } from "cesium";
import Pbf from "pbf";

import { onSelectFeature } from "./featureSelect";
import { evalStyle } from "./style";
import { Layer, LayerSimple } from "./styleEvaluator/types";
import { isFeatureClicked } from "./terria";
import { TileCoordinates, URLTemplate, ImageryProviderOption, CESIUM_CANVAS_SIZE } from "./types";
import { dataTileForDisplayTile, transformGeom } from "./utils";

const MAX_VERTICES_PER_CALL = 5400;

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

export type RendererOption = Pick<ImageryProviderOption, "urlTemplate"> & {
  layerNames: string[];
};

export type RenderingContext2D = CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D;

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export class Renderer {
  private _urlTemplate: URLTemplate;
  private _parseTile: (url?: string) => Promise<VectorTile | undefined>;
  private readonly _tilingScheme: WebMercatorTilingScheme;
  private readonly _layerNames: string[];
  private readonly _tileWidth: number;
  private readonly _tileHeight: number;
  // private readonly internalSize = 256;
  // private readonly paddingSize = 16;

  private readonly _tileCaches = new Map<string, VectorTile>();

  constructor(options: RendererOption) {
    this._parseTile = defaultParseTile;
    this._urlTemplate = options.urlTemplate;
    this._tileWidth = CESIUM_CANVAS_SIZE;
    this._tileHeight = CESIUM_CANVAS_SIZE;
    this._layerNames = options.layerNames;
    this._tilingScheme = new WebMercatorTilingScheme();
  }

  async render(
    context: RenderingContext2D,
    requestedTile: TileCoordinates,
    scaleFactor: number,
    maximumLevel: number,
    currentLayer?: Layer,
  ) {
    if (requestedTile.level >= 19) requestedTile.level = 24;
    const url = buildURLWithTileCoordinates(this._urlTemplate, requestedTile);
    await Promise.all(
      this._layerNames.map(n =>
        this._renderCanvas(url, context, requestedTile, n, scaleFactor, maximumLevel, currentLayer),
      ),
    );
  }

  async _renderCanvas(
    url: string,
    context: RenderingContext2D,
    requestedTile: TileCoordinates,
    layerName: string,
    scaleFactor: number,
    maximumLevel: number,
    currentLayer?: Layer,
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
    context.save();
    context.miterLimit = 2;
    context.setTransform(
      (this._tileWidth * scaleFactor) / CESIUM_CANVAS_SIZE,
      0,
      0,
      (this._tileHeight * scaleFactor) / CESIUM_CANVAS_SIZE,
      0,
      0,
    );

    // const bbox = {
    //   minX: this.internalSize * requestedTile.x - this.paddingSize,
    //   minY: this.internalSize * requestedTile.y - this.paddingSize,
    //   maxX: this.internalSize * (requestedTile.x + 1) + this.paddingSize,
    //   maxY: this.internalSize * (requestedTile.y + 1) + this.paddingSize,
    // };

    // const o = new Point(this.internalSize * requestedTile.x, this.internalSize * requestedTile.y);

    layers.forEach(layer => {
      if (!layer) return;
      // Vector tile works with extent [0, 4095], but canvas is only [0,255]
      const extentFactor = CESIUM_CANVAS_SIZE / layer.extent;

      const { scale } = dataTileForDisplayTile(requestedTile, maximumLevel);
      context.save();
      // context.translate(origin.x - o.x, origin.y - o.y);

      for (let i = 0; i < layer.length; i++) {
        const feature = layer.feature(i);

        let coordinates = feature.loadGeometry();
        // const fbox = feature.bbox?.();
        // if (
        //   fbox &&
        //   (fbox[2] * scale + origin.x < bbox.minX ||
        //     fbox[0] * scale + origin.x > bbox.maxX ||
        //     fbox[1] * scale + origin.y > bbox.maxY ||
        //     fbox[3] * scale + origin.y < bbox.minY)
        // ) {
        //   continue;
        // }

        console.log("scale: ", scale);

        if (scale !== 1) {
          coordinates = transformGeom(coordinates, scale, new Point(0, 0));
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
          this._renderPolygon(context, coordinates, extentFactor, (style.lineWidth ?? 1) > 0);
        } else if (VectorTileFeature.types[feature.type] === "Point") {
          this._renderPoint(context, coordinates, extentFactor);
        } else if (VectorTileFeature.types[feature.type] === "LineString") {
          this._renderLineString(context, coordinates, extentFactor);
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
    coordinates: Point[][],
    extentFactor: number,
    shouldRenderLine: boolean,
  ) {
    context.beginPath();

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
      if (verticesLength + v.length > MAX_VERTICES_PER_CALL) {
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

  _renderPoint(context: RenderingContext2D, coordinates: Point[][], extentFactor: number) {
    context.beginPath();

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

  _renderLineString(context: RenderingContext2D, coordinates: Point[][], extentFactor: number) {
    context.beginPath();

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

  pickFeatures(
    requestedTile: TileCoordinates,
    longitude: number,
    latitude: number,
    currentLayer?: LayerSimple,
  ) {
    const url = buildURLWithTileCoordinates(this._urlTemplate, requestedTile);
    return this._pickFeaturesFromLayer(url, requestedTile, longitude, latitude, currentLayer);
  }

  async _pickFeaturesFromLayer(
    url: string,
    requestedTile: TileCoordinates,
    longitude: number,
    latitude: number,
    currentLayer?: LayerSimple,
  ) {
    const tile = await this._cachedTile(url);

    const pf = await Promise.all(
      this._layerNames.map(async name => {
        const layer = tile?.layers[name];
        if (!layer) {
          return []; // return empty list of features for empty tile
        }
        const f = await this._pickFeatures(requestedTile, longitude, latitude, layer, currentLayer);
        if (f) {
          return f;
        }
        return [];
      }),
    );

    return pf.flat();
  }

  async _pickFeatures(
    requestedTile: TileCoordinates,
    longitude: number,
    latitude: number,
    layer: VectorTileLayer,
    currentLayer?: LayerSimple,
  ): Promise<ImageryLayerFeatureInfo[]> {
    const boundRect = this._tilingScheme.tileXYToNativeRectangle(
      requestedTile.x,
      requestedTile.y,
      requestedTile.level,
    );
    const x_range = [boundRect.west, boundRect.east];
    const y_range = [boundRect.north, boundRect.south];

    const map = function (
      pos: Cartesian2,
      in_x_range: number[],
      in_y_range: number[],
      out_x_range: number[],
      out_y_range: number[],
    ) {
      const offset = new Cartesian2();
      // Offset of point from top left corner of bounding box
      Cartesian2.subtract(pos, new Cartesian2(in_x_range[0], in_y_range[0]), offset);
      const scale = new Cartesian2(
        (out_x_range[1] - out_x_range[0]) / (in_x_range[1] - in_x_range[0]),
        (out_y_range[1] - out_y_range[0]) / (in_y_range[1] - in_y_range[0]),
      );
      return Cartesian2.add(
        Cartesian2.multiplyComponents(offset, scale, new Cartesian2()),
        new Cartesian2(out_x_range[0], out_y_range[0]),
        new Cartesian2(),
      );
    };

    const features: ImageryLayerFeatureInfo[] = [];

    const vt_range = [0, layer.extent - 1];
    const pos = map(
      Cartesian2.fromCartesian3(
        this._tilingScheme.projection.project(new Cartographic(longitude, latitude)),
      ),
      x_range,
      y_range,
      vt_range,
      vt_range,
    );
    const point = new Point(pos.x, pos.y);

    for (let i = 0; i < layer.length; i++) {
      const feature = layer.feature(i);
      if (
        VectorTileFeature.types[feature.type] === "Polygon" &&
        isFeatureClicked(feature.loadGeometry(), point)
      ) {
        const feat = onSelectFeature(feature, requestedTile, currentLayer);
        if (feat) {
          features.push(feat);
        }
      }
    }

    return features;
  }

  async _cachedTile(currentUrl: string) {
    if (!currentUrl) return;
    const cachedTile = this._tileCaches.get(currentUrl);
    if (cachedTile) {
      return cachedTile;
    }
    const tile = tileToCacheable(await this._parseTile(currentUrl));
    if (tile) this._tileCaches.set(currentUrl, tile);
    return tile;
  }
  clearCache() {
    this._tileCaches.clear();
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
