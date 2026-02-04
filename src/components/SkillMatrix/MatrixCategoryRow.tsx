import React, { useState } from "react";
import { Text, Group, ActionIcon, Badge, Stack, Tooltip, HoverCard } from "@mantine/core";
import { IconPlus, IconMinus, IconTrophy, IconPencil, IconInfoCircle } from "@tabler/icons-react";
import { MATRIX_LAYOUT } from "../../constants/skillLevels";
import { getScoreColor, getRoleTargetForSkill } from "../../utils/skillCalculations";
import { InfoTooltip } from "../shared/InfoTooltip";
import { BulkLevelMenu } from "./BulkLevelMenu";
import { MatrixSubcategoryRow } from "./MatrixSubcategoryRow";
import { Employee, Category, SubCategory, Skill, Assessment } from "../../context/DataContext";
import { usePrivacy } from "../../context/PrivacyContext";

import { MatrixColumn } from "./types";

interface MatrixCategoryRowProps {
  columns: MatrixColumn[];
  category: Category;
  subcategories: SubCategory[];
  skills: Skill[];
  employees: Employee[];
  roles: { id?: string; name: string; requiredSkills?: { skillId: string; level: number }[] }[];
  collapsedStates: Record<string, boolean>;
  hoveredSkillId: string | null;
  hoveredEmployeeId: string | null;
  onToggleCategory: (categoryId: string) => void;
  onToggleSubcategory: (subcategoryId: string) => void;
  onSkillHover: (skillId: string | null) => void;
  onEmployeeHover: (employeeId: string | null) => void;
  calculateAverage: (skillIds: string[], employeeId?: string) => number | null;
  getAssessment: (employeeId: string, skillId: string) => Assessment | undefined;
  onBulkSetLevel: (employeeId: string, skillIds: string[], level: number) => void;
  onLevelChange: (employeeId: string, skillId: string, newLevel: number) => void;
  onTargetLevelChange: (employeeId: string, skillId: string, targetLevel: number | undefined) => void;
  showMaxValues: boolean;
  onEditSkill: (skillId: string) => void;
  onEditCategory: (categoryId: string) => void;
  onEditSubcategory: (subcategoryId: string) => void;
  isEditMode: boolean;
  onAddSubcategory: () => void;
  onAddSkill: (subCategoryId: string) => void;
}


