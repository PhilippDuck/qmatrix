/**
 * Load-time data migrations and runtime status rules.
 * Kept separate from pure "load all" so refreshAllData stays readable.
 */

import type {
  Department,
  Employee,
  QualificationMeasure,
  QualificationPlan,
} from "../types";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Minimal DB surface required for migrations (avoids circular imports with full service). */
export interface MigrationDb {
  execute: (
    storeName: string,
    method: "add" | "put" | "delete" | "get" | "getAll" | "clear",
    data?: unknown
  ) => Promise<unknown>;
  deleteDepartment: (id: string) => Promise<void>;
  getDepartments: () => Promise<Department[]>;
  addDepartment: (name: string) => Promise<string>;
  updateEmployee: (id: string, employee: Omit<Employee, "id" | "updatedAt">) => Promise<void>;
}

export interface MigrationInput {
  employees: Employee[];
  departments: Department[];
  qualificationPlans: QualificationPlan[];
  qualificationMeasures: QualificationMeasure[];
}

export interface MigrationResult {
  employees: Employee[];
  departments: Department[];
  qualificationPlans: QualificationPlan[];
  qualificationMeasures: QualificationMeasure[];
}

/** Legacy draft plans → active (one-time data fix). */
async function migrateDraftPlans(
  db: MigrationDb,
  plans: QualificationPlan[]
): Promise<QualificationPlan[]> {
  return Promise.all(
    plans.map(async (plan) => {
      if ((plan.status as string) === "draft") {
        const updated: QualificationPlan = {
          ...plan,
          status: "active",
          updatedAt: Date.now(),
        };
        try {
          await db.execute("qualificationPlans", "put", updated);
        } catch (e) {
          console.error(e);
        }
        return updated;
      }
      return plan;
    })
  );
}

/** pending measures whose startDate has passed → in_progress. */
async function advanceMeasureStatuses(
  db: MigrationDb,
  measures: QualificationMeasure[],
  now: number
): Promise<QualificationMeasure[]> {
  return Promise.all(
    measures.map(async (m) => {
      if (m.status === "pending" && m.startDate && m.startDate <= now) {
        const updated: QualificationMeasure = {
          ...m,
          status: "in_progress",
          updatedAt: now,
        };
        try {
          await db.execute("qualificationMeasures", "put", updated);
        } catch (e) {
          console.error(e);
        }
        return updated;
      }
      return m;
    })
  );
}

/** Remove departments whose name is a UUID (corrupt legacy rows). */
async function cleanupCorruptedDepartments(
  db: MigrationDb,
  departments: Department[]
): Promise<Department[]> {
  const corrupted = departments.filter((d) => d.name && UUID_RE.test(d.name));
  for (const bad of corrupted) {
    if (bad.id) await db.deleteDepartment(bad.id);
  }
  if (corrupted.length > 0) {
    return db.getDepartments();
  }
  return departments;
}

/**
 * - Migrate employee.department from name → id
 * - Apply deactivation / reactivation by date
 */
async function migrateEmployees(
  db: MigrationDb,
  employees: Employee[],
  departments: Department[],
  now: Date
): Promise<{ employees: Employee[]; departments: Department[] }> {
  let depts = departments;

  const updatedEmps = await Promise.all(
    employees.map(async (emp) => {
      let modified = false;
      let finalEmp = { ...emp };

      if (finalEmp.department && !depts.some((d) => d.id === finalEmp.department)) {
        if (UUID_RE.test(finalEmp.department)) {
          // UUID of a deleted department
          finalEmp.department = undefined;
          modified = true;
        } else {
          let deptId = depts.find((d) => d.name === finalEmp.department)?.id;
          if (!deptId) {
            deptId = await db.addDepartment(finalEmp.department);
            depts = await db.getDepartments();
          }
          finalEmp.department = deptId;
          modified = true;
        }
      }

      if (
        finalEmp.isActive !== false &&
        finalEmp.deactivationDate &&
        new Date(finalEmp.deactivationDate) <= now
      ) {
        finalEmp.isActive = false;
        modified = true;
      }
      if (
        finalEmp.isActive === false &&
        finalEmp.reactivationDate &&
        new Date(finalEmp.reactivationDate) <= now
      ) {
        finalEmp.isActive = true;
        modified = true;
      }

      if (modified && finalEmp.id) {
        try {
          const { id, updatedAt: _updatedAt, ...rest } = finalEmp;
          await db.updateEmployee(id, rest);
        } catch (e) {
          console.error(e);
        }
      }
      return finalEmp;
    })
  );

  return { employees: updatedEmps, departments: depts };
}

/**
 * Run all load-time migrations against freshly loaded data.
 * Mutates the DB where needed and returns the cleaned in-memory snapshot.
 */
export async function runLoadTimeMigrations(
  db: MigrationDb,
  input: MigrationInput
): Promise<MigrationResult> {
  const nowTs = Date.now();
  const now = new Date(nowTs);

  const qualificationPlans = await migrateDraftPlans(db, input.qualificationPlans || []);
  const qualificationMeasures = await advanceMeasureStatuses(
    db,
    input.qualificationMeasures || [],
    nowTs
  );

  let departments = await cleanupCorruptedDepartments(db, input.departments || []);
  const { employees, departments: deptsAfter } = await migrateEmployees(
    db,
    input.employees || [],
    departments,
    now
  );
  departments = deptsAfter;

  return {
    employees,
    departments,
    qualificationPlans,
    qualificationMeasures,
  };
}
