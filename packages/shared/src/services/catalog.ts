/**
 * Catalog package pure functions: validate, extract, hash (PR 6).
 * Apply pipeline is PR 7.
 */

import type { ExportData } from "../types";
import type {
  CatalogEntities,
  CatalogExtractInput,
  CatalogExtractMetaInput,
  CatalogExtractResult,
  CatalogMeta,
  CatalogPackage,
  CatalogRole,
  CatalogSkill,
  CatalogValidationIssue,
  CatalogValidationResult,
  SemVer,
} from "../types/catalog";
import {
  CATALOG_FORMAT,
  CATALOG_FORMAT_VERSION,
} from "../types/catalog";

const SEMVER_RE = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-[\w.-]+)?(?:\+[\w.-]+)?$/;
const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isValidSemVer(version: string): boolean {
  return SEMVER_RE.test(version);
}

export function parseSemVer(
  version: string
): { major: number; minor: number; patch: number } | null {
  const m = version.match(SEMVER_RE);
  if (!m) return null;
  return {
    major: Number(m[1]),
    minor: Number(m[2]),
    patch: Number(m[3]),
  };
}

/** -1 if a < b, 0 if equal, 1 if a > b (ignores pre-release). */
export function compareSemVer(a: SemVer, b: SemVer): number {
  const pa = parseSemVer(a);
  const pb = parseSemVer(b);
  if (!pa || !pb) return 0;
  if (pa.major !== pb.major) return pa.major < pb.major ? -1 : 1;
  if (pa.minor !== pb.minor) return pa.minor < pb.minor ? -1 : 1;
  if (pa.patch !== pb.patch) return pa.patch < pb.patch ? -1 : 1;
  return 0;
}

export type SemVerBump = "major" | "minor" | "patch";

/** Bump a SemVer string. Invalid input falls back to 0.0.0 before bump. */
export function bumpSemVer(version: string, bump: SemVerBump): SemVer {
  const parsed = parseSemVer(version) ?? { major: 0, minor: 0, patch: 0 };
  if (bump === "major") return `${parsed.major + 1}.0.0`;
  if (bump === "minor") return `${parsed.major}.${parsed.minor + 1}.0`;
  return `${parsed.major}.${parsed.minor}.${parsed.patch + 1}`;
}

function err(path: string, message: string): CatalogValidationIssue {
  return { path, message, severity: "error" };
}

function warn(path: string, message: string): CatalogValidationIssue {
  return { path, message, severity: "warning" };
}

function isObject(v: unknown): v is Record<string, unknown> {
  return v !== null && typeof v === "object" && !Array.isArray(v);
}

function requireId(entity: unknown, path: string, errors: CatalogValidationIssue[]): string | null {
  if (!isObject(entity)) {
    errors.push(err(path, "Entity must be an object"));
    return null;
  }
  if (typeof entity.id !== "string" || !entity.id) {
    errors.push(err(`${path}.id`, "id is required"));
    return null;
  }
  return entity.id;
}

/** Detect cycles in role inheritsFromId graph. */
function findInheritanceCycles(
  roles: CatalogRole[]
): string[] {
  const byId = new Map(roles.map((r) => [r.id, r]));
  const cycles: string[] = [];

  for (const role of roles) {
    const visited = new Set<string>();
    let current: CatalogRole | undefined = role;
    while (current?.inheritsFromId) {
      if (visited.has(current.id)) {
        cycles.push(role.id);
        break;
      }
      visited.add(current.id);
      current = byId.get(current.inheritsFromId);
      if (!current) break;
    }
  }
  return cycles;
}

/**
 * Validate a catalog package. Returns normalized package (partial defaulted) when ok.
 */
