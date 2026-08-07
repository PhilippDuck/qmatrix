import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { viteSingleFile } from "vite-plugin-singlefile";
import { VitePWA } from "vite-plugin-pwa";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "../..");
const pkg = JSON.parse(readFileSync(path.join(__dirname, "package.json"), "utf-8"));
const isDev = process.env.NODE_ENV !== "production";

/**
 * SkillGrid Full — monorepo app shell (PR1).
 *
 * Root `src/` stays canonical until PR 2a–2c. This config:
 * - uses apps/full as Vite root (own index.html + main)
 * - imports the live app from repo `src/`
 * - resolves `@skillgrid/shared` from packages/shared/src (source alias, K12)
 * - keeps singlefile + PWA production build (spike proof)
 */
export default defineConfig({
  root: __dirname,
  publicDir: path.join(repoRoot, "public"),
  define: {
    __APP_VERSION__: JSON.stringify(pkg.version),
  },
  resolve: {
    alias: {
      "@skillgrid/shared": path.join(repoRoot, "packages/shared/src"),
    },
  },
  server: {
    port: 5173,
    // GitHub Codespaces proxies WS through port 443
    hmr: { clientPort: 443 },
    fs: {
      // Allow importing canonical app sources outside apps/full
      allow: [repoRoot],
    },
  },
  plugins: [
    react(),
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
    outDir: path.join(__dirname, "dist"),
    emptyOutDir: true,
    cssCodeSplit: false,
    rollupOptions: {
      output: {
        inlineDynamicImports: true,
      },
    },
  },
});
