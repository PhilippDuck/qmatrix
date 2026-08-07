import { describe, it, expect } from "vitest";
import {
  buildSkillsHierarchyExport,
  formatSkillsHierarchyAsMarkdown,
  formatSkillsHierarchyAsTree,
  buildSkillsHierarchyNamesOnly,
} from "./skillsHierarchyExport";
import type { Category, Skill, SubCategory } from "../types";

describe("buildSkillsHierarchyExport", () => {
  const categories: Category[] = [
    { id: "c1", name: "Technik", description: "Tech-Kategorie" },
    { id: "c2", name: "Soft Skills" },
  ];

  const subcategories: SubCategory[] = [
    { id: "sc1", categoryId: "c1", name: "Backend" },
    { id: "sc2", categoryId: "c1", name: "Frontend", parentSubCategoryId: undefined },
    {
      id: "sc1-nested",
      categoryId: "c1",
      name: "Datenbanken",
      parentSubCategoryId: "sc1",
      description: "DB-Bereich",
    },
    { id: "sc3", categoryId: "c2", name: "Kommunikation" },
  ];

  const skills: Skill[] = [
    { id: "s1", subCategoryId: "sc1", name: "Node.js", description: "JS runtime" },
    { id: "s2", subCategoryId: "sc1-nested", name: "PostgreSQL", departmentId: "d1" },
    {
      id: "s3",
      subCategoryId: "sc2",
      name: "React",
      requiredByRoleIds: ["r1", "r2"],
    },
    { id: "s4", subCategoryId: "sc3", name: "Präsentation" },
  ];

  it("builds nested categories with subcategories and skills", () => {
    const result = buildSkillsHierarchyExport(
      categories,
      subcategories,
      skills,
      "Demo Project",
      "2026-08-07T12:00:00.000Z"
    );

    expect(result.format).toBe("skillgrid-skills-hierarchy-v1");
    expect(result.projectTitle).toBe("Demo Project");
    expect(result.exportedAt).toBe("2026-08-07T12:00:00.000Z");
    expect(result.counts).toEqual({
      categories: 2,
      subcategories: 4,
      skills: 4,
    });

    // Soft Skills comes before Technik when sorted by de locale name
    const soft = result.categories.find((c) => c.id === "c2")!;
    const tech = result.categories.find((c) => c.id === "c1")!;

    expect(soft.name).toBe("Soft Skills");
    expect(soft.subcategories).toHaveLength(1);
    expect(soft.subcategories[0].skills.map((s) => s.name)).toEqual([
      "Präsentation",
    ]);

    expect(tech.description).toBe("Tech-Kategorie");
    const backend = tech.subcategories.find((s) => s.id === "sc1")!;
    expect(backend.skills.map((s) => s.name)).toEqual(["Node.js"]);
    expect(backend.subcategories).toHaveLength(1);
    expect(backend.subcategories[0].name).toBe("Datenbanken");
    expect(backend.subcategories[0].description).toBe("DB-Bereich");
    expect(backend.subcategories[0].skills[0]).toMatchObject({
      id: "s2",
      name: "PostgreSQL",
      departmentId: "d1",
    });

    const frontend = tech.subcategories.find((s) => s.id === "sc2")!;
    expect(frontend.skills[0].requiredByRoleIds).toEqual(["r1", "r2"]);
  });

  it("returns empty tree when there is no data", () => {
    const result = buildSkillsHierarchyExport([], [], [], "");
    expect(result.projectTitle).toBe("SkillGrid");
    expect(result.categories).toEqual([]);
    expect(result.counts).toEqual({
      categories: 0,
      subcategories: 0,
      skills: 0,
    });
  });

  it("omits empty optional fields on skills", () => {
    const result = buildSkillsHierarchyExport(
      [{ id: "c", name: "C" }],
      [{ id: "sc", categoryId: "c", name: "SC" }],
      [{ id: "s", subCategoryId: "sc", name: "S" }],
      "P"
    );
    const skill = result.categories[0].subcategories[0].skills[0];
    expect(skill).toEqual({ id: "s", name: "S" });
    expect(skill).not.toHaveProperty("description");
    expect(skill).not.toHaveProperty("departmentId");
    expect(skill).not.toHaveProperty("requiredByRoleIds");
  });

  const full = () =>
    buildSkillsHierarchyExport(
      categories,
      subcategories,
      skills,
      "Demo Project",
      "2026-08-07T12:00:00.000Z"
    );

  it("formats names-only Markdown with headings and skill bullets", () => {
    const md = formatSkillsHierarchyAsMarkdown(full());
    expect(md).toContain("# Skills-Struktur: Demo Project");
    expect(md).toContain("## Soft Skills");
    expect(md).toContain("## Technik");
    expect(md).toContain("### Backend");
    expect(md).toContain("#### Datenbanken");
    expect(md).toContain("- Node.js");
    expect(md).toContain("- PostgreSQL");
    expect(md).not.toContain("c1");
    expect(md).not.toContain("JS runtime");
  });

  it("formats names-only Unicode tree", () => {
    const tree = formatSkillsHierarchyAsTree(full());
    expect(tree).toContain("Skills-Struktur: Demo Project");
    expect(tree).toContain("Technik");
    expect(tree).toContain("├── ");
    expect(tree).toContain("└── ");
    expect(tree).toContain("Node.js");
    expect(tree).toContain("PostgreSQL");
    expect(tree).not.toContain("s1");
  });

  it("builds names-only JSON without ids", () => {
    const names = buildSkillsHierarchyNamesOnly(full());
    expect(names.format).toBe("skillgrid-skills-names-v1");
    expect(names.categories.some((c) => c.name === "Technik")).toBe(true);
    const tech = names.categories.find((c) => c.name === "Technik")!;
    const backend = tech.subcategories.find((s) => s.name === "Backend")!;
    expect(backend.skills).toContain("Node.js");
    expect(backend.subcategories[0].skills).toContain("PostgreSQL");
    expect(JSON.stringify(names)).not.toMatch(/"id"/);
  });
});
