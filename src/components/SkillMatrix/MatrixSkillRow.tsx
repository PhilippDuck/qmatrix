import React from "react";
import { Text, Group } from "@mantine/core";
import { MATRIX_LAYOUT } from "../../constants/skillLevels";
import { getScoreColor } from "../../utils/skillCalculations";
import { InfoTooltip } from "../shared/InfoTooltip";
import { SkillCell } from "./SkillCell";
import { Employee, Skill } from "../../context/DataContext";

interface MatrixSkillRowProps {
  skill: Skill;
  employees: Employee[];
  hoveredSkillId: string | null;
  hoveredEmployeeId: string | null;
  onSkillHover: (skillId: string | null) => void;
  onEmployeeHover: (employeeId: string | null) => void;
  getAssessmentLevel: (employeeId: string, skillId: string) => number;
  calculateSkillAverage: (skillId: string) => number;
  onLevelChange: (employeeId: string, skillId: string, currentLevel: number) => void;
}

export const MatrixSkillRow: React.FC<MatrixSkillRowProps> = ({
  skill,
  employees,
  hoveredSkillId,
  hoveredEmployeeId,
  onSkillHover,
  onEmployeeHover,
  getAssessmentLevel,
  calculateSkillAverage,
  onLevelChange,
}) => {
  const { labelWidth } = MATRIX_LAYOUT;
  const isRowHovered = hoveredSkillId === skill.id;
  const skillAvg = calculateSkillAverage(skill.id!);

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
        <Text size="sm" fw={isRowHovered ? 700 : 400} truncate style={{ flex: 1 }}>
          {skill.name}
        </Text>
        <Group gap={8}>
          <InfoTooltip title={skill.name} description={skill.description} />
          <Text style={{ fontSize: "10px" }} c={getScoreColor(skillAvg)}>
            {skillAvg}%
          </Text>
        </Group>
      </div>
      {employees.map((emp) => {
        const level = getAssessmentLevel(emp.id!, skill.id!);
        return (
          <SkillCell
            key={`${emp.id}-${skill.id}`}
            level={level}
            isRowHovered={isRowHovered}
            isColumnHovered={hoveredEmployeeId === emp.id}
            onLevelChange={() => onLevelChange(emp.id!, skill.id!, level)}
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
