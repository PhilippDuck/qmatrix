import { describe, it, expect } from "vitest";
import type { EmployeeRole } from "../types";
import {
  findRole,
  roleLabels,
  employeeHasRole,
  employeeMatchesRoleFilter,
  toRoleIds,
} from "./roleRefs";

const roles: EmployeeRole[] = [
  { id: "role-1", name: "Entwickler" },
  { id: "role-2", name: "Teamleiter" },
];

describe("roleRefs", () => {
  it("finds by id and by name", () => {
    expect(findRole("role-1", roles)?.name).toBe("Entwickler");
    expect(findRole("Teamleiter", roles)?.id).toBe("role-2");
    expect(findRole("unknown", roles)).toBeUndefined();
  });

  it("roleLabels dual-resolves", () => {
    expect(roleLabels(["role-1", "Teamleiter"], roles)).toEqual([
      "Entwickler",
      "Teamleiter",
    ]);
  });

  it("employeeHasRole matches id or legacy name", () => {
    expect(
      employeeHasRole(["role-1"], { id: "role-1", name: "Entwickler" }, roles)
    ).toBe(true);
    expect(
      employeeHasRole(["Entwickler"], { id: "role-1", name: "Entwickler" }, roles)
    ).toBe(true);
    expect(
      employeeHasRole(["role-2"], { id: "role-1", name: "Entwickler" }, roles)
    ).toBe(false);
  });

  it("employeeMatchesRoleFilter uses filter ids", () => {
    expect(employeeMatchesRoleFilter(["role-1"], ["role-1"], roles)).toBe(true);
    expect(employeeMatchesRoleFilter(["Entwickler"], ["role-1"], roles)).toBe(
      true
    );
    expect(employeeMatchesRoleFilter(["role-2"], ["role-1"], roles)).toBe(
      false
    );
  });

  it("toRoleIds normalizes names to ids", () => {
    expect(toRoleIds(["Entwickler", "role-2"], roles)).toEqual([
      "role-1",
      "role-2",
    ]);
  });
});
