/**
 * Domain types for SkillGrid.
 * Single source of truth — import from `../types` or `../types/domain`.
 */

export interface Employee {
  id?: string;
  name: string;
  department?: string;
  /** Role IDs (K17). Legacy data may still hold names until load-time migration. */
  roles?: string[];
  isActive?: boolean; // Default true if undefined
  deactivationDate?: string; // ISO Date String
  reactivationDate?: string; // ISO Date String
  updatedAt?: number;
}

/** Provenance of catalog entities after Manage/Team import (K20). */
export type CatalogSource = "catalog" | "local" | "blueprint";

export interface Category {
  id?: string;
  name: string;
  description?: string;
  updatedAt?: number;
  catalogSource?: CatalogSource;
  catalogDeprecated?: boolean;
}

export interface SubCategory {
  id?: string;
  categoryId: string; // The root visual category
  parentSubCategoryId?: string; // For nesting, if present
  name: string;
  description?: string;
  updatedAt?: number;
  catalogSource?: CatalogSource;
  catalogDeprecated?: boolean;
}

export interface Skill {
  id?: string;
  subCategoryId: string;
  name: string;
  description?: string;
  departmentId?: string;
  requiredByRoleIds?: string[];
  updatedAt?: number;
  catalogSource?: CatalogSource;
  catalogDeprecated?: boolean;
}

export type SkillLevel = -1 | 0 | 25 | 50 | 75 | 100;

export interface Assessment {
  id?: string;
  employeeId: string;
  skillId: string;
  level: SkillLevel;
  targetLevel?: number; // Individuelles Soll pro Mitarbeiter/Skill
  updatedAt?: number;
}

export interface AssessmentLogEntry {
  id?: string;
  employeeId: string;
  skillId: string;
  previousLevel: number;
  newLevel: number;
  timestamp: number;
  note?: string;
}

export interface Department {
  id?: string;
  name: string;
  updatedAt?: number;
}

export interface EmployeeRole {
  id?: string;
  name: string;
  description?: string;
  inheritsFromId?: string;
  icon?: string; // Tabler icon name, e.g. "IconUser"
  requiredSkills?: { skillId: string; level: number }[];
  updatedAt?: number;
  catalogSource?: CatalogSource;
  catalogDeprecated?: boolean;
}

export interface AppSettings {
  id: string; // usually 'default'
  projectTitle: string;
  updatedAt: number;
  /** Last successfully applied catalog package meta (Manage SoT). */
  installedCatalogMeta?: {
    catalogId: string;
    name: string;
    version: string;
    publishedAt: string;
    publisher?: string;
    changelog: { version: string; date: string; notes: string }[];
    minAppFormatVersion: number;
    partial?: boolean;
  };
  /** Draft notes on unpublished catalog edits; consumed at next Manage release. */
  pendingCatalogNotes?: import("./catalog").CatalogChangeNote[];
}

export interface QualificationPlan {
  id?: string;
  employeeId: string;
  /** Zielrolle; optional in app state for incomplete drafts / legacy data */
  targetRoleId?: string;
  status: "active" | "completed" | "archived";
  createdAt: number;
  updatedAt: number;
  notes?: string;
}

export interface QualificationMeasure {
  id?: string;
  planId: string;
  skillId: string;
  currentLevel: number;
  startLevel: number;
  targetLevel: number;
  type: "internal" | "external" | "self_learning";

  mentorId?: string;
  externalProvider?: string;
  externalCourse?: string;
  estimatedCost?: number;

  startDate?: number;
  targetDate?: number;
  completedDate?: number;

  status: "pending" | "in_progress" | "completed" | "cancelled";
  notes?: string;
  updatedAt?: number;
}

export interface SavedView {
  id?: string;
  name: string;
  order?: number;
  config: {
    filters: {
      departments: string[];
      roles: string[];
      categories: string[];
      employees?: string[];
      levels?: number[];
      skills?: string[];
    };
    groupingMode: "none" | "department" | "role";
    settings: {
      /** @deprecated use metricMode */
      showMaxValues?: boolean;
      metricMode?: "avg" | "max" | "fulfillment";
      hideEmployees: boolean;
      hideNaColumns?: boolean;
      showInactive?: boolean;
      showOnlyGaps?: boolean;
    };
    sort: {
      employee: "asc" | "desc" | null;
      skill: "asc" | "desc" | null;
    };
    collapsedStates: Record<string, boolean>;
  };
  updatedAt?: number;
}

export type EntityType =
  | "employee"
  | "skill"
  | "category"
  | "subcategory"
  | "department"
  | "role"
  | "qualificationPlan"
  | "qualificationMeasure"
  | "assessment"
  | "savedView"
  | "catalog";

export type ChangeAction = "create" | "update" | "delete";

export interface ChangeHistoryEntry {
  id?: string;
  entityType: EntityType;
  entityId: string;
  entityLabel: string;
  action: ChangeAction;
  previousData: unknown | null;
  newData: unknown | null;
  timestamp: number;
  undone: boolean;
}

export interface ExportData {
  employees: Employee[];
  categories: Category[];
  subcategories: SubCategory[];
  skills: Skill[];
  assessments: Assessment[];
  departments: Department[];
  roles: EmployeeRole[];
  settings: AppSettings;
  history: AssessmentLogEntry[];
  qualificationPlans?: QualificationPlan[];
  qualificationMeasures?: QualificationMeasure[];
  savedViews?: SavedView[];
  changeHistory?: ChangeHistoryEntry[];
}

export interface MergeReport {
  added: number;
  updated: number;
  skipped: number;
  conflicts: number;
}

export interface MergeItemDiff {
  id: string;
  storeName: string;
  label: string;
  type: "new" | "update" | "conflict" | "identical";
  localTimestamp?: number;
  remoteTimestamp?: number;
  localData?: unknown;
  remoteData?: unknown;
}

export interface MergeDiff {
  items: MergeItemDiff[];
}

/** Skill gap for an employee against a target role */
export interface SkillGap {
  skillId: string;
  skillName: string;
  categoryId: string;
  categoryName: string;
  subCategoryId: string;
  subCategoryName: string;
  currentLevel: number;
  targetLevel: number;
  gap: number;
}
