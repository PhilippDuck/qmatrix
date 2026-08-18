import { describe, it, expect } from "vitest";
import {
  buildRolesHierarchyExport,
  buildRolesHierarchyNamesOnly,
  formatRolesHierarchyAsMarkdown,
  formatRolesHierarchyAsTree,
} from "./rolesHierarchyExport";
import type { EmployeeRole, Skill } from "../types";

describe("buildRolesHierarchyExport", () => {
  const skills: Skill[] = [
    { id: "s1", subCategoryId: "sc1", name: "React" },
    { id: "s2", subCategoryId: "sc1", name: "TypeScript" },
  ];
  const roles: EmployeeRole[] = [
    {
      id: "r1",
      name: "Entwickler",
      description: "<p>Baut Features</p>",
      icon: "IconCode",
      requiredSkills: [
        { skillId: "s1", level: 75 },
        { skillId: "s2", level: 50 },
      ],
    },
    {
      id: "r2",
      name: "Senior Entwickler",
      inheritsFromId: "r1",
      requiredSkills: [{ skillId: "s1", level: 100 }],
    },
  ];

  it("exports roles with inheritance and skill names", () => {
    const data = buildRolesHierarchyExport(
      roles,
      skills,
      "Demo",
      "2026-08-18T12:00:00.000Z"
    );
    expect(data.format).toBe("skillgrid-roles-v1");
    expect(data.counts.roles).toBe(2);
    const dev = data.roles.find((r) => r.id === "r1")!;
    expect(dev.requiredSkills.map((s) => s.skillName).sort()).toEqual([
      "React",
      "TypeScript",
    ]);
    const senior = data.roles.find((r) => r.id === "r2")!;
    expect(senior.inheritsFromId).toBe("r1");
    expect(senior.inheritsFromName).toBe("Entwickler");
  });

  it("builds names-only without ids", () => {
    const names = buildRolesHierarchyNamesOnly(
      buildRolesHierarchyExport(roles, skills, "Demo")
    );
    expect(names.format).toBe("skillgrid-roles-names-v1");
    expect(JSON.stringify(names)).not.toMatch(/"id"/);
    const senior = names.roles.find((r) => r.name === "Senior Entwickler")!;
    expect(senior.inheritsFrom).toBe("Entwickler");
    expect(senior.skills).toContain("React");
  });

  it("formats markdown with headings and skill bullets", () => {
    const md = formatRolesHierarchyAsMarkdown(
      buildRolesHierarchyExport(roles, skills, "Demo")
    );
    expect(md).toContain("# Rollen: Demo");
    expect(md).toContain("## Entwickler");
    expect(md).toContain("_Erbt von: Entwickler_");
    expect(md).toContain("- React");
    expect(md).not.toContain("r1");
  });

  it("formats unicode tree", () => {
    const tree = formatRolesHierarchyAsTree(
      buildRolesHierarchyExport(roles, skills, "Demo")
    );
    expect(tree).toContain("Rollen: Demo");
    expect(tree).toContain("Senior Entwickler ← Entwickler");
    expect(tree).toContain("├── ");
    expect(tree).toContain("React");
  });
});
