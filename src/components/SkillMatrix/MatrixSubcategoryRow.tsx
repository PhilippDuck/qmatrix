import React, { useState } from "react";
import { Text, Group, ActionIcon, Badge, Stack, Tooltip, HoverCard } from "@mantine/core";
import { IconPlus, IconMinus, IconTrophy, IconPencil, IconInfoCircle } from "@tabler/icons-react";
import { MATRIX_LAYOUT } from "../../constants/skillLevels";
import { getScoreColor, getMaxRoleTargetForSkill } from "../../utils/skillCalculations";
import { InfoTooltip } from "../shared/InfoTooltip";
import { BulkLevelMenu } from "./BulkLevelMenu";
import { MatrixSkillRow } from "./MatrixSkillRow";
import { Employee, SubCategory, Skill, Assessment, EmployeeRole } from "../../context/DataContext";
import { usePrivacy } from "../../context/PrivacyContext";

import { MatrixColumn } from "./types";

interface MatrixSubcategoryRowProps {
  columns: MatrixColumn[];
  subcategory: SubCategory;
  skills: Skill[];
  employees: Employee[];
  roles: EmployeeRole[];
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
  isEditMode: boolean;
  onAddSkill: (subCategoryId: string) => void;
  skillSort: 'asc' | 'desc' | null;
}
export const MatrixSubcategoryRow: React.FC<MatrixSubcategoryRowProps> = ({
  columns,
  subcategory,
  skills,
  employees,
  roles,
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
  isEditMode,
  onAddSkill,
  skillSort,
}) => {
  const { anonymizeName } = usePrivacy();
  const { cellSize, labelWidth } = MATRIX_LAYOUT;
  const subSkillIds = skills.map((s) => s.id!);
  const subAvg = calculateAverage(subSkillIds);
  const [isLabelHovered, setIsLabelHovered] = useState(false);

  // Sort skills
  const sortedSkills = [...skills].sort((a, b) => {
    if (skillSort) {
      // Sort by average value
      const avgA = calculateAverage([a.id!]) || 0;
      const avgB = calculateAverage([b.id!]) || 0;
      return skillSort === 'asc' ? avgA - avgB : avgB - avgA;
    }
    // Default: alphabetical
    return a.name.localeCompare(b.name, 'de');
  });

  // Calculate Max Percentage across all employees (Highest Average)
  const validAvgs = employees.map(e => calculateAverage(subSkillIds, e.id)).filter((a): a is number => a !== null);
  const maxAvg = validAvgs.length > 0 ? Math.max(...validAvgs) : null;

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
          onMouseEnter={() => setIsLabelHovered(true)}
          onMouseLeave={() => setIsLabelHovered(false)}
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
            <HoverCard width={280} shadow="md" withArrow openDelay={200}>
              <HoverCard.Target>
                <div style={{ cursor: "help", display: "flex", alignItems: "center", opacity: isLabelHovered ? 1 : 0, transition: "opacity 0.2s" }}>
                  <IconInfoCircle size={15} style={{ color: "var(--mantine-color-dimmed)" }} />
                </div>
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
                <Badge size="xs" variant={subAvg === null ? "outline" : "light"} color={getScoreColor(subAvg)}>
                  {subAvg === null ? "N/A" : `${subAvg}%`}
                </Badge>
              </Tooltip>
            ) : (
              // Max Percentage Bubble
              <Tooltip label={`Max. Abdeckung: ${maxAvg !== null ? maxAvg : "N/A"}%`} withArrow>
                <Badge size="xs" variant={maxAvg === null ? "outline" : "light"} color={maxAvg === null ? "gray" : getScoreColor(maxAvg)} style={{ border: maxAvg === null ? undefined : '1px solid currentColor' }}>
                  {maxAvg !== null ? `${maxAvg}%` : "N/A"}
                </Badge>
              </Tooltip>
            )}
          </Group>
        </div>
        {columns.map((col) => {
          if (col.type === 'group-summary') {
            // Calculate summary for this group
            let totalScore = 0;
            let count = 0;
            col.employeeIds.forEach(eId => {
              const emp = employees.find(e => e.id === eId);
              subSkillIds.forEach(sId => {
                const roleTarget = getMaxRoleTargetForSkill(emp?.roles, sId, roles);
                const asm = getAssessment(eId, sId);
                const rawLevel = asm?.level ?? -1;
                const level = (rawLevel === -1 && roleTarget !== undefined) ? 0 : rawLevel;
                if (level > -1) {
                  totalScore += level;
                  count++;
                }
              });
            });
            const avg = count > 0 ? Math.round(totalScore / count) : 0;

            // Calculate Max Average for this group
            // We need to calculate averages for each employee in this group for this subcategory
            const empAvgs = col.employeeIds.map(eId => {
              const emp = employees.find(e => e.id === eId);
              // Reuse logic - calculate average for this employee for these skills
              let eTotal = 0;
              let eCount = 0;
              subSkillIds.forEach(sId => {
                const roleTarget = getMaxRoleTargetForSkill(emp?.roles, sId, roles);
                const asm = getAssessment(eId, sId);
                const rawLevel = asm?.level ?? -1;
                const level = (rawLevel === -1 && roleTarget !== undefined) ? 0 : rawLevel;
                if (level > -1) {
                  eTotal += level;
                  eCount++;
                }
              });
              return eCount > 0 ? Math.round(eTotal / eCount) : null;
            });
            const validEmpAvgs = empAvgs.filter((a): a is number => a !== null);
            const maxAvg = validEmpAvgs.length > 0 ? Math.max(...validEmpAvgs) : null;

            return (
              <div
                key={col.id}
                style={{
                  width: cellSize,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  backgroundColor: col.backgroundColor || "var(--mantine-color-default-hover)",
                  borderRight: col.type === 'group-summary' ? "2px solid var(--mantine-color-default-border)" : undefined,
                }}
              >
                {showMaxValues ? (
                  maxAvg !== null ? (
                    <Badge size="xs" variant="light" color={getScoreColor(maxAvg)} style={{ border: '1px solid currentColor' }}>
                      {maxAvg}%
                    </Badge>
                  ) : <Text size="xs" c="dimmed">-</Text>
                ) : (
                  <Text size="xs" fw={500} c={getScoreColor(avg)}>
                    {avg === 0 ? "-" : `${avg}%`}
                  </Text>
                )}
              </div>
            );
          }

          const emp = col.employee;
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
                  backgroundColor: col.backgroundColor || (hoveredEmployeeId === emp.id ? "var(--mantine-color-default-hover)" : "transparent"),
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

      {!isCollapsed && (
        <>
          {sortedSkills.map((skill) => (
            <MatrixSkillRow
              key={skill.id}
              skill={skill}
              columns={columns}
              employees={employees}
              roles={roles}
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
              isEditMode={isEditMode}
            />
          ))}
          {isEditMode && (
            <div
              style={{
                display: "flex",
                borderBottom: "1px solid var(--mantine-color-default-border)",
                backgroundColor: "var(--mantine-color-body)",
              }}
            >
              <div
                style={{
                  width: labelWidth,
                  padding: "4px 12px 4px 44px",
                  position: "sticky",
                  left: 0,
                  zIndex: 5,
                  backgroundColor: "var(--mantine-color-body)",
                  borderRight: "1px solid var(--mantine-color-default-border)",
                }}
              >
                <ActionIcon
                  variant="subtle"
                  size="sm"
                  color="blue"
                  onClick={() => onAddSkill(subcategory.id!)}
                  style={{ width: "100%", justifyContent: "flex-start" }}
                >
                  <IconPlus size={14} style={{ marginRight: 8 }} />
                  <span style={{ fontSize: "12px" }}>Skill hinzufügen</span>
                </ActionIcon>
              </div>
              {/* Empty Space for Employee Columns */}
              <div style={{ flex: 1 }} />
              {/* Empty Space for Add Employee Column */}
              <div style={{ width: cellSize }} />
            </div>
          )}
        </>
      )}
    </div>
  );
};
