/**
 * Parse external skill/role files (export JSON, names-only, Markdown, lists)
 * into a CatalogPackage and remap by name so suggestions merge instead of
 * duplicating existing local entities.
 */

import type {
  CatalogEntities,
  CatalogEntityKind,
  CatalogPackage,
} from "../types/catalog";
import {
  CATALOG_FORMAT,
  CATALOG_FORMAT_VERSION,
} from "../types/catalog";
import type {
  ExportedSubcategoryNode,
  SkillsHierarchyExport,
  SkillsHierarchyNamesOnly,
} from "../utils/skillsHierarchyExport";
import type {
  RolesHierarchyExport,
  RolesHierarchyNamesOnly,
} from "../utils/rolesHierarchyExport";
import { LEVELS } from "../constants/skillLevels";
import { parseImportAsCatalogPackage } from "./catalogMerge";

export type ExternalImportMode = "snapshot" | "suggestions";
export type CatalogMergeScope = "all" | "skills" | "roles";

export interface ExternalImportResult {
  ok: true;
  package: CatalogPackage;
  includedKinds: CatalogEntityKind[];
  mode: ExternalImportMode;
  sourceLabel: string;
  warnings: string[];
}

export interface ExternalImportFailure {
  ok: false;
  errors: string[];
}

export type ParseExternalImportResult =
  | ExternalImportResult
  | ExternalImportFailure;

const SKILL_KINDS: CatalogEntityKind[] = [
  "categories",
  "subcategories",
  "skills",
];
const ALL_KINDS: CatalogEntityKind[] = [
  "categories",
  "subcategories",
  "skills",
  "roles",
];

function newId(): string {
  return crypto.randomUUID();
}

function norm(name: string): string {
  return name.trim().toLowerCase().replace(/\s+/g, " ");
}

function emptyEntities(): CatalogEntities {
  return { categories: [], subcategories: [], skills: [], roles: [] };
}

function wrapPackage(
  entities: CatalogEntities,
  name: string,
  source: string
): CatalogPackage {
  return {
    format: CATALOG_FORMAT,
    formatVersion: CATALOG_FORMAT_VERSION,
    meta: {
      catalogId: `imported-${source}`,
      name,
      version: "0.0.0",
      publishedAt: new Date().toISOString(),
      changelog: [
        {
          version: "0.0.0",
          date: new Date().toISOString().slice(0, 10),
          notes: `Import aus ${source}`,
        },
      ],
      minAppFormatVersion: 1,
      partial: true,
    },
    entities,
  };
}

function kindsPresent(entities: CatalogEntities): CatalogEntityKind[] {
  return ALL_KINDS.filter((k) => (entities[k] || []).length > 0);
}

/** Flatten skillgrid-skills-hierarchy-v1 tree into catalog entities. */
export function flattenSkillsHierarchy(
  data: SkillsHierarchyExport
): CatalogEntities {
  const entities = emptyEntities();

  const walkSub = (
    sub: ExportedSubcategoryNode,
    categoryId: string,
    parentSubId?: string
  ) => {
    if (!sub.id || !sub.name?.trim()) return;
    entities.subcategories.push({
      id: sub.id,
      name: sub.name.trim(),
      categoryId,
      ...(parentSubId ? { parentSubCategoryId: parentSubId } : {}),
      ...(sub.description ? { description: sub.description } : {}),
    });
    for (const skill of sub.skills || []) {
      if (!skill.id || !skill.name?.trim()) continue;
      entities.skills.push({
        id: skill.id,
        name: skill.name.trim(),
        subCategoryId: sub.id,
        ...(skill.description ? { description: skill.description } : {}),
      });
    }
    for (const child of sub.subcategories || []) {
      walkSub(child, categoryId, sub.id);
    }
  };

  for (const cat of data.categories || []) {
    if (!cat.id || !cat.name?.trim()) continue;
    entities.categories.push({
      id: cat.id,
      name: cat.name.trim(),
      ...(cat.description ? { description: cat.description } : {}),
    });
    for (const sub of cat.subcategories || []) {
      walkSub(sub, cat.id);
    }
  }

  return entities;
}

