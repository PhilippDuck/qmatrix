import { describe, it, expect } from "vitest";
import { extractCatalogFromState, validateCatalogPackage } from "./catalog";
import {
  parseImportAsCatalogPackage,
  buildSelectiveMergePackage,
  selectionKey,
} from "./catalogMerge";
import { diffCatalogEntities } from "./catalogDiff";

const state = {
  categories: [{ id: "c1", name: "Cat", description: "" }],
  subcategories: [{ id: "s1", name: "Sub", categoryId: "c1" }],
  skills: [{ id: "sk1", name: "Skill", subCategoryId: "s1" }],
  roles: [
    {
      id: "r1",
      name: "Role",
      requiredSkills: [{ skillId: "sk1", level: 50 }],
      inheritsFromId: null as string | null,
    },
  ],
};

describe("Full catalog → Manage merge", () => {
  it("parses Full extract package", () => {
    const extract = extractCatalogFromState(state, {
      catalogId: "test",
      name: "Test",
      version: "1.0.0",
      partial: false,
    });
    expect(extract.ok).toBe(true);
    const parsed = parseImportAsCatalogPackage(extract.package);
    expect(parsed.ok).toBe(true);
  });

  it("selective package with all items validates for apply", () => {
    const extract = extractCatalogFromState(state, {
      catalogId: "test",
      name: "Test",
      version: "1.0.0",
      partial: false,
    });
    const pkg = extract.package!;
    const live = {
      categories: [],
      subcategories: [],
      skills: [],
      roles: [],
    };
    const diff = diffCatalogEntities(pkg.entities, live as never);
    const built = buildSelectiveMergePackage(pkg, diff.items);
    const v = validateCatalogPackage(built.package);
    expect(v.ok, JSON.stringify(v.errors)).toBe(true);
  });

  it("accepts plain Full ExportData backup and extracts catalog", () => {
    const fullBackup = {
      employees: [],
      categories: state.categories,
      subcategories: state.subcategories,
      skills: state.skills,
      roles: state.roles,
      assessments: [],
      departments: [],
      history: [],
      settings: { id: "default", projectTitle: "P", updatedAt: 1 },
    };
    const parsed = parseImportAsCatalogPackage(fullBackup);
    expect(parsed.ok).toBe(true);
    if (parsed.ok) {
      expect(parsed.package.entities.skills.length).toBe(1);
      expect(parsed.package.entities.roles.length).toBe(1);
    }
  });

  it("selective roles pull required skills so package validates", () => {
    const extract = extractCatalogFromState(state, {
      catalogId: "test",
      name: "Test",
      version: "1.0.0",
      partial: false,
    });
    const pkg = extract.package!;
    const live = {
      categories: [],
      subcategories: [],
      skills: [],
      roles: [],
    };
    const diff = diffCatalogEntities(pkg.entities, live as never);
    const onlyRole = diff.items.filter((i) => i.kind === "roles");
    const built = buildSelectiveMergePackage(pkg, onlyRole);
    expect(built.package.entities.skills.length).toBeGreaterThan(0);
    const v = validateCatalogPackage(built.package);
    expect(v.ok, JSON.stringify(v.errors)).toBe(true);
  });
});
