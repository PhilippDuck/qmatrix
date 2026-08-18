/**
 * Catalog apply + selective ops import (PR 7).
 * Soft-delete never calls deleteSkill (no assessment cascade).
 */

import type {
  Assessment,
  Category,
  Employee,
  EmployeeRole,
  ExportData,
  QualificationMeasure,
  Skill,
  SubCategory,
} from "../types";
import type {
  CatalogApplyOptions,
  CatalogApplyReport,
  CatalogApplyResult,
  CatalogEntityKind,
  CatalogMissingPolicy,
  CatalogPackage,
  OpsImportOptions,
  OpsImportReport,
} from "../types/catalog";
import { compareSemVer, recomputeRequiredByRoleIds, validateCatalogPackage } from "./catalog";

export interface CatalogApplyDb {
  getCategories: () => Promise<Category[]>;
  getSubCategories: () => Promise<SubCategory[]>;
  getSkills: () => Promise<Skill[]>;
  getRoles: () => Promise<EmployeeRole[]>;
  getEmployees: () => Promise<Employee[]>;
  getSettings: () => Promise<
    | {
        id: string;
        projectTitle: string;
        updatedAt: number;
        installedCatalogMeta?: CatalogPackage["meta"];
        pendingCatalogNotes?: import("../types/catalog").CatalogChangeNote[];
      }
    | undefined
  >;
  execute: (
    storeName: string,
    method: "add" | "put" | "delete" | "get" | "getAll" | "clear",
    data?: unknown
  ) => Promise<unknown>;
  saveSettings: (settings: {
    projectTitle: string;
    installedCatalogMeta?: CatalogPackage["meta"];
    pendingCatalogNotes?: import("../types/catalog").CatalogChangeNote[];
  }) => Promise<void>;
  updateEmployee: (
    id: string,
    employee: Omit<Employee, "id" | "updatedAt">
  ) => Promise<void>;
  addChangeHistoryEntry?: (entry: {
    entityType: "catalog";
    entityId: string;
    entityLabel: string;
    action: "update" | "create";
    previousData: unknown;
    newData: unknown;
    timestamp: number;
    undone: boolean;
  }) => Promise<string>;
}

function emptyCounts(): Record<CatalogEntityKind, number> {
  return { categories: 0, subcategories: 0, skills: 0, roles: 0 };
}

function isCatalogSourced(entity: {
  catalogSource?: string;
}): boolean {
  return entity.catalogSource === "catalog";
}

/** Stored in change-history previousData so a merge can be undone atomically. */
export interface CatalogUndoSnapshot {
  catalogSnapshot: true;
  categories: Category[];
  subcategories: SubCategory[];
  skills: Skill[];
  roles: EmployeeRole[];
  installedCatalogMeta: CatalogPackage["meta"] | null;
}

export function isCatalogUndoSnapshot(
  value: unknown
): value is CatalogUndoSnapshot {
  if (!value || typeof value !== "object") return false;
  const v = value as Record<string, unknown>;
  return (
    v.catalogSnapshot === true &&
    Array.isArray(v.categories) &&
    Array.isArray(v.subcategories) &&
    Array.isArray(v.skills) &&
    Array.isArray(v.roles)
  );
}

function cloneEntities<T>(items: T[]): T[] {
  return items.map((item) => ({ ...item }));
}

/**
 * Restore catalog entities to a pre-merge snapshot.
 * Extra rows added by the merge are removed via execute (no deleteSkill cascade).
 */
