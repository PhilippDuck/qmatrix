/**
 * Human-readable release notes TXT alongside catalog JSON downloads.
 */

import type { CatalogMeta, CatalogPackage } from "../types/catalog";
import {
  diffCatalogEntities,
  summarizeDiffCounts,
  type CatalogDiffResult,
} from "./catalogDiff";

const KIND_DE: Record<string, string> = {
  categories: "Kategorien",
  subcategories: "Unterkategorien",
  skills: "Skills",
  roles: "Rollen",
};

const CHANGE_DE: Record<string, string> = {
  added: "Neu",
  removed: "Entfernt",
  changed: "Geändert",
};

export function catalogReleaseNotesFilename(meta: CatalogMeta): string {
  const safeName = (meta.name || "Katalog").replace(/[^a-z0-9]+/gi, "_");
  const published = meta.publishedAt
    ? new Date(meta.publishedAt)
    : new Date();
  const valid = !Number.isNaN(published.getTime()) ? published : new Date();
  const date = valid.toISOString().slice(0, 10);
  const time = valid
    .toLocaleTimeString("de-DE", { hour12: false })
    .replace(/:/g, "-");
  return `${safeName}_Katalog_v${meta.version}_${date}_${time}_Aenderungen.txt`;
}

export interface BuildReleaseNotesInput {
  pkg: CatalogPackage;
  /** Release notes entered by author */
  notes: string;
  /** Previous release package for entity-level diff (optional) */
  previousPackage?: CatalogPackage | null;
  previousVersion?: string | null;
}

/**
 * Build plain-text description of a catalog release (German).
 */
export function buildCatalogReleaseNotesText(
  input: BuildReleaseNotesInput
): string {
  const { pkg, notes, previousPackage, previousVersion } = input;
  const meta = pkg.meta;
  const published = meta.publishedAt
    ? new Date(meta.publishedAt).toLocaleString("de-DE")
    : "—";

  const lines: string[] = [
    "SkillGrid Katalog — Release-Beschreibung",
    "========================================",
    "",
    `Name:           ${meta.name}`,
    `Version:        v${meta.version}`,
    `Freigegeben am: ${published}`,
  ];

  if (meta.publisher) {
    lines.push(`Herausgeber:    ${meta.publisher}`);
  }
  if (meta.catalogId) {
    lines.push(`Katalog-ID:     ${meta.catalogId}`);
  }
  if (previousVersion) {
    lines.push(`Vergleich mit:  v${previousVersion}`);
  } else if (!previousPackage) {
    lines.push(`Vergleich mit:  (erstes Release / kein Vorgänger)`);
  }

  lines.push("", "Änderungsgrund", "--------------", notes.trim() || "(keine Notizen)", "");

  const e = pkg.entities;
  lines.push(
    "Umfang dieses Releases",
    "----------------------",
    `Kategorien:      ${e.categories?.length ?? 0}`,
    `Unterkategorien: ${e.subcategories?.length ?? 0}`,
    `Skills:          ${e.skills?.length ?? 0}`,
    `Rollen:          ${e.roles?.length ?? 0}`,
    ""
  );

  if (previousPackage?.entities) {
    const diff = diffCatalogEntities(pkg.entities, previousPackage.entities);
    lines.push(...formatDiffSection(diff));
  } else {
    lines.push(
      "Detail-Diff",
      "-----------",
      "Kein Vorgänger im Archiv — alle Entitäten sind Teil des initialen Stands.",
      ""
    );
  }

  if (pkg.contentHash) {
    lines.push(
      "Integrität",
      "----------",
      `contentHash: ${pkg.contentHash}`,
      ""
    );
  }

  lines.push(
    "—",
    "Erzeugt von SkillGrid Manage. JSON-Katalog und diese TXT gehören zusammen."
  );

  return lines.join("\n");
}

function formatDiffSection(diff: CatalogDiffResult): string[] {
  const counts = summarizeDiffCounts(diff);
  const lines: string[] = [
    "Änderungen gegenüber Vorgänger",
    "------------------------------",
    `Gesamt: ${counts.total}  (+${counts.added} neu, ${counts.changed} geändert, −${counts.removed} entfernt)`,
    "",
  ];

  if (diff.isIdentical || counts.total === 0) {
    lines.push(
      "(Keine inhaltlichen Entity-Unterschiede zum Vorgänger — z. B. nur Meta/Notizen.)",
      ""
    );
    return lines;
  }

  const byChange = {
    added: diff.items.filter((i) => i.change === "added"),
    changed: diff.items.filter((i) => i.change === "changed"),
    removed: diff.items.filter((i) => i.change === "removed"),
  } as const;

  for (const change of ["added", "changed", "removed"] as const) {
    const items = byChange[change];
    if (!items.length) continue;
    lines.push(`${CHANGE_DE[change]} (${items.length})`);
    for (const item of items) {
      const kind = KIND_DE[item.kind] || item.kind;
      lines.push(`  • [${kind}] ${item.label}`);
      if (item.detail) lines.push(`      ${item.detail}`);
    }
    lines.push("");
  }

  return lines;
}

/** Trigger browser download of a text blob. */
export function downloadTextFile(filename: string, content: string): void {
  const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
