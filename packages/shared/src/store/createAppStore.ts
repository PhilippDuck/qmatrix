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
} from "./slices";

export interface CreateAppStoreDeps {
  db: DbService;
  capabilities: AppCapabilities;
  storage: PrefixedStorage;
}

export type AppStoreApi = StoreApi<AppState>;

/**
 * Factory: builds a Zustand store closed over db + storage.
 * Slices do not import module-level singletons.
 */
export function createAppStore(deps: CreateAppStoreDeps): AppStoreApi {
  const { db, storage } = deps;
  // capabilities reserved for PR 4 guards — threaded for AppProviders parity
  void deps.capabilities;

  return createStore<AppState>()((...a) => ({
    ...createCoreSlice(db, storage)(...a),
    ...createEmployeeSlice(db)(...a),
    ...createHierarchySlice(db)(...a),
    ...createAssessmentSlice(db)(...a),
    ...createOrgSlice(db)(...a),
    ...createQualificationSlice(db)(...a),
    ...createViewSlice(db)(...a),
    ...createHistorySlice(db)(...a),
    ...createDataMgmtSlice(db)(...a),
  }));
}
