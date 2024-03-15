import { MVTImageryProvider } from "cesium-mvt-imagery-provider";
import { FC, useEffect, useState } from "react";
import { useCesium } from "resium";

export const Imagery: FC = () => {
  const { viewer } = useCesium();
  const [isFeatureSelected] = useState<boolean>(false);
  useEffect(() => {
    const imageryProvider = new MVTImageryProvider({
      urlTemplate: "/sample_mvt/{z}/{x}/{y}.mvt",
      layerName: "layerName",
      worker: true,
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
