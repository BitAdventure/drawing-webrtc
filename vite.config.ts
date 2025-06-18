import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import svgr from "vite-plugin-svgr";
import { ViteImageOptimizer } from "vite-plugin-image-optimizer";
import tsconfigPaths from "vite-tsconfig-paths";

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    ViteImageOptimizer({
      webp: {
        lossless: false,
        quality: 75,
        smartSubsample: true,
      },
    }),
    react(),
    svgr(),
    tsconfigPaths(),
  ],
});
