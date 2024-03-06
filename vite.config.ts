/// <reference types="vite/client" />

import { defineConfig } from "vite";
import dts from "vite-plugin-dts";

export default defineConfig(() => ({
  plugins: [
    dts({
      rollupTypes: true,
    }),
  ],
  worker: {
    format: "es",
  },
  build: {
    lib: {
      entry: "src/index.ts",
      name: "Resium",
    },
    rollupOptions: {
      external: ["cesium"],
      output: {
        globals: {
          cesium: "Cesium",
        },
      },
    },
  },
}));
