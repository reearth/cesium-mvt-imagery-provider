import {
  ImageryProvider,
  ImageryTypes,
  Rectangle,
  Request,
  WebMercatorTilingScheme,
  Event as CesiumEvent,
  ImageryLayerFeatureInfo,
  Credit,
} from "cesium";

import { RenderMainHandler } from "./handler";
import { RenderHandler } from "./renderHandler";
import { CESIUM_CANVAS_SIZE, ImageryProviderOption, TileCoordinates } from "./types";
import { RenderWorkerHandler } from "./worker/handler";
import WorkerBlob from "./worker/receiver?worker&inline";

type ImageryProviderTrait = ImageryProvider;

export class MVTImageryProvider implements ImageryProviderTrait {
  // Options
  private readonly _minimumLevel: number;
  private readonly _maximumLevel: number;
  private readonly _credit?: string;
  private readonly _resolution?: number;

  // Internal variables
  private readonly _tilingScheme: WebMercatorTilingScheme;
  private readonly _tileWidth: number;
  private readonly _tileHeight: number;
  private readonly _rectangle: Rectangle;
  private readonly _ready: boolean;
  private readonly _readyPromise: Promise<boolean>;
  private readonly _errorEvent = new CesiumEvent();
  private readonly _handler: RenderHandler;

  constructor(options: ImageryProviderOption) {
    this._minimumLevel = options.minimumLevel ?? 0;
    this._maximumLevel = options.maximumLevel ?? Infinity;
    this._credit = options.credit;
    this._resolution = options.resolution ?? 5;

    this._tilingScheme = new WebMercatorTilingScheme();

    // Maybe these pixels are same with Cesium's tile size.
    this._tileWidth = CESIUM_CANVAS_SIZE;
    this._tileHeight = CESIUM_CANVAS_SIZE;

    this._rectangle = this._tilingScheme.rectangle;

    this._handler = options.worker
      ? new RenderWorkerHandler(new WorkerBlob())
      : new RenderMainHandler();

    this._ready = true;
    this._readyPromise = this._handler
      .init({
        ...options,
        layerNames: options.layerName.split(/, */).filter(Boolean),
        tilingScheme: this.tilingScheme,
      })
      .then(() => true);
  }

  get tileWidth() {
    return this._tileWidth;
  }
  get tileHeight() {
    return this._tileHeight;
  }
  // The `requestImage` is called when user zoom the globe.
  // But this invocation is restricted depends on `maximumLevel` or `minimumLevel`.
  get maximumLevel() {
    return this._maximumLevel;
  }
  get minimumLevel() {
    return this._minimumLevel;
  }
  get tilingScheme() {
    return this._tilingScheme;
  }
  get rectangle() {
    return this._rectangle;
  }
  get errorEvent() {
    return this._errorEvent;
  }
  get ready() {
    return this._ready;
  }
  get hasAlphaChannel() {
    return true;
  }
  get credit() {
    return this._credit ? new Credit(this._credit) : <any>undefined;
  }

  // Unused values
  get defaultNightAlpha() {
    return undefined;
  }
  get defaultDayAlpha() {
    return undefined;
  }
  get defaultAlpha() {
    return <any>undefined;
  }
  get defaultBrightness() {
    return <any>undefined;
  }
  get defaultContrast() {
    return <any>undefined;
  }
  get defaultHue() {
    return <any>undefined;
  }
  get defaultSaturation() {
    return <any>undefined;
  }
  get defaultGamma() {
    return <any>undefined;
  }
  get defaultMinificationFilter() {
    return <any>undefined;
  }
  get defaultMagnificationFilter() {
    return <any>undefined;
  }
  get readyPromise() {
    return this._readyPromise;
  }
  get tileDiscardPolicy() {
    return <any>undefined;
  }
  get proxy() {
    return <any>undefined;
  }
  getTileCredits(_x: number, _y: number, _level: number) {
    return [];
  }

  requestImage(
    x: number,
    y: number,
    level: number,
    _request?: Request | undefined,
  ): Promise<ImageryTypes> | undefined {
    const canvas = document.createElement("canvas");

    const requestedTile: TileCoordinates = {
      x,
      y,
      level,
    };

    const scaleFactor = (level >= this.maximumLevel ? this._resolution : undefined) ?? 1;
    canvas.width = this._tileWidth * scaleFactor;
    canvas.height = this._tileHeight * scaleFactor;

    return this.readyPromise.then(() => {
      return this._handler
        .render({
          canvas,
          requestedTile,
          scaleFactor,
        })
        .then(() => {
          return canvas;
        });
    });
  }

  async pickFeatures(
    x: number,
    y: number,
    level: number,
    longitude: number,
    latitude: number,
  ): Promise<ImageryLayerFeatureInfo[]> {
    const requestedTile = {
      x: x,
      y: y,
      level: level,
    };

    return this._handler.pick({
      requestedTile,
      longitude,
      latitude,
    });

    // return (await this._pickFeaturesFromLayer(url, requestedTile, longitude, latitude)).flat();
  }

  dispose() {
    this._handler.dispose();
  }
}