export async function restoreCatalogFromSnapshot(
  db: CatalogApplyDb,
  snapshot: CatalogUndoSnapshot
): Promise<void> {
  const currentCats = await db.getCategories();
  const currentSubs = await db.getSubCategories();
  const currentSkills = await db.getSkills();
  const currentRoles = await db.getRoles();

  const snapCatIds = new Set(
    snapshot.categories.map((c) => c.id).filter(Boolean) as string[]
  );
  const snapSubIds = new Set(
    snapshot.subcategories.map((s) => s.id).filter(Boolean) as string[]
  );
  const snapSkillIds = new Set(
    snapshot.skills.map((s) => s.id).filter(Boolean) as string[]
  );
  const snapRoleIds = new Set(
    snapshot.roles.map((r) => r.id).filter(Boolean) as string[]
  );

  for (const cat of snapshot.categories) {
    if (cat.id) await db.execute("categories", "put", cat);
  }
  for (const sub of snapshot.subcategories) {
    if (sub.id) await db.execute("subcategories", "put", sub);
  }
  for (const skill of snapshot.skills) {
    if (skill.id) await db.execute("skills", "put", skill);
  }
  for (const role of snapshot.roles) {
    if (role.id) await db.execute("roles", "put", role);
  }

  for (const skill of currentSkills) {
    if (skill.id && !snapSkillIds.has(skill.id)) {
      await db.execute("skills", "delete", skill.id);
    }
  }
  for (const sub of currentSubs) {
    if (sub.id && !snapSubIds.has(sub.id)) {
      await db.execute("subcategories", "delete", sub.id);
    }
  }
  for (const cat of currentCats) {
    if (cat.id && !snapCatIds.has(cat.id)) {
      await db.execute("categories", "delete", cat.id);
    }
  }
  for (const role of currentRoles) {
    if (role.id && !snapRoleIds.has(role.id)) {
      await db.execute("roles", "delete", role.id);
    }
  }

  const settings = await db.getSettings();
  await db.saveSettings({
    projectTitle: settings?.projectTitle || "",
    installedCatalogMeta: snapshot.installedCatalogMeta ?? undefined,
    pendingCatalogNotes: settings?.pendingCatalogNotes,
  });
}

/**
 * Apply a catalog package to the DB.
 * Full snapshot by default (partial false); soft missingPolicy default.
 */
