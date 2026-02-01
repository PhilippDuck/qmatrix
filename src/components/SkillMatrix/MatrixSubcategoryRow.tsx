import React from "react";
import { Text, Group, ActionIcon, Badge, Stack, Tooltip, HoverCard } from "@mantine/core";
import { IconPlus, IconMinus, IconTrophy, IconPencil } from "@tabler/icons-react";
import { MATRIX_LAYOUT } from "../../constants/skillLevels";
import { getScoreColor } from "../../utils/skillCalculations";
import { InfoTooltip } from "../shared/InfoTooltip";
import { BulkLevelMenu } from "./BulkLevelMenu";
import { MatrixSkillRow } from "./MatrixSkillRow";
import { Employee, SubCategory, Skill, Assessment } from "../../context/DataContext";
import { usePrivacy } from "../../context/PrivacyContext";

interface MatrixSubcategoryRowProps {
  subcategory: SubCategory;
  skills: Skill[];
  employees: Employee[];
  isCollapsed: boolean;
  hoveredSkillId: string | null;
  hoveredEmployeeId: string | null;
  onToggle: () => void;
  onSkillHover: (skillId: string | null) => void;
  onEmployeeHover: (employeeId: string | null) => void;
  calculateAverage: (skillIds: string[], employeeId?: string) => number | null;
  getAssessment: (employeeId: string, skillId: string) => Assessment | undefined;
  onBulkSetLevel: (employeeId: string, skillIds: string[], level: number) => void;

  onLevelChange: (employeeId: string, skillId: string, newLevel: number) => void;
  onTargetLevelChange: (employeeId: string, skillId: string, targetLevel: number | undefined) => void;
  showMaxValues: boolean;
  onEditSkill: (skillId: string) => void;
  onEditSubcategory: (subcategoryId: string) => void;
}
export const MatrixSubcategoryRow: React.FC<MatrixSubcategoryRowProps> = ({
  subcategory,
  skills,
  employees,
  isCollapsed,
  hoveredSkillId,
  hoveredEmployeeId,
  onToggle,
  onSkillHover,
  onEmployeeHover,
  calculateAverage,
  getAssessment,
  onBulkSetLevel,
  onLevelChange,
  onTargetLevelChange,
  showMaxValues,
  onEditSkill,
  onEditSubcategory,
}) => {
  const { anonymizeName } = usePrivacy();
  const { cellSize, labelWidth } = MATRIX_LAYOUT;
  const subSkillIds = skills.map((s) => s.id!);
  const subAvg = calculateAverage(subSkillIds);

  // Calculate Max Percentage across all employees (Highest Average)
  const maxAvg = Math.max(...employees.map(e => calculateAverage(subSkillIds, e.id) || 0), 0);

  return (
    <div>
      <div
        style={{
          display: "flex",
          borderBottom: "1px solid var(--mantine-color-default-border)",
          backgroundColor: "var(--mantine-color-default-hover)",
        }}
      >
        <div
          style={{
            width: labelWidth,
            padding: "6px 12px 6px 24px",
            position: "sticky",
            left: 0,
            zIndex: 10,
            backgroundColor: "var(--mantine-color-default-hover)",
            borderRight: "1px solid var(--mantine-color-default-border)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <Group gap="xs">
            <ActionIcon size="xs" variant="transparent" onClick={onToggle}>
              {isCollapsed ? <IconPlus size={12} /> : <IconMinus size={12} />}
            </ActionIcon>
            <HoverCard width={280} shadow="md" withArrow openDelay={200}>
              <HoverCard.Target>
                <Text
                  fw={500}
                  size="xs"
                  style={{ cursor: "help" }}
                  onClick={onToggle}
                >
                  {subcategory.name}
                </Text>
              </HoverCard.Target>
              <HoverCard.Dropdown>
                <Stack gap="xs">
                  <Group justify="space-between" align="start">
                    <Text fw={700} size="sm">{subcategory.name}</Text>
                    <ActionIcon
                      variant="subtle"
                      color="blue"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        onEditSubcategory(subcategory.id!);
                      }}
                    >
                      <IconPencil size={16} />
                    </ActionIcon>
                  </Group>
                  <Text size="xs" c="dimmed">
                    {subcategory.description || "Keine Beschreibung verfügbar."}
                  </Text>
                </Stack>
              </HoverCard.Dropdown>
            </HoverCard>
          </Group>
          <Group gap={4} align="center">
            {!showMaxValues ? (
              // Average Bubble
              <Tooltip label="Durchschnittliche Abdeckung" withArrow>
                <Badge size="xs" variant="light" color={getScoreColor(subAvg)}>
                  {subAvg === null ? "N/A" : `${subAvg}%`}
                </Badge>
              </Tooltip>
            ) : (
              // Max Percentage Bubble
              <Tooltip label={`Max. Abdeckung: ${maxAvg}%`} withArrow>
                <Badge size="xs" variant="light" color={getScoreColor(maxAvg)} style={{ border: '1px solid currentColor' }}>
                  {maxAvg}%
                </Badge>
              </Tooltip>
            )}
          </Group>
        </div>
        {employees.map((emp) => {
          const avg = calculateAverage(subSkillIds, emp.id);

          return (
            <BulkLevelMenu
              key={emp.id}
              label={`Alle "${subcategory.name}" setzen für ${anonymizeName(emp.name, emp.id)}`}
              onSelectLevel={(level) => onBulkSetLevel(emp.id!, subSkillIds, level)}
            >
              <div
                onMouseEnter={() => onEmployeeHover(emp.id!)}
                onMouseLeave={() => onEmployeeHover(null)}
                style={{
                  width: cellSize,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  backgroundColor:
                    hoveredEmployeeId === emp.id
                      ? "var(--mantine-color-default-hover)"
                      : "transparent",
                  transition: "background-color 0.15s ease",
                }}
              >
                <Text size="xs" fw={500} c={getScoreColor(avg)}>
                  {avg === null ? "N/A" : `${avg}%`}
                </Text>
              </div>
            </BulkLevelMenu>
          );
        })}
      </div>

      {!isCollapsed &&
        skills.map((skill) => (
          <MatrixSkillRow
            key={skill.id}
            skill={skill}
            employees={employees}
            hoveredSkillId={hoveredSkillId}
            hoveredEmployeeId={hoveredEmployeeId}
            onSkillHover={onSkillHover}
            onEmployeeHover={onEmployeeHover}
            getAssessment={getAssessment}
            calculateSkillAverage={(skillId) =>
              calculateAverage([skillId]) ?? null
            }
            onLevelChange={onLevelChange}
            onTargetLevelChange={onTargetLevelChange}
            showMaxValues={showMaxValues}
            onEditSkill={onEditSkill}
          />
        ))}
    </div>
  );
};
