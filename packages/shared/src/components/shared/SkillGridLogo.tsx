import React from "react";
import { useComputedColorScheme } from "@mantine/core";

interface SkillGridLogoProps {
  size?: number;
  /** Override stroke/fill color (defaults to theme blue). */
  color?: string;
}

/** Grid-dot logo used in Full / Manage / Team headers. */
export const SkillGridLogo: React.FC<SkillGridLogoProps> = ({
  size = 32,
  color,
}) => {
  const scheme = useComputedColorScheme("light");
  const logoColor =
    color ?? (scheme === "dark" ? "#4DA6FF" : "#007BFF");

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 128 128"
      width={size}
      height={size}
      style={{ flexShrink: 0 }}
      aria-hidden
    >
      <g transform="translate(14, 14)">
        <rect
          x="0"
          y="0"
          width="100"
          height="100"
          style={{ stroke: logoColor, strokeWidth: 5, fill: "none" }}
          rx="12"
          ry="12"
        />
        <line
          x1="33.3"
          y1="0"
          x2="33.3"
          y2="100"
          style={{ stroke: logoColor, strokeWidth: 5 }}
        />
        <line
          x1="66.6"
          y1="0"
          x2="66.6"
          y2="100"
          style={{ stroke: logoColor, strokeWidth: 5 }}
        />
        <line
          x1="0"
          y1="33.3"
          x2="100"
          y2="33.3"
          style={{ stroke: logoColor, strokeWidth: 5 }}
        />
        <line
          x1="0"
          y1="66.6"
          x2="100"
          y2="66.6"
          style={{ stroke: logoColor, strokeWidth: 5 }}
        />
        <circle cx="50" cy="16.65" r="9" fill={logoColor} />
        <circle cx="83.35" cy="16.65" r="9" fill={logoColor} />
        <circle cx="16.65" cy="50" r="9" fill={logoColor} />
        <circle cx="50" cy="50" r="9" fill={logoColor} />
        <circle cx="16.65" cy="83.35" r="9" fill={logoColor} />
        <circle cx="83.35" cy="83.35" r="9" fill={logoColor} />
      </g>
    </svg>
  );
};
