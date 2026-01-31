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
} from "../services/indexeddb";

// Re-export types for convenience
export type { Employee, Category, SubCategory, Skill, Assessment, AssessmentLogEntry, Department, EmployeeRole, ExportData, MergeReport, MergeDiff, MergeItemDiff };

interface DataContextType {
  employees: Employee[];
  categories: Category[];
  subcategories: SubCategory[];
  skills: Skill[];
  assessments: Assessment[];
  departments: Department[];
  roles: EmployeeRole[];
  dataHash: string;
  loading: boolean;
  error: string | null;

  // Employee methods
  addEmployee: (employee: Omit<Employee, "id">) => Promise<void>;
  updateEmployee: (id: string, employee: Omit<Employee, "id">) => Promise<void>;
  deleteEmployee: (id: string) => Promise<void>;

  // Category methods
  addCategory: (category: Omit<Category, "id">) => Promise<void>;
  updateCategory: (id: string, category: Omit<Category, "id">) => Promise<void>;
  deleteCategory: (id: string) => Promise<void>;

  // SubCategory methods
  addSubCategory: (subCategory: Omit<SubCategory, "id">) => Promise<void>;
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
    level: 0 | 25 | 50 | 75 | 100,
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

  // Data management
  exportData: () => Promise<void>;
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
      const [emps, cats, subcats, sks, asms, depts, rls, hash] = await Promise.all([
        db.getEmployees(),
        db.getCategories(),
        db.getSubCategories(),
        db.getSkills(),
        db.execute("assessments", "getAll"),
        db.getDepartments(),
        db.getRoles(),
        db.getDataHash()
      ]);

      setEmployees(emps);
      setCategories(cats || []);
      setSubCategories(subcats || []);
      setSkills(sks || []);
      setAssessments(asms || []);
      setDepartments(depts || []);
      setRoles(rls || []);
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
      await db.addCategory(category);
      await refreshAllData();
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
      await db.addSubCategory(subCategory);
      await refreshAllData();
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
    level: 0 | 25 | 50 | 75 | 100,
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
      a.download = `qmatrix_backup_${dateStr}_${timeStr}.json`;
      a.click();
      URL.revokeObjectURL(url);
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
