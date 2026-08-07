import type { Category, Skill, SubCategory } from "../types";

/** Nested skill node in the hierarchy export. */
export interface ExportedSkillNode {
  id: string;
  name: string;
  description?: string;
  departmentId?: string;
  requiredByRoleIds?: string[];
}

/** Nested subcategory (Bereich) with skills and optional child subcategories. */
export interface ExportedSubcategoryNode {
  id: string;
  name: string;
  description?: string;
  skills: ExportedSkillNode[];
  subcategories: ExportedSubcategoryNode[];
}

/** Top-level category with nested subcategories/skills. */
export interface ExportedCategoryNode {
  id: string;
  name: string;
  description?: string;
  subcategories: ExportedSubcategoryNode[];
}

/** Structured JSON payload for skills hierarchy export. */
export interface SkillsHierarchyExport {
  format: "skillgrid-skills-hierarchy-v1";
  exportedAt: string;
  projectTitle: string;
  counts: {
    categories: number;
    subcategories: number;
    skills: number;
  };
  categories: ExportedCategoryNode[];
}

const sortByName = <T extends { name: string }>(items: T[]): T[] =>
  [...items].sort((a, b) => a.name.localeCompare(b.name, "de"));

const toSkillNode = (skill: Skill): ExportedSkillNode => ({
  id: skill.id!,
  name: skill.name,
  ...(skill.description ? { description: skill.description } : {}),
  ...(skill.departmentId ? { departmentId: skill.departmentId } : {}),
  ...(skill.requiredByRoleIds?.length
    ? { requiredByRoleIds: skill.requiredByRoleIds }
    : {}),
});

const buildSubcategoryNode = (
  sub: SubCategory,
  allSubcategories: SubCategory[],
  allSkills: Skill[]
): ExportedSubcategoryNode => {
  const skills = sortByName(
    allSkills.filter((s) => s.subCategoryId === sub.id && s.id)
  ).map(toSkillNode);

  const childSubs = sortByName(
    allSubcategories.filter((s) => s.parentSubCategoryId === sub.id && s.id)
  );

  return {
    id: sub.id!,
    name: sub.name,
    ...(sub.description ? { description: sub.description } : {}),
    skills,
    subcategories: childSubs.map((child) =>
      buildSubcategoryNode(child, allSubcategories, allSkills)
    ),
  };
};

/**
 * Builds a nested categories → subcategories → skills tree suitable for JSON export.
 * Subcategories without a parent form the roots under each category.
 */
export function buildSkillsHierarchyExport(
  categories: Category[],
  subcategories: SubCategory[],
  skills: Skill[],
  projectTitle: string,
  exportedAt: string = new Date().toISOString()
): SkillsHierarchyExport {
  const validCategories = sortByName(categories.filter((c) => c.id));
  const validSubs = subcategories.filter((s) => s.id);
  const validSkills = skills.filter((s) => s.id);

  const tree = validCategories.map((cat) => {
    const rootSubs = sortByName(
      validSubs.filter(
        (s) => s.categoryId === cat.id && !s.parentSubCategoryId
      )
    );

    return {
      id: cat.id!,
      name: cat.name,
      ...(cat.description ? { description: cat.description } : {}),
      subcategories: rootSubs.map((sub) =>
        buildSubcategoryNode(sub, validSubs, validSkills)
      ),
    };
  });

  return {
    format: "skillgrid-skills-hierarchy-v1",
    exportedAt,
    projectTitle: projectTitle || "SkillGrid",
    counts: {
      categories: validCategories.length,
      subcategories: validSubs.length,
      skills: validSkills.length,
    },
    categories: tree,
  };
}

/**
 * Minimal name-only tree for sharing structure (no IDs, descriptions, role links).
 */
export interface SkillsHierarchyNamesOnly {
  format: "skillgrid-skills-names-v1";
  projectTitle: string;
  categories: Array<{
    name: string;
    subcategories: Array<NamesOnlySubcategory>;
  }>;
}

interface NamesOnlySubcategory {
  name: string;
  skills: string[];
  subcategories: NamesOnlySubcategory[];
}

const toNamesOnlySub = (sub: ExportedSubcategoryNode): NamesOnlySubcategory => ({
  name: sub.name,
  skills: sub.skills.map((s) => s.name),
  subcategories: sub.subcategories.map(toNamesOnlySub),
});

/** Builds a names-only nested object (JSON machine format without IDs). */
export function buildSkillsHierarchyNamesOnly(
  data: SkillsHierarchyExport
): SkillsHierarchyNamesOnly {
  return {
    format: "skillgrid-skills-names-v1",
    projectTitle: data.projectTitle,
    categories: data.categories.map((cat) => ({
      name: cat.name,
      subcategories: cat.subcategories.map(toNamesOnlySub),
    })),
  };
}

