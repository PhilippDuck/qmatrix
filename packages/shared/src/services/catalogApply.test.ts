import { describe, it, expect } from "vitest";
import { applyCatalogPackage, importOpsFromExportData } from "./catalogApply";
import type { CatalogApplyDb } from "./catalogApply";
import type { CatalogPackage } from "../types/catalog";
import type {
  Assessment,
  Category,
  Employee,
  EmployeeRole,
  Skill,
  SubCategory,
} from "../types";

function createMemoryDb(seed?: {
  categories?: Category[];
  subcategories?: SubCategory[];
  skills?: Skill[];
  roles?: EmployeeRole[];
  employees?: Employee[];
  assessments?: Assessment[];
}) {
  const stores: Record<string, Map<string, unknown>> = {
    categories: new Map(
      (seed?.categories || []).map((c) => [c.id!, { ...c }])
    ),
    subcategories: new Map(
      (seed?.subcategories || []).map((s) => [s.id!, { ...s }])
    ),
    skills: new Map((seed?.skills || []).map((s) => [s.id!, { ...s }])),
    roles: new Map((seed?.roles || []).map((r) => [r.id!, { ...r }])),
    employees: new Map((seed?.employees || []).map((e) => [e.id!, { ...e }])),
    assessments: new Map(
      (seed?.assessments || []).map((a) => [a.id!, { ...a }])
    ),
    qualificationMeasures: new Map(),
    settings: new Map([
      [
        "default",
        {
          id: "default",
          projectTitle: "Test",
          updatedAt: Date.now(),
        },
      ],
    ]),
  };

  const db: CatalogApplyDb & { stores: typeof stores } = {
    stores,
    getCategories: async () =>
      Array.from(stores.categories.values()) as Category[],
    getSubCategories: async () =>
      Array.from(stores.subcategories.values()) as SubCategory[],
    getSkills: async () => Array.from(stores.skills.values()) as Skill[],
    getRoles: async () => Array.from(stores.roles.values()) as EmployeeRole[],
    getEmployees: async () =>
      Array.from(stores.employees.values()) as Employee[],
    getSettings: async () =>
      stores.settings.get("default") as {
        id: string;
        projectTitle: string;
        updatedAt: number;
        installedCatalogMeta?: CatalogPackage["meta"];
      },
    execute: async (storeName, method, data) => {
      const store = stores[storeName] ?? (stores[storeName] = new Map());
      if (method === "getAll") return Array.from(store.values());
      if (method === "put") {
        const row = data as { id: string };
        store.set(row.id, data);
        return row.id;
      }
      if (method === "delete") {
        store.delete(data as string);
        return undefined;
      }
      if (method === "clear") {
        store.clear();
        return undefined;
      }
      return undefined;
    },
    saveSettings: async (settings) => {
      stores.settings.set("default", {
        id: "default",
        updatedAt: Date.now(),
        ...settings,
      });
    },
    updateEmployee: async (id, employee) => {
      stores.employees.set(id, { id, ...employee });
    },
  };
  return db;
}

const pkgV1: CatalogPackage = {
  format: "skillgrid-catalog",
  formatVersion: 1,
  meta: {
    catalogId: "cat-line-1",
    name: "Core",
    version: "1.0.0",
    publishedAt: "2026-01-01T00:00:00.000Z",
    changelog: [],
    minAppFormatVersion: 1,
    partial: false,
  },
  entities: {
    categories: [{ id: "c1", name: "Tech" }],
    subcategories: [{ id: "s1", categoryId: "c1", name: "Lang" }],
    skills: [{ id: "sk1", subCategoryId: "s1", name: "TS" }],
    roles: [
      {
        id: "r1",
        name: "Dev",
        requiredSkills: [{ skillId: "sk1", level: 75 }],
      },
    ],
  },
};

