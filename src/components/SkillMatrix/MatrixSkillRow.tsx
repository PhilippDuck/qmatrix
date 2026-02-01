
import React from "react";
import { Text, Group, Stack, Tooltip, Badge, HoverCard, ActionIcon, Box } from "@mantine/core";
import { IconTrophy, IconPencil, IconInfoCircle } from "@tabler/icons-react";
import { MATRIX_LAYOUT, LEVELS } from "../../constants/skillLevels";
import { getScoreColor } from "../../utils/skillCalculations";
import { InfoTooltip } from "../shared/InfoTooltip";
import { SkillCell } from "./SkillCell";
import { Employee, Skill, Assessment } from "../../context/DataContext";

interface MatrixSkillRowProps {
  skill: Skill;
  employees: Employee[];
  hoveredSkillId: string | null;
  hoveredEmployeeId: string | null;
  onSkillHover: (skillId: string | null) => void;
  onEmployeeHover: (employeeId: string | null) => void;
  getAssessment: (employeeId: string, skillId: string) => Assessment | undefined;
  calculateSkillAverage: (skillId: string) => number | null;
  onLevelChange: (employeeId: string, skillId: string, newLevel: number) => void;
  onTargetLevelChange: (employeeId: string, skillId: string, targetLevel: number | undefined) => void;
  showMaxValues: boolean;
  onEditSkill: (skillId: string) => void;
}

export const MatrixSkillRow: React.FC<MatrixSkillRowProps> = ({
  skill,
  employees,
  hoveredSkillId,
  hoveredEmployeeId,
  onSkillHover,
  onEmployeeHover,
  getAssessment,
  calculateSkillAverage,
  onLevelChange,
  onTargetLevelChange,
  showMaxValues,
  onEditSkill,
}) => {
  const { labelWidth } = MATRIX_LAYOUT;
  const isRowHovered = hoveredSkillId === skill.id;
  const skillAvg = calculateSkillAverage(skill.id!);

  // Calculate Max Level for this skill across all employees
  const maxLevelVal = Math.max(...employees.map(e => {
    const assessment = getAssessment(e.id!, skill.id!);
    return assessment ? assessment.level : 0;
  }), 0);

  const maxLevelObj = LEVELS.find(l => l.value === maxLevelVal);
  const maxLabel = maxLevelObj ? maxLevelObj.label : "None";
  const maxColor = maxLevelObj ? maxLevelObj.color : "gray";

  return (
    <div style={{ display: "flex" }}>
      <div
        style={{
          width: labelWidth,
          padding: "6px 12px 6px 44px",
          position: "sticky",
          left: 0,
          zIndex: 5,
          backgroundColor: isRowHovered
            ? "var(--mantine-color-default-hover)"
            : "var(--mantine-color-body)",
          borderRight: "1px solid var(--mantine-color-default-border)",
          borderBottom: "1px solid var(--mantine-color-default-border)",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          transition: "background-color 0.15s ease",
        }}
      >
        <HoverCard width={280} shadow="md" withArrow openDelay={200}>
          <HoverCard.Target>
            <Text
              size="sm"
              fw={isRowHovered ? 700 : 400}
              truncate
              style={{ flex: 1, cursor: "help" }}
            >
              {skill.name}
            </Text>
          </HoverCard.Target>
          <HoverCard.Dropdown>
            <Stack gap="xs">
              <Group justify="space-between" align="start">
                <Text fw={700} size="sm">{skill.name}</Text>
                <ActionIcon
                  variant="subtle"
                  color="blue"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    onEditSkill(skill.id!);
                  }}
                >
                  <IconPencil size={16} />
                </ActionIcon>
              </Group>
              <Text size="xs" c="dimmed">
                {skill.description || "Keine Beschreibung verfügbar."}
              </Text>
            </Stack>
          </HoverCard.Dropdown>
        </HoverCard>

        <Group gap={4} align="center">
          {/* Average Text (Kept as text for skill rows per design, or could be badge) */}
          <Group gap={4} align="center">
            {/* Info Icon Removed */}
            {!showMaxValues ? (
              // Average Display
              <Text style={{ fontSize: "10px" }} c={getScoreColor(skillAvg)}>
                {skillAvg === null ? "N/A" : `${skillAvg}%`}
              </Text>
            ) : (
              // Max Value Display
              maxLevelVal > 0 ? (
                <Tooltip label={`Höchstes Level: ${maxLabel}`} withArrow>
                  <Badge size="xs" variant="outline" color={getScoreColor(maxLevelVal)} style={{ padding: '0 4px', height: '16px' }}>
                    {maxLevelVal}%
                  </Badge>
                </Tooltip>
              ) : (
                <Text style={{ fontSize: "10px" }} c="dimmed">-</Text>
              )
            )}
          </Group>

          {/* Max Indicator Bubble */}
          {/* {maxLevelVal > 0 && (
            <Tooltip label={`Höchstes Level: ${maxLabel}`} withArrow>
              <Badge size="xs" variant="outline" color={maxColor} style={{ padding: '0 4px', height: '16px' }}>
                Max: {maxLevelVal}%
              </Badge>
            </Tooltip>
          )} */}
        </Group>
      </div>
      {employees.map((emp) => {
        const assessment = getAssessment(emp.id!, skill.id!);
        const level = assessment?.level ?? 0;
        return (
          <SkillCell
            key={`${emp.id} -${skill.id} `}
            level={level}
            targetLevel={assessment?.targetLevel}
            isRowHovered={isRowHovered}
            isColumnHovered={hoveredEmployeeId === emp.id}
            onLevelChange={(newLevel) => onLevelChange(emp.id!, skill.id!, newLevel)}
            onTargetLevelChange={(target) => onTargetLevelChange(emp.id!, skill.id!, target)}
            onMouseEnter={() => {
              onSkillHover(skill.id!);
              onEmployeeHover(emp.id!);
            }}
            onMouseLeave={() => {
              onSkillHover(null);
              onEmployeeHover(null);
            }}
          />
        );
      })}
    </div>
  );
};