export function validateCatalogPackage(
  input: unknown,
  options?: { appFormatVersion?: number }
): CatalogValidationResult {
  const errors: CatalogValidationIssue[] = [];
  const warnings: CatalogValidationIssue[] = [];
  const appFormatVersion = options?.appFormatVersion ?? CATALOG_FORMAT_VERSION;

  if (!isObject(input)) {
    return {
      ok: false,
      errors: [err("", "Package must be a JSON object")],
      warnings,
    };
  }

  if (input.format !== CATALOG_FORMAT) {
    errors.push(
      err("format", `Expected "${CATALOG_FORMAT}", got ${String(input.format)}`)
    );
  }
  if (input.formatVersion !== CATALOG_FORMAT_VERSION) {
    errors.push(
      err(
        "formatVersion",
        `Unsupported formatVersion ${String(input.formatVersion)} (supported: ${CATALOG_FORMAT_VERSION})`
      )
    );
  }

  if (!isObject(input.meta)) {
    errors.push(err("meta", "meta is required"));
    return { ok: false, errors, warnings };
  }

  const metaRaw = input.meta;
  if (typeof metaRaw.catalogId !== "string" || !metaRaw.catalogId) {
    errors.push(err("meta.catalogId", "catalogId is required"));
  }
  if (typeof metaRaw.name !== "string" || !metaRaw.name.trim()) {
    errors.push(err("meta.name", "name is required"));
  }
  if (typeof metaRaw.version !== "string" || !isValidSemVer(metaRaw.version)) {
    errors.push(err("meta.version", "version must be a valid SemVer"));
  }
  if (typeof metaRaw.publishedAt !== "string" || !metaRaw.publishedAt) {
    errors.push(err("meta.publishedAt", "publishedAt is required (ISO-8601)"));
  }
  if (typeof metaRaw.minAppFormatVersion !== "number") {
    errors.push(err("meta.minAppFormatVersion", "minAppFormatVersion is required"));
  } else if (metaRaw.minAppFormatVersion > appFormatVersion) {
    errors.push(
      err(
        "meta.minAppFormatVersion",
        `Package requires format ${metaRaw.minAppFormatVersion}, app supports ${appFormatVersion}`
      )
    );
  }
  if (metaRaw.partial !== undefined && typeof metaRaw.partial !== "boolean") {
    errors.push(err("meta.partial", "partial must be a boolean when present"));
  }
  if (!Array.isArray(metaRaw.changelog)) {
    errors.push(err("meta.changelog", "changelog must be an array"));
  }

  if (!isObject(input.entities)) {
    errors.push(err("entities", "entities is required"));
    return { ok: false, errors, warnings };
  }

  const ent = input.entities;
  for (const kind of ["categories", "subcategories", "skills", "roles"] as const) {
    if (!Array.isArray(ent[kind])) {
      errors.push(err(`entities.${kind}`, `${kind} must be an array`));
    }
  }

  if (errors.length > 0) {
    return { ok: false, errors, warnings };
  }

  const categories = (ent.categories as unknown[]).map((c, i) => {
    const id = requireId(c, `entities.categories[${i}]`, errors);
    return c as CatalogEntities["categories"][number];
  });
  const subcategories = (ent.subcategories as unknown[]).map((c, i) => {
    requireId(c, `entities.subcategories[${i}]`, errors);
    return c as CatalogEntities["subcategories"][number];
  });
  const skills = (ent.skills as unknown[]).map((c, i) => {
    requireId(c, `entities.skills[${i}]`, errors);
    return c as CatalogSkill;
  });
  const roles = (ent.roles as unknown[]).map((c, i) => {
    requireId(c, `entities.roles[${i}]`, errors);
    return c as CatalogRole;
  });

  const catIds = new Set(categories.map((c) => c.id).filter(Boolean));
  const subIds = new Set(subcategories.map((s) => s.id).filter(Boolean));
  const skillIds = new Set(skills.map((s) => s.id).filter(Boolean));
  const roleIds = new Set(roles.map((r) => r.id).filter(Boolean));

  for (const [i, sub] of subcategories.entries()) {
    if (sub.categoryId && !catIds.has(sub.categoryId)) {
      errors.push(
        err(
          `entities.subcategories[${i}].categoryId`,
          `Unknown categoryId ${sub.categoryId}`
        )
      );
    }
    if (sub.parentSubCategoryId && !subIds.has(sub.parentSubCategoryId)) {
      // parent may be same package — if missing, error
      errors.push(
        err(
          `entities.subcategories[${i}].parentSubCategoryId`,
          `Unknown parentSubCategoryId ${sub.parentSubCategoryId}`
        )
      );
    }
  }

  for (const [i, skill] of skills.entries()) {
    if (skill.subCategoryId && !subIds.has(skill.subCategoryId)) {
      errors.push(
        err(
          `entities.skills[${i}].subCategoryId`,
          `Unknown subCategoryId ${skill.subCategoryId}`
        )
      );
    }
  }

  for (const [i, role] of roles.entries()) {
    if (role.inheritsFromId && !roleIds.has(role.inheritsFromId)) {
      errors.push(
        err(
          `entities.roles[${i}].inheritsFromId`,
          `Unknown inheritsFromId ${role.inheritsFromId}`
        )
      );
    }
    for (const [j, req] of (role.requiredSkills || []).entries()) {
      if (!skillIds.has(req.skillId)) {
        errors.push(
          err(
            `entities.roles[${i}].requiredSkills[${j}].skillId`,
            `Unknown skillId ${req.skillId}`
          )
        );
      }
    }
  }

  for (const cycleId of findInheritanceCycles(roles)) {
    errors.push(
      err(`entities.roles`, `Inheritance cycle involving role ${cycleId}`)
    );
  }

  if (errors.length > 0) {
    return { ok: false, errors, warnings };
  }

  const meta: CatalogMeta = {
    catalogId: String(metaRaw.catalogId),
    name: String(metaRaw.name),
    version: String(metaRaw.version),
    publishedAt: String(metaRaw.publishedAt),
    publisher:
      typeof metaRaw.publisher === "string" ? metaRaw.publisher : undefined,
    changelog: (metaRaw.changelog as CatalogMeta["changelog"]) || [],
    minAppFormatVersion: Number(metaRaw.minAppFormatVersion),
    partial: metaRaw.partial === true,
  };

  const pkg: CatalogPackage = {
    format: CATALOG_FORMAT,
    formatVersion: CATALOG_FORMAT_VERSION,
    meta,
    entities: {
      categories,
      subcategories,
      skills: skills.map(stripSkillForPackage),
      roles,
    },
    contentHash:
      typeof input.contentHash === "string" ? input.contentHash : undefined,
  };

  return { ok: true, errors, warnings, package: pkg };
}

