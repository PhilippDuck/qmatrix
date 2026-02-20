import { create } from 'zustand';
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
    QualificationPlan as DBQualificationPlan,
    QualificationMeasure,
    SavedView,
    ChangeHistoryEntry,
    EntityType,
    ChangeAction,
} from "../services/indexeddb";

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
    QualificationMeasure,
    SavedView,
    ChangeHistoryEntry,
    EntityType,
    ChangeAction,
};

export interface QualificationPlan extends Omit<DBQualificationPlan, 'targetRoleId'> {
    targetRoleId?: string;
}

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

interface AppState {
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
    updateSubCategory: (id: string, subCategory: Omit<SubCategory, "id">) => Promise<void>;
    deleteSubCategory: (id: string) => Promise<void>;
    getSubCategoriesByCategory: (categoryId: string) => SubCategory[];
    getSubCategoriesByParent: (parentSubCategoryId: string) => SubCategory[];

    // Skill methods
    addSkill: (skill: Omit<Skill, "id">) => Promise<void>;
    updateSkill: (id: string, skill: Omit<Skill, "id">) => Promise<void>;
    deleteSkill: (id: string) => Promise<void>;
    getSkillsBySubCategory: (subCategoryId: string) => Skill[];

    // Assessment methods
    setAssessment: (employeeId: string, skillId: string, level: -1 | 0 | 25 | 50 | 75 | 100) => Promise<void>;
    setTargetLevel: (employeeId: string, skillId: string, targetLevel: number | undefined) => Promise<void>;
    getAssessmentsByEmployee: (employeeId: string) => Assessment[];
    getAssessment: (employeeId: string, skillId: string) => Assessment | undefined;

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

// Helper to record changes inside the store
const recordChangeHelper = async (
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

export const useStore = create<AppState>((set, get) => ({
    employees: [],
    categories: [],
    subcategories: [],
    skills: [],
    assessments: [],
    departments: [],
    roles: [],
    qualificationPlans: [],
    qualificationMeasures: [],
    savedViews: [],
    changeHistory: [],
    projectTitle: "",
    dataHash: "",
    loading: true,
    error: null,

    initDb: async () => {
        try {
            await db.init();
            await get().refreshAllData();
        } catch (err) {
            set({ error: err instanceof Error ? err.message : "Failed to initialize database", loading: false });
        }
    },

    refreshAllData: async () => {
        try {
            const [emps, cats, subcats, sks, asms, depts, rls, qPlans, qMeasures, settings, views, history, hash] = await Promise.all([
                db.getEmployees(),
                db.getCategories(),
                db.getSubCategories(),
                db.getSkills(),
                db.execute("assessments", "getAll") as Promise<Assessment[]>,
                db.getDepartments(),
                db.getRoles(),
                db.getQualificationPlans(),
                db.getQualificationMeasures(),
                db.getSettings(),
                db.getSavedViews(),
                db.getRecentChangeHistory(20),
                db.getDataHash()
            ]);

            const processedPlans = await Promise.all((qPlans || []).map(async (plan) => {
                if ((plan.status as any) === 'draft') {
                    const updated = { ...plan, status: 'active' as const, updatedAt: Date.now() };
                    try { await db.execute("qualificationPlans", "put", updated); } catch (e) { console.error(e); }
                    return updated;
                }
                return plan;
            }));

            const nowTimestamp = Date.now();
            const processedMeasures = await Promise.all((qMeasures || []).map(async (m) => {
                if (m.status === 'pending' && m.startDate && m.startDate <= nowTimestamp) {
                    const updated = { ...m, status: 'in_progress' as const, updatedAt: nowTimestamp };
                    try { await db.execute("qualificationMeasures", "put", updated); } catch (e) { console.error(e); }
                    return updated;
                }
                return m;
            }));

            const now = new Date();
            const updatedEmps = await Promise.all((emps || []).map(async (emp) => {
                let modified = false;
                let finalEmp = { ...emp };
                if (finalEmp.isActive !== false && finalEmp.deactivationDate && new Date(finalEmp.deactivationDate) <= now) {
                    finalEmp.isActive = false;
                    modified = true;
                }
                if (finalEmp.isActive === false && finalEmp.reactivationDate && new Date(finalEmp.reactivationDate) <= now) {
                    finalEmp.isActive = true;
                    modified = true;
                }
                if (modified && finalEmp.id) {
                    try {
                        const { id, updatedAt, ...rest } = finalEmp;
                        await db.updateEmployee(id, rest);
                    } catch (e) { console.error(e); }
                }
                return finalEmp;
            }));

            set({
                categories: cats || [],
                subcategories: subcats || [],
                skills: sks || [],
                assessments: asms || [],
                departments: depts || [],
                roles: rls || [],
                qualificationPlans: processedPlans,
                qualificationMeasures: processedMeasures,
                savedViews: views || [],
                changeHistory: history || [],
                projectTitle: settings?.projectTitle || "",
                dataHash: hash || "",
                employees: updatedEmps,
                loading: false,
                error: null
            });

        } catch (err) {
            set({ error: err instanceof Error ? err.message : "Failed to load data", loading: false });
        }
    },

    refreshChangeHistory: async () => {
        try {
            const history = await db.getRecentChangeHistory(20);
            set({ changeHistory: history || [] });
        } catch (err) {
            console.error(err);
        }
    },

    undoChange: async (historyEntryId: string) => {
        try {
            const entry = await db.getChangeHistoryById(historyEntryId);
            if (!entry || entry.undone) throw new Error("Eintrag nicht gefunden oder bereits rückgängig gemacht");

            switch (entry.action) {
                case 'create':
                    switch (entry.entityType) {
                        case 'employee': await db.deleteEmployee(entry.entityId); break;
                        case 'category': await db.deleteCategory(entry.entityId); break;
                        case 'subcategory': await db.deleteSubCategory(entry.entityId); break;
                        case 'skill': await db.deleteSkill(entry.entityId); break;
                        case 'department': await db.deleteDepartment(entry.entityId); break;
                        case 'role': await db.deleteRole(entry.entityId); break;
                        case 'qualificationPlan': await db.deleteQualificationPlan(entry.entityId); break;
                        case 'qualificationMeasure': await db.deleteQualificationMeasure(entry.entityId); break;
                        case 'assessment':
                            const parts = entry.entityId.split('-');
                            const empId = parts.slice(0, 5).join('-');
                            const sklId = parts.slice(5).join('-');
                            await db.deleteAssessment(empId, sklId);
                            break;
                        case 'savedView': await db.deleteSavedView(entry.entityId); break;
                    }
                    break;

                case 'update':
                    if (entry.previousData) {
                        const { id, ...dataWithoutId } = entry.previousData;
                        switch (entry.entityType) {
                            case 'employee': await db.updateEmployee(entry.entityId, dataWithoutId); break;
                            case 'category': await db.updateCategory(entry.entityId, dataWithoutId); break;
                            case 'subcategory': await db.updateSubCategory(entry.entityId, dataWithoutId); break;
                            case 'skill': await db.updateSkill(entry.entityId, dataWithoutId); break;
                            case 'department': await db.updateDepartment(entry.entityId, dataWithoutId); break;
                            case 'role': await db.updateRole(entry.entityId, dataWithoutId); break;
                            case 'qualificationPlan': await db.updateQualificationPlan(entry.entityId, dataWithoutId); break;
                            case 'qualificationMeasure': await db.updateQualificationMeasure(entry.entityId, dataWithoutId); break;
                            case 'assessment': await db.execute("assessments", "put", entry.previousData); break;
                            case 'savedView': await db.updateSavedView(entry.entityId, dataWithoutId); break;
                        }
                    } else {
                        throw new Error("Wiederherstellung fehlgeschlagen: Keine vorherigen Daten gefunden.");
                    }
                    break;

                case 'delete':
                    if (entry.previousData) {
                        const { _cascade, ...mainData } = entry.previousData;
                        const restoreCascade = async (cascade: any) => {
                            if (!cascade) return;
                            if (cascade.subcategories) for (const sc of cascade.subcategories) await db.execute("subcategories", "put", sc);
                            if (cascade.skills) for (const s of cascade.skills) await db.execute("skills", "put", s);
                            if (cascade.assessments) for (const a of cascade.assessments) await db.execute("assessments", "put", a);
                            if (cascade.qualificationPlans) for (const p of cascade.qualificationPlans) await db.execute("qualificationPlans", "put", p);
                            if (cascade.qualificationMeasures) for (const m of cascade.qualificationMeasures) await db.execute("qualificationMeasures", "put", m);
                        };

                        switch (entry.entityType) {
                            case 'employee': await db.execute("employees", "put", { ...mainData, id: entry.entityId }); await restoreCascade(_cascade); break;
                            case 'category': await db.execute("categories", "put", { ...mainData, id: entry.entityId }); await restoreCascade(_cascade); break;
                            case 'subcategory': await db.execute("subcategories", "put", { ...mainData, id: entry.entityId }); await restoreCascade(_cascade); break;
                            case 'skill': await db.execute("skills", "put", { ...mainData, id: entry.entityId }); await restoreCascade(_cascade); break;
                            case 'department': await db.execute("departments", "put", { ...mainData, id: entry.entityId }); break;
                            case 'role': await db.execute("roles", "put", { ...mainData, id: entry.entityId }); break;
                            case 'qualificationPlan': await db.execute("qualificationPlans", "put", { ...mainData, id: entry.entityId }); await restoreCascade(_cascade); break;
                            case 'qualificationMeasure': await db.execute("qualificationMeasures", "put", { ...mainData, id: entry.entityId }); break;
                            case 'assessment': await db.execute("assessments", "put", { ...mainData, id: entry.entityId }); break;
                            case 'savedView': await db.execute("savedViews", "put", { ...mainData, id: entry.entityId }); break;
                        }
                    }
                    break;
            }
            await db.markHistoryEntryUndone(historyEntryId);
            await get().refreshAllData();
        } catch (err) {
            set({ error: err instanceof Error ? err.message : "Fehler beim Rückgängig machen" });
            throw err;
        }
    },

    addEmployee: async (employee) => {
        try {
            const id = await db.addEmployee(employee);
            await recordChangeHelper('employee', id, employee.name, 'create', null, { ...employee, id });
            await get().refreshAllData();
        } catch (err) {
            set({ error: err instanceof Error ? err.message : "Failed to add employee" }); throw err;
        }
    },

    updateEmployee: async (id, employee) => {
        try {
            const existing = get().employees.find(e => e.id === id);
            await db.updateEmployee(id, employee);
            await recordChangeHelper('employee', id, employee.name, 'update', existing, { ...employee, id });
            await get().refreshAllData();
        } catch (err) {
            set({ error: err instanceof Error ? err.message : "Failed to update employee" }); throw err;
        }
    },

    deleteEmployee: async (id) => {
        try {
            const state = get();
            const existing = state.employees.find(e => e.id === id);
            const cascadeAssessments = state.assessments.filter(a => a.employeeId === id);
            const cascadePlans = state.qualificationPlans.filter(p => p.employeeId === id);
            const cascadeMeasures = state.qualificationMeasures.filter(m => cascadePlans.some(p => p.id === m.planId));
            const _cascade = { assessments: cascadeAssessments, qualificationPlans: cascadePlans, qualificationMeasures: cascadeMeasures };

            await db.deleteEmployee(id);
            await recordChangeHelper('employee', id, existing?.name || id, 'delete', { ...existing, _cascade }, null);
            await get().refreshAllData();
        } catch (err) {
            set({ error: err instanceof Error ? err.message : "Failed to delete employee" }); throw err;
        }
    },

    addCategory: async (category) => {
        try {
            const id = await db.addCategory(category);
            await recordChangeHelper('category', id, category.name, 'create', null, { ...category, id });
            await get().refreshAllData();
            return id;
        } catch (err) { set({ error: err instanceof Error ? err.message : "Failed to add category" }); throw err; }
    },

    updateCategory: async (id, category) => {
        try {
            const existing = get().categories.find(c => c.id === id);
            await db.updateCategory(id, category);
            await recordChangeHelper('category', id, category.name, 'update', existing, { ...category, id });
            await get().refreshAllData();
        } catch (err) { set({ error: err instanceof Error ? err.message : "Failed to update category" }); throw err; }
    },

    deleteCategory: async (id) => {
        try {
            const state = get();
            const existing = state.categories.find(c => c.id === id);
            const cascadeSubcategories = state.subcategories.filter(sc => sc.categoryId === id);
            const cascadeSkills = state.skills.filter(s => cascadeSubcategories.some(sc => sc.id === s.subCategoryId));
            const cascadeAssessments = state.assessments.filter(a => cascadeSkills.some(s => s.id === a.skillId));
            const _cascade = { subcategories: cascadeSubcategories, skills: cascadeSkills, assessments: cascadeAssessments };

            await db.deleteCategory(id);
            await recordChangeHelper('category', id, existing?.name || id, 'delete', { ...existing, _cascade }, null);
            await get().refreshAllData();
        } catch (err) { set({ error: err instanceof Error ? err.message : "Failed to delete category" }); throw err; }
    },

    addSubCategory: async (subCategory) => {
        try {
            const id = await db.addSubCategory(subCategory);
            await recordChangeHelper('subcategory', id, subCategory.name, 'create', null, { ...subCategory, id });
            await get().refreshAllData();
            return id;
        } catch (err) { set({ error: err instanceof Error ? err.message : "Failed to add subcategory" }); throw err; }
    },

    updateSubCategory: async (id, subCategory) => {
        try {
            const existing = get().subcategories.find(sc => sc.id === id);
            await db.updateSubCategory(id, subCategory);
            await recordChangeHelper('subcategory', id, subCategory.name, 'update', existing, { ...subCategory, id });
            await get().refreshAllData();
        } catch (err) { set({ error: err instanceof Error ? err.message : "Failed to update subcategory" }); throw err; }
    },

    deleteSubCategory: async (id) => {
        try {
            const state = get();
            const existing = state.subcategories.find(sc => sc.id === id);

            const collectChildren = (parentId: string): SubCategory[] => {
                const children = state.subcategories.filter(sc => sc.parentSubCategoryId === parentId);
                return children.concat(children.flatMap(c => collectChildren(c.id!)));
            };
            const cascadeSubcategories = collectChildren(id);
            const allSubcategoryIds = [id, ...cascadeSubcategories.map(sc => sc.id!)];
            const cascadeSkills = state.skills.filter(s => allSubcategoryIds.includes(s.subCategoryId));
            const cascadeAssessments = state.assessments.filter(a => cascadeSkills.some(s => s.id === a.skillId));

            await db.deleteSubCategory(id);
            await recordChangeHelper('subcategory', id, existing?.name || id, 'delete', { ...existing, _cascade: { subcategories: cascadeSubcategories, skills: cascadeSkills, assessments: cascadeAssessments } }, null);
            await get().refreshAllData();
        } catch (err) { set({ error: err instanceof Error ? err.message : "Failed to delete subcategory" }); throw err; }
    },

    getSubCategoriesByCategory: (categoryId) => get().subcategories.filter(sc => sc.categoryId === categoryId && !sc.parentSubCategoryId),
    getSubCategoriesByParent: (parentSubCategoryId) => get().subcategories.filter(sc => sc.parentSubCategoryId === parentSubCategoryId),

    addSkill: async (skill) => {
        try {
            const id = await db.addSkill(skill);
            await recordChangeHelper('skill', id, skill.name, 'create', null, { ...skill, id });
            await get().refreshAllData();
        } catch (err) { set({ error: err instanceof Error ? err.message : "Failed to add skill" }); throw err; }
    },

    updateSkill: async (id, skill) => {
        try {
            const existing = get().skills.find(s => s.id === id);
            await db.updateSkill(id, skill);
            await recordChangeHelper('skill', id, skill.name, 'update', existing, { ...skill, id });
            await get().refreshAllData();
        } catch (err) { set({ error: err instanceof Error ? err.message : "Failed to update skill" }); throw err; }
    },

    deleteSkill: async (id) => {
        try {
            const existing = get().skills.find(s => s.id === id);
            const cascadeAssessments = get().assessments.filter(a => a.skillId === id);
            await db.deleteSkill(id);
            await recordChangeHelper('skill', id, existing?.name || id, 'delete', { ...existing, _cascade: { assessments: cascadeAssessments } }, null);
            await get().refreshAllData();
        } catch (err) { set({ error: err instanceof Error ? err.message : "Failed to delete skill" }); throw err; }
    },

    getSkillsBySubCategory: (subCategoryId) => get().skills.filter(s => s.subCategoryId === subCategoryId),

    setAssessment: async (employeeId, skillId, level) => {
        try {
            const existingKey = `${employeeId}-${skillId}`;
            const existing = get().assessments.find(a => a.employeeId === employeeId && a.skillId === skillId);
            const skill = get().skills.find(s => s.id === skillId);
            const employee = get().employees.find(e => e.id === employeeId);
            const assessmentId = existing?.id || existingKey;

            const newAssessment: Assessment = { id: assessmentId, employeeId, skillId, level, targetLevel: existing?.targetLevel };

            // Optimistic
            set(state => {
                const index = state.assessments.findIndex(a => a.employeeId === employeeId && a.skillId === skillId);
                if (index >= 0) {
                    const newArr = [...state.assessments];
                    newArr[index] = newAssessment;
                    return { assessments: newArr };
                } else {
                    return { assessments: [...state.assessments, newAssessment] };
                }
            });
            await db.setAssessment(employeeId, skillId, level);
            await recordChangeHelper('assessment', assessmentId, `${employee?.name || employeeId}: ${skill?.name || skillId}`, existing ? 'update' : 'create', existing || null, newAssessment);
        } catch (err) {
            set({ error: err instanceof Error ? err.message : "Failed to set assessment" });
            await get().refreshAllData();
            throw err;
        }
    },

    setTargetLevel: async (employeeId, skillId, targetLevel) => {
        try {
            const existingKey = `${employeeId}-${skillId}`;
            const existing = get().assessments.find(a => a.employeeId === employeeId && a.skillId === skillId);
            const skill = get().skills.find(s => s.id === skillId);
            const employee = get().employees.find(e => e.id === employeeId);
            const assessmentId = existing?.id || existingKey;

            const newAssessment: Assessment = { ...(existing || { id: assessmentId, employeeId, skillId, level: 0 }), targetLevel };
            set(state => {
                const index = state.assessments.findIndex(a => a.employeeId === employeeId && a.skillId === skillId);
                if (index >= 0) {
                    const newArr = [...state.assessments];
                    newArr[index] = newAssessment;
                    return { assessments: newArr };
                } else {
                    return { assessments: [...state.assessments, newAssessment] };
                }
            });
            await db.setTargetLevel(employeeId, skillId, targetLevel);
            await recordChangeHelper('assessment', assessmentId, `Ziel: ${employee?.name || employeeId} - ${skill?.name || skillId}`, 'update', existing || { id: assessmentId, employeeId, skillId, level: 0, targetLevel: undefined }, newAssessment);
        } catch (err) {
            set({ error: err instanceof Error ? err.message : "Failed to set target level" });
            await get().refreshAllData();
            throw err;
        }
    },

    getAssessmentsByEmployee: (employeeId) => get().assessments.filter(a => a.employeeId === employeeId),

    getAssessment: (employeeId, skillId) => {
        // We could optimize this by caching if performance issues arise
        return get().assessments.find(a => a.employeeId === employeeId && a.skillId === skillId);
    },

    getHistory: async (employeeId) => db.getAssessmentLogs(employeeId),
    getAllHistory: async () => db.execute("assessment_logs", "getAll") as Promise<AssessmentLogEntry[]>,

    addDepartment: async (name) => {
        try {
            const id = await db.addDepartment(name);
            await recordChangeHelper('department', id, name, 'create', null, { name, id });
            await get().refreshAllData();
            return id;
        } catch (err) { set({ error: err instanceof Error ? err.message : "Failed" }); throw err; }
    },

    updateDepartment: async (id, department) => {
        try {
            const existing = get().departments.find(d => d.id === id);
            await db.updateDepartment(id, department);
            await recordChangeHelper('department', id, department.name, 'update', existing, { ...department, id });
            await get().refreshAllData();
        } catch (err) { set({ error: err instanceof Error ? err.message : "Failed" }); throw err; }
    },

    deleteDepartment: async (id) => {
        try {
            const existing = get().departments.find(d => d.id === id);
            await db.deleteDepartment(id);
            await recordChangeHelper('department', id, existing?.name || id, 'delete', existing, null);
            await get().refreshAllData();
        } catch (err) { set({ error: err instanceof Error ? err.message : "Failed" }); throw err; }
    },

    addRole: async (role) => {
        try {
            const id = await db.addRole(role);
            await recordChangeHelper('role', id, role.name, 'create', null, { ...role, id });
            await get().refreshAllData();
            return id;
        } catch (err) { set({ error: err instanceof Error ? err.message : "Failed" }); throw err; }
    },

    updateRole: async (id, role) => {
        try {
            const existing = get().roles.find(r => r.id === id);
            await db.updateRole(id, role);
            await recordChangeHelper('role', id, role.name, 'update', existing, { ...role, id });
            await get().refreshAllData();
        } catch (err) { set({ error: err instanceof Error ? err.message : "Failed" }); throw err; }
    },

    deleteRole: async (id) => {
        try {
            const existing = get().roles.find(r => r.id === id);
            await db.deleteRole(id);
            await recordChangeHelper('role', id, existing?.name || id, 'delete', existing, null);
            await get().refreshAllData();
        } catch (err) { set({ error: err instanceof Error ? err.message : "Failed" }); throw err; }
    },

    updateSkillsForRole: async (roleId, skillIds) => {
        try {
            await db.updateSkillsForRole(roleId, skillIds);
            await get().refreshAllData();
        } catch (err) { set({ error: err instanceof Error ? err.message : "Failed" }); throw err; }
    },

    updateProjectTitle: async (title) => {
        try {
            await db.saveSettings({ projectTitle: title });
            set({ projectTitle: title });
            await get().refreshAllData();
        } catch (err) { console.error(err); }
    },

    addQualificationPlan: async (plan) => {
        try {
            const id = await db.addQualificationPlan(plan as any);
            const emp = get().employees.find(e => e.id === plan.employeeId);
            await recordChangeHelper('qualificationPlan', id, `Plan für ${emp?.name || plan.employeeId}`, 'create', null, { ...plan, id });
            await get().refreshAllData();
            return id;
        } catch (err) { set({ error: err instanceof Error ? err.message : "Failed" }); throw err; }
    },

    updateQualificationPlan: async (id, plan) => {
        try {
            const existing = get().qualificationPlans.find(p => p.id === id);
            const emp = get().employees.find(e => e.id === existing?.employeeId);
            await db.updateQualificationPlan(id, plan);
            await recordChangeHelper('qualificationPlan', id, `Plan für ${emp?.name || existing?.employeeId || id}`, 'update', existing, { ...existing, ...plan, id });
            await get().refreshAllData();
        } catch (err) { set({ error: err instanceof Error ? err.message : "Failed" }); throw err; }
    },

    deleteQualificationPlan: async (id) => {
        try {
            const existing = get().qualificationPlans.find(p => p.id === id);
            const cascadeMeasures = get().qualificationMeasures.filter(m => m.planId === id);
            await db.deleteQualificationPlan(id);
            await recordChangeHelper('qualificationPlan', id, `Plan für ${existing?.employeeId || id}`, 'delete', { ...existing, _cascade: { qualificationMeasures: cascadeMeasures } }, null);
            await get().refreshAllData();
        } catch (err) { set({ error: err instanceof Error ? err.message : "Failed" }); throw err; }
    },

    getQualificationPlansForEmployee: (employeeId) => get().qualificationPlans.filter(p => p.employeeId === employeeId),

    addQualificationMeasure: async (measure) => {
        try {
            const id = await db.addQualificationMeasure(measure);
            const skill = get().skills.find(s => s.id === measure.skillId);
            await recordChangeHelper('qualificationMeasure', id, `Maßnahme: ${skill?.name || measure.skillId}`, 'create', null, { ...measure, id });
            await get().refreshAllData();
            return id;
        } catch (err) { set({ error: err instanceof Error ? err.message : "Failed" }); throw err; }
    },

    updateQualificationMeasure: async (id, measure) => {
        try {
            const existing = get().qualificationMeasures.find(m => m.id === id);
            const skill = get().skills.find(s => s.id === existing?.skillId);
            await db.updateQualificationMeasure(id, measure);
            await recordChangeHelper('qualificationMeasure', id, `Maßnahme: ${skill?.name || existing?.skillId || id}`, 'update', existing, { ...existing, ...measure, id });
            await get().refreshAllData();
        } catch (err) { set({ error: err instanceof Error ? err.message : "Failed" }); throw err; }
    },

    deleteQualificationMeasure: async (id) => {
        try {
            const existing = get().qualificationMeasures.find(m => m.id === id);
            const skill = get().skills.find(s => s.id === existing?.skillId);
            await db.deleteQualificationMeasure(id);
            await recordChangeHelper('qualificationMeasure', id, `Maßnahme: ${skill?.name || existing?.skillId || id}`, 'delete', existing, null);
            await get().refreshAllData();
        } catch (err) { set({ error: err instanceof Error ? err.message : "Failed" }); throw err; }
    },

    getQualificationMeasuresForPlan: (planId) => get().qualificationMeasures.filter(m => m.planId === planId),

    addSavedView: async (view) => {
        try {
            const id = await db.addSavedView(view);
            await recordChangeHelper('savedView', id, view.name, 'create', null, { ...view, id });
            await get().refreshAllData();
            return id;
        } catch (err) { set({ error: err instanceof Error ? err.message : "Failed" }); throw err; }
    },

    updateSavedView: async (id, view) => {
        try {
            const existing = get().savedViews.find(v => v.id === id);
            await db.updateSavedView(id, view);
            await recordChangeHelper('savedView', id, view.name, 'update', existing, { ...view, id });
            await get().refreshAllData();
        } catch (err) { set({ error: err instanceof Error ? err.message : "Failed" }); throw err; }
    },

    deleteSavedView: async (id) => {
        try {
            const existing = get().savedViews.find(v => v.id === id);
            await db.deleteSavedView(id);
            await recordChangeHelper('savedView', id, existing?.name || id, 'delete', existing, null);
            await get().refreshAllData();
        } catch (err) { set({ error: err instanceof Error ? err.message : "Failed" }); throw err; }
    },

    getSkillGapsForEmployee: (employeeId, targetRoleId) => {
        const state = get();
        const employeeAssessments = state.assessments.filter((a) => a.employeeId === employeeId);
        const assessmentMap = new Map(employeeAssessments.map((a) => [a.skillId, a.level]));
        const assessmentTargetMap = new Map(employeeAssessments.map((a) => [a.skillId, a.targetLevel || 0]));

        const requiredTargets = new Map<string, number>();

        assessmentTargetMap.forEach((target, skillId) => {
            if (target > 0) requiredTargets.set(skillId, target);
        });

        if (targetRoleId) {
            const normalizedTargetId = targetRoleId.trim().toLowerCase();
            let currentRole = state.roles.find((r) => r.id === targetRoleId || (r.name && r.name.trim().toLowerCase() === normalizedTargetId));
            const roleRequirements = new Map<string, number>();
            const visitedRoles = new Set<string>();

            while (currentRole) {
                if (visitedRoles.has(currentRole.id!)) break;
                visitedRoles.add(currentRole.id!);

                if (currentRole.requiredSkills) {
                    currentRole.requiredSkills.forEach((req) => {
                        if (!roleRequirements.has(req.skillId)) {
                            roleRequirements.set(req.skillId, req.level);
                        }
                    });
                }

                if (currentRole.inheritsFromId) {
                    const parentId = currentRole.inheritsFromId;
                    const normalizedParentId = parentId.trim().toLowerCase();
                    currentRole = state.roles.find((r) => r.id === parentId || (r.name && r.name.trim().toLowerCase() === normalizedParentId));
                } else {
                    currentRole = undefined;
                }
            }

            roleRequirements.forEach((level, skillId) => {
                const currentTarget = requiredTargets.get(skillId) || 0;
                requiredTargets.set(skillId, Math.max(currentTarget, level));
            });
        }

        const gaps: SkillGap[] = [];

        requiredTargets.forEach((targetLevel, skillId) => {
            const rawLevel = assessmentMap.get(skillId) ?? 0;
            const currentLevel = rawLevel < 0 ? 0 : rawLevel;
            const gap = targetLevel - currentLevel;

            if (gap > 0) {
                const skill = state.skills.find((s) => s.id === skillId);
                if (skill) {
                    const subCategory = state.subcategories.find((sc) => sc.id === skill.subCategoryId);
                    const category = subCategory ? state.categories.find((c) => c.id === subCategory.categoryId) : undefined;

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

        return gaps.sort((a, b) => b.gap - a.gap);
    },

    getPotentialMentors: (skillId, excludeEmployeeId) => {
        const state = get();
        const qualifiedAssessments = state.assessments.filter(
            (a) => a.skillId === skillId && a.level === 100 && a.employeeId !== excludeEmployeeId
        );
        const qualifiedEmployeeIds = new Set(qualifiedAssessments.map((a) => a.employeeId));
        return state.employees.filter((e) => qualifiedEmployeeIds.has(e.id!));
    },

    exportData: async () => {
        try {
            const dbData = await db.exportData();
            const state = get();
            const data: ExportData = {
                ...dbData,
                savedViews: state.savedViews,
            };

            const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            const now = new Date();
            const dateStr = now.toISOString().split("T")[0];
            const timeStr = now.toLocaleTimeString("de-DE").replace(/:/g, "-");
            const safeTitle = (state.projectTitle || "SkillGrid").replace(/[^a-z0-9]/gi, '_');
            a.download = `${safeTitle}_Backup_${dateStr}_${timeStr}.json`;
            a.click();
            URL.revokeObjectURL(url);

            return data;
        } catch (err) {
            set({ error: err instanceof Error ? err.message : "Failed to export data" });
            throw err;
        }
    },

    importData: async (jsonData) => {
        try {
            const data = JSON.parse(jsonData);
            await db.importData(data);
            await get().refreshAllData();
        } catch (err) { set({ error: err instanceof Error ? err.message : "Failed to import" }); throw err; }
    },

    mergeData: async (jsonData) => {
        try {
            const data: ExportData = JSON.parse(jsonData);
            const report = await db.mergeData(data);
            await get().refreshAllData();
            return report;
        } catch (err) { set({ error: err instanceof Error ? err.message : "Failed to merge" }); throw err; }
    },

    diffData: async (jsonData) => {
        try {
            const data: ExportData = JSON.parse(jsonData);
            return await db.diffData(data);
        } catch (err) { set({ error: err instanceof Error ? err.message : "Failed to diff" }); throw err; }
    },

    applyMerge: async (diff, selectedIds) => {
        try {
            const report = await db.applyMerge(diff, selectedIds);
            await get().refreshAllData();
            return report;
        } catch (err) { set({ error: err instanceof Error ? err.message : "Failed" }); throw err; }
    },

    clearAllData: async () => {
        try {
            await db.clearAllData();
            await get().refreshAllData();
        } catch (err) { set({ error: err instanceof Error ? err.message : "Failed" }); throw err; }
    }

}));
