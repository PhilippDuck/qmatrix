import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "@mantine/core/styles.css";
import "@mantine/charts/styles.css";
import "@mantine/tiptap/styles.css";

import { AppProviders, manageCapabilities } from "@skillgrid/shared";
import App from "./App";

const rootEl = document.getElementById("root");
if (!rootEl) {
  throw new Error("Root element #root not found");
}

createRoot(rootEl).render(
  <StrictMode>
    <AppProviders capabilities={manageCapabilities}>
      <App />
    </AppProviders>
  </StrictMode>
);
