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
} from "../services/indexeddb";

// Re-export types for convenience
export type { Employee, Category, SubCategory, Skill, Assessment };

interface DataContextType {
  employees: Employee[];
  categories: Category[];
  subcategories: SubCategory[];
  skills: Skill[];
  assessments: Assessment[];
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
  getAssessmentsByEmployee: (employeeId: string) => Assessment[];
  getAssessment: (
    employeeId: string,
    skillId: string,
  ) => Assessment | undefined;

  // Data management
  exportData: () => Promise<void>;
  importData: (jsonData: string) => Promise<void>;
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
      const [employees, categories, subCategories, skills] = await Promise.all([
        db.getEmployees(),
        db.getCategories(),
        db.getSubCategories(),
        db.getSkills(),
      ]);

      setEmployees(employees);
      setCategories(categories);
      setSubCategories(subCategories);
      setSkills(skills);

      // Get all assessments
      const allAssessments: Assessment[] = [];
      for (const emp of employees) {
        const empAssessments = await db.getAssessmentsByEmployee(emp.id!);
        allAssessments.push(...empAssessments);
      }
      setAssessments(allAssessments);
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
      setError(
        err instanceof Error ? err.message : "Failed to update employee",
      );
      throw err;
    }
  };

  const deleteEmployee = async (id: string) => {
    try {
      await db.deleteEmployee(id);
      await refreshAllData();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to delete employee",
      );
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
      setError(
        err instanceof Error ? err.message : "Failed to update category",
      );
      throw err;
    }
  };

  const deleteCategory = async (id: string) => {
    try {
      await db.deleteCategory(id);
      await refreshAllData();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to delete category",
      );
      throw err;
    }
  };

  // SubCategory methods
  const addSubCategory = async (subCategory: Omit<SubCategory, "id">) => {
    try {
      await db.addSubCategory(subCategory);
      await refreshAllData();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to add subcategory",
      );
      throw err;
    }
  };

  const updateSubCategory = async (
    id: string,
    subCategory: Omit<SubCategory, "id">,
  ) => {
    try {
      await db.updateSubCategory(id, subCategory);
      await refreshAllData();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to update subcategory",
      );
      throw err;
    }
  };

  const deleteSubCategory = async (id: string) => {
    try {
      await db.deleteSubCategory(id);
      await refreshAllData();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to delete subcategory",
      );
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

  // Data management
  const exportData = async () => {
    try {
      const data = await db.exportData();
      const json = JSON.stringify(data, null, 2);
      const blob = new Blob([json], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `qmatrix-export-${new Date().toISOString()}.json`;
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

  return (
    <DataContext.Provider
      value={{
        employees,
        categories,
        subcategories,
        skills,
        assessments,
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
        getAssessmentsByEmployee,
        getAssessment,
        exportData,
        importData,
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
