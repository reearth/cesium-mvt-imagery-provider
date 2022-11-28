import { ImageryProvider, ImageryTypes, Rectangle, Request, WebMercatorTilingScheme } from "cesium";

type ImageryProviderTrait = ImageryProvider;

export class MVTImageryProvider implements ImageryProviderTrait {
  private readonly _tilingScheme: WebMercatorTilingScheme;
  private readonly _rectangle: Rectangle;

  // TODO: implement it in correct way.
  constructor() {
    this._tilingScheme = new WebMercatorTilingScheme();
    this._rectangle = this._tilingScheme.rectangle;
  }

  // TODO: implement the following properties
  get url() {
    return "" as any;
  }
  get tileWidth() {
    return undefined as any;
  }
  get tileHeight() {
    return undefined as any;
  }
  get maximumLevel() {
    return undefined as any;
  }
  get minimumLevel() {
    return undefined as any;
  }
  get tilingScheme() {
    return this._tilingScheme;
  }
  get rectangle() {
    return this._rectangle;
  }
  get errorEvent() {
    return undefined as any;
  }
  get ready() {
    return true;
  }
  get defaultNightAlpha() {
    return undefined;
  }
  get defaultDayAlpha() {
    return undefined;
  }
  get hasAlphaChannel() {
    return false;
  }
  get defaultAlpha() {
    return undefined as any;
  }
  get defaultBrightness() {
    return undefined as any;
  }
  get defaultContrast() {
    return undefined as any;
  }
  get defaultHue() {
    return undefined as any;
  }
  get defaultSaturation() {
    return undefined as any;
  }
  get defaultGamma() {
    return undefined as any;
  }
  get defaultMinificationFilter() {
    return undefined as any;
  }
  get defaultMagnificationFilter() {
    return undefined as any;
  }
  get readyPromise() {
    return undefined as any;
  }
  get tileDiscardPolicy() {
    return undefined as any;
  }
  get credit() {
    return undefined as any;
  }
  get proxy() {
    return undefined as any;
  }
  get getTileCredits() {
    return undefined as any;
  }
  get pickFeatures() {
    return undefined as any;
  }

  requestImage(
    _x: number,
    _y: number,
    _level: number,
    _request?: Request | undefined,
  ): Promise<ImageryTypes> | undefined {
    const canvas = document.createElement("canvas");
    console.log("Hello from requestImage of MVTImageryProvider");
    return Promise.resolve(canvas);
  }
}
