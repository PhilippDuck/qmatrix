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
  SavedView,
  ChangeHistoryEntry,
  EntityType,
  ChangeAction,
} from "../services/indexeddb";

// Re-export types for convenience
export type { Employee, Category, SubCategory, Skill, Assessment, AssessmentLogEntry, Department, EmployeeRole, ExportData, MergeReport, MergeDiff, MergeItemDiff, QualificationMeasure, SavedView, ChangeHistoryEntry, EntityType, ChangeAction };

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
  savedViews: SavedView[];
  changeHistory: ChangeHistoryEntry[];
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
  getSubCategoriesByParent: (parentSubCategoryId: string) => SubCategory[];

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

  // Saved View methods
  addSavedView: (view: Omit<SavedView, "id" | "updatedAt">) => Promise<string>;
  updateSavedView: (id: string, view: Omit<SavedView, "id" | "updatedAt">) => Promise<void>;
  deleteSavedView: (id: string) => Promise<void>;

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

  // Change History
  undoChange: (historyEntryId: string) => Promise<void>;
  refreshChangeHistory: () => Promise<void>;
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
  const [savedViews, setSavedViews] = useState<SavedView[]>([]);
  const [changeHistory, setChangeHistory] = useState<ChangeHistoryEntry[]>([]);
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
      const [emps, cats, subcats, sks, asms, depts, rls, qPlans, qMeasures, settings, views, history, hash] = await Promise.all([
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
        db.getSavedViews(),
        db.getRecentChangeHistory(20),
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
      setSavedViews(views || []);
      setChangeHistory(history || []);
      setProjectTitle(settings?.projectTitle || "");
      setDataHash(hash || "");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load data");
    }
  };

  const refreshChangeHistory = async () => {
    try {
      const history = await db.getRecentChangeHistory(20);
      setChangeHistory(history || []);
    } catch (err) {
      console.error("Failed to refresh change history", err);
    }
  };

  // Helper to record changes
  const recordChange = async (
    entityType: EntityType,
    entityId: string,
    entityLabel: string,
    action: ChangeAction,
    previousData: any | null,
    newData: any | null
  ) => {
    try {
      await db.addChangeHistoryEntry({
        entityType,
        entityId,
        entityLabel,
        action,
        previousData,
        newData,
        timestamp: Date.now(),
        undone: false,
      });
    } catch (err) {
      console.error("Failed to record change", err);
    }
  };

  // Undo a change
  const undoChange = async (historyEntryId: string) => {
    try {
      const entry = await db.getChangeHistoryById(historyEntryId);
      if (!entry || entry.undone) {
        throw new Error("Eintrag nicht gefunden oder bereits rückgängig gemacht");
      }

      switch (entry.action) {
        case 'create':
          // Undo create = delete the entity
          switch (entry.entityType) {
            case 'employee':
              await db.deleteEmployee(entry.entityId);
              break;
            case 'category':
              await db.deleteCategory(entry.entityId);
              break;
            case 'subcategory':
              await db.deleteSubCategory(entry.entityId);
              break;
            case 'skill':
              await db.deleteSkill(entry.entityId);
              break;
            case 'department':
              await db.deleteDepartment(entry.entityId);
              break;
            case 'role':
              await db.deleteRole(entry.entityId);
              break;
            case 'qualificationPlan':
              await db.deleteQualificationPlan(entry.entityId);
              break;
            case 'qualificationMeasure':
              await db.deleteQualificationMeasure(entry.entityId);
              break;
          }
          break;

        case 'update':
          // Undo update = restore previousData
          if (entry.previousData) {
            switch (entry.entityType) {
              case 'employee':
                await db.updateEmployee(entry.entityId, entry.previousData);
                break;
              case 'category':
                await db.updateCategory(entry.entityId, entry.previousData);
                break;
              case 'subcategory':
                await db.updateSubCategory(entry.entityId, entry.previousData);
                break;
              case 'skill':
                await db.updateSkill(entry.entityId, entry.previousData);
                break;
              case 'department':
                await db.updateDepartment(entry.entityId, entry.previousData);
                break;
              case 'role':
                await db.updateRole(entry.entityId, entry.previousData);
                break;
              case 'qualificationPlan':
                await db.updateQualificationPlan(entry.entityId, entry.previousData);
                break;
              case 'qualificationMeasure':
                await db.updateQualificationMeasure(entry.entityId, entry.previousData);
                break;
              case 'assessment':
                if (entry.previousData.level !== undefined) {
                  await db.setAssessment(entry.previousData.employeeId, entry.previousData.skillId, entry.previousData.level);
                }
                if (entry.previousData.targetLevel !== undefined) {
                  await db.setTargetLevel(entry.previousData.employeeId, entry.previousData.skillId, entry.previousData.targetLevel);
                }
                break;
            }
          }
          break;

        case 'delete':
          // Undo delete = recreate with previousData (including cascade data)
          if (entry.previousData) {
            const { _cascade, ...mainData } = entry.previousData;

            // Helper to restore cascade data
            const restoreCascade = async (cascade: any) => {
              if (!cascade) return;

              // Restore in correct order: subcategories first, then skills, then assessments
              if (cascade.subcategories) {
                for (const sc of cascade.subcategories) {
                  await db.execute("subcategories", "put", sc);
                }
              }
              if (cascade.skills) {
                for (const s of cascade.skills) {
                  await db.execute("skills", "put", s);
                }
              }
              if (cascade.assessments) {
                for (const a of cascade.assessments) {
                  await db.execute("assessments", "put", a);
                }
              }
              if (cascade.qualificationPlans) {
                for (const p of cascade.qualificationPlans) {
                  await db.execute("qualificationPlans", "put", p);
                }
              }
              if (cascade.qualificationMeasures) {
                for (const m of cascade.qualificationMeasures) {
                  await db.execute("qualificationMeasures", "put", m);
                }
              }
            };

            switch (entry.entityType) {
              case 'employee':
                await db.execute("employees", "put", { ...mainData, id: entry.entityId });
                await restoreCascade(_cascade);
                break;
              case 'category':
                await db.execute("categories", "put", { ...mainData, id: entry.entityId });
                await restoreCascade(_cascade);
                break;
              case 'subcategory':
                await db.execute("subcategories", "put", { ...mainData, id: entry.entityId });
                await restoreCascade(_cascade);
                break;
              case 'skill':
                await db.execute("skills", "put", { ...mainData, id: entry.entityId });
                await restoreCascade(_cascade);
                break;
              case 'department':
                await db.execute("departments", "put", { ...mainData, id: entry.entityId });
                break;
              case 'role':
                await db.execute("roles", "put", { ...mainData, id: entry.entityId });
                break;
              case 'qualificationPlan':
                await db.execute("qualificationPlans", "put", { ...mainData, id: entry.entityId });
                await restoreCascade(_cascade);
                break;
              case 'qualificationMeasure':
                await db.execute("qualificationMeasures", "put", { ...mainData, id: entry.entityId });
                break;
            }
          }
          break;
      }

      await db.markHistoryEntryUndone(historyEntryId);
      await refreshAllData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Fehler beim Rückgängig machen");
      throw err;
    }
  };

  // Employee methods
  const addEmployee = async (employee: Omit<Employee, "id">) => {
    try {
      const id = await db.addEmployee(employee);
      await recordChange('employee', id, employee.name, 'create', null, { ...employee, id });
      await refreshAllData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add employee");
      throw err;
    }
  };

  const updateEmployee = async (id: string, employee: Omit<Employee, "id">) => {
    try {
      const existing = employees.find(e => e.id === id);
      await db.updateEmployee(id, employee);
      await recordChange('employee', id, employee.name, 'update', existing, { ...employee, id });
      await refreshAllData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update employee");
      throw err;
    }
  };

  const deleteEmployee = async (id: string) => {
    try {
      const existing = employees.find(e => e.id === id);

      // Collect all cascade data BEFORE deletion
      const cascadeAssessments = assessments.filter(a => a.employeeId === id);
      const cascadePlans = qualificationPlans.filter(p => p.employeeId === id);
      const cascadeMeasures = qualificationMeasures.filter(m => cascadePlans.some(p => p.id === m.planId));

      const cascadeData = {
        assessments: cascadeAssessments,
        qualificationPlans: cascadePlans,
        qualificationMeasures: cascadeMeasures,
      };

      await db.deleteEmployee(id);
      await recordChange('employee', id, existing?.name || id, 'delete', { ...existing, _cascade: cascadeData }, null);
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
      await recordChange('category', id, category.name, 'create', null, { ...category, id });
      await refreshAllData();
      return id;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add category");
      throw err;
    }
  };

  const updateCategory = async (id: string, category: Omit<Category, "id">) => {
    try {
      const existing = categories.find(c => c.id === id);
      await db.updateCategory(id, category);
      await recordChange('category', id, category.name, 'update', existing, { ...category, id });
      await refreshAllData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update category");
      throw err;
    }
  };

  const deleteCategory = async (id: string) => {
    try {
      const existing = categories.find(c => c.id === id);

      // Collect all cascade data BEFORE deletion
      const cascadeSubcategories = subcategories.filter(sc => sc.categoryId === id);
      const cascadeSkills = skills.filter(s => cascadeSubcategories.some(sc => sc.id === s.subCategoryId));
      const cascadeAssessments = assessments.filter(a => cascadeSkills.some(s => s.id === a.skillId));

      const cascadeData = {
        subcategories: cascadeSubcategories,
        skills: cascadeSkills,
        assessments: cascadeAssessments,
      };

      await db.deleteCategory(id);
      await recordChange('category', id, existing?.name || id, 'delete', { ...existing, _cascade: cascadeData }, null);
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
      await recordChange('subcategory', id, subCategory.name, 'create', null, { ...subCategory, id });
      await refreshAllData();
      return id;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add subcategory");
      throw err;
    }
  };

  const updateSubCategory = async (id: string, subCategory: Omit<SubCategory, "id">) => {
    try {
      const existing = subcategories.find(sc => sc.id === id);
      await db.updateSubCategory(id, subCategory);
      await recordChange('subcategory', id, subCategory.name, 'update', existing, { ...subCategory, id });
      await refreshAllData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update subcategory");
      throw err;
    }
  };

  const deleteSubCategory = async (id: string) => {
    try {
      const existing = subcategories.find(sc => sc.id === id);

      // Recursively collect all child subcategories
      const collectChildSubcategories = (parentId: string): SubCategory[] => {
        const children = subcategories.filter(sc => sc.parentSubCategoryId === parentId);
        return children.concat(children.flatMap(c => collectChildSubcategories(c.id!)));
      };
      const cascadeSubcategories = collectChildSubcategories(id);
      const allSubcategoryIds = [id, ...cascadeSubcategories.map(sc => sc.id!)];

      // Collect skills from this subcategory and all children
      const cascadeSkills = skills.filter(s => allSubcategoryIds.includes(s.subCategoryId));
      const cascadeAssessments = assessments.filter(a => cascadeSkills.some(s => s.id === a.skillId));

      const cascadeData = {
        subcategories: cascadeSubcategories,
        skills: cascadeSkills,
        assessments: cascadeAssessments,
      };

      await db.deleteSubCategory(id);
      await recordChange('subcategory', id, existing?.name || id, 'delete', { ...existing, _cascade: cascadeData }, null);
      await refreshAllData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete subcategory");
      throw err;
    }
  };

  const getSubCategoriesByCategory = (categoryId: string): SubCategory[] => {
    return subcategories.filter((sc) => sc.categoryId === categoryId && !sc.parentSubCategoryId);
  };

  const getSubCategoriesByParent = (parentSubCategoryId: string): SubCategory[] => {
    return subcategories.filter((sc) => sc.parentSubCategoryId === parentSubCategoryId);
  };

  // Skill methods
  const addSkill = async (skill: Omit<Skill, "id">) => {
    try {
      const id = await db.addSkill(skill);
      await recordChange('skill', id, skill.name, 'create', null, { ...skill, id });
      await refreshAllData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add skill");
      throw err;
    }
  };

  const updateSkill = async (id: string, skill: Omit<Skill, "id">) => {
    try {
      const existing = skills.find(s => s.id === id);
      await db.updateSkill(id, skill);
      await recordChange('skill', id, skill.name, 'update', existing, { ...skill, id });
      await refreshAllData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update skill");
      throw err;
    }
  };

  const deleteSkill = async (id: string) => {
    try {
      const existing = skills.find(s => s.id === id);

      // Collect all assessments for this skill
      const cascadeAssessments = assessments.filter(a => a.skillId === id);
      const cascadeData = { assessments: cascadeAssessments };

      await db.deleteSkill(id);
      await recordChange('skill', id, existing?.name || id, 'delete', { ...existing, _cascade: cascadeData }, null);
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
      const existing = assessments.find(a => a.employeeId === employeeId && a.skillId === skillId);
      const skill = skills.find(s => s.id === skillId);
      const employee = employees.find(e => e.id === employeeId);
      await db.setAssessment(employeeId, skillId, level);
      const assessmentId = `${employeeId}-${skillId}`;
      await recordChange(
        'assessment',
        assessmentId,
        `${employee?.name || employeeId}: ${skill?.name || skillId}`,
        existing ? 'update' : 'create',
        existing || null,
        { employeeId, skillId, level, targetLevel: existing?.targetLevel }
      );
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
      const existing = assessments.find(a => a.employeeId === employeeId && a.skillId === skillId);
      const skill = skills.find(s => s.id === skillId);
      const employee = employees.find(e => e.id === employeeId);
      await db.setTargetLevel(employeeId, skillId, targetLevel);
      const assessmentId = `${employeeId}-${skillId}`;
      await recordChange(
        'assessment',
        assessmentId,
        `Ziel: ${employee?.name || employeeId} - ${skill?.name || skillId}`,
        'update',
        existing || null,
        { employeeId, skillId, level: existing?.level ?? 0, targetLevel }
      );
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
      await recordChange('department', id, name, 'create', null, { name, id });
      await refreshAllData();
      return id;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add department");
      throw err;
    }
  };

  const updateDepartment = async (id: string, department: Omit<Department, "id">) => {
    try {
      const existing = departments.find(d => d.id === id);
      await db.updateDepartment(id, department);
      await recordChange('department', id, department.name, 'update', existing, { ...department, id });
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
      const existing = departments.find(d => d.id === id);
      await db.deleteDepartment(id);
      await recordChange('department', id, existing?.name || id, 'delete', existing, null);
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
      await recordChange('role', id, role.name, 'create', null, { ...role, id });
      await refreshAllData();
      return id;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add role");
      throw err;
    }
  };

  const updateRole = async (id: string, role: Omit<EmployeeRole, "id">) => {
    try {
      const existing = roles.find(r => r.id === id);
      await db.updateRole(id, role);
      await recordChange('role', id, role.name, 'update', existing, { ...role, id });
      await refreshAllData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update role");
      throw err;
    }
  };

  const deleteRole = async (id: string) => {
    try {
      const existing = roles.find(r => r.id === id);
      await db.deleteRole(id);
      await recordChange('role', id, existing?.name || id, 'delete', existing, null);
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
      const employee = employees.find(e => e.id === plan.employeeId);
      await recordChange('qualificationPlan', id, `Plan für ${employee?.name || plan.employeeId}`, 'create', null, { ...plan, id });
      await refreshAllData();
      return id;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add qualification plan");
      throw err;
    }
  };

  const updateQualificationPlan = async (id: string, plan: Partial<Omit<QualificationPlan, "id" | "createdAt">>) => {
    try {
      const existing = qualificationPlans.find(p => p.id === id);
      const employee = employees.find(e => e.id === existing?.employeeId);
      await db.updateQualificationPlan(id, plan);
      await recordChange('qualificationPlan', id, `Plan für ${employee?.name || existing?.employeeId || id}`, 'update', existing, { ...existing, ...plan, id });
      await refreshAllData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update qualification plan");
      throw err;
    }
  };

  const deleteQualificationPlan = async (id: string) => {
    try {
      const existing = qualificationPlans.find(p => p.id === id);
      const employee = employees.find(e => e.id === existing?.employeeId);

      // Collect all measures for this plan
      const cascadeMeasures = qualificationMeasures.filter(m => m.planId === id);
      const cascadeData = { qualificationMeasures: cascadeMeasures };

      await db.deleteQualificationPlan(id);
      await recordChange('qualificationPlan', id, `Plan für ${employee?.name || existing?.employeeId || id}`, 'delete', { ...existing, _cascade: cascadeData }, null);
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
      const skill = skills.find(s => s.id === measure.skillId);
      await recordChange('qualificationMeasure', id, `Maßnahme: ${skill?.name || measure.skillId}`, 'create', null, { ...measure, id });
      await refreshAllData();
      return id;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add qualification measure");
      throw err;
    }
  };

  const updateQualificationMeasure = async (id: string, measure: Partial<Omit<QualificationMeasure, "id">>) => {
    try {
      const existing = qualificationMeasures.find(m => m.id === id);
      const skill = skills.find(s => s.id === existing?.skillId);
      await db.updateQualificationMeasure(id, measure);
      await recordChange('qualificationMeasure', id, `Maßnahme: ${skill?.name || existing?.skillId || id}`, 'update', existing, { ...existing, ...measure, id });
      await refreshAllData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update qualification measure");
      throw err;
    }
  };

  const deleteQualificationMeasure = async (id: string) => {
    try {
      const existing = qualificationMeasures.find(m => m.id === id);
      const skill = skills.find(s => s.id === existing?.skillId);
      await db.deleteQualificationMeasure(id);
      await recordChange('qualificationMeasure', id, `Maßnahme: ${skill?.name || existing?.skillId || id}`, 'delete', existing, null);
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

    // 2. If a target role is specified, merge role requirements (including inherited ones)
    if (targetRoleId) {
      // Find start role (support ID or Name for legacy)
      const normalizedTargetId = targetRoleId.trim().toLowerCase();
      let currentRole = roles.find((r) => r.id === targetRoleId || (r.name && r.name.trim().toLowerCase() === normalizedTargetId));

      // Traverse inheritance chain up
      // We collect requirements such that child overrides parent (first come first served in traversal)
      const roleRequirements = new Map<string, number>();
      const visitedRoles = new Set<string>();

      while (currentRole) {
        if (visitedRoles.has(currentRole.id!)) {
          console.warn("Circular dependency in role inheritance:", currentRole.name);
          break;
        }
        visitedRoles.add(currentRole.id!);

        if (currentRole.requiredSkills) {
          currentRole.requiredSkills.forEach((req) => {
            // Only add if not already defined by a child role
            if (!roleRequirements.has(req.skillId)) {
              roleRequirements.set(req.skillId, req.level);
            }
          });
        }

        // Move to parent
        if (currentRole.inheritsFromId) {
          const parentId = currentRole.inheritsFromId;
          const normalizedParentId = parentId.trim().toLowerCase();
          currentRole = roles.find((r) => r.id === parentId || (r.name && r.name.trim().toLowerCase() === normalizedParentId));
        } else {
          currentRole = undefined;
        }
      }

      // Merge role requirements into final requirements
      roleRequirements.forEach((level, skillId) => {
        const currentTarget = requiredTargets.get(skillId) || 0;
        // Take the maximum of individual target and role target
        requiredTargets.set(skillId, Math.max(currentTarget, level));
      });
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

  // Saved View Methods
  const addSavedView = async (view: Omit<SavedView, "id" | "updatedAt">) => {
    try {
      const id = await db.addSavedView(view);
      await refreshAllData();
      return id;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add saved view");
      throw err;
    }
  };

  const updateSavedView = async (id: string, view: Omit<SavedView, "id" | "updatedAt">) => {
    try {
      await db.updateSavedView(id, view);
      await refreshAllData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update saved view");
      throw err;
    }
  };

  const deleteSavedView = async (id: string) => {
    try {
      await db.deleteSavedView(id);
      await refreshAllData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete saved view");
      throw err;
    }
  };

  // Data management
  const exportData = async () => {
    try {
      const dbData = await db.exportData();
      const data: ExportData = {
        ...dbData,
        savedViews: savedViews,
      };

      const blob = new Blob([JSON.stringify(data, null, 2)], {
        type: "application/json",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      const now = new Date();
      const dateStr = now.toISOString().split("T")[0];
      const timeStr = now.toLocaleTimeString("de-DE").replace(/:/g, "-");
      const safeTitle = (projectTitle || "SkillGrid").replace(/[^a-z0-9]/gi, '_');
      a.download = `${safeTitle}_Backup_${dateStr}_${timeStr}.json`;
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
        savedViews,
        changeHistory,
        projectTitle,
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
        getSubCategoriesByParent,
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

        updateProjectTitle,
        addQualificationPlan,
        updateQualificationPlan,
        deleteQualificationPlan,
        getQualificationPlansForEmployee,
        addQualificationMeasure,
        updateQualificationMeasure,
        deleteQualificationMeasure,
        getQualificationMeasuresForPlan,
        addSavedView,
        updateSavedView,
        deleteSavedView,
        getSkillGapsForEmployee,
        getPotentialMentors,
        exportData,
        importData,
        mergeData,
        diffData,
        applyMerge,
        clearAllData,
        undoChange,
        refreshChangeHistory,
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
