import { describe, it, expect } from "vitest";
import {
  validateCatalogPackage,
  extractCatalogFromState,
  isValidSemVer,
  compareSemVer,
  bumpSemVer,
  recomputeRequiredByRoleIds,
  catalogDownloadFilename,
  computeContentHash,
  computeCatalogFingerprint,
  withContentHash,
} from "./catalog";
import type { CatalogPackage } from "../types/catalog";

const baseEntities = {
  categories: [{ id: "cat-1", name: "Tech" }],
  subcategories: [{ id: "sub-1", categoryId: "cat-1", name: "Lang" }],
  skills: [{ id: "sk-1", subCategoryId: "sub-1", name: "TypeScript" }],
  roles: [
    {
      id: "role-1",
      name: "Dev",
      requiredSkills: [{ skillId: "sk-1", level: 75 }],
    },
  ],
};

function makePkg(overrides?: Partial<CatalogPackage>): CatalogPackage {
  return {
    format: "skillgrid-catalog",
    formatVersion: 1,
    meta: {
      catalogId: "catalog-uuid-1",
      name: "Test Catalog",
      version: "1.0.0",
      publishedAt: "2026-08-07T00:00:00.000Z",
      changelog: [{ version: "1.0.0", date: "2026-08-07", notes: "init" }],
      minAppFormatVersion: 1,
      partial: false,
    },
    entities: structuredClone(baseEntities),
    ...overrides,
  };
}

describe("isValidSemVer / compareSemVer", () => {
  it("validates semver", () => {
    expect(isValidSemVer("1.0.0")).toBe(true);
    expect(isValidSemVer("0.1.2")).toBe(true);
    expect(isValidSemVer("1")).toBe(false);
    expect(isValidSemVer("v1.0.0")).toBe(false);
  });

  it("compares versions", () => {
    expect(compareSemVer("1.0.0", "1.0.1")).toBe(-1);
    expect(compareSemVer("2.0.0", "1.9.9")).toBe(1);
    expect(compareSemVer("1.2.3", "1.2.3")).toBe(0);
  });

  it("bumps versions", () => {
    expect(bumpSemVer("1.2.3", "patch")).toBe("1.2.4");
    expect(bumpSemVer("1.2.3", "minor")).toBe("1.3.0");
    expect(bumpSemVer("1.2.3", "major")).toBe("2.0.0");
    expect(bumpSemVer("bogus", "minor")).toBe("0.1.0");
  });
});

describe("validateCatalogPackage", () => {
  it("accepts a valid full package", () => {
    const result = validateCatalogPackage(makePkg());
    expect(result.ok).toBe(true);
    expect(result.package?.meta.partial).toBe(false);
  });

  it("defaults partial to false when omitted", () => {
    const pkg = makePkg();
    delete pkg.meta.partial;
    const result = validateCatalogPackage(pkg);
    expect(result.ok).toBe(true);
    expect(result.package?.meta.partial).toBe(false);
  });

  it("rejects wrong format", () => {
    const result = validateCatalogPackage({ ...makePkg(), format: "nope" });
    expect(result.ok).toBe(false);
    expect(result.errors.some((e) => e.path === "format")).toBe(true);
  });

  it("rejects missing skill id in requiredSkills", () => {
    const pkg = makePkg();
    pkg.entities.roles[0].requiredSkills = [{ skillId: "missing", level: 50 }];
    const result = validateCatalogPackage(pkg);
    expect(result.ok).toBe(false);
  });

  it("rejects minAppFormatVersion too high", () => {
    const pkg = makePkg();
    pkg.meta.minAppFormatVersion = 99;
    const result = validateCatalogPackage(pkg, { appFormatVersion: 1 });
    expect(result.ok).toBe(false);
  });

  it("rejects inheritance cycles", () => {
    const pkg = makePkg();
    pkg.entities.roles = [
      { id: "a", name: "A", inheritsFromId: "b" },
      { id: "b", name: "B", inheritsFromId: "a" },
    ];
    const result = validateCatalogPackage(pkg);
    expect(result.ok).toBe(false);
    expect(result.errors.some((e) => e.message.includes("cycle"))).toBe(true);
  });

  it("allows empty arrays when partial true (structure only)", () => {
    const pkg = makePkg({
      meta: {
        ...makePkg().meta,
        partial: true,
      },
      entities: {
        categories: [],
        subcategories: [],
        skills: [],
        roles: [],
      },
    });
    const result = validateCatalogPackage(pkg);
    expect(result.ok).toBe(true);
    expect(result.package?.meta.partial).toBe(true);
  });
});