describe("applyCatalogPackage", () => {
  it("upserts entities and sets catalog meta", async () => {
    const db = createMemoryDb();
    const result = await applyCatalogPackage(db, pkgV1);
    expect(result.ok).toBe(true);
    expect(result.report?.added.skills).toBe(1);
    expect(db.stores.skills.get("sk1")).toMatchObject({
      name: "TS",
      catalogSource: "catalog",
      catalogDeprecated: false,
      requiredByRoleIds: ["r1"],
    });
    const settings = await db.getSettings();
    expect(settings.installedCatalogMeta?.version).toBe("1.0.0");
  });

  it("content-only merge does not overwrite Manage installed version", async () => {
    const db = createMemoryDb();
    await db.saveSettings({
      projectTitle: "Manage",
      installedCatalogMeta: {
        catalogId: "manage-line",
        name: "SoT",
        version: "2.5.0",
        publishedAt: "2026-06-01T00:00:00.000Z",
        changelog: [],
        minAppFormatVersion: 1,
      },
    });
    const incoming = {
      ...pkgV1,
      meta: { ...pkgV1.meta, version: "9.9.9", catalogId: "from-full" },
    };
    const result = await applyCatalogPackage(db, incoming, {
      updateInstalledMeta: false,
      allowCatalogIdChange: true,
      allowDowngrade: true,
      missingPolicy: "keep",
    });
    expect(result.ok).toBe(true);
    expect(db.stores.skills.get("sk1")?.name).toBe("TS");
    const settings = await db.getSettings();
    expect(settings.installedCatalogMeta?.version).toBe("2.5.0");
    expect(settings.installedCatalogMeta?.catalogId).toBe("manage-line");
  });

  it("soft-deprecates missing catalog-sourced skills without deleting assessments", async () => {
    const db = createMemoryDb({
      categories: [
        { id: "c1", name: "Tech", catalogSource: "catalog" },
      ],
      subcategories: [
        {
          id: "s1",
          categoryId: "c1",
          name: "Lang",
          catalogSource: "catalog",
        },
      ],
      skills: [
        {
          id: "sk1",
          subCategoryId: "s1",
          name: "TS",
          catalogSource: "catalog",
        },
        {
          id: "sk-old",
          subCategoryId: "s1",
          name: "Old",
          catalogSource: "catalog",
        },
      ],
      roles: [{ id: "r1", name: "Dev", catalogSource: "catalog" }],
      assessments: [
        {
          id: "a1",
          employeeId: "e1",
          skillId: "sk-old",
          level: 50,
        },
      ],
    });

    const result = await applyCatalogPackage(db, pkgV1, {
      missingPolicy: "soft",
    });
    expect(result.ok).toBe(true);
    expect(result.report?.deprecated.skills).toBeGreaterThanOrEqual(1);
    expect(db.stores.skills.get("sk-old")).toMatchObject({
      catalogDeprecated: true,
    });
    // assessment still present
    expect(db.stores.assessments.get("a1")).toBeDefined();
    expect(result.report?.orphanAssessments).toBe(1);
  });

  it("rejects version downgrade without allowDowngrade", async () => {
    const db = createMemoryDb();
    await applyCatalogPackage(db, {
      ...pkgV1,
      meta: { ...pkgV1.meta, version: "2.0.0" },
    });
    const down = await applyCatalogPackage(db, pkgV1);
    expect(down.ok).toBe(false);
  });

  it("preserves local departmentId on skill upsert", async () => {
    const db = createMemoryDb({
      skills: [
        {
          id: "sk1",
          subCategoryId: "s1",
          name: "TS",
          departmentId: "local-dept",
          catalogSource: "local",
        },
      ],
    });
    await applyCatalogPackage(db, pkgV1);
    expect(db.stores.skills.get("sk1")).toMatchObject({
      departmentId: "local-dept",
    });
  });
});

describe("importOpsFromExportData", () => {
  it("imports employees and departments but not catalog", async () => {
    const db = createMemoryDb();
    const report = await importOpsFromExportData(
      db,
      {
        employees: [{ id: "e1", name: "Max" }],
        departments: [{ id: "d1", name: "Eng" }],
        categories: [{ id: "c1", name: "ShouldNotImport" }],
        subcategories: [],
        skills: [],
        assessments: [],
        roles: [],
        settings: { id: "default", projectTitle: "Ops", updatedAt: 1 },
        history: [],
      },
      {}
    );
    expect(report.imported.employees).toBe(1);
    expect(report.imported.departments).toBe(1);
    expect(db.stores.categories.size).toBe(0);
    expect(report.skipped).toContain("categories");
  });
});
