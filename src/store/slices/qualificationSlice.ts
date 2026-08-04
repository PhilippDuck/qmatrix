import { db } from "../../services/indexeddb";
import {
  computeSkillGapsForEmployee,
  findPotentialMentors,
} from "../../utils/skillGaps";
import type { QualificationMeasure, QualificationPlan } from "../../types";
import { createEntityCrudHandlers } from "../createEntityCrud";
import type { AppSlice, QualificationSlice } from "../types";

export const createQualificationSlice: AppSlice<QualificationSlice> = (set, get) => {
  const planLabel = (item: Partial<QualificationPlan>, fallbackId = "") => {
    const emp = get().employees.find((e) => e.id === item.employeeId);
    return `Plan für ${emp?.name || item.employeeId || fallbackId}`;
  };

  const measureLabel = (item: Partial<QualificationMeasure>, fallbackId = "") => {
    const skill = get().skills.find((s) => s.id === item.skillId);
    return `Maßnahme: ${skill?.name || item.skillId || fallbackId}`;
  };

  const plans = createEntityCrudHandlers<
    QualificationPlan,
    Omit<QualificationPlan, "id" | "createdAt" | "updatedAt">,
    Partial<Omit<QualificationPlan, "id" | "createdAt">>
  >(set, get, {
    entityType: "qualificationPlan",
    listKey: "qualificationPlans",
    getLabel: planLabel,
    dbAdd: (data) =>
      db.addQualificationPlan(data as Parameters<typeof db.addQualificationPlan>[0]),
    dbUpdate: (id, data) => db.updateQualificationPlan(id, data),
    dbDelete: (id) => db.deleteQualificationPlan(id),
    buildNew: (data, id) => {
      const now = Date.now();
      return { ...data, id, createdAt: now, updatedAt: now };
    },
    prepareDelete: (getState, id, existing) => {
      const state = getState();
      const cascadeMeasures = state.qualificationMeasures.filter((m) => m.planId === id);
      return {
        partial: {
          qualificationPlans: state.qualificationPlans.filter((p) => p.id !== id),
          qualificationMeasures: state.qualificationMeasures.filter((m) => m.planId !== id),
        },
        previousData: {
          ...existing,
          _cascade: { qualificationMeasures: cascadeMeasures },
        },
      };
    },
  });

  const measures = createEntityCrudHandlers<
    QualificationMeasure,
    Omit<QualificationMeasure, "id" | "updatedAt">,
    Partial<Omit<QualificationMeasure, "id">>
  >(set, get, {
    entityType: "qualificationMeasure",
    listKey: "qualificationMeasures",
    getLabel: measureLabel,
    dbAdd: (data) => db.addQualificationMeasure(data),
    dbUpdate: (id, data) => db.updateQualificationMeasure(id, data),
    dbDelete: (id) => db.deleteQualificationMeasure(id),
  });

  return {
    qualificationPlans: [],
    qualificationMeasures: [],

    addQualificationPlan: plans.add,
    updateQualificationPlan: plans.update,
    deleteQualificationPlan: plans.remove,
    getQualificationPlansForEmployee: (employeeId) =>
      get().qualificationPlans.filter((p) => p.employeeId === employeeId),

    addQualificationMeasure: measures.add,
    updateQualificationMeasure: measures.update,
    deleteQualificationMeasure: measures.remove,
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
  };
};
