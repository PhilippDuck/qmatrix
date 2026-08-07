import type { DbService } from "../../services/indexeddb";
import type { AppCapabilities } from "../../types/capabilities";
import type { ExportData } from "../../types";
import { checkCapability } from "../capabilities";
import type { AppSlice, DataMgmtSlice } from "../types";

function requireCap(
  caps: AppCapabilities,
  key: "fullBackupExport" | "fullBackupImport",
  action: string
): void {
  const result = checkCapability(caps, key, action);
  if (!result.ok) {
    if (import.meta.env.DEV) console.error(result.reason);
    throw new Error(result.reason);
  }
}

export const createDataMgmtSlice = (db: DbService, caps: AppCapabilities): AppSlice<DataMgmtSlice> => (set, get) => ({
  exportData: async () => {
    try {
      requireCap(caps, "fullBackupExport", "exportData");
      const dbData = await db.exportData();
      const state = get();
      const data: ExportData = {
        ...dbData,
        savedViews: state.savedViews,
      };

      const blob = new Blob([JSON.stringify(data, null, 2)], {
        type: "application/json",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      const now = new Date();
      const dateStr = now.toISOString().split("T")[0];
      const timeStr = now.toLocaleTimeString("de-DE").replace(/:/g, "-");
      const safeTitle = (state.projectTitle || "SkillGrid").replace(/[^a-z0-9]/gi, "_");
      a.download = `${safeTitle}_Backup_${dateStr}_${timeStr}.json`;
      a.click();
      URL.revokeObjectURL(url);

      set({ hasUnsavedChanges: false });

      return data;
    } catch (err) {
      set({ error: err instanceof Error ? err.message : "Failed to export data" });
      throw err;
    }
  },

  importData: async (jsonData) => {
    try {
      requireCap(caps, "fullBackupImport", "importData");
      const data = JSON.parse(jsonData);
      await db.importData(data);
      await get().refreshAllData();
    } catch (err) {
      set({ error: err instanceof Error ? err.message : "Failed to import" });
      throw err;
    }
  },

  mergeData: async (jsonData) => {
    try {
      requireCap(caps, "fullBackupImport", "mergeData");
      const data: ExportData = JSON.parse(jsonData);
      const report = await db.mergeData(data);
      await get().refreshAllData();
      return report;
    } catch (err) {
      set({ error: err instanceof Error ? err.message : "Failed to merge" });
      throw err;
    }
  },

  diffData: async (jsonData) => {
    try {
      requireCap(caps, "fullBackupImport", "diffData");
      const data: ExportData = JSON.parse(jsonData);
      return await db.diffData(data);
    } catch (err) {
      set({ error: err instanceof Error ? err.message : "Failed to diff" });
      throw err;
    }
  },

  applyMerge: async (diff, selectedIds) => {
    try {
      requireCap(caps, "fullBackupImport", "applyMerge");
      const report = await db.applyMerge(diff, selectedIds);
      await get().refreshAllData();
      return report;
    } catch (err) {
      set({ error: err instanceof Error ? err.message : "Failed" });
      throw err;
    }
  },

  clearAllData: async () => {
    try {
      await db.clearAllData();
      await get().refreshAllData();
    } catch (err) {
      set({ error: err instanceof Error ? err.message : "Failed" });
      throw err;
    }
  },
});
