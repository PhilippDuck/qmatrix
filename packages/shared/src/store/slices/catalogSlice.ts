import type {
  DbService,
  StoredCatalogRelease,
} from "../../services/indexeddb";
import type { AppCapabilities } from "../../types/capabilities";
import type {
  CatalogApplyOptions,
  CatalogApplyResult,
  CatalogEntities,
  CatalogExtractMetaInput,
  CatalogExtractResult,
  CatalogPackage,
  OpsImportOptions,
  OpsImportReport,
} from "../../types/catalog";
import type { ExportData } from "../../types";
import type { CatalogChangelogEntry, CatalogMeta, SemVer } from "../../types/catalog";
import {
  extractCatalogFromState,
  withContentHash,
  catalogDownloadFilename,
  bumpSemVer,
  isValidSemVer,
  computeContentHash,
  type SemVerBump,
} from "../../services/catalog";
import {
  applyCatalogPackage,
  importOpsFromExportData,
} from "../../services/catalogApply";
import {
  diffCatalogEntities,
  type CatalogDiffResult,
} from "../../services/catalogDiff";
import {
  buildCatalogReleaseNotesText,
  catalogReleaseNotesFilename,
  downloadTextFile,
} from "../../services/catalogReleaseNotes";
import {
  MANAGE_BACKUP_FORMAT,
  MANAGE_BACKUP_FORMAT_VERSION,
  manageBackupFilename,
  validateManageBackup,
  type ManageBackupPackage,
} from "../../services/manageBackup";
import { checkCapability } from "../capabilities";
import type { AppSlice } from "../types";

export interface PublishCatalogOptions {
  /** Stable product-line id (one Manage DB = one catalogId). */
  catalogId: string;
  name: string;
  /** Explicit version, or omit and use bump from current. */
  version?: SemVer;
  bump?: SemVerBump;
  releaseNotes: string;
  publisher?: string;
  /** Download JSON after publish (default true). */
  download?: boolean;
}

export interface CatalogSlice {
  lastCatalogApplyReport: CatalogApplyResult["report"] | null;
  lastCatalogExtractWarnings: string[];
  /** Last 10 published snapshots (newest first), loaded from IndexedDB. */
  storedCatalogReleases: StoredCatalogRelease[];
  /** Live catalog differs from newest stored release. */
  hasUnpublishedCatalogChanges: boolean;

  extractCatalog: (
    meta: CatalogExtractMetaInput
  ) => Promise<CatalogExtractResult>;
  downloadCatalogPackage: (
    pkg: CatalogPackage,
    options?: {
      /** Pre-built release notes TXT (always downloaded with Manage releases). */
      notesText?: string;
    }
  ) => void;
  /**
   * Manage release: bump version, append changelog, persist snapshot (max 10), download.
   */
  publishCatalogRelease: (
    options: PublishCatalogOptions
  ) => Promise<CatalogExtractResult>;
  refreshCatalogReleases: () => Promise<void>;
  /** Recompute dirty flag vs latest stored release. */
  refreshCatalogDirtyState: () => Promise<void>;
  /** Diff current live catalog against a stored release (or latest if id omitted). */
  diffAgainstRelease: (releaseId?: string) => Promise<CatalogDiffResult | null>;
  /** Restore live catalog to a stored release snapshot. */
  rollbackToRelease: (releaseId: string) => Promise<CatalogApplyResult>;
  redownloadRelease: (releaseId: string) => Promise<void>;
  /**
   * Disaster-recovery backup: live catalog + up to 10 release snapshots + settings.
   * Always allowed for Manage (catalogVersioning); independent of fullBackupExport.
   */
  exportManageBackup: (label?: string) => Promise<ManageBackupPackage>;
  importManageBackup: (jsonData: string) => Promise<void>;
  importCatalog: (
    jsonOrPackage: string | unknown,
    options?: CatalogApplyOptions
  ) => Promise<CatalogApplyResult>;
  importOpsData: (
    jsonData: string,
    options?: OpsImportOptions
  ) => Promise<OpsImportReport>;
}

