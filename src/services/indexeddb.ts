// IndexedDB Service für Qualifizierungsmatrix
const DB_NAME = "QualificationMatrixDB";
const DB_VERSION = 2;

export interface Employee {
  id?: string;
  name: string;
  department?: string;
}

export interface Category {
  id?: string;
  name: string;
  description?: string;
}

export interface SubCategory {
  id?: string;
  categoryId: string;
  name: string;
  description?: string;
}

export interface Skill {
  id?: string;
  subCategoryId: string;
  name: string;
  description?: string;
}

export interface Assessment {
  id?: string;
  employeeId: string;
  skillId: string;
  level: 0 | 25 | 50 | 75 | 100;
  targetLevel?: number; // Individuelles Soll pro Mitarbeiter/Skill
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

class IndexedDBService {
  private db: IDBDatabase | null = null;

  async init(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.db = request.result;
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
      };
    });
  }

  // Employees
  async addEmployee(employee: Omit<Employee, "id">): Promise<string> {
    const id = crypto.randomUUID();
    const data = { ...employee, id };
    await this.execute("employees", "add", data);
    return id;
  }

  async getEmployees(): Promise<Employee[]> {
    return this.execute("employees", "getAll");
  }

  async updateEmployee(
    id: string,
    employee: Omit<Employee, "id">,
  ): Promise<void> {
    const data = { ...employee, id };
    await this.execute("employees", "put", data);
  }

  async deleteEmployee(id: string): Promise<void> {
    // First, delete all assessments for this employee
    const assessments = await this.getAssessmentsByEmployee(id);
    for (const assessment of assessments) {
      await this.deleteAssessment(id, assessment.skillId);
    }

    // Then delete the employee
    await this.execute("employees", "delete", id);
  }

  // Categories
  async addCategory(category: Omit<Category, "id">): Promise<string> {
    const id = crypto.randomUUID();
    const data = { ...category, id };
    await this.execute("categories", "add", data);
    return id;
  }

  async getCategories(): Promise<Category[]> {
    return this.execute("categories", "getAll");
  }

  async updateCategory(
    id: string,
    category: Omit<Category, "id">,
  ): Promise<void> {
    const data = { ...category, id };
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
  async addSubCategory(subCategory: Omit<SubCategory, "id">): Promise<string> {
    const id = crypto.randomUUID();
    const data = { ...subCategory, id };
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
    subCategory: Omit<SubCategory, "id">,
  ): Promise<void> {
    const data = { ...subCategory, id };
    await this.execute("subcategories", "put", data);
  }

  async deleteSubCategory(id: string): Promise<void> {
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
  async addSkill(skill: Omit<Skill, "id">): Promise<string> {
    const id = crypto.randomUUID();
    const data = { ...skill, id };
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

  async updateSkill(id: string, skill: Omit<Skill, "id">): Promise<void> {
    const data = { ...skill, id };
    await this.execute("skills", "put", data);
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
    level: 0 | 25 | 50 | 75 | 100,
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
      id,
      employeeId,
      skillId,
      level,
      targetLevel: existing?.targetLevel
    };
    await this.execute("assessments", "put", data);
  }

  // Assessment Logs
  async addAssessmentLog(entry: AssessmentLogEntry): Promise<string> {
    const id = crypto.randomUUID();
    const data = { ...entry, id };
    await this.execute("assessment_logs", "add", data);
    return id;
  }

  async getAssessmentLogs(employeeId: string): Promise<AssessmentLogEntry[]> {
    return this.executeIndex("assessment_logs", "employeeId", "getAll", employeeId);
  }

  async deleteAssessment(employeeId: string, skillId: string): Promise<void> {
    const id = `${employeeId}-${skillId}`;
    await this.execute("assessments", "delete", id);
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
      id,
      employeeId,
      skillId,
      level: existing?.level ?? 0,
      targetLevel
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
    return new Promise((resolve, reject) => {
      if (!this.db) return reject(new Error("Database not initialized"));

      const transaction = this.db.transaction("assessments", "readonly");
      const store = transaction.objectStore("assessments");
      const index = store.index("employeeSkill");
      const request = index.get([employeeId, skillId]);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result);
    });
  }

  // Helper methods
  private execute(
    storeName: string,
    method: "add" | "put" | "delete" | "get" | "getAll" | "clear",
    data?: any,
  ): Promise<any> {
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
  }

  // Export all data as JSON
  async exportData(): Promise<{
    employees: Employee[];
    categories: Category[];
    subcategories: SubCategory[];
    skills: Skill[];
    assessments: Assessment[];
  }> {
    return {
      employees: await this.getEmployees(),
      categories: await this.getCategories(),
      subcategories: await this.getSubCategories(),
      skills: await this.getSkills(),
      assessments: await this.execute("assessments", "getAll"),
    };
  }

  // Import data from JSON
  async importData(data: {
    employees?: Employee[];
    categories?: Category[];
    subcategories?: SubCategory[];
    skills?: Skill[];
    assessments?: Assessment[];
  }): Promise<void> {
    // Clear all stores
    if (!this.db) return;

    const transaction = this.db.transaction(
      ["employees", "categories", "subcategories", "skills", "assessments"],
      "readwrite",
    );

    for (const storeName of [
      "employees",
      "categories",
      "subcategories",
      "skills",
      "assessments",
    ]) {
      await new Promise<void>((resolve, reject) => {
        const store = transaction.objectStore(storeName);
        const request = store.clear();
        request.onerror = () => reject(request.error);
        request.onsuccess = () => resolve();
      });
    }

    // Import data
    if (data.employees) {
      for (const emp of data.employees) {
        await this.execute("employees", "add", emp);
      }
    }
    if (data.categories) {
      for (const cat of data.categories) {
        await this.execute("categories", "add", cat);
      }
    }
    if (data.subcategories) {
      for (const subcat of data.subcategories) {
        await this.execute("subcategories", "add", subcat);
      }
    }
    if (data.skills) {
      for (const skill of data.skills) {
        await this.execute("skills", "add", skill);
      }
    }
    if (data.assessments) {
      for (const assessment of data.assessments) {
        await this.execute("assessments", "add", assessment);
      }
    }
  }
}

export const db = new IndexedDBService();
