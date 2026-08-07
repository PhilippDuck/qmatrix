/**
 * Shared React entry for store access.
 * Components should import `useStore` / `useShallow` from here (not a module singleton).
 */

export {
  useAppStore,
  useAppStore as useStore,
  useCapabilities,
  useAppStoreApi,
  useShallow,
  AppProviders,
} from "./StoreProvider";

export type { AppState } from "./types";

// Domain type re-exports for drop-in migration from old useStore imports
export type {
  Employee,
  Category,
  SubCategory,
  Skill,
  Assessment,
  AssessmentLogEntry,
  Department,
  EmployeeRole,
  ExportData,
  MergeReport,
  MergeDiff,
  MergeItemDiff,
  QualificationPlan,
  QualificationMeasure,
  SavedView,
  ChangeHistoryEntry,
  EntityType,
  ChangeAction,
  SkillGap,
} from "../types";