function assignIdsToNamesTree(
  data: SkillsHierarchyNamesOnly
): CatalogEntities {
  const entities = emptyEntities();

  const walkSub = (
    sub: {
      name: string;
      skills: string[];
      subcategories: SkillsHierarchyNamesOnly["categories"][number]["subcategories"];
    },
    categoryId: string,
    parentSubId?: string
  ) => {
    const subId = newId();
    entities.subcategories.push({
      id: subId,
      name: sub.name.trim(),
      categoryId,
      ...(parentSubId ? { parentSubCategoryId: parentSubId } : {}),
    });
    for (const skillName of sub.skills || []) {
      if (!skillName?.trim()) continue;
      entities.skills.push({
        id: newId(),
        name: skillName.trim(),
        subCategoryId: subId,
      });
    }
    for (const child of sub.subcategories || []) {
      walkSub(child, categoryId, subId);
    }
  };

  for (const cat of data.categories || []) {
    if (!cat.name?.trim()) continue;
    const catId = newId();
    entities.categories.push({ id: catId, name: cat.name.trim() });
    for (const sub of cat.subcategories || []) {
      walkSub(sub, catId);
    }
  }

  return entities;
}

function flattenRolesExport(data: RolesHierarchyExport): CatalogEntities {
  const entities = emptyEntities();
  for (const role of data.roles || []) {
    if (!role.id || !role.name?.trim()) continue;
    entities.roles.push({
      id: role.id,
      name: role.name.trim(),
      ...(role.description ? { description: role.description } : {}),
      ...(role.icon ? { icon: role.icon } : {}),
      ...(role.inheritsFromId ? { inheritsFromId: role.inheritsFromId } : {}),
      requiredSkills: (role.requiredSkills || []).map((req) => ({
        skillId: req.skillId,
        level: req.level,
        // keep name in a side channel via synthetic id if missing — resolved later
      })),
    });
  }
  return entities;
}

/**
 * Remap incoming entity IDs onto live IDs when the same name (and parent)
 * already exists. Prevents duplicates when importing from another instance.
 */
export function remapCatalogEntitiesByName(
  incoming: CatalogEntities,
  live: CatalogEntities
): CatalogEntities {
  const catMap = new Map<string, string>();
  const subMap = new Map<string, string>();
  const skillMap = new Map<string, string>();
  const roleMap = new Map<string, string>();

  const liveCatByName = new Map(
    live.categories.map((c) => [norm(c.name), c.id])
  );
  const liveSubByKey = new Map<string, string>();
  for (const s of live.subcategories) {
    liveSubByKey.set(
      `${s.categoryId}::${s.parentSubCategoryId ?? ""}::${norm(s.name)}`,
      s.id
    );
  }
  const liveSkillByKey = new Map<string, string>();
  for (const s of live.skills) {
    liveSkillByKey.set(`${s.subCategoryId}::${norm(s.name)}`, s.id);
  }
  const liveRoleByName = new Map(live.roles.map((r) => [norm(r.name), r.id]));

  const categories = incoming.categories.map((c) => {
    const existing = liveCatByName.get(norm(c.name));
    const id = existing || c.id;
    catMap.set(c.id, id);
    return { ...c, id };
  });

  // Parents before children so parentSubCategoryId can be remapped
  const incomingSubs = [...incoming.subcategories];
  incomingSubs.sort((a, b) => {
    const da = a.parentSubCategoryId ? 1 : 0;
    const db = b.parentSubCategoryId ? 1 : 0;
    return da - db;
  });
  // Multiple passes for deeper nesting
  const pending = [...incomingSubs];
  const mappedSubs: CatalogEntities["subcategories"] = [];
  let guard = 0;
  while (pending.length > 0 && guard < incomingSubs.length + 8) {
    guard++;
    const still: typeof pending = [];
    for (const sub of pending) {
      const categoryId = catMap.get(sub.categoryId) || sub.categoryId;
      const parentSubId = sub.parentSubCategoryId
        ? subMap.get(sub.parentSubCategoryId)
        : undefined;
      if (sub.parentSubCategoryId && !parentSubId && !subMap.has(sub.parentSubCategoryId)) {
        // parent not mapped yet
        still.push(sub);
        continue;
      }
      const key = `${categoryId}::${parentSubId ?? ""}::${norm(sub.name)}`;
      const existing = liveSubByKey.get(key);
      const id = existing || sub.id;
      subMap.set(sub.id, id);
      mappedSubs.push({
        ...sub,
        id,
        categoryId,
        ...(parentSubId ? { parentSubCategoryId: parentSubId } : {}),
      });
    }
    if (still.length === pending.length) {
      // cycle / missing parent — map remaining as-is
      for (const sub of still) {
        const categoryId = catMap.get(sub.categoryId) || sub.categoryId;
        subMap.set(sub.id, sub.id);
        mappedSubs.push({ ...sub, categoryId });
      }
      break;
    }
    pending.length = 0;
    pending.push(...still);
  }

  const skills = incoming.skills.map((s) => {
    const subCategoryId = subMap.get(s.subCategoryId) || s.subCategoryId;
    const existing = liveSkillByKey.get(`${subCategoryId}::${norm(s.name)}`);
    const id = existing || s.id;
    skillMap.set(s.id, id);
    return { ...s, id, subCategoryId };
  });

  const roles = incoming.roles.map((r) => {
    const existing = liveRoleByName.get(norm(r.name));
    const id = existing || r.id;
    roleMap.set(r.id, id);
    return r;
  });

  const remappedRoles = roles.map((r) => {
    const inheritsFromId = r.inheritsFromId
      ? roleMap.get(r.inheritsFromId) || r.inheritsFromId
      : undefined;
    const requiredSkills = (r.requiredSkills || []).map((req) => {
      const mappedSkill = skillMap.get(req.skillId);
      if (mappedSkill) return { ...req, skillId: mappedSkill };
      // skill not in this import — keep id (hydrate later from live)
      return req;
    });
    return {
      ...r,
      id: roleMap.get(r.id) || r.id,
      ...(inheritsFromId ? { inheritsFromId } : {}),
      requiredSkills,
    };
  });

  return {
    categories,
    subcategories: mappedSubs,
    skills,
    roles: remappedRoles,
  };
}

