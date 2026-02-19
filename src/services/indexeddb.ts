// IndexedDB Service für Qualifizierungsmatrix
const DB_NAME = "QualificationMatrixDB";
const DB_VERSION = 12;

export interface Employee {
  id?: string;
  name: string;
  department?: string;
  roles?: string[];  // Multiple roles per employee
  isActive?: boolean; // Default true if undefined
  deactivationDate?: string; // ISO Date String
  reactivationDate?: string; // ISO Date String
  updatedAt?: number;
}

export interface Category {
  id?: string;
  name: string;
  description?: string;
  updatedAt?: number;
}

export interface SubCategory {
  id?: string;
  categoryId: string; // The root visual category
  parentSubCategoryId?: string; // For nesting, if present
  name: string;
  description?: string;
  updatedAt?: number;
}

export interface Skill {
  id?: string;
  subCategoryId: string;
  name: string;
  description?: string;
  departmentId?: string;
  requiredByRoleIds?: string[];
  updatedAt?: number;
}

export interface Assessment {
  id?: string;
  employeeId: string;
  skillId: string;
  level: -1 | 0 | 25 | 50 | 75 | 100;
  targetLevel?: number; // Individuelles Soll pro Mitarbeiter/Skill
  updatedAt?: number;
}

export interface AssessmentLogEntry {
  id?: string;
  employeeId: string;
  skillId: string;
  previousLevel: number;
  newLevel: number;
  timestamp: number;
  note?: string;
}

export interface Department {
  id?: string;
  name: string;
  updatedAt?: number;
}

export interface EmployeeRole {
  id?: string;
  name: string;
  inheritsFromId?: string;
  icon?: string; // Tabler icon name, e.g. "IconUser"
  requiredSkills?: { skillId: string; level: number }[];
  updatedAt?: number;
}

export interface AppSettings {
  id: string; // usually 'default'
  projectTitle: string;
  updatedAt: number;
}

export interface QualificationPlan {
  id?: string;
  employeeId: string;
  targetRoleId: string;      // Zielrolle (Standard: aktuelle Rolle des MA)
  status: 'active' | 'completed' | 'archived';
  createdAt: number;
  updatedAt: number;
  notes?: string;
}

export interface QualificationMeasure {
  id?: string;
  planId: string;            // Referenz zum QualificationPlan
  skillId: string;           // Welcher Skill wird trainiert
  currentLevel: number;      // Ist-Level bei Erstellung (Snapshot)
  startLevel: number;        // [NEW] Geplanter Start-Level der Maßnahme (für Ketten)
  targetLevel: number;       // Soll-Level (aus Rolle)
  type: 'internal' | 'external' | 'self_learning';

  // Für interne Schulung
  mentorId?: string;         // MA mit 100% im Skill

  // Für externe Schulung
  externalProvider?: string;
  externalCourse?: string;
  estimatedCost?: number;

  // Timeline
  startDate?: number;
  targetDate?: number;
  completedDate?: number;

  status: 'pending' | 'in_progress' | 'completed' | 'cancelled';
  notes?: string;
  updatedAt?: number;
}

export interface SavedView {
  id?: string;
  name: string;
  config: {
    filters: {
      departments: string[];
      roles: string[];
      categories: string[];
    };
    groupingMode: 'none' | 'department' | 'role';
    settings: {
      showMaxValues?: boolean; // DEPRECATED – kept for backward compatibility
      metricMode?: 'avg' | 'max' | 'fulfillment';
      hideEmployees: boolean;
      hideNaColumns?: boolean; // Optional for backward compatibility
      showInactive?: boolean; // [NEW] Optional for backward compatibility
    };
    sort: {
      employee: 'asc' | 'desc' | null;
      skill: 'asc' | 'desc' | null;
    };
    collapsedStates: Record<string, boolean>;
  };
  updatedAt?: number;
}

// Change History Types
export type EntityType =
  | 'employee' | 'skill' | 'category' | 'subcategory'
  | 'department' | 'role' | 'qualificationPlan'
  | 'qualificationMeasure' | 'assessment' | 'savedView';

export type ChangeAction = 'create' | 'update' | 'delete';

export interface ChangeHistoryEntry {
  id?: string;
  entityType: EntityType;
  entityId: string;
  entityLabel: string;        // Lesbare Bezeichnung für UI
  action: ChangeAction;
  previousData: any | null;   // Für Undo bei update/delete
  newData: any | null;        // Für Referenz bei create/update
  timestamp: number;
  undone: boolean;
}

export interface ExportData {
  employees: Employee[];
  categories: Category[];
  subcategories: SubCategory[];
  skills: Skill[];
  assessments: Assessment[];
  departments: Department[];
  roles: EmployeeRole[];
  settings: AppSettings;
  history: AssessmentLogEntry[];
  qualificationPlans?: QualificationPlan[];
  qualificationMeasures?: QualificationMeasure[];
  savedViews?: SavedView[];
  changeHistory?: ChangeHistoryEntry[];
}

export interface MergeReport {
  added: number;
  updated: number;
  skipped: number;
  conflicts: number;
}

