import React from "react";
import { Text, Group, Stack, Tooltip, Badge, HoverCard, ActionIcon } from "@mantine/core";
import { IconPencil } from "@tabler/icons-react";
import { MATRIX_LAYOUT, LEVELS } from "../../constants/skillLevels";
import { getScoreColor, getMaxRoleTargetForSkill } from "../../utils/skillCalculations";
import { SkillCell } from "./SkillCell";
import { Employee, Skill, Assessment, EmployeeRole, useData } from "../../context/DataContext";

import { MatrixColumn } from "./types";

interface MatrixSkillRowProps {
  columns: MatrixColumn[];
  skill: Skill;
  employees: Employee[];
  roles: EmployeeRole[];
  hoveredSkillId: string | null;
  hoveredEmployeeId: string | null;
  onSkillHover: (skillId: string | null) => void;
  onEmployeeHover: (employeeId: string | null) => void;
  getAssessment: (employeeId: string, skillId: string) => Assessment | undefined;
  calculateSkillAverage: (skillId: string) => number | null;
  onLevelChange: (employeeId: string, skillId: string, newLevel: number) => void;
  onTargetLevelChange: (employeeId: string, skillId: string, targetLevel: number | undefined) => void;
  showMaxValues: 'avg' | 'max' | 'fulfillment';
  onEditSkill: (skillId: string) => void;
  isEditMode: boolean;
  depth?: number;
  labelWidth?: number;
}

