import type { DbService } from "../../services/indexeddb";
import type { AppCapabilities } from "../../types/capabilities";
import type {
  CatalogApplyOptions,
  CatalogApplyResult,
  CatalogExtractMetaInput,
  CatalogExtractResult,
  CatalogPackage,
  OpsImportOptions,
  OpsImportReport,
} from "../../types/catalog";
import type { ExportData } from "../../types";
import {
  extractCatalogFromState,
  withContentHash,
  catalogDownloadFilename,
} from "../../services/catalog";
import {
  applyCatalogPackage,
  importOpsFromExportData,
} from "../../services/catalogApply";
import { checkCapability } from "../capabilities";
import type { AppSlice } from "../types";

export interface CatalogSlice {
  lastCatalogApplyReport: CatalogApplyResult["report"] | null;
  lastCatalogExtractWarnings: string[];

  extractCatalog: (
    meta: CatalogExtractMetaInput
  ) => Promise<CatalogExtractResult>;
  downloadCatalogPackage: (pkg: CatalogPackage) => void;
  importCatalog: (
    jsonOrPackage: string | unknown,
    options?: CatalogApplyOptions
  ) => Promise<CatalogApplyResult>;
  importOpsData: (
    jsonData: string,
    options?: OpsImportOptions
  ) => Promise<OpsImportReport>;
}

export const createCatalogSlice =
  (db: DbService, caps: AppCapabilities): AppSlice<CatalogSlice> =>
  (set, get) => ({
    lastCatalogApplyReport: null,
    lastCatalogExtractWarnings: [],

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

    downloadCatalogPackage: (pkg) => {
      const blob = new Blob([JSON.stringify(pkg, null, 2)], {
        type: "application/json",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = catalogDownloadFilename(pkg.meta);
      a.click();
      URL.revokeObjectURL(url);
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
