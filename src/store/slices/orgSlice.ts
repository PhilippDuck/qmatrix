import { db } from "../../services/indexeddb";
import { recordChange } from "../recordChange";
import type { AppSlice, OrgSlice } from "../types";

export const createOrgSlice: AppSlice<OrgSlice> = (set, get) => ({
  departments: [],
  roles: [],

  addDepartment: async (name) => {
    try {
      const id = await db.addDepartment(name);
      const newDept = { name, id, updatedAt: Date.now() };
      set((state) => ({ departments: [...state.departments, newDept] }));
      await recordChange(get, "department", id, name, "create", null, newDept);
      return id;
    } catch (err) {
      set({ error: err instanceof Error ? err.message : "Failed" });
      throw err;
    }
  },

  updateDepartment: async (id, department) => {
    try {
      const existing = get().departments.find((d) => d.id === id);
      const updatedDept = { ...existing, ...department, id, updatedAt: Date.now() };

      set((state) => ({
        departments: state.departments.map((d) => (d.id === id ? updatedDept : d)),
      }));

      await db.updateDepartment(id, department);
      await recordChange(get, "department", id, department.name, "update", existing, updatedDept);
    } catch (err) {
      set({ error: err instanceof Error ? err.message : "Failed" });
      await get().refreshAllData();
      throw err;
    }
  },

  deleteDepartment: async (id) => {
    try {
      const existing = get().departments.find((d) => d.id === id);

      set((state) => ({
        departments: state.departments.filter((d) => d.id !== id),
      }));

      await db.deleteDepartment(id);
      await recordChange(get, "department", id, existing?.name || id, "delete", existing, null);
    } catch (err) {
      set({ error: err instanceof Error ? err.message : "Failed" });
      await get().refreshAllData();
      throw err;
    }
  },

  addRole: async (role) => {
    try {
      const id = await db.addRole(role);
      const newRole = { ...role, id, updatedAt: Date.now() };

      set((state) => ({ roles: [...state.roles, newRole] }));

      await recordChange(get, "role", id, role.name, "create", null, newRole);
      return id;
    } catch (err) {
      set({ error: err instanceof Error ? err.message : "Failed" });
      throw err;
    }
  },

  updateRole: async (id, role) => {
    try {
      const existing = get().roles.find((r) => r.id === id);
      const updatedRole = { ...existing, ...role, id, updatedAt: Date.now() };

      set((state) => ({
        roles: state.roles.map((r) => (r.id === id ? updatedRole : r)),
      }));

      await db.updateRole(id, role);
      await recordChange(get, "role", id, role.name, "update", existing, updatedRole);
    } catch (err) {
      set({ error: err instanceof Error ? err.message : "Failed" });
      await get().refreshAllData();
      throw err;
    }
  },

  deleteRole: async (id) => {
    try {
      const existing = get().roles.find((r) => r.id === id);

      set((state) => ({
        roles: state.roles.filter((r) => r.id !== id),
      }));

      await db.deleteRole(id);
      await recordChange(get, "role", id, existing?.name || id, "delete", existing, null);
    } catch (err) {
      set({ error: err instanceof Error ? err.message : "Failed" });
      await get().refreshAllData();
      throw err;
    }
  },

  updateSkillsForRole: async (roleId, skillIds) => {
    try {
      await db.updateSkillsForRole(roleId, skillIds);
      await get().refreshAllData();
    } catch (err) {
      set({ error: err instanceof Error ? err.message : "Failed" });
      throw err;
    }
  },
});
