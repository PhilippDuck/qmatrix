import {
  createContext,
  useContext,
  useRef,
  type ReactNode,
} from "react";
import { useStore as useZustandStore } from "zustand";
import { useShallow } from "zustand/react/shallow";
import {
  createIndexedDBService,
  DEFAULT_DB_VERSION,
} from "../services/indexeddb";
import type { AppCapabilities } from "../types/capabilities";
import { createAppStore, type AppStoreApi } from "./createAppStore";
import { createPrefixedStorage } from "./prefixedStorage";
import type { AppState } from "./types";

const StoreContext = createContext<AppStoreApi | null>(null);
const CapsContext = createContext<AppCapabilities | null>(null);

export interface AppProvidersProps {
  capabilities: AppCapabilities;
  children: ReactNode;
}

/**
 * Creates one store + IDB instance per app mount (stable via ref).
 */
export function AppProviders({ capabilities, children }: AppProvidersProps) {
  const storeRef = useRef<AppStoreApi | null>(null);

  if (!storeRef.current) {
    const db = createIndexedDBService({
      dbName: capabilities.dbName,
      dbVersion: capabilities.dbVersion ?? DEFAULT_DB_VERSION,
    });
    const storage = createPrefixedStorage({
      prefix: capabilities.localStoragePrefix,
      // Full keeps reading pre-monorepo keys without prefix
      alsoReadLegacyUnprefixed: capabilities.variant === "full",
      migrateLegacyOnRead: capabilities.variant === "full",
    });
    storeRef.current = createAppStore({ db, capabilities, storage });
  }

  return (
    <CapsContext.Provider value={capabilities}>
      <StoreContext.Provider value={storeRef.current}>
        {children}
      </StoreContext.Provider>
    </CapsContext.Provider>
  );
}

/** Drop-in replacement for the former module-level `useStore` hook. */
export function useAppStore<T>(selector: (state: AppState) => T): T {
  const store = useContext(StoreContext);
  if (!store) {
    throw new Error("useAppStore must be used within AppProviders");
  }
  return useZustandStore(store, selector);
}

export function useCapabilities(): AppCapabilities {
  const caps = useContext(CapsContext);
  if (!caps) {
    throw new Error("useCapabilities must be used within AppProviders");
  }
  return caps;
}

export function useAppStoreApi(): AppStoreApi {
  const store = useContext(StoreContext);
  if (!store) {
    throw new Error("useAppStoreApi must be used within AppProviders");
  }
  return store;
}

export { useShallow };
