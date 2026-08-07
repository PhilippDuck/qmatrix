/**
 * Employee.roles stores role IDs (K17). Dual-resolve supports legacy name strings
 * during migration and when reading pre-migration ExportData.
 */

import type { EmployeeRole } from "../types";

/** Find role by id or case-insensitive name. */
export function findRole(
  ref: string | undefined | null,
  roles: EmployeeRole[]
): EmployeeRole | undefined {
  if (!ref) return undefined;
  const byId = roles.find((r) => r.id === ref);
  if (byId) return byId;
  const normalized = ref.trim().toLowerCase();
  if (!normalized) return undefined;
  return roles.find(
    (r) => r.name != null && r.name.trim().toLowerCase() === normalized
  );
}

/** Display label for a stored role ref (id preferred, falls back to raw string). */
export function roleLabel(
  ref: string,
  roles: EmployeeRole[]
): string {
  return findRole(ref, roles)?.name ?? ref;
}

export function roleLabels(
  refs: string[] | undefined | null,
  roles: EmployeeRole[]
): string[] {
  if (!refs?.length) return [];
  return refs.map((ref) => roleLabel(ref, roles));
}

/** True if employee.roles (ids and/or legacy names) includes this role. */
export function employeeHasRole(
  empRoles: string[] | undefined | null,
  role: Pick<EmployeeRole, "id" | "name">,
  allRoles: EmployeeRole[]
): boolean {
  if (!empRoles?.length) return false;
  if (role.id && empRoles.includes(role.id)) return true;
  if (role.name && empRoles.includes(role.name)) return true;
  return empRoles.some((ref) => {
    const resolved = findRole(ref, allRoles);
    if (!resolved) return false;
    return (
      (role.id != null && resolved.id === role.id) ||
      (role.name != null && resolved.name === role.name)
    );
  });
}

/**
 * Whether employee matches any of the selected role filter ids
 * (SavedView / matrix filters store role ids).
 */
export function employeeMatchesRoleFilter(
  empRoles: string[] | undefined | null,
  filterRoleIds: string[],
  allRoles: EmployeeRole[]
): boolean {
  if (filterRoleIds.length === 0) return true;
  if (!empRoles?.length) return false;
  return filterRoleIds.some((filterId) => {
    const role = allRoles.find((r) => r.id === filterId);
    if (!role) {
      // filter id might still appear raw on employee
      return empRoles.includes(filterId);
    }
    return employeeHasRole(empRoles, role, allRoles);
  });
}

/**
 * Normalize refs to role IDs. Unresolved names that match no role are omitted
 * (caller may create roles first).
 */
export function toRoleIds(
  refs: string[] | undefined | null,
  roles: EmployeeRole[]
): string[] {
  if (!refs?.length) return [];
  const ids: string[] = [];
  const seen = new Set<string>();
  for (const ref of refs) {
    const role = findRole(ref, roles);
    if (role?.id && !seen.has(role.id)) {
      seen.add(role.id);
      ids.push(role.id);
    }
  }
  return ids;
}
