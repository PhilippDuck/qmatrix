import { describe, it, expect } from "vitest";
import {
  TEAM_BLUEPRINT_FORMAT,
  buildTeamBlueprintExport,
  countBlueprints,
  findResolvedBlueprintIds,
  isTeamBlueprintExport,
  listBlueprintProposals,
} from "./catalogBlueprint";
import type { Category, EmployeeRole, Skill, SubCategory } from "../types";

const officialCat: Category = { id: "c1", name: "Technik" };
const officialSub: SubCategory = {
  id: "s1",
  name: "Backend",
  categoryId: "c1",
};
const officialSkill: Skill = { id: "k1", name: "Node", subCategoryId: "s1" };
const officialRole: EmployeeRole = { id: "r1", name: "Dev" };

const bpCat: Category = {
  id: "bc1",
  name: "Vorschlag-Kat",
  catalogSource: "blueprint",
};
const bpSubUnderOfficial: SubCategory = {
  id: "bs1",
  name: "ML",
  categoryId: "c1",
  catalogSource: "blueprint",
};
const bpSkillUnderOfficial: Skill = {
  id: "bk1",
  name: "Go",
  subCategoryId: "s1",
  catalogSource: "blueprint",
};
const bpSkillUnderBpSub: Skill = {
  id: "bk2",
  name: "PyTorch",
  subCategoryId: "bs1",
  catalogSource: "blueprint",
};
const bpRole: EmployeeRole = {
  id: "br1",
  name: "Architekt",
  catalogSource: "blueprint",
};

describe("buildTeamBlueprintExport", () => {
  it("includes blueprint rows and the official parent chain", () => {
    const payload = buildTeamBlueprintExport(
      [officialCat, bpCat],
      [officialSub, bpSubUnderOfficial],
      [officialSkill, bpSkillUnderOfficial, bpSkillUnderBpSub],
      [officialRole, bpRole],
      "Team Alpha"
    );
    expect(payload.format).toBe(TEAM_BLUEPRINT_FORMAT);
    expect(isTeamBlueprintExport(payload)).toBe(true);
    expect(payload.entities.skills.map((s) => s.name).sort()).toEqual([
      "Go",
      "PyTorch",
    ]);
    expect(payload.entities.categories.some((c) => c.id === "c1")).toBe(true);
    expect(payload.entities.categories.some((c) => c.id === "bc1")).toBe(true);
    expect(payload.entities.subcategories.some((s) => s.id === "s1")).toBe(
      true
    );
    expect(payload.entities.roles.map((r) => r.name)).toEqual(["Architekt"]);
    expect(
      countBlueprints(
        [officialCat, bpCat],
        [officialSub, bpSubUnderOfficial],
        [officialSkill, bpSkillUnderOfficial, bpSkillUnderBpSub],
        [officialRole, bpRole]
      )
    ).toBe(5);
  });
});

describe("listBlueprintProposals", () => {
  it("lists only blueprints with breadcrumb paths", () => {
    const items = listBlueprintProposals(
      [officialCat, bpCat],
      [officialSub, bpSubUnderOfficial],
      [officialSkill, bpSkillUnderOfficial, bpSkillUnderBpSub],
      [officialRole, bpRole]
    );
    expect(items.map((i) => i.kind)).toEqual([
      "categories",
      "subcategories",
      "skills",
      "skills",
      "roles",
    ]);
    expect(items.find((i) => i.id === "bc1")?.path).toBe("Vorschlag-Kat");
    expect(items.find((i) => i.id === "bs1")?.path).toBe("Technik › ML");
    expect(items.find((i) => i.id === "bk1")?.path).toBe("Technik › Backend › Go");
    expect(items.find((i) => i.id === "bk2")?.path).toBe(
      "Technik › ML › PyTorch"
    );
    expect(items.find((i) => i.id === "br1")?.path).toBe("Architekt");
    expect(items.some((i) => i.id === "k1")).toBe(false);
  });
});

describe("findResolvedBlueprintIds", () => {
  it("matches by name when an official counterpart exists", () => {
    const resolved = findResolvedBlueprintIds({
      categories: [
        officialCat,
        { id: "bc-dup", name: "Technik", catalogSource: "blueprint" },
      ],
      subcategories: [officialSub],
      skills: [
        officialSkill,
        {
          id: "bk-dup",
          name: "Node",
          subCategoryId: "s1",
          catalogSource: "blueprint",
        },
      ],
      roles: [
        officialRole,
        { id: "br-dup", name: "Dev", catalogSource: "blueprint" },
      ],
    });
    expect(resolved.categories).toEqual(["bc-dup"]);
    expect(resolved.skills).toEqual(["bk-dup"]);
    expect(resolved.roles).toEqual(["br-dup"]);
  });

  it("matches a blueprint skill under a blueprint sub after official ids differ", () => {
    const resolved = findResolvedBlueprintIds({
      categories: [officialCat],
      subcategories: [
        officialSub,
        { id: "off-ml", name: "ML", categoryId: "c1" },
        bpSubUnderOfficial,
      ],
      skills: [
        { id: "off-pt", name: "PyTorch", subCategoryId: "off-ml" },
        bpSkillUnderBpSub,
      ],
      roles: [],
    });
    expect(resolved.subcategories).toEqual(["bs1"]);
    expect(resolved.skills).toEqual(["bk2"]);
  });

  it("does not match unique blueprint proposals", () => {
    const resolved = findResolvedBlueprintIds({
      categories: [officialCat],
      subcategories: [officialSub],
      skills: [officialSkill, bpSkillUnderOfficial],
      roles: [officialRole, bpRole],
    });
    expect(resolved.skills).toEqual([]);
    expect(resolved.roles).toEqual([]);
  });
});
