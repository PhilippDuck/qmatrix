import { db } from "../../services/indexeddb";
import type { SubCategory } from "../../types";
import { recordChange } from "../recordChange";
import type { AppSlice, HierarchySlice } from "../types";

export const createHierarchySlice: AppSlice<HierarchySlice> = (set, get) => ({
  categories: [],
  subcategories: [],
  skills: [],

  addCategory: async (category) => {
    try {
      const id = await db.addCategory(category);
      const newCategory = { ...category, id, updatedAt: Date.now() };
      set((state) => ({ categories: [...state.categories, newCategory] }));
      await recordChange(get, "category", id, category.name, "create", null, newCategory);
      return id;
    } catch (err) {
      set({ error: err instanceof Error ? err.message : "Failed to add category" });
      throw err;
    }
  },

  updateCategory: async (id, category) => {
    try {
      const existing = get().categories.find((c) => c.id === id);
      const updatedCategory = { ...existing, ...category, id, updatedAt: Date.now() };

      set((state) => ({
        categories: state.categories.map((c) => (c.id === id ? updatedCategory : c)),
      }));

      await db.updateCategory(id, category);
      await recordChange(get, "category", id, category.name, "update", existing, updatedCategory);
    } catch (err) {
      set({ error: err instanceof Error ? err.message : "Failed to update category" });
      await get().refreshAllData();
      throw err;
    }
  },

  deleteCategory: async (id) => {
    try {
      const state = get();
      const existing = state.categories.find((c) => c.id === id);
      const cascadeSubcategories = state.subcategories.filter((sc) => sc.categoryId === id);
      const cascadeSubIds = cascadeSubcategories.map((s) => s.id!);
      const cascadeSkills = state.skills.filter((s) => cascadeSubIds.includes(s.subCategoryId));
      const cascadeSkillIds = cascadeSkills.map((s) => s.id!);
      const cascadeAssessments = state.assessments.filter((a) =>
        cascadeSkillIds.includes(a.skillId)
      );
      const _cascade = {
        subcategories: cascadeSubcategories,
        skills: cascadeSkills,
        assessments: cascadeAssessments,
      };

      set((s) => ({
        categories: s.categories.filter((c) => c.id !== id),
        subcategories: s.subcategories.filter((sc) => sc.categoryId !== id),
        skills: s.skills.filter((sk) => !cascadeSubIds.includes(sk.subCategoryId)),
        assessments: s.assessments.filter((a) => !cascadeSkillIds.includes(a.skillId)),
      }));

      await db.deleteCategory(id);
      await recordChange(
        get,
        "category",
        id,
        existing?.name || id,
        "delete",
        { ...existing, _cascade },
        null
      );
    } catch (err) {
      set({ error: err instanceof Error ? err.message : "Failed to delete category" });
      await get().refreshAllData();
      throw err;
    }
  },

  addSubCategory: async (subCategory) => {
    try {
      const id = await db.addSubCategory(subCategory);
      const newSubCategory = { ...subCategory, id, updatedAt: Date.now() };
      set((state) => ({ subcategories: [...state.subcategories, newSubCategory] }));
      await recordChange(get, "subcategory", id, subCategory.name, "create", null, newSubCategory);
      return id;
    } catch (err) {
      set({ error: err instanceof Error ? err.message : "Failed to add subcategory" });
      throw err;
    }
  },

  updateSubCategory: async (id, subCategory) => {
    try {
      const existing = get().subcategories.find((sc) => sc.id === id);
      const updatedSubCategory = { ...existing, ...subCategory, id, updatedAt: Date.now() };

      set((state) => ({
        subcategories: state.subcategories.map((sc) =>
          sc.id === id ? updatedSubCategory : sc
        ),
      }));

      await db.updateSubCategory(id, subCategory);
      await recordChange(
        get,
        "subcategory",
        id,
        subCategory.name,
        "update",
        existing,
        updatedSubCategory
      );
    } catch (err) {
      set({ error: err instanceof Error ? err.message : "Failed to update subcategory" });
      await get().refreshAllData();
      throw err;
    }
  },

  deleteSubCategory: async (id) => {
    try {
      const state = get();
      const existing = state.subcategories.find((sc) => sc.id === id);

      const collectChildren = (parentId: string): SubCategory[] => {
        const children = state.subcategories.filter((sc) => sc.parentSubCategoryId === parentId);
        return children.concat(children.flatMap((c) => collectChildren(c.id!)));
      };
      const cascadeSubcategories = collectChildren(id);
      const allSubcategoryIds = [id, ...cascadeSubcategories.map((sc) => sc.id!)];
      const cascadeSkills = state.skills.filter((s) =>
        allSubcategoryIds.includes(s.subCategoryId)
      );
      const cascadeSkillIds = cascadeSkills.map((s) => s.id!);
      const cascadeAssessments = state.assessments.filter((a) =>
        cascadeSkillIds.includes(a.skillId)
      );

      set((s) => ({
        subcategories: s.subcategories.filter((sc) => !allSubcategoryIds.includes(sc.id!)),
        skills: s.skills.filter((sk) => !allSubcategoryIds.includes(sk.subCategoryId)),
        assessments: s.assessments.filter((a) => !cascadeSkillIds.includes(a.skillId)),
      }));

      await db.deleteSubCategory(id);
      await recordChange(
        get,
        "subcategory",
        id,
        existing?.name || id,
        "delete",
        {
          ...existing,
          _cascade: {
            subcategories: cascadeSubcategories,
            skills: cascadeSkills,
            assessments: cascadeAssessments,
          },
        },
        null
      );
    } catch (err) {
      set({ error: err instanceof Error ? err.message : "Failed to delete subcategory" });
      await get().refreshAllData();
      throw err;
    }
  },

  getSubCategoriesByCategory: (categoryId) =>
    get().subcategories.filter((sc) => sc.categoryId === categoryId && !sc.parentSubCategoryId),

  getSubCategoriesByParent: (parentSubCategoryId) =>
    get().subcategories.filter((sc) => sc.parentSubCategoryId === parentSubCategoryId),

  addSkill: async (skill) => {
    try {
      const id = await db.addSkill(skill);
      const newSkill = { ...skill, id, updatedAt: Date.now() };
      set((state) => ({ skills: [...state.skills, newSkill] }));
      await recordChange(get, "skill", id, skill.name, "create", null, newSkill);
    } catch (err) {
      set({ error: err instanceof Error ? err.message : "Failed to add skill" });
      throw err;
    }
  },

  updateSkill: async (id, skill) => {
    try {
      const existing = get().skills.find((s) => s.id === id);
      const updatedSkill = { ...existing, ...skill, id, updatedAt: Date.now() };

      set((state) => ({
        skills: state.skills.map((s) => (s.id === id ? updatedSkill : s)),
      }));

      await db.updateSkill(id, skill);
      await recordChange(get, "skill", id, skill.name, "update", existing, updatedSkill);
    } catch (err) {
      set({ error: err instanceof Error ? err.message : "Failed to update skill" });
      await get().refreshAllData();
      throw err;
    }
  },

  deleteSkill: async (id) => {
    try {
      const existing = get().skills.find((s) => s.id === id);
      const cascadeAssessments = get().assessments.filter((a) => a.skillId === id);

      set((state) => ({
        skills: state.skills.filter((s) => s.id !== id),
        assessments: state.assessments.filter((a) => a.skillId !== id),
      }));

      await db.deleteSkill(id);
      await recordChange(
        get,
        "skill",
        id,
        existing?.name || id,
        "delete",
        { ...existing, _cascade: { assessments: cascadeAssessments } },
        null
      );
    } catch (err) {
      set({ error: err instanceof Error ? err.message : "Failed to delete skill" });
      await get().refreshAllData();
      throw err;
    }
  },

  getSkillsBySubCategory: (subCategoryId) =>
    get().skills.filter((s) => s.subCategoryId === subCategoryId),
});