/**
 * Formats the hierarchy as Markdown: categories/areas as headings, skills as list items.
 * Best for human sharing (chat, mail, Notion, GitHub) — readable even as plain text.
 */
export function formatSkillsHierarchyAsMarkdown(
  data: SkillsHierarchyExport
): string {
  const lines: string[] = [
    `# Skills-Struktur: ${data.projectTitle}`,
    "",
    `_Nur Namen · ${data.counts.categories} Kategorien · ${data.counts.subcategories} Bereiche · ${data.counts.skills} Skills_`,
    "",
  ];

  if (data.categories.length === 0) {
    lines.push("_Keine Kategorien vorhanden._");
    return lines.join("\n");
  }

  const writeSub = (sub: ExportedSubcategoryNode, depth: number) => {
    // Category uses ## (2); first-level area ### (3); deeper areas deepen up to ######
    const level = Math.min(2 + depth, 6);
    lines.push(`${"#".repeat(level)} ${sub.name}`);
    lines.push("");

    for (const skill of sub.skills) {
      lines.push(`- ${skill.name}`);
    }
    if (sub.skills.length > 0) {
      lines.push("");
    }

    for (const child of sub.subcategories) {
      writeSub(child, depth + 1);
    }
  };

  for (const cat of data.categories) {
    lines.push(`## ${cat.name}`);
    lines.push("");

    if (cat.subcategories.length === 0) {
      lines.push("_Keine Bereiche_");
      lines.push("");
      continue;
    }

    for (const sub of cat.subcategories) {
      // depth 1 → ### under category heading
      writeSub(sub, 1);
    }
  }

  return lines.join("\n").trimEnd() + "\n";
}

type TreeItem = { label: string; children: TreeItem[] };

/**
 * Unicode tree (plain text) — maximally scannable in any editor without Markdown rendering.
 */
export function formatSkillsHierarchyAsTree(
  data: SkillsHierarchyExport
): string {
  const lines: string[] = [
    `Skills-Struktur: ${data.projectTitle}`,
    `(nur Namen · ${data.counts.categories} Kat. · ${data.counts.subcategories} Bereiche · ${data.counts.skills} Skills)`,
    "",
  ];

  if (data.categories.length === 0) {
    lines.push("(leer)");
    return lines.join("\n");
  }

  const writeChildren = (items: TreeItem[], prefix: string) => {
    items.forEach((item, index) => {
      const isLast = index === items.length - 1;
      const branch = isLast ? "└── " : "├── ";
      const childPrefix = prefix + (isLast ? "    " : "│   ");
      lines.push(`${prefix}${branch}${item.label}`);
      if (item.children.length > 0) {
        writeChildren(item.children, childPrefix);
      }
    });
  };

  const subToTree = (sub: ExportedSubcategoryNode): TreeItem => ({
    label: sub.name,
    children: [
      ...sub.skills.map((s): TreeItem => ({ label: s.name, children: [] })),
      ...sub.subcategories.map(subToTree),
    ],
  });

  data.categories.forEach((cat, catIndex) => {
    lines.push(cat.name);
    const children = cat.subcategories.map(subToTree);
    if (children.length > 0) {
      writeChildren(children, "");
    } else {
      lines.push("└── (keine Bereiche)");
    }
    if (catIndex < data.categories.length - 1) {
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

/** Full hierarchy as pretty-printed JSON (IDs, descriptions, role links). */
export function downloadSkillsHierarchyJson(
  data: SkillsHierarchyExport,
  projectTitle: string
): void {
  downloadTextFile(
    JSON.stringify(data, null, 2),
    projectTitle,
    "Skills",
    "json",
    "application/json"
  );
}

/** Names-only Markdown — best for human sharing / max visibility. */
export function downloadSkillsHierarchyMarkdown(
  data: SkillsHierarchyExport,
  projectTitle: string
): void {
  downloadTextFile(
    formatSkillsHierarchyAsMarkdown(data),
    projectTitle,
    "Skills_Struktur",
    "md",
    "text/markdown;charset=utf-8"
  );
}

/** Names-only Unicode tree as plain text. */
export function downloadSkillsHierarchyTree(
  data: SkillsHierarchyExport,
  projectTitle: string
): void {
  downloadTextFile(
    formatSkillsHierarchyAsTree(data),
    projectTitle,
    "Skills_Struktur",
    "txt",
    "text/plain;charset=utf-8"
  );
}