/**
 * Attach live skill/sub/category entities referenced by imported roles so
 * validateCatalogPackage accepts requiredSkills.
 */
export function hydrateRoleSkillGraph(
  entities: CatalogEntities,
  live: CatalogEntities,
  skillNamesByRole?: Map<string, Array<{ name: string; level: number }>>
): { entities: CatalogEntities; warnings: string[] } {
  const warnings: string[] = [];
  const skillIds = new Set(entities.skills.map((s) => s.id));
  const liveSkillById = new Map(live.skills.map((s) => [s.id, s]));
  const liveSkillByName = new Map<string, (typeof live.skills)[number]>();
  for (const s of live.skills) {
    const key = norm(s.name);
    if (!liveSkillByName.has(key)) liveSkillByName.set(key, s);
  }
  const liveSubById = new Map(live.subcategories.map((s) => [s.id, s]));
  const liveCatById = new Map(live.categories.map((c) => [c.id, c]));

  const extraSkills = [...entities.skills];
  const extraSubs = [...entities.subcategories];
  const extraCats = [...entities.categories];
  const subIds = new Set(extraSubs.map((s) => s.id));
  const catIds = new Set(extraCats.map((c) => c.id));

  const addSkillTree = (skillId: string) => {
    if (skillIds.has(skillId)) return true;
    const liveSkill = liveSkillById.get(skillId);
    if (!liveSkill) return false;
    extraSkills.push({
      id: liveSkill.id,
      name: liveSkill.name,
      subCategoryId: liveSkill.subCategoryId,
      ...(liveSkill.description
        ? { description: liveSkill.description }
        : {}),
    });
    skillIds.add(liveSkill.id);
    const sub = liveSubById.get(liveSkill.subCategoryId);
    if (sub && !subIds.has(sub.id)) {
      extraSubs.push({
        id: sub.id,
        name: sub.name,
        categoryId: sub.categoryId,
        ...(sub.parentSubCategoryId
          ? { parentSubCategoryId: sub.parentSubCategoryId }
          : {}),
        ...(sub.description ? { description: sub.description } : {}),
      });
      subIds.add(sub.id);
      const cat = liveCatById.get(sub.categoryId);
      if (cat && !catIds.has(cat.id)) {
        extraCats.push({
          id: cat.id,
          name: cat.name,
          ...(cat.description ? { description: cat.description } : {}),
        });
        catIds.add(cat.id);
      }
    }
    return true;
  };

  const roles = entities.roles.map((role) => {
    const extraNames = skillNamesByRole?.get(role.id) || [];
    const reqs = [...(role.requiredSkills || [])];

    for (const extra of extraNames) {
      const liveSkill = liveSkillByName.get(norm(extra.name));
      if (!liveSkill) {
        warnings.push(
          `Rolle „${role.name}“: Skill „${extra.name}“ existiert lokal nicht — Zuordnung übersprungen.`
        );
        continue;
      }
      if (!reqs.some((r) => r.skillId === liveSkill.id)) {
        reqs.push({ skillId: liveSkill.id, level: extra.level });
      }
    }

    const kept = reqs.filter((req) => {
      if (addSkillTree(req.skillId)) return true;
      warnings.push(
        `Rolle „${role.name}“: unbekannte Skill-Referenz — Zuordnung übersprungen.`
      );
      return false;
    });

    return { ...role, requiredSkills: kept };
  });

  return {
    entities: {
      categories: extraCats,
      subcategories: extraSubs,
      skills: extraSkills,
      roles,
    },
    warnings,
  };
}

