import type { DbService } from "../../services/indexeddb";
import type { AppCapabilities } from "../../types/capabilities";
import type { Employee } from "../../types";
import { createEntityCrudHandlers, nameLabel } from "../createEntityCrud";
import type { AppSlice, EmployeeSlice } from "../types";

export const createEmployeeSlice =
  (db: DbService, caps: AppCapabilities): AppSlice<EmployeeSlice> =>
  (set, get) => {
  const crud = createEntityCrudHandlers<Employee>(db, caps, set, get, {
    entityType: "employee",
    listKey: "employees",
    getLabel: nameLabel<Employee>(),
    dbAdd: (data) => db.addEmployee(data),
    dbUpdate: (id, data) => db.updateEmployee(id, data),
    dbDelete: (id) => db.deleteEmployee(id),
    errorMessage: "Failed to modify employee",
    prepareDelete: (getState, id, existing) => {
      const state = getState();
      const cascadeAssessments = state.assessments.filter((a) => a.employeeId === id);
      const cascadePlans = state.qualificationPlans.filter((p) => p.employeeId === id);
      const cascadeMeasures = state.qualificationMeasures.filter((m) =>
        cascadePlans.some((p) => p.id === m.planId)
      );
      return {
        partial: {
          employees: state.employees.filter((e) => e.id !== id),
          assessments: state.assessments.filter((a) => a.employeeId !== id),
          qualificationPlans: state.qualificationPlans.filter((p) => p.employeeId !== id),
          qualificationMeasures: state.qualificationMeasures.filter(
            (m) => !cascadePlans.some((p) => p.id === m.planId)
          ),
        },
        previousData: {
          ...existing,
          _cascade: {
            assessments: cascadeAssessments,
            qualificationPlans: cascadePlans,
            qualificationMeasures: cascadeMeasures,
          },
        },
      };
    },
  });

  return {
    employees: [],
    addEmployee: async (employee) => {
      await crud.add(employee);
    },
    updateEmployee: crud.update,
    deleteEmployee: crud.remove,
  };
};
