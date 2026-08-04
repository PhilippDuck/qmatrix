/**
 * Pure skill-gap and mentor helpers (no store dependency).
 */

import type {
  Assessment,
  Category,
  Employee,
  EmployeeRole,
  Skill,
  SkillGap,
  SubCategory,
} from "../types";

export interface SkillGapContext {
  assessments: Assessment[];
  roles: EmployeeRole[];
  skills: Skill[];
  subcategories: SubCategory[];
  categories: Category[];
  employees: Employee[];
}

/**
 * Compute skill gaps for an employee against optional role requirements
 * and individual assessment target levels.
 */
export function computeSkillGapsForEmployee(
  ctx: SkillGapContext,
  employeeId: string,
  targetRoleId?: string | null
): SkillGap[] {
  const employeeAssessments = ctx.assessments.filter((a) => a.employeeId === employeeId);
  const assessmentMap = new Map(employeeAssessments.map((a) => [a.skillId, a.level]));
  const assessmentTargetMap = new Map(
    employeeAssessments.map((a) => [a.skillId, a.targetLevel || 0])
  );

  const requiredTargets = new Map<string, number>();

  assessmentTargetMap.forEach((target, skillId) => {
    if (target > 0) requiredTargets.set(skillId, target);
  });

  if (targetRoleId) {
    const normalizedTargetId = targetRoleId.trim().toLowerCase();
    let currentRole = ctx.roles.find(
      (r) =>
        r.id === targetRoleId ||
        (r.name && r.name.trim().toLowerCase() === normalizedTargetId)
    );
    const roleRequirements = new Map<string, number>();
    const visitedRoles = new Set<string>();

    while (currentRole) {
      if (currentRole.id && visitedRoles.has(currentRole.id)) break;
      if (currentRole.id) visitedRoles.add(currentRole.id);

      if (currentRole.requiredSkills) {
        currentRole.requiredSkills.forEach((req) => {
          if (!roleRequirements.has(req.skillId)) {
            roleRequirements.set(req.skillId, req.level);
          }
        });
      }

      if (currentRole.inheritsFromId) {
        const parentId = currentRole.inheritsFromId;
        const normalizedParentId = parentId.trim().toLowerCase();
        currentRole = ctx.roles.find(
          (r) =>
            r.id === parentId ||
            (r.name && r.name.trim().toLowerCase() === normalizedParentId)
        );
      } else {
        currentRole = undefined;
      }
    }

    roleRequirements.forEach((level, skillId) => {
      const currentTarget = requiredTargets.get(skillId) || 0;
      requiredTargets.set(skillId, Math.max(currentTarget, level));
    });
  }

  const gaps: SkillGap[] = [];

  requiredTargets.forEach((targetLevel, skillId) => {
    const rawLevel = assessmentMap.get(skillId) ?? 0;
    const currentLevel = rawLevel < 0 ? 0 : rawLevel;
    const gap = targetLevel - currentLevel;

    if (gap > 0) {
      const skill = ctx.skills.find((s) => s.id === skillId);
      if (skill) {
        const subCategory = ctx.subcategories.find((sc) => sc.id === skill.subCategoryId);
        const category = subCategory
          ? ctx.categories.find((c) => c.id === subCategory.categoryId)
          : undefined;

        gaps.push({
          skillId,
          skillName: skill.name,
          categoryId: category?.id || "",
          categoryName: category?.name || "",
          subCategoryId: subCategory?.id || "",
          subCategoryName: subCategory?.name || "",
          currentLevel,
          targetLevel,
          gap,
        });
      }
    }
  });

  return gaps.sort((a, b) => b.gap - a.gap);
}

/** Employees with level 100 on the given skill (optional exclude). */
export function findPotentialMentors(
  assessments: Assessment[],
  employees: Employee[],
  skillId: string,
  excludeEmployeeId?: string
): Employee[] {
  const qualifiedIds = new Set(
    assessments
      .filter(
        (a) =>
          a.skillId === skillId &&
          a.level === 100 &&
          a.employeeId !== excludeEmployeeId
      )
      .map((a) => a.employeeId)
  );
  return employees.filter((e) => e.id && qualifiedIds.has(e.id));
}
