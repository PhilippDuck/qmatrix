import React, { useState } from "react";
import { Text, Group, ActionIcon, Badge, Stack, Tooltip, HoverCard, Button } from "@mantine/core";
import { IconPlus, IconMinus, IconTrophy, IconPencil, IconInfoCircle, IconFolderPlus } from "@tabler/icons-react";
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
  allSubcategories: SubCategory[]; // Added: Pass all subcategories to find children
  skills: Skill[]; // Skills directly in this subcategory
  allSkills: Skill[]; // Added: Pass all skills to find descendants in children
  employees: Employee[];
  roles: EmployeeRole[];
  collapsedStates: Record<string, boolean>;
  hoveredSkillId: string | null;
  hoveredEmployeeId: string | null;
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
  onEditSubcategory: (subcategoryId: string) => void;
  isEditMode: boolean;
  onAddSkill: (subCategoryId: string) => void;
  skillSort: 'asc' | 'desc' | null;
  depth?: number;
  onAddSubcategory: (parentSubId?: string) => void;
  labelWidth?: number;
  onNavigate?: (tab: string, params?: any) => void;
}
export const MatrixSubcategoryRow: React.FC<MatrixSubcategoryRowProps> = ({
  columns,
  subcategory,
  allSubcategories,
  skills,
  allSkills,
  employees,
  roles,
  collapsedStates,
  hoveredSkillId,
  hoveredEmployeeId,
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
  onEditSubcategory,
  isEditMode,
  onAddSkill,
  skillSort,
  depth = 0,
  onAddSubcategory,
  labelWidth,
  onNavigate
}) => {
  const { anonymizeName } = usePrivacy();
  const { cellSize } = MATRIX_LAYOUT;
  const effectiveLabelWidth = labelWidth || MATRIX_LAYOUT.labelWidth;
  const isCollapsed = collapsedStates[subcategory.id!] || false;

  // Find child subcategories
  const childSubcategories = allSubcategories.filter(s => s.parentSubCategoryId === subcategory.id)
    .sort((a, b) => a.name.localeCompare(b.name, 'de'));

  // Collect all skill IDs recursively (direct + descendants)
  const getAllSkillIds = (subId: string): string[] => {
    const directSkills = allSkills.filter(s => s.subCategoryId === subId).map(s => s.id!);
    const children = allSubcategories.filter(s => s.parentSubCategoryId === subId);
    const childSkills = children.flatMap(child => getAllSkillIds(child.id!));
    return [...directSkills, ...childSkills];
  };

  const allDescendantSkillIds = getAllSkillIds(subcategory.id!);

  // Use all descendants for average calculation
  const subAvg = calculateAverage(allDescendantSkillIds);
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

  // Calculate Max Percentage across all employees (Highest Average) using all descendants
  const validAvgs = employees.map(e => calculateAverage(allDescendantSkillIds, e.id)).filter((a): a is number => a !== null);
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
            width: effectiveLabelWidth,
            padding: "6px 12px 6px 24px",
            paddingLeft: `${24 + (depth * 24)}px`, // Dynamic indentation
            position: "sticky",
            left: 0,
            zIndex: 30,
            background: "linear-gradient(var(--mantine-color-default-hover), var(--mantine-color-default-hover)), var(--mantine-color-body)",
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
            <ActionIcon size="xs" variant="transparent" onClick={() => onToggleSubcategory(subcategory.id!)}>
              {isCollapsed ? <IconPlus size={12} /> : <IconMinus size={12} />}
            </ActionIcon>
            <Text
              fw={500}
              size="xs"
              style={{ cursor: "pointer" }}
              onClick={() => onToggleSubcategory(subcategory.id!)}
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
            {showMaxValues === 'avg' ? (
              // Average Bubble
              <Tooltip label="Durchschnittliche Abdeckung" withArrow>
                <Badge size="xs" variant={subAvg === null ? "outline" : "light"} color={getScoreColor(subAvg)}>
                  {subAvg === null ? "N/A" : `${subAvg}%`}
                </Badge>
              </Tooltip>
            ) : showMaxValues === 'max' ? (
              // Max Percentage Bubble
              <Tooltip label={`Max. Abdeckung: ${maxAvg !== null ? maxAvg : "N/A"}%`} withArrow>
                <Badge size="xs" variant={maxAvg === null ? "outline" : "light"} color={maxAvg === null ? "gray" : getScoreColor(maxAvg)} style={{ border: maxAvg === null ? undefined : '1px solid currentColor' }}>
                  {maxAvg !== null ? `${maxAvg}%` : "N/A"}
                </Badge>
              </Tooltip>
            ) : (
              // Fulfillment Bubble
              (() => {
                const scores: number[] = [];
                employees.forEach(emp => {
                  allDescendantSkillIds.forEach(sId => {
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
                    <Badge size="xs" variant={ful === null ? "outline" : "light"} color={ful === null ? "gray" : ful >= 100 ? "teal" : "orange"}>
                      {ful === null ? "N/A" : `${ful}%`}
                    </Badge>
                  </Tooltip>
                );
              })()
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
              allDescendantSkillIds.forEach(sId => {
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
              allDescendantSkillIds.forEach(sId => {
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
                {showMaxValues === 'max' ? (
                  maxAvg !== null ? (
                    <Badge size="xs" variant="light" color={getScoreColor(maxAvg)} style={{ border: '1px solid currentColor' }}>
                      {maxAvg}%
                    </Badge>
                  ) : <Text size="xs" c="dimmed">-</Text>
                ) : showMaxValues === 'fulfillment' ? (
                  (() => {
                    const scores: number[] = [];
                    col.employeeIds.forEach(eId => {
                      const emp = employees.find(e => e.id === eId);
                      allDescendantSkillIds.forEach(sId => {
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
                    return <Text size="xs" fw={500} c={fulColor}>{ful === null ? '-' : `${ful}%`}</Text>;
                  })()
                ) : (
                  <Text size="xs" fw={500} c={avg === 0 ? "dimmed" : getScoreColor(avg)}>
                    {avg === 0 ? "-" : `${avg}%`}
                  </Text>
                )}
              </div>
            );
          }

          const emp = col.employee;
          const avg = calculateAverage(allDescendantSkillIds, emp.id);

          return (
            <BulkLevelMenu
              key={emp.id}
              label={`Alle "${subcategory.name}" (inkl. Untergruppen) setzen für ${anonymizeName(emp.name, emp.id)}`}
              onSelectLevel={(level) => onBulkSetLevel(emp.id!, allDescendantSkillIds, level)}
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
                <Text size="xs" fw={500} c={avg === null ? "dimmed" : getScoreColor(avg)}>
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
              depth={depth}
              labelWidth={effectiveLabelWidth}
            />
          ))}
          {isEditMode && (
            <>
              {/* Add Skill Row */}
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
                    padding: "4px 12px",
                    paddingLeft: `${24 + (depth * 24) + 20}px`,
                    position: "sticky",
                    left: 0,
                    zIndex: 30,
                    backgroundColor: "var(--mantine-color-body)",
                    borderRight: "1px solid var(--mantine-color-default-border)",
                    transition: "width 0.2s ease",
                  }}
                >
                  <Button
                    variant="subtle"
                    size="xs"
                    color="blue"
                    leftSection={<IconPlus size={14} />}
                    onClick={() => onAddSkill(subcategory.id!)}
                    fullWidth
                    justify="flex-start"
                    styles={{ section: { marginRight: 8 } }}
                  >
                    Skill hinzufügen
                  </Button>
                </div>
                {/* Empty Space for Employee Columns */}
                <div style={{ flex: 1 }} />
                {/* Empty Space for Add Employee Column */}
                <div style={{ width: cellSize }} />
              </div>

              {/* Add Subcategory Row */}
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
                    padding: "4px 12px",
                    paddingLeft: `${24 + (depth * 24) + 20}px`,
                    position: "sticky",
                    left: 0,
                    zIndex: 30,
                    backgroundColor: "var(--mantine-color-body)",
                    borderRight: "1px solid var(--mantine-color-default-border)",
                    transition: "width 0.2s ease",
                  }}
                >
                  <Button
                    variant="subtle"
                    size="xs"
                    color="violet"
                    leftSection={<IconFolderPlus size={14} />}
                    onClick={() => onAddSubcategory(subcategory.id!)}
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
            </>
          )}

          {/* Recursive Child Subcategories */}
          {childSubcategories.map((child) => {
            const childSkills = allSkills.filter(s => s.subCategoryId === child.id);
            return (
              <MatrixSubcategoryRow
                key={child.id}
                columns={columns}
                subcategory={child}
                allSubcategories={allSubcategories}
                skills={childSkills}
                allSkills={allSkills}
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
                skillSort={skillSort}
                depth={depth + 1}
                onAddSubcategory={onAddSubcategory}
                labelWidth={labelWidth}
                onNavigate={onNavigate}
              />
            );
          })}
        </>
      )}
    </div>
  );
};
