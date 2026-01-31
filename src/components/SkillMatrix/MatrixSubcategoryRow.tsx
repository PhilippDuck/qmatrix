import React from "react";
import { Text, Group, ActionIcon, Badge } from "@mantine/core";
import { IconPlus, IconMinus } from "@tabler/icons-react";
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
}) => {
  const { anonymizeName } = usePrivacy();
  const { cellSize, labelWidth } = MATRIX_LAYOUT;
  const subSkillIds = skills.map((s) => s.id!);
  const subAvg = calculateAverage(subSkillIds);

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
            <Text
              fw={500}
              size="xs"
              style={{ cursor: "pointer" }}
              onClick={onToggle}
            >
              {subcategory.name}
            </Text>
            <InfoTooltip
              title={subcategory.name}
              description={subcategory.description}
            />
          </Group>
          <Badge size="xs" variant="light" color={getScoreColor(subAvg)}>
            {subAvg}%
          </Badge>
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
              calculateAverage([skillId]) ?? 0
            }
            onLevelChange={onLevelChange}
            onTargetLevelChange={onTargetLevelChange}
          />
        ))}
    </div>
  );
};
