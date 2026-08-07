import { describe, it, expect } from "vitest";
import { computeSkillGapsForEmployee, findPotentialMentors } from "./skillGaps";
import type { Assessment, Category, Employee, EmployeeRole, Skill, SubCategory } from "../types";

const categories: Category[] = [{ id: "c1", name: "Tech" }];
const subcategories: SubCategory[] = [
  { id: "sc1", categoryId: "c1", name: "Frontend" },
];
const skills: Skill[] = [
  { id: "s1", subCategoryId: "sc1", name: "React" },
  { id: "s2", subCategoryId: "sc1", name: "CSS" },
];
const roles: EmployeeRole[] = [
  {
    id: "r1",
    name: "Dev",
    requiredSkills: [
      { skillId: "s1", level: 75 },
      { skillId: "s2", level: 50 },
    ],
  },
];
const employees: Employee[] = [
  { id: "e1", name: "Alice" },
  { id: "e2", name: "Bob" },
];

const baseCtx = {
  categories,
  subcategories,
  skills,
  roles,
  employees,
  assessments: [] as Assessment[],
};

describe("computeSkillGapsForEmployee", () => {
  it("returns gaps against role requirements", () => {
    const gaps = computeSkillGapsForEmployee(
      {
        ...baseCtx,
        assessments: [{ id: "a1", employeeId: "e1", skillId: "s1", level: 25 }],
      },
      "e1",
      "r1"
    );
    expect(gaps).toHaveLength(2);
    const react = gaps.find((g) => g.skillId === "s1");
    expect(react?.gap).toBe(50);
    expect(react?.categoryName).toBe("Tech");
    const css = gaps.find((g) => g.skillId === "s2");
    expect(css?.currentLevel).toBe(0);
    expect(css?.gap).toBe(50);
  });

  it("includes individual assessment targets without role", () => {
    const gaps = computeSkillGapsForEmployee(
      {
        ...baseCtx,
        assessments: [
          {
            id: "a1",
            employeeId: "e1",
            skillId: "s1",
            level: 0,
            targetLevel: 100,
          },
        ],
      },
      "e1",
      null
    );
    expect(gaps).toHaveLength(1);
    expect(gaps[0].targetLevel).toBe(100);
    expect(gaps[0].gap).toBe(100);
  });

  it("treats N/A (-1) as zero for gap calc", () => {
    const gaps = computeSkillGapsForEmployee(
      {
        ...baseCtx,
        assessments: [{ id: "a1", employeeId: "e1", skillId: "s1", level: -1 }],
      },
      "e1",
      "r1"
    );
    const react = gaps.find((g) => g.skillId === "s1");
    expect(react?.currentLevel).toBe(0);
    expect(react?.gap).toBe(75);
  });

  it("returns empty when fully qualified", () => {
    const gaps = computeSkillGapsForEmployee(
      {
        ...baseCtx,
        assessments: [
          { id: "a1", employeeId: "e1", skillId: "s1", level: 100 },
          { id: "a2", employeeId: "e1", skillId: "s2", level: 100 },
        ],
      },
      "e1",
      "r1"
    );
    expect(gaps).toHaveLength(0);
  });
});

describe("findPotentialMentors", () => {
  it("returns employees with level 100", () => {
    const mentors = findPotentialMentors(
      [
        { id: "a1", employeeId: "e1", skillId: "s1", level: 100 },
        { id: "a2", employeeId: "e2", skillId: "s1", level: 50 },
      ],
      employees,
      "s1"
    );
    expect(mentors.map((m) => m.id)).toEqual(["e1"]);
  });

  it("excludes the given employee", () => {
    const mentors = findPotentialMentors(
      [
        { id: "a1", employeeId: "e1", skillId: "s1", level: 100 },
        { id: "a2", employeeId: "e2", skillId: "s1", level: 100 },
      ],
      employees,
      "s1",
      "e1"
    );
    expect(mentors.map((m) => m.id)).toEqual(["e2"]);
  });
});
