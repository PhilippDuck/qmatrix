import { LEVELS } from "../constants/skillLevels";
import type { EmployeeRole } from "../types";

/**
 * Berechnet den Score-Farbwert basierend auf dem Score.
 */
export const getScoreColor = (score: number | null): string => {
  if (score === null) return "gray.4";
  if (score >= 75) return "green";
  if (score >= 50) return "lime";
  if (score >= 25) return "yellow";
  if (score > 0) return "orange";
  return "gray";
};

/**
 * Ermittelt den nächsten Level-Wert im Zyklus.
 */
export const getNextLevel = (currentLevel: number): number => {
  const idx = LEVELS.findIndex((l) => l.value === currentLevel);
  const next = (idx + 1) % LEVELS.length;
  return LEVELS[next].value;
};

/**
 * Findet ein Level-Objekt anhand seines Wertes.
 */
export const getLevelByValue = (value: number) => {
  return LEVELS.find((l) => l.value === value);
};

/**
 * Ermittelt das Soll-Level für einen Skill basierend auf der Rolle und deren Vererbungshierarchie.
 * - Wenn die Rolle selbst einen Wert definiert, wird dieser genommen (Override).
 * - Andernfalls wird rekursiv in der Elternrolle gesucht.
 * - Gibt undefined zurück, wenn keine Anforderung gefunden wurde.
 */
export const getRoleTargetForSkill = (
  roleId: string | undefined | null,
  skillId: string,
  allRoles: EmployeeRole[]
): number | undefined => {
  if (!roleId) return undefined;

  const normalizedRoleId = roleId.trim().toLowerCase();
  let currentRole = allRoles.find((r) => r.id === roleId || (r.name && r.name.trim().toLowerCase() === normalizedRoleId));

  const visited = new Set<string>();

  while (currentRole) {
    if (currentRole.id && visited.has(currentRole.id)) {
      console.warn("Circular dependency detected in role inheritance for role:", currentRole.name);
      return undefined;
    }
    if (currentRole.id) visited.add(currentRole.id);

    // Check direct requirement
    const req = currentRole.requiredSkills?.find((s) => s.skillId === skillId);
    if (req) {
      return req.level;
    }

    // Move to parent
    if (currentRole.inheritsFromId) {
      const parentId = currentRole.inheritsFromId;
      const normalizedParentId = parentId.trim().toLowerCase();
      currentRole = allRoles.find((r) => r.id === parentId || (r.name && r.name.trim().toLowerCase() === normalizedParentId));
    } else {
      currentRole = undefined;
    }
  }

  return undefined;
};

/**
 * Ermittelt das maximale Soll-Level für einen Skill basierend auf mehreren Rollen.
 * `roleRefs` may be role IDs (preferred) or legacy role names — dual-resolved.
 */
export const getMaxRoleTargetForSkill = (
  roleRefs: string[] | undefined | null,
  skillId: string,
  allRoles: EmployeeRole[]
): number | undefined => {
  if (!roleRefs || roleRefs.length === 0) return undefined;

  let maxTarget: number | undefined = undefined;

  for (const ref of roleRefs) {
    const target = getRoleTargetForSkill(ref, skillId, allRoles);
    if (target !== undefined) {
      maxTarget = maxTarget === undefined ? target : Math.max(maxTarget, target);
    }
  }

  return maxTarget;
};