function parseLevelToken(raw: string): number {
  const trimmed = raw.trim();
  const asNum = Number(trimmed.replace(/%/g, ""));
  if (Number.isFinite(asNum) && LEVELS.some((l) => l.value === asNum)) {
    return asNum;
  }
  const byTitle = LEVELS.find(
    (l) => norm(l.title) === norm(trimmed) || norm(l.label) === norm(trimmed)
  );
  return byTitle?.value ?? 75;
}

interface ParsedSkillLine {
  name: string;
  level?: number;
}

function parseSkillBullet(line: string): ParsedSkillLine | null {
  const m = line.match(/^\s*[-*]\s+(.+?)\s*$/);
  if (!m) return null;
  let body = m[1].trim();
  if (!body || body.startsWith("_") || body.startsWith("(")) return null;
  const withLevel = body.match(/^(.+?)\s*\(([^)]+)\)\s*$/);
  if (withLevel) {
    return { name: withLevel[1].trim(), level: parseLevelToken(withLevel[2]) };
  }
  return { name: body };
}

function isMetaLine(line: string): boolean {
  const t = line.trim();
  if (!t) return true;
  if (t.startsWith("_") && t.endsWith("_")) return true;
  if (t.startsWith("(") && t.endsWith(")")) return true;
  if (t.startsWith("Skills-Struktur:")) return true;
  if (t.startsWith("Rollen:")) return true;
  return false;
}

