import React, { useMemo, useState, useEffect } from "react";
import {
  Box,
  Group,
  Card,
  Title,
  Button,
  ActionIcon,
} from "@mantine/core";
import {
  IconLayoutNavbarCollapse,
  IconX,
} from "@tabler/icons-react";
import { useData } from "../../context/DataContext";
import { getNextLevel } from "../../utils/skillCalculations";
import { EmptyState } from "./EmptyState";
import { MatrixHeader } from "./MatrixHeader";
import { MatrixCategoryRow } from "./MatrixCategoryRow";
import { MatrixLegend } from "./MatrixLegend";

export const SkillMatrix: React.FC = () => {
  const {
    employees,
    categories,
    subcategories,
    skills,
    setAssessment,
    getAssessment,
  } = useData();

  const [legendOpened, setLegendOpened] = useState(false);
  const [focusEmployeeId, setFocusEmployeeId] = useState<string | null>(null);
  const [hoveredSkillId, setHoveredSkillId] = useState<string | null>(null);
  const [hoveredEmployeeId, setHoveredEmployeeId] = useState<string | null>(null);

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
    const totalItems = categories.length + subcategories.length;
    const isEverythingCollapsed =
      Object.values(collapsedStates).filter((v) => v).length >= totalItems;
    setCollapsedStates(
      isEverythingCollapsed
        ? {}
        : Object.fromEntries(
            [...categories, ...subcategories].map((x) => [x.id!, true])
          )
    );
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

  // Empty state check
  if (employees.length === 0 || categories.length === 0) {
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
          <ActionIcon
            variant="light"
            color="gray"
            onClick={handleGlobalToggle}
            size="lg"
          >
            <IconLayoutNavbarCollapse size={20} />
          </ActionIcon>
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
    </Box>
  );
};