export const MatrixCategoryRow: React.FC<MatrixCategoryRowProps> = ({
  columns,
  category,
  subcategories,
  skills,
  employees,
  roles,
  collapsedStates,
  hoveredSkillId,
  hoveredEmployeeId,
  onToggleCategory,
  onToggleSubcategory,
  onSkillHover,
  onEmployeeHover,
  calculateAverage,
  getAssessment,
  onBulkSetLevel,
  onLevelChange,
  onTargetLevelChange,
  showMaxValues,
  onEditSkill,
  onEditCategory,
  onEditSubcategory,
  isEditMode,
  onAddSubcategory,
  onAddSkill,
}) => {
  const { anonymizeName } = usePrivacy();
  const isCatCollapsed = collapsedStates[category.id!];
  const { cellSize, labelWidth } = MATRIX_LAYOUT;
  const [isLabelHovered, setIsLabelHovered] = useState(false);

  // Get subcategories for this category
  const categorySubcategories = subcategories.filter(
    (s) => s.categoryId === category.id
  );
  const subIds = categorySubcategories.map((s) => s.id);

  // Get all skills for this category
  const catSkillIds = skills
    .filter((s) => subIds.includes(s.subCategoryId))
    .map((s) => s.id!);

  const catAvg = calculateAverage(catSkillIds);

  // Calculate Max Percentage across all employees (Highest Average)
  const maxAvg = Math.max(...employees.map(e => calculateAverage(catSkillIds, e.id) || 0), 0);

  return (
    <div>
      <div
        style={{
          display: "flex",
          backgroundColor: "var(--mantine-color-gray-light)",
          borderBottom: "1px solid var(--mantine-color-default-border)",
        }}
      >
        <div
          style={{
            width: labelWidth,
            padding: "8px 12px",
            position: "sticky",
            left: 0,
            zIndex: 15,
            backgroundColor: "var(--mantine-color-gray-light)",
            borderRight: "1px solid var(--mantine-color-default-border)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
          onMouseEnter={() => setIsLabelHovered(true)}
          onMouseLeave={() => setIsLabelHovered(false)}
        >
          <Group gap="xs">
            <ActionIcon
              size="xs"
              variant="transparent"
              onClick={() => onToggleCategory(category.id!)}
            >
              {isCatCollapsed ? <IconPlus size={14} /> : <IconMinus size={14} />}
            </ActionIcon>
            <Text
              fw={700}
              size="xs"
              style={{ cursor: "pointer" }}
              onClick={() => onToggleCategory(category.id!)}
            >
              {category.name.toUpperCase()}
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
                    <Text fw={700} size="sm">{category.name}</Text>
                    <ActionIcon
                      variant="subtle"
                      color="blue"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        onEditCategory(category.id!);
                      }}
                    >
                      <IconPencil size={16} />
                    </ActionIcon>
                  </Group>
                  <Text size="xs" c="dimmed">
                    {category.description || "Keine Beschreibung verfügbar."}
                  </Text>
                </Stack>
              </HoverCard.Dropdown>
            </HoverCard>
          </Group>
          <Group gap={4} align="center">
            {/* Toggle based on showMaxValues */}
            {!showMaxValues ? (
              // Average Bubble
              <Tooltip label="Durchschnittliche Abdeckung" withArrow>
                <Badge size="xs" variant="filled" color={getScoreColor(catAvg)}>
                  {catAvg === null ? "N/A" : `${catAvg}%`}
                </Badge>
              </Tooltip>
            ) : (
              // Max Percentage Bubble
              <Tooltip label={`Max. Abdeckung: ${maxAvg}%`} withArrow>
                <Badge size="xs" variant="filled" color={getScoreColor(maxAvg)} style={{ border: '1px solid currentColor' }}>
                  {maxAvg}%
                </Badge>
              </Tooltip>
            )}
          </Group>
        </div >
        {
          columns.map((col) => {
            const cellStyle: React.CSSProperties = {
              width: cellSize,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              backgroundColor: col.backgroundColor || (col.type === 'employee' && hoveredEmployeeId === col.id ? "var(--mantine-color-default-hover)" : "transparent"),
              borderRight: col.type === 'group-summary' ? "2px solid var(--mantine-color-default-border)" : undefined,
              transition: "background-color 0.15s ease",
            };
            // Override hover if not grouped/colored
            if (!col.backgroundColor && col.type === 'employee' && hoveredEmployeeId === col.id) {
              cellStyle.backgroundColor = "var(--mantine-color-default-hover)";
            }

            if (col.type === 'group-summary') {
              // Calculate summary for this group
              let totalScore = 0;
              let count = 0;
              col.employeeIds.forEach(eId => {
                const emp = employees.find(e => e.id === eId);
                catSkillIds.forEach(sId => {
                  const roleTarget = getRoleTargetForSkill(emp?.role, sId, roles as any);
                  const asm = getAssessment(eId, sId);
                  const level = asm?.level ?? (roleTarget && roleTarget > 0 ? 0 : -1);
                  if (level > -1) {
                    totalScore += level;
                    count++;
                  }
                });
              });
              const avg = count > 0 ? Math.round(totalScore / count) : 0;

              // Calculate Max Average for this group
              const empAvgs = col.employeeIds.map(eId => {
                const emp = employees.find(e => e.id === eId);
                let eTotal = 0;
                let eCount = 0;
                catSkillIds.forEach(sId => {
                  const roleTarget = getRoleTargetForSkill(emp?.role, sId, roles as any);
                  const asm = getAssessment(eId, sId);
                  const level = asm?.level ?? (roleTarget && roleTarget > 0 ? 0 : -1);
                  if (level > -1) {
                    eTotal += level;
                    eCount++;
                  }
                });
                return eCount > 0 ? Math.round(eTotal / eCount) : 0;
              });
              const maxAvg = empAvgs.length > 0 ? Math.max(...empAvgs) : 0;

              return (
                <div
                  key={col.id}
                  style={cellStyle}
                >
                  {showMaxValues ? (
                    maxAvg > 0 ? (
                      <Badge size="xs" variant="filled" color={getScoreColor(maxAvg)} style={{ border: '1px solid currentColor' }}>
                        {maxAvg}%
                      </Badge>
                    ) : <Text fw={700} size="xs" c="dimmed">-</Text>
                  ) : (
                    <Text fw={700} size="xs" c={getScoreColor(avg)}>
                      {avg === 0 ? "-" : `${avg}%`}
                    </Text>
                  )}
                </div>
              );
            }

            const emp = col.employee;
            const avg = calculateAverage(catSkillIds, emp.id);

            return (
              <BulkLevelMenu
                key={emp.id}
                label={`Alle "${category.name}" setzen für ${anonymizeName(emp.name, emp.id)}`}
                onSelectLevel={(level) => onBulkSetLevel(emp.id!, catSkillIds, level)}
              >
                <div
                  onMouseEnter={() => onEmployeeHover(emp.id!)}
                  onMouseLeave={() => onEmployeeHover(null)}
                  style={{
                    ...cellStyle,
                    cursor: "pointer",
                  }}
                >
                  <Text fw={700} size="xs" c={getScoreColor(avg)}>
                    {avg === null ? "N/A" : `${avg}%`}
                  </Text>
                </div>
              </BulkLevelMenu>
            );
          })
        }
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
      </div >

      {!isCatCollapsed && (
        <>
          {categorySubcategories.map((sub) => {
            const subSkills = skills.filter((s) => s.subCategoryId === sub.id);
            return (
              <MatrixSubcategoryRow
                key={sub.id}
                columns={columns}
                subcategory={sub}
                skills={subSkills}
                employees={employees}
                roles={roles}
                isCollapsed={collapsedStates[sub.id!]}
                hoveredSkillId={hoveredSkillId}
                hoveredEmployeeId={hoveredEmployeeId}
                onToggle={() => onToggleSubcategory(sub.id!)}
                onSkillHover={onSkillHover}
                onEmployeeHover={onEmployeeHover}
                calculateAverage={calculateAverage}
                getAssessment={getAssessment}
                onBulkSetLevel={onBulkSetLevel}
                onLevelChange={onLevelChange}
                onTargetLevelChange={onTargetLevelChange}
                showMaxValues={showMaxValues}
                onEditSkill={onEditSkill}
                onEditSubcategory={onEditSubcategory}
                isEditMode={isEditMode}
                onAddSkill={onAddSkill}
              />
            );
          })}
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
                  padding: "4px 12px 4px 24px",
                  position: "sticky",
                  left: 0,
                  zIndex: 10,
                  backgroundColor: "var(--mantine-color-body)",
                  borderRight: "1px solid var(--mantine-color-default-border)",
                }}
              >
                <ActionIcon
                  variant="subtle"
                  size="sm"
                  color="blue"
                  onClick={onAddSubcategory}
                  style={{ width: "100%", justifyContent: "flex-start" }}
                >
                  <IconPlus size={14} style={{ marginRight: 8 }} />
                  <span style={{ fontSize: "12px" }}>Unterkategorie hinzufügen</span>
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
    </div >
  );
};
