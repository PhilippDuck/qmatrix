import React, { useState } from "react";
import { Text, Group, ActionIcon, Badge, Stack, Tooltip, HoverCard } from "@mantine/core";
import { IconPlus, IconMinus, IconTrophy, IconPencil, IconInfoCircle } from "@tabler/icons-react";
import { MATRIX_LAYOUT } from "../../constants/skillLevels";
import { getScoreColor } from "../../utils/skillCalculations";
import { InfoTooltip } from "../shared/InfoTooltip";
import { BulkLevelMenu } from "./BulkLevelMenu";
import { MatrixSubcategoryRow } from "./MatrixSubcategoryRow";
import { Employee, Category, SubCategory, Skill, Assessment } from "../../context/DataContext";
import { usePrivacy } from "../../context/PrivacyContext";

interface MatrixCategoryRowProps {
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
          employees.map((emp) => {
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
