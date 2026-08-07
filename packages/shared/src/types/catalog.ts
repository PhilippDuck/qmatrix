/**
 * Versioned skill/role catalog package (Source of Truth) — design §8.
 * Separate from full ExportData backups.
 */

import type { Category, EmployeeRole, Skill, SubCategory } from "./domain";

export const CATALOG_FORMAT = "skillgrid-catalog" as const;
export const CATALOG_FORMAT_VERSION = 1 as const;

/** Semantic version string, e.g. "1.2.3" */
export type SemVer = string;

export type CatalogEntityKind =
  | "categories"
  | "subcategories"
  | "skills"
  | "roles";

export interface CatalogChangelogEntry {
  version: SemVer;
  date: string; // YYYY-MM-DD
  notes: string;
}

export interface CatalogMeta {
  /** Stable UUID for this catalog product line */
  catalogId: string;
  name: string;
  version: SemVer;
  publishedAt: string; // ISO-8601
  publisher?: string;
  changelog: CatalogChangelogEntry[];
  /** Apply rejects if app formatVersion < this */
  minAppFormatVersion: number;
  /**
   * If true: empty entity arrays mean "kind not included" (no-op).
   * If false/omitted: full snapshot; empty array applies missingPolicy.
   * Manage Publish always sets partial: false.
   */
  partial?: boolean;
}

export interface CatalogCategory extends Category {
  id: string;
}

export interface CatalogSubCategory extends SubCategory {
  id: string;
}

/** Skills in package omit departmentId and requiredByRoleIds (re-derived). */
export interface CatalogSkill
  extends Omit<Skill, "departmentId" | "requiredByRoleIds" | "id"> {
  id: string;
}

export interface CatalogRole extends EmployeeRole {
  id: string;
}

export interface CatalogEntities {
  categories: CatalogCategory[];
  subcategories: CatalogSubCategory[];
  skills: CatalogSkill[];
  roles: CatalogRole[];
}

export interface CatalogPackage {
  format: typeof CATALOG_FORMAT;
  formatVersion: typeof CATALOG_FORMAT_VERSION;
  meta: CatalogMeta;
  entities: CatalogEntities;
  /** SHA-256 hex of canonical entities JSON — corruption detection only */
  contentHash?: string;
}

export interface CatalogValidationIssue {
  path: string;
  message: string;
  severity: "error" | "warning";
}

export interface CatalogValidationResult {
  ok: boolean;
  errors: CatalogValidationIssue[];
  warnings: CatalogValidationIssue[];
  /** Normalized package when ok (partial defaulted, etc.) */
  package?: CatalogPackage;
}

export interface CatalogExtractInput {
  categories: Category[];
  subcategories: SubCategory[];
  skills: Skill[];
  roles: EmployeeRole[];
}

export interface CatalogExtractMetaInput {
  catalogId: string;
  name: string;
  version: SemVer;
  publisher?: string;
  changelog?: CatalogChangelogEntry[];
  minAppFormatVersion?: number;
  partial?: boolean;
  /** When true, compute contentHash (async path) */
  includeContentHash?: boolean;
}

export interface CatalogExtractReport {
  warnings: CatalogValidationIssue[];
  /** Skills with requiredByRoleIds not reflected in any role.requiredSkills */
  orphanSkillRoleLinks: { skillId: string; skillName: string; roleIds: string[] }[];
  counts: Record<CatalogEntityKind, number>;
}

export interface CatalogExtractResult {
  ok: boolean;
  package?: CatalogPackage;
  report: CatalogExtractReport;
  errors: CatalogValidationIssue[];
}

export type CatalogMissingPolicy = "soft" | "hard" | "keep";

export interface CatalogApplyOptions {
  upsert?: boolean; // default true
  missingPolicy?: CatalogMissingPolicy; // default soft
  /** Allow installing a lower SemVer than currently installed */
  allowDowngrade?: boolean;
  /** Allow switching catalogId */
  allowCatalogIdChange?: boolean;
  /**
   * When false, apply entity content only and leave installedCatalogMeta alone.
   * Manage merge uses this — Manage is SoT for SemVer releases.
   * Default true (Team/Full install of a catalog package).
   */
  updateInstalledMeta?: boolean;
}

export interface CatalogApplyReport {
  added: Record<CatalogEntityKind, number>;
  updated: Record<CatalogEntityKind, number>;
  deprecated: Record<CatalogEntityKind, number>;
  hardRemoved: Record<CatalogEntityKind, number>;
  roleNameRewrites: number;
  orphanAssessments: number;
  orphanMeasures: number;
  hierarchyWarnings: number;
  warnings: string[];
  previousVersion?: SemVer;
  newVersion: SemVer;
  catalogId: string;
}

export interface CatalogApplyResult {
  ok: boolean;
  report?: CatalogApplyReport;
  errors: CatalogValidationIssue[];
}

/** Selective ops import from ExportData without catalog stores (Team MVP). */
export interface OpsImportOptions {
  employees?: boolean;
  departments?: boolean;
  assessments?: boolean;
  history?: boolean;
  qualificationPlans?: boolean;
  qualificationMeasures?: boolean;
  savedViews?: boolean;
  settings?: boolean;
  /** default false — never overwrite catalog via this path */
  includeCatalog?: boolean;
}

export interface OpsImportReport {
  imported: Partial<Record<string, number>>;
  skipped: string[];
  warnings: string[];
}
