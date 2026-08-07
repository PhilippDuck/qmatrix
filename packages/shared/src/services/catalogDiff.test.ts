import { describe, it, expect } from "vitest";
import { diffCatalogEntities, summarizeDiffCounts } from "./catalogDiff";
import type { CatalogEntities } from "../types/catalog";

const base: CatalogEntities = {
  categories: [{ id: "c1", name: "Tech" }],
  subcategories: [{ id: "s1", categoryId: "c1", name: "Lang" }],
  skills: [{ id: "sk1", subCategoryId: "s1", name: "TS" }],
  roles: [
    {
      id: "r1",
      name: "Dev",
      requiredSkills: [{ skillId: "sk1", level: 50 }],
    },
  ],
};

describe("diffCatalogEntities", () => {
  it("detects identical catalogs", () => {
    const d = diffCatalogEntities(base, structuredClone(base));
    expect(d.isIdentical).toBe(true);
    expect(d.items).toHaveLength(0);
  });

  it("detects added / removed / changed", () => {
    const current: CatalogEntities = {
      categories: [{ id: "c1", name: "Tech" }],
      subcategories: [{ id: "s1", categoryId: "c1", name: "Lang" }],
      skills: [
        { id: "sk1", subCategoryId: "s1", name: "TypeScript" }, // renamed
        { id: "sk2", subCategoryId: "s1", name: "Go" }, // added
      ],
      roles: [], // r1 removed
    };
    const d = diffCatalogEntities(current, base);
    expect(d.isIdentical).toBe(false);
    expect(d.summary.skills.changed).toBe(1);
    expect(d.summary.skills.added).toBe(1);
    expect(d.summary.roles.removed).toBe(1);
    const counts = summarizeDiffCounts(d);
    expect(counts.total).toBe(3);
  });

  it("ignores requiredByRoleIds drift on skills", () => {
    const current = structuredClone(base);
    (current.skills[0] as { requiredByRoleIds?: string[] }).requiredByRoleIds =
      ["r1"];
    const d = diffCatalogEntities(current, base);
    expect(d.isIdentical).toBe(true);
  });
});
