import { describe, it, expect } from "vitest";
import {
  compilePendingCatalogNotes,
  formatCatalogChangeNoteLine,
  notesForEntity,
  stripCompiledNotesFromSummary,
} from "./catalogChangeNotes";
import type { CatalogChangeNote } from "../types/catalog";

const notes: CatalogChangeNote[] = [
  {
    id: "1",
    kind: "skills",
    entityId: "s1",
    entityLabel: "React",
    text: "Hook-Grundlagen ergänzt",
    createdAt: 2,
  },
  {
    id: "2",
    kind: "roles",
    entityId: "r1",
    entityLabel: "Entwickler",
    text: "Soll-Level TypeScript angehoben",
    createdAt: 1,
  },
];

describe("catalogChangeNotes", () => {
  it("formats a single line", () => {
    expect(formatCatalogChangeNoteLine(notes[0])).toBe(
      "• [Skill] React: Hook-Grundlagen ergänzt"
    );
  });

  it("compiles notes oldest-first", () => {
    const text = compilePendingCatalogNotes(notes);
    expect(text.startsWith("• [Rolle] Entwickler:")).toBe(true);
    expect(text).toContain("• [Skill] React:");
  });

  it("filters notes for one entity", () => {
    expect(notesForEntity(notes, "skills", "s1")).toHaveLength(1);
    expect(notesForEntity(notes, "skills", "missing")).toHaveLength(0);
  });

  it("strips compiled notes copied into the summary field", () => {
    const compiled = compilePendingCatalogNotes(notes);
    expect(stripCompiledNotesFromSummary(compiled, compiled)).toBe("");
    expect(
      stripCompiledNotesFromSummary(`Überblick\n\n${compiled}`, compiled)
    ).toBe("Überblick");
  });
});
