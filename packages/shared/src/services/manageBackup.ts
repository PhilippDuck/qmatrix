/**
 * Global disaster-recovery backup for SkillGrid Manage:
 * live catalog + last 10 release snapshots + settings.
 */

import type {
  AppSettings,
  Category,
  EmployeeRole,
  Skill,
  SubCategory,
} from "../types";
import type { StoredCatalogRelease } from "./indexeddb";

export const MANAGE_BACKUP_FORMAT = "skillgrid-manage-backup" as const;
export const MANAGE_BACKUP_FORMAT_VERSION = 1 as const;

export interface ManageBackupData {
  categories: Category[];
  subcategories: SubCategory[];
  skills: Skill[];
  roles: EmployeeRole[];
  settings: AppSettings;
  /** Full archived releases (newest first recommended). */
  catalogReleases: StoredCatalogRelease[];
}

export interface ManageBackupPackage {
  format: typeof MANAGE_BACKUP_FORMAT;
  formatVersion: typeof MANAGE_BACKUP_FORMAT_VERSION;
  exportedAt: string;
  /** Optional human note */
  label?: string;
  data: ManageBackupData;
}

export interface ManageBackupValidation {
  ok: boolean;
  errors: string[];
  package?: ManageBackupPackage;
}

export function validateManageBackup(raw: unknown): ManageBackupValidation {
  const errors: string[] = [];
  if (!raw || typeof raw !== "object") {
    return { ok: false, errors: ["Backup muss ein JSON-Objekt sein"] };
  }
  const obj = raw as Record<string, unknown>;
  if (obj.format !== MANAGE_BACKUP_FORMAT) {
    errors.push(
      `Erwartetes Format "${MANAGE_BACKUP_FORMAT}", erhalten: ${String(obj.format)}`
    );
  }
  if (obj.formatVersion !== MANAGE_BACKUP_FORMAT_VERSION) {
    errors.push(
      `Unsupported formatVersion ${String(obj.formatVersion)} (supported: ${MANAGE_BACKUP_FORMAT_VERSION})`
    );
  }
  if (!obj.data || typeof obj.data !== "object") {
    errors.push("Feld data fehlt");
    return { ok: false, errors };
  }
  const data = obj.data as Record<string, unknown>;
  for (const key of [
    "categories",
    "subcategories",
    "skills",
    "roles",
    "catalogReleases",
  ] as const) {
    if (!Array.isArray(data[key])) {
      errors.push(`data.${key} muss ein Array sein`);
    }
  }
  if (!data.settings || typeof data.settings !== "object") {
    errors.push("data.settings fehlt");
  }
  if (errors.length) return { ok: false, errors };

  return {
    ok: true,
    errors: [],
    package: obj as unknown as ManageBackupPackage,
  };
}

export function manageBackupFilename(label?: string): string {
  const safe = (label || "SkillGrid_Manage")
    .replace(/[^a-z0-9]+/gi, "_")
    .replace(/^_|_$/g, "");
  const date = new Date().toISOString().slice(0, 10);
  const time = new Date().toLocaleTimeString("de-DE").replace(/:/g, "-");
  return `${safe}_GlobalBackup_${date}_${time}.json`;
}
