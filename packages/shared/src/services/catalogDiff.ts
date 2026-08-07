/**
 * Compare two catalog entity sets (current live vs a stored release).
 */

import type { CatalogEntities, CatalogEntityKind } from "../types/catalog";

export type CatalogDiffChangeKind = "added" | "removed" | "changed";

export interface CatalogDiffItem {
  kind: CatalogEntityKind;
  change: CatalogDiffChangeKind;
  id: string;
  label: string;
  /** Short summary of what changed (for "changed") */
  detail?: string;
}

export interface CatalogDiffResult {
  items: CatalogDiffItem[];
  summary: Record<
    CatalogEntityKind,
    { added: number; removed: number; changed: number }
  >;
  isIdentical: boolean;
}

const KINDS: CatalogEntityKind[] = [
  "categories",
  "subcategories",
  "skills",
  "roles",
];

function entityLabel(kind: CatalogEntityKind, entity: { id: string; name?: string }): string {
  return entity.name?.trim() || entity.id;
}

/** Normalize for comparison: drop volatile / derived fields. */
function normalizeEntity(
  kind: CatalogEntityKind,
  entity: Record<string, unknown>
): string {
  const copy: Record<string, unknown> = { ...entity };
  delete copy.updatedAt;
  delete copy.catalogDeprecated;
  delete copy.catalogSource;
  if (kind === "skills") {
    delete copy.departmentId;
    delete copy.requiredByRoleIds; // derived (K18)
  }
  // stable JSON
  return JSON.stringify(sortKeysDeep(copy));
}

function sortKeysDeep(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(sortKeysDeep);
  }
  if (value && typeof value === "object") {
    const obj = value as Record<string, unknown>;
    const out: Record<string, unknown> = {};
    for (const k of Object.keys(obj).sort()) {
      out[k] = sortKeysDeep(obj[k]);
    }
    return out;
  }
  return value;
}

function emptySummary(): CatalogDiffResult["summary"] {
  return {
    categories: { added: 0, removed: 0, changed: 0 },
    subcategories: { added: 0, removed: 0, changed: 0 },
    skills: { added: 0, removed: 0, changed: 0 },
    roles: { added: 0, removed: 0, changed: 0 },
  };
}

/**
 * Diff `current` against `baseline` (e.g. last released package entities).
 * - added: in current, not in baseline
 * - removed: in baseline, not in current
 * - changed: same id, different normalized content
 */
export function diffCatalogEntities(
  current: CatalogEntities,
  baseline: CatalogEntities
): CatalogDiffResult {
  const items: CatalogDiffItem[] = [];
  const summary = emptySummary();

  for (const kind of KINDS) {
    const curList = current[kind] || [];
    const baseList = baseline[kind] || [];
    const curMap = new Map(curList.map((e) => [e.id, e as Record<string, unknown>]));
    const baseMap = new Map(
      baseList.map((e) => [e.id, e as Record<string, unknown>])
    );

    for (const [id, entity] of curMap) {
      const label = entityLabel(kind, entity as { id: string; name?: string });
      if (!baseMap.has(id)) {
        items.push({ kind, change: "added", id, label });
        summary[kind].added++;
      } else {
        const a = normalizeEntity(kind, entity);
        const b = normalizeEntity(kind, baseMap.get(id)!);
        if (a !== b) {
          items.push({
            kind,
            change: "changed",
            id,
            label,
            detail: "Inhalt geändert (Name, Beschreibung, Hierarchie oder Anforderungen)",
          });
          summary[kind].changed++;
        }
      }
    }

    for (const [id, entity] of baseMap) {
      if (!curMap.has(id)) {
        const label = entityLabel(kind, entity as { id: string; name?: string });
        items.push({ kind, change: "removed", id, label });
        summary[kind].removed++;
      }
    }
  }

  // Sort: kind, then change, then label
  const changeOrder = { added: 0, removed: 1, changed: 2 };
  items.sort((a, b) => {
    if (a.kind !== b.kind) return a.kind.localeCompare(b.kind);
    if (a.change !== b.change) return changeOrder[a.change] - changeOrder[b.change];
    return a.label.localeCompare(b.label, "de");
  });

  return {
    items,
    summary,
    isIdentical: items.length === 0,
  };
}

export function summarizeDiffCounts(diff: CatalogDiffResult): {
  added: number;
  removed: number;
  changed: number;
  total: number;
} {
  let added = 0;
  let removed = 0;
  let changed = 0;
  for (const k of KINDS) {
    added += diff.summary[k].added;
    removed += diff.summary[k].removed;
    changed += diff.summary[k].changed;
  }
  return { added, removed, changed, total: added + removed + changed };
}
