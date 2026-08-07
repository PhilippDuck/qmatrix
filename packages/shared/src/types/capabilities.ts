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
  dbVersion: 13,
  localStoragePrefix: "skillgrid-full-",
};

/** Manage: catalog authoring + SemVer publish only. */
export const manageCapabilities: AppCapabilities = {
  variant: "manage",
  displayName: "SkillGrid Manage",
  dashboard: false,
  matrix: false,
  qualification: false,
  employees: false,
  departments: false,
  assessments: false,
  catalogAuthoring: true,
  catalogImport: true,
  catalogExport: true,
  catalogVersioning: true,
  fullBackupExport: false,
  fullBackupImport: false,
  selectiveOpsImport: false,
  pdfReports: false,
  historyUndoCatalog: true,
  stammdatenEmployees: false,
  stammdatenDepartments: false,
  stammdatenRoles: true,
  stammdatenSkills: true,
  dbName: "SkillGridManageDB",
  dbVersion: 13,
  localStoragePrefix: "skillgrid-manage-",
};

/** Team: ops app, catalog read-only, import catalog + selective ops. */
export const teamCapabilities: AppCapabilities = {
  variant: "team",
  displayName: "SkillGrid Team",
  dashboard: true,
  matrix: true,
  qualification: true,
  employees: true,
  departments: true,
  assessments: true,
  catalogAuthoring: false,
  catalogImport: true,
  catalogExport: false,
  catalogVersioning: false,
  fullBackupExport: true,
  fullBackupImport: false,
  selectiveOpsImport: true,
  pdfReports: true,
  historyUndoCatalog: false,
  stammdatenEmployees: true,
  stammdatenDepartments: true,
  stammdatenRoles: true,
  stammdatenSkills: true,
  dbName: "SkillGridTeamDB",
  dbVersion: 13,
  localStoragePrefix: "skillgrid-team-",
};
