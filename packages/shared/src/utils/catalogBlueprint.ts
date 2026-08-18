/**
 * Team blueprint proposals: export for Manage merge + cleanup after catalog import.
 */

import type {
  Category,
  EmployeeRole,
  Skill,
  SubCategory,
} from "../types";
import type { CatalogEntities } from "../types/catalog";
import { isBlueprintEntity } from "./catalogVisibility";

export const TEAM_BLUEPRINT_FORMAT = "skillgrid-team-blueprint-v1" as const;

export interface TeamBlueprintExport {
  format: typeof TEAM_BLUEPRINT_FORMAT;
  exportedAt: string;
  projectTitle: string;
  note?: string;
  entities: CatalogEntities;
}

export function isTeamBlueprintExport(
  raw: unknown
): raw is TeamBlueprintExport {
  if (!raw || typeof raw !== "object") return false;
  const o = raw as Record<string, unknown>;
  return (
    o.format === TEAM_BLUEPRINT_FORMAT &&
    o.entities &&
    typeof o.entities === "object"
  );
}

function parentSubIds(
  start: SubCategory | undefined,
  all: SubCategory[]
): string[] {
  const ids: string[] = [];
  let current = start;
  const seen = new Set<string>();
  while (current?.parentSubCategoryId && !seen.has(current.parentSubCategoryId)) {
    seen.add(current.parentSubCategoryId);
    const parent = all.find((s) => s.id === current!.parentSubCategoryId);
    if (!parent?.id) break;
    ids.push(parent.id);
    current = parent;
  }
  return ids;
}

/** Blueprint rows plus official parent chain so Manage can attach them. */
export function buildTeamBlueprintEntities(
  categories: Category[],
  subcategories: SubCategory[],
  skills: Skill[],
  roles: EmployeeRole[]
): CatalogEntities {
  const blueprintSkills = skills.filter(
    (s) => isBlueprintEntity(s) && s.id
  );
  const blueprintSubs = subcategories.filter(
    (s) => isBlueprintEntity(s) && s.id
  );
  const blueprintCats = categories.filter(
    (c) => isBlueprintEntity(c) && c.id
  );
  const blueprintRoles = roles.filter((r) => isBlueprintEntity(r) && r.id);

  const neededSubIds = new Set<string>();
  const neededCatIds = new Set<string>();

  for (const cat of blueprintCats) {
    if (cat.id) neededCatIds.add(cat.id);
  }
  for (const sub of blueprintSubs) {
    if (sub.id) neededSubIds.add(sub.id);
    if (sub.categoryId) neededCatIds.add(sub.categoryId);
    for (const pid of parentSubIds(sub, subcategories)) {
      neededSubIds.add(pid);
    }
  }
  for (const skill of blueprintSkills) {
    if (skill.subCategoryId) neededSubIds.add(skill.subCategoryId);
    const sub = subcategories.find((s) => s.id === skill.subCategoryId);
    if (sub?.categoryId) neededCatIds.add(sub.categoryId);
    for (const pid of parentSubIds(sub, subcategories)) {
      neededSubIds.add(pid);
    }
  }

  const toCat = (c: Category) => ({
    id: c.id!,
    name: c.name,
    ...(c.description ? { description: c.description } : {}),
  });
  const toSub = (s: SubCategory) => ({
    id: s.id!,
    name: s.name,
    categoryId: s.categoryId,
    ...(s.parentSubCategoryId
      ? { parentSubCategoryId: s.parentSubCategoryId }
      : {}),
    ...(s.description ? { description: s.description } : {}),
  });
  const toSkill = (s: Skill) => ({
    id: s.id!,
    name: s.name,
    subCategoryId: s.subCategoryId,
    ...(s.description ? { description: s.description } : {}),
  });
  const toRole = (r: EmployeeRole) => ({
    id: r.id!,
    name: r.name,
    ...(r.description ? { description: r.description } : {}),
    ...(r.icon ? { icon: r.icon } : {}),
    ...(r.inheritsFromId ? { inheritsFromId: r.inheritsFromId } : {}),
    requiredSkills: (r.requiredSkills || []).filter((req) =>
      [...blueprintSkills, ...skills].some((s) => s.id === req.skillId)
    ),
  });

  return {
    categories: categories.filter((c) => c.id && neededCatIds.has(c.id)).map(toCat),
    subcategories: subcategories
      .filter((s) => s.id && neededSubIds.has(s.id))
      .map(toSub),
    skills: blueprintSkills.map(toSkill),
    roles: blueprintRoles.map(toRole),
  };
}

