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
import {
  extractCatalogFromState,
  validateCatalogPackage,
} from "./catalog";
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

function looksLikeFullExportData(obj: Record<string, unknown>): boolean {
  // Full App backup / ExportData — no skillgrid-catalog format field
  if (obj.format === CATALOG_FORMAT || obj.format === "skillgrid-manage-backup") {
    return false;
  }
  return (
    Array.isArray(obj.categories) &&
    Array.isArray(obj.subcategories) &&
    Array.isArray(obj.skills) &&
    Array.isArray(obj.roles)
  );
}

/**
 * Accept skillgrid-catalog, manage-backup, or Full ExportData → CatalogPackage.
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

  // Full App Gesamt-Backup / ExportData (Diskette) — Katalog-Anteil extrahieren
  if (looksLikeFullExportData(obj)) {
    const settings = (obj.settings || {}) as {
      projectTitle?: string;
      installedCatalogMeta?: CatalogPackage["meta"];
    };
    const meta = settings.installedCatalogMeta;
    const extract = extractCatalogFromState(
      {
        categories: (obj.categories || []) as never,
        subcategories: (obj.subcategories || []) as never,
        skills: (obj.skills || []) as never,
        roles: (obj.roles || []) as never,
      },
      {
        catalogId: meta?.catalogId || "imported-from-full-export",
        name:
          meta?.name ||
          settings.projectTitle ||
          "Katalog aus Full-Backup",
        version: meta?.version || "1.0.0",
        publisher: meta?.publisher || settings.projectTitle,
        changelog: meta?.changelog || [
          {
            version: meta?.version || "1.0.0",
            date: new Date().toISOString().slice(0, 10),
            notes: "Import aus Full-Backup / ExportData",
          },
        ],
        minAppFormatVersion: meta?.minAppFormatVersion ?? 1,
        partial: false,
      }
    );
    if (!extract.ok || !extract.package) {
      return {
        ok: false,
        errors: extract.errors.map((e) => e.message),
      };
    }
    return { ok: true, package: extract.package };
  }

  const v = validateCatalogPackage(raw);
  if (!v.ok || !v.package) {
    const msgs = v.errors.map((e) => e.message);
    // Helpful hint when user mixed up Full backup vs catalog
    if (
      msgs.some(
        (m) =>
          m.toLowerCase().includes("format") ||
          m.toLowerCase().includes("meta")
      )
    ) {
      msgs.push(
        "Tipp: In Full „Katalog exportieren“ nutzen — oder ein Full-Backup (Diskette); beides wird unterstützt."
      );
    }
    return { ok: false, errors: msgs };
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

  // Role inheritsFrom + requiredSkills → pull parent roles/skills into package
  const srcRoles = new Map((source.entities.roles || []).map((r) => [r.id, r]));
  let grow = true;
  while (grow) {
    grow = false;
    for (const roleId of [...byKind.roles]) {
      const role = srcRoles.get(roleId);
      if (!role) continue;
      if (role.inheritsFromId && srcRoles.has(role.inheritsFromId)) {
        if (!byKind.roles.has(role.inheritsFromId)) {
          byKind.roles.add(role.inheritsFromId);
          grow = true;
        }
      }
      for (const req of role.requiredSkills || []) {
        if (srcSkills.has(req.skillId) && !byKind.skills.has(req.skillId)) {
          byKind.skills.add(req.skillId);
          grow = true;
          // parents of newly added skills
          const skill = srcSkills.get(req.skillId);
          if (skill?.subCategoryId) {
            byKind.subcategories.add(skill.subCategoryId);
            const sub = srcSubs.get(skill.subCategoryId);
            if (sub?.categoryId) byKind.categories.add(sub.categoryId);
          }
        }
      }
    }
  }

  // Re-walk skill parents after role skill expansion
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

  const skillIdSet = byKind.skills;
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
    roles: (source.entities.roles || [])
      .filter((r) => byKind.roles.has(r.id))
      .map((r) => ({
        ...r,
        // Drop skill refs not in this partial package (keeps validateCatalogPackage happy)
        requiredSkills: (r.requiredSkills || []).filter((req) =>
          skillIdSet.has(req.skillId)
        ),
      })),
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
