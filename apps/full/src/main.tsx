import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "@mantine/core/styles.css";
import "@mantine/charts/styles.css";
import "@mantine/tiptap/styles.css";

import { SHARED_SPIKE, SHARED_SPIKE_META } from "@skillgrid/shared";
import App from "./App";

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
