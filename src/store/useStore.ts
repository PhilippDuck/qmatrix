/** Compatibility re-export — source of truth is `@skillgrid/shared`. */
export {
  useAppStore,
  useAppStore as useStore,
  useShallow,
  useCapabilities,
  AppProviders,
  createAppStore,
} from "@skillgrid/shared/store/hooks";
export type * from "@skillgrid/shared/store/hooks";
export type { AppState } from "@skillgrid/shared/store/types";