function liveEntitiesFromState(state: {
  categories: { id?: string; name: string; description?: string }[];
  subcategories: {
    id?: string;
    categoryId: string;
    parentSubCategoryId?: string;
    name: string;
    description?: string;
  }[];
  skills: {
    id?: string;
    subCategoryId: string;
    name: string;
    description?: string;
    requiredByRoleIds?: string[];
    departmentId?: string;
  }[];
  roles: {
    id?: string;
    name: string;
    description?: string;
    inheritsFromId?: string;
    icon?: string;
    requiredSkills?: { skillId: string; level: number }[];
  }[];
}): CatalogEntities | null {
  const extract = extractCatalogFromState(state, {
    catalogId: "live",
    name: "live",
    version: "0.0.0",
  });
  return extract.package?.entities ?? null;
}

export const createCatalogSlice =
  (db: DbService, caps: AppCapabilities): AppSlice<CatalogSlice> =>
  (set, get) => ({
    lastCatalogApplyReport: null,
    lastCatalogExtractWarnings: [],
    storedCatalogReleases: [],
    hasUnpublishedCatalogChanges: false,

    extractCatalog: async (meta) => {
      const denied = checkCapability(caps, "catalogExport", "extractCatalog");
      if (!denied.ok) {
        set({ error: denied.reason });
        return {
          ok: false,
          errors: [
            {
              path: "capabilities",
              message: denied.reason,
              severity: "error" as const,
            },
          ],
          report: {
            warnings: [],
            orphanSkillRoleLinks: [],
            counts: {
              categories: 0,
              subcategories: 0,
              skills: 0,
              roles: 0,
            },
          },
        };
      }

      const state = get();
      const result = extractCatalogFromState(
        {
          categories: state.categories,
          subcategories: state.subcategories,
          skills: state.skills,
          roles: state.roles,
        },
        meta
      );

      set({
        lastCatalogExtractWarnings: result.report.warnings.map((w) => w.message),
      });
      return result;
    },

    downloadCatalogPackage: (pkg, options) => {
      const blob = new Blob([JSON.stringify(pkg, null, 2)], {
        type: "application/json",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = catalogDownloadFilename(pkg.meta);
      a.click();
      URL.revokeObjectURL(url);

      // Companion TXT with human-readable change description
      if (options?.notesText) {
        // slight delay so browsers don't drop the second download
        window.setTimeout(() => {
          downloadTextFile(
            catalogReleaseNotesFilename(pkg.meta),
            options.notesText!
          );
        }, 150);
      }
    },

    publishCatalogRelease: async (options) => {
      const denied = checkCapability(
        caps,
        "catalogVersioning",
        "publishCatalogRelease"
      );
      if (!denied.ok) {
        // Fall back to plain export if versioning not available
        const exportDenied = checkCapability(
          caps,
          "catalogExport",
          "publishCatalogRelease"
        );
        if (!exportDenied.ok) {
          set({ error: denied.reason });
          return {
            ok: false,
            errors: [
              {
                path: "capabilities",
                message: denied.reason,
                severity: "error" as const,
              },
            ],
            report: {
              warnings: [],
              orphanSkillRoleLinks: [],
              counts: {
                categories: 0,
                subcategories: 0,
                skills: 0,
                roles: 0,
              },
            },
          };
        }
      }

      const state = get();
      const previous = state.installedCatalogMeta;
      const currentVersion = previous?.version || "0.0.0";
      let nextVersion = options.version;
      if (!nextVersion) {
        nextVersion = bumpSemVer(currentVersion, options.bump || "minor");
      }
      if (!isValidSemVer(nextVersion)) {
        const message = `Ungültige Version: ${nextVersion}`;
        set({ error: message });
        return {
          ok: false,
          errors: [
            { path: "version", message, severity: "error" as const },
          ],
          report: {
            warnings: [],
            orphanSkillRoleLinks: [],
            counts: {
              categories: 0,
              subcategories: 0,
              skills: 0,
              roles: 0,
            },
          },
        };
      }

      const today = new Date().toISOString().slice(0, 10);
      const newEntry: CatalogChangelogEntry = {
        version: nextVersion,
        date: today,
        notes: options.releaseNotes.trim() || `Release ${nextVersion}`,
      };
      const previousChangelog: CatalogChangelogEntry[] =
        previous?.changelog || [];
      // Newest first
      const changelog = [
        newEntry,
        ...previousChangelog.filter((e) => e.version !== nextVersion),
      ];

      const extract = extractCatalogFromState(
        {
          categories: state.categories,
          subcategories: state.subcategories,
          skills: state.skills,
          roles: state.roles,
        },
        {
          catalogId: options.catalogId,
          name: options.name.trim() || "SkillGrid Katalog",
          version: nextVersion,
          publisher: options.publisher,
          changelog,
          partial: false,
        }
      );

      if (!extract.ok || !extract.package) {
        set({
          lastCatalogExtractWarnings: extract.report.warnings.map(
            (w) => w.message
          ),
          error:
            extract.errors.map((e) => e.message).join("; ") ||
            "Release fehlgeschlagen",
        });
        return extract;
      }

      // Manage publish blocks on orphan skill-role links (K18)
      if (
        caps.catalogVersioning &&
        extract.report.orphanSkillRoleLinks.length > 0
      ) {
        const message =
          "Release blockiert: Skills haben Rollen-Links, die nicht in Rollen.requiredSkills stehen. Bitte unter Rollen bereinigen.";
        set({ error: message });
        return {
          ok: false,
          errors: [
            { path: "requiredSkills", message, severity: "error" as const },
          ],
          report: extract.report,
        };
      }

      let pkg = extract.package;
      pkg = await withContentHash(pkg);

      // Baseline for TXT change list = previous latest release (before we archive)
      let previousList =
        get().storedCatalogReleases.length > 0
          ? get().storedCatalogReleases
          : await db.getCatalogReleases();
      const previousRelease = previousList[0] ?? null;

      const notesText = buildCatalogReleaseNotesText({
        pkg,
        notes: newEntry.notes,
        previousPackage: previousRelease?.package ?? null,
        previousVersion: previousRelease?.version ?? null,
      });

      const meta: CatalogMeta = pkg.meta;
      await get().setInstalledCatalogMeta(meta);

      // Archive full snapshot (keep last 10)
      try {
        const release: StoredCatalogRelease = {
          id: pkg.meta.version,
          version: pkg.meta.version,
          publishedAt: pkg.meta.publishedAt,
          notes: newEntry.notes,
          contentHash: pkg.contentHash || (await computeContentHash(pkg.entities)),
          package: pkg,
        };
        const list = await db.saveCatalogRelease(release);
        set({
          storedCatalogReleases: list,
          hasUnpublishedCatalogChanges: false,
        });
      } catch (e) {
        console.error("Failed to archive catalog release", e);
        // still return success for download path
      }

      if (options.download !== false) {
        get().downloadCatalogPackage(pkg, { notesText });
      }

      set({
        lastCatalogExtractWarnings: extract.report.warnings.map(
          (w) => w.message
        ),
      });

      return { ...extract, package: pkg, ok: true };
    },

    refreshCatalogReleases: async () => {
      try {
        const list = await db.getCatalogReleases();
        set({ storedCatalogReleases: list });
        await get().refreshCatalogDirtyState();
      } catch (e) {
        console.error(e);
        set({ storedCatalogReleases: [] });
      }
    },

    refreshCatalogDirtyState: async () => {
      try {
        const state = get();
        const live = liveEntitiesFromState(state);
        if (!live) {
          set({ hasUnpublishedCatalogChanges: false });
          return;
        }
        const releases =
          state.storedCatalogReleases.length > 0
            ? state.storedCatalogReleases
            : await db.getCatalogReleases();
        const latest = releases[0];
        if (!latest) {
          // No release yet: dirty if catalog has any entities
          const hasAny =
            live.categories.length +
              live.skills.length +
              live.roles.length >
            0;
          set({ hasUnpublishedCatalogChanges: hasAny });
          return;
        }
        // MUST use same comparison as Diff UI (not raw contentHash — that
        // falsely flagged catalogSource / requiredByRoleIds noise).
        const baseline = latest.package?.entities ?? live;
        const diff = diffCatalogEntities(live, baseline);
        set({ hasUnpublishedCatalogChanges: !diff.isIdentical });
      } catch (e) {
        console.error(e);
        set({ hasUnpublishedCatalogChanges: false });
      }
    },

    diffAgainstRelease: async (releaseId) => {
      const state = get();
      const live = liveEntitiesFromState(state);
      if (!live) return null;

      let release: StoredCatalogRelease | null = null;
      if (releaseId) {
        release = await db.getCatalogRelease(releaseId);
      } else {
        const list =
          state.storedCatalogReleases.length > 0
            ? state.storedCatalogReleases
            : await db.getCatalogReleases();
        release = list[0] ?? null;
      }
      if (!release) return null;

      return diffCatalogEntities(live, release.package.entities);
    },

    rollbackToRelease: async (releaseId) => {
      const denied = checkCapability(
        caps,
        "catalogAuthoring",
        "rollbackToRelease"
      );
      if (!denied.ok) {
        set({ error: denied.reason });
        return {
          ok: false,
          errors: [
            {
              path: "capabilities",
              message: denied.reason,
              severity: "error" as const,
            },
          ],
        };
      }

      const release = await db.getCatalogRelease(releaseId);
      if (!release) {
        const message = `Release ${releaseId} nicht gefunden`;
        set({ error: message });
        return {
          ok: false,
          errors: [
            { path: "releaseId", message, severity: "error" as const },
          ],
        };
      }

      // Restore exact snapshot: soft-deprecate anything not in that release
      const result = await applyCatalogPackage(db, release.package, {
        missingPolicy: "soft",
        allowDowngrade: true,
        allowCatalogIdChange: true,
      });

      if (result.ok) {
        // Point "aktuell freigegeben" at the restored snapshot (not newest archive entry)
        await get().setInstalledCatalogMeta(release.package.meta);
        await get().refreshAllData();
        await get().refreshCatalogReleases();
        await get().refreshCatalogDirtyState();
      } else {
        set({
          error:
            result.errors.map((e) => e.message).join("; ") ||
            "Rollback fehlgeschlagen",
        });
      }
      return result;
    },

    redownloadRelease: async (releaseId) => {
      const release = await db.getCatalogRelease(releaseId);
      if (!release) {
        throw new Error(`Release ${releaseId} nicht gefunden`);
      }
      let list =
        get().storedCatalogReleases.length > 0
          ? get().storedCatalogReleases
          : await db.getCatalogReleases();
      const idx = list.findIndex((r) => r.id === release.id);
      // list is newest-first; previous release is the next older entry
      const previous = idx >= 0 ? list[idx + 1] : null;
      const notesText = buildCatalogReleaseNotesText({
        pkg: release.package,
        notes: release.notes,
        previousPackage: previous?.package ?? null,
        previousVersion: previous?.version ?? null,
      });
      get().downloadCatalogPackage(release.package, { notesText });
    },

    exportManageBackup: async (label) => {
      // Manage disaster recovery — not gated by fullBackupExport
      if (caps.variant !== "manage" && !caps.catalogVersioning) {
        throw new Error(
          "Globales Manage-Backup nur in SkillGrid Manage verfügbar"
        );
      }

      const state = get();
      const settings = await db.getSettings();
      let releases = state.storedCatalogReleases;
      if (!releases.length) {
        releases = await db.getCatalogReleases();
      }

      const pkg: ManageBackupPackage = {
        format: MANAGE_BACKUP_FORMAT,
        formatVersion: MANAGE_BACKUP_FORMAT_VERSION,
        exportedAt: new Date().toISOString(),
        label: label || state.projectTitle || "SkillGrid Manage",
        data: {
          categories: state.categories,
          subcategories: state.subcategories,
          skills: state.skills,
          roles: state.roles,
          settings: {
            id: "default",
            projectTitle: state.projectTitle || settings.projectTitle || "",
            updatedAt: Date.now(),
            installedCatalogMeta:
              state.installedCatalogMeta ??
              settings.installedCatalogMeta ??
              undefined,
          },
          catalogReleases: releases,
        },
      };

      const blob = new Blob([JSON.stringify(pkg, null, 2)], {
        type: "application/json",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = manageBackupFilename(pkg.label);
      a.click();
      URL.revokeObjectURL(url);

      set({ hasUnsavedChanges: false });
      return pkg;
    },

    importManageBackup: async (jsonData) => {
      if (caps.variant !== "manage" && !caps.catalogVersioning) {
        throw new Error(
          "Globales Manage-Backup nur in SkillGrid Manage verfügbar"
        );
      }

      let raw: unknown;
      try {
        raw = JSON.parse(jsonData);
      } catch {
        throw new Error("Ungültige JSON-Datei");
      }

      const validation = validateManageBackup(raw);
      if (!validation.ok || !validation.package) {
        throw new Error(validation.errors.join("; "));
      }

      const backup = validation.package;
      await db.importManageCatalogData(backup.data);
      await get().refreshAllData();
      await get().refreshCatalogReleases();
    },

    importCatalog: async (jsonOrPackage, options) => {
      const denied = checkCapability(caps, "catalogImport", "importCatalog");
      if (!denied.ok) {
        const result: CatalogApplyResult = {
          ok: false,
          errors: [
            {
              path: "capabilities",
              message: denied.reason,
              severity: "error",
            },
          ],
        };
        set({ error: denied.reason });
        return result;
      }

      try {
        const raw =
          typeof jsonOrPackage === "string"
            ? JSON.parse(jsonOrPackage)
            : jsonOrPackage;

        const result = await applyCatalogPackage(db, raw, options);
        if (result.ok) {
          set({ lastCatalogApplyReport: result.report ?? null });
          // refreshAllData reloads installedCatalogMeta from settings (set by apply)
          await get().refreshAllData();
        } else {
          set({
            error: result.errors.map((e) => e.message).join("; ") || "Catalog import failed",
          });
        }
        return result;
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Catalog import failed";
        set({ error: message });
        return {
          ok: false,
          errors: [
            { path: "", message, severity: "error" as const },
          ],
        };
      }
    },

    importOpsData: async (jsonData, options) => {
      const denied = checkCapability(
        caps,
        "selectiveOpsImport",
        "importOpsData"
      );
      if (!denied.ok) {
        set({ error: denied.reason });
        throw new Error(denied.reason);
      }

      try {
        const data: ExportData = JSON.parse(jsonData);
        const report = await importOpsFromExportData(db, data, options);
        await get().refreshAllData();
        return report;
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Ops import failed";
        set({ error: message });
        throw err;
      }
    },
  });

/** Helper used by Full extract-and-download UX */
export async function extractAndHashCatalog(
  state: {
    categories: CategoryLike[];
    subcategories: SubCategoryLike[];
    skills: SkillLike[];
    roles: RoleLike[];
  },
  meta: CatalogExtractMetaInput
) {
  const result = extractCatalogFromState(state, meta);
  if (!result.ok || !result.package) return result;
  const hashed = await withContentHash(result.package);
  return { ...result, package: hashed };
}

// local aliases to avoid circular type imports in helper
type CategoryLike = { id?: string; name: string; description?: string };
type SubCategoryLike = {
  id?: string;
  categoryId: string;
  parentSubCategoryId?: string;
  name: string;
};
type SkillLike = {
  id?: string;
  subCategoryId: string;
  name: string;
  requiredByRoleIds?: string[];
  departmentId?: string;
};
type RoleLike = {
  id?: string;
  name: string;
  requiredSkills?: { skillId: string; level: number }[];
};