/** Parse exported (or similar) Markdown into a names-only skills tree. */
export function parseSkillsMarkdown(md: string): SkillsHierarchyNamesOnly | null {
  const lines = md.replace(/\r\n/g, "\n").split("\n");
  let projectTitle = "Import";
  const categories: SkillsHierarchyNamesOnly["categories"] = [];

  type SubNode = {
    name: string;
    skills: string[];
    subcategories: SubNode[];
    level: number;
  };

  let currentCat: SkillsHierarchyNamesOnly["categories"][number] | null = null;
  const subStack: SubNode[] = [];

  const flushCat = () => {
    currentCat = null;
    subStack.length = 0;
  };

  for (const raw of lines) {
    const line = raw.trimEnd();
    const heading = line.match(/^(#{1,6})\s+(.+)$/);
    if (heading) {
      const level = heading[1].length;
      const title = heading[2].trim();
      if (level === 1) {
        projectTitle = title.replace(/^Skills-Struktur:\s*/i, "").trim() || title;
        flushCat();
        continue;
      }
      if (level === 2) {
        currentCat = { name: title, subcategories: [] };
        categories.push(currentCat);
        subStack.length = 0;
        continue;
      }
      if (!currentCat) {
        currentCat = { name: title, subcategories: [] };
        categories.push(currentCat);
      }
      const node: SubNode = { name: title, skills: [], subcategories: [], level };
      while (subStack.length && subStack[subStack.length - 1].level >= level) {
        subStack.pop();
      }
      if (subStack.length === 0) {
        currentCat.subcategories.push(node);
      } else {
        subStack[subStack.length - 1].subcategories.push(node);
      }
      subStack.push(node);
      continue;
    }

    const bullet = parseSkillBullet(line);
    if (bullet && currentCat) {
      if (subStack.length === 0) {
        const implicit: SubNode = {
          name: "Allgemein",
          skills: [],
          subcategories: [],
          level: 3,
        };
        currentCat.subcategories.push(implicit);
        subStack.push(implicit);
      }
      subStack[subStack.length - 1].skills.push(bullet.name);
    }
  }

  if (categories.length === 0) return null;
  return { format: "skillgrid-skills-names-v1", projectTitle, categories };
}

interface ParsedRoleDraft {
  name: string;
  inheritsFrom?: string;
  description?: string;
  skills: Array<{ name: string; level: number }>;
}

/** Parse roles Markdown into drafts (names + optional skill names). */
export function parseRolesMarkdown(md: string): {
  projectTitle: string;
  roles: ParsedRoleDraft[];
} | null {
  const lines = md.replace(/\r\n/g, "\n").split("\n");
  let projectTitle = "Import";
  const roles: ParsedRoleDraft[] = [];
  let current: ParsedRoleDraft | null = null;
  const descParts: string[] = [];

  const commitDesc = () => {
    if (current && descParts.length) {
      current.description = descParts.join(" ").trim();
      descParts.length = 0;
    }
  };

  for (const raw of lines) {
    const line = raw.trim();
    const h1 = line.match(/^#\s+(.+)$/);
    if (h1) {
      projectTitle = h1[1].replace(/^Rollen:\s*/i, "").trim() || h1[1];
      continue;
    }
    const h2 = line.match(/^##\s+(.+)$/);
    if (h2) {
      commitDesc();
      let name = h2[1].trim();
      let inheritsFrom: string | undefined;
      const inheritInline = name.match(/^(.+?)\s*\(\s*erbt von:\s*(.+?)\s*\)\s*$/i);
      if (inheritInline) {
        name = inheritInline[1].trim();
        inheritsFrom = inheritInline[2].trim();
      }
      current = { name, inheritsFrom, skills: [] };
      roles.push(current);
      continue;
    }
    if (!current) continue;

    const inheritLine = line.match(/^_Erbt von:\s*(.+?)_$/i);
    if (inheritLine) {
      current.inheritsFrom = inheritLine[1].trim();
      continue;
    }
    if (isMetaLine(line) || line.startsWith("###")) continue;

    const bullet = parseSkillBullet(line);
    if (bullet) {
      current.skills.push({ name: bullet.name, level: bullet.level ?? 75 });
      continue;
    }
    if (line) descParts.push(line);
  }
  commitDesc();

  if (roles.length === 0) return null;
  return { projectTitle, roles };
}

function draftsToRoleEntities(
  drafts: ParsedRoleDraft[],
  live: CatalogEntities
): {
  entities: CatalogEntities;
  skillNamesByRole: Map<string, Array<{ name: string; level: number }>>;
} {
  const liveRoleByName = new Map(live.roles.map((r) => [norm(r.name), r]));
  const skillNamesByRole = new Map<
    string,
    Array<{ name: string; level: number }>
  >();
  const roles: CatalogEntities["roles"] = drafts.map((d) => {
    const existing = liveRoleByName.get(norm(d.name));
    const id = existing?.id || newId();
    const parent = d.inheritsFrom
      ? liveRoleByName.get(norm(d.inheritsFrom))
      : undefined;
    skillNamesByRole.set(id, d.skills);
    return {
      id,
      name: d.name,
      ...(d.description ? { description: d.description } : {}),
      ...(existing?.icon ? { icon: existing.icon } : {}),
      ...(parent?.id ? { inheritsFromId: parent.id } : {}),
      requiredSkills: existing?.requiredSkills
        ? [...existing.requiredSkills]
        : [],
    };
  });

  // Second pass: inherit-from names that are also in this import
  const importedByName = new Map(roles.map((r) => [norm(r.name), r.id]));
  for (const d of drafts) {
    if (!d.inheritsFrom) continue;
    const role = roles.find((r) => norm(r.name) === norm(d.name));
    if (!role || role.inheritsFromId) continue;
    const fromImport = importedByName.get(norm(d.inheritsFrom));
    if (fromImport) role.inheritsFromId = fromImport;
  }

  return {
    entities: { ...emptyEntities(), roles },
    skillNamesByRole,
  };
}

function parseLooseNameList(
  text: string,
  scope: CatalogMergeScope
): CatalogEntities | null {
  const names = text
    .replace(/\r\n/g, "\n")
    .split("\n")
    .map((l) => l.replace(/^\s*[-*]\s+/, "").trim())
    .filter((l) => l && !isMetaLine(l) && !l.startsWith("#"));
  if (names.length === 0) return null;

  if (scope === "roles") {
    return {
      ...emptyEntities(),
      roles: names.map((name) => ({
        id: newId(),
        name,
        requiredSkills: [],
      })),
    };
  }

  const catId = newId();
  const subId = newId();
  return {
    categories: [{ id: catId, name: "Importierte Vorschläge" }],
    subcategories: [
      { id: subId, name: "Allgemein", categoryId: catId },
    ],
    skills: names.map((name) => ({
      id: newId(),
      name,
      subCategoryId: subId,
    })),
    roles: [],
  };
}

function isSkillsHierarchy(obj: Record<string, unknown>): obj is SkillsHierarchyExport {
  return (
    obj.format === "skillgrid-skills-hierarchy-v1" &&
    Array.isArray(obj.categories)
  );
}

function isSkillsNames(obj: Record<string, unknown>): obj is SkillsHierarchyNamesOnly {
  return (
    obj.format === "skillgrid-skills-names-v1" &&
    Array.isArray(obj.categories)
  );
}

function isRolesHierarchy(obj: Record<string, unknown>): obj is RolesHierarchyExport {
  return obj.format === "skillgrid-roles-v1" && Array.isArray(obj.roles);
}

function isRolesNames(obj: Record<string, unknown>): obj is RolesHierarchyNamesOnly {
  return obj.format === "skillgrid-roles-names-v1" && Array.isArray(obj.roles);
}

function collectRoleSkillNames(
  data: RolesHierarchyExport | RolesHierarchyNamesOnly
): Map<string, Array<{ name: string; level: number }>> {
  const map = new Map<string, Array<{ name: string; level: number }>>();
  if (data.format === "skillgrid-roles-v1") {
    for (const role of data.roles) {
      const list = (role.requiredSkills || []).map((s) => ({
        name: s.skillName,
        level: s.level,
      }));
      map.set(role.id, list);
      map.set(`name:${norm(role.name)}`, list);
    }
  } else {
    for (const role of data.roles) {
      map.set(
        `name:${norm(role.name)}`,
        (role.skills || []).map((name) => ({ name, level: 75 }))
      );
    }
  }
  return map;
}

export function scopeKinds(scope: CatalogMergeScope): CatalogEntityKind[] {
  if (scope === "skills") return SKILL_KINDS;
  if (scope === "roles") return ["roles"];
  return ALL_KINDS;
}

/**
 * Parse JSON object, JSON text, Markdown or a plain name list into a mergeable package.
 */
export function parseExternalCatalogImport(
  raw: unknown,
  live: CatalogEntities,
  options?: {
    text?: string;
    scope?: CatalogMergeScope;
    fileName?: string;
  }
): ParseExternalImportResult {
  const warnings: string[] = [];
  const scope = options?.scope ?? "all";
  const text =
    options?.text ?? (typeof raw === "string" ? raw : undefined);

  let obj: unknown = raw;
  if (typeof raw === "string") {
    try {
      obj = JSON.parse(raw);
    } catch {
      obj = null;
    }
  }

  let entities: CatalogEntities | null = null;
  let mode: ExternalImportMode = "suggestions";
  let sourceLabel = options?.fileName || "Import";
  let skillNamesByRole: Map<
    string,
    Array<{ name: string; level: number }>
  > | undefined;
  let projectName = "Importierter Katalog";

  if (obj && typeof obj === "object") {
    const rec = obj as Record<string, unknown>;

    if (isSkillsHierarchy(rec)) {
      entities = flattenSkillsHierarchy(rec);
      sourceLabel = rec.projectTitle || "Skills-Hierarchie";
      projectName = rec.projectTitle || projectName;
    } else if (isSkillsNames(rec)) {
      entities = assignIdsToNamesTree(rec);
      sourceLabel = rec.projectTitle || "Skills-Namen";
      projectName = rec.projectTitle || projectName;
    } else if (isRolesHierarchy(rec)) {
      entities = flattenRolesExport(rec);
      skillNamesByRole = collectRoleSkillNames(rec);
      sourceLabel = rec.projectTitle || "Rollen";
      projectName = rec.projectTitle || projectName;
    } else if (isRolesNames(rec)) {
      const drafts: ParsedRoleDraft[] = rec.roles.map((r) => ({
        name: r.name,
        inheritsFrom: r.inheritsFrom,
        skills: (r.skills || []).map((name) => ({ name, level: 75 })),
      }));
      const built = draftsToRoleEntities(drafts, live);
      entities = built.entities;
      skillNamesByRole = built.skillNamesByRole;
      sourceLabel = rec.projectTitle || "Rollen-Namen";
      projectName = rec.projectTitle || projectName;
    } else {
      const catalog = parseImportAsCatalogPackage(obj);
      if (catalog.ok) {
        entities = catalog.package.entities;
        mode = "snapshot";
        sourceLabel =
          catalog.package.meta.name ||
          `Katalog v${catalog.package.meta.version}`;
        projectName = catalog.package.meta.name || projectName;
        const pkg = catalog.package;
        const remapped =
          mode === "snapshot"
            ? entities
            : remapCatalogEntitiesByName(entities, live);
        const hydrated = hydrateRoleSkillGraph(remapped, live);
        warnings.push(...hydrated.warnings);
        return {
          ok: true,
          package: {
            ...pkg,
            entities: hydrated.entities,
            meta: { ...pkg.meta, partial: true },
          },
          includedKinds: kindsPresent(pkg.entities),
          mode,
          sourceLabel,
          warnings,
        };
      }
    }
  }

  if (!entities && text && text.trim()) {
    const looksLikeRoles =
      scope === "roles" ||
      /^#\s*Rollen\b/im.test(text) ||
      /_Erbt von:/i.test(text);

    if (looksLikeRoles && scope !== "skills") {
      const parsed = parseRolesMarkdown(text);
      if (parsed) {
        const built = draftsToRoleEntities(parsed.roles, live);
        entities = built.entities;
        skillNamesByRole = built.skillNamesByRole;
        sourceLabel = parsed.projectTitle;
        projectName = parsed.projectTitle;
      }
    }

    if (!entities && scope !== "roles") {
      const parsed = parseSkillsMarkdown(text);
      if (parsed) {
        entities = assignIdsToNamesTree(parsed);
        sourceLabel = parsed.projectTitle;
        projectName = parsed.projectTitle;
      }
    }

    if (!entities) {
      const loose = parseLooseNameList(text, scope);
      if (loose) {
        entities = loose;
        sourceLabel = "Namensliste";
        projectName = "Importierte Vorschläge";
        warnings.push(
          scope === "roles"
            ? "Als Liste neuer Rollen interpretiert."
            : "Als Liste neuer Skills unter „Importierte Vorschläge / Allgemein“ interpretiert."
        );
      }
    }
  }

  if (!entities || kindsPresent(entities).length === 0) {
    return {
      ok: false,
      errors: [
        "Kein unterstütztes Format. Erwartet: Katalog-JSON, Skills-/Rollen-Export, Markdown-Struktur oder eine Namensliste.",
      ],
    };
  }

  const remapped = remapCatalogEntitiesByName(entities, live);

  // Re-key skill name hints after role id remapping
  let namesForHydrate = skillNamesByRole;
  if (skillNamesByRole) {
    const next = new Map<string, Array<{ name: string; level: number }>>();
    for (const role of remapped.roles) {
      const byId = skillNamesByRole.get(role.id);
      const byOld = [...skillNamesByRole.entries()].find(([k]) => {
        if (k === role.id) return true;
        if (k.startsWith("name:") && k.slice(5) === norm(role.name)) return true;
        return false;
      });
      const list = byId || byOld?.[1];
      if (list) next.set(role.id, list);
    }
    namesForHydrate = next;
  }

  const hydrated = hydrateRoleSkillGraph(remapped, live, namesForHydrate);
  warnings.push(...hydrated.warnings);

  const included = kindsPresent(entities);
  return {
    ok: true,
    package: wrapPackage(hydrated.entities, projectName, sourceLabel),
    includedKinds: included,
    mode,
    sourceLabel,
    warnings,
  };
}

export { SKILL_KINDS, ALL_KINDS };
