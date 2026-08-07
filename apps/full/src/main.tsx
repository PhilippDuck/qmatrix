import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "@mantine/core/styles.css";
import "@mantine/charts/styles.css";
import "@mantine/tiptap/styles.css";

// Monorepo spike: prove workspace resolution + singlefile/PWA build path
import { SHARED_SPIKE, SHARED_SPIKE_META } from "@skillgrid/shared";

// Canonical app code remains at repo root `src/` until PR 2a–2c extract
import App from "../../../src/App";

// Keep spike markers reachable so the shared package is not tree-shaken away
(globalThis as typeof globalThis & {
  __SKILLGRID_SHARED_SPIKE__?: string;
}).__SKILLGRID_SHARED_SPIKE__ = SHARED_SPIKE;

if (import.meta.env.DEV) {
  console.debug("[skillgrid full]", SHARED_SPIKE_META, SHARED_SPIKE);
}

const rootEl = document.getElementById("root");
if (!rootEl) {
  throw new Error("Root element #root not found");
}

createRoot(rootEl).render(
  <StrictMode>
    <App />
  </StrictMode>
);
