import { describe, it, expect, vi } from "vitest";
import { runLoadTimeMigrations, type MigrationDb } from "./dataMigrations";
import type { Employee, EmployeeRole } from "../types";

function createMockDb(initialRoles: EmployeeRole[]): MigrationDb & {
  roles: EmployeeRole[];
  employees: Map<string, Employee>;
} {
  const state = {
    roles: [...initialRoles],
    employees: new Map<string, Employee>(),
  };

  const db: MigrationDb & typeof state = {
    ...state,
    execute: async () => undefined,
    deleteDepartment: async () => undefined,
    getDepartments: async () => [],
    addDepartment: async (name) => `dept-${name}`,
    getRoles: async () => state.roles,
    addRole: async (role) => {
      const id = `role-new-${role.name}`;
      state.roles.push({ id, name: role.name });
      return id;
    },
    updateEmployee: async (id, employee) => {
      state.employees.set(id, { id, ...employee });
    },
  };
  return db;
}

describe("migrateEmployeeRoles (via runLoadTimeMigrations)", () => {
  it("converts role names to ids and persists", async () => {
    const roles: EmployeeRole[] = [
      { id: "role-dev", name: "Entwickler" },
      { id: "role-lead", name: "Teamleiter" },
    ];
    const db = createMockDb(roles);
    const employees: Employee[] = [
      { id: "e1", name: "Max", roles: ["Entwickler", "Teamleiter"] },
    ];

    const result = await runLoadTimeMigrations(db, {
      employees,
      departments: [],
      roles,
      qualificationPlans: [],
      qualificationMeasures: [],
    });

    expect(result.employees[0].roles).toEqual(["role-dev", "role-lead"]);
    expect(db.employees.get("e1")?.roles).toEqual(["role-dev", "role-lead"]);
  });

  it("leaves already-migrated ids unchanged", async () => {
    const roles: EmployeeRole[] = [{ id: "role-dev", name: "Entwickler" }];
    const db = createMockDb(roles);
    const updateSpy = vi.spyOn(db, "updateEmployee");

    const result = await runLoadTimeMigrations(db, {
      employees: [{ id: "e1", name: "Max", roles: ["role-dev"] }],
      departments: [],
      roles,
      qualificationPlans: [],
      qualificationMeasures: [],
    });

    expect(result.employees[0].roles).toEqual(["role-dev"]);
    // may still update for other reasons; ensure roles stay as ids
    const lastCall = updateSpy.mock.calls.at(-1);
    if (lastCall) {
      expect(lastCall[1].roles).toEqual(["role-dev"]);
    }
  });

  it("creates missing role by name", async () => {
    const db = createMockDb([]);
    const result = await runLoadTimeMigrations(db, {
      employees: [{ id: "e1", name: "Max", roles: ["Neu"] }],
      departments: [],
      roles: [],
      qualificationPlans: [],
      qualificationMeasures: [],
    });

    expect(result.roles.some((r) => r.name === "Neu")).toBe(true);
    expect(result.employees[0].roles?.[0]).toMatch(/^role-new-/);
  });
});
