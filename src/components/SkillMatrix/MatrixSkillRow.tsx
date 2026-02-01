import React from "react";
import { Text, Group, Stack, Tooltip, Badge, HoverCard, ActionIcon } from "@mantine/core";
import { IconPencil } from "@tabler/icons-react";
import { MATRIX_LAYOUT, LEVELS } from "../../constants/skillLevels";
import { getScoreColor } from "../../utils/skillCalculations";
import { SkillCell } from "./SkillCell";
import { Employee, Skill, Assessment, useData } from "../../context/DataContext";

interface MatrixSkillRowProps {
  skill: Skill;
  employees: Employee[];
  roles: { id?: string; name: string; requiredSkills?: { skillId: string; level: number }[] }[];
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
}) => {
  const { qualificationMeasures, qualificationPlans } = useData();
  const { labelWidth } = MATRIX_LAYOUT;
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
          <Group gap={4} align="center">
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
        </Group>
      </div>
      {employees.map((emp) => {
        const assessment = getAssessment(emp.id!, skill.id!);
        const level = assessment?.level ?? 0;

        // Find Role Target
        let empRole = roles.find(r => r.id === emp.role);
        if (!empRole && emp.role) {
          empRole = roles.find(r => r.name === emp.role);
        }
        const roleTarget = empRole?.requiredSkills?.find(rs => rs.skillId === skill.id!)?.level;

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
          />
        );
      })}
    </div>
  );
};
