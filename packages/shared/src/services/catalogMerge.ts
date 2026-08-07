/**
 * Selective catalog merge: build a partial package from chosen diff items.
 */

import type {
  CatalogEntities,
  CatalogEntityKind,
  CatalogPackage,
} from "../types/catalog";
import {
  CATALOG_FORMAT,
  CATALOG_FORMAT_VERSION,
} from "../types/catalog";
import type { CatalogDiffItem } from "./catalogDiff";
import { validateCatalogPackage } from "./catalog";
import { validateManageBackup } from "./manageBackup";

const KINDS: CatalogEntityKind[] = [
  "categories",
  "subcategories",
  "skills",
  "roles",
];

export function selectionKey(item: CatalogDiffItem): string {
  return `${item.kind}:${item.id}:${item.change}`;
}

/**
 * Accept skillgrid-catalog or manage-backup JSON → CatalogPackage.
 */
export function parseImportAsCatalogPackage(
  raw: unknown
): { ok: true; package: CatalogPackage } | { ok: false; errors: string[] } {
  if (!raw || typeof raw !== "object") {
    return { ok: false, errors: ["Datei muss JSON-Objekt sein"] };
  }
  const obj = raw as Record<string, unknown>;

  if (obj.format === "skillgrid-manage-backup") {
    const v = validateManageBackup(raw);
    if (!v.ok || !v.package) {
      return { ok: false, errors: v.errors };
    }
    const data = v.package.data;
    const meta = data.settings?.installedCatalogMeta;
    const pkg: CatalogPackage = {
      format: CATALOG_FORMAT,
      formatVersion: CATALOG_FORMAT_VERSION,
      meta: {
        catalogId: meta?.catalogId || "imported-from-manage-backup",
        name: meta?.name || v.package.label || "Importierter Katalog",
        version: meta?.version || "0.0.0",
        publishedAt: v.package.exportedAt || new Date().toISOString(),
        publisher: meta?.publisher,
        changelog: meta?.changelog || [],
        minAppFormatVersion: meta?.minAppFormatVersion ?? 1,
        partial: true,
      },
      entities: {
        categories: (data.categories || []) as CatalogEntities["categories"],
        subcategories: (data.subcategories ||
          []) as CatalogEntities["subcategories"],
        skills: (data.skills || []) as CatalogEntities["skills"],
        roles: (data.roles || []) as CatalogEntities["roles"],
      },
    };
    return { ok: true, package: pkg };
  }

  const v = validateCatalogPackage(raw);
  if (!v.ok || !v.package) {
    return {
      ok: false,
      errors: v.errors.map((e) => e.message),
    };
  }
  return { ok: true, package: v.package };
}

/**
 * From selected diff items (added/changed only for upsert; removed = soft-deprecate ids).
 * Auto-includes parent category/subcategory from import package when skills/subs selected.
 */
export function buildSelectiveMergePackage(
  source: CatalogPackage,
  selected: CatalogDiffItem[]
): {
  package: CatalogPackage;
  softDeprecate: { kind: CatalogEntityKind; id: string }[];
} {
  const upsertItems = selected.filter(
    (i) => i.change === "added" || i.change === "changed"
  );
  const removeItems = selected.filter((i) => i.change === "removed");

  const byKind: Record<CatalogEntityKind, Set<string>> = {
    categories: new Set(),
    subcategories: new Set(),
    skills: new Set(),
    roles: new Set(),
  };
  for (const item of upsertItems) {
    byKind[item.kind].add(item.id);
  }

  // Auto-include parents from source package
  const srcSubs = new Map(
    (source.entities.subcategories || []).map((s) => [s.id, s])
  );
  const srcSkills = new Map((source.entities.skills || []).map((s) => [s.id, s]));

  for (const skillId of byKind.skills) {
    const skill = srcSkills.get(skillId);
    if (skill?.subCategoryId) {
      byKind.subcategories.add(skill.subCategoryId);
      const sub = srcSubs.get(skill.subCategoryId);
      if (sub?.categoryId) byKind.categories.add(sub.categoryId);
    }
  }
  for (const subId of byKind.subcategories) {
    const sub = srcSubs.get(subId);
    if (sub?.categoryId) byKind.categories.add(sub.categoryId);
  }

  // Role inheritsFrom if selected
  const srcRoles = new Map((source.entities.roles || []).map((r) => [r.id, r]));
  let added = true;
  while (added) {
    added = false;
    for (const roleId of [...byKind.roles]) {
      const role = srcRoles.get(roleId);
      if (role?.inheritsFromId && !byKind.roles.has(role.inheritsFromId)) {
        // only if parent exists in package
        if (srcRoles.has(role.inheritsFromId)) {
          byKind.roles.add(role.inheritsFromId);
          added = true;
        }
      }
    }
  }

  const entities: CatalogEntities = {
    categories: (source.entities.categories || []).filter((c) =>
      byKind.categories.has(c.id)
    ),
    subcategories: (source.entities.subcategories || []).filter((s) =>
      byKind.subcategories.has(s.id)
    ),
    skills: (source.entities.skills || []).filter((s) =>
      byKind.skills.has(s.id)
    ),
    roles: (source.entities.roles || []).filter((r) => byKind.roles.has(r.id)),
  };

  const pkg: CatalogPackage = {
    ...source,
    meta: {
      ...source.meta,
      partial: true,
    },
    entities,
  };

  return {
    package: pkg,
    softDeprecate: removeItems.map((i) => ({ kind: i.kind, id: i.id })),
  };
}

export { KINDS as CATALOG_MERGE_KINDS };
