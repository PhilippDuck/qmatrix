import type { DbService } from "../../services/indexeddb";
import type { AppCapabilities } from "../../types/capabilities";
import type { SavedView } from "../../types";
import { createEntityCrudHandlers, nameLabel } from "../createEntityCrud";
import type { AppSlice, ViewSlice } from "../types";

export const createViewSlice = (db: DbService, caps: AppCapabilities): AppSlice<ViewSlice> => (set, get) => {
  const crud = createEntityCrudHandlers<
    SavedView,
    Omit<SavedView, "id" | "updatedAt">
  >(db, caps, set, get, {
    entityType: "savedView",
    listKey: "savedViews",
    getLabel: nameLabel<SavedView>(),
    dbAdd: (data) => db.addSavedView(data),
    dbUpdate: (id, data) => db.updateSavedView(id, data),
    dbDelete: (id) => db.deleteSavedView(id),
    afterAddList: (list) =>
      [...list].sort((a, b) => (a.order ?? 9999) - (b.order ?? 9999)),
  });

  return {
    savedViews: [],

    addSavedView: async (view) => {
      const currentViews = get().savedViews;
      const maxOrder =
        currentViews.length > 0 ? Math.max(...currentViews.map((v) => v.order ?? 0)) : 0;
      return crud.add({ ...view, order: maxOrder + 1 });
    },

    updateSavedView: crud.update,
    deleteSavedView: crud.remove,

    reorderSavedViews: async (viewIds) => {
      try {
        const currentViews = [...get().savedViews];
        const updatedViews = currentViews.map((v) => {
          const newOrder = viewIds.indexOf(v.id!);
          return { ...v, order: newOrder >= 0 ? newOrder : (v.order ?? 9999) };
        });

        set({
          savedViews: updatedViews.sort((a, b) => (a.order ?? 9999) - (b.order ?? 9999)),
        });

        await Promise.all(updatedViews.map((v) => db.updateSavedView(v.id!, v)));
      } catch (err) {
        set({
          error: err instanceof Error ? err.message : "Failed to reorder views",
        });
        await get().refreshAllData();
        throw err;
      }
    },
  };
};
