/**
 * Zustand AppState contract. Slice modules will implement subsets of this.
 */

import type {
  Employee,
  Category,
  SubCategory,
  Skill,
  SkillLevel,
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
  SkillGap,
} from "../types";

export interface AppState {
  employees: Employee[];
  categories: Category[];
  subcategories: SubCategory[];
  skills: Skill[];
  assessments: Assessment[];
  departments: Department[];
  roles: EmployeeRole[];
  qualificationPlans: QualificationPlan[];
  qualificationMeasures: QualificationMeasure[];
  savedViews: SavedView[];
  changeHistory: ChangeHistoryEntry[];
  projectTitle: string;
  dataHash: string;
  loading: boolean;
  error: string | null;

  initDb: () => Promise<void>;
  refreshAllData: () => Promise<void>;

  addEmployee: (employee: Omit<Employee, "id">) => Promise<void>;
  updateEmployee: (id: string, employee: Omit<Employee, "id">) => Promise<void>;
  deleteEmployee: (id: string) => Promise<void>;

  addCategory: (category: Omit<Category, "id">) => Promise<string>;
  updateCategory: (id: string, category: Omit<Category, "id">) => Promise<void>;
  deleteCategory: (id: string) => Promise<void>;

  addSubCategory: (subCategory: Omit<SubCategory, "id">) => Promise<string>;
  updateSubCategory: (id: string, subCategory: Omit<SubCategory, "id">) => Promise<void>;
  deleteSubCategory: (id: string) => Promise<void>;
  getSubCategoriesByCategory: (categoryId: string) => SubCategory[];
  getSubCategoriesByParent: (parentSubCategoryId: string) => SubCategory[];

  addSkill: (skill: Omit<Skill, "id">) => Promise<void>;
  updateSkill: (id: string, skill: Omit<Skill, "id">) => Promise<void>;
  deleteSkill: (id: string) => Promise<void>;
  getSkillsBySubCategory: (subCategoryId: string) => Skill[];

  setAssessment: (
    employeeId: string,
    skillId: string,
    level: SkillLevel,
    note?: string
  ) => Promise<void>;
  setTargetLevel: (
    employeeId: string,
    skillId: string,
    targetLevel: number | undefined
  ) => Promise<void>;
  getAssessmentsByEmployee: (employeeId: string) => Assessment[];
  getAssessment: (employeeId: string, skillId: string) => Assessment | undefined;

  getHistory: (employeeId: string) => Promise<AssessmentLogEntry[]>;
  getAllHistory: () => Promise<AssessmentLogEntry[]>;

  addDepartment: (name: string) => Promise<string>;
  updateDepartment: (id: string, department: Omit<Department, "id">) => Promise<void>;
  deleteDepartment: (id: string) => Promise<void>;

  addRole: (role: Omit<EmployeeRole, "id">) => Promise<string>;
  updateRole: (id: string, role: Omit<EmployeeRole, "id">) => Promise<void>;
  deleteRole: (id: string) => Promise<void>;
  updateSkillsForRole: (roleId: string, skillIds: string[]) => Promise<void>;

  updateProjectTitle: (title: string) => Promise<void>;

  addQualificationPlan: (
    plan: Omit<QualificationPlan, "id" | "createdAt" | "updatedAt">
  ) => Promise<string>;
  updateQualificationPlan: (
    id: string,
    plan: Partial<Omit<QualificationPlan, "id" | "createdAt">>
  ) => Promise<void>;
  deleteQualificationPlan: (id: string) => Promise<void>;
  getQualificationPlansForEmployee: (employeeId: string) => QualificationPlan[];

  addQualificationMeasure: (
    measure: Omit<QualificationMeasure, "id" | "updatedAt">
  ) => Promise<string>;
  updateQualificationMeasure: (
    id: string,
    measure: Partial<Omit<QualificationMeasure, "id">>
  ) => Promise<void>;
  deleteQualificationMeasure: (id: string) => Promise<void>;
  getQualificationMeasuresForPlan: (planId: string) => QualificationMeasure[];

  addSavedView: (view: Omit<SavedView, "id" | "updatedAt">) => Promise<string>;
  updateSavedView: (id: string, view: Omit<SavedView, "id" | "updatedAt">) => Promise<void>;
  deleteSavedView: (id: string) => Promise<void>;
  reorderSavedViews: (viewIds: string[]) => Promise<void>;

  getSkillGapsForEmployee: (
    employeeId: string,
    targetRoleId?: string | null
  ) => SkillGap[];
  getPotentialMentors: (skillId: string, excludeEmployeeId?: string) => Employee[];

  exportData: () => Promise<ExportData>;
  importData: (jsonData: string) => Promise<void>;
  mergeData: (jsonData: string) => Promise<MergeReport>;
  diffData: (jsonData: string) => Promise<MergeDiff>;
  applyMerge: (diff: MergeDiff, selectedIds: string[]) => Promise<MergeReport>;
  clearAllData: () => Promise<void>;

  undoChange: (historyEntryId: string) => Promise<void>;
  refreshChangeHistory: () => Promise<void>;

  hasUnsavedChanges: boolean;
  setHasUnsavedChanges: (val: boolean) => void;
}
