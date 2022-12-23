import { MVTImageryProvider } from "cesium-mvt-imagery-provider";
import { FC, useEffect, useState } from "react";
import { useCesium } from "resium";

export const Imagery: FC = () => {
  const { viewer } = useCesium();
  const [isFeatureSelected, setIsFeatureSelected] = useState<boolean>(false);
  useEffect(() => {
    const imageryProvider = new MVTImageryProvider({
      urlTemplate: "http://localhost:8080/sample_mvt/{z}/{x}/{y}.mvt",
      layerName: "layerName",
      onRenderFeature: () => {
        console.log("Before rendering feature");
      },
      onFeaturesRendered: () => {
        console.log("After rendering feature");
      },
      style: (_feature, _tileCoords) => {
        if (isFeatureSelected) {
          return {
            strokeStyle: "orange",
            fillStyle: "orange",
            lineWidth: 1,
          };
        }
        return {
          strokeStyle: "green",
          fillStyle: "green",
          lineWidth: 1,
        };
      },
      onSelectFeature: _feature => {
        setIsFeatureSelected(v => !v);
      },
      credit: "cesium.js",
    });

    const layers = viewer.scene.imageryLayers;
    const currentLayer = layers.addImageryProvider(imageryProvider);
    currentLayer.alpha = 0.5;

    return () => {
      layers.remove(currentLayer);
    };
  }, [viewer, isFeatureSelected]);
  return <div />;
};
