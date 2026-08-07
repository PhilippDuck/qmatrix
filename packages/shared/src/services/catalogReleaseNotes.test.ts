import { describe, it, expect } from "vitest";
import {
  buildCatalogReleaseNotesText,
  catalogReleaseNotesFilename,
} from "./catalogReleaseNotes";
import type { CatalogPackage } from "../types/catalog";

const basePkg: CatalogPackage = {
  format: "skillgrid-catalog",
  formatVersion: 1,
  meta: {
    catalogId: "c1",
    name: "Test Katalog",
    version: "1.1.0",
    publishedAt: "2026-08-07T12:00:00.000Z",
    publisher: "Manage",
    changelog: [],
    minAppFormatVersion: 1,
    partial: false,
  },
  entities: {
    categories: [{ id: "c1", name: "Tech" }],
    subcategories: [{ id: "s1", categoryId: "c1", name: "Lang" }],
    skills: [{ id: "sk1", subCategoryId: "s1", name: "TS" }],
    roles: [],
  },
  contentHash: "abc",
};

const prevPkg: CatalogPackage = {
  ...basePkg,
  meta: { ...basePkg.meta, version: "1.0.0" },
  entities: {
    categories: [{ id: "c1", name: "Tech" }],
    subcategories: [{ id: "s1", categoryId: "c1", name: "Lang" }],
    skills: [],
    roles: [],
  },
};

describe("catalogReleaseNotes", () => {
  it("builds filename with version and timestamp", () => {
    const name = catalogReleaseNotesFilename(basePkg.meta);
    expect(name).toMatch(
      /^Test_Katalog_Katalog_v1\.1\.0_2026-08-07_\d{2}-\d{2}-\d{2}_Aenderungen\.txt$/
    );
  });

  it("includes notes and entity diff vs previous", () => {
    const text = buildCatalogReleaseNotesText({
      pkg: basePkg,
      notes: "TypeScript hinzugefügt",
      previousPackage: prevPkg,
      previousVersion: "1.0.0",
    });
    expect(text).toContain("v1.1.0");
    expect(text).toContain("TypeScript hinzugefügt");
    expect(text).toContain("Vergleich mit:  v1.0.0");
    expect(text).toContain("TS");
    expect(text).toContain("Neu");
  });
});
