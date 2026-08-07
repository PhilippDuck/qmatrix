import { createStore, type StoreApi } from "zustand/vanilla";
import type { DbService } from "../services/indexeddb";
import type { AppCapabilities } from "../types/capabilities";
import type { PrefixedStorage } from "./prefixedStorage";
import type { AppState } from "./types";
import {
  createCoreSlice,
  createEmployeeSlice,
  createHierarchySlice,
  createAssessmentSlice,
  createOrgSlice,
  createQualificationSlice,
  createViewSlice,
  createHistorySlice,
  createDataMgmtSlice,
  createCatalogSlice,
} from "./slices";

export interface CreateAppStoreDeps {
  db: DbService;
  capabilities: AppCapabilities;
  storage: PrefixedStorage;
}

export type AppStoreApi = StoreApi<AppState>;

/**
 * Factory: builds a Zustand store closed over db + storage + capabilities.
 * Slices do not import module-level singletons.
 */
export function createAppStore(deps: CreateAppStoreDeps): AppStoreApi {
  const { db, capabilities: caps, storage } = deps;

  return createStore<AppState>()((...a) => ({
    ...createCoreSlice(db, storage, caps)(...a),
    ...createEmployeeSlice(db, caps)(...a),
    ...createHierarchySlice(db, caps)(...a),
    ...createAssessmentSlice(db, caps)(...a),
    ...createOrgSlice(db, caps)(...a),
    ...createQualificationSlice(db, caps)(...a),
    ...createViewSlice(db, caps)(...a),
    ...createHistorySlice(db, caps)(...a),
    ...createDataMgmtSlice(db, caps)(...a),
    ...createCatalogSlice(db, caps)(...a),
  }));
}
