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
  IconFilter,
} from "@tabler/icons-react";
import { useData } from "../../context/DataContext";
import {
  Popover,
  Stack,
  MultiSelect,
  Badge,
} from "@mantine/core";
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
    departments, // Get departments
    roles,       // Get roles
    setAssessment,
    setTargetLevel,
    getAssessment,
    addEmployee,
    updateEmployee,
    addSkill,
    addCategory,
    addSubCategory,
    importData,
  } = useData();

  const [legendOpened, setLegendOpened] = useState(false);
  const [focusEmployeeId, setFocusEmployeeId] = useState<string | null>(null);
  const [hoveredSkillId, setHoveredSkillId] = useState<string | null>(null);
  const [hoveredEmployeeId, setHoveredEmployeeId] = useState<string | null>(null);

  // Employee Drawer state
  const [employeeDrawerOpened, setEmployeeDrawerOpened] = useState(false);
  const [editingEmployeeId, setEditingEmployeeId] = useState<string | null>(null);

  // Skill Drawer state
  const [skillDrawerOpened, setSkillDrawerOpened] = useState(false);

  const [collapsedStates, setCollapsedStates] = useState<Record<string, boolean>>(() => {
    const saved = localStorage.getItem("skill-matrix-collapsed");
    return saved ? JSON.parse(saved) : {};
  });

  useEffect(() => {
    localStorage.setItem("skill-matrix-collapsed", JSON.stringify(collapsedStates));
  }, [collapsedStates]);

  // Filters
  const [filterDepartments, setFilterDepartments] = useState<string[]>([]);
  const [filterRoles, setFilterRoles] = useState<string[]>([]);
  const [filterCategories, setFilterCategories] = useState<string[]>([]);

  const displayedEmployees = useMemo(() => {
    let result = employees;

    if (focusEmployeeId) {
      result = result.filter((e) => e.id === focusEmployeeId);
    }

    if (filterDepartments.length > 0) {
      const targetDepartmentNames = departments
        .filter((d) => filterDepartments.includes(d.id!))
        .map((d) => d.name);

      if (targetDepartmentNames.length > 0) {
        result = result.filter(
          (e) => e.department && targetDepartmentNames.includes(e.department)
        );
      }
    }

    if (filterRoles.length > 0) {
      const targetRoleNames = roles
        .filter((r) => filterRoles.includes(r.id!))
        .map((r) => r.name);

      if (targetRoleNames.length > 0) {
        result = result.filter(
          (e) => e.role && targetRoleNames.includes(e.role)
        );
      }
    }

    return result;
  }, [employees, focusEmployeeId, filterDepartments, filterRoles, departments, roles]);

  const displayedCategories = useMemo(() => {
    if (filterCategories.length > 0) {
      return categories.filter((c) => filterCategories.includes(c.id!));
    }
    return categories;
  }, [categories, filterCategories]);

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
        const assessment = getAssessment(emp.id!, sId);
        // If assessment exists, use its level, otherwise treat as 0
        const val = assessment?.level ?? 0;

        // Ignore N/A (-1)
        if (val === -1) return;

        totalScore += val;
        relevantCount++;
        hasAnyRelevant = true;
      });
    });

    // If no relevant assessments found (all N/A or empty), return null
    if (relevantCount === 0) return null;
    return Math.round(totalScore / relevantCount);
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

  const handleLevelChange = async (empId: string, sId: string, newLevel: number) => {
    await setAssessment(empId, sId, newLevel as any);
  };

  const handleTargetLevelChange = async (empId: string, sId: string, target: number | undefined) => {
    await setTargetLevel(empId, sId, target);
  };

  const calculateEmployeeAverage = (employeeId: string): number | null => {
    return calculateAverage(
      skills.map((s) => s.id!),
      employeeId
    );
  };

  const handleEditEmployee = (id: string) => {
    setEditingEmployeeId(id);
    setEmployeeDrawerOpened(true);
  };

  const handleSaveEmployee = async (name: string, department: string, role: string) => {
    if (editingEmployeeId) {
      await updateEmployee(editingEmployeeId, { name, department, role });
    } else {
      await addEmployee({ name, department, role });
    }
  };

  const handleAddSkill = async (subcategoryId: string, name: string, description: string) => {
    await addSkill({ subCategoryId: subcategoryId, name, description });
  };



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
      {employees.length === 0 && categories.length === 0 ? (
        <EmptyState
          onAddEmployee={() => setEmployeeDrawerOpened(true)}
          onAddSkill={() => setSkillDrawerOpened(true)}
          onImport={async (file) => {
            try {
              const text = await file.text();
              await importData(text);
            } catch (error) {
              console.error("Import failed:", error);
              alert("Fehler beim Importieren der Datei. Bitte prüfen Sie das Format.");
            }
          }}
        />
      ) : (
        <>
          <Group mb="lg" justify="space-between">
            <Group gap="sm">
              <Title order={2}>Skill-Matrix</Title>
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
              <Popover width={300} position="bottom" withArrow shadow="md">
                <Popover.Target>
                  <ActionIcon variant="light" color="gray" size="lg" aria-label="Filter">
                    <IconFilter size={20} />
                  </ActionIcon>
                </Popover.Target>
                <Popover.Dropdown>
                  <Stack>
                    <MultiSelect
                      label="Abteilungen"
                      placeholder="Wähle Abteilungen"
                      data={departments.map(d => ({ value: d.id!, label: d.name }))}
                      value={filterDepartments}
                      onChange={setFilterDepartments}
                      clearable
                      searchable
                    />
                    <MultiSelect
                      label="Rollen / Level"
                      placeholder="Wähle Rollen"
                      data={roles.map(r => ({ value: r.id!, label: r.name }))}
                      value={filterRoles}
                      onChange={setFilterRoles}
                      clearable
                      searchable
                    />
                    <MultiSelect
                      label="Hauptkategorien"
                      placeholder="Wähle Kategorien"
                      data={categories.map(c => ({ value: c.id!, label: c.name }))}
                      value={filterCategories}
                      onChange={setFilterCategories}
                      clearable
                      searchable
                    />
                  </Stack>
                </Popover.Dropdown>
              </Popover>
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

          {
            (filterDepartments.length > 0 || filterRoles.length > 0 || filterCategories.length > 0) && (
              <Group mb="md" gap="xs">
                {filterDepartments.map((id) => {
                  const item = departments.find((d) => d.id === id);
                  return item ? (
                    <Badge
                      key={id}
                      size="lg"
                      variant="light"
                      color="blue"
                      rightSection={
                        <ActionIcon
                          size="xs"
                          color="blue"
                          variant="transparent"
                          onClick={() =>
                            setFilterDepartments((prev) => prev.filter((x) => x !== id))
                          }
                        >
                          <IconX size={12} />
                        </ActionIcon>
                      }
                    >
                      {item.name}
                    </Badge>
                  ) : null;
                })}

                {filterRoles.map((id) => {
                  const item = roles.find((r) => r.id === id);
                  return item ? (
                    <Badge
                      key={id}
                      size="lg"
                      variant="light"
                      color="green"
                      rightSection={
                        <ActionIcon
                          size="xs"
                          color="green"
                          variant="transparent"
                          onClick={() =>
                            setFilterRoles((prev) => prev.filter((x) => x !== id))
                          }
                        >
                          <IconX size={12} />
                        </ActionIcon>
                      }
                    >
                      {item.name}
                    </Badge>
                  ) : null;
                })}

                {filterCategories.map((id) => {
                  const item = categories.find((c) => c.id === id);
                  return item ? (
                    <Badge
                      key={id}
                      size="lg"
                      variant="light"
                      color="grape"
                      rightSection={
                        <ActionIcon
                          size="xs"
                          color="grape"
                          variant="transparent"
                          onClick={() =>
                            setFilterCategories((prev) => prev.filter((x) => x !== id))
                          }
                        >
                          <IconX size={12} />
                        </ActionIcon>
                      }
                    >
                      {item.name}
                    </Badge>
                  ) : null;
                })}

                <Badge
                  size="lg"
                  variant="light"
                  color="gray"
                  style={{ cursor: "pointer" }}
                  onClick={() => {
                    setFilterDepartments([]);
                    setFilterRoles([]);
                    setFilterCategories([]);
                  }}
                >
                  Alle Filter entfernen
                </Badge>
              </Group>
            )
          }

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
                  skills={skills}
                  getAssessment={getAssessment}
                  onEditEmployee={handleEditEmployee}
                />

                {displayedCategories.map((cat) => (
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
                    getAssessment={getAssessment}
                    onBulkSetLevel={bulkSetLevel}
                    onLevelChange={handleLevelChange}
                    onTargetLevelChange={handleTargetLevelChange}
                  />
                ))}
              </div>
            </div>
          </Card>
        </>
      )}

      <MatrixLegend
        opened={legendOpened}
        onToggle={() => setLegendOpened((o) => !o)}
      />

      {/* Employee Drawer - same as on Mitarbeiter page */}
      <EmployeeDrawer
        opened={employeeDrawerOpened}
        onClose={() => {
          setEmployeeDrawerOpened(false);
          setEditingEmployeeId(null);
        }}
        onSave={handleSaveEmployee}
        isEditing={!!editingEmployeeId}
        employeeId={editingEmployeeId}
        initialData={
          editingEmployeeId
            ? (() => {
              const emp = employees.find((e) => e.id === editingEmployeeId);
              return emp
                ? {
                  name: emp.name,
                  department: emp.department || "",
                  role: emp.role || "",
                }
                : undefined;
            })()
            : undefined
        }
      />

      {/* Skill Quick Add Drawer */}
      <QuickAddDrawer
        opened={skillDrawerOpened}
        onClose={() => setSkillDrawerOpened(false)}
        mode="skill"
        categories={categories}
        subcategories={subcategories}
        preselectedSubcategoryId={null}
        onAddEmployee={async () => { }}
        onAddSkill={handleAddSkill}
        onAddCategory={async (name) => {
          return await addCategory({ name });
        }}
        onAddSubCategory={async (categoryId, name) => {
          return await addSubCategory({ categoryId, name });
        }}
      />
    </Box >
  );
};