export async function applyCatalogPackage(
  db: CatalogApplyDb,
  rawPackage: unknown,
  options: CatalogApplyOptions = {}
): Promise<CatalogApplyResult> {
  const upsert = options.upsert !== false;
  const missingPolicy: CatalogMissingPolicy = options.missingPolicy ?? "soft";

  const validation = validateCatalogPackage(rawPackage);
  if (!validation.ok || !validation.package) {
    return { ok: false, errors: validation.errors };
  }

  const pkg = validation.package;
  const partial = pkg.meta.partial === true;
  const updateInstalledMeta = options.updateInstalledMeta !== false;
  // Fresh Manage DB may have no settings row yet
  const settings = (await db.getSettings()) ?? {
    id: "default",
    projectTitle: "",
    updatedAt: Date.now(),
  };
  const previousMeta = settings.installedCatalogMeta;

  // Version/catalogId gates only matter when we would install package meta (not content-only merge)
  if (updateInstalledMeta) {
    if (
      previousMeta?.version &&
      compareSemVer(pkg.meta.version, previousMeta.version) < 0 &&
      !options.allowDowngrade
    ) {
      return {
        ok: false,
        errors: [
          {
            path: "meta.version",
            message: `Version downgrade ${previousMeta.version} → ${pkg.meta.version} not allowed`,
            severity: "error",
          },
        ],
      };
    }

    if (
      previousMeta?.catalogId &&
      previousMeta.catalogId !== pkg.meta.catalogId &&
      !options.allowCatalogIdChange
    ) {
      return {
        ok: false,
        errors: [
          {
            path: "meta.catalogId",
            message: `Different catalogId (${previousMeta.catalogId} → ${pkg.meta.catalogId}); set allowCatalogIdChange`,
            severity: "error",
          },
        ],
      };
    }
  }

  const effectiveMeta = updateInstalledMeta
    ? pkg.meta
    : previousMeta ?? pkg.meta;

  const report: CatalogApplyReport = {
    added: emptyCounts(),
    updated: emptyCounts(),
    deprecated: emptyCounts(),
    hardRemoved: emptyCounts(),
    roleNameRewrites: 0,
    orphanAssessments: 0,
    orphanMeasures: 0,
    hierarchyWarnings: 0,
    warnings: [
      ...validation.warnings.map((w) => w.message),
      ...(updateInstalledMeta
        ? []
        : [
            "Import-Version/Meta ignoriert — Manage (oder installierte Meta) bleibt Versions-SoT",
          ]),
    ],
    previousVersion: previousMeta?.version,
    newVersion: effectiveMeta.version,
    catalogId: effectiveMeta.catalogId,
  };

  if (!upsert) {
    return {
      ok: false,
      errors: [
        {
          path: "options.upsert",
          message: "upsert:false is not supported yet",
          severity: "error",
        },
      ],
    };
  }

  const now = Date.now();
  const localCategories = await db.getCategories();
  const localSubs = await db.getSubCategories();
  const localSkills = await db.getSkills();
  const localRoles = await db.getRoles();
  const employees = await db.getEmployees();
  const undoSnapshot: CatalogUndoSnapshot = {
    catalogSnapshot: true,
    categories: cloneEntities(localCategories),
    subcategories: cloneEntities(localSubs),
    skills: cloneEntities(localSkills),
    roles: cloneEntities(localRoles),
    installedCatalogMeta: previousMeta ?? null,
  };

  const localCatById = new Map(localCategories.map((c) => [c.id!, c]));
  const localSubById = new Map(localSubs.map((s) => [s.id!, s]));
  const localSkillById = new Map(localSkills.map((s) => [s.id!, s]));
  const localRoleById = new Map(localRoles.map((r) => [r.id!, r]));

  const pkgCatIds = new Set(pkg.entities.categories.map((c) => c.id));
  const pkgSubIds = new Set(pkg.entities.subcategories.map((s) => s.id));
  const pkgSkillIds = new Set(pkg.entities.skills.map((s) => s.id));
  const pkgRoleIds = new Set(pkg.entities.roles.map((r) => r.id));

  // --- Upsert categories ---
  for (const cat of pkg.entities.categories) {
    const existing = localCatById.get(cat.id);
    const next: Category = {
      ...existing,
      ...cat,
      id: cat.id,
      catalogSource: "catalog",
      catalogDeprecated: false,
      updatedAt: now,
    };
    await db.execute("categories", "put", next);
    if (existing) report.updated.categories++;
    else report.added.categories++;
    localCatById.set(cat.id, next);
  }

  // --- Upsert subcategories ---
  for (const sub of pkg.entities.subcategories) {
    const existing = localSubById.get(sub.id);
    const next: SubCategory = {
      ...existing,
      ...sub,
      id: sub.id,
      catalogSource: "catalog",
      catalogDeprecated: false,
      updatedAt: now,
    };
    await db.execute("subcategories", "put", next);
    if (existing) report.updated.subcategories++;
    else report.added.subcategories++;
    localSubById.set(sub.id, next);
  }

  // --- Upsert skills (preserve local departmentId; no requiredByRoleIds yet) ---
  for (const skill of pkg.entities.skills) {
    const existing = localSkillById.get(skill.id);
    const next: Skill = {
      ...existing,
      ...skill,
      id: skill.id,
      // never take departmentId from package
      departmentId: existing?.departmentId,
      requiredByRoleIds: existing?.requiredByRoleIds,
      catalogSource: "catalog",
      catalogDeprecated: false,
      updatedAt: now,
    };
    await db.execute("skills", "put", next);
    if (existing) report.updated.skills++;
    else report.added.skills++;
    localSkillById.set(skill.id, next);
  }

  // --- Upsert roles + rename bridge ---
  for (const role of pkg.entities.roles) {
    const existing = localRoleById.get(role.id);
    const oldName = existing?.name;
    const next: EmployeeRole = {
      ...existing,
      ...role,
      id: role.id,
      catalogSource: "catalog",
      catalogDeprecated: false,
      updatedAt: now,
    };
    await db.execute("roles", "put", next);
    if (existing) report.updated.roles++;
    else report.added.roles++;
    localRoleById.set(role.id, next);

    // Transitional: rewrite legacy name tokens on employees when role renamed
    if (oldName && oldName !== role.name) {
      for (const emp of employees) {
        if (!emp.roles?.length || !emp.id) continue;
        let changed = false;
        const roles = emp.roles.map((ref) => {
          if (ref === oldName) {
            changed = true;
            return role.id;
          }
          return ref;
        });
        if (changed) {
          const { id, updatedAt: _u, ...rest } = { ...emp, roles };
          await db.updateEmployee(id!, rest);
          report.roleNameRewrites++;
        }
      }
    }
  }

  // --- Re-derive requiredByRoleIds from all roles in DB after upsert ---
  const rolesAfter = Array.from(localRoleById.values());
  // Refresh roles from DB for accuracy if missingPolicy will change set
  const reverse = recomputeRequiredByRoleIds(
    Array.from(localSkillById.values()),
    rolesAfter
  );
  for (const [skillId, roleIds] of reverse) {
    const skill = localSkillById.get(skillId);
    if (!skill) continue;
    const next = {
      ...skill,
      requiredByRoleIds: roleIds,
      updatedAt: now,
    };
    await db.execute("skills", "put", next);
    localSkillById.set(skillId, next);
  }

  // --- missingPolicy (only for full snapshot kinds) ---
  const applyMissing = async (
    kind: CatalogEntityKind,
    store: string,
    locals: Map<string, { id?: string; catalogSource?: string; catalogDeprecated?: boolean; name?: string }>,
    pkgIds: Set<string>
  ) => {
    if (partial) return; // I5: omitted kinds no-op for empty/full local set
    // When partial is false, even empty package arrays apply missingPolicy

    for (const [id, entity] of locals) {
      if (pkgIds.has(id)) continue;
      if (!isCatalogSourced(entity) && entity.catalogSource !== undefined) {
        // local-only: keep on soft/keep; hard only with extra flag (not default)
        if (missingPolicy === "hard") {
          // Only hard-remove catalog-sourced by default; skip pure local
          continue;
        }
        continue;
      }
      // Treat missing catalogSource as catalog if it was in previous install? For MVP: only catalogSource==="catalog"
      if (entity.catalogSource !== "catalog") continue;

      if (missingPolicy === "keep") continue;

      if (missingPolicy === "soft") {
        const next = {
          ...entity,
          catalogDeprecated: true,
          updatedAt: now,
        };
        await db.execute(store, "put", next);
        report.deprecated[kind]++;
        locals.set(id, next);
      } else if (missingPolicy === "hard") {
        // Hard remove catalog row only — no cascade (I3)
        await db.execute(store, "delete", id);
        report.hardRemoved[kind]++;
        locals.delete(id);
      }
    }
  };

  await applyMissing("categories", "categories", localCatById as Map<string, Category>, pkgCatIds);
  await applyMissing("subcategories", "subcategories", localSubById as Map<string, SubCategory>, pkgSubIds);
  await applyMissing("skills", "skills", localSkillById as Map<string, Skill>, pkgSkillIds);
  await applyMissing("roles", "roles", localRoleById as Map<string, EmployeeRole>, pkgRoleIds);

  // I10: re-activate ancestors of active package children
  for (const skill of pkg.entities.skills) {
    const sub = localSubById.get(skill.subCategoryId);
    if (sub?.catalogDeprecated) {
      const fixed = { ...sub, catalogDeprecated: false, updatedAt: now };
      await db.execute("subcategories", "put", fixed);
      localSubById.set(sub.id!, fixed);
      report.hierarchyWarnings++;
      report.warnings.push(
        `Re-activated subcategory ${sub.id} because skill ${skill.id} is active in package`
      );
    }
    const catId = sub?.categoryId;
    if (catId) {
      const cat = localCatById.get(catId);
      if (cat?.catalogDeprecated) {
        const fixed = { ...cat, catalogDeprecated: false, updatedAt: now };
        await db.execute("categories", "put", fixed);
        localCatById.set(cat.id!, fixed);
        report.hierarchyWarnings++;
      }
    }
  }

  // Orphan assessments / measures counts (soft-deprecated skills)
  const assessments = (await db.execute("assessments", "getAll")) as Assessment[];
  const deprecatedSkillIds = new Set(
    Array.from(localSkillById.values())
      .filter((s) => s.catalogDeprecated)
      .map((s) => s.id!)
  );
  report.orphanAssessments = assessments.filter((a) =>
    deprecatedSkillIds.has(a.skillId)
  ).length;

  try {
    const measures = (await db.execute(
      "qualificationMeasures",
      "getAll"
    )) as QualificationMeasure[];
    report.orphanMeasures = measures.filter((m) =>
      deprecatedSkillIds.has(m.skillId)
    ).length;
  } catch {
    // store may be empty / missing in tests
  }

  // Settings meta — Manage content-merge leaves installed catalog version untouched
  if (updateInstalledMeta) {
    await db.saveSettings({
      projectTitle: settings.projectTitle || "",
      installedCatalogMeta: pkg.meta,
      pendingCatalogNotes: settings.pendingCatalogNotes,
    });
  } else if (!settings.projectTitle && !previousMeta) {
    // Ensure a settings row exists on first content merge without inventing a release
    await db.saveSettings({
      projectTitle: settings.projectTitle || "",
      installedCatalogMeta: previousMeta,
      pendingCatalogNotes: settings.pendingCatalogNotes,
    });
  }

  if (db.addChangeHistoryEntry) {
    await db.addChangeHistoryEntry({
      entityType: "catalog",
      entityId: effectiveMeta.catalogId,
      entityLabel: updateInstalledMeta
        ? `Katalog v${pkg.meta.version}`
        : "Katalog-Inhalte gemerged (Version unverändert)",
      action: previousMeta ? "update" : "create",
      previousData: undoSnapshot,
      newData: {
        meta: updateInstalledMeta ? pkg.meta : previousMeta,
        contentOnly: !updateInstalledMeta,
        reportSummary: {
          added: report.added,
          updated: report.updated,
          deprecated: report.deprecated,
          hardRemoved: report.hardRemoved,
        },
      },
      timestamp: now,
      undone: false,
    });
  }

  return { ok: true, report, errors: [] };
}

