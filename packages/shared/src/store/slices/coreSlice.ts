import type { DbService } from "../../services/indexeddb";
import type { PrefixedStorage } from "../prefixedStorage";
import { runLoadTimeMigrations } from "../../services/dataMigrations";
import type { Assessment } from "../../types";
import type { AppSlice, CoreSlice } from "../types";

export const createCoreSlice = (db: DbService, storage: PrefixedStorage): AppSlice<CoreSlice> => (set, get) => ({
  projectTitle: "",
  dataHash: "",
  loading: true,
  error: null,
  hasUnsavedChanges: storage.getItem("has-unsaved-changes") === "true",

  setHasUnsavedChanges: (val) => {
    storage.setItem("has-unsaved-changes", val.toString());
    set({ hasUnsavedChanges: val });
  },

  initDb: async () => {
    try {
      await db.init();
      await get().refreshAllData();
    } catch (err) {
      set({
        error: err instanceof Error ? err.message : "Failed to initialize database",
        loading: false,
      });
    }
  },

  refreshAllData: async () => {
    try {
      const [
        emps,
        cats,
        subcats,
        sks,
        asms,
        depts,
        rls,
        qPlans,
        qMeasures,
        settings,
        views,
        history,
        hash,
      ] = await Promise.all([
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
        db.getDataHash(),
      ]);

      const migrated = await runLoadTimeMigrations(db, {
        employees: emps || [],
        departments: depts || [],
        qualificationPlans: qPlans || [],
        qualificationMeasures: qMeasures || [],
      });

      set({
        categories: cats || [],
        subcategories: subcats || [],
        skills: sks || [],
        assessments: asms || [],
        departments: migrated.departments,
        roles: rls || [],
        qualificationPlans: migrated.qualificationPlans,
        qualificationMeasures: migrated.qualificationMeasures,
        savedViews: (views || []).sort((a, b) => (a.order ?? 9999) - (b.order ?? 9999)),
        changeHistory: history || [],
        projectTitle: settings?.projectTitle || "",
        dataHash: hash || "",
        employees: migrated.employees,
        loading: false,
        error: null,
      });
    } catch (err) {
      set({
        error: err instanceof Error ? err.message : "Failed to load data",
        loading: false,
      });
    }
  },

  updateProjectTitle: async (title) => {
    try {
      await db.saveSettings({ projectTitle: title });
      set({ projectTitle: title });
      await get().refreshAllData();
    } catch (err) {
      console.error(err);
    }
  },
});
