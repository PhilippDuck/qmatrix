import React, { useMemo } from "react";
import { Badge, Box, Tooltip } from "@mantine/core";
import { useStore } from "../../store/hooks";
import { useCatalogImport } from "../../hooks/useCatalogAuthoring";

export interface InstalledCatalogBadgeProps {
  size?: "xs" | "sm" | "md" | "lg";
  /**
   * When no catalog is installed, still show "Katalog —"
   * (useful on Team/Full where import is expected).
   */
  showWhenEmpty?: boolean;
  /** Optional override for tooltip prefix. */
  tooltipPrefix?: string;
}

function formatPublishedAt(iso?: string): string | null {
  if (!iso) return null;
  try {
    return new Date(iso).toLocaleString("de-DE", {
      dateStyle: "medium",
      timeStyle: "short",
    });
  } catch {
    return iso;
  }
}

/**
 * Shows the currently installed Manage catalog package version
 * (settings.installedCatalogMeta after catalog import).
 */
export const InstalledCatalogBadge: React.FC<InstalledCatalogBadgeProps> = ({
  size = "sm",
  showWhenEmpty = false,
  tooltipPrefix = "Geladener Skill-Katalog aus Manage",
}) => {
  const meta = useStore((s) => s.installedCatalogMeta);
  const canImport = useCatalogImport();

  const label = meta?.version ? `Katalog v${meta.version}` : "Katalog —";

  const tooltip = useMemo(() => {
    if (!meta?.version) {
      return canImport
        ? "Noch kein Katalog geladen — Release-JSON aus SkillGrid Manage importieren"
        : "Kein Katalog installiert";
    }
    const lines = [tooltipPrefix, `Version ${meta.version}`];
    if (meta.name?.trim()) lines.push(`Name: ${meta.name.trim()}`);
    const published = formatPublishedAt(meta.publishedAt);
    if (published) lines.push(`Veröffentlicht: ${published}`);
    if (meta.publisher?.trim()) lines.push(`Herausgeber: ${meta.publisher.trim()}`);
    if (meta.catalogId) lines.push(`ID: ${meta.catalogId}`);
    return lines.join("\n");
  }, [meta, canImport, tooltipPrefix]);

  if (!meta?.version && !showWhenEmpty) {
    return null;
  }

  // Only ops apps that import catalogs should show the empty placeholder
  if (!meta?.version && showWhenEmpty && !canImport) {
    return null;
  }

  return (
    <Tooltip
      label={
        <Box style={{ whiteSpace: "pre-line", fontSize: 12, lineHeight: 1.4 }}>
          {tooltip}
        </Box>
      }
      multiline
      maw={320}
      withArrow
    >
      <Badge
        variant="outline"
        color={meta?.version ? "blue" : "gray"}
        size={size}
        style={{ flexShrink: 0, cursor: "default" }}
        styles={{ root: { textTransform: "none" } }}
      >
        {label}
      </Badge>
    </Tooltip>
  );
};