function stripSkillForPackage(skill: CatalogSkill): CatalogSkill {
  const {
    departmentId: _d,
    requiredByRoleIds: _r,
    ...rest
  } = skill as CatalogSkill & {
    departmentId?: string;
    requiredByRoleIds?: string[];
  };
  return rest as CatalogSkill;
}

/**
 * Canonical JSON for contentHash (sorted keys, no contentHash field).
 */
export function canonicalEntitiesJson(entities: CatalogEntities): string {
  const sortById = <T extends { id: string }>(arr: T[]) =>
    [...arr].sort((a, b) => a.id.localeCompare(b.id));

  const stable = {
    categories: sortById(entities.categories),
    subcategories: sortById(entities.subcategories),
    skills: sortById(entities.skills),
    roles: sortById(entities.roles),
  };
  return JSON.stringify(stable);
}

export async function computeContentHash(
  entities: CatalogEntities
): Promise<string> {
  const json = canonicalEntitiesJson(entities);
  const data = new TextEncoder().encode(json);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/**
 * Short fingerprint of catalog-only data (categories, subcategories, skills, roles).
 * Same idea as the app-wide dataHash, but excludes employees/assessments/etc.
 * Display format: first 10 hex chars uppercase (like getDataHash).
 */
export async function computeCatalogFingerprint(
  entities: CatalogEntities
): Promise<string> {
  const full = await computeContentHash(entities);
  return full.substring(0, 10).toUpperCase();
}

/**
 * Extract catalog from live app state (or ExportData catalog fields).
 * requiredSkills on roles is SoT; skills omit requiredByRoleIds (K18).
 */
export function extractCatalogFromState(
  input: CatalogExtractInput,
  metaInput: CatalogExtractMetaInput
): CatalogExtractResult {
  const errors: CatalogValidationIssue[] = [];
  const warnings: CatalogValidationIssue[] = [];
  const orphanSkillRoleLinks: CatalogExtractResult["report"]["orphanSkillRoleLinks"] =
    [];

  if (!metaInput.catalogId) {
    errors.push(err("meta.catalogId", "catalogId is required"));
  }
  if (!metaInput.name?.trim()) {
    errors.push(err("meta.name", "name is required"));
  }
  if (!isValidSemVer(metaInput.version)) {
    errors.push(err("meta.version", "version must be valid SemVer"));
  }

  const categories = (input.categories || [])
    .filter((c): c is typeof c & { id: string } => !!c.id)
    .map((c) => ({ ...c, id: c.id! }));

  const subcategories = (input.subcategories || [])
    .filter((s): s is typeof s & { id: string } => !!s.id)
    .map((s) => ({ ...s, id: s.id! }));

  const skillIds = new Set(
    (input.skills || []).map((s) => s.id).filter(Boolean) as string[]
  );

  const roles: CatalogRole[] = (input.roles || [])
    .filter((r): r is typeof r & { id: string } => !!r.id)
    .map((r) => ({
      ...r,
      id: r.id!,
      requiredSkills: (r.requiredSkills || []).filter((req) => {
        if (!skillIds.has(req.skillId)) {
          warnings.push(
            warn(
              `roles.${r.id}.requiredSkills`,
              `Dropping requiredSkills entry for missing skill ${req.skillId}`
            )
          );
          return false;
        }
        return true;
      }),
    }));

  // Orphan skill→role links (skill.requiredByRoleIds not in any role.requiredSkills)
  for (const skill of input.skills || []) {
    if (!skill.id || !skill.requiredByRoleIds?.length) continue;
    const orphanRoleIds = skill.requiredByRoleIds.filter((roleId) => {
      const role = roles.find((r) => r.id === roleId);
      if (!role) return true;
      return !(role.requiredSkills || []).some((req) => req.skillId === skill.id);
    });
    if (orphanRoleIds.length > 0) {
      orphanSkillRoleLinks.push({
        skillId: skill.id,
        skillName: skill.name,
        roleIds: orphanRoleIds,
      });
      warnings.push(
        warn(
          `skills.${skill.id}.requiredByRoleIds`,
          `Skill "${skill.name}" has role links not present in role.requiredSkills (K18 SoT is roles)`
        )
      );
    }
  }

  const skills: CatalogSkill[] = (input.skills || [])
    .filter((s): s is typeof s & { id: string } => !!s.id)
    .map((s) => {
      const {
        departmentId: _d,
        requiredByRoleIds: _r,
        id,
        ...rest
      } = s;
      return { ...rest, id } as CatalogSkill;
    });

  if (errors.length > 0) {
    return {
      ok: false,
      errors,
      report: {
        warnings,
        orphanSkillRoleLinks,
        counts: { categories: 0, subcategories: 0, skills: 0, roles: 0 },
      },
    };
  }

  const entities: CatalogEntities = {
    categories,
    subcategories,
    skills,
    roles,
  };

  const meta: CatalogMeta = {
    catalogId: metaInput.catalogId,
    name: metaInput.name.trim(),
    version: metaInput.version,
    publishedAt: new Date().toISOString(),
    publisher: metaInput.publisher,
    changelog: metaInput.changelog ?? [
      {
        version: metaInput.version,
        date: new Date().toISOString().slice(0, 10),
        notes: "Extracted catalog snapshot",
      },
    ],
    minAppFormatVersion: metaInput.minAppFormatVersion ?? CATALOG_FORMAT_VERSION,
    partial: metaInput.partial === true,
  };

  const pkg: CatalogPackage = {
    format: CATALOG_FORMAT,
    formatVersion: CATALOG_FORMAT_VERSION,
    meta,
    entities,
  };

  // Self-validate structure
  const validation = validateCatalogPackage(pkg);
  if (!validation.ok) {
    return {
      ok: false,
      errors: [...errors, ...validation.errors],
      report: {
        warnings: [...warnings, ...validation.warnings],
        orphanSkillRoleLinks,
        counts: {
          categories: categories.length,
          subcategories: subcategories.length,
          skills: skills.length,
          roles: roles.length,
        },
      },
    };
  }

  return {
    ok: true,
    package: validation.package,
    errors: [],
    report: {
      warnings,
      orphanSkillRoleLinks,
      counts: {
        categories: categories.length,
        subcategories: subcategories.length,
        skills: skills.length,
        roles: roles.length,
      },
    },
  };
}

export function extractCatalogFromExport(
  data: ExportData,
  metaInput: CatalogExtractMetaInput
): CatalogExtractResult {
  return extractCatalogFromState(
    {
      categories: data.categories || [],
      subcategories: data.subcategories || [],
      skills: data.skills || [],
      roles: data.roles || [],
    },
    metaInput
  );
}

export async function withContentHash(
  pkg: CatalogPackage
): Promise<CatalogPackage> {
  const contentHash = await computeContentHash(pkg.entities);
  return { ...pkg, contentHash };
}

export function catalogDownloadFilename(meta: CatalogMeta): string {
  const safeName = (meta.name || "Katalog").replace(/[^a-z0-9]+/gi, "_");
  const date = meta.publishedAt?.slice(0, 10) || new Date().toISOString().slice(0, 10);
  return `${safeName}_Katalog_v${meta.version}_${date}.json`;
}

/** Re-derive skill.requiredByRoleIds from roles (K18). */
export function recomputeRequiredByRoleIds(
  skills: { id?: string; requiredByRoleIds?: string[] }[],
  roles: { id?: string; requiredSkills?: { skillId: string; level: number }[] }[]
): Map<string, string[]> {
  const map = new Map<string, string[]>();
  for (const skill of skills) {
    if (skill.id) map.set(skill.id, []);
  }
  for (const role of roles) {
    if (!role.id) continue;
    for (const req of role.requiredSkills || []) {
      const list = map.get(req.skillId);
      if (list && !list.includes(role.id)) {
        list.push(role.id);
      }
    }
  }
  return map;
}
