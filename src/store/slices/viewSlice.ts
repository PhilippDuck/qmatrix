import { db } from "../../services/indexeddb";
import type { SavedView } from "../../types";
import { recordChange } from "../recordChange";
import type { AppSlice, ViewSlice } from "../types";

export const createViewSlice: AppSlice<ViewSlice> = (set, get) => ({
  savedViews: [],

  addSavedView: async (view) => {
    try {
      const currentViews = get().savedViews;
      const maxOrder =
        currentViews.length > 0 ? Math.max(...currentViews.map((v) => v.order ?? 0)) : 0;
      const viewWithOrder = { ...view, order: maxOrder + 1 };
      const id = await db.addSavedView(viewWithOrder);
      const newView = { ...viewWithOrder, id, updatedAt: Date.now() };
      set((state) => ({
        savedViews: [...state.savedViews, newView].sort(
          (a, b) => (a.order ?? 9999) - (b.order ?? 9999)
        ),
      }));
      await recordChange(get, "savedView", id, viewWithOrder.name, "create", null, newView);
      return id;
    } catch (err) {
      set({ error: err instanceof Error ? err.message : "Failed" });
      throw err;
    }
  },

  updateSavedView: async (id, view) => {
    try {
      const existing = get().savedViews.find((v) => v.id === id);
      const updatedView = { ...existing, ...view, id, updatedAt: Date.now() } as SavedView;

      set((state) => ({
        savedViews: state.savedViews.map((v) => (v.id === id ? updatedView : v)),
      }));

      await db.updateSavedView(id, view);
      await recordChange(get, "savedView", id, view.name, "update", existing, updatedView);
    } catch (err) {
      set({ error: err instanceof Error ? err.message : "Failed" });
      await get().refreshAllData();
      throw err;
    }
  },

  deleteSavedView: async (id) => {
    try {
      const existing = get().savedViews.find((v) => v.id === id);

      set((state) => ({
        savedViews: state.savedViews.filter((v) => v.id !== id),
      }));

      await db.deleteSavedView(id);
      await recordChange(get, "savedView", id, existing?.name || id, "delete", existing, null);
    } catch (err) {
      set({ error: err instanceof Error ? err.message : "Failed" });
      await get().refreshAllData();
      throw err;
    }
  },

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
      set({ error: err instanceof Error ? err.message : "Failed to reorder views" });
      await get().refreshAllData();
      throw err;
    }
  },
});
