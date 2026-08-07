import { db } from "../../services/indexeddb";
import type { Assessment, AssessmentLogEntry } from "../../types";
import { recordChange } from "../recordChange";
import type { AppSlice, AssessmentSlice } from "../types";

export const createAssessmentSlice: AppSlice<AssessmentSlice> = (set, get) => ({
  assessments: [],

  setAssessment: async (employeeId, skillId, level, note?: string) => {
    try {
      const existingKey = `${employeeId}-${skillId}`;
      const existing = get().assessments.find(
        (a) => a.employeeId === employeeId && a.skillId === skillId
      );
      const skill = get().skills.find((s) => s.id === skillId);
      const employee = get().employees.find((e) => e.id === employeeId);
      const assessmentId = existing?.id || existingKey;

      const newAssessment: Assessment = {
        id: assessmentId,
        employeeId,
        skillId,
        level,
        targetLevel: existing?.targetLevel,
      };

      set((state) => {
        const index = state.assessments.findIndex(
          (a) => a.employeeId === employeeId && a.skillId === skillId
        );
        if (index >= 0) {
          const newArr = [...state.assessments];
          newArr[index] = newAssessment;
          return { assessments: newArr };
        }
        return { assessments: [...state.assessments, newAssessment] };
      });

      await db.setAssessment(employeeId, skillId, level, note);
      await recordChange(
        get,
        "assessment",
        assessmentId,
        `${employee?.name || employeeId}: ${skill?.name || skillId}`,
        existing ? "update" : "create",
        existing || null,
        newAssessment
      );
    } catch (err) {
      set({ error: err instanceof Error ? err.message : "Failed to set assessment" });
      await get().refreshAllData();
      throw err;
    }
  },

  setTargetLevel: async (employeeId, skillId, targetLevel) => {
    try {
      const existingKey = `${employeeId}-${skillId}`;
      const existing = get().assessments.find(
        (a) => a.employeeId === employeeId && a.skillId === skillId
      );
      const skill = get().skills.find((s) => s.id === skillId);
      const employee = get().employees.find((e) => e.id === employeeId);
      const assessmentId = existing?.id || existingKey;

      const newAssessment: Assessment = {
        ...(existing || { id: assessmentId, employeeId, skillId, level: 0 }),
        targetLevel,
      };

      set((state) => {
        const index = state.assessments.findIndex(
          (a) => a.employeeId === employeeId && a.skillId === skillId
        );
        if (index >= 0) {
          const newArr = [...state.assessments];
          newArr[index] = newAssessment;
          return { assessments: newArr };
        }
        return { assessments: [...state.assessments, newAssessment] };
      });

      await db.setTargetLevel(employeeId, skillId, targetLevel);
      await recordChange(
        get,
        "assessment",
        assessmentId,
        `Ziel: ${employee?.name || employeeId} - ${skill?.name || skillId}`,
        "update",
        existing || {
          id: assessmentId,
          employeeId,
          skillId,
          level: 0,
          targetLevel: undefined,
        },
        newAssessment
      );
    } catch (err) {
      set({ error: err instanceof Error ? err.message : "Failed to set target level" });
      await get().refreshAllData();
      throw err;
    }
  },

  getAssessmentsByEmployee: (employeeId) =>
    get().assessments.filter((a) => a.employeeId === employeeId),

  getAssessment: (employeeId, skillId) =>
    get().assessments.find((a) => a.employeeId === employeeId && a.skillId === skillId),

  getHistory: async (employeeId) => db.getAssessmentLogs(employeeId),

  getAllHistory: async () =>
    db.execute("assessment_logs", "getAll") as Promise<AssessmentLogEntry[]>,
});
