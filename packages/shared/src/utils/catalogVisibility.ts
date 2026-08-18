/**
 * Hide deprecated and Team-blueprint catalog entities from ops surfaces
 * (matrix, dashboard, qualification).
 */

import type { Category, EmployeeRole, Skill, SubCategory } from "../types";

export function isBlueprintEntity(entity?: {
  catalogSource?: string;
}): boolean {
  return entity?.catalogSource === "blueprint";
}

export function isOfficialCatalogEntity(entity?: {
  catalogSource?: string;
}): boolean {
  return !isBlueprintEntity(entity);
}

function subcategoryById(
  subcategories: SubCategory[]
): Map<string, SubCategory> {
  return new Map(subcategories.filter((s) => s.id).map((s) => [s.id!, s]));
}

function isSubTreeHidden(
  sub: SubCategory | undefined,
  subById: Map<string, SubCategory>,
  categories: Category[],
  opts: { hideDeprecated: boolean; hideBlueprints: boolean }
): boolean {
  if (!sub) return false;
  if (opts.hideBlueprints && isBlueprintEntity(sub)) return true;
  if (opts.hideDeprecated && sub.catalogDeprecated) return true;

  let parentId = sub.parentSubCategoryId;
  const visited = new Set<string>();
  while (parentId && !visited.has(parentId)) {
    visited.add(parentId);
    const parent = subById.get(parentId);
    if (!parent) break;
    if (opts.hideBlueprints && isBlueprintEntity(parent)) return true;
    if (opts.hideDeprecated && parent.catalogDeprecated) return true;
    parentId = parent.parentSubCategoryId;
  }

  const cat = categories.find((c) => c.id === sub.categoryId);
  if (opts.hideBlueprints && isBlueprintEntity(cat)) return true;
  if (opts.hideDeprecated && cat?.catalogDeprecated) return true;
  return false;
}

export function isSkillVisibleInMatrix(
  skill: Skill,
  subcategories: SubCategory[],
  categories: Category[],
  showDeprecated: boolean
): boolean {
  if (isBlueprintEntity(skill)) return false;
  if (!showDeprecated && skill.catalogDeprecated) return false;

  const subById = subcategoryById(subcategories);
  const sub = subcategories.find((s) => s.id === skill.subCategoryId);
  return !isSubTreeHidden(sub, subById, categories, {
    hideDeprecated: !showDeprecated,
    hideBlueprints: true,
  });
}

export function filterVisibleSkills(
  skills: Skill[],
  subcategories: SubCategory[],
  categories: Category[],
  showDeprecated: boolean
): Skill[] {
  return skills.filter((s) =>
    isSkillVisibleInMatrix(s, subcategories, categories, showDeprecated)
  );
}

export function filterOperationalSkills(
  skills: Skill[],
  subcategories: SubCategory[],
  categories: Category[]
): Skill[] {
  return filterVisibleSkills(skills, subcategories, categories, false);
}

export function filterOperationalRoles(roles: EmployeeRole[]): EmployeeRole[] {
  return roles.filter((r) => !isBlueprintEntity(r));
}

export function filterOperationalCategories(categories: Category[]): Category[] {
  return categories.filter((c) => !isBlueprintEntity(c) && !c.catalogDeprecated);
}

export function filterOperationalSubcategories(
  subcategories: SubCategory[],
  categories: Category[]
): SubCategory[] {
  const catById = new Map(categories.filter((c) => c.id).map((c) => [c.id!, c]));
  const subById = subcategoryById(subcategories);
  return subcategories.filter((sub) => {
    if (isBlueprintEntity(sub) || sub.catalogDeprecated) return false;
    return !isSubTreeHidden(sub, subById, [...catById.values()], {
      hideDeprecated: true,
      hideBlueprints: true,
    });
  });
}

export function deprecatedBadgeLabel(entity: {
  catalogDeprecated?: boolean;
}): string | null {
  return entity.catalogDeprecated ? "Veraltet" : null;
}

export function blueprintBadgeLabel(entity: {
  catalogSource?: string;
}): string | null {
  return isBlueprintEntity(entity) ? "Blaupause" : null;
}
