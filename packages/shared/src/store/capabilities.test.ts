import { describe, it, expect } from "vitest";
import { checkCapability, withCapability } from "./capabilities";
import { fullCapabilities } from "../types/capabilities";
import type { AppCapabilities } from "../types/capabilities";

const teamCaps: AppCapabilities = {
  ...fullCapabilities,
  variant: "team",
  displayName: "SkillGrid Team",
  catalogAuthoring: false,
  catalogVersioning: false,
  catalogExport: false,
  historyUndoCatalog: false,
  fullBackupImport: false,
  selectiveOpsImport: true,
  dbName: "SkillGridTeamDB",
  localStoragePrefix: "skillgrid-team-",
};

describe("checkCapability", () => {
  it("allows full catalog authoring", () => {
    expect(
      checkCapability(fullCapabilities, "catalogAuthoring", "add skill").ok
    ).toBe(true);
  });

  it("denies team catalog authoring with reason", () => {
    const result = checkCapability(teamCaps, "catalogAuthoring", "add skill");
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reason).toContain("team");
      expect(result.reason).toContain("catalogAuthoring");
    }
  });
});

describe("withCapability", () => {
  it("runs fn when allowed", async () => {
    const value = await withCapability(
      fullCapabilities,
      "catalogAuthoring",
      "test",
      async () => 42
    );
    expect(value).toBe(42);
  });

  it("returns undefined when denied", async () => {
    const value = await withCapability(
      teamCaps,
      "catalogAuthoring",
      "test",
      async () => 42
    );
    expect(value).toBeUndefined();
  });
});
