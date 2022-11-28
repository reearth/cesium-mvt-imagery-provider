import { MVTImageryProvider } from "cesium-mvt-imargery-provider";
import { FC, useEffect } from "react";
import { useCesium } from "resium";

export const Imagery: FC = () => {
  const { viewer } = useCesium();
  useEffect(() => {
    viewer.scene.imageryLayers.addImageryProvider(new MVTImageryProvider());
  }, [viewer]);
  return <div />;
};
