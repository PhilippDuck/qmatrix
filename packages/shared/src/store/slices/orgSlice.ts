import { db } from "../../services/indexeddb";
import type { Department, EmployeeRole } from "../../types";
import { createEntityCrudHandlers, nameLabel } from "../createEntityCrud";
import type { AppSlice, OrgSlice } from "../types";

export const createOrgSlice: AppSlice<OrgSlice> = (set, get) => {
  const departments = createEntityCrudHandlers<
    Department,
    Omit<Department, "id" | "updatedAt">
  >(set, get, {
    entityType: "department",
    listKey: "departments",
    getLabel: nameLabel<Department>(),
    dbAdd: (data) => db.addDepartment(data.name),
    dbUpdate: (id, data) => db.updateDepartment(id, data),
    dbDelete: (id) => db.deleteDepartment(id),
  });

  const roles = createEntityCrudHandlers<EmployeeRole>(set, get, {
    entityType: "role",
    listKey: "roles",
    getLabel: nameLabel<EmployeeRole>(),
    dbAdd: (data) => db.addRole(data),
    dbUpdate: (id, data) => db.updateRole(id, data),
    dbDelete: (id) => db.deleteRole(id),
  });

  return {
    departments: [],
    roles: [],

    addDepartment: async (name) => departments.add({ name }),
    updateDepartment: departments.update,
    deleteDepartment: departments.remove,

    addRole: roles.add,
    updateRole: roles.update,
    deleteRole: roles.remove,

    updateSkillsForRole: async (roleId, skillIds) => {
      try {
        await db.updateSkillsForRole(roleId, skillIds);
        await get().refreshAllData();
      } catch (err) {
        set({ error: err instanceof Error ? err.message : "Failed" });
        throw err;
      }
    },
  };
};
