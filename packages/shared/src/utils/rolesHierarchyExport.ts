import type { EmployeeRole, Skill } from "../types";
import { LEVELS } from "../constants/skillLevels";

/** Role node in the structured roles export. */
export interface ExportedRoleNode {
  id: string;
  name: string;
  description?: string;
  icon?: string;
  inheritsFromId?: string;
  inheritsFromName?: string;
  requiredSkills: Array<{
    skillId: string;
    skillName: string;
    level: number;
  }>;
}

/** Structured JSON payload for roles export. */
export interface RolesHierarchyExport {
  format: "skillgrid-roles-v1";
  exportedAt: string;
  projectTitle: string;
  counts: { roles: number };
  roles: ExportedRoleNode[];
}

/** Names-only roles tree (no IDs). */
export interface RolesHierarchyNamesOnly {
  format: "skillgrid-roles-names-v1";
  projectTitle: string;
  roles: Array<{
    name: string;
    inheritsFrom?: string;
    skills: string[];
  }>;
}

const sortByName = <T extends { name: string }>(items: T[]): T[] =>
  [...items].sort((a, b) => a.name.localeCompare(b.name, "de"));

function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
}

function levelTitle(level: number): string {
  return LEVELS.find((l) => l.value === level)?.title ?? `${level}%`;
}

/**
 * Builds a portable roles export with IDs, inheritance and required skills.
 */
export function buildRolesHierarchyExport(
  roles: EmployeeRole[],
  skills: Skill[],
  projectTitle: string,
  exportedAt: string = new Date().toISOString()
): RolesHierarchyExport {
  const validRoles = sortByName(roles.filter((r) => r.id));
  const skillById = new Map(skills.filter((s) => s.id).map((s) => [s.id!, s]));

  const nodes: ExportedRoleNode[] = validRoles.map((role) => {
    const parent = role.inheritsFromId
      ? validRoles.find((r) => r.id === role.inheritsFromId)
      : undefined;
    const requiredSkills = (role.requiredSkills || [])
      .map((req) => {
        const skill = skillById.get(req.skillId);
        return {
          skillId: req.skillId,
          skillName: skill?.name || req.skillId,
          level: req.level,
        };
      })
      .sort((a, b) => a.skillName.localeCompare(b.skillName, "de"));

    return {
      id: role.id!,
      name: role.name,
      ...(role.description ? { description: role.description } : {}),
      ...(role.icon ? { icon: role.icon } : {}),
      ...(role.inheritsFromId ? { inheritsFromId: role.inheritsFromId } : {}),
      ...(parent ? { inheritsFromName: parent.name } : {}),
      requiredSkills,
    };
  });

  return {
    format: "skillgrid-roles-v1",
    exportedAt,
    projectTitle: projectTitle || "SkillGrid",
    counts: { roles: nodes.length },
    roles: nodes,
  };
}

export function buildRolesHierarchyNamesOnly(
  data: RolesHierarchyExport
): RolesHierarchyNamesOnly {
  return {
    format: "skillgrid-roles-names-v1",
    projectTitle: data.projectTitle,
    roles: data.roles.map((role) => ({
      name: role.name,
      ...(role.inheritsFromName ? { inheritsFrom: role.inheritsFromName } : {}),
      skills: role.requiredSkills.map((s) => s.skillName),
    })),
  };
}

export function formatRolesHierarchyAsMarkdown(
  data: RolesHierarchyExport
): string {
  const lines: string[] = [
    `# Rollen: ${data.projectTitle}`,
    "",
    `_Nur Namen · ${data.counts.roles} Rollen_`,
    "",
  ];

  if (data.roles.length === 0) {
    lines.push("_Keine Rollen vorhanden._");
    return lines.join("\n");
  }

  for (const role of data.roles) {
    lines.push(`## ${role.name}`);
    lines.push("");
    if (role.inheritsFromName) {
      lines.push(`_Erbt von: ${role.inheritsFromName}_`);
      lines.push("");
    }
    const plain = role.description ? stripHtml(role.description) : "";
    if (plain) {
      lines.push(plain);
      lines.push("");
    }
    if (role.requiredSkills.length === 0) {
      lines.push("- _(keine Skills zugeordnet)_");
      lines.push("");
      continue;
    }
    for (const req of role.requiredSkills) {
      lines.push(`- ${req.skillName} (${levelTitle(req.level)})`);
    }
    lines.push("");
  }

  return lines.join("\n").trimEnd() + "\n";
}

export function formatRolesHierarchyAsTree(data: RolesHierarchyExport): string {
  const lines: string[] = [
    `Rollen: ${data.projectTitle}`,
    `(nur Namen · ${data.counts.roles} Rollen)`,
    "",
  ];

  if (data.roles.length === 0) {
    lines.push("(leer)");
    return lines.join("\n");
  }

  data.roles.forEach((role, index) => {
    const inherit = role.inheritsFromName ? ` ← ${role.inheritsFromName}` : "";
    lines.push(`${role.name}${inherit}`);
    const items = role.requiredSkills.map((s) => s.skillName);
    items.forEach((name, i) => {
      const last = i === items.length - 1;
      lines.push(`${last ? "└── " : "├── "}${name}`);
    });
    if (items.length === 0) {
      lines.push("└── (keine Skills)");
    }
    if (index < data.roles.length - 1) {
      lines.push("");
    }
  });

  return lines.join("\n") + "\n";
}

function downloadTextFile(
  content: string,
  projectTitle: string,
  suffix: string,
  extension: string,
  mimeType: string
): void {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  const now = new Date();
  const dateStr = now.toISOString().split("T")[0];
  const timeStr = now.toLocaleTimeString("de-DE").replace(/:/g, "-");
  const safeTitle = (projectTitle || "SkillGrid").replace(/[^a-z0-9]/gi, "_");
  a.download = `${safeTitle}_${suffix}_${dateStr}_${timeStr}.${extension}`;
  a.click();
  URL.revokeObjectURL(url);
}

export function downloadRolesHierarchyJson(
  data: RolesHierarchyExport,
  projectTitle: string
): void {
  downloadTextFile(
    JSON.stringify(data, null, 2),
    projectTitle,
    "Rollen",
    "json",
    "application/json"
  );
}

export function downloadRolesHierarchyMarkdown(
  data: RolesHierarchyExport,
  projectTitle: string
): void {
  downloadTextFile(
    formatRolesHierarchyAsMarkdown(data),
    projectTitle,
    "Rollen_Struktur",
    "md",
    "text/markdown;charset=utf-8"
  );
}

export function downloadRolesHierarchyTree(
  data: RolesHierarchyExport,
  projectTitle: string
): void {
  downloadTextFile(
    formatRolesHierarchyAsTree(data),
    projectTitle,
    "Rollen_Struktur",
    "txt",
    "text/plain;charset=utf-8"
  );
}
