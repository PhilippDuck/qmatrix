import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from "react";
import {
  db,
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
  QualificationPlan as DBQualificationPlan,
  QualificationMeasure,
} from "../services/indexeddb";

// Re-export types for convenience
export type { Employee, Category, SubCategory, Skill, Assessment, AssessmentLogEntry, Department, EmployeeRole, ExportData, MergeReport, MergeDiff, MergeItemDiff, QualificationMeasure };

// Redefine QualificationPlan locally to make targetRoleId optional
export interface QualificationPlan extends Omit<DBQualificationPlan, 'targetRoleId'> {
  targetRoleId?: string; // Made optional
}

// Helper type for skill gap analysis
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

interface DataContextType {
  employees: Employee[];
  categories: Category[];
  subcategories: SubCategory[];
  skills: Skill[];
  assessments: Assessment[];
  departments: Department[];
  roles: EmployeeRole[];
  qualificationPlans: QualificationPlan[];
  qualificationMeasures: QualificationMeasure[];
  projectTitle: string;
  dataHash: string;
  loading: boolean;
  error: string | null;

  // Employee methods
  addEmployee: (employee: Omit<Employee, "id">) => Promise<void>;
  updateEmployee: (id: string, employee: Omit<Employee, "id">) => Promise<void>;
  deleteEmployee: (id: string) => Promise<void>;

  // Category methods
  addCategory: (category: Omit<Category, "id">) => Promise<string>;
  updateCategory: (id: string, category: Omit<Category, "id">) => Promise<void>;
  deleteCategory: (id: string) => Promise<void>;

  // SubCategory methods
  addSubCategory: (subCategory: Omit<SubCategory, "id">) => Promise<string>;
  updateSubCategory: (
    id: string,
    subCategory: Omit<SubCategory, "id">,
  ) => Promise<void>;
  deleteSubCategory: (id: string) => Promise<void>;
  getSubCategoriesByCategory: (categoryId: string) => SubCategory[];

  // Skill methods
  addSkill: (skill: Omit<Skill, "id">) => Promise<void>;
  updateSkill: (id: string, skill: Omit<Skill, "id">) => Promise<void>;
  deleteSkill: (id: string) => Promise<void>;
  getSkillsBySubCategory: (subCategoryId: string) => Skill[];

  // Assessment methods
  setAssessment: (
    employeeId: string,
    skillId: string,
    level: -1 | 0 | 25 | 50 | 75 | 100,
  ) => Promise<void>;
  setTargetLevel: (
    employeeId: string,
    skillId: string,
    targetLevel: number | undefined,
  ) => Promise<void>;
  getAssessmentsByEmployee: (employeeId: string) => Assessment[];
  getAssessment: (
    employeeId: string,
    skillId: string,
  ) => Assessment | undefined;


  // History methods
  getHistory: (employeeId: string) => Promise<AssessmentLogEntry[]>;
  getAllHistory: () => Promise<AssessmentLogEntry[]>;


  // Department methods
  addDepartment: (name: string) => Promise<string>;
  updateDepartment: (id: string, department: Omit<Department, "id">) => Promise<void>;
  deleteDepartment: (id: string) => Promise<void>;

  // Role methods
  addRole: (role: Omit<EmployeeRole, "id">) => Promise<string>;
  updateRole: (id: string, role: Omit<EmployeeRole, "id">) => Promise<void>;
  deleteRole: (id: string) => Promise<void>;
  updateSkillsForRole: (roleId: string, skillIds: string[]) => Promise<void>;

  // Settings
  updateProjectTitle: (title: string) => Promise<void>;

  // Qualification Plan methods
  addQualificationPlan: (plan: Omit<QualificationPlan, "id" | "createdAt" | "updatedAt">) => Promise<string>;
  updateQualificationPlan: (id: string, plan: Partial<Omit<QualificationPlan, "id" | "createdAt">>) => Promise<void>;
  deleteQualificationPlan: (id: string) => Promise<void>;
  getQualificationPlansForEmployee: (employeeId: string) => QualificationPlan[];

