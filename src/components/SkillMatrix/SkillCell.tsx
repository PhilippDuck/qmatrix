import React from "react";
import { Badge } from "@mantine/core";
import { MATRIX_LAYOUT } from "../../constants/skillLevels";
import { getLevelByValue } from "../../utils/skillCalculations";

interface SkillCellProps {
  level: number;
  isRowHovered: boolean;
  isColumnHovered: boolean;
  onLevelChange: () => void;
  onMouseEnter: () => void;
  onMouseLeave: () => void;
}

export const SkillCell: React.FC<SkillCellProps> = ({
  level,
  isRowHovered,
  isColumnHovered,
  onLevelChange,
  onMouseEnter,
  onMouseLeave,
}) => {
  const levelObj = getLevelByValue(level);

  return (
    <div
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      style={{
        width: MATRIX_LAYOUT.cellSize,
        height: 36,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        borderBottom: "1px solid var(--mantine-color-default-border)",
        borderRight: "1px solid var(--mantine-color-default-border)",
        backgroundColor:
          isRowHovered || isColumnHovered
            ? "var(--mantine-color-default-hover)"
            : "transparent",
        transition: "background-color 0.15s ease",
      }}
    >
      <Badge
        color={level === -1 ? "gray.3" : levelObj?.color}
        variant={level <= 0 ? "light" : "filled"}
        onClick={onLevelChange}
        style={{
          cursor: "pointer",
          width: "80%",
          fontSize: "9px",
          opacity: level === -1 ? 0.6 : 1,
          border: level === -1 ? "1px dashed var(--mantine-color-default-border)" : "none",
        }}
      >
        {levelObj?.label}
      </Badge>
    </div>
  );
};
