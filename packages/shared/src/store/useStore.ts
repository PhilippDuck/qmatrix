import { create } from "zustand";
import type { AppState } from "./types";
import {
  createCoreSlice,
  createEmployeeSlice,
  createHierarchySlice,
  createAssessmentSlice,
  createOrgSlice,
  createQualificationSlice,
  createViewSlice,
  createHistorySlice,
  createDataMgmtSlice,
} from "./slices";

/** Re-export for shallow multi-field selectors: useStore(useShallow(s => ({ ... }))) */
export { useShallow } from "zustand/react/shallow";

// Re-export domain types so existing `from "../store/useStore"` imports keep working
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
  QualificationPlan,
  QualificationMeasure,
  SavedView,
  ChangeHistoryEntry,
  EntityType,
  ChangeAction,
  SkillGap,
} from "../types";
export type { AppState } from "./types";

/**
 * App store composed from domain slices.
 * Each slice owns its state fields and mutations; shared helpers live in recordChange.ts.
 */
export const useStore = create<AppState>()((...a) => ({
  ...createCoreSlice(...a),
  ...createEmployeeSlice(...a),
  ...createHierarchySlice(...a),
  ...createAssessmentSlice(...a),
  ...createOrgSlice(...a),
  ...createQualificationSlice(...a),
  ...createViewSlice(...a),
  ...createHistorySlice(...a),
  ...createDataMgmtSlice(...a),
}));
