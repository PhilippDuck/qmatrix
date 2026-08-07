/**
 * Per-app capability flags and storage isolation (design §6).
 * Guards that enforce flags land in PR 4; PR 3 wires the shape + dbName.
 */

export type AppVariant = "full" | "manage" | "team";

export interface AppCapabilities {
  variant: AppVariant;
  displayName: string;

  dashboard: boolean;
  matrix: boolean;
  qualification: boolean;
  employees: boolean;
  departments: boolean;
  assessments: boolean;

  catalogAuthoring: boolean;
  catalogImport: boolean;
  catalogExport: boolean;
  catalogVersioning: boolean;

  fullBackupExport: boolean;
  fullBackupImport: boolean;
  selectiveOpsImport: boolean;
  pdfReports: boolean;

  historyUndoCatalog: boolean;

  stammdatenEmployees: boolean;
  stammdatenDepartments: boolean;
  stammdatenRoles: boolean;
  stammdatenSkills: boolean;

  dbName: string;
  dbVersion: number;
  localStoragePrefix: string;
}

/** Boolean-only keys valid for capability guards (PR 4). */
export type CapabilityFlag = {
  [K in keyof AppCapabilities]-?: AppCapabilities[K] extends boolean
    ? K
    : never;
}[keyof AppCapabilities];

/** Full app: all features on, legacy IndexedDB name. */
export const fullCapabilities: AppCapabilities = {
  variant: "full",
  displayName: "SkillGrid",
  dashboard: true,
  matrix: true,
  qualification: true,
  employees: true,
  departments: true,
  assessments: true,
  catalogAuthoring: true,
  catalogImport: true,
  catalogExport: true,
  catalogVersioning: false,
  fullBackupExport: true,
  fullBackupImport: true,
  selectiveOpsImport: false,
  pdfReports: true,
  historyUndoCatalog: true,
  stammdatenEmployees: true,
  stammdatenDepartments: true,
  stammdatenRoles: true,
  stammdatenSkills: true,
  dbName: "QualificationMatrixDB",
  dbVersion: 12,
  localStoragePrefix: "skillgrid-full-",
};
