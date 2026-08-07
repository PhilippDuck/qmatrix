import { db } from "../../services/indexeddb";
import type { AppSlice, HistorySlice } from "../types";

export const createHistorySlice: AppSlice<HistorySlice> = (set, get) => ({
  changeHistory: [],

  refreshChangeHistory: async () => {
    try {
      const history = await db.getRecentChangeHistory(20);
      set({ changeHistory: history || [] });
    } catch (err) {
      console.error(err);
    }
  },

  undoChange: async (historyEntryId: string) => {
    try {
      const entry = await db.getChangeHistoryById(historyEntryId);
      if (!entry || entry.undone) {
        throw new Error("Eintrag nicht gefunden oder bereits rückgängig gemacht");
      }

      switch (entry.action) {
        case "create":
          switch (entry.entityType) {
            case "employee":
              await db.deleteEmployee(entry.entityId);
              break;
            case "category":
              await db.deleteCategory(entry.entityId);
              break;
            case "subcategory":
              await db.deleteSubCategory(entry.entityId);
              break;
            case "skill":
              await db.deleteSkill(entry.entityId);
              break;
            case "department":
              await db.deleteDepartment(entry.entityId);
              break;
            case "role":
              await db.deleteRole(entry.entityId);
              break;
            case "qualificationPlan":
              await db.deleteQualificationPlan(entry.entityId);
              break;
            case "qualificationMeasure":
              await db.deleteQualificationMeasure(entry.entityId);
              break;
            case "assessment": {
              const parts = entry.entityId.split("-");
              const empId = parts.slice(0, 5).join("-");
              const sklId = parts.slice(5).join("-");
              await db.deleteAssessment(empId, sklId);
              break;
            }
            case "savedView":
              await db.deleteSavedView(entry.entityId);
              break;
          }
          break;

        case "update":
          if (entry.previousData) {
            const prev = entry.previousData as Record<string, unknown> & { id?: string };
            const { id: _id, ...dataWithoutId } = prev;
            switch (entry.entityType) {
              case "employee":
                await db.updateEmployee(entry.entityId, dataWithoutId as never);
                break;
              case "category":
                await db.updateCategory(entry.entityId, dataWithoutId as never);
                break;
              case "subcategory":
                await db.updateSubCategory(entry.entityId, dataWithoutId as never);
                break;
              case "skill":
                await db.updateSkill(entry.entityId, dataWithoutId as never);
                break;
              case "department":
                await db.updateDepartment(entry.entityId, dataWithoutId as never);
                break;
              case "role":
                await db.updateRole(entry.entityId, dataWithoutId as never);
                break;
              case "qualificationPlan":
                await db.updateQualificationPlan(entry.entityId, dataWithoutId as never);
                break;
              case "qualificationMeasure":
                await db.updateQualificationMeasure(entry.entityId, dataWithoutId as never);
                break;
              case "assessment":
                await db.execute("assessments", "put", entry.previousData);
                break;
              case "savedView":
                await db.updateSavedView(entry.entityId, dataWithoutId as never);
                break;
            }
          } else {
            throw new Error("Wiederherstellung fehlgeschlagen: Keine vorherigen Daten gefunden.");
          }
          break;

        case "delete":
          if (entry.previousData) {
            const prev = entry.previousData as Record<string, unknown> & {
              _cascade?: {
                subcategories?: unknown[];
                skills?: unknown[];
                assessments?: unknown[];
                qualificationPlans?: unknown[];
                qualificationMeasures?: unknown[];
              };
            };
            const { _cascade, ...mainData } = prev;
            const restoreCascade = async (
              cascade: NonNullable<typeof prev._cascade> | undefined
            ) => {
              if (!cascade) return;
              if (cascade.subcategories) {
                for (const sc of cascade.subcategories) {
                  await db.execute("subcategories", "put", sc);
                }
              }
              if (cascade.skills) {
                for (const s of cascade.skills) await db.execute("skills", "put", s);
              }
              if (cascade.assessments) {
                for (const a of cascade.assessments) await db.execute("assessments", "put", a);
              }
              if (cascade.qualificationPlans) {
                for (const p of cascade.qualificationPlans) {
                  await db.execute("qualificationPlans", "put", p);
                }
              }
              if (cascade.qualificationMeasures) {
                for (const m of cascade.qualificationMeasures) {
                  await db.execute("qualificationMeasures", "put", m);
                }
              }
            };

            switch (entry.entityType) {
              case "employee":
                await db.execute("employees", "put", { ...mainData, id: entry.entityId });
                await restoreCascade(_cascade);
                break;
              case "category":
                await db.execute("categories", "put", { ...mainData, id: entry.entityId });
                await restoreCascade(_cascade);
                break;
              case "subcategory":
                await db.execute("subcategories", "put", { ...mainData, id: entry.entityId });
                await restoreCascade(_cascade);
                break;
              case "skill":
                await db.execute("skills", "put", { ...mainData, id: entry.entityId });
                await restoreCascade(_cascade);
                break;
              case "department":
                await db.execute("departments", "put", { ...mainData, id: entry.entityId });
                break;
              case "role":
                await db.execute("roles", "put", { ...mainData, id: entry.entityId });
                break;
              case "qualificationPlan":
                await db.execute("qualificationPlans", "put", {
                  ...mainData,
                  id: entry.entityId,
                });
                await restoreCascade(_cascade);
                break;
              case "qualificationMeasure":
                await db.execute("qualificationMeasures", "put", {
                  ...mainData,
                  id: entry.entityId,
                });
                break;
              case "assessment":
                await db.execute("assessments", "put", { ...mainData, id: entry.entityId });
                break;
              case "savedView":
                await db.execute("savedViews", "put", { ...mainData, id: entry.entityId });
                break;
            }
          }
          break;
      }
      await db.markHistoryEntryUndone(historyEntryId);
      await get().refreshAllData();
    } catch (err) {
      set({
        error: err instanceof Error ? err.message : "Fehler beim Rückgängig machen",
      });
      throw err;
    }
  },
});
