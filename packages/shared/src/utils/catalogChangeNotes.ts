import type { CatalogChangeNote, CatalogEntityKind } from "../types/catalog";

const KIND_DE: Record<CatalogEntityKind, string> = {
  categories: "Kategorie",
  subcategories: "Bereich",
  skills: "Skill",
  roles: "Rolle",
};

export function formatCatalogChangeNoteLine(note: CatalogChangeNote): string {
  const kind = KIND_DE[note.kind] || note.kind;
  const text = note.text.trim();
  return `• [${kind}] ${note.entityLabel}: ${text}`;
}

/** Plain-text block for the release notes field / TXT download. */
export function compilePendingCatalogNotes(
  notes: CatalogChangeNote[]
): string {
  const usable = (notes || [])
    .filter((n) => n.text?.trim())
    .sort((a, b) => a.createdAt - b.createdAt);
  if (usable.length === 0) return "";
  return usable.map(formatCatalogChangeNoteLine).join("\n");
}

/**
 * If the free-text release field already contains the compiled entity notes,
 * drop that duplicate so TXT/changelog only keep a real summary.
 */
export function stripCompiledNotesFromSummary(
  summary: string,
  compiled: string
): string {
  const n = (summary || "").trim();
  const c = (compiled || "").trim();
  if (!n) return "";
  if (!c) return n;
  if (n === c) return "";
  if (n.startsWith(c)) return n.slice(c.length).trim();
  if (n.endsWith(c)) return n.slice(0, n.length - c.length).trim();
  return n;
}

export function notesForEntity(
  notes: CatalogChangeNote[],
  kind: CatalogEntityKind,
  entityId: string
): CatalogChangeNote[] {
  return (notes || [])
    .filter((n) => n.kind === kind && n.entityId === entityId)
    .sort((a, b) => a.createdAt - b.createdAt);
}
