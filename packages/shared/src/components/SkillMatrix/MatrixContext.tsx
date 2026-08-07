import React, { createContext, useContext, useMemo, type ReactNode } from "react";
import type {
  Assessment,
  Employee,
  EmployeeRole,
  QualificationMeasure,
  QualificationPlan,
  Skill,
} from "../../store/useStore";
import type { NavigateFn } from "../../types";
import type { MatrixColumn } from "./types";

export type MetricMode = "avg" | "max" | "fulfillment";

/** Shared matrix data, view flags, and actions (not row identity). */
export interface MatrixContextValue {
  columns: MatrixColumn[];
  employees: Employee[];
  /** Currently displayed (filtered) skills */
  skills: Skill[];
  roles: EmployeeRole[];
  labelWidth: number;
  isEditMode: boolean;
  showMaxValues: MetricMode;
  skillSort: "asc" | "desc" | null;
  showOnlyGaps?: boolean;
  collapsedStates: Record<string, boolean>;
  measuresMap: Map<string, QualificationMeasure[]>;
  qualificationPlans: QualificationPlan[];

  getAssessment: (employeeId: string, skillId: string) => Assessment | undefined;
  calculateAverage: (skillIds: string[], employeeId?: string) => number | null;

  onToggle: (id: string) => void;
  onBulkSetLevel: (employeeId: string, skillIds: string[], level: number) => void;
  onBulkSetTargetLevel: (
    employeeId: string,
    skillIds: string[],
    targetLevel: number | undefined
  ) => void;
  onLevelChange: (
    employeeId: string,
    skillId: string,
    newLevel: number,
    note?: string
  ) => void;
  onTargetLevelChange: (
    employeeId: string,
    skillId: string,
    targetLevel: number | undefined
  ) => void;
  onEditSkill: (skillId: string) => void;
  onEditCategory: (categoryId: string) => void;
  onEditSubcategory: (subcategoryId: string) => void;
  /** categoryId required so nested rows do not need a closed-over handler */
  onAddSubcategory: (categoryId: string, parentSubId?: string) => void;
  onAddSkill: (subCategoryId: string) => void;
  onNavigate?: NavigateFn;
}

const MatrixContext = createContext<MatrixContextValue | null>(null);

export function MatrixProvider({
  value,
  children,
}: {
  value: MatrixContextValue;
  children: ReactNode;
}) {
  return <MatrixContext.Provider value={value}>{children}</MatrixContext.Provider>;
}

export function useMatrixContext(): MatrixContextValue {
  const ctx = useContext(MatrixContext);
  if (!ctx) {
    throw new Error("useMatrixContext must be used within MatrixProvider");
  }
  return ctx;
}

/** Build a stable-ish context value object (caller should memoize inputs). */
export function useMatrixContextValue(
  value: MatrixContextValue
): MatrixContextValue {
  // Identity of functions/maps is controlled by the parent; shallow field list
  // keeps Provider consumers from needing to reconstruct the bag themselves.
  return useMemo(
    () => value,
    // eslint-disable-next-line react-hooks/exhaustive-deps -- intentional bag memo from parent fields
    [
      value.columns,
      value.employees,
      value.skills,
      value.roles,
      value.labelWidth,
      value.isEditMode,
      value.showMaxValues,
      value.skillSort,
      value.showOnlyGaps,
      value.collapsedStates,
      value.measuresMap,
      value.qualificationPlans,
      value.getAssessment,
      value.calculateAverage,
      value.onToggle,
      value.onBulkSetLevel,
      value.onBulkSetTargetLevel,
      value.onLevelChange,
      value.onTargetLevelChange,
      value.onEditSkill,
      value.onEditCategory,
      value.onEditSubcategory,
      value.onAddSubcategory,
      value.onAddSkill,
      value.onNavigate,
    ]
  );
}
