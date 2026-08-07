/**
 * Shared change-history recorder used by all store slices.
 * Uses `get()` so it never imports the store singleton (avoids cycles).
 */

import { db } from "../services/indexeddb";
import type { ChangeAction, EntityType } from "../types";
import type { AppState } from "./types";

export async function recordChange(
  get: () => AppState,
  entityType: EntityType,
  entityId: string,
  entityLabel: string,
  action: ChangeAction,
  previousData: unknown | null,
  newData: unknown | null
): Promise<void> {
  try {
    await db.addChangeHistoryEntry({
      entityType,
      entityId,
      entityLabel,
      action,
      previousData,
      newData,
      timestamp: Date.now(),
      undone: false,
    });
    const state = get();
    if (!state.hasUnsavedChanges) {
      state.setHasUnsavedChanges(true);
    }
    await state.refreshChangeHistory();
  } catch (err) {
    console.error("Failed to record change", err);
  }
}

/** Standard error path: set error, optionally reload, rethrow. */
export async function failAndMaybeReload(
  set: (
    partial: Partial<AppState> | ((state: AppState) => Partial<AppState>)
  ) => void,
  get: () => AppState,
  err: unknown,
  message: string,
  reload = false
): Promise<never> {
  set({ error: err instanceof Error ? err.message : message });
  if (reload) await get().refreshAllData();
  throw err;
}
