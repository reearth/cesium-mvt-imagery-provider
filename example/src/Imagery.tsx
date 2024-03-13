import { MVTImageryProvider } from "cesium-mvt-imagery-provider";
import { FC, useEffect, useState } from "react";
import { useCesium } from "resium";

export const Imagery: FC = () => {
  const { viewer } = useCesium();
  const [isFeatureSelected] = useState<boolean>(false);
  useEffect(() => {
    const imageryProvider = new MVTImageryProvider({
      urlTemplate:
        "https://assets.cms.plateau.reearth.io/assets/17/53645b-5964-491a-9dd8-c1a91ce3937a/13100_tokyo23-ku_2022_mvt_1_2_op_tran_lod1/{z}/{x}/{y}.mvt",
      layerName: "Road",
      // TODO: Support callback
      // onRenderFeature: () => {
      //   console.log("Before rendering feature");
      //   return true;
      // },
      // onFeaturesRendered: () => {
      //   console.log("After rendering feature");
      // },
      // style: (_feature, _tileCoords) => {
      //   console.log("CALL???");
      //   if (isFeatureSelected) {
      //     return {
      //       strokeStyle: "orange",
      //       fillStyle: "orange",
      //       lineWidth: 1,
      //     };
      //   }
      //   return {
      //     strokeStyle: "green",
      //     fillStyle: "green",
      //     lineWidth: 1,
      //   };
      // },
      // onSelectFeature: _feature => {
      //   setIsFeatureSelected(v => !v);
      // },
      worker: true,
      credit: "cesium.js",
    });

    const layers = viewer.scene.imageryLayers;
    const currentLayer = layers.addImageryProvider(imageryProvider);
    // currentLayer.alpha = 1;

    return () => {
      layers.remove(currentLayer);
      imageryProvider.dispose();
    };
  }, [viewer, isFeatureSelected]);
  return <div />;
};
