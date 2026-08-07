import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { viteSingleFile } from "vite-plugin-singlefile";
import { VitePWA } from "vite-plugin-pwa";
import { readFileSync } from "fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const pkg = JSON.parse(readFileSync("./package.json", "utf-8"));
const isDev = process.env.NODE_ENV !== "production";

// https://vite.dev/config/
export default defineConfig({
  define: {
    __APP_VERSION__: JSON.stringify(pkg.version),
  },
  resolve: {
    alias: {
      "@skillgrid/shared": path.resolve(__dirname, "packages/shared/src"),
      "@skillgrid/shared/types": path.resolve(
        __dirname,
        "packages/shared/src/types/index.ts"
      ),
      "@skillgrid/shared/constants": path.resolve(
        __dirname,
        "packages/shared/src/constants/index.ts"
      ),
      "@skillgrid/shared/utils": path.resolve(
        __dirname,
        "packages/shared/src/utils/index.ts"
      ),
      "@skillgrid/shared/services": path.resolve(
        __dirname,
        "packages/shared/src/services"
      ),
      "@skillgrid/shared/store": path.resolve(
        __dirname,
        "packages/shared/src/store"
      ),
    },
  },
  server: {
    // GitHub Codespaces proxies WS through port 443
    hmr: { clientPort: 443 },
  },
  plugins: [
    react(),
    // Dieses Plugin sorgt dafür, dass alle Assets in der index.html landen
    viteSingleFile(),
    VitePWA({
      disable: isDev,
      registerType: "autoUpdate",
      injectRegister: "inline",
      manifest: {
        name: "SkillGrid",
        short_name: "SkillGrid",
        description: "Visualisierung und Planung von Qualifikationen",
        theme_color: "#ffffff",
        background_color: "#141517",
        start_url: "/",
        display: "standalone",
        icons: [
          {
            src: "pwa-192x192.png",
            sizes: "192x192",
            type: "image/png",
            purpose: "any",
          },
          {
            src: "pwa-512x512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "maskable",
          },
        ],
      },
      workbox: {
        globPatterns: ["**/*.{html,js,css,svg,png}"],
        // vite-plugin-singlefile inlines everything into index.html (~2.5 MB)
        maximumFileSizeToCacheInBytes: 5 * 1024 * 1024,
      },
    }),
  ],
  build: {
    // Verhindert, dass CSS in eine separate Datei ausgelagert wird
    cssCodeSplit: false,
    // Stellt sicher, dass alle dynamischen Importe in einer Datei bleiben
    rollupOptions: {
      output: {
        inlineDynamicImports: true,
      },
    },
  },
});