describe("extractCatalogFromState", () => {
  it("extracts and strips requiredByRoleIds / departmentId from skills", () => {
    const result = extractCatalogFromState(
      {
        categories: [{ id: "cat-1", name: "Tech" }],
        subcategories: [{ id: "sub-1", categoryId: "cat-1", name: "Lang" }],
        skills: [
          {
            id: "sk-1",
            subCategoryId: "sub-1",
            name: "TS",
            departmentId: "dept-x",
            requiredByRoleIds: ["role-1"],
          },
        ],
        roles: [
          {
            id: "role-1",
            name: "Dev",
            requiredSkills: [{ skillId: "sk-1", level: 100 }],
          },
        ],
      },
      {
        catalogId: "c1",
        name: "My Catalog",
        version: "1.0.0",
      }
    );

    expect(result.ok).toBe(true);
    const skill = result.package!.entities.skills[0] as Record<string, unknown>;
    expect(skill.departmentId).toBeUndefined();
    expect(skill.requiredByRoleIds).toBeUndefined();
    expect(result.package!.entities.roles[0].requiredSkills?.[0].level).toBe(
      100
    );
  });

  it("warns on orphan skill role links without inventing SoT", () => {
    const result = extractCatalogFromState(
      {
        categories: [{ id: "cat-1", name: "Tech" }],
        subcategories: [{ id: "sub-1", categoryId: "cat-1", name: "Lang" }],
        skills: [
          {
            id: "sk-1",
            subCategoryId: "sub-1",
            name: "TS",
            requiredByRoleIds: ["role-orphan"],
          },
        ],
        roles: [{ id: "role-1", name: "Dev", requiredSkills: [] }],
      },
      { catalogId: "c1", name: "Cat", version: "1.0.0" }
    );

    expect(result.ok).toBe(true);
    expect(result.report.orphanSkillRoleLinks).toHaveLength(1);
    expect(result.report.warnings.length).toBeGreaterThan(0);
  });
});

describe("recomputeRequiredByRoleIds", () => {
  it("derives reverse index from roles", () => {
    const map = recomputeRequiredByRoleIds(
      [{ id: "sk-1" }, { id: "sk-2" }],
      [
        {
          id: "role-1",
          requiredSkills: [
            { skillId: "sk-1", level: 50 },
            { skillId: "sk-2", level: 25 },
          ],
        },
        {
          id: "role-2",
          requiredSkills: [{ skillId: "sk-1", level: 100 }],
        },
      ]
    );
    expect(map.get("sk-1")).toEqual(["role-1", "role-2"]);
    expect(map.get("sk-2")).toEqual(["role-1"]);
  });
});

describe("contentHash + filename", () => {
  it("computes stable hash", async () => {
    const pkg = makePkg();
    const h1 = await computeContentHash(pkg.entities);
    const h2 = await computeContentHash(pkg.entities);
    expect(h1).toBe(h2);
    expect(h1.length).toBe(64);

    const withHash = await withContentHash(pkg);
    expect(withHash.contentHash).toBe(h1);

    const fp = await computeCatalogFingerprint(pkg.entities);
    expect(fp).toBe(h1.substring(0, 10).toUpperCase());
  });

  it("builds download filename", () => {
    const name = catalogDownloadFilename(makePkg().meta);
    expect(name).toMatch(/Test_Catalog_Katalog_v1\.0\.0_2026-08-07\.json/);
  });
});
