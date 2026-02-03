import { LEVELS } from "../constants/skillLevels";
import { EmployeeRole } from "../services/indexeddb";

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

  let currentRole = allRoles.find((r) => r.id === roleId);

  // Correction: If not found by ID, try finding by Name (legacy support)
  if (!currentRole) {
    currentRole = allRoles.find((r) => r.name === roleId);
  }
  const visited = new Set<string>();

  while (currentRole) {
    if (visited.has(currentRole.id!)) {
      console.warn("Circular dependency detected in role inheritance for role:", currentRole.name);
      return undefined;
    }
    visited.add(currentRole.id!);

    // Check direct requirement
    const req = currentRole.requiredSkills?.find((s) => s.skillId === skillId);
    if (req) {
      return req.level;
    }

    // Move to parent
    if (currentRole.inheritsFromId) {
      currentRole = allRoles.find((r) => r.id === currentRole!.inheritsFromId);
    } else {
      currentRole = undefined;
    }
  }

  return undefined;
};
