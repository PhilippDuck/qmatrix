import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { viteSingleFile } from "vite-plugin-singlefile";
import { VitePWA } from "vite-plugin-pwa";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "../..");
const pkg = JSON.parse(
  readFileSync(path.join(__dirname, "package.json"), "utf-8")
) as { version: string };
const isDev = process.env.NODE_ENV !== "production";

/**
 * SkillGrid manage — monorepo app shell.
 *
 * App version: apps/manage/package.json (imported in App.tsx + define fallback).
 * Resolves shared source via aliases (K12, no dist build of shared in phase 1).
 */
export default defineConfig({
  root: __dirname,
  publicDir: path.join(repoRoot, "public"),
  define: {
    // Fallback if anything still references the global; App.tsx imports package.json
    __APP_VERSION__: JSON.stringify(pkg.version),
    "import.meta.env.VITE_APP_VERSION": JSON.stringify(pkg.version),
  },
  resolve: {
    // Longer / more specific finds first
    alias: [
      {
        find: "@skillgrid/shared/types",
        replacement: path.join(repoRoot, "packages/shared/src/types/index.ts"),
      },
      {
        find: "@skillgrid/shared/constants",
        replacement: path.join(
          repoRoot,
          "packages/shared/src/constants/index.ts"
        ),
      },
      {
        find: "@skillgrid/shared/utils",
        replacement: path.join(repoRoot, "packages/shared/src/utils/index.ts"),
      },
      {
        find: "@skillgrid/shared/services",
        replacement: path.join(repoRoot, "packages/shared/src/services"),
      },
      {
        find: "@skillgrid/shared/store",
        replacement: path.join(repoRoot, "packages/shared/src/store"),
      },
      {
        find: "@skillgrid/shared/components",
        replacement: path.join(repoRoot, "packages/shared/src/components"),
      },
      {
        find: "@skillgrid/shared/context",
        replacement: path.join(repoRoot, "packages/shared/src/context"),
      },
      {
        find: "@skillgrid/shared/hooks",
        replacement: path.join(repoRoot, "packages/shared/src/hooks"),
      },
      {
        find: "@skillgrid/shared",
        replacement: path.join(repoRoot, "packages/shared/src"),
      },
    ],
  },
  server: {
    port: 5174,
    // GitHub Codespaces proxies WS through port 443
    hmr: { clientPort: 443 },
    fs: {
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
        name: "SkillGrid Manage",
        short_name: "SkillGrid Manage",
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
