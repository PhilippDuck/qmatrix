/// <reference types="vite/client" />

/** Fallback inject from apps/manage/vite.config.ts (prefer package.json import). */
declare const __APP_VERSION__: string;

declare module "*.json" {
  const value: { name?: string; version: string; [key: string]: unknown };
  export default value;
}

declare module "*.md?raw" {
  const content: string;
  export default content;
}
