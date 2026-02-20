// Import types needed for the function signatures
export interface BaseSubCategory {
    id?: string;
    categoryId?: string;
    parentSubCategoryId?: string;
}

export interface BaseSkill {
    id?: string;
    subCategoryId: string;
}

/**
 * Helper function to recursively get all subcategory IDs (including nested ones) for a given category.
 */
export const getAllSubcategoryIdsForCategory = (
    categoryId: string,
    allSubcategories: BaseSubCategory[]
): string[] => {
    const ids: string[] = [];

    // Get root-level subcategories for this category
    const rootSubs = allSubcategories.filter(s =>
        s.categoryId === categoryId && !s.parentSubCategoryId
    );

    // Recursive helper to collect children
    const collectChildren = (parentId: string) => {
        const children = allSubcategories.filter(s => s.parentSubCategoryId === parentId);
        children.forEach(child => {
            ids.push(child.id!);
            collectChildren(child.id!); // Recurse into deeper levels
        });
    };

    // Add root subs and their descendants
    rootSubs.forEach(sub => {
        ids.push(sub.id!);
        collectChildren(sub.id!);
    });

    return ids;
};

/**
 * Get ALL skill IDs for a given Category (including from all nested subcategories).
 */
export const getAllSkillIdsForCategory = (
    categoryId: string,
    allSubcategories: BaseSubCategory[],
    allSkills: BaseSkill[]
): string[] => {
    const allSubIds = getAllSubcategoryIdsForCategory(categoryId, allSubcategories);
    return allSkills
        .filter((s) => allSubIds.includes(s.subCategoryId))
        .map((s) => s.id!);
};

/**
 * Collect all skill IDs recursively (direct + descendants) for exactly one Subcategory.
 */
export const getAllSkillIdsForSubcategory = (
    subId: string,
    allSubcategories: BaseSubCategory[],
    allSkills: BaseSkill[]
): string[] => {
    const directSkills = allSkills.filter(s => s.subCategoryId === subId).map(s => s.id!);
    const children = allSubcategories.filter(s => s.parentSubCategoryId === subId);
    const childSkills = children.flatMap(child => getAllSkillIdsForSubcategory(child.id!, allSubcategories, allSkills));
    return [...directSkills, ...childSkills];
};
