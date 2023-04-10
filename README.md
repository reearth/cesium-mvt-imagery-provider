# cesium-mvt-imagery-provider

## Usage

```ts
const imageryProvider = new MVTImageryProvider({
  urlTemplate: "http://localhost:8080/sample_mvt/{z}/{x}/{y}.mvt",
  layerName: "layerName", // or "layerName1,layerName2,layerName3"
  style: _feature => {
    return {
      strokeStyle: "green",
      fillStyle: "green",
      lineWidth: 1,
    };
  },
  onSelectFeature: _feature => {
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

If you want to run this library on your vite project, you can do it like the following.

1. `yarn build`
2. `cp ./dist ~/your_project && rm -rf node_modules/.vite`
3. Restart your project server
