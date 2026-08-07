import { describe, it, expect, beforeEach } from "vitest";
import { createPrefixedStorage } from "./prefixedStorage";

describe("createPrefixedStorage", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("reads and writes with prefix", () => {
    const storage = createPrefixedStorage({ prefix: "skillgrid-full-" });
    storage.setItem("has-unsaved-changes", "true");
    expect(localStorage.getItem("skillgrid-full-has-unsaved-changes")).toBe(
      "true"
    );
    expect(storage.getItem("has-unsaved-changes")).toBe("true");
  });

  it("migrates legacy unprefixed keys for Full", () => {
    localStorage.setItem("has-unsaved-changes", "true");
    const storage = createPrefixedStorage({
      prefix: "skillgrid-full-",
      alsoReadLegacyUnprefixed: true,
      migrateLegacyOnRead: true,
    });
    expect(storage.getItem("has-unsaved-changes")).toBe("true");
    expect(localStorage.getItem("skillgrid-full-has-unsaved-changes")).toBe(
      "true"
    );
    expect(localStorage.getItem("has-unsaved-changes")).toBeNull();
  });
});
