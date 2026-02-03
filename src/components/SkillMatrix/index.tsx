import React, { useMemo, useState, useEffect } from "react";
import { MATRIX_LAYOUT } from "../../constants/skillLevels";
import {
  Box,
  Group,
  Card,
  Title,
  Button,
  ActionIcon,
  Tooltip,
} from "@mantine/core";
import { getRoleTargetForSkill } from "../../utils/skillCalculations";
import {
  IconLayoutNavbarCollapse,
  IconX,
  IconPlus,
  IconUserPlus,
  IconFilter,
  IconSortAscending,
  IconSortDescending,
  IconEdit,
} from "@tabler/icons-react";
import { useData } from "../../context/DataContext";
import { CreateContextMenu } from "../shared/CreateContextMenu";
import { useHotkeys, useLocalStorage } from "@mantine/hooks";
import {
  Popover,
  Stack,
  Badge,
  MultiSelect,
} from "@mantine/core";
import { EmployeeDrawer } from "../shared/EmployeeDrawer";
import { EmptyState } from "./EmptyState";
import { MatrixHeader } from "./MatrixHeader";
import { MatrixCategoryRow } from "./MatrixCategoryRow";
import { MatrixLegend } from "./MatrixLegend";
import { QuickAddDrawer } from "./QuickAddDrawer";
import { EntityFormDrawer } from "../CategoryManager/EntityFormDrawer";

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
    updateSkill,
    updateCategory,
    updateSubCategory,
    deleteCategory,
    deleteSubCategory,
    deleteSkill,
    deleteEmployee,
    importData,
  } = useData();

  const [legendOpened, setLegendOpened] = useState(false);
  const [focusEmployeeId, setFocusEmployeeId] = useState<string | null>(null);
  const [hoveredSkillId, setHoveredSkillId] = useState<string | null>(null);
  const [hoveredEmployeeId, setHoveredEmployeeId] = useState<string | null>(null);
  const [isEditMode, setIsEditMode] = useState(false);

  // Employee Drawer state
  const [employeeDrawerOpened, setEmployeeDrawerOpened] = useState(false);
  const [editingEmployeeId, setEditingEmployeeId] = useState<string | null>(null);

  // Skill Drawer state
  const [skillDrawerOpened, setSkillDrawerOpened] = useState(false);

  // Skill Edit State
  // Entity Edit State (Skill, Category, Subcategory)
  const [editEntityId, setEditEntityId] = useState<string | null>(null);
  const [editParentId, setEditParentId] = useState<string | null>(null); // For creating new items
  const [editEntityType, setEditEntityType] = useState<'skill' | 'category' | 'subcategory'>('skill');
  const [editEntityName, setEditEntityName] = useState("");
  const [editEntityDescription, setEditEntityDescription] = useState("");
  const [editDepartmentId, setEditDepartmentId] = useState<string | null>(null);
  const [editRoleIds, setEditRoleIds] = useState<string[]>([]);
  const [editDrawerOpened, setEditDrawerOpened] = useState(false);

  // Context Menu State
  const [contextMenuPos, setContextMenuPos] = useState<{ x: number; y: number } | null>(null);

  useHotkeys([
    ['alt+N', (event) => {
      event.preventDefault();
      // Center position
      setContextMenuPos({ x: window.innerWidth / 2 - 100, y: window.innerHeight / 2 });
    }]
  ], ['INPUT', 'TEXTAREA', 'SELECT']);

  const [collapsedStates, setCollapsedStates] = useState<Record<string, boolean>>(() => {
    const saved = localStorage.getItem("skill-matrix-collapsed");
    return saved ? JSON.parse(saved) : {};
  });

  useEffect(() => {
    localStorage.setItem("skill-matrix-collapsed", JSON.stringify(collapsedStates));
  }, [collapsedStates]);

  // Filters
  const [filterDepartments, setFilterDepartments] = useLocalStorage<string[]>({
    key: 'skill-matrix-filter-departments',
    defaultValue: [],
  });
  const [filterRoles, setFilterRoles] = useLocalStorage<string[]>({
    key: 'skill-matrix-filter-roles',
    defaultValue: [],
  });
  const [filterCategories, setFilterCategories] = useLocalStorage<string[]>({
    key: 'skill-matrix-filter-categories',
    defaultValue: [],
  });

  // Toggle for Max Values vs Aggregation
  const [showMaxValues, setShowMaxValues] = useLocalStorage<boolean>({
    key: 'skill-matrix-show-max-values',
    defaultValue: false,
  });

  // Sorting state: 'asc' | 'desc' | null
  const [employeeSort, setEmployeeSort] = useLocalStorage<'asc' | 'desc' | null>({
    key: 'skill-matrix-sort-employee',
    defaultValue: null,
  });
  const [skillSort, setSkillSort] = useLocalStorage<'asc' | 'desc' | null>({
    key: 'skill-matrix-sort-skill',
    defaultValue: null,
  });

  const [filtersOpened, setFiltersOpened] = useState(false);

  const displayedEmployees = useMemo(() => {
    let result = employees;

    // Focus filter
    if (focusEmployeeId) {
      result = result.filter((e) => e.id === focusEmployeeId);
    }

    // Department filter - filterDepartments contains IDs, e.department contains name
    if (filterDepartments.length > 0) {
      const selectedDeptNames = departments
        .filter(d => filterDepartments.includes(d.id!))
        .map(d => d.name);
      result = result.filter((e) => selectedDeptNames.includes(e.department || ''));
    }

    // Role filter - filterRoles contains IDs, e.role contains name
    if (filterRoles.length > 0) {
      const selectedRoleNames = roles
        .filter(r => filterRoles.includes(r.id!))
        .map(r => r.name);
      result = result.filter((e) => selectedRoleNames.includes(e.role || ''));
    }

    // Sorting
    if (employeeSort) {
      const allSkillIds = skills.map(s => s.id!);
      result = [...result].sort((a, b) => {
        if (showMaxValues) {
          // Sort by Total XP
          const calcXP = (empId: string, empRole: string | undefined) => {
            let total = 0;
            allSkillIds.forEach(sId => {
              const assessment = getAssessment(empId, sId);
              const roleTarget = getRoleTargetForSkill(empRole, sId, roles as any);
              const val = assessment?.level ?? (roleTarget && roleTarget > 0 ? 0 : -1);
              if (val > 0) total += val;
            });
            return total;
          };
          const valA = calcXP(a.id!, a.role);
          const valB = calcXP(b.id!, b.role);
          return employeeSort === 'asc' ? valA - valB : valB - valA;
        } else {
          // Sort by Average
          const calcAvg = (empId: string, empRole: string | undefined) => {
            let total = 0, count = 0;
            allSkillIds.forEach(sId => {
              const assessment = getAssessment(empId, sId);
              const roleTarget = getRoleTargetForSkill(empRole, sId, roles as any);
              const val = assessment?.level ?? (roleTarget && roleTarget > 0 ? 0 : -1);
              if (val !== -1) { total += val; count++; }
            });
            return count > 0 ? total / count : 0;
          };
          const avgA = calcAvg(a.id!, a.role);
          const avgB = calcAvg(b.id!, b.role);
          return employeeSort === 'asc' ? avgA - avgB : avgB - avgA;
        }
      });
    }

    return result;
  }, [employees, focusEmployeeId, filterDepartments, filterRoles, employeeSort, skills, departments, roles, showMaxValues, getAssessment]);

  const displayedCategories = useMemo(() => {
    let result = categories;

    // Filter by selected categories
    if (filterCategories.length > 0) {
      result = result.filter((c) => filterCategories.includes(c.id!));
    }

    // Sorting
    if (skillSort) {
      result = [...result].sort((a, b) => {
        // Get all skill IDs for each category
        const getSkillIds = (catId: string) => {
          const subs = subcategories.filter(s => s.categoryId === catId);
          const subIds = subs.map(s => s.id);
          return skills.filter(s => subIds.includes(s.subCategoryId)).map(s => s.id!);
        };

        if (showMaxValues) {
          // Sort by "Max Average" (Best employee in this category)
          const calcMaxAvg = (catId: string) => {
            const catSkillIds = getSkillIds(catId);
            if (catSkillIds.length === 0) return 0;

            // Find max avg among all displayed employees
            let maxAvg = 0;
            displayedEmployees.forEach(emp => {
              let total = 0, count = 0;
              catSkillIds.forEach(sId => {
                const assessment = getAssessment(emp.id!, sId);
                const roleTarget = getRoleTargetForSkill(emp.role, sId, roles as any);
                const val = assessment?.level ?? (roleTarget && roleTarget > 0 ? 0 : -1);
                if (val !== -1) { total += val; count++; }
              });
              const avg = count > 0 ? total / count : 0;
              if (avg > maxAvg) maxAvg = avg;
            });
            return maxAvg;
          };

          const valA = calcMaxAvg(a.id!);
          const valB = calcMaxAvg(b.id!);
          return skillSort === 'asc' ? valA - valB : valB - valA;

        } else {
          // Sort by "Overall Average"
          const calcCatAvg = (catId: string) => {
            const catSkillIds = getSkillIds(catId);
            if (catSkillIds.length === 0) return 0;
            let total = 0, count = 0;
            catSkillIds.forEach(sId => {
              displayedEmployees.forEach(emp => {
                const assessment = getAssessment(emp.id!, sId);
                const roleTarget = getRoleTargetForSkill(emp.role, sId, roles as any);
                const val = assessment?.level ?? (roleTarget && roleTarget > 0 ? 0 : -1);

                if (val !== -1) { total += val; count++; }
              });
            });
            return count > 0 ? total / count : 0;
          };

          const avgA = calcCatAvg(a.id!);
          const avgB = calcCatAvg(b.id!);
          return skillSort === 'asc' ? avgA - avgB : avgB - avgA;
        }
      });
    }

    return result;
  }, [categories, filterCategories, skillSort, subcategories, skills, displayedEmployees, getAssessment, showMaxValues]);
  // ... (unchanged toggle functions) ...

  const toggleItem = (id: string) =>
    setCollapsedStates((prev) => ({ ...prev, [id]: !prev[id] }));

  const handleGlobalToggle = () => {
    const categoryIds = categories.map((c) => c.id!);
    const subcategoryIds = subcategories.map((s) => s.id!);

    const collapsedCategories = categoryIds.filter((id) => collapsedStates[id]).length;
    const collapsedSubcategories = subcategoryIds.filter((id) => collapsedStates[id]).length;

    const allCollapsed = collapsedCategories === categoryIds.length;
    const onlySubsCollapsed = collapsedCategories === 0 && collapsedSubcategories === subcategoryIds.length;

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
      relevantCount = 0;
    const targetEmps = specificEmployeeId
      ? employees.filter((e) => e.id === specificEmployeeId)
      : displayedEmployees;

    skillIds.forEach((sId) => {
      targetEmps.forEach((emp) => {
        const assessment = getAssessment(emp.id!, sId);

        // Logic sync with MatrixSkillRow:
        // Default to -1 (N/A) if no assessment exists, unless a role target is set, then 0
        // We need to fetch role target here to be accurate
        const roleTarget = getRoleTargetForSkill(emp.role, sId, roles as any);
        const val = assessment?.level ?? (roleTarget && roleTarget > 0 ? 0 : -1);

        // Ignore N/A (-1)
        if (val === -1) return;

        totalScore += val;
        relevantCount++;
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

  const handleAddCategory = () => {
    setEditEntityId(null);
    setEditEntityType('category');
    setEditEntityName("");
    setEditEntityDescription("");
    setEditParentId(null);
    setEditDrawerOpened(true);
  };

  const handleAddSubCategory = (categoryId: string) => {
    setEditEntityId(null);
    setEditEntityType('subcategory');
    setEditEntityName("");
    setEditEntityDescription("");
    setEditParentId(categoryId);
    setEditDrawerOpened(true);
  };

  const handleOpenAddSkill = (subCategoryId: string) => {
    setEditEntityId(null);
    setEditEntityType('skill');
    setEditEntityName("");
    setEditEntityDescription("");
    setEditParentId(subCategoryId);
    setEditDepartmentId(null);
    setEditRoleIds([]);
    setEditDrawerOpened(true);
  };

  const handleEditSkill = (skillId: string) => {
    const skill = skills.find((s) => s.id === skillId);
    if (skill) {
      setEditEntityId(skillId);
      setEditEntityType('skill');
      setEditEntityName(skill.name);
      setEditEntityDescription(skill.description || "");
      setEditDepartmentId(skill.departmentId || null);
      setEditRoleIds(skill.requiredByRoleIds || []);
      setEditDrawerOpened(true);
    }
  };

  const handleEditCategory = (categoryId: string) => {
    const category = categories.find((c) => c.id === categoryId);
    if (category) {
      setEditEntityId(categoryId);
      setEditEntityType('category');
      setEditEntityName(category.name);
      setEditEntityDescription(category.description || "");
      setEditDrawerOpened(true);
    }
  };

  const handleEditSubcategory = (subcategoryId: string) => {
    const sub = subcategories.find((s) => s.id === subcategoryId);
    if (sub) {
      setEditEntityId(subcategoryId);
      setEditEntityType('subcategory');
      setEditEntityName(sub.name);
      setEditEntityDescription(sub.description || "");
      setEditDrawerOpened(true);
    }
  };

  const handleSaveEditedEntity = async () => {
    if (!editEntityName.trim()) return;

    if (editEntityId) {
      // UPDATE Mode
      if (editEntityType === 'skill') {
        const originalSkill = skills.find(s => s.id === editEntityId);
        if (originalSkill) {
          await updateSkill(editEntityId, {
            subCategoryId: originalSkill.subCategoryId,
            name: editEntityName.trim(),
            description: editEntityDescription.trim(),
            departmentId: editDepartmentId || undefined,
            requiredByRoleIds: editRoleIds,
          });
          // Also invoke helper if role relation needs explicit update or just relying on skill update is enough? 
          // DataContext updateSkillsForRole handles the inverse "Role -> Skills". 
          // Here we are updating "Skill -> Roles". 
          // If the DB logic relies on 'requiredByRoleIds' on the skill object, then we are good.
        }
      } else if (editEntityType === 'category') {
        await updateCategory(editEntityId, {
          name: editEntityName.trim(),
          description: editEntityDescription.trim(),
        });
      } else if (editEntityType === 'subcategory') {
        const originalSub = subcategories.find(s => s.id === editEntityId);
        if (originalSub) {
          await updateSubCategory(editEntityId, {
            categoryId: originalSub.categoryId,
            name: editEntityName.trim(),
            description: editEntityDescription.trim(),
          });
        }
      }
    } else {
      // CREATE Mode
      if (editEntityType === 'category') {
        await addCategory({
          name: editEntityName.trim(),
          description: editEntityDescription.trim(),
        });
      } else if (editEntityType === 'subcategory' && editParentId) {
        await addSubCategory({
          categoryId: editParentId,
          name: editEntityName.trim(),
          description: editEntityDescription.trim(),
        });
      } else if (editEntityType === 'skill' && editParentId) {
        await addSkill({
          subCategoryId: editParentId,
          name: editEntityName.trim(),
          description: editEntityDescription.trim(),
          departmentId: editDepartmentId || undefined,
          requiredByRoleIds: editRoleIds,
        });
      }
    }
    setEditDrawerOpened(false);
    setEditEntityId(null);
    setEditParentId(null);
  };

  const handleDeleteEntity = async () => {
    if (!editEntityId) return;

    if (window.confirm("Sind Sie sicher, dass Sie diesen Eintrag löschen möchten?")) {
      if (editEntityType === 'category') {
        await deleteCategory(editEntityId);
      } else if (editEntityType === 'subcategory') {
        await deleteSubCategory(editEntityId);
      } else if (editEntityType === 'skill') {
        await deleteSkill(editEntityId);
      }
      setEditDrawerOpened(false);
      setEditEntityId(null);
      setEditParentId(null);
    }
  };

  const parentContext = useMemo(() => {
    if (editEntityType === 'category') return undefined; // Categories are top-level

    if (editEntityType === 'subcategory') {
      // If creating, we have editParentId (categoryId)
      if (editParentId) {
        const cat = categories.find(c => c.id === editParentId);
        return cat ? `Kategorie: ${cat.name}` : undefined;
      }
      // If editing, we have editEntityId. Find parent category.
      if (editEntityId) {
        const sub = subcategories.find(s => s.id === editEntityId);
        if (sub) {
          const cat = categories.find(c => c.id === sub.categoryId);
          return cat ? `Kategorie: ${cat.name}` : undefined;
        }
      }
    }

    if (editEntityType === 'skill') {
      // If creating, we have editParentId (subCategoryId)
      if (editParentId) {
        const sub = subcategories.find(s => s.id === editParentId);
        if (sub) {
          const cat = categories.find(c => c.id === sub.categoryId);
          return sub ? `Unterkategorie: ${sub.name} (in ${cat?.name})` : undefined;
        }
      }
      // If editing
      if (editEntityId) {
        const skill = skills.find(s => s.id === editEntityId);
        if (skill) {
          const sub = subcategories.find(s => s.id === skill.subCategoryId);
          const cat = sub ? categories.find(c => c.id === sub.categoryId) : undefined;
          return sub ? `Unterkategorie: ${sub.name} ${cat ? `(in ${cat.name})` : ''}` : undefined;
        }
      }
    }
    return undefined;
  }, [editEntityType, editEntityId, editParentId, categories, subcategories, skills]);

  return (
    <Box
      style={{
        height: "100%",
        // ... (unchanged) ...
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
        <Stack gap="md" h="100%" style={{ overflow: "hidden" }}>
          <Group justify="space-between" align="start">
            <Group gap="md">
              <Title order={2}>Skill-Matrix</Title>

              {/* View Controls Group */}
              <Group gap="xs" style={{ borderRight: '1px solid var(--mantine-color-default-border)', paddingRight: '12px' }}>
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

                <Tooltip label={isEditMode ? "Bearbeitungsmodus beenden" : "Bearbeitungsmodus aktivieren"}>
                  <ActionIcon
                    variant={isEditMode ? "filled" : "light"}
                    color={isEditMode ? "blue" : "gray"}
                    onClick={() => setIsEditMode(!isEditMode)}
                    size="lg"
                  >
                    <IconEdit size={20} />
                  </ActionIcon>
                </Tooltip>
                <Tooltip label={showMaxValues ? "Zeige Durchschnittswerte" : "Zeige Max-Werte"}>
                  <ActionIcon
                    variant="light"
                    color="gray"
                    onClick={() => setShowMaxValues(!showMaxValues)}
                    size="lg"
                  >
                    {showMaxValues ? "MAX" : "%"}
                  </ActionIcon>
                </Tooltip>
                <Tooltip label={
                  employeeSort === null ? "Mitarbeiter sortieren (aufsteigend)" :
                    employeeSort === 'asc' ? "Mitarbeiter sortieren (absteigend)" :
                      "Mitarbeiter-Sortierung aufheben"
                }>
                  <ActionIcon
                    variant="light"
                    color={employeeSort ? "blue" : "gray"}
                    onClick={() => {
                      if (employeeSort === null) setEmployeeSort('asc');
                      else if (employeeSort === 'asc') setEmployeeSort('desc');
                      else setEmployeeSort(null);
                    }}
                    size="lg"
                  >
                    {employeeSort === 'desc' ? <IconSortDescending size={20} /> : <IconSortAscending size={20} />}
                  </ActionIcon>
                </Tooltip>
                <Tooltip label={
                  skillSort === null ? "Skills sortieren (aufsteigend)" :
                    skillSort === 'asc' ? "Skills sortieren (absteigend)" :
                      "Skills-Sortierung aufheben"
                }>
                  <ActionIcon
                    variant="light"
                    color={skillSort ? "grape" : "gray"}
                    onClick={() => {
                      if (skillSort === null) setSkillSort('asc');
                      else if (skillSort === 'asc') setSkillSort('desc');
                      else setSkillSort(null);
                    }}
                    size="lg"
                  >
                    {skillSort === 'desc' ? <IconSortDescending size={20} /> : <IconSortAscending size={20} />}
                  </ActionIcon>
                </Tooltip>
                <Popover
                  width={300}
                  position="bottom"
                  withArrow
                  shadow="md"
                  opened={filtersOpened}
                  onChange={setFiltersOpened}
                >
                  <Popover.Target>
                    <Tooltip label="Filter">
                      <ActionIcon
                        variant={filtersOpened || filterDepartments.length > 0 || filterRoles.length > 0 ? "filled" : "light"}
                        color={filtersOpened || filterDepartments.length > 0 || filterRoles.length > 0 ? "blue" : "gray"}
                        size="lg"
                        aria-label="Filter"
                        onClick={() => setFiltersOpened((o) => !o)}
                      >
                        <IconFilter size={20} />
                      </ActionIcon>
                    </Tooltip>
                  </Popover.Target>
                  <Popover.Dropdown>
                    <Stack>
                      <MultiSelect
                        comboboxProps={{ withinPortal: false }}
                        label="Abteilungen"
                        placeholder="Wähle Abteilungen"
                        data={departments.map(d => ({ value: d.id!, label: d.name }))}
                        value={filterDepartments}
                        onChange={setFilterDepartments}
                        clearable
                        searchable
                      />
                      <MultiSelect
                        comboboxProps={{ withinPortal: false }}
                        label="Rollen / Level"
                        placeholder="Wähle Rollen"
                        data={roles.map(r => ({ value: r.id!, label: r.name }))}
                        value={filterRoles}
                        onChange={setFilterRoles}
                        clearable
                        searchable
                      />
                      <MultiSelect
                        comboboxProps={{ withinPortal: false }}
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

              {/* Add Actions Group */}
              <Group gap="xs">
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
                <div
                  style={{
                    position: "sticky",
                    top: 0,
                    zIndex: 20,
                    backgroundColor: "var(--mantine-color-body)",
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
                    showMaxValues={showMaxValues}
                    isEditMode={isEditMode}
                    onAddEmployee={() => setEmployeeDrawerOpened(true)}
                  />
                </div>

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
                    showMaxValues={showMaxValues}
                    onEditSkill={handleEditSkill}
                    roles={roles}
                    onEditCategory={handleEditCategory}
                    onEditSubcategory={handleEditSubcategory}
                    isEditMode={isEditMode}
                    onAddSubcategory={() => handleAddSubCategory(cat.id!)}
                    onAddSkill={(subId) => handleOpenAddSkill(subId)}
                  />
                ))}

                {isEditMode && (
                  <div style={{ display: "flex", borderBottom: "1px solid var(--mantine-color-default-border)", backgroundColor: "var(--mantine-color-body)" }}>
                    <div
                      style={{
                        width: MATRIX_LAYOUT.labelWidth,
                        padding: "8px 12px",
                        position: "sticky",
                        left: 0,
                        zIndex: 10,
                        backgroundColor: "var(--mantine-color-body)",
                        borderRight: "1px solid var(--mantine-color-default-border)",
                      }}
                    >
                      <Button
                        variant="subtle"
                        size="xs"
                        leftSection={<IconPlus size={16} />}
                        onClick={handleAddCategory}
                        fullWidth
                        justify="flex-start"
                      >
                        Kategorie hinzufügen
                      </Button>
                    </div>
                    {/* Horizontal spacer for employees - just flex 1 to fill width */}
                    <div style={{ flex: 1 }} />
                    {/* Spacer for "Add Employee" column from header */}
                    <div style={{ width: MATRIX_LAYOUT.cellSize, borderLeft: "1px solid var(--mantine-color-default-border)" }} />
                  </div>
                )}
              </div>
            </div>
          </Card>
        </Stack>
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
        onDelete={deleteEmployee}
      />

      <EntityFormDrawer
        opened={editDrawerOpened}
        onClose={() => {
          setEditDrawerOpened(false);
          setEditEntityId(null);
          setEditParentId(null);
        }}
        formMode={editEntityType}
        editingId={editEntityId}
        inputValue={editEntityName}
        inputDescription={editEntityDescription}
        selectedDepartmentId={editDepartmentId}
        selectedRoleIds={editRoleIds}
        onInputChange={setEditEntityName}
        onDescriptionChange={setEditEntityDescription}
        onDepartmentChange={setEditDepartmentId}
        onRolesChange={setEditRoleIds}
        onSave={handleSaveEditedEntity}
        onDelete={handleDeleteEntity}
        parentContext={parentContext}
        departments={departments}
        roles={roles}
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

      <CreateContextMenu
        opened={!!contextMenuPos}
        onClose={() => setContextMenuPos(null)}
        x={contextMenuPos?.x || 0}
        y={contextMenuPos?.y || 0}
        onSelect={(type: 'employee' | 'skill') => {
          setContextMenuPos(null);
          if (type === 'employee') {
            setEmployeeDrawerOpened(true);
          } else if (type === 'skill') {
            setSkillDrawerOpened(true);
          }
        }}
      />
    </Box >
  );
};
