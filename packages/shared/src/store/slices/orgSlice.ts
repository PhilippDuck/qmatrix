import type { DbService } from "../../services/indexeddb";
import type { AppCapabilities } from "../../types/capabilities";
import { checkCapability } from "../capabilities";
import type { Department, EmployeeRole } from "../../types";
import { createEntityCrudHandlers, nameLabel } from "../createEntityCrud";
import type { AppSlice, OrgSlice } from "../types";

export const createOrgSlice = (db: DbService, caps: AppCapabilities): AppSlice<OrgSlice> => (set, get) => {
  const departments = createEntityCrudHandlers<
    Department,
    Omit<Department, "id" | "updatedAt">
  >(db, caps, set, get, {
    entityType: "department",
    listKey: "departments",
    getLabel: nameLabel<Department>(),
    dbAdd: (data) => db.addDepartment(data.name),
    dbUpdate: (id, data) => db.updateDepartment(id, data),
    dbDelete: (id) => db.deleteDepartment(id),
  });

  const roles = createEntityCrudHandlers<EmployeeRole>(db, caps, set, get, {
    entityType: "role",
    listKey: "roles",
    capabilityKey: "catalogAuthoring",
    catalogEntity: true,
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
      const role = get().roles.find((r) => r.id === roleId);
      const officialOk = checkCapability(
        caps,
        "catalogAuthoring",
        "updateSkillsForRole"
      );
      const blueprintOk =
        caps.catalogBlueprintAuthoring && role?.catalogSource === "blueprint";
      if (!officialOk.ok && !blueprintOk) {
        const reason =
          officialOk.ok === false
            ? officialOk.reason
            : `[${caps.variant}] Offizielle Rolle nicht änderbar`;
        if (import.meta.env.DEV) console.error(reason);
        set({ error: reason });
        throw new Error(reason);
      }
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
