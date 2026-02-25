import React, { useState, useMemo } from "react";
import { Text, Group, ActionIcon, Badge, Stack, Tooltip, HoverCard, Button } from "@mantine/core";
import { IconPlus, IconMinus, IconTrophy, IconPencil, IconInfoCircle, IconFolderPlus } from "@tabler/icons-react";
import { MATRIX_LAYOUT } from "../../constants/skillLevels";
import { getScoreColor, getMaxRoleTargetForSkill } from "../../utils/skillCalculations";
import { getAllSkillIdsForSubcategory } from "../../utils/hierarchyUtils";
import { InfoTooltip } from "../shared/InfoTooltip";
import { BulkLevelMenu } from "./BulkLevelMenu";
import { MatrixSkillRow } from "./MatrixSkillRow";
import { Employee, SubCategory, Skill, Assessment, EmployeeRole, QualificationMeasure, QualificationPlan } from "../../store/useStore";
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
  onToggleSubcategory: (subcategoryId: string) => void;
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
  renderChildren?: boolean;
  measuresMap?: Map<string, QualificationMeasure[]>;
  qualificationPlans?: QualificationPlan[];
}

export const MatrixSubcategoryRow: React.FC<MatrixSubcategoryRowProps> = React.memo(({
  columns,
  subcategory,
  allSubcategories,
  skills,
  allSkills,
  employees,
  roles,
  collapsedStates,
  onToggleSubcategory,
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
  onNavigate,
  renderChildren = true,
  measuresMap,
  qualificationPlans,
}) => {
  const { anonymizeName } = usePrivacy();
  const { cellSize } = MATRIX_LAYOUT;
  const effectiveLabelWidth = labelWidth || MATRIX_LAYOUT.labelWidth;
  const isCollapsed = collapsedStates[subcategory.id!] || false;

  // Find child subcategories
  const childSubcategories = useMemo(() =>
    allSubcategories
      .filter(s => s.parentSubCategoryId === subcategory.id)
      .sort((a, b) => a.name.localeCompare(b.name, 'de')),
    [allSubcategories, subcategory.id]
  );

  const allDescendantSkillIds = useMemo(
    () => getAllSkillIdsForSubcategory(subcategory.id!, allSubcategories, allSkills),
    [subcategory.id, allSubcategories, allSkills]
  );

  // Pre-compute per-employee averages (avoids recalculation on every hover event)
  const perEmployeeAvgMap = useMemo(() => {
    const map = new Map<string, number | null>();
    columns.forEach(col => {
      if (col.type === 'employee') {
        map.set(col.employee.id!, calculateAverage(allDescendantSkillIds, col.employee.id));
      }
    });
    return map;
  }, [columns, allDescendantSkillIds, calculateAverage]);

  // Pre-compute group-summary metrics (avoids recalculation on every hover event)
  const groupSummaryMap = useMemo(() => {
    const map = new Map<string, { avg: number; maxAvg: number | null; fulfillmentPct: number | null }>();
    columns.forEach(col => {
      if (col.type !== 'group-summary') return;
      let totalScore = 0, count = 0;
      col.employeeIds.forEach(eId => {
        const emp = employees.find(e => e.id === eId);
        allDescendantSkillIds.forEach(sId => {
          const roleTarget = getMaxRoleTargetForSkill(emp?.roles, sId, roles);
          const asm = getAssessment(eId, sId);
          const rawLevel = asm?.level ?? -1;
          const level = (rawLevel === -1 && roleTarget !== undefined) ? 0 : rawLevel;
          if (level > -1) { totalScore += level; count++; }
        });
      });
      const avg = count > 0 ? Math.round(totalScore / count) : 0;
      const empAvgs = col.employeeIds.map(eId => {
        const emp = employees.find(e => e.id === eId);
        let eTotal = 0, eCount = 0;
        allDescendantSkillIds.forEach(sId => {
          const roleTarget = getMaxRoleTargetForSkill(emp?.roles, sId, roles);
          const asm = getAssessment(eId, sId);
          const rawLevel = asm?.level ?? -1;
          const level = (rawLevel === -1 && roleTarget !== undefined) ? 0 : rawLevel;
          if (level > -1) { eTotal += level; eCount++; }
        });
        return eCount > 0 ? Math.round(eTotal / eCount) : null;
      });
      const validEmpAvgs = empAvgs.filter((a): a is number => a !== null);
      const maxAvg = validEmpAvgs.length > 0 ? Math.max(...validEmpAvgs) : null;
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
      const fulfillmentPct = scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : null;
      map.set(col.id, { avg, maxAvg, fulfillmentPct });
    });
    return map;
  }, [columns, allDescendantSkillIds, employees, getAssessment, roles]);

  // Use all descendants for average calculation
  const subAvg = useMemo(() => calculateAverage(allDescendantSkillIds), [calculateAverage, allDescendantSkillIds]);
  const [isLabelHovered, setIsLabelHovered] = useState(false);

  // Sort skills
  const sortedSkills = useMemo(() =>
    [...skills].sort((a, b) => {
      if (skillSort) {
        const avgA = calculateAverage([a.id!]) || 0;
        const avgB = calculateAverage([b.id!]) || 0;
        return skillSort === 'asc' ? avgA - avgB : avgB - avgA;
      }
      return a.name.localeCompare(b.name, 'de');
    }),
    [skills, skillSort, calculateAverage]
  );

  // Calculate Max Percentage across all employees (Highest Average) using all descendants
  const maxAvg = useMemo(() => {
    const validAvgs = employees.map(e => calculateAverage(allDescendantSkillIds, e.id)).filter((a): a is number => a !== null);
    return validAvgs.length > 0 ? Math.max(...validAvgs) : null;
  }, [employees, allDescendantSkillIds, calculateAverage]);

  // Pre-compute fulfillment for the label badge
  const fulfillmentPct = useMemo(() => {
    if (showMaxValues !== 'fulfillment') return null;
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
    return scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : null;
  }, [showMaxValues, employees, allDescendantSkillIds, getAssessment, roles]);

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
              style={{ cursor: "pointer", whiteSpace: "nowrap" }}
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
                <Badge size="xs" w={46} variant={subAvg === null ? "outline" : "light"} color={getScoreColor(subAvg)}>
                  {subAvg === null ? "N/A" : `${subAvg}%`}
                </Badge>
              </Tooltip>
            ) : showMaxValues === 'max' ? (
              // Max Percentage Bubble
              <Tooltip label={`Max. Abdeckung: ${maxAvg !== null ? maxAvg : "N/A"}%`} withArrow>
                <Badge size="xs" w={46} variant={maxAvg === null ? "outline" : "light"} color={maxAvg === null ? "gray" : getScoreColor(maxAvg)} style={{ border: maxAvg === null ? undefined : '1px solid currentColor' }}>
                  {maxAvg !== null ? `${maxAvg}%` : "N/A"}
                </Badge>
              </Tooltip>
            ) : (
              // Fulfillment Bubble
              <Tooltip label="Erfüllungsgrad (Ist/Soll)" withArrow>
                <Badge size="xs" w={46} variant={fulfillmentPct === null ? "outline" : "light"} color={fulfillmentPct === null ? "gray" : fulfillmentPct >= 100 ? "teal" : "orange"}>
                  {fulfillmentPct === null ? "N/A" : `${fulfillmentPct}%`}
                </Badge>
              </Tooltip>
            )}
          </Group>
        </div>
        {columns.map((col) => {
          if (col.type === 'group-summary') {
            const { avg, maxAvg, fulfillmentPct: ful } = groupSummaryMap.get(col.id) ?? { avg: 0, maxAvg: null, fulfillmentPct: null };
            return (
              <div
                key={col.id}
                style={{
                  width: cellSize,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  backgroundColor: col.backgroundColor || "var(--mantine-color-default-hover)",
                  borderRight: "2px solid var(--mantine-color-default-border)",
                }}
              >
                {showMaxValues === 'max' ? (
                  maxAvg !== null ? (
                    <Badge size="xs" variant="light" color={getScoreColor(maxAvg)} style={{ border: '1px solid currentColor' }}>
                      {maxAvg}%
                    </Badge>
                  ) : <Text size="xs" c="dimmed">-</Text>
                ) : showMaxValues === 'fulfillment' ? (
                  <Text size="xs" fw={500} c={ful === null ? 'dimmed' : ful >= 100 ? 'teal' : 'orange'}>
                    {ful === null ? '-' : `${ful}%`}
                  </Text>
                ) : (
                  <Text size="xs" fw={500} c={avg === 0 ? "dimmed" : getScoreColor(avg)}>
                    {avg === 0 ? "-" : `${avg}%`}
                  </Text>
                )}
              </div>
            );
          }

          const emp = col.employee;
          const avg = perEmployeeAvgMap.get(emp.id!) ?? null;

          return (
            <BulkLevelMenu
              key={emp.id}
              label={`Alle "${subcategory.name}" (inkl. Untergruppen) setzen für ${anonymizeName(emp.name, emp.id)}`}
              onSelectLevel={(level) => onBulkSetLevel(emp.id!, allDescendantSkillIds, level)}
            >
              <div
                style={{
                  width: cellSize,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  backgroundColor: col.backgroundColor || "transparent",
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

      {renderChildren && !isCollapsed && (
        <>
          {sortedSkills.map((skill) => (
            <MatrixSkillRow
              key={skill.id}
              skill={skill}
              columns={columns}
              employees={employees}
              roles={roles}
              getAssessment={getAssessment}
              calculateSkillAverage={(skillId) => calculateAverage([skillId]) ?? null}
              onLevelChange={onLevelChange}
              onTargetLevelChange={onTargetLevelChange}
              showMaxValues={showMaxValues}
              onEditSkill={onEditSkill}
              isEditMode={isEditMode}
              depth={depth}
              labelWidth={effectiveLabelWidth}
              measuresMap={measuresMap}
              qualificationPlans={qualificationPlans}
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
                measuresMap={measuresMap}
                qualificationPlans={qualificationPlans}
              />
            );
          })}
        </>
      )}
    </div>
  );
});