export function buildTeamBlueprintExport(
  categories: Category[],
  subcategories: SubCategory[],
  skills: Skill[],
  roles: EmployeeRole[],
  projectTitle: string,
  note?: string
): TeamBlueprintExport {
  return {
    format: TEAM_BLUEPRINT_FORMAT,
    exportedAt: new Date().toISOString(),
    projectTitle: projectTitle || "SkillGrid Team",
    ...(note?.trim() ? { note: note.trim() } : {}),
    entities: buildTeamBlueprintEntities(
      categories,
      subcategories,
      skills,
      roles
    ),
  };
}

export function countBlueprints(
  categories: Category[],
  subcategories: SubCategory[],
  skills: Skill[],
  roles: EmployeeRole[]
): number {
  return (
    categories.filter(isBlueprintEntity).length +
    subcategories.filter(isBlueprintEntity).length +
    skills.filter(isBlueprintEntity).length +
    roles.filter(isBlueprintEntity).length
  );
}

export type BlueprintProposalKind =
  | "categories"
  | "subcategories"
  | "skills"
  | "roles";

export interface BlueprintProposal {
  id: string;
  kind: BlueprintProposalKind;
  name: string;
  /** Breadcrumb including the item itself, e.g. "Technik › Backend › Go". */
  path: string;
}

const KIND_ORDER: BlueprintProposalKind[] = [
  "categories",
  "subcategories",
  "skills",
  "roles",
];

function subcategoryAncestorNames(
  sub: SubCategory | undefined,
  all: SubCategory[]
): string[] {
  const names: string[] = [];
  let current = sub;
  const seen = new Set<string>();
  while (current?.parentSubCategoryId && !seen.has(current.parentSubCategoryId)) {
    seen.add(current.parentSubCategoryId);
    const parent = all.find((s) => s.id === current!.parentSubCategoryId);
    if (!parent) break;
    names.unshift(parent.name);
    current = parent;
  }
  return names;
}

function subcategoryPath(
  sub: SubCategory,
  all: SubCategory[],
  categories: Category[]
): string {
  const cat = categories.find((c) => c.id === sub.categoryId);
  const parts = [
    ...(cat ? [cat.name] : []),
    ...subcategoryAncestorNames(sub, all),
    sub.name,
  ];
  return parts.join(" › ");
}

/** All live blueprint rows, grouped-ready and sorted for the export-bar summary. */
export function listBlueprintProposals(
  categories: Category[],
  subcategories: SubCategory[],
  skills: Skill[],
  roles: EmployeeRole[]
): BlueprintProposal[] {
  const items: BlueprintProposal[] = [];

  for (const c of categories) {
    if (!isBlueprintEntity(c) || !c.id) continue;
    items.push({ id: c.id, kind: "categories", name: c.name, path: c.name });
  }
  for (const s of subcategories) {
    if (!isBlueprintEntity(s) || !s.id) continue;
    items.push({
      id: s.id,
      kind: "subcategories",
      name: s.name,
      path: subcategoryPath(s, subcategories, categories),
    });
  }
  for (const sk of skills) {
    if (!isBlueprintEntity(sk) || !sk.id) continue;
    const sub = subcategories.find((s) => s.id === sk.subCategoryId);
    const parentPath = sub
      ? subcategoryPath(sub, subcategories, categories)
      : "";
    items.push({
      id: sk.id,
      kind: "skills",
      name: sk.name,
      path: parentPath ? `${parentPath} › ${sk.name}` : sk.name,
    });
  }
  for (const r of roles) {
    if (!isBlueprintEntity(r) || !r.id) continue;
    items.push({ id: r.id, kind: "roles", name: r.name, path: r.name });
  }

  return items.sort((a, b) => {
    const kindDiff = KIND_ORDER.indexOf(a.kind) - KIND_ORDER.indexOf(b.kind);
    if (kindDiff !== 0) return kindDiff;
    return a.path.localeCompare(b.path, "de");
  });
}

