import React from "react";
import { Badge, Menu, Text, Group, Stack } from "@mantine/core";
import { MATRIX_LAYOUT, LEVELS } from "../../constants/skillLevels";
import { getLevelByValue } from "../../utils/skillCalculations";

interface SkillCellProps {
  level: number;
  targetLevel?: number;
  isRowHovered: boolean;
  isColumnHovered: boolean;
  onLevelChange: (newLevel: number) => void;
  onTargetLevelChange: (targetLevel: number | undefined) => void;
  onMouseEnter: () => void;
  onMouseLeave: () => void;
}

export const SkillCell: React.FC<SkillCellProps> = ({
  level,
  targetLevel,
  isRowHovered,
  isColumnHovered,
  onLevelChange,
  onTargetLevelChange,
  onMouseEnter,
  onMouseLeave,
}) => {
  const levelObj = getLevelByValue(level);

  // Check if below target (ignore N/A = -1)
  const hasTarget = targetLevel !== undefined && targetLevel > 0;
  const isBelowTarget = hasTarget && level !== -1 && level < targetLevel;
  const isAtOrAboveTarget = hasTarget && level !== -1 && level >= targetLevel;

  return (
    <Menu shadow="md" width="auto" position="bottom" withArrow>
      <Menu.Target>
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
            position: "relative",
            cursor: "pointer",
          }}
        >
          <Badge
            color={level === -1 ? "gray.3" : levelObj?.color}
            variant={level <= 0 ? "light" : "filled"}
            style={{
              pointerEvents: "none",
              width: "80%",
              fontSize: "9px",
              opacity: level === -1 ? 0.6 : 1,
              border: level === -1 ? "1px dashed var(--mantine-color-default-border)" : "none",
            }}
          >
            {levelObj?.label}
          </Badge>
          {/* Subtle indicator when below target */}
          {isBelowTarget && (
            <div
              style={{
                position: "absolute",
                bottom: 2,
                right: 2,
                width: 0,
                height: 0,
                borderLeft: "6px solid transparent",
                borderBottom: "6px solid var(--mantine-color-orange-filled)",
              }}
            />
          )}
          {/* Subtle indicator when at/above target */}
          {isAtOrAboveTarget && (
            <div
              style={{
                position: "absolute",
                bottom: 2,
                right: 2,
                width: 0,
                height: 0,
                borderLeft: "6px solid transparent",
                borderBottom: "6px solid var(--mantine-color-green-filled)",
              }}
            />
          )}
        </div>
      </Menu.Target>
      <Menu.Dropdown p="sm">
        <Stack gap="sm">
          {/* Ist-Level */}
          <div>
            <Text size="xs" c="dimmed" fw={500} mb={4}>
              Ist-Level
            </Text>
            <Group gap="xs">
              {LEVELS.map((lvl) => (
                <Badge
                  key={lvl.value}
                  color={lvl.value === -1 ? "gray.3" : lvl.color}
                  variant={level === lvl.value ? "filled" : "light"}
                  onClick={() => onLevelChange(lvl.value)}
                  style={{
                    cursor: "pointer",
                    minWidth: 38,
                    fontSize: "10px",
                    opacity: lvl.value === -1 ? 0.7 : 1,
                  }}
                >
                  {lvl.label}
                </Badge>
              ))}
            </Group>
          </div>
          {/* Soll-Level */}
          <div>
            <Text size="xs" c="dimmed" fw={500} mb={4}>
              Soll-Level
            </Text>
            <Group gap="xs">
              <Badge
                color="gray"
                variant={targetLevel === undefined ? "filled" : "light"}
                onClick={() => onTargetLevelChange(undefined)}
                style={{ cursor: "pointer", minWidth: 38, fontSize: "10px" }}
              >
                Kein
              </Badge>
              {LEVELS.filter(l => l.value > 0).map((lvl) => (
                <Badge
                  key={lvl.value}
                  color={lvl.color}
                  variant={targetLevel === lvl.value ? "filled" : "light"}
                  onClick={() => onTargetLevelChange(lvl.value)}
                  style={{ cursor: "pointer", minWidth: 38, fontSize: "10px" }}
                >
                  {lvl.label}
                </Badge>
              ))}
            </Group>
          </div>
        </Stack>
      </Menu.Dropdown>
    </Menu>
  );
};
