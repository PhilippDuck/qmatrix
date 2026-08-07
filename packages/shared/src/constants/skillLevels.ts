/**
 * Definition der Skill-Level.
 */
export interface SkillLevel {
  value: number;
  label: string;
  color: string;
  title: string;
  description: string;
}

export const LEVELS: SkillLevel[] = [
  {
    value: 0,
    label: "0%",
    color: "gray",
    title: "Keine Kenntnisse",
    description: "Bisher keine Erfahrung oder Schulung.",
  },
  {
    value: -1,
    label: "N/A",
    color: "gray.3",
    title: "Nicht relevant (N/A)",
    description: "Wird für die Berechnung ignoriert.",
  },
  {
    value: 25,
    label: "25%",
    color: "orange",
    title: "Grundkenntnisse",
    description: "Theoretisch vertraut; erste Berührungspunkte.",
  },
  {
    value: 50,
    label: "50%",
    color: "yellow",
    title: "Anwender",
    description: "Setzt Aufgaben um; benötigt teils Unterstützung.",
  },
  {
    value: 75,
    label: "75%",
    color: "lime",
    title: "Fachkompetent",
    description: "Beherrscht den Standard sicher und eigenständig.",
  },
  {
    value: 100,
    label: "100%",
    color: "green",
    title: "Experte / Mentor",
    description: "Löst komplexe Probleme und gibt Wissen weiter.",
  },
];

// Layout-Konstanten für die Matrix
export const MATRIX_LAYOUT = {
  cellSize: 85,
  labelWidth: 260,
  headerHeight: 140,
} as const;
