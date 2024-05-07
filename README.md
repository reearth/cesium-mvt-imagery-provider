# cesium-mvt-imagery-provider

## Usage

npm

```
npm i cesium cesium-mvt-imagery-provider
```

```ts
import { Viewer } from "cesium";
import CesiumMVTImageryProvider from "cesium-mvt-imagery-provider";

const imageryProvider = new CesiumMVTImageryProvider({
  urlTemplate: "http://localhost:8080/sample_mvt/{z}/{x}/{y}.mvt",
  layerName: "layerName", // or "layerName1,layerName2,layerName3"
  style: feature => {
    return {
      strokeStyle: "green",
      fillStyle: "green",
      lineWidth: 1,
    };
  },
  onSelectFeature: feature => {
    console.log("Feature is selected");
  },
  credit: "cesium.js",
});

const layers = viewer.scene.imageryLayers;
const currentLayer = layers.addImageryProvider(imageryProvider);
currentLayer.alpha = 0.5;

// Call `layers.remove(currentLayer);` when it is unnecessary.
```

See example directory for more details.

## Development

1. `yarn`
2. `yarn unlink && yarn build && yarn run link`
4. `cd ./example`
5. `yarn && yarn dev`
6. Then example cesium application is started

If you run example, you need to set sample MVT data to `./example/public`.
And you should change `layerName` option for `MVTImageryProvider` in `./example/src/Imagery.tsx`.
