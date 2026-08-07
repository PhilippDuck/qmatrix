/**
 * I10 / K16: hide catalog-deprecated skills and ancestors in matrix/dashboard.
 */

import type { Category, Skill, SubCategory } from "../types";

export function isSkillVisibleInMatrix(
  skill: Skill,
  subcategories: SubCategory[],
  categories: Category[],
  showDeprecated: boolean
): boolean {
  if (showDeprecated) return true;
  if (skill.catalogDeprecated) return false;

  const sub = subcategories.find((s) => s.id === skill.subCategoryId);
  if (sub?.catalogDeprecated) return false;

  // Walk parent subcategory chain
  let parentId = sub?.parentSubCategoryId;
  const visited = new Set<string>();
  while (parentId && !visited.has(parentId)) {
    visited.add(parentId);
    const parent = subcategories.find((s) => s.id === parentId);
    if (parent?.catalogDeprecated) return false;
    parentId = parent?.parentSubCategoryId;
  }

  const cat = categories.find((c) => c.id === sub?.categoryId);
  if (cat?.catalogDeprecated) return false;

  return true;
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

export function deprecatedBadgeLabel(entity: {
  catalogDeprecated?: boolean;
}): string | null {
  return entity.catalogDeprecated ? "Veraltet" : null;
}
