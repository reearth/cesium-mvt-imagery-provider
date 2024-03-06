/* eslint-disable @typescript-eslint/no-unused-vars */
import {
  ImageryProvider,
  ImageryTypes,
  Rectangle,
  Request,
  WebMercatorTilingScheme,
  Event as CesiumEvent,
  Credit,
  ImageryLayerFeatureInfo,
} from "cesium";
import { LRUCache } from "lru-cache";
import { Transfer } from "threads";

import { RendererOption } from "./RenderWorker";
import {
  CESIUM_CANVAS_SIZE,
  ImageryProviderOption,
  TileCoordinates,
} from "./types";
import { canQueue, queue } from "./workerPool";

import { RenderMainHandler } from "./handler";
import { RenderHandler } from "./renderHandler";
import { Layer } from "./styleEvaluator/types";

type ImageryProviderTrait = ImageryProvider;

export class MVTImageryProvider implements ImageryProviderTrait {
  static maximumTasks = 50;
  static maximumTasksPerImagery = 6;

  private readonly tileRendererParams: RendererOption;
  private readonly tileCache: LRUCache<string, HTMLCanvasElement> | undefined;
  private taskCount = 0;

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
  private readonly _readyPromise: Promise<boolean> = Promise.resolve(true);
  private readonly _errorEvent = new CesiumEvent();
  private readonly _handler: RenderHandler;
  private readonly _useWorker: boolean;

  constructor(options: ImageryProviderOption) {
    this._minimumLevel = options.minimumLevel ?? 0;
    this._maximumLevel = options.maximumLevel ?? Infinity;
    this._credit = options.credit;
    this._resolution = options.resolution ?? 5;

    this._tilingScheme = new WebMercatorTilingScheme();
    this._useWorker = options.worker ?? false;

    // Maybe these pixels are same with Cesium's tile size.
    this._tileWidth = CESIUM_CANVAS_SIZE;
    this._tileHeight = CESIUM_CANVAS_SIZE;

    this._rectangle = this._tilingScheme.rectangle;

    this._handler = new RenderMainHandler();

    this._ready = true;
    this._readyPromise = this._handler
      .init({
        ...options,
        layerNames: options.layerName.split(/, */).filter(Boolean),
        tilingScheme: this.tilingScheme,
      })
      .then(() => true);
    this.tileRendererParams = {
      ...options,
      layerNames: options.layerName.split(/, */).filter(Boolean),
      tilingScheme: this.tilingScheme,
      currentLayer: options.layer,
    };
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
    _request?: Request | undefined
  ): Promise<ImageryTypes> | undefined {
    if (
      this.taskCount >= MVTImageryProvider.maximumTasksPerImagery||
      !canQueue(MVTImageryProvider.maximumTasks)
    ) {
      return
    }
    const cacheKey = `${x}/${y}/${level}`;
    if (this.tileCache?.has(cacheKey) === true) {
      const canvas = this.tileCache.get(cacheKey);
      return Promise.resolve(canvas as ImageryTypes);
    }
    const canvas = document.createElement("canvas");
    const requestedTile: TileCoordinates = {
      x,
      y,
      level,
    };

    const scaleFactor =
      (level >= this.maximumLevel ? this._resolution : undefined) ?? 1;
    canvas.width = this._tileWidth * scaleFactor;
    canvas.height = this._tileHeight * scaleFactor;
    const offscreen = canvas.transferControlToOffscreen();
    const currentLayer = this.tileRendererParams.currentLayer;

    ++this.taskCount;


    if(this._useWorker) {
      return this.renderTile(requestedTile, offscreen, scaleFactor, currentLayer)
      .then(() => {
        this.tileCache?.set(cacheKey, canvas);
        return canvas;
      })
      .catch((error) => {
        if (
          error instanceof Error &&
          error.message.startsWith("Unimplemented type")
        ) {
          return canvas;
        }
        throw error;
      })
      .finally(() => {
        --this.taskCount;
      });
    }

    return this.readyPromise.then(() => {
      return this._handler
        .render({
          canvas,
          requestedTile,
          scaleFactor,
          currentLayer
        })
        .then(() => {
          return canvas;
        });
    });
  }

  async renderTile(
    coords: TileCoordinates,
    canvas: OffscreenCanvas,
    scaleFactor: number,
    currentLayer?: Layer
  ): Promise<void> {
    await queue(async (task) => {
      await task.renderTile(
        Transfer(
          {
            canvas,
            coords,
            scaleFactor,
            currentLayer,
          },
          [canvas]
        )
      );
    });
  }

  async pickFeatures(
    x: number,
    y: number,
    level: number,
    longitude: number,
    latitude: number
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