function norm(name: string): string {
  return name.trim().toLowerCase().replace(/\s+/g, " ");
}

/**
 * Blueprints that match an official catalog entity by name + parent path
 * (proposal accepted via Manage release + Team import).
 */
export function findResolvedBlueprintIds(
  live: {
    categories: Category[];
    subcategories: SubCategory[];
    skills: Skill[];
    roles: EmployeeRole[];
  }
): {
  categories: string[];
  subcategories: string[];
  skills: string[];
  roles: string[];
} {
  const officialCats = live.categories.filter((c) => !isBlueprintEntity(c));
  const officialSubs = live.subcategories.filter((s) => !isBlueprintEntity(s));
  const officialSkills = live.skills.filter((s) => !isBlueprintEntity(s));
  const officialRoles = live.roles.filter((r) => !isBlueprintEntity(r));

  const catByName = new Map(officialCats.map((c) => [norm(c.name), c.id!]));
  const resolvedCats = live.categories
    .filter((c) => isBlueprintEntity(c) && c.id && catByName.has(norm(c.name)))
    .map((c) => c.id!);

  const catIdRemap = new Map<string, string>();
  for (const c of live.categories) {
    if (!c.id) continue;
    const official = catByName.get(norm(c.name));
    if (official) catIdRemap.set(c.id, official);
  }

  const officialSubKey = new Map<string, string>();
  for (const s of officialSubs) {
    officialSubKey.set(
      `${s.categoryId}::${s.parentSubCategoryId ?? ""}::${norm(s.name)}`,
      s.id!
    );
  }

  const subIdRemap = new Map<string, string>();
  for (const s of officialSubs) {
    if (s.id) subIdRemap.set(s.id, s.id);
  }

  const resolvedSubs: string[] = [];
  let pending = live.subcategories.filter((s) => isBlueprintEntity(s) && s.id);
  let progressed = true;
  while (progressed && pending.length > 0) {
    progressed = false;
    const still: typeof pending = [];
    for (const s of pending) {
      const parentRaw = s.parentSubCategoryId;
      if (parentRaw) {
        const parent = live.subcategories.find((x) => x.id === parentRaw);
        if (parent && isBlueprintEntity(parent) && !subIdRemap.has(parentRaw)) {
          still.push(s);
          continue;
        }
      }
      const catId = catIdRemap.get(s.categoryId) || s.categoryId;
      const parentId = parentRaw ? subIdRemap.get(parentRaw) || parentRaw : "";
      const officialId = officialSubKey.get(
        `${catId}::${parentId}::${norm(s.name)}`
      );
      if (officialId && s.id) {
        resolvedSubs.push(s.id);
        subIdRemap.set(s.id, officialId);
        progressed = true;
      } else {
        still.push(s);
      }
    }
    pending = still;
  }

  const officialSkillKey = new Set(
    officialSkills.map((s) => `${s.subCategoryId}::${norm(s.name)}`)
  );
  const resolvedSkills = live.skills
    .filter((s) => {
      if (!isBlueprintEntity(s) || !s.id) return false;
      const subId = subIdRemap.get(s.subCategoryId) || s.subCategoryId;
      return officialSkillKey.has(`${subId}::${norm(s.name)}`);
    })
    .map((s) => s.id!);

  const officialRoleNames = new Set(officialRoles.map((r) => norm(r.name)));
  const resolvedRoles = live.roles
    .filter(
      (r) => isBlueprintEntity(r) && r.id && officialRoleNames.has(norm(r.name))
    )
    .map((r) => r.id!);

  return {
    categories: resolvedCats,
    subcategories: resolvedSubs,
    skills: resolvedSkills,
    roles: resolvedRoles,
  };
}

export function downloadTeamBlueprintJson(
  data: TeamBlueprintExport,
  projectTitle: string
): void {
  const blob = new Blob([JSON.stringify(data, null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  const safe = (projectTitle || "Team").replace(/[^a-z0-9]/gi, "_");
  const date = new Date().toISOString().slice(0, 10);
  a.href = url;
  a.download = `${safe}_Blaupausen_${date}.json`;
  a.click();
  URL.revokeObjectURL(url);
}