  // Qualification Measure methods
  addQualificationMeasure: (measure: Omit<QualificationMeasure, "id" | "updatedAt">) => Promise<string>;
  updateQualificationMeasure: (id: string, measure: Partial<Omit<QualificationMeasure, "id">>) => Promise<void>;
  deleteQualificationMeasure: (id: string) => Promise<void>;
  getQualificationMeasuresForPlan: (planId: string) => QualificationMeasure[];

  // Helper methods
  getSkillGapsForEmployee: (employeeId: string, targetRoleId?: string | null) => SkillGap[];
  getPotentialMentors: (skillId: string, excludeEmployeeId?: string) => Employee[];

  // Data management
  exportData: () => Promise<ExportData>;
  importData: (jsonData: string) => Promise<void>;
  mergeData: (jsonData: string) => Promise<MergeReport>;
  diffData: (jsonData: string) => Promise<MergeDiff>;
  applyMerge: (diff: MergeDiff, selectedIds: string[]) => Promise<MergeReport>;
  clearAllData: () => Promise<void>;
}

const DataContext = createContext<DataContextType | undefined>(undefined);

export const DataProvider: React.FC<{ children: ReactNode }> = ({
  children,
}) => {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [subcategories, setSubCategories] = useState<SubCategory[]>([]);
  const [skills, setSkills] = useState<Skill[]>([]);
  const [assessments, setAssessments] = useState<Assessment[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [roles, setRoles] = useState<EmployeeRole[]>([]);
  const [qualificationPlans, setQualificationPlans] = useState<QualificationPlan[]>([]);
  const [qualificationMeasures, setQualificationMeasures] = useState<QualificationMeasure[]>([]);
  const [projectTitle, setProjectTitle] = useState<string>("");
  const [dataHash, setDataHash] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Initialize DB and load all data
  useEffect(() => {
    const init = async () => {
      try {
        await db.init();
        await refreshAllData();
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Failed to initialize database",
        );
      } finally {
        setLoading(false);
      }
    };
    init();
  }, []);

  const refreshAllData = async () => {
    try {
      const [emps, cats, subcats, sks, asms, depts, rls, qPlans, qMeasures, settings, hash] = await Promise.all([
        db.getEmployees(),
        db.getCategories(),
        db.getSubCategories(),
        db.getSkills(),
        db.execute("assessments", "getAll"),
        db.getDepartments(),
        db.getRoles(),
        db.getQualificationPlans(),
        db.getQualificationMeasures(),
        db.getSettings(),
        db.getDataHash()
      ]);

      setEmployees(emps);
      setCategories(cats || []);
      setSubCategories(subcats || []);
      setSkills(sks || []);
      setAssessments(asms || []);
      setDepartments(depts || []);
      setRoles(rls || []);
      setQualificationPlans(qPlans || []);
      setQualificationMeasures(qMeasures || []);
      setProjectTitle(settings?.projectTitle || "");
      setDataHash(hash || "");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load data");
    }
  };

  // Employee methods
  const addEmployee = async (employee: Omit<Employee, "id">) => {
    try {
      await db.addEmployee(employee);
      await refreshAllData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add employee");
      throw err;
    }
  };

  const updateEmployee = async (id: string, employee: Omit<Employee, "id">) => {
    try {
      await db.updateEmployee(id, employee);
      await refreshAllData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update employee");
      throw err;
    }
  };

  const deleteEmployee = async (id: string) => {
    try {
      await db.deleteEmployee(id);
      await refreshAllData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete employee");
      throw err;
    }
  };

  // Category methods
  const addCategory = async (category: Omit<Category, "id">) => {
    try {
      const id = await db.addCategory(category);
      await refreshAllData();
      return id;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add category");
      throw err;
    }
  };

  const updateCategory = async (id: string, category: Omit<Category, "id">) => {
    try {
      await db.updateCategory(id, category);
      await refreshAllData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update category");
      throw err;
    }
  };

  const deleteCategory = async (id: string) => {
    try {
      await db.deleteCategory(id);
      await refreshAllData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete category");
      throw err;
    }
  };

  // SubCategory methods
  const addSubCategory = async (subCategory: Omit<SubCategory, "id">) => {
    try {
      const id = await db.addSubCategory(subCategory);
      await refreshAllData();
      return id;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add subcategory");
      throw err;
    }
  };

  const updateSubCategory = async (id: string, subCategory: Omit<SubCategory, "id">) => {
    try {
      await db.updateSubCategory(id, subCategory);
      await refreshAllData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update subcategory");
      throw err;
    }
  };

  const deleteSubCategory = async (id: string) => {
    try {
      await db.deleteSubCategory(id);
      await refreshAllData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete subcategory");
      throw err;
    }
  };

  const getSubCategoriesByCategory = (categoryId: string): SubCategory[] => {
    return subcategories.filter((sc) => sc.categoryId === categoryId);
  };

  // Skill methods
  const addSkill = async (skill: Omit<Skill, "id">) => {
    try {
      await db.addSkill(skill);
      await refreshAllData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add skill");
      throw err;
    }
  };

  const updateSkill = async (id: string, skill: Omit<Skill, "id">) => {
    try {
      await db.updateSkill(id, skill);
      await refreshAllData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update skill");
      throw err;
    }
  };

  const deleteSkill = async (id: string) => {
    try {
      await db.deleteSkill(id);
      await refreshAllData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete skill");
      throw err;
    }
  };

  const getSkillsBySubCategory = (subCategoryId: string): Skill[] => {
    return skills.filter((s) => s.subCategoryId === subCategoryId);
  };

  // Assessment methods
  const setAssessment = async (
    employeeId: string,
    skillId: string,
    level: -1 | 0 | 25 | 50 | 75 | 100,
  ) => {
    try {
      await db.setAssessment(employeeId, skillId, level);
      await refreshAllData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to set assessment");
      throw err;
    }
  };

  const setTargetLevel = async (
    employeeId: string,
    skillId: string,
    targetLevel: number | undefined,
  ) => {
    try {
      await db.setTargetLevel(employeeId, skillId, targetLevel);
      await refreshAllData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to set target level");
      throw err;
    }
  };

  const getAssessmentsByEmployee = (employeeId: string): Assessment[] => {
    return assessments.filter((a) => a.employeeId === employeeId);
  };

  const getAssessment = (
    employeeId: string,
    skillId: string,
  ): Assessment | undefined => {
    return assessments.find(
      (a) => a.employeeId === employeeId && a.skillId === skillId,
    );
  };

  const getHistory = async (employeeId: string): Promise<AssessmentLogEntry[]> => {
    try {
      return await db.getAssessmentLogs(employeeId);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load history");
      return [];
    }
  };

  const getAllHistory = async (): Promise<AssessmentLogEntry[]> => {
    try {
      return await db.execute("assessment_logs", "getAll");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load all history");
      return [];
    }
  };

  // Department methods
  const addDepartment = async (name: string) => {
    try {
      const id = await db.addDepartment(name);
      await refreshAllData();
      return id;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add department");
      throw err;
    }
  };

  const updateDepartment = async (id: string, department: Omit<Department, "id">) => {
    try {
      await db.updateDepartment(id, department);
      await refreshAllData();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to update department",
      );
      throw err;
    }
  };

  const deleteDepartment = async (id: string) => {
    try {
      await db.deleteDepartment(id);
      await refreshAllData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete department");
      throw err;
    }
  };

  // Role methods
  const addRole = async (role: Omit<EmployeeRole, "id">) => {
    try {
      const id = await db.addRole(role);
      await refreshAllData();
      return id;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add role");
      throw err;
    }
  };

  const updateRole = async (id: string, role: Omit<EmployeeRole, "id">) => {
    try {
      await db.updateRole(id, role);
      await refreshAllData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update role");
      throw err;
    }
  };

  const deleteRole = async (id: string) => {
    try {
      await db.deleteRole(id);
      await refreshAllData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete role");
      throw err;
    }
  };

  const updateSkillsForRole = async (roleId: string, skillIds: string[]) => {
    try {
      await db.updateSkillsForRole(roleId, skillIds);
      await refreshAllData(); // Refresh to propagate changes to UI
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update role skills");
      throw err;
    }
  };

  const updateProjectTitle = async (title: string) => {
    console.log("Updating project title to:", title);
    try {
      await db.saveSettings({ projectTitle: title });
      setProjectTitle(title); // Optimistic update
      await refreshAllData();
    } catch (e) {
      console.error("Failed to update project title", e);
    }
  };

  // Qualification Plan methods
  const addQualificationPlan = async (plan: Omit<QualificationPlan, "id" | "createdAt" | "updatedAt">) => {
    try {
      const id = await db.addQualificationPlan(plan as any);
      await refreshAllData();
      return id;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add qualification plan");
      throw err;
    }
  };

  const updateQualificationPlan = async (id: string, plan: Partial<Omit<QualificationPlan, "id" | "createdAt">>) => {
    try {
      await db.updateQualificationPlan(id, plan);
      await refreshAllData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update qualification plan");
      throw err;
    }
  };

  const deleteQualificationPlan = async (id: string) => {
    try {
      await db.deleteQualificationPlan(id);
      await refreshAllData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete qualification plan");
      throw err;
    }
  };

  const getQualificationPlansForEmployee = (employeeId: string): QualificationPlan[] => {
    return qualificationPlans.filter((p) => p.employeeId === employeeId);
  };

  // Qualification Measure methods
  const addQualificationMeasure = async (measure: Omit<QualificationMeasure, "id" | "updatedAt">) => {
    try {
      const id = await db.addQualificationMeasure(measure);
      await refreshAllData();
      return id;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add qualification measure");
      throw err;
    }
  };

  const updateQualificationMeasure = async (id: string, measure: Partial<Omit<QualificationMeasure, "id">>) => {
    try {
      await db.updateQualificationMeasure(id, measure);
      await refreshAllData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update qualification measure");
      throw err;
    }
  };

  const deleteQualificationMeasure = async (id: string) => {
    try {
      await db.deleteQualificationMeasure(id);
      await refreshAllData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete qualification measure");
      throw err;
    }
  };

  const getQualificationMeasuresForPlan = (planId: string): QualificationMeasure[] => {
    return qualificationMeasures.filter((m) => m.planId === planId);
  };

  // Helper: Get skill gaps for an employee compared to a target role
  // Helper: Get skill gaps for an employee compared to a target role (optional) and individual targets
  const getSkillGapsForEmployee = (employeeId: string, targetRoleId?: string | null): SkillGap[] => {
    const employeeAssessments = assessments.filter((a) => a.employeeId === employeeId);
    const assessmentMap = new Map(employeeAssessments.map((a) => [a.skillId, a.level]));
    const assessmentTargetMap = new Map(employeeAssessments.map((a) => [a.skillId, a.targetLevel || 0]));

    // Map to store the required target level for each skill
    const requiredTargets = new Map<string, number>();

    // 1. Add individual targets from assessments
    assessmentTargetMap.forEach((target, skillId) => {
      if (target > 0) {
        requiredTargets.set(skillId, target);
      }
    });

    // 2. If a target role is specified, merge role requirements
    if (targetRoleId) {
      const role = roles.find((r) => r.id === targetRoleId);
      if (role && role.requiredSkills) {
        role.requiredSkills.forEach((req) => {
          const currentTarget = requiredTargets.get(req.skillId) || 0;
          // Take the maximum of individual target and role target
          requiredTargets.set(req.skillId, Math.max(currentTarget, req.level));
        });
      }
    }

    const gaps: SkillGap[] = [];

    requiredTargets.forEach((targetLevel, skillId) => {
      const rawLevel = assessmentMap.get(skillId) ?? 0;
      // Treat -1 (not relevant) as 0 for gap calculation
      const currentLevel = rawLevel < 0 ? 0 : rawLevel;
      const gap = targetLevel - currentLevel;

      if (gap > 0) {
        const skill = skills.find((s) => s.id === skillId);
        if (skill) {
          const subCategory = subcategories.find((sc) => sc.id === skill.subCategoryId);
          const category = subCategory ? categories.find((c) => c.id === subCategory.categoryId) : undefined;

          gaps.push({
            skillId: skillId,
            skillName: skill.name,
            categoryId: category?.id || "",
            categoryName: category?.name || "",
            subCategoryId: subCategory?.id || "",
            subCategoryName: subCategory?.name || "",
            currentLevel,
            targetLevel,
            gap,
          });
        }
      }
    });

    return gaps.sort((a, b) => b.gap - a.gap); // Sort by largest gap first
  };

  // Helper: Get potential mentors for a skill (employees with 100% level)
  const getPotentialMentors = (skillId: string, excludeEmployeeId?: string): Employee[] => {
    const qualifiedAssessments = assessments.filter(
      (a) => a.skillId === skillId && a.level === 100 && a.employeeId !== excludeEmployeeId
    );
    const qualifiedEmployeeIds = new Set(qualifiedAssessments.map((a) => a.employeeId));
    return employees.filter((e) => qualifiedEmployeeIds.has(e.id!));
  };

  // Data management
  const exportData = async () => {
    try {
      const data = await db.exportData();
      const blob = new Blob([JSON.stringify(data, null, 2)], {
        type: "application/json",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      const now = new Date();
      const dateStr = now.toISOString().split("T")[0];
      const timeStr = now.toLocaleTimeString("de-DE").replace(/:/g, "-");
      a.download = `qtrack_backup_${dateStr}_${timeStr}.json`;
      a.click();
      a.click();
      URL.revokeObjectURL(url);
      return data;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to export data");
      throw err;
    }
  };

  const importData = async (jsonData: string) => {
    try {
      const data = JSON.parse(jsonData);
      await db.importData(data);
      await refreshAllData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to import data");
      throw err;
    }
  };

  const mergeData = async (jsonData: string): Promise<MergeReport> => {
    try {
      const data: ExportData = JSON.parse(jsonData);
      const report = await db.mergeData(data);
      await refreshAllData();
      return report;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to merge data");
      throw err;
    }
  };

  const diffData = async (jsonData: string): Promise<MergeDiff> => {
    try {
      const data: ExportData = JSON.parse(jsonData);
      return await db.diffData(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to diff data");
      throw err;
    }
  };

  const applyMerge = async (diff: MergeDiff, selectedIds: string[]): Promise<MergeReport> => {
    try {
      const report = await db.applyMerge(diff, selectedIds);
      await refreshAllData();
      return report;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to apply merge");
      throw err;
    }
  };

  const clearAllData = async () => {
    try {
      await db.clearAllData();
      await refreshAllData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to clear all data");
      throw err;
    }
  };

  return (
    <DataContext.Provider
      value={{
        employees,
        categories,
        subcategories,
        skills,
        assessments,
        departments,
        roles,
        qualificationPlans,
        qualificationMeasures,
        dataHash,
        loading,
        error,
        addEmployee,
        updateEmployee,
        deleteEmployee,
        addCategory,
        updateCategory,
        deleteCategory,
        addSubCategory,
        updateSubCategory,
        deleteSubCategory,
        getSubCategoriesByCategory,
        addSkill,
        updateSkill,
        deleteSkill,
        getSkillsBySubCategory,
        setAssessment,
        setTargetLevel,
        getAssessmentsByEmployee,
        getAssessment,
        getHistory,
        getAllHistory,
        addDepartment,
        updateDepartment,
        deleteDepartment,
        addRole,
        updateRole,
        deleteRole,
        updateSkillsForRole,
        projectTitle,
        updateProjectTitle,
        addQualificationPlan,
        updateQualificationPlan,
        deleteQualificationPlan,
        getQualificationPlansForEmployee,
        addQualificationMeasure,
        updateQualificationMeasure,
        deleteQualificationMeasure,
        getQualificationMeasuresForPlan,
        getSkillGapsForEmployee,
        getPotentialMentors,
        exportData,
        importData,
        mergeData,
        diffData,
        applyMerge,
        clearAllData,
      }}
    >
      {children}
    </DataContext.Provider>
  );
};

export const useData = () => {
  const context = useContext(DataContext);
  if (context === undefined) {
    throw new Error("useData must be used within DataProvider");
  }
  return context;
};