export interface MergeItemDiff {
  id: string;
  storeName: string;
  label: string;
  type: 'new' | 'update' | 'conflict' | 'identical';
  localTimestamp?: number;
  remoteTimestamp?: number;
  localData?: any;
  remoteData?: any;
}

export interface MergeDiff {
  items: MergeItemDiff[];
}

class IndexedDBService {
  private db: IDBDatabase | null = null;
  private initPromise: Promise<void> | null = null;

  async init(): Promise<void> {
    if (this.db) return Promise.resolve();
    if (this.initPromise) return this.initPromise;

    this.initPromise = new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = () => {
        this.initPromise = null;
        reject(request.error);
      };
      request.onsuccess = () => {
        this.db = request.result;
        // Don't clear initPromise here immediately to avoid race conditions if needed, 
        // but clearing it in finally logic or keeping it resolved is fine.
        // Actually simplest is just resolve.
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;

        // Employees Store
        if (!db.objectStoreNames.contains("employees")) {
          const employeeStore = db.createObjectStore("employees", {
            keyPath: "id",
          });
          employeeStore.createIndex("name", "name", { unique: false });
          employeeStore.createIndex("role", "role", { unique: false });
        } else {
          // Migration for existing store
          const employeeStore = (event.target as IDBOpenDBRequest).transaction!.objectStore("employees");
          if (!employeeStore.indexNames.contains("role")) {
            employeeStore.createIndex("role", "role", { unique: false });
          }
        }

        // Categories Store
        if (!db.objectStoreNames.contains("categories")) {
          const categoryStore = db.createObjectStore("categories", {
            keyPath: "id",
          });
          categoryStore.createIndex("name", "name", { unique: false });
        }

        // SubCategories Store
        if (!db.objectStoreNames.contains("subcategories")) {
          const subCategoryStore = db.createObjectStore("subcategories", {
            keyPath: "id",
          });
          subCategoryStore.createIndex("categoryId", "categoryId", {
            unique: false,
          });
        }

        // Skills Store
        if (!db.objectStoreNames.contains("skills")) {
          const skillStore = db.createObjectStore("skills", { keyPath: "id" });
          skillStore.createIndex("subCategoryId", "subCategoryId", {
            unique: false,
          });
        }

        // Assessments Store
        if (!db.objectStoreNames.contains("assessments")) {
          const assessmentStore = db.createObjectStore("assessments", {
            keyPath: "id",
          });
          assessmentStore.createIndex("employeeId", "employeeId", {
            unique: false,
          });
          assessmentStore.createIndex("skillId", "skillId", { unique: false });
          assessmentStore.createIndex("employeeSkill", ["employeeId", "skillId"], { unique: true });
        }

        // Assessment Logs Store
        if (!db.objectStoreNames.contains("assessment_logs")) {
          const logStore = db.createObjectStore("assessment_logs", {
            keyPath: "id",
          });
          logStore.createIndex("employeeId", "employeeId", { unique: false });
          logStore.createIndex("skillId", "skillId", { unique: false });
        }

        // Departments Store
        if (!db.objectStoreNames.contains("departments")) {
          const deptStore = db.createObjectStore("departments", {
            keyPath: "id",
          });
          deptStore.createIndex("name", "name", { unique: true });
        }

        // Roles Store
        if (!db.objectStoreNames.contains("roles")) {
          const roleStore = db.createObjectStore("roles", {
            keyPath: "id",
          });
          roleStore.createIndex("name", "name", { unique: true });
        }

        // Migration to v5: Skills indices
        if (event.oldVersion < 5) {
          const skillStore = (event.target as IDBOpenDBRequest).transaction!.objectStore("skills");
          if (!skillStore.indexNames.contains("departmentId")) {
            skillStore.createIndex("departmentId", "departmentId", { unique: false });
          }
        }

        // Migration to v7: Add updatedAt to all records (including logs)
        if (event.oldVersion < 7) {
          const stores = ["employees", "categories", "subcategories", "skills", "assessments", "departments", "roles", "assessment_logs"];
          const transaction = (event.target as IDBOpenDBRequest).transaction!;
          stores.forEach(storeName => {
            if (db.objectStoreNames.contains(storeName)) {
              const store = transaction.objectStore(storeName);
              const cursorRequest = store.openCursor();
              cursorRequest.onsuccess = (e: any) => {
                const cursor = e.target.result;
                if (cursor) {
                  const data = cursor.value;
                  // For logs, use timestamp as fallback for updatedAt
                  const fallback = data.timestamp || Date.now();
                  if (!data.updatedAt) {
                    data.updatedAt = fallback;
                    cursor.update(data);
                  }
                  cursor.continue();
                }
              };
            }
          });
        }
        // Settings Store (v8)
        if (!db.objectStoreNames.contains("settings")) {
          db.createObjectStore("settings", { keyPath: "id" });
        }

        // Qualification Plans Store (v10)
        if (!db.objectStoreNames.contains("qualificationPlans")) {
          const planStore = db.createObjectStore("qualificationPlans", { keyPath: "id" });
          planStore.createIndex("employeeId", "employeeId", { unique: false });
          planStore.createIndex("status", "status", { unique: false });
        }

        // Qualification Measures Store (v10)
        if (!db.objectStoreNames.contains("qualificationMeasures")) {
          const measureStore = db.createObjectStore("qualificationMeasures", { keyPath: "id" });
          measureStore.createIndex("planId", "planId", { unique: false });
          measureStore.createIndex("skillId", "skillId", { unique: false });
          measureStore.createIndex("status", "status", { unique: false });
        }

        // Saved Views Store (v11)
        if (!db.objectStoreNames.contains("savedViews")) {
          const viewStore = db.createObjectStore("savedViews", { keyPath: "id" });
          viewStore.createIndex("name", "name", { unique: false });
        }

        // Change History Store (v12)
        if (!db.objectStoreNames.contains("changeHistory")) {
          const historyStore = db.createObjectStore("changeHistory", { keyPath: "id" });
          historyStore.createIndex("timestamp", "timestamp", { unique: false });
          historyStore.createIndex("entityType", "entityType", { unique: false });
        }
      };
    });

    return this.initPromise;
  }

  // Employees
  async addEmployee(employee: Omit<Employee, "id" | "updatedAt">): Promise<string> {
    const id = crypto.randomUUID();
    const data = { ...employee, id, updatedAt: Date.now() };
    await this.execute("employees", "add", data);
    return id;
  }

  async getEmployees(): Promise<Employee[]> {
    return this.execute("employees", "getAll");
  }

  async updateEmployee(
    id: string,
    employee: Omit<Employee, "id" | "updatedAt">,
  ): Promise<void> {
    const data = { ...employee, id, updatedAt: Date.now() };
    await this.execute("employees", "put", data);
  }

  async deleteEmployee(id: string): Promise<void> {
    // First, delete all assessments for this employee
    const assessments = await this.getAssessmentsByEmployee(id);
    for (const assessment of assessments) {
      await this.deleteAssessment(id, assessment.skillId);
    }

    // Delete all history (assessment logs) for this employee
    const logs = await this.getAssessmentLogs(id);
    for (const log of logs) {
      if (log.id) {
        await this.execute("assessment_logs", "delete", log.id);
      }
    }

    // Delete all qualification plans for this employee (cascades to measures)
    const plans = await this.getQualificationPlansForEmployee(id);
    for (const plan of plans) {
      if (plan.id) {
        await this.deleteQualificationPlan(plan.id);
      }
    }

    // Then delete the employee
    await this.execute("employees", "delete", id);
  }

  // Categories
  async addCategory(category: Omit<Category, "id" | "updatedAt">): Promise<string> {
    const id = crypto.randomUUID();
    const data = { ...category, id, updatedAt: Date.now() };
    await this.execute("categories", "add", data);
    return id;
  }

  async getCategories(): Promise<Category[]> {
    return this.execute("categories", "getAll");
  }

  async updateCategory(
    id: string,
    category: Omit<Category, "id" | "updatedAt">,
  ): Promise<void> {
    const data = { ...category, id, updatedAt: Date.now() };
    await this.execute("categories", "put", data);
  }

  async deleteCategory(id: string): Promise<void> {
    // First, get all subcategories for this category
    const subCats = await this.getSubCategoriesByCategory(id);

    // Delete all skills in these subcategories
    for (const subCat of subCats) {
      const skillsToDelete = await this.getSkillsBySubCategory(subCat.id!);
      for (const skill of skillsToDelete) {
        // Delete assessments for this skill first
        const assessments = await this.getAssessmentsBySkill(skill.id!);
        for (const assessment of assessments) {
          await this.deleteAssessment(assessment.employeeId, skill.id!);
        }
        // Delete the skill
        await this.execute("skills", "delete", skill.id);
      }
      // Delete the subcategory
      await this.execute("subcategories", "delete", subCat.id);
    }

    // Finally, delete the category
    await this.execute("categories", "delete", id);
  }

  // SubCategories
  async addSubCategory(subCategory: Omit<SubCategory, "id" | "updatedAt">): Promise<string> {
    const id = crypto.randomUUID();
    const data = { ...subCategory, id, updatedAt: Date.now() };
    await this.execute("subcategories", "add", data);
    return id;
  }

  async getSubCategories(): Promise<SubCategory[]> {
    return this.execute("subcategories", "getAll");
  }

  async getSubCategoriesByCategory(categoryId: string): Promise<SubCategory[]> {
    return this.executeIndex(
      "subcategories",
      "categoryId",
      "getAll",
      categoryId,
    );
  }

  async updateSubCategory(
    id: string,
    subCategory: Omit<SubCategory, "id" | "updatedAt">,
  ): Promise<void> {
    const data = { ...subCategory, id, updatedAt: Date.now() };
    await this.execute("subcategories", "put", data);
  }

  async deleteSubCategory(id: string): Promise<void> {
    // First, find all child subcategories
    const allSubs = await this.getSubCategories();
    const children = allSubs.filter(s => s.parentSubCategoryId === id);

    // Recursively delete children first
    for (const child of children) {
      if (child.id) await this.deleteSubCategory(child.id);
    }

    // First, get all skills in this subcategory
    const skillsToDelete = await this.getSkillsBySubCategory(id);

    // Delete assessments and skills
    for (const skill of skillsToDelete) {
      const assessments = await this.getAssessmentsBySkill(skill.id!);
      for (const assessment of assessments) {
        await this.deleteAssessment(assessment.employeeId, skill.id!);
      }
      await this.execute("skills", "delete", skill.id);
    }

    // Finally, delete the subcategory
    await this.execute("subcategories", "delete", id);
  }

  // Skills
  async addSkill(skill: Omit<Skill, "id" | "updatedAt">): Promise<string> {
    const id = crypto.randomUUID();
    const data = { ...skill, id, updatedAt: Date.now() };
    await this.execute("skills", "add", data);
    return id;
  }

  async getSkills(): Promise<Skill[]> {
    return this.execute("skills", "getAll");
  }

  async getSkillsBySubCategory(subCategoryId: string): Promise<Skill[]> {
    return this.executeIndex(
      "skills",
      "subCategoryId",
      "getAll",
      subCategoryId,
    );
  }

  async updateSkill(id: string, skill: Omit<Skill, "id" | "updatedAt">): Promise<void> {
    const data = { ...skill, id, updatedAt: Date.now() };
    await this.execute("skills", "put", data);
  }

  async updateSkillsForRole(roleId: string, skillIds: string[]): Promise<void> {
    // Check initialization here too since we use this.db directly
    if (!this.db) await this.init();
    if (!this.db) throw new Error("Database not initialized");

    const transaction = this.db.transaction("skills", "readwrite");
    const store = transaction.objectStore("skills");
    const request = store.getAll();

    return new Promise((resolve, reject) => {
      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        const allSkills: Skill[] = request.result;
        const skillIdsSet = new Set(skillIds);

        allSkills.forEach((skill) => {
          if (!skill.id) return;

          const currentRoles = new Set(skill.requiredByRoleIds || []);
          let modified = false;

          if (skillIdsSet.has(skill.id)) {
            // Should have role
            if (!currentRoles.has(roleId)) {
              currentRoles.add(roleId);
              modified = true;
            }
          } else {
            // Should NOT have role
            if (currentRoles.has(roleId)) {
              currentRoles.delete(roleId);
              modified = true;
            }
          }

          if (modified) {
            const updatedSkill = { ...skill, requiredByRoleIds: Array.from(currentRoles), updatedAt: Date.now() };
            store.put(updatedSkill);
          }
        });
      };

      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
    });
  }

  async deleteSkill(id: string): Promise<void> {
    // First, delete all assessments for this skill
    const assessments = await this.getAssessmentsBySkill(id);
    for (const assessment of assessments) {
      await this.deleteAssessment(assessment.employeeId, id);
    }

    // Then delete the skill
    await this.execute("skills", "delete", id);
  }

  // Assessments
  async setAssessment(
    employeeId: string,
    skillId: string,
    level: -1 | 0 | 25 | 50 | 75 | 100,
  ): Promise<void> {
    const id = `${employeeId}-${skillId}`;
    // Preserve existing targetLevel if present
    const existing = await this.getAssessment(employeeId, skillId);

    // Only log if level actually changed
    if (existing && existing.level !== level) {
      await this.addAssessmentLog({
        employeeId,
        skillId,
        previousLevel: existing.level,
        newLevel: level,
        timestamp: Date.now(),
      });
    } else if (!existing && level > 0) {
      // Log initial assessment if > 0
      await this.addAssessmentLog({
        employeeId,
        skillId,
        previousLevel: 0,
        newLevel: level,
        timestamp: Date.now(),
      });
    }

    const data: Assessment = {
      ...(existing || {}),
      id,
      employeeId,
      skillId,
      level,
      updatedAt: Date.now()
    };
    await this.execute("assessments", "put", data);
  }

  // Assessment Logs
  async addAssessmentLog(entry: AssessmentLogEntry): Promise<string> {
    const id = crypto.randomUUID();
    const data = { ...entry, id, updatedAt: entry.timestamp || Date.now() };
    await this.execute("assessment_logs", "add", data);
    return id;
  }


  async getAssessmentLogs(employeeId: string): Promise<AssessmentLogEntry[]> {
    return this.executeIndex("assessment_logs", "employeeId", "getAll", employeeId);
  }

  async getAllAssessmentLogs(): Promise<AssessmentLogEntry[]> {
    return this.execute("assessment_logs", "getAll");
  }

  async deleteAssessment(employeeId: string, skillId: string): Promise<void> {
    const id = `${employeeId}-${skillId}`;
    await this.execute("assessments", "delete", id);
  }

  // Departments
  async addDepartment(name: string): Promise<string> {
    const id = crypto.randomUUID();
    const data = { name, id, updatedAt: Date.now() };
    await this.execute("departments", "add", data);
    return id;
  }

  async getDepartments(): Promise<Department[]> {
    return this.execute("departments", "getAll");
  }

  async updateDepartment(id: string, department: Omit<Department, "id" | "updatedAt">): Promise<void> {
    const data = { ...department, id, updatedAt: Date.now() };
    await this.execute("departments", "put", data);
  }

  async deleteDepartment(id: string): Promise<void> {
    await this.execute("departments", "delete", id);
  }

  // Roles
  async addRole(role: Omit<EmployeeRole, "id" | "updatedAt">): Promise<string> {
    const id = crypto.randomUUID();
    const data = { ...role, id, updatedAt: Date.now() };
    await this.execute("roles", "add", data);
    return id;
  }

  async getRoles(): Promise<EmployeeRole[]> {
    return this.execute("roles", "getAll");
  }

  async updateRole(id: string, role: Omit<EmployeeRole, "id" | "updatedAt">): Promise<void> {
    const data = { ...role, id, updatedAt: Date.now() };
    await this.execute("roles", "put", data);
  }

  async deleteRole(id: string): Promise<void> {
    await this.execute("roles", "delete", id);
  }

  // Settings
  async getSettings(): Promise<AppSettings | undefined> {
    return this.execute("settings", "get", "default");
  }

  async saveSettings(settings: Omit<AppSettings, "id" | "updatedAt">): Promise<void> {
    const data = { ...settings, id: "default", updatedAt: Date.now() };
    await this.execute("settings", "put", data);
  }

  // Qualification Plans
  async addQualificationPlan(plan: Omit<QualificationPlan, "id" | "createdAt" | "updatedAt">): Promise<string> {
    const id = crypto.randomUUID();
    const now = Date.now();
    const data = { ...plan, id, createdAt: now, updatedAt: now };
    await this.execute("qualificationPlans", "add", data);
    return id;
  }

  async getQualificationPlans(): Promise<QualificationPlan[]> {
    return this.execute("qualificationPlans", "getAll");
  }

  async getQualificationPlansForEmployee(employeeId: string): Promise<QualificationPlan[]> {
    return this.executeIndex("qualificationPlans", "employeeId", "getAll", employeeId);
  }

  async getQualificationPlan(id: string): Promise<QualificationPlan | undefined> {
    return this.execute("qualificationPlans", "get", id);
  }

  async updateQualificationPlan(id: string, plan: Partial<Omit<QualificationPlan, "id" | "createdAt">>): Promise<void> {
    const existing = await this.getQualificationPlan(id);
    if (!existing) throw new Error("Plan not found");
    const data = { ...existing, ...plan, id, updatedAt: Date.now() };
    await this.execute("qualificationPlans", "put", data);
  }

  async deleteQualificationPlan(id: string): Promise<void> {
    // First delete all measures for this plan
    const measures = await this.getQualificationMeasuresForPlan(id);
    for (const measure of measures) {
      await this.execute("qualificationMeasures", "delete", measure.id);
    }
    // Then delete the plan
    await this.execute("qualificationPlans", "delete", id);
  }

  // Qualification Measures
  async addQualificationMeasure(measure: Omit<QualificationMeasure, "id" | "updatedAt">): Promise<string> {
    const id = crypto.randomUUID();
    const data = { ...measure, id, updatedAt: Date.now() };
    await this.execute("qualificationMeasures", "add", data);
    return id;
  }

  async getQualificationMeasures(): Promise<QualificationMeasure[]> {
    return this.execute("qualificationMeasures", "getAll");
  }

  async getQualificationMeasuresForPlan(planId: string): Promise<QualificationMeasure[]> {
    return this.executeIndex("qualificationMeasures", "planId", "getAll", planId);
  }

  async getQualificationMeasure(id: string): Promise<QualificationMeasure | undefined> {
    return this.execute("qualificationMeasures", "get", id);
  }

  async updateQualificationMeasure(id: string, measure: Partial<Omit<QualificationMeasure, "id">>): Promise<void> {
    const existing = await this.getQualificationMeasure(id);
    if (!existing) throw new Error("Measure not found");
    const data = { ...existing, ...measure, id, updatedAt: Date.now() };
    await this.execute("qualificationMeasures", "put", data);
  }

  async deleteQualificationMeasure(id: string): Promise<void> {
    await this.execute("qualificationMeasures", "delete", id);
  }

  // Saved Views
  async addSavedView(view: Omit<SavedView, "id" | "updatedAt">): Promise<string> {
    const id = crypto.randomUUID();
    const data = { ...view, id, updatedAt: Date.now() };
    await this.execute("savedViews", "add", data);
    return id;
  }

  async getSavedViews(): Promise<SavedView[]> {
    return this.execute("savedViews", "getAll");
  }

  async updateSavedView(id: string, view: Omit<SavedView, "id" | "updatedAt">): Promise<void> {
    const data = { ...view, id, updatedAt: Date.now() };
    await this.execute("savedViews", "put", data);
  }

  async deleteSavedView(id: string): Promise<void> {
    await this.execute("savedViews", "delete", id);
  }

  // Change History Methods
  async addChangeHistoryEntry(entry: Omit<ChangeHistoryEntry, "id">): Promise<string> {
    const id = crypto.randomUUID();
    const data = { ...entry, id };
    await this.execute("changeHistory", "add", data);
    return id;
  }

  async getRecentChangeHistory(limit: number = 20): Promise<ChangeHistoryEntry[]> {
    if (!this.db) await this.init();
    if (!this.db) throw new Error("Database not initialized");

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction("changeHistory", "readonly");
      const store = transaction.objectStore("changeHistory");
      const index = store.index("timestamp");
      const request = index.openCursor(null, "prev"); // Newest first
      const results: ChangeHistoryEntry[] = [];

      request.onerror = () => reject(request.error);
      request.onsuccess = (event: any) => {
        const cursor = event.target.result;
        if (cursor && results.length < limit) {
          results.push(cursor.value);
          cursor.continue();
        } else {
          resolve(results);
        }
      };
    });
  }

  async getChangeHistoryById(id: string): Promise<ChangeHistoryEntry | undefined> {
    return this.execute("changeHistory", "get", id);
  }

  async markHistoryEntryUndone(id: string): Promise<void> {
    const entry = await this.getChangeHistoryById(id);
    if (!entry) throw new Error("History entry not found");
    const updated = { ...entry, undone: true };
    await this.execute("changeHistory", "put", updated);
  }

  async setTargetLevel(
    employeeId: string,
    skillId: string,
    targetLevel: number | undefined,
  ): Promise<void> {
    const id = `${employeeId}-${skillId}`;
    // Get existing or create new
    const existing = await this.getAssessment(employeeId, skillId);
    const data: Assessment = {
      ...(existing || {}),
      id,
      employeeId,
      skillId,
      level: existing?.level ?? 0,
      targetLevel,
      updatedAt: Date.now()
    };
    await this.execute("assessments", "put", data);
  }

  async getAssessmentsByEmployee(employeeId: string): Promise<Assessment[]> {
    return this.executeIndex("assessments", "employeeId", "getAll", employeeId);
  }

  async getAssessmentsBySkill(skillId: string): Promise<Assessment[]> {
    return this.executeIndex("assessments", "skillId", "getAll", skillId);
  }

  async getAssessment(
    employeeId: string,
    skillId: string,
  ): Promise<Assessment | undefined> {
    if (!this.db) await this.init();
    if (!this.db) throw new Error("Database not initialized");

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction("assessments", "readonly");
      const store = transaction.objectStore("assessments");
      const index = store.index("employeeSkill");
      const request = index.get([employeeId, skillId]);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result);
    });
  }

  async getById(storeName: string, id: string): Promise<any> {
    return this.execute(storeName, "get", id);
  }

  // Helper methods
  async execute(
    storeName: string,
    method: "add" | "put" | "delete" | "get" | "getAll" | "clear",
    data?: any,
  ): Promise<any> {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      if (!this.db) return reject(new Error("Database not initialized"));

      const transaction = this.db.transaction(
        storeName,
        method === "clear"
          ? "readwrite"
          : method === "add" || method === "put" || method === "delete"
            ? "readwrite"
            : "readonly",
      );
      const store = transaction.objectStore(storeName);
      let request: IDBRequest;

      if (method === "add") {
        request = store.add(data);
      } else if (method === "put") {
        request = store.put(data);
      } else if (method === "delete") {
        request = store.delete(data);
      } else if (method === "get") {
        request = store.get(data);
      } else if (method === "getAll") {
        request = store.getAll();
      } else if (method === "clear") {
        request = store.clear();
      } else {
        return reject(new Error("Unknown method"));
      }

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result);
    });
  }

  private executeIndex(
    storeName: string,
    indexName: string,
    method: "get" | "getAll",
    data?: any,
  ): Promise<any> {
    return (async () => {
      if (!this.db) await this.init();

      return new Promise((resolve, reject) => {
        if (!this.db) return reject(new Error("Database not initialized"));

        const transaction = this.db.transaction(storeName, "readonly");
        const store = transaction.objectStore(storeName);
        const index = store.index(indexName);
        let request: IDBRequest;

        if (method === "get") {
          request = index.get(data);
        } else {
          request = index.getAll(data);
        }

        request.onerror = () => reject(request.error);
        request.onsuccess = () => resolve(request.result);
      });
    })();
  }

  // Export all data as JSON
  async exportData(): Promise<ExportData> {
    return {
      employees: await this.getEmployees(),
      categories: await this.getCategories(),
      subcategories: await this.getSubCategories(),
      skills: await this.getSkills(),
      assessments: await this.execute("assessments", "getAll"),
      departments: await this.getDepartments(),
      roles: await this.getRoles(),
      settings: await this.getSettings() || { id: 'default', projectTitle: '', updatedAt: Date.now() },
      history: await this.execute("assessment_logs", "getAll"),
      qualificationPlans: await this.getQualificationPlans(),
      qualificationMeasures: await this.getQualificationMeasures(),
      savedViews: await this.getSavedViews(),
      changeHistory: await this.execute("changeHistory", "getAll")
    };
  }

  async clearAllData(): Promise<void> {
    if (!this.db) return;
    const stores = ["employees", "categories", "subcategories", "skills", "assessments", "departments", "roles", "assessment_logs", "settings", "qualificationPlans", "qualificationMeasures", "savedViews", "changeHistory"];
    const transaction = this.db.transaction(stores, "readwrite");
    for (const storeName of stores) {
      const store = transaction.objectStore(storeName);
      store.clear();
    }
    return new Promise((resolve, reject) => {
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
    });
  }

  // Import data from JSON (Destructive)
  async importData(data: ExportData): Promise<void> {
    // Clear all stores
    if (!this.db) return;

    const stores = ["employees", "categories", "subcategories", "skills", "assessments", "departments", "roles", "assessment_logs", "settings", "qualificationPlans", "qualificationMeasures", "savedViews", "changeHistory"];
    const transaction = this.db.transaction(stores, "readwrite");

    for (const storeName of stores) {
      await new Promise<void>((resolve, reject) => {
        const store = transaction.objectStore(storeName);
        const request = store.clear();
        request.onerror = () => reject(request.error);
        request.onsuccess = () => resolve();
      });
    }

    // Import data
    const mappings: Record<string, any[]> = {
      employees: data.employees,
      categories: data.categories,
      subcategories: data.subcategories,
      skills: data.skills,
      assessments: data.assessments,
      departments: data.departments,
      roles: data.roles,
      settings: data.settings ? [data.settings] : [],
      assessment_logs: data.history,
      qualificationPlans: data.qualificationPlans || [],
      qualificationMeasures: data.qualificationMeasures || [],
      savedViews: data.savedViews || [],
      changeHistory: data.changeHistory || []
    };

    for (const [storeName, items] of Object.entries(mappings)) {
      if (items) {
        for (const item of items) {
          // Import data exactly as-is to preserve fingerprint stability
          // Don't add timestamps if they don't exist - preserve original state
          await this.execute(storeName, "add", item);
        }
      }
    }
  }

  // Merge tool (Non-destructive, based on updatedAt)
  async mergeData(data: ExportData): Promise<MergeReport> {
    const report: MergeReport = { added: 0, updated: 0, skipped: 0, conflicts: 0 };

    const mergeStore = async (storeName: string, items: any[]) => {
      if (!items) return;
      for (const item of items) {
        if (!item.id) continue;
        const local = await this.getById(storeName, item.id);

        const itemUpdatedAt = item.updatedAt || item.timestamp;
        const localUpdatedAt = local?.updatedAt || local?.timestamp;

        if (!local) {
          const dataToSave = { ...item, updatedAt: itemUpdatedAt || Date.now() };
          await this.execute(storeName, "add", dataToSave);
          report.added++;
        } else if (itemUpdatedAt && (!localUpdatedAt || itemUpdatedAt > localUpdatedAt)) {
          await this.execute(storeName, "put", item);
          report.updated++;
        } else {
          report.skipped++;
          if (itemUpdatedAt && localUpdatedAt && itemUpdatedAt < localUpdatedAt) {
            report.conflicts++;
          }
        }
      }
    };

    await mergeStore("departments", data.departments);
    await mergeStore("roles", data.roles);
    await mergeStore("categories", data.categories);
    await mergeStore("subcategories", data.subcategories);
    await mergeStore("skills", data.skills);
    await mergeStore("employees", data.employees);
    await mergeStore("assessments", data.assessments);
    await mergeStore("assessment_logs", data.history);
    if (data.settings) await mergeStore("settings", [data.settings]);
    if (data.qualificationPlans) await mergeStore("qualificationPlans", data.qualificationPlans);
    if (data.qualificationMeasures) await mergeStore("qualificationMeasures", data.qualificationMeasures);
    if (data.savedViews) await mergeStore("savedViews", data.savedViews);
    if (data.changeHistory) await mergeStore("changeHistory", data.changeHistory);

    return report;
  }

  // Interactive Merge: Diff
  async diffData(data: ExportData): Promise<MergeDiff> {
    const diff: MergeDiff = { items: [] };

    const stores = [
      { name: "departments", property: "departments", label: "Abteilung" },
      { name: "roles", property: "roles", label: "Rolle" },
      { name: "categories", property: "categories", label: "Kategorie" },
      { name: "subcategories", property: "subcategories", label: "Unterkategorie" },
      { name: "skills", property: "skills", label: "Skill" },
      { name: "employees", property: "employees", label: "Mitarbeiter" },
      { name: "assessments", property: "assessments", label: "Bewertung" },
      { name: "assessment_logs", property: "history", label: "Historie" },
      { name: "settings", property: "settings", label: "Einstellungen" },
      { name: "qualificationPlans", property: "qualificationPlans", label: "Qualifizierungsplan" },
      { name: "qualificationMeasures", property: "qualificationMeasures", label: "Qualifizierungsmaßnahme" },
      { name: "savedViews", property: "savedViews", label: "Gespeicherte Ansicht" },
      { name: "changeHistory", property: "changeHistory", label: "Änderungshistorie" }
    ];

    for (const store of stores) {
      let items = (data as any)[store.property];
      if (!items) continue;

      // Handle single object (settings) by wrapping in array
      if (!Array.isArray(items)) {
        items = [items];
      }

      for (const item of items) {
        if (!item.id) continue;
        const local = await this.getById(store.name, item.id);

        let label = item.name || item.id;
        if (store.name === "assessments") {
          label = `Bewertung ${item.id}`;
        } else if (store.name === "assessment_logs") {
          label = `Log ${new Date(item.timestamp).toLocaleString("de-DE")}`;
        } else if (store.name === "settings") {
          label = `Projekttitel: "${(item as any).projectTitle}"`;
        } else if (store.name === "qualificationPlans") {
          const plan = item as QualificationPlan;
          label = `Plan ${plan.employeeId?.substring(0, 8)}... (${plan.status})`;
        } else if (store.name === "qualificationMeasures") {
          const measure = item as QualificationMeasure;
          label = `Maßnahme ${measure.skillId?.substring(0, 8)}... (${measure.type})`;
        } else if (store.name === "changeHistory") {
          const change = item as ChangeHistoryEntry;
          label = `${change.entityLabel} (${change.action}, ${new Date(change.timestamp).toLocaleString("de-DE")})`;
        }

        const itemUpdatedAt = item.updatedAt || item.timestamp;
        const localUpdatedAt = local?.updatedAt || local?.timestamp;

        if (!local) {
          diff.items.push({
            id: item.id,
            storeName: store.name,
            label: `${store.label}: ${label}`,
            type: 'new',
            remoteTimestamp: itemUpdatedAt,
            remoteData: item
          });
        } else {
          // Compare using either updatedAt or timestamp
          if (itemUpdatedAt && localUpdatedAt) {
            if (itemUpdatedAt > localUpdatedAt) {
              diff.items.push({
                id: item.id,
                storeName: store.name,
                label: `${store.label}: ${label}`,
                type: 'update',
                localTimestamp: localUpdatedAt,
                remoteTimestamp: itemUpdatedAt,
                localData: local,
                remoteData: item
              });
            } else if (itemUpdatedAt < localUpdatedAt) {
              diff.items.push({
                id: item.id,
                storeName: store.name,
                label: `${store.label}: ${label}`,
                type: 'conflict',
                localTimestamp: localUpdatedAt,
                remoteTimestamp: itemUpdatedAt,
                localData: local,
                remoteData: item
              });
            } else {
              diff.items.push({
                id: item.id,
                storeName: store.name,
                label: `${store.label}: ${label}`,
                type: 'identical',
                localTimestamp: localUpdatedAt,
                remoteTimestamp: itemUpdatedAt,
                localData: local,
                remoteData: item
              });
            }
          } else {
            // If timestamps are missing on one side, treat as identical if both exist
            diff.items.push({
              id: item.id,
              storeName: store.name,
              label: `${store.label}: ${label}`,
              type: 'identical',
              localTimestamp: localUpdatedAt,
              remoteTimestamp: itemUpdatedAt,
              localData: local,
              remoteData: item
            });
          }
        }
      }
    }

    return diff;
  }

  // Interactive Merge: Apply
  async applyMerge(diff: MergeDiff, selectedIds: string[]): Promise<MergeReport> {
    const report: MergeReport = { added: 0, updated: 0, skipped: 0, conflicts: 0 };
    const selectedSet = new Set(selectedIds);

    for (const itemDiff of diff.items) {
      const fullId = `${itemDiff.storeName}-${itemDiff.id}`;
      if (selectedSet.has(fullId)) {
        // Apply data exactly as-is to preserve fingerprint stability
        await this.execute(itemDiff.storeName, "put", itemDiff.remoteData);
        if (itemDiff.type === 'new') report.added++;
        else report.updated++;
      } else {
        report.skipped++;
        if (itemDiff.type === 'conflict') report.conflicts++;
      }
    }

    return report;
  }

  // Generate a stable hash of all data for comparison
  async getDataHash(): Promise<string> {
    const data = await this.exportData();
    const stableData = this.makeStable(data);
    const msgUint8 = new TextEncoder().encode(JSON.stringify(stableData));
    const hashBuffer = await crypto.subtle.digest("SHA-256", msgUint8);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, "0")).join("").substring(0, 10).toUpperCase();
  }

  private makeStable(obj: any): any {
    if (Array.isArray(obj)) {
      // Sort arrays of objects by ID for stability
      const sortedArray = obj.map(item => this.makeStable(item));
      if (sortedArray.length > 0 && sortedArray[0] && typeof sortedArray[0] === 'object' && sortedArray[0].id) {
        return sortedArray.sort((a, b) => String(a.id).localeCompare(String(b.id)));
      }
      return sortedArray;
    } else if (obj !== null && typeof obj === "object") {
      const sortedKeys = Object.keys(obj).sort();
      const result: any = {};
      for (const key of sortedKeys) {
        // Exclude updatedAt and timestamp from hash calculation for stability
        if (key === 'updatedAt' || key === 'timestamp') {
          continue;
        }
        result[key] = this.makeStable(obj[key]);
      }
      return result;
    }
    return obj;
  }
}

export const db = new IndexedDBService();
