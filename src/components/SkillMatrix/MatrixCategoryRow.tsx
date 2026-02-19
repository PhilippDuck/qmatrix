import React, { useState } from "react";
import { Text, Group, ActionIcon, Badge, Stack, Tooltip, HoverCard, Button } from "@mantine/core";
import { IconPlus, IconMinus, IconTrophy, IconPencil, IconInfoCircle } from "@tabler/icons-react";
import { MATRIX_LAYOUT } from "../../constants/skillLevels";
import { getScoreColor, getMaxRoleTargetForSkill } from "../../utils/skillCalculations";
import { InfoTooltip } from "../shared/InfoTooltip";
import { BulkLevelMenu } from "./BulkLevelMenu";
import { MatrixSubcategoryRow } from "./MatrixSubcategoryRow";
import { Employee, Category, SubCategory, Skill, Assessment, EmployeeRole } from "../../context/DataContext";
import { usePrivacy } from "../../context/PrivacyContext";

import { MatrixColumn } from "./types";

interface MatrixCategoryRowProps {
  columns: MatrixColumn[];
  category: Category;
  subcategories: SubCategory[];
  skills: Skill[];
  employees: Employee[];
  roles: EmployeeRole[];
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
  showMaxValues: 'avg' | 'max' | 'fulfillment';
  onEditSkill: (skillId: string) => void;
  onEditCategory: (categoryId: string) => void;
  onEditSubcategory: (subcategoryId: string) => void;
  isEditMode: boolean;
  onAddSubcategory: (parentSubId?: string) => void;
  onAddSkill: (subCategoryId: string) => void;
  skillSort: 'asc' | 'desc' | null;
  labelWidth?: number;
  onNavigate?: (tab: string, params?: any) => void;
  renderChildren?: boolean;
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
  skillSort,
  labelWidth,
  onNavigate,
  renderChildren = true
}) => {
  const { anonymizeName } = usePrivacy();
  const isCatCollapsed = collapsedStates[category.id!];
  const { cellSize } = MATRIX_LAYOUT;
  const effectiveLabelWidth = labelWidth || MATRIX_LAYOUT.labelWidth;
  const [isLabelHovered, setIsLabelHovered] = useState(false);

  // Helper function to recursively get all subcategory IDs (including nested ones)
  const getAllSubcategoryIds = (categoryId: string): string[] => {
    const ids: string[] = [];

    // Get root-level subcategories for this category
    const rootSubs = subcategories.filter(s =>
      s.categoryId === categoryId && !s.parentSubCategoryId
    );

    // Recursive helper to collect children
    const collectChildren = (parentId: string) => {
      const children = subcategories.filter(s => s.parentSubCategoryId === parentId);
      children.forEach(child => {
        ids.push(child.id!);
        collectChildren(child.id!); // Recurse into deeper levels
      });
    };

    // Add root subs and their descendants
    rootSubs.forEach(sub => {
      ids.push(sub.id!);
      collectChildren(sub.id!);
    });

    return ids;
  };

  // Get ALL subcategory IDs for this category (including nested ones)
  const allSubIds = getAllSubcategoryIds(category.id!);

  // Get subcategories for this category and sort them (only root level for display)
  const categorySubcategories = [...subcategories.filter(
    (s) => s.categoryId === category.id && !s.parentSubCategoryId
  )].sort((a, b) => {
    if (skillSort) {
      // Sort by value - use recursive skill collection
      const getSubSkillIdsRecursive = (subId: string): string[] => {
        const directSkills = skills.filter(s => s.subCategoryId === subId).map(s => s.id!);
        const childSubs = subcategories.filter(s => s.parentSubCategoryId === subId);
        const childSkills = childSubs.flatMap(child => getSubSkillIdsRecursive(child.id!));
        return [...directSkills, ...childSkills];
      };
      const avgA = calculateAverage(getSubSkillIdsRecursive(a.id!)) || 0;
      const avgB = calculateAverage(getSubSkillIdsRecursive(b.id!)) || 0;
      return skillSort === 'asc' ? avgA - avgB : avgB - avgA;
    }
    // Default: alphabetical
    return a.name.localeCompare(b.name, 'de');
  });

  // Get all skills for this category (from ALL subcategories including nested)
  const catSkillIds = skills
    .filter((s) => allSubIds.includes(s.subCategoryId))
    .map((s) => s.id!);

  const catAvg = calculateAverage(catSkillIds);

  // Calculate Max Percentage across all employees (Highest Average)
  const validAvgs = employees.map(e => calculateAverage(catSkillIds, e.id)).filter((a): a is number => a !== null);
  const maxAvg = validAvgs.length > 0 ? Math.max(...validAvgs) : null;

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
            width: effectiveLabelWidth,
            padding: "8px 12px",
            position: "sticky",
            left: 0,
            zIndex: 30,
            background: "linear-gradient(var(--mantine-color-gray-light), var(--mantine-color-gray-light)), var(--mantine-color-body)",
            borderRight: "1px solid var(--mantine-color-default-border)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            transition: "width 0.2s ease",
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
            {showMaxValues === 'avg' ? (
              // Average Bubble
              <Tooltip label="Durchschnittliche Abdeckung" withArrow>
                <Badge size="xs" variant={catAvg === null ? "outline" : "filled"} color={catAvg === null ? "gray" : getScoreColor(catAvg)}>
                  {catAvg === null ? "N/A" : `${catAvg}%`}
                </Badge>
              </Tooltip>
            ) : showMaxValues === 'max' ? (
              // Max Percentage Bubble
              <Tooltip label={`Max. Abdeckung: ${maxAvg !== null ? maxAvg : "N/A"}%`} withArrow>
                <Badge size="xs" variant={maxAvg === null ? "outline" : "filled"} color={maxAvg === null ? "gray" : getScoreColor(maxAvg)} style={{ border: maxAvg === null ? undefined : '1px solid currentColor' }}>
                  {maxAvg !== null ? `${maxAvg}%` : "N/A"}
                </Badge>
              </Tooltip>
            ) : (
              // Fulfillment Bubble
              (() => {
                const scores: number[] = [];
                employees.forEach(emp => {
                  catSkillIds.forEach(sId => {
                    const asm = getAssessment(emp.id!, sId);
                    const individualTarget = asm?.targetLevel || 0;
                    const roleTarget = getMaxRoleTargetForSkill(emp.roles, sId, roles) || 0;
                    const target = Math.max(individualTarget, roleTarget);
                    if (target > 0) {
                      const level = asm?.level ?? (roleTarget ? 0 : -1);
                      if (level >= 0) scores.push(Math.min(100, Math.round((level / target) * 100)));
                    }
                  });
                });
                const ful = scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : null;
                return (
                  <Tooltip label="Erfüllungsgrad (Ist/Soll)" withArrow>
                    <Badge size="xs" variant={ful === null ? "outline" : "filled"} color={ful === null ? "gray" : ful >= 100 ? "teal" : "orange"}>
                      {ful === null ? "N/A" : `${ful}%`}
                    </Badge>
                  </Tooltip>
                );
              })()
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
              const empAvgs = col.employeeIds.map(eId => {
                const emp = employees.find(e => e.id === eId);
                let eTotal = 0;
                let eCount = 0;
                catSkillIds.forEach(sId => {
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
                  style={cellStyle}
                >
                  {showMaxValues === 'max' ? (
                    maxAvg !== null ? (
                      <Badge size="xs" variant="filled" color={getScoreColor(maxAvg)} style={{ border: '1px solid currentColor' }}>
                        {maxAvg}%
                      </Badge>
                    ) : <Text fw={700} size="xs" c="dimmed">-</Text>
                  ) : showMaxValues === 'fulfillment' ? (
                    (() => {
                      const scores: number[] = [];
                      col.employeeIds.forEach(eId => {
                        const emp = employees.find(e => e.id === eId);
                        catSkillIds.forEach(sId => {
                          const asm = getAssessment(eId, sId);
                          const individualTarget = asm?.targetLevel || 0;
                          const roleTarget = getMaxRoleTargetForSkill(emp?.roles, sId, roles) || 0;
                          const target = Math.max(individualTarget, roleTarget);
                          if (target > 0) {
                            const level = asm?.level ?? (roleTarget ? 0 : -1);
                            if (level >= 0) scores.push(Math.min(100, Math.round((level / target) * 100)));
                          }
                        });
                      });
                      const ful = scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : null;
                      const fulColor = ful === null ? 'dimmed' : ful >= 100 ? 'teal' : 'orange';
                      return <Text fw={700} size="xs" c={fulColor}>{ful === null ? '-' : `${ful}%`}</Text>;
                    })()
                  ) : (
                    <Text fw={700} size="xs" c={avg === 0 ? "dimmed" : getScoreColor(avg)}>
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
                  <Text fw={700} size="xs" c={avg === null ? "dimmed" : getScoreColor(avg)}>
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

      {renderChildren && !isCatCollapsed && (
        <>
          {categorySubcategories.map((sub) => {
            const subSkills = skills.filter((s) => s.subCategoryId === sub.id);
            return (
              <MatrixSubcategoryRow
                key={sub.id}
                columns={columns}
                subcategory={sub}
                allSubcategories={subcategories} // Pass all so it can find children if any (global or category scoped?)
                // Actually we probably want to pass ALL available subcategories so it can find ANY child,
                // even if that child technically belongs to the same parent category.
                // `subcategories` prop passed to MatrixCategoryRow contains all subcategories (from context).
                allSkills={skills} // Pass all skills
                skills={subSkills}
                employees={employees}
                roles={roles}
                collapsedStates={collapsedStates}
                onToggleSubcategory={onToggleSubcategory}
                hoveredSkillId={hoveredSkillId}
                hoveredEmployeeId={hoveredEmployeeId}
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
                onAddSubcategory={onAddSubcategory} // Pass it down for children
                skillSort={skillSort}
                labelWidth={effectiveLabelWidth}
                onNavigate={onNavigate}
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
                  width: effectiveLabelWidth,
                  padding: "4px 12px 4px 24px",
                  position: "sticky",
                  left: 0,
                  zIndex: 30,
                  backgroundColor: "var(--mantine-color-body)",
                  borderRight: "1px solid var(--mantine-color-default-border)",
                }}
              >
                <Button
                  variant="subtle"
                  size="xs"
                  color="blue"
                  leftSection={<IconPlus size={14} />}
                  onClick={() => onAddSubcategory()} // No parent ID for top-level subcategory
                  fullWidth
                  justify="flex-start"
                  styles={{ section: { marginRight: 8 } }}
                >
                  Unterkategorie hinzufügen
                </Button>

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
