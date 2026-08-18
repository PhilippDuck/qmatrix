import { useMemo } from "react";
import { useStore } from "../store/hooks";
import { useCatalogVersioning } from "./useCatalogAuthoring";
import type { CatalogDiffChangeKind } from "../services/catalogDiff";
import type { CatalogEntityKind } from "../types/catalog";

export type CatalogDirtyStatus = Extract<
  CatalogDiffChangeKind,
  "added" | "changed"
>;

export function dirtyLookupKey(
  kind: CatalogEntityKind,
  id: string
): string {
  return `${kind}:${id}`;
}

/**
 * Map of unpublished catalog entities vs last release (Manage).
 * Empty when versioning is off or there is no dirty diff.
 */
export function useCatalogDirtyLookup(): (
  kind: CatalogEntityKind,
  id: string | undefined
) => CatalogDirtyStatus | null {
  const versioning = useCatalogVersioning();
  const catalogDirtyDiff = useStore((s) => s.catalogDirtyDiff);

  const map = useMemo(() => {
    const out = new Map<string, CatalogDirtyStatus>();
    if (!versioning || !catalogDirtyDiff) return out;
    for (const item of catalogDirtyDiff.items) {
      if (item.change === "added" || item.change === "changed") {
        out.set(dirtyLookupKey(item.kind, item.id), item.change);
      }
    }
    return out;
  }, [versioning, catalogDirtyDiff]);

  return (kind, id) => {
    if (!id) return null;
    return map.get(dirtyLookupKey(kind, id)) ?? null;
  };
}

export function useCatalogDirtyStatus(
  kind: CatalogEntityKind,
  id: string | undefined
): CatalogDirtyStatus | null {
  const lookup = useCatalogDirtyLookup();
  return lookup(kind, id);
}
