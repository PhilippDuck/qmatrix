import { describe, it, expect } from "vitest";
import {
  blueprintBadgeLabel,
  filterOperationalCategories,
  filterOperationalRoles,
  filterOperationalSkills,
  filterOperationalSubcategories,
  isBlueprintEntity,
  isSkillVisibleInMatrix,
} from "./catalogVisibility";
import type { Category, EmployeeRole, Skill, SubCategory } from "../types";

const officialCat: Category = { id: "c1", name: "Technik" };
const blueprintCat: Category = {
  id: "c2",
  name: "Vorschlag",
  catalogSource: "blueprint",
};
const officialSub: SubCategory = {
  id: "s1",
  name: "Backend",
  categoryId: "c1",
};
const blueprintSub: SubCategory = {
  id: "s2",
  name: "ML",
  categoryId: "c1",
  catalogSource: "blueprint",
};
const officialSkill: Skill = {
  id: "k1",
  name: "Node",
  subCategoryId: "s1",
};
const blueprintSkill: Skill = {
  id: "k2",
  name: "Go",
  subCategoryId: "s1",
  catalogSource: "blueprint",
};
const nestedSkill: Skill = {
  id: "k3",
  name: "PyTorch",
  subCategoryId: "s2",
};
const deprecatedSkill: Skill = {
  id: "k4",
  name: "Perl",
  subCategoryId: "s1",
  catalogDeprecated: true,
};

describe("catalogVisibility", () => {
  it("detects blueprints and labels them", () => {
    expect(isBlueprintEntity(blueprintSkill)).toBe(true);
    expect(isBlueprintEntity(officialSkill)).toBe(false);
    expect(blueprintBadgeLabel(blueprintSkill)).toBe("Blaupause");
    expect(blueprintBadgeLabel(officialSkill)).toBeNull();
  });

  it("hides blueprint skills from the matrix", () => {
    expect(
      isSkillVisibleInMatrix(
        blueprintSkill,
        [officialSub],
        [officialCat],
        false
      )
    ).toBe(false);
    expect(
      isSkillVisibleInMatrix(officialSkill, [officialSub], [officialCat], false)
    ).toBe(true);
  });

  it("hides skills under blueprint ancestors", () => {
    expect(
      isSkillVisibleInMatrix(
        nestedSkill,
        [officialSub, blueprintSub],
        [officialCat],
        false
      )
    ).toBe(false);
  });

  it("hides deprecated skills unless showDeprecated", () => {
    expect(
      isSkillVisibleInMatrix(
        deprecatedSkill,
        [officialSub],
        [officialCat],
        false
      )
    ).toBe(false);
    expect(
      isSkillVisibleInMatrix(deprecatedSkill, [officialSub], [officialCat], true)
    ).toBe(true);
  });

  it("filters operational collections", () => {
    const skills = filterOperationalSkills(
      [officialSkill, blueprintSkill, nestedSkill, deprecatedSkill],
      [officialSub, blueprintSub],
      [officialCat]
    );
    expect(skills.map((s) => s.id)).toEqual(["k1"]);

    const roles: EmployeeRole[] = [
      { id: "r1", name: "Dev" },
      { id: "r2", name: "Draft", catalogSource: "blueprint" },
    ];
    expect(filterOperationalRoles(roles).map((r) => r.id)).toEqual(["r1"]);
    expect(
      filterOperationalCategories([officialCat, blueprintCat]).map((c) => c.id)
    ).toEqual(["c1"]);
    expect(
      filterOperationalSubcategories(
        [officialSub, blueprintSub],
        [officialCat]
      ).map((s) => s.id)
    ).toEqual(["s1"]);
  });
});
