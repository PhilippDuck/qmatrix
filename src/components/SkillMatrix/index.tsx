import React, { useMemo, useState, useEffect } from "react";
import {
  Box,
  Group,
  Card,
  Title,
  Button,
  ActionIcon,
  Tooltip,
} from "@mantine/core";
import {
  IconLayoutNavbarCollapse,
  IconX,
  IconPlus,
  IconUserPlus,
} from "@tabler/icons-react";
import { useData } from "../../context/DataContext";
import { getNextLevel } from "../../utils/skillCalculations";
import { EmployeeDrawer } from "../shared/EmployeeDrawer";
import { EmptyState } from "./EmptyState";
import { MatrixHeader } from "./MatrixHeader";
import { MatrixCategoryRow } from "./MatrixCategoryRow";
import { MatrixLegend } from "./MatrixLegend";
import { QuickAddDrawer } from "./QuickAddDrawer";

export const SkillMatrix: React.FC = () => {
  const {
    employees,
    categories,
    subcategories,
    skills,
    setAssessment,
    getAssessment,
    addEmployee,
    addSkill,
  } = useData();

  const [legendOpened, setLegendOpened] = useState(false);
  const [focusEmployeeId, setFocusEmployeeId] = useState<string | null>(null);
  const [hoveredSkillId, setHoveredSkillId] = useState<string | null>(null);
  const [hoveredEmployeeId, setHoveredEmployeeId] = useState<string | null>(null);

  // Employee Drawer state
  const [employeeDrawerOpened, setEmployeeDrawerOpened] = useState(false);

  // Skill Drawer state
  const [skillDrawerOpened, setSkillDrawerOpened] = useState(false);

  const [collapsedStates, setCollapsedStates] = useState<Record<string, boolean>>(() => {
    const saved = localStorage.getItem("skill-matrix-collapsed");
    return saved ? JSON.parse(saved) : {};
  });

  useEffect(() => {
    localStorage.setItem("skill-matrix-collapsed", JSON.stringify(collapsedStates));
  }, [collapsedStates]);

  const displayedEmployees = useMemo(
    () =>
      focusEmployeeId
        ? employees.filter((e) => e.id === focusEmployeeId)
        : employees,
    [employees, focusEmployeeId]
  );

  const toggleItem = (id: string) =>
    setCollapsedStates((prev) => ({ ...prev, [id]: !prev[id] }));

  const handleGlobalToggle = () => {
    const categoryIds = categories.map((c) => c.id!);
    const subcategoryIds = subcategories.map((s) => s.id!);

    const collapsedCategories = categoryIds.filter((id) => collapsedStates[id]).length;
    const collapsedSubcategories = subcategoryIds.filter((id) => collapsedStates[id]).length;

    const allCollapsed = collapsedCategories === categoryIds.length;
    const onlySubsCollapsed = collapsedCategories === 0 && collapsedSubcategories === subcategoryIds.length;
    const allExpanded = collapsedCategories === 0 && collapsedSubcategories === 0;

    if (allCollapsed) {
      // State 1 -> State 2: Open categories, keep subcategories collapsed
      setCollapsedStates(
        Object.fromEntries(subcategoryIds.map((id) => [id, true]))
      );
    } else if (onlySubsCollapsed) {
      // State 2 -> State 3: Expand everything
      setCollapsedStates({});
    } else {
      // State 3 (or any other) -> State 1: Collapse everything
      setCollapsedStates(
        Object.fromEntries([...categoryIds, ...subcategoryIds].map((id) => [id, true]))
      );
    }
  };

  const calculateAverage = (
    skillIds: string[],
    specificEmployeeId?: string
  ): number | null => {
    if (skillIds.length === 0 || employees.length === 0) return 0;
    let totalScore = 0,
      relevantCount = 0,
      hasAnyRelevant = false;
    const targetEmps = specificEmployeeId
      ? employees.filter((e) => e.id === specificEmployeeId)
      : displayedEmployees;

    skillIds.forEach((sId) => {
      targetEmps.forEach((emp) => {
        const val = getAssessment(emp.id!, sId)?.level ?? 0;
        if (val !== -1) {
          totalScore += val;
          relevantCount++;
          hasAnyRelevant = true;
        }
      });
    });
    if (specificEmployeeId && !hasAnyRelevant) return null;
    return relevantCount === 0 ? 0 : Math.round(totalScore / relevantCount);
  };

  const bulkSetLevel = async (
    empId: string,
    skillIds: string[],
    newLevel: number
  ) => {
    for (const sId of skillIds) {
      await setAssessment(empId, sId, newLevel as any);
    }
  };

  const handleLevelChange = async (empId: string, sId: string, cur: number) => {
    const nextLevel = getNextLevel(cur);
    await setAssessment(empId, sId, nextLevel as any);
  };

  const getAssessmentLevel = (employeeId: string, skillId: string): number => {
    return getAssessment(employeeId, skillId)?.level ?? 0;
  };

  const calculateEmployeeAverage = (employeeId: string): number | null => {
    return calculateAverage(
      skills.map((s) => s.id!),
      employeeId
    );
  };

  const handleAddEmployee = async (name: string, department: string) => {
    await addEmployee({ name, department });
  };

  const handleAddSkill = async (subcategoryId: string, name: string, description: string) => {
    await addSkill({ subCategoryId: subcategoryId, name, description });
  };

  // Empty state check - but allow adding if we have categories
  if (employees.length === 0 && categories.length === 0) {
    return <EmptyState />;
  }

  return (
    <Box
      style={{
        height: "100%",
        width: "100%",
        display: "flex",
        flexDirection: "column",
        userSelect: "none",
      }}
    >
      <Group mb="lg" justify="space-between">
        <Group gap="sm">
          <Title order={2}>Qualifizierungsmatrix</Title>
          <Tooltip label="Alle ein-/ausklappen">
            <ActionIcon
              variant="light"
              color="gray"
              onClick={handleGlobalToggle}
              size="lg"
            >
              <IconLayoutNavbarCollapse size={20} />
            </ActionIcon>
          </Tooltip>
          <Tooltip label="Skill hinzufügen">
            <ActionIcon
              variant="light"
              color="gray"
              onClick={() => setSkillDrawerOpened(true)}
              size="lg"
            >
              <IconPlus size={20} />
            </ActionIcon>
          </Tooltip>
          <Tooltip label="Mitarbeiter hinzufügen">
            <ActionIcon
              variant="light"
              color="gray"
              onClick={() => setEmployeeDrawerOpened(true)}
              size="lg"
            >
              <IconUserPlus size={20} />
            </ActionIcon>
          </Tooltip>
        </Group>
        {focusEmployeeId && (
          <Button
            leftSection={<IconX size={16} />}
            variant="filled"
            color="red"
            onClick={() => setFocusEmployeeId(null)}
          >
            Fokus beenden
          </Button>
        )}
      </Group>

      <Card
        withBorder
        p={0}
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
        }}
      >
        <div style={{ overflow: "auto", flex: 1 }}>
          <div
            style={{
              width: "max-content",
              display: "flex",
              flexDirection: "column",
              minWidth: "100%",
            }}
          >
            <MatrixHeader
              employees={displayedEmployees}
              focusEmployeeId={focusEmployeeId}
              hoveredEmployeeId={hoveredEmployeeId}
              onFocusChange={setFocusEmployeeId}
              onHoverChange={setHoveredEmployeeId}
              calculateEmployeeAverage={calculateEmployeeAverage}
            />

            {categories.map((cat) => (
              <MatrixCategoryRow
                key={cat.id}
                category={cat}
                subcategories={subcategories}
                skills={skills}
                employees={displayedEmployees}
                collapsedStates={collapsedStates}
                hoveredSkillId={hoveredSkillId}
                hoveredEmployeeId={hoveredEmployeeId}
                onToggleCategory={toggleItem}
                onToggleSubcategory={toggleItem}
                onSkillHover={setHoveredSkillId}
                onEmployeeHover={setHoveredEmployeeId}
                calculateAverage={calculateAverage}
                getAssessmentLevel={getAssessmentLevel}
                onBulkSetLevel={bulkSetLevel}
                onLevelChange={handleLevelChange}
              />
            ))}
          </div>
        </div>
      </Card>

      <MatrixLegend
        opened={legendOpened}
        onToggle={() => setLegendOpened((o) => !o)}
      />

      {/* Employee Drawer - same as on Mitarbeiter page */}
      <EmployeeDrawer
        opened={employeeDrawerOpened}
        onClose={() => setEmployeeDrawerOpened(false)}
        onSave={handleAddEmployee}
      />

      {/* Skill Quick Add Drawer */}
      <QuickAddDrawer
        opened={skillDrawerOpened}
        onClose={() => setSkillDrawerOpened(false)}
        mode="skill"
        subcategories={subcategories}
        preselectedSubcategoryId={null}
        onAddEmployee={async () => {}}
        onAddSkill={handleAddSkill}
      />
    </Box>
  );
};
