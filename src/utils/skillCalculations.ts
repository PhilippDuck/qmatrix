import { LEVELS } from "../constants/skillLevels";

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
