import type { AppCapabilities, CapabilityFlag } from "../types/capabilities";

export type GuardResult = { ok: true } | { ok: false; reason: string };

export function checkCapability(
  caps: AppCapabilities,
  key: CapabilityFlag,
  action: string
): GuardResult {
  if (caps[key]) return { ok: true };
  return {
    ok: false,
    reason: `[${caps.variant}] ${action} nicht erlaubt (${key})`,
  };
}

/**
 * Fail-soft: logs in DEV and returns undefined when denied.
 * Use for fire-and-forget UI actions.
 */
export async function withCapability<T>(
  caps: AppCapabilities,
  key: CapabilityFlag,
  action: string,
  fn: () => Promise<T>
): Promise<T | undefined> {
  const result = checkCapability(caps, key, action);
  if (!result.ok) {
    if (import.meta.env.DEV) {
      console.error(result.reason);
    }
    return undefined;
  }
  return fn();
}

/** Catalog entity types that undo requires historyUndoCatalog. */
export const CATALOG_ENTITY_TYPES = new Set([
  "category",
  "subcategory",
  "skill",
  "role",
  "catalog",
]);
