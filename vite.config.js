import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { viteSingleFile } from "vite-plugin-singlefile";

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    // Dieses Plugin sorgt dafür, dass alle Assets in der index.html landen
    viteSingleFile(),
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