export const MatrixSkillRow: React.FC<MatrixSkillRowProps> = ({
  columns,
  skill,
  employees,
  roles,
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
  isEditMode,
  depth = 0,
  labelWidth,
}) => {
  const { qualificationMeasures, qualificationPlans } = useData();
  const { cellSize } = MATRIX_LAYOUT;
  const effectiveLabelWidth = labelWidth || MATRIX_LAYOUT.labelWidth;
  const isRowHovered = hoveredSkillId === skill.id;
  const skillAvg = calculateSkillAverage(skill.id!);

  // Pre-filter measures for this skill
  const skillMeasures = qualificationMeasures.filter(m => m.skillId === skill.id);

  // Calculate Max Level for this skill across all employees
  const maxLevelVal = Math.max(...employees.map(e => {
    const assessment = getAssessment(e.id!, skill.id!);
    return assessment ? assessment.level : 0;
  }), 0);

  const maxLevelObj = LEVELS.find(l => l.value === maxLevelVal);
  const maxLabel = maxLevelObj ? maxLevelObj.label : "None";

  return (
    <div style={{ display: "flex" }}>
      <div
        style={{
          width: effectiveLabelWidth,
          padding: "6px 12px",
          paddingLeft: `${44 + (depth * 24)}px`,
          position: "sticky",
          left: 0,
          zIndex: 30,
          background: isRowHovered
            ? "linear-gradient(var(--mantine-color-default-hover), var(--mantine-color-default-hover)), var(--mantine-color-body)"
            : "var(--mantine-color-body)",
          borderRight: "1px solid var(--mantine-color-default-border)",
          borderBottom: "1px solid var(--mantine-color-default-border)",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          transition: "background-color 0.15s ease, width 0.2s ease",
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
          <Group gap={4} align="center">
            {showMaxValues === 'avg' ? (
              // Average Display
              <Text style={{ fontSize: "10px" }} c={getScoreColor(skillAvg)}>
                {skillAvg === null ? "N/A" : `${skillAvg}%`}
              </Text>
            ) : showMaxValues === 'max' ? (
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
            ) : (
              // Fulfillment Display
              (() => {
                const scores: number[] = [];
                employees.forEach(e => {
                  const asm = getAssessment(e.id!, skill.id!);
                  const individualTarget = asm?.targetLevel || 0;
                  const roleTarget = getMaxRoleTargetForSkill(e.roles, skill.id!, roles) || 0;
                  const target = Math.max(individualTarget, roleTarget);
                  if (target > 0) {
                    const level = asm?.level ?? (roleTarget ? 0 : -1);
                    if (level >= 0) scores.push(Math.min(100, Math.round((level / target) * 100)));
                  }
                });
                const ful = scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : null;
                const fulColor = ful === null ? 'dimmed' : ful >= 100 ? 'teal' : ful >= 67 ? 'yellow' : 'red';
                return (
                  <Text style={{ fontSize: "10px" }} c={fulColor}>
                    {ful === null ? "-" : `${ful}%`}
                  </Text>
                );
              })()
            )}
          </Group>
        </Group>
      </div>
      {columns.map((col) => {
        if (col.type === 'group-summary') {
          // Calculate average for this skill in this group
          const validScores = col.employeeIds.map(eId => {
            const emp = employees.find(e => e.id === eId);
            const roleTarget = getMaxRoleTargetForSkill(emp?.roles, skill.id!, roles);
            const asm = getAssessment(eId, skill.id!);
            return asm?.level ?? (roleTarget !== undefined ? 0 : -1);
          }).filter(v => v !== -1);

          const sum = validScores.reduce<number>((a, b) => a + b, 0);
          const avg = validScores.length > 0 ? Math.round(sum / validScores.length) : 0;
          const max = validScores.length > 0 ? Math.max(...validScores) : 0;

          return (
            <div
              key={col.id}
              style={{
                width: cellSize,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                backgroundColor: col.backgroundColor || (isRowHovered ? "var(--mantine-color-default-hover)" : "var(--mantine-color-body)"),
                borderRight: col.type === 'group-summary' ? "2px solid var(--mantine-color-default-border)" : undefined,
                borderBottom: "1px solid var(--mantine-color-default-border)",
              }}
            >
              {showMaxValues === 'max' ? (
                max > 0 ? (
                  <Badge size="xs" variant="outline" color={getScoreColor(max)} style={{ padding: '0 4px', height: '16px' }}>
                    {max}%
                  </Badge>
                ) : (
                  <Text size="xs" c="dimmed">-</Text>
                )
              ) : showMaxValues === 'fulfillment' ? (
                (() => {
                  const scores: number[] = [];
                  col.employeeIds.forEach(eId => {
                    const emp = employees.find(e => e.id === eId);
                    const asm = getAssessment(eId, skill.id!);
                    const individualTarget = asm?.targetLevel || 0;
                    const roleTarget = getMaxRoleTargetForSkill(emp?.roles, skill.id!, roles) || 0;
                    const target = Math.max(individualTarget, roleTarget);
                    if (target > 0) {
                      const level = asm?.level ?? (roleTarget ? 0 : -1);
                      if (level >= 0) scores.push(Math.min(100, Math.round((level / target) * 100)));
                    }
                  });
                  const ful = scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : null;
                  const fulColor = ful === null ? 'dimmed' : ful >= 100 ? 'teal' : ful >= 67 ? 'yellow' : 'red';
                  return <Text size="xs" fw={500} c={fulColor}>{ful === null ? "-" : `${ful}%`}</Text>;
                })()
              ) : (
                <Text size="xs" fw={500} c={getScoreColor(avg)}>
                  {avg === 0 ? "-" : `${avg}%`}
                </Text>
              )}
            </div>
          );
        }

        const emp = col.employee;
        // Find Role Target (recursive) - take max across all employee roles
        const roleTarget = getMaxRoleTargetForSkill(emp.roles, skill.id!, roles);

        const assessment = getAssessment(emp.id!, skill.id!);
        // If assessment is -1 (N/A) or doesn't exist, and we have a role target, default to 0
        const rawLevel = assessment?.level ?? -1;
        const level = (rawLevel === -1 && roleTarget !== undefined) ? 0 : rawLevel;

        // Find Active Measure for this employee and skill
        const measure = skillMeasures.find(m => {
          const plan = qualificationPlans.find(p => p.id === m.planId && p.employeeId === emp.id);
          return !!plan;
        });

        const measureStatus = measure && (measure.status === "in_progress" || measure.status === "pending")
          ? measure.status
          : undefined;

        return (
          <SkillCell
            key={`${emp.id}-${skill.id}`}
            level={level}
            targetLevel={assessment?.targetLevel}
            roleTargetLevel={roleTarget}
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
            hasActiveMeasure={measureStatus}
            backgroundColor={col.backgroundColor}
          />
        );
      })}
      {/* Empty Placeholder for Add Employee Column */}
      {isEditMode && (
        <div
          style={{
            width: cellSize,
            borderBottom: "1px solid var(--mantine-color-default-border)",
            borderRight: "1px solid var(--mantine-color-default-border)",
            backgroundColor: "transparent",
          }}
        />
      )}
    </div>
  );
};
