import { describe, it, expect } from "vitest";
import {
  flattenSkillsHierarchy,
  parseExternalCatalogImport,
  parseRolesMarkdown,
  parseSkillsMarkdown,
  remapCatalogEntitiesByName,
} from "./catalogExternalImport";
import { buildSkillsHierarchyExport } from "../utils/skillsHierarchyExport";
import { buildRolesHierarchyExport } from "../utils/rolesHierarchyExport";
import type { CatalogEntities } from "../types/catalog";

const live: CatalogEntities = {
  categories: [{ id: "c-live", name: "Technik" }],
  subcategories: [
    { id: "sc-live", name: "Backend", categoryId: "c-live" },
  ],
  skills: [
    { id: "sk-live", name: "Node.js", subCategoryId: "sc-live" },
  ],
  roles: [
    {
      id: "r-live",
      name: "Entwickler",
      requiredSkills: [{ skillId: "sk-live", level: 50 }],
    },
  ],
};

describe("flattenSkillsHierarchy + remap", () => {
  it("remaps same names onto live ids (no duplicates)", () => {
    const hierarchy = buildSkillsHierarchyExport(
      [{ id: "c-other", name: "Technik" }],
      [{ id: "sc-other", categoryId: "c-other", name: "Backend" }],
      [
        {
          id: "sk-other",
          subCategoryId: "sc-other",
          name: "Node.js",
          description: "Aktualisierte Beschreibung",
        },
        { id: "sk-new", subCategoryId: "sc-other", name: "Go" },
      ],
      "Extern"
    );
    const flat = flattenSkillsHierarchy(hierarchy);
    const remapped = remapCatalogEntitiesByName(flat, live);
    expect(remapped.categories[0].id).toBe("c-live");
    expect(remapped.subcategories[0].id).toBe("sc-live");
    const node = remapped.skills.find((s) => s.name === "Node.js")!;
    expect(node.id).toBe("sk-live");
    expect(node.description).toBe("Aktualisierte Beschreibung");
    const go = remapped.skills.find((s) => s.name === "Go")!;
    expect(go.id).toBe("sk-new");
    expect(go.subCategoryId).toBe("sc-live");
  });
});

describe("parseExternalCatalogImport", () => {
  it("parses skills hierarchy export and matches existing names", () => {
    const hierarchy = buildSkillsHierarchyExport(
      [{ id: "cx", name: "Technik" }],
      [{ id: "sx", categoryId: "cx", name: "Backend" }],
      [{ id: "kx", subCategoryId: "sx", name: "PostgreSQL" }],
      "Vorschlag"
    );
    const parsed = parseExternalCatalogImport(hierarchy, live);
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    expect(parsed.mode).toBe("suggestions");
    expect(parsed.includedKinds).toContain("skills");
    const pg = parsed.package.entities.skills.find((s) => s.name === "PostgreSQL");
    expect(pg).toBeTruthy();
    expect(pg!.subCategoryId).toBe("sc-live");
  });

  it("parses official catalog package as snapshot", () => {
    const raw = {
      format: "skillgrid-catalog",
      formatVersion: 1,
      meta: {
        catalogId: "cat-1",
        name: "Official",
        version: "1.2.0",
        publishedAt: "2026-08-18T00:00:00.000Z",
        changelog: [],
        minAppFormatVersion: 1,
        partial: false,
      },
      entities: {
        categories: [{ id: "c1", name: "Neu" }],
        subcategories: [{ id: "s1", name: "Sub", categoryId: "c1" }],
        skills: [{ id: "k1", name: "Skill", subCategoryId: "s1" }],
        roles: [],
      },
    };
    const parsed = parseExternalCatalogImport(raw, live);
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    expect(parsed.mode).toBe("snapshot");
    expect(parsed.package.entities.categories.some((c) => c.id === "c1")).toBe(
      true
    );
  });

  it("parses team blueprint export as suggestions", () => {
    const raw = {
      format: "skillgrid-team-blueprint-v1",
      exportedAt: "2026-08-18T00:00:00.000Z",
      projectTitle: "Team Nord",
      entities: {
        categories: [{ id: "c-live", name: "Technik" }],
        subcategories: [
          { id: "sc-live", name: "Backend", categoryId: "c-live" },
        ],
        skills: [{ id: "sk-new", name: "Go", subCategoryId: "sc-live" }],
        roles: [{ id: "r-new", name: "Architekt" }],
      },
    };
    const parsed = parseExternalCatalogImport(raw, live);
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    expect(parsed.mode).toBe("suggestions");
    expect(parsed.sourceLabel).toContain("Team-Blaupause");
    const go = parsed.package.entities.skills.find((s) => s.name === "Go");
    expect(go).toBeTruthy();
    expect(go!.subCategoryId).toBe("sc-live");
    expect(
      parsed.package.entities.roles.some((r) => r.name === "Architekt")
    ).toBe(true);
  });

  it("parses roles export and binds skills by name", () => {
    const rolesExport = buildRolesHierarchyExport(
      [
        {
          id: "r-ext",
          name: "Entwickler",
          requiredSkills: [{ skillId: "foreign-skill", level: 75 }],
        },
        { id: "r-new", name: "Architekt", requiredSkills: [] },
      ],
      [{ id: "foreign-skill", subCategoryId: "x", name: "Node.js" }],
      "Extern"
    );
    const parsed = parseExternalCatalogImport(rolesExport, live);
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    const dev = parsed.package.entities.roles.find((r) => r.name === "Entwickler")!;
    expect(dev.id).toBe("r-live");
    expect(dev.requiredSkills?.some((s) => s.skillId === "sk-live")).toBe(true);
    expect(
      parsed.package.entities.roles.some((r) => r.name === "Architekt")
    ).toBe(true);
  });

  it("parses skills markdown headings and bullets", () => {
    const md = `# Skills-Struktur: Vorschlag

## Technik

### Backend

- Go
- Redis
`;
    const tree = parseSkillsMarkdown(md);
    expect(tree).not.toBeNull();
    expect(tree!.categories[0].name).toBe("Technik");
    expect(tree!.categories[0].subcategories[0].skills).toEqual(["Go", "Redis"]);

    const parsed = parseExternalCatalogImport(md, live, { text: md, scope: "skills" });
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    expect(parsed.mode).toBe("suggestions");
    const names = parsed.package.entities.skills.map((s) => s.name);
    expect(names).toEqual(expect.arrayContaining(["Go", "Redis"]));
  });

  it("parses roles markdown with inheritance", () => {
    const md = `# Rollen: Vorschlag

## Entwickler

- Node.js (75)

## Senior Entwickler
_Erbt von: Entwickler_

- Architektur
`;
    const parsedMd = parseRolesMarkdown(md);
    expect(parsedMd?.roles).toHaveLength(2);
    expect(parsedMd?.roles[1].inheritsFrom).toBe("Entwickler");

    const parsed = parseExternalCatalogImport(md, live, { text: md, scope: "roles" });
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    const senior = parsed.package.entities.roles.find(
      (r) => r.name === "Senior Entwickler"
    );
    expect(senior?.inheritsFromId).toBe("r-live");
  });

  it("treats a loose name list as skill suggestions", () => {
    const parsed = parseExternalCatalogImport("Kubernetes\nTerraform\n", live, {
      text: "Kubernetes\nTerraform\n",
      scope: "skills",
    });
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    expect(parsed.package.entities.categories[0].name).toBe(
      "Importierte Vorschläge"
    );
    expect(parsed.package.entities.skills.map((s) => s.name)).toEqual([
      "Kubernetes",
      "Terraform",
    ]);
  });
});