/**
 * Import operational data from ExportData without touching catalog entities.
 */
export async function importOpsFromExportData(
  db: CatalogApplyDb & {
    importData?: (data: ExportData) => Promise<void>;
  },
  data: ExportData,
  options: OpsImportOptions = {}
): Promise<OpsImportReport> {
  const report: OpsImportReport = { imported: {}, skipped: [], warnings: [] };

  if (options.includeCatalog) {
    report.warnings.push(
      "includeCatalog ignored — use applyCatalogPackage for catalog data"
    );
  }

  const putAll = async (
    store: string,
    items: unknown[] | undefined,
    key: string
  ) => {
    if (!items?.length) {
      report.skipped.push(key);
      return;
    }
    for (const item of items) {
      await db.execute(store, "put", item);
    }
    report.imported[key] = items.length;
  };

  if (options.departments !== false) {
    await putAll("departments", data.departments, "departments");
  }
  if (options.employees !== false) {
    await putAll("employees", data.employees, "employees");
  }
  if (options.assessments !== false) {
    await putAll("assessments", data.assessments, "assessments");
  }
  if (options.history !== false) {
    await putAll("assessment_logs", data.history, "history");
  }
  if (options.qualificationPlans !== false) {
    await putAll(
      "qualificationPlans",
      data.qualificationPlans,
      "qualificationPlans"
    );
  }
  if (options.qualificationMeasures !== false) {
    await putAll(
      "qualificationMeasures",
      data.qualificationMeasures,
      "qualificationMeasures"
    );
  }
  if (options.savedViews !== false && data.savedViews) {
    await putAll("savedViews", data.savedViews, "savedViews");
  }
  if (options.settings !== false && data.settings) {
    await db.saveSettings({
      projectTitle: data.settings.projectTitle || "",
      installedCatalogMeta: data.settings.installedCatalogMeta,
    });
    report.imported.settings = 1;
  }

  // Explicitly never write catalog stores here
  report.skipped.push(
    "categories",
    "subcategories",
    "skills",
    "roles"
  );

  return report;
}
