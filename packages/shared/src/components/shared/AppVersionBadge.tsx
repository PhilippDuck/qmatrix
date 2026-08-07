import React from "react";
import { Badge, Box, Tooltip } from "@mantine/core";

/** Normalize "v1.2.3" / "1.2.3" → "APP 1.2.3" */
export function formatAppVersionLabel(version: string): string {
  const bare = version.replace(/^v/i, "").trim();
  return `APP ${bare}`;
}

export function bareAppVersion(version: string): string {
  return version.replace(/^v/i, "").trim();
}

interface AppVersionBadgeProps {
  /** Raw version from package.json / __APP_VERSION__ (with or without leading v). */
  version: string;
  /** Sidebar expanded → full "APP x.x.x"; collapsed → digits only. */
  expanded: boolean;
  /** Optional click (e.g. open changelog). */
  onClick?: () => void;
  /** Extra margin above when footer has credit text above. */
  withTopMargin?: boolean;
}

/**
 * Unified app version badge for sidebar footer only (all apps).
 * Display: "APP x.x.x" expanded; short "x.x.x" when navbar is collapsed.
 */
export const AppVersionBadge: React.FC<AppVersionBadgeProps> = ({
  version,
  expanded,
  onClick,
  withTopMargin = false,
}) => {
  const label = formatAppVersionLabel(version);
  const short = bareAppVersion(version);
  const clickable = typeof onClick === "function";
  const tip = clickable ? `Changelog · ${label}` : label;

  const badge = (
    <Badge
      variant="subtle"
      color="gray"
      size="xs"
      fullWidth
      mt={withTopMargin && expanded ? 6 : 0}
      onClick={onClick}
      style={{ cursor: clickable ? "pointer" : "default" }}
      styles={{
        root: {
          textTransform: "none",
          opacity: 0.75,
          paddingInline: expanded ? undefined : 4,
        },
      }}
    >
      {expanded ? label : short}
    </Badge>
  );

  return (
    <Box>
      <Tooltip
        label={tip}
        position={expanded ? "top" : "right"}
        withArrow={!expanded}
      >
        {badge}
      </Tooltip>
    </Box>
  );
};
