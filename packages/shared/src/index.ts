/**
 * @skillgrid/shared public surface.
 *
 * Phase PR3: store factory + AppProviders (no module db/useStore singleton).
 */

export const SHARED_SPIKE = "skillgrid-shared-ok" as const;

export const SHARED_SPIKE_META = {
  package: "@skillgrid/shared",
  phase: "pr7-catalog-apply",
} as const;

export type * from "./types";
export {
  fullCapabilities,
  type AppCapabilities,
  type AppVariant,
  type CapabilityFlag,
} from "./types/capabilities";
export { LEVELS, MATRIX_LAYOUT } from "./constants";
export * from "./utils";
export {
  createIndexedDBService,
  IndexedDBService,
  DEFAULT_DB_NAME,
  DEFAULT_DB_VERSION,
} from "./services/indexeddb";
export type { DbService, IndexedDBServiceOptions } from "./services/indexeddb";
export {
  generateQuarterlyReport,
  exportQualificationPlanPDF,
} from "./services/pdfReportService";
export {
  isValidSemVer,
  parseSemVer,
  compareSemVer,
  validateCatalogPackage,
  extractCatalogFromState,
  extractCatalogFromExport,
  computeContentHash,
  withContentHash,
  catalogDownloadFilename,
  recomputeRequiredByRoleIds,
} from "./services/catalog";
export {
  applyCatalogPackage,
  importOpsFromExportData,
} from "./services/catalogApply";
export {
  CATALOG_FORMAT,
  CATALOG_FORMAT_VERSION,
} from "./types/catalog";
export {
  AppProviders,
  useAppStore,
  useAppStore as useStore,
  useCapabilities,
  useAppStoreApi,
  useShallow,
  createAppStore,
  createPrefixedStorage,
} from "./store";
export type { AppState, AppStoreApi, CreateAppStoreDeps, PrefixedStorage } from "./store";
