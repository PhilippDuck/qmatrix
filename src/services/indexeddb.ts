/** Compatibility re-export — source of truth is `@skillgrid/shared`. */
export {
  createIndexedDBService,
  IndexedDBService,
  DEFAULT_DB_NAME,
  DEFAULT_DB_VERSION,
} from "@skillgrid/shared/services/indexeddb";
export type {
  DbService,
  IndexedDBServiceOptions,
} from "@skillgrid/shared/services/indexeddb";
export type * from "@skillgrid/shared/services/indexeddb";
