import { describe, it, expect } from "vitest";
import {
  MANAGE_BACKUP_FORMAT,
  validateManageBackup,
  manageBackupFilename,
} from "./manageBackup";

describe("validateManageBackup", () => {
  it("accepts a valid package", () => {
    const raw = {
      format: MANAGE_BACKUP_FORMAT,
      formatVersion: 1,
      exportedAt: "2026-08-07T12:00:00.000Z",
      data: {
        categories: [],
        subcategories: [],
        skills: [],
        roles: [],
        settings: { id: "default", projectTitle: "T", updatedAt: 1 },
        catalogReleases: [],
      },
    };
    const r = validateManageBackup(raw);
    expect(r.ok).toBe(true);
    expect(r.package?.format).toBe(MANAGE_BACKUP_FORMAT);
  });

  it("rejects wrong format", () => {
    const r = validateManageBackup({ format: "nope", formatVersion: 1, data: {} });
    expect(r.ok).toBe(false);
  });
});

describe("manageBackupFilename", () => {
  it("includes GlobalBackup", () => {
    expect(manageBackupFilename("Test Katalog")).toMatch(
      /Test_Katalog_GlobalBackup_/
    );
  });
});
