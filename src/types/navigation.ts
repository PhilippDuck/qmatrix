/** Primary app shell tabs */
export type AppTab =
  | "dashboard"
  | "matrix"
  | "qualification"
  | "data"
  | "system";

/**
 * Cross-module navigation payload (e.g. Matrix → QualPlan / Stammdaten).
 */
export interface NavParams {
  /** Open qualification plan for this employee */
  employeeId?: string;
  /** Sub-tab inside UnifiedDataView (e.g. "roles") */
  tab?: string;
  /** Open role editor for this role id */
  editRoleId?: string;
}

export type NavigateFn = (tab: AppTab | string, params?: NavParams) => void;
