import type { DbService } from "../../services/indexeddb";
import type { Category, Skill, SubCategory } from "../../types";
import { createEntityCrudHandlers, nameLabel } from "../createEntityCrud";
import type { AppSlice, HierarchySlice } from "../types";

export const createHierarchySlice = (db: DbService): AppSlice<HierarchySlice> => (set, get) => {
  const categories = createEntityCrudHandlers<Category>(db, set, get, {
    entityType: "category",
    listKey: "categories",
    getLabel: nameLabel<Category>(),
    dbAdd: (data) => db.addCategory(data),
    dbUpdate: (id, data) => db.updateCategory(id, data),
    dbDelete: (id) => db.deleteCategory(id),
    errorMessage: "Failed to modify category",
    prepareDelete: (getState, id, existing) => {
      const state = getState();
      const cascadeSubcategories = state.subcategories.filter((sc) => sc.categoryId === id);
      const cascadeSubIds = cascadeSubcategories.map((s) => s.id!);
      const cascadeSkills = state.skills.filter((s) => cascadeSubIds.includes(s.subCategoryId));
      const cascadeSkillIds = cascadeSkills.map((s) => s.id!);
      const cascadeAssessments = state.assessments.filter((a) =>
        cascadeSkillIds.includes(a.skillId)
      );
      return {
        partial: {
          categories: state.categories.filter((c) => c.id !== id),
          subcategories: state.subcategories.filter((sc) => sc.categoryId !== id),
          skills: state.skills.filter((sk) => !cascadeSubIds.includes(sk.subCategoryId)),
          assessments: state.assessments.filter((a) => !cascadeSkillIds.includes(a.skillId)),
        },
        previousData: {
          ...existing,
          _cascade: {
            subcategories: cascadeSubcategories,
            skills: cascadeSkills,
            assessments: cascadeAssessments,
          },
        },
      };
    },
  });

  const subcategories = createEntityCrudHandlers<SubCategory>(db, set, get, {
    entityType: "subcategory",
    listKey: "subcategories",
    getLabel: nameLabel<SubCategory>(),
    dbAdd: (data) => db.addSubCategory(data),
    dbUpdate: (id, data) => db.updateSubCategory(id, data),
    dbDelete: (id) => db.deleteSubCategory(id),
    errorMessage: "Failed to modify subcategory",
    prepareDelete: (getState, id, existing) => {
      const state = getState();
      const collectChildren = (parentId: string): SubCategory[] => {
        const children = state.subcategories.filter((sc) => sc.parentSubCategoryId === parentId);
        return children.concat(children.flatMap((c) => collectChildren(c.id!)));
      };
      const cascadeSubs = collectChildren(id);
      const allSubcategoryIds = [id, ...cascadeSubs.map((sc) => sc.id!)];
      const cascadeSkills = state.skills.filter((s) =>
        allSubcategoryIds.includes(s.subCategoryId)
      );
      const cascadeSkillIds = cascadeSkills.map((s) => s.id!);
      const cascadeAssessments = state.assessments.filter((a) =>
        cascadeSkillIds.includes(a.skillId)
      );
      return {
        partial: {
          subcategories: state.subcategories.filter(
            (sc) => !allSubcategoryIds.includes(sc.id!)
          ),
          skills: state.skills.filter((sk) => !allSubcategoryIds.includes(sk.subCategoryId)),
          assessments: state.assessments.filter((a) => !cascadeSkillIds.includes(a.skillId)),
        },
        previousData: {
          ...existing,
          _cascade: {
            subcategories: cascadeSubs,
            skills: cascadeSkills,
            assessments: cascadeAssessments,
          },
        },
      };
    },
  });

  const skills = createEntityCrudHandlers<Skill>(db, set, get, {
    entityType: "skill",
    listKey: "skills",
    getLabel: nameLabel<Skill>(),
    dbAdd: (data) => db.addSkill(data),
    dbUpdate: (id, data) => db.updateSkill(id, data),
    dbDelete: (id) => db.deleteSkill(id),
    errorMessage: "Failed to modify skill",
    prepareDelete: (getState, id, existing) => {
      const state = getState();
      const cascadeAssessments = state.assessments.filter((a) => a.skillId === id);
      return {
        partial: {
          skills: state.skills.filter((s) => s.id !== id),
          assessments: state.assessments.filter((a) => a.skillId !== id),
        },
        previousData: {
          ...existing,
          _cascade: { assessments: cascadeAssessments },
        },
      };
    },
  });

  return {
    categories: [],
    subcategories: [],
    skills: [],

    addCategory: categories.add,
    updateCategory: categories.update,
    deleteCategory: categories.remove,

    addSubCategory: subcategories.add,
    updateSubCategory: subcategories.update,
    deleteSubCategory: subcategories.remove,
    getSubCategoriesByCategory: (categoryId) =>
      get().subcategories.filter(
        (sc) => sc.categoryId === categoryId && !sc.parentSubCategoryId
      ),
    getSubCategoriesByParent: (parentSubCategoryId) =>
      get().subcategories.filter((sc) => sc.parentSubCategoryId === parentSubCategoryId),

    addSkill: async (skill) => {
      await skills.add(skill);
    },
    updateSkill: skills.update,
    deleteSkill: skills.remove,
    getSkillsBySubCategory: (subCategoryId) =>
      get().skills.filter((s) => s.subCategoryId === subCategoryId),
  };
};
