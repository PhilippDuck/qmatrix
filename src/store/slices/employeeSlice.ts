import { db } from "../../services/indexeddb";
import { recordChange } from "../recordChange";
import type { AppSlice, EmployeeSlice } from "../types";

export const createEmployeeSlice: AppSlice<EmployeeSlice> = (set, get) => ({
  employees: [],

  addEmployee: async (employee) => {
    try {
      const id = await db.addEmployee(employee);
      const newEmployee = { ...employee, id, updatedAt: Date.now() };
      set((state) => ({ employees: [...state.employees, newEmployee] }));
      await recordChange(get, "employee", id, employee.name, "create", null, newEmployee);
    } catch (err) {
      set({ error: err instanceof Error ? err.message : "Failed to add employee" });
      throw err;
    }
  },

  updateEmployee: async (id, employee) => {
    try {
      const existing = get().employees.find((e) => e.id === id);
      const updatedEmployee = { ...existing, ...employee, id, updatedAt: Date.now() };

      set((state) => ({
        employees: state.employees.map((e) => (e.id === id ? updatedEmployee : e)),
      }));

      await db.updateEmployee(id, employee);
      await recordChange(get, "employee", id, employee.name, "update", existing, updatedEmployee);
    } catch (err) {
      set({ error: err instanceof Error ? err.message : "Failed to update employee" });
      await get().refreshAllData();
      throw err;
    }
  },

  deleteEmployee: async (id) => {
    try {
      const state = get();
      const existing = state.employees.find((e) => e.id === id);
      const cascadeAssessments = state.assessments.filter((a) => a.employeeId === id);
      const cascadePlans = state.qualificationPlans.filter((p) => p.employeeId === id);
      const cascadeMeasures = state.qualificationMeasures.filter((m) =>
        cascadePlans.some((p) => p.id === m.planId)
      );
      const _cascade = {
        assessments: cascadeAssessments,
        qualificationPlans: cascadePlans,
        qualificationMeasures: cascadeMeasures,
      };

      set((s) => ({
        employees: s.employees.filter((e) => e.id !== id),
        assessments: s.assessments.filter((a) => a.employeeId !== id),
        qualificationPlans: s.qualificationPlans.filter((p) => p.employeeId !== id),
        qualificationMeasures: s.qualificationMeasures.filter(
          (m) => !cascadePlans.some((p) => p.id === m.planId)
        ),
      }));

      await db.deleteEmployee(id);
      await recordChange(
        get,
        "employee",
        id,
        existing?.name || id,
        "delete",
        { ...existing, _cascade },
        null
      );
    } catch (err) {
      set({ error: err instanceof Error ? err.message : "Failed to delete employee" });
      await get().refreshAllData();
      throw err;
    }
  },
});
