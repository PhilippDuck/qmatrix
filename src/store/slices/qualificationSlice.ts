import { db } from "../../services/indexeddb";
import {
  computeSkillGapsForEmployee,
  findPotentialMentors,
} from "../../utils/skillGaps";
import type { QualificationMeasure, QualificationPlan } from "../../types";
import { recordChange } from "../recordChange";
import type { AppSlice, QualificationSlice } from "../types";

export const createQualificationSlice: AppSlice<QualificationSlice> = (set, get) => ({
  qualificationPlans: [],
  qualificationMeasures: [],

  addQualificationPlan: async (plan) => {
    try {
      const id = await db.addQualificationPlan(plan as Parameters<typeof db.addQualificationPlan>[0]);
      const emp = get().employees.find((e) => e.id === plan.employeeId);
      const now = Date.now();
      const newPlan = { ...plan, id, createdAt: now, updatedAt: now } as QualificationPlan;

      set((state) => ({
        qualificationPlans: [...state.qualificationPlans, newPlan],
      }));

      await recordChange(
        get,
        "qualificationPlan",
        id,
        `Plan für ${emp?.name || plan.employeeId}`,
        "create",
        null,
        newPlan
      );
      return id;
    } catch (err) {
      set({ error: err instanceof Error ? err.message : "Failed" });
      throw err;
    }
  },

  updateQualificationPlan: async (id, plan) => {
    try {
      const existing = get().qualificationPlans.find((p) => p.id === id);
      const emp = get().employees.find((e) => e.id === existing?.employeeId);
      const updatedPlan = {
        ...existing,
        ...plan,
        id,
        updatedAt: Date.now(),
      } as QualificationPlan;

      set((state) => ({
        qualificationPlans: state.qualificationPlans.map((p) =>
          p.id === id ? updatedPlan : p
        ),
      }));

      await db.updateQualificationPlan(id, plan);
      await recordChange(
        get,
        "qualificationPlan",
        id,
        `Plan für ${emp?.name || existing?.employeeId || id}`,
        "update",
        existing,
        updatedPlan
      );
    } catch (err) {
      set({ error: err instanceof Error ? err.message : "Failed" });
      await get().refreshAllData();
      throw err;
    }
  },

  deleteQualificationPlan: async (id) => {
    try {
      const existing = get().qualificationPlans.find((p) => p.id === id);
      const cascadeMeasures = get().qualificationMeasures.filter((m) => m.planId === id);

      set((state) => ({
        qualificationPlans: state.qualificationPlans.filter((p) => p.id !== id),
        qualificationMeasures: state.qualificationMeasures.filter((m) => m.planId !== id),
      }));

      await db.deleteQualificationPlan(id);
      await recordChange(
        get,
        "qualificationPlan",
        id,
        `Plan für ${existing?.employeeId || id}`,
        "delete",
        { ...existing, _cascade: { qualificationMeasures: cascadeMeasures } },
        null
      );
    } catch (err) {
      set({ error: err instanceof Error ? err.message : "Failed" });
      await get().refreshAllData();
      throw err;
    }
  },

  getQualificationPlansForEmployee: (employeeId) =>
    get().qualificationPlans.filter((p) => p.employeeId === employeeId),

  addQualificationMeasure: async (measure) => {
    try {
      const id = await db.addQualificationMeasure(measure);
      const skill = get().skills.find((s) => s.id === measure.skillId);
      const newMeasure = { ...measure, id, updatedAt: Date.now() };

      set((state) => ({
        qualificationMeasures: [...state.qualificationMeasures, newMeasure],
      }));

      await recordChange(
        get,
        "qualificationMeasure",
        id,
        `Maßnahme: ${skill?.name || measure.skillId}`,
        "create",
        null,
        newMeasure
      );
      return id;
    } catch (err) {
      set({ error: err instanceof Error ? err.message : "Failed" });
      throw err;
    }
  },

  updateQualificationMeasure: async (id, measure) => {
    try {
      const existing = get().qualificationMeasures.find((m) => m.id === id);
      const skill = get().skills.find((s) => s.id === existing?.skillId);
      const updatedMeasure = {
        ...existing,
        ...measure,
        id,
        updatedAt: Date.now(),
      } as QualificationMeasure;

      set((state) => ({
        qualificationMeasures: state.qualificationMeasures.map((m) =>
          m.id === id ? updatedMeasure : m
        ),
      }));

      await db.updateQualificationMeasure(id, measure);
      await recordChange(
        get,
        "qualificationMeasure",
        id,
        `Maßnahme: ${skill?.name || existing?.skillId || id}`,
        "update",
        existing,
        updatedMeasure
      );
    } catch (err) {
      set({ error: err instanceof Error ? err.message : "Failed" });
      await get().refreshAllData();
      throw err;
    }
  },

  deleteQualificationMeasure: async (id) => {
    try {
      const existing = get().qualificationMeasures.find((m) => m.id === id);
      const skill = get().skills.find((s) => s.id === existing?.skillId);

      set((state) => ({
        qualificationMeasures: state.qualificationMeasures.filter((m) => m.id !== id),
      }));

      await db.deleteQualificationMeasure(id);
      await recordChange(
        get,
        "qualificationMeasure",
        id,
        `Maßnahme: ${skill?.name || existing?.skillId || id}`,
        "delete",
        existing,
        null
      );
    } catch (err) {
      set({ error: err instanceof Error ? err.message : "Failed" });
      await get().refreshAllData();
      throw err;
    }
  },

  getQualificationMeasuresForPlan: (planId) =>
    get().qualificationMeasures.filter((m) => m.planId === planId),

  getSkillGapsForEmployee: (employeeId, targetRoleId) => {
    const state = get();
    return computeSkillGapsForEmployee(
      {
        assessments: state.assessments,
        roles: state.roles,
        skills: state.skills,
        subcategories: state.subcategories,
        categories: state.categories,
        employees: state.employees,
      },
      employeeId,
      targetRoleId
    );
  },

  getPotentialMentors: (skillId, excludeEmployeeId) => {
    const state = get();
    return findPotentialMentors(
      state.assessments,
      state.employees,
      skillId,
      excludeEmployeeId
    );
  },
});
