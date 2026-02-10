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
  Text,
  useMantineColorScheme,
} from "@mantine/core";
import { getMaxRoleTargetForSkill } from "../../utils/skillCalculations";
import {
  IconLayoutNavbarCollapse,
  IconX,
  IconPlus,
  IconUserPlus,
  IconFilter,
  IconSortAscending,
  IconSortDescending,
  IconEdit,
  IconUsersGroup,
  IconBuilding,
  IconUserCircle,
  IconSum,
  IconPercentage,
  IconEye,
  IconEyeOff,
  IconDeviceFloppy,
  IconColumnsOff,
  IconUserOff,
} from "@tabler/icons-react";
import { useData, Employee, SavedView } from "../../context/DataContext";
import { ViewTabs } from "./ViewTabs";
import { SaveViewModal } from "./SaveViewModal";
import { CreateContextMenu } from "../shared/CreateContextMenu";
import { useHotkeys, useLocalStorage } from "@mantine/hooks";
import {
  Popover,
  Stack,
  Badge,
  MultiSelect,
  Modal,
} from "@mantine/core";
import { EmployeeDrawer } from "../shared/EmployeeDrawer";
import { EmptyState } from "./EmptyState";
import { MatrixHeader } from "./MatrixHeader";
import { MatrixCategoryRow } from "./MatrixCategoryRow";
import { MatrixLegend } from "./MatrixLegend";
import { QuickAddDrawer } from "./QuickAddDrawer";
import { EntityFormDrawer, FormMode, EntityFormValues } from "../CategoryManager/EntityFormDrawer";

import { SegmentedControl } from "@mantine/core";
import { MatrixColumn } from "./types";

interface SkillMatrixProps {
  onNavigate?: (tab: string, params?: any) => void;
}

export const SkillMatrix: React.FC<SkillMatrixProps> = ({ onNavigate }) => {
  const {
    employees,
    categories,
    subcategories,
    skills,
    departments, // Get departments
    roles,       // Get roles
    savedViews,
    addSavedView,
    updateSavedView,
    deleteSavedView,
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

  // Delete Modal State
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);

  // Skill Edit State
  // Entity Edit State (Skill, Category, Subcategory)
  const [editEntityId, setEditEntityId] = useState<string | null>(null);
  const [editParentId, setEditParentId] = useState<string | null>(null); // Category ID
  const [editParentSubId, setEditParentSubId] = useState<string | null>(null); // SubCategory ID (for nesting)
  const [editEntityType, setEditEntityType] = useState<'skill' | 'category' | 'subcategory'>('skill');
  const [editEntityName, setEditEntityName] = useState("");
  const [editEntityDescription, setEditEntityDescription] = useState("");
  const [editEntityDepartmentId, setEditEntityDepartmentId] = useState<string | null>(null);
  const [editEntityRoleIds, setEditEntityRoleIds] = useState<string[]>([]);
  const [editEntitySubCategoryIds, setEditEntitySubCategoryIds] = useState<string[]>([]); // New
  const [editDrawerOpened, setEditDrawerOpened] = useState(false);
  const [initialValues, setInitialValues] = useState<EntityFormValues>({
    name: "",
    description: "",
    departmentId: null,
    roleIds: [],
    subCategoryIds: [],
  });

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

  // Grouping mode
  const [groupingMode, setGroupingMode] = useLocalStorage<'none' | 'department' | 'role'>({
    key: 'skill-matrix-grouping-mode',
    defaultValue: 'none',
  });

  // State to toggle employee visibility in grouped mode
  const [hideEmployees, setHideEmployees] = useLocalStorage<boolean>({
    key: 'skill-matrix-hide-employees',
    defaultValue: false,
  });

  // Toggle for hiding N/A columns
  const [hideNaColumns, setHideNaColumns] = useLocalStorage<boolean>({
    key: 'skill-matrix-hide-na-columns',
    defaultValue: false,
  });

  // Toggle for showing inactive employees
  const [showInactive, setShowInactive] = useLocalStorage<boolean>({
    key: 'skill-matrix-show-inactive',
    defaultValue: false,
  });



  const [filtersOpened, setFiltersOpened] = useState(false);

  // Saved View State
  const [activeViewId, setActiveViewId] = useLocalStorage<string | null>({
    key: 'skill-matrix-active-view-id',
    defaultValue: null,
  });
  const [saveViewModalOpened, setSaveViewModalOpened] = useState(false);

  // Apply a Saved View
  const handleSelectView = (view: SavedView) => {
    setActiveViewId(view.id!);

    // Apply filters
    setFilterDepartments(view.config.filters.departments);
    setFilterRoles(view.config.filters.roles);
    setFilterCategories(view.config.filters.categories);

    // Apply grouping
    setGroupingMode(view.config.groupingMode);

    // Apply settings
    setShowMaxValues(view.config.settings.showMaxValues);
    setHideEmployees(view.config.settings.hideEmployees);
    setHideEmployees(view.config.settings.hideEmployees);
    setHideNaColumns(view.config.settings.hideNaColumns || false);
    setShowInactive(view.config.settings.showInactive || false);

    // Apply sort
    setEmployeeSort(view.config.sort.employee);
    setSkillSort(view.config.sort.skill);

    // Apply collapsed states
    if (view.config.collapsedStates) {
      setCollapsedStates(view.config.collapsedStates);
    }
  };

  const handleSaveView = async (name: string) => {
    // Construct the view object
    const newView: Omit<SavedView, "id" | "updatedAt"> = {
      name: name,
      config: {
        filters: {
          departments: filterDepartments,
          roles: filterRoles,
          categories: filterCategories,
        },
        groupingMode: groupingMode,
        settings: {
          showMaxValues: showMaxValues,
          hideEmployees: hideEmployees,
          hideNaColumns: hideNaColumns,
          showInactive: showInactive,
        },
        sort: {
          employee: employeeSort,
          skill: skillSort,
        },
        collapsedStates: collapsedStates,
      },
    };

    try {
      const id = await addSavedView(newView);
      setActiveViewId(id);
    } catch (error) {
      console.error("Failed to save view:", error);
    }
  };

  // Check if current settings differ from active view
  const isViewDirty = useMemo(() => {
    if (!activeViewId) return false;
    const activeView = savedViews?.find(v => v.id === activeViewId);
    if (!activeView) return false;

    const config = activeView.config;
    return (
      JSON.stringify(config.filters.departments) !== JSON.stringify(filterDepartments) ||
      JSON.stringify(config.filters.roles) !== JSON.stringify(filterRoles) ||
      JSON.stringify(config.filters.categories) !== JSON.stringify(filterCategories) ||
      config.groupingMode !== groupingMode ||
      config.settings.showMaxValues !== showMaxValues ||
      config.settings.hideEmployees !== hideEmployees ||
      config.settings.hideNaColumns !== hideNaColumns ||
      config.settings.showInactive !== showInactive ||
      config.sort.employee !== employeeSort ||
      config.sort.skill !== skillSort ||
      JSON.stringify(config.collapsedStates || {}) !== JSON.stringify(collapsedStates)
    );
  }, [activeViewId, savedViews, filterDepartments, filterRoles, filterCategories, groupingMode, showMaxValues, hideEmployees, hideNaColumns, employeeSort, skillSort, collapsedStates]);

  // Update the current active view with current settings
  const handleUpdateCurrentView = async () => {
    if (!activeViewId) return;
    const activeView = savedViews?.find(v => v.id === activeViewId);
    if (!activeView) return;

    try {
      await updateSavedView(activeViewId, {
        name: activeView.name,
        config: {
          filters: {
            departments: filterDepartments,
            roles: filterRoles,
            categories: filterCategories,
          },
          groupingMode: groupingMode,
          settings: {
            showMaxValues: showMaxValues,
            hideEmployees: hideEmployees,
            hideNaColumns: hideNaColumns,
            showInactive: showInactive,
          },
          sort: {
            employee: employeeSort,
            skill: skillSort,
          },
          collapsedStates: collapsedStates,
        },
      });
    } catch (error) {
      console.error("Failed to update view:", error);
    }
  };

  const handleClearView = () => {
    setActiveViewId(null);
    // Optionally reset filters to defaults?
    // Or just "deselect" the pill.
    // User requested "different views for different purposes".
    // "Default" button usually means "Reset everything".
    setFilterDepartments([]);
    setFilterRoles([]);
    setFilterCategories([]);
    setGroupingMode("none");
    setShowMaxValues(false);
    setHideEmployees(false);
    setHideEmployees(false);
    setHideNaColumns(false);
    setShowInactive(false);
    setEmployeeSort(null);
    setSkillSort(null);
  };

  const handleDeleteView = async (id: string) => {
    // If deleting the active view, switch to default view first
    if (activeViewId === id) {
      handleClearView();
    }
    await deleteSavedView(id);
  };

  const displayedEmployees = useMemo(() => {
    let result = employees;

    // Focus filter
    if (focusEmployeeId) {
      result = result.filter((e) => e.id === focusEmployeeId);
    }

    // Filter Inactive
    if (!showInactive) {
      result = result.filter(e => e.isActive !== false);
    }

    // Department filter - filterDepartments contains IDs, e.department contains name
    if (filterDepartments.length > 0) {
      const selectedDeptNames = departments
        .filter(d => filterDepartments.includes(d.id!))
        .map(d => d.name);
      result = result.filter((e) => selectedDeptNames.includes(e.department || ''));
    }

    // Role filter - filterRoles contains IDs, e.roles contains names
    if (filterRoles.length > 0) {
      const selectedRoleNames = roles
        .filter(r => filterRoles.includes(r.id!))
        .map(r => r.name);
      result = result.filter((e) =>
        e.roles && e.roles.some(role => selectedRoleNames.includes(role))
      );
    }

    // Sorting
    if (employeeSort) {
      const allSkillIds = skills.map(s => s.id!);
      result = [...result].sort((a, b) => {
        if (showMaxValues) {
          // Sort by Total XP
          const calcXP = (empId: string, empRoles: string[] | undefined) => {
            let total = 0;
            allSkillIds.forEach(sId => {
              const assessment = getAssessment(empId, sId);
              const roleTarget = getMaxRoleTargetForSkill(empRoles, sId, roles);
              const rawLevel = assessment?.level ?? -1;
              const val = (rawLevel === -1 && roleTarget !== undefined) ? 0 : rawLevel;
              if (val > 0) total += val;
            });
            return total;
          };
          const valA = calcXP(a.id!, a.roles);
          const valB = calcXP(b.id!, b.roles);
          return employeeSort === 'asc' ? valA - valB : valB - valA;
        } else {
          // Sort by Average
          const calcAvg = (empId: string, empRoles: string[] | undefined) => {
            let total = 0, count = 0;
            allSkillIds.forEach(sId => {
              const assessment = getAssessment(empId, sId);
              const roleTarget = getMaxRoleTargetForSkill(empRoles, sId, roles);
              const rawLevel = assessment?.level ?? -1;
              const val = (rawLevel === -1 && roleTarget !== undefined) ? 0 : rawLevel;
              if (val !== -1) { total += val; count++; }
            });
            return count > 0 ? total / count : 0;
          };
          const avgA = calcAvg(a.id!, a.roles);
          const avgB = calcAvg(b.id!, b.roles);
          return employeeSort === 'asc' ? avgA - avgB : avgB - avgA;
        }
      });
    }

    return result;
  }, [employees, focusEmployeeId, filterDepartments, filterRoles, employeeSort, skills, departments, roles, showMaxValues, getAssessment, showInactive]);

  const displayedCategories = useMemo(() => {
    let result = [...categories];

    // Filter by selected categories
    if (filterCategories.length > 0) {
      result = result.filter((c) => filterCategories.includes(c.id!));
    }

    // Sorting
    if (skillSort) {
      // Sort by value (average or max)
      result = result.sort((a, b) => {
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
                const roleTarget = getMaxRoleTargetForSkill(emp.roles, sId, roles);
                const val = assessment?.level ?? (roleTarget !== undefined ? 0 : -1);
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
                const roleTarget = getMaxRoleTargetForSkill(emp.roles, sId, roles);
                const rawLevel = assessment?.level ?? -1;
                const val = (rawLevel === -1 && roleTarget !== undefined) ? 0 : rawLevel;

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
    } else {
      // Default: alphabetical sorting
      result = result.sort((a, b) => a.name.localeCompare(b.name, 'de'));
    }

    return result;
  }, [categories, filterCategories, skillSort, subcategories, skills, displayedEmployees, getAssessment, showMaxValues]);

  const { colorScheme } = useMantineColorScheme();

  const matrixColumns = useMemo<MatrixColumn[]>(() => {
    // Define simple darker colors for dark mode context or translucent ones
    const isDark = colorScheme === 'dark';

    if (groupingMode === 'none') {
      const cols: MatrixColumn[] = displayedEmployees.map(e => ({ type: 'employee', id: e.id!, employee: e }));
      // No summary column needed for "No Grouping" view as aggregated values are in row headers
      return cols;
    }

    const groups = new Map<string, Employee[]>();
    const noGroup: Employee[] = [];

    displayedEmployees.forEach(e => {
      if (groupingMode === 'department') {
        const key = e.department;
        if (key) {
          if (!groups.has(key)) groups.set(key, []);
          groups.get(key)!.push(e);
        } else {
          noGroup.push(e);
        }
      } else {
        // Grouping by role - employee appears only in their first/primary role
        const employeeRoles = e.roles || [];
        if (employeeRoles.length > 0) {
          const primaryRole = employeeRoles[0]; // Use first role as primary
          if (!groups.has(primaryRole)) groups.set(primaryRole, []);
          groups.get(primaryRole)!.push(e);
        } else {
          noGroup.push(e);
        }
      }
    });

    const sortedKeys = Array.from(groups.keys()).sort((a, b) => {
      if (employeeSort === 'desc') return a.localeCompare(b, 'de');
      return b.localeCompare(a, 'de');
    });
    const columns: MatrixColumn[] = [];

    // Define colors for groups (rotating pastel colors)
    // In dark mode, we use very low opacity colors to just tint the background
    const backgroundColors = [
      isDark ? 'rgba(34, 139, 230, 0.15)' : 'var(--mantine-color-blue-0)',
      isDark ? 'rgba(64, 192, 87, 0.15)' : 'var(--mantine-color-green-0)',
      isDark ? 'rgba(121, 80, 242, 0.15)' : 'var(--mantine-color-violet-0)',
      isDark ? 'rgba(253, 126, 20, 0.15)' : 'var(--mantine-color-orange-0)',
      isDark ? 'rgba(18, 184, 134, 0.15)' : 'var(--mantine-color-teal-0)',
      isDark ? 'rgba(224, 49, 140, 0.15)' : 'var(--mantine-color-pink-0)',
      isDark ? 'rgba(250, 204, 21, 0.15)' : 'var(--mantine-color-yellow-0)',
      isDark ? 'rgba(21, 170, 191, 0.15)' : 'var(--mantine-color-cyan-0)',
    ];

    // Handle "No Group" (Sonstige)
    if (noGroup.length > 0) {
      const key = 'Sonstige';
      const bgColor = isDark ? 'rgba(255, 255, 255, 0.05)' : 'var(--mantine-color-gray-0)';

      // Employees
      if (!hideEmployees) {
        noGroup.forEach(e => columns.push({
          type: 'employee',
          id: e.id!,
          employee: e,
          groupId: key,
          backgroundColor: bgColor
        }));
      }

      // Summary
      columns.push({
        type: 'group-summary',
        id: `summary-${key}`,
        label: key,
        employeeIds: noGroup.map(e => e.id!),
        groupId: key,
        backgroundColor: bgColor
      });
    }

    let colorIndex = 0;
    sortedKeys.forEach(key => {
      const groupEmps = groups.get(key)!;
      const bgColor = backgroundColors[colorIndex % backgroundColors.length];
      colorIndex++;

      // Employees
      if (!hideEmployees) {
        groupEmps.forEach(e => columns.push({
          type: 'employee',
          id: e.id!,
          employee: e,
          groupId: key,
          backgroundColor: bgColor
        }));
      }

      // Summaries
      columns.push({
        type: 'group-summary',
        id: `summary-${key}`,
        label: key,
        employeeIds: groupEmps.map(e => e.id!),
        groupId: key,
        backgroundColor: bgColor
      });
    });

    return columns;
  }, [displayedEmployees, groupingMode, colorScheme, hideEmployees, employeeSort]);

  const nextGroupingMode = () => {
    const modes: ('none' | 'department' | 'role')[] = ['none', 'department', 'role'];
    const currentIndex = modes.indexOf(groupingMode);
    setGroupingMode(modes[(currentIndex + 1) % modes.length]);
  };

  const getGroupingLabel = (mode: 'none' | 'department' | 'role') => {
    switch (mode) {
      case 'none': return 'Keine Gruppierung';
      case 'department': return 'Nach Abteilung';
      case 'role': return 'Nach Rolle';
    }
  };

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
    // Return null (N/A) if no skills - prevents confusing 0% display
    if (skillIds.length === 0) return null;
    if (employees.length === 0) return 0;
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
        const roleTarget = getMaxRoleTargetForSkill(emp.roles, sId, roles);
        const rawLevel = assessment?.level ?? -1;
        const val = (rawLevel === -1 && roleTarget !== undefined) ? 0 : rawLevel;

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

  const handleSaveEmployee = async (name: string, department: string, roles: string[], isActive: boolean, deactivationDate?: Date | null, reactivationDate?: Date | null) => {
    const formatDate = (date: Date | null | undefined) => {
      if (!date) return undefined;
      return date.toISOString();
    };

    const data = {
      name,
      department,
      roles,
      isActive,
      deactivationDate: formatDate(deactivationDate),
      reactivationDate: formatDate(reactivationDate)
    };

    if (editingEmployeeId) {
      await updateEmployee(editingEmployeeId, data);
    } else {
      await addEmployee(data);
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
    setInitialValues({
      name: "",
      description: "",
      departmentId: null,
      roleIds: [],
      subCategoryIds: [],
    });
    setEditDrawerOpened(true);
  };

  const handleAddSubCategory = (categoryId: string, parentSubId?: string) => {
    setEditEntityId(null);
    setEditEntityType('subcategory');
    setEditEntityName("");
    setEditEntityDescription("");
    setEditParentId(categoryId);
    setEditParentSubId(parentSubId || null);
    setInitialValues({
      name: "",
      description: "",
      departmentId: null,
      roleIds: [],
      subCategoryIds: [],
    });
    setEditDrawerOpened(true);
  };

  const handleOpenAddSkill = (subCategoryId: string) => {
    setEditEntityId(null);
    setEditEntityType('skill');
    setEditEntityName("");
    setEditEntityDescription("");
    setEditEntityDescription("");
    setEditEntityDepartmentId(null);
    setEditEntityRoleIds([]);
    setEditParentId(subCategoryId);
    setInitialValues({
      name: "",
      description: "",
      departmentId: null,
      roleIds: [],
      subCategoryIds: [],
    });
    setEditDrawerOpened(true);
  };

  const handleEditSkill = (skillId: string) => {
    const skill = skills.find((s) => s.id === skillId);
    if (skill) {
      setEditEntityId(skillId);
      setEditEntityType('skill');
      setEditEntityName(skill.name);
      setEditEntityDescription(skill.description || "");
      setEditEntityDepartmentId(skill.departmentId || null);
      setEditEntityRoleIds(skill.requiredByRoleIds || []); // Assuming requiredByRoleIds is the correct field for roles on skill
      setEditParentId(skill.subCategoryId);
      setInitialValues({
        name: skill.name,
        description: skill.description || "",
        departmentId: skill.departmentId || null,
        roleIds: skill.requiredByRoleIds || [], // Assuming requiredByRoleIds is the correct field for roles on skill
        subCategoryIds: [],
      });
      setEditDrawerOpened(true);
    }
  };

  const handleEditCategory = (categoryId: string) => {
    const category = categories.find((c) => c.id === categoryId);
    if (category) {
      setEditEntityId(category.id!);
      setEditEntityType('category');
      setEditEntityName(category.name);
      setEditEntityDescription(category.description || "");
      setInitialValues({
        name: category.name,
        description: category.description || "",
        departmentId: null,
        roleIds: [],
        subCategoryIds: [],
      });
      setEditDrawerOpened(true);
    }
  };

  const handleEditSubcategory = (subcategoryId: string) => {
    const sub = subcategories.find((s) => s.id === subcategoryId);
    if (sub) {
      setEditEntityId(sub.id!);
      setEditEntityType('subcategory');
      setEditEntityName(sub.name);
      setEditEntityDescription(sub.description || "");
      setInitialValues({
        name: sub.name,
        description: sub.description || "",
        departmentId: null,
        roleIds: [],
        subCategoryIds: [],
      });
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
            departmentId: editEntityDepartmentId || undefined,
            requiredByRoleIds: editEntityRoleIds,
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
            parentSubCategoryId: originalSub.parentSubCategoryId, // Preserve parent if not changed (TODO: allow moving)
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
          parentSubCategoryId: editParentSubId || undefined,
          name: editEntityName.trim(),
          description: editEntityDescription.trim(),
        });
      } else if (editEntityType === 'skill' && editParentId) {
        await addSkill({
          subCategoryId: editParentId,
          name: editEntityName.trim(),
          description: editEntityDescription.trim(),
          departmentId: editEntityDepartmentId || undefined,
          requiredByRoleIds: editEntityRoleIds,
        });
      }
    }
    setEditDrawerOpened(false);
    setEditEntityId(null);
    setEditParentId(null);
  };

  const handleDeleteEntity = () => {
    if (!editEntityId) return;
    setDeleteModalOpen(true);
  };

  const confirmDelete = async () => {
    if (!editEntityId) return;

    if (editEntityType === 'category') {
      await deleteCategory(editEntityId);
    } else if (editEntityType === 'subcategory') {
      await deleteSubCategory(editEntityId);
    } else if (editEntityType === 'skill') {
      await deleteSkill(editEntityId);
    }
    setDeleteModalOpen(false);
    setEditDrawerOpened(false);
    setEditEntityId(null);
    setEditParentId(null);
  };

  const parentContext = useMemo(() => {
    if (editEntityType === 'category') return undefined; // Categories are top-level

    if (editEntityType === 'subcategory') {
      // If creating, we have editParentId (categoryId)
      if (editParentId) {
        // Check for nested subcategory parent
        if (editParentSubId) {
          const sub = subcategories.find(s => s.id === editParentSubId);
          return sub ? `Übergeordnete Gruppe: ${sub.name}` : undefined;
        }

        const cat = categories.find(c => c.id === editParentId);
        return cat ? `Kategorie: ${cat.name}` : undefined;
      }
      // If editing, we have editEntityId. Find parent category.
      if (editEntityId) {
        const sub = subcategories.find(s => s.id === editEntityId);
        if (sub) {
          if (sub.parentSubCategoryId) {
            const parentSub = subcategories.find(s => s.id === sub.parentSubCategoryId);
            return parentSub ? `Übergeordnete Gruppe: ${parentSub.name}` : undefined;
          }
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

  // Dynamische Breite für die Label-Spalte berechnen
  const responsiveLabelWidth = useMemo(() => {
    let maxW = 260; // Min width aus Constants
    const charW = 7.5; // Reduziert für engere Breite (vorher 9)

    const calcW = (text: string, depth: number, type: 'cat' | 'sub' | 'skill') => {
      let padding = 24; // Reduzierter Buffer (vorher 40) + Icons
      if (type === 'cat') padding += 0;
      else if (type === 'sub') padding += (depth * 24);
      else if (type === 'skill') padding += 20 + (depth * 24); // +20 indentation for skills

      return padding + (text.length * charW) + 24; // + Buffer right (vorher 40)
    };

    categories.forEach(cat => {
      maxW = Math.max(maxW, calcW(cat.name, 0, 'cat'));

      // If category collapsed, skip children
      if (collapsedStates[cat.id!]) return;

      // Rekursive Funktion für Subkategorien
      const processSub = (subId: string, depth: number) => {
        const sub = subcategories.find(s => s.id === subId);
        if (!sub) return;

        maxW = Math.max(maxW, calcW(sub.name, depth, 'sub'));

        // If subcategory collapsed, skip processing its children (skills and nested subs)
        if (collapsedStates[sub.id!]) return;

        // Buttons: "Unterkategorie hinzufügen" ~25 chars, "Skill hinzufügen" ~16 chars
        maxW = Math.max(maxW, calcW("Unterkategorie hinzufügen", depth, 'sub'));
        maxW = Math.max(maxW, calcW("Skill hinzufügen", depth, 'sub'));

        // Skills
        const subSkills = skills.filter(s => s.subCategoryId === subId);
        subSkills.forEach(sk => {
          maxW = Math.max(maxW, calcW(sk.name, depth, 'skill'));
        });

        // Children
        const children = subcategories.filter(s => s.parentSubCategoryId === subId);
        children.forEach(c => processSub(c.id!, depth + 1));
      };

      // Root Subs of Category
      const rootSubs = subcategories.filter(s => s.categoryId === cat.id && !s.parentSubCategoryId);
      rootSubs.forEach(s => processSub(s.id!, 0));
    });

    return Math.min(maxW, 500); // Hard cap at 500px to prevent layout break
  }, [categories, subcategories, skills, collapsedStates]);

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
          <Group justify="space-between" align="center">
            <Group gap="md" align="center">
              <Title order={2}>Skill-Matrix</Title>

              {/* View Controls Group */}
              <Group gap="xs" style={{ borderLeft: '1px solid var(--mantine-color-default-border)', paddingLeft: '12px' }}>
                <Tooltip label={`Gruppierung: ${getGroupingLabel(groupingMode)}`}>
                  <ActionIcon
                    variant="light"
                    color={groupingMode === "none" ? "gray" : "blue"}
                    onClick={nextGroupingMode}
                    size="lg"
                  >
                    {groupingMode === 'none' ? <IconUsersGroup size={20} /> :
                      groupingMode === 'department' ? <IconBuilding size={20} /> :
                        <IconUserCircle size={20} />}
                  </ActionIcon>
                </Tooltip>

                {groupingMode !== 'none' && (
                  <Tooltip label={hideEmployees ? "Mitarbeiter einblenden" : "Mitarbeiter ausblenden"}>
                    <ActionIcon
                      variant="light"
                      color={hideEmployees ? "blue" : "gray"}
                      onClick={() => setHideEmployees(!hideEmployees)}
                      size="lg"
                    >
                      {hideEmployees ? <IconEyeOff size={20} /> : <IconEye size={20} />}
                    </ActionIcon>
                  </Tooltip>
                )}

                <Tooltip label={showMaxValues ? "Zeige Durchschnittswerte" : "Zeige Max-Werte"}>
                  <ActionIcon
                    variant="light"
                    color="gray"
                    onClick={() => setShowMaxValues(!showMaxValues)}
                    size="lg"
                  >
                    {showMaxValues ? <IconSum size={20} /> : <IconPercentage size={20} />}
                  </ActionIcon>
                </Tooltip>

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
                <Tooltip label={hideNaColumns ? "Leere Spalten (N/A) anzeigen" : "Leere Spalten (N/A) ausblenden"}>
                  <ActionIcon
                    variant="light"
                    color={hideNaColumns ? "blue" : "gray"}
                    onClick={() => setHideNaColumns(!hideNaColumns)}
                    size="lg"
                  >
                    <IconColumnsOff size={20} />
                  </ActionIcon>
                </Tooltip>
              </Group>

              {/* Sort & Filter Group */}
              <Group gap="xs">
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
                    color={skillSort ? "violet" : "gray"}
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
                        variant="light"
                        color={filtersOpened || filterDepartments.length > 0 || filterRoles.length > 0 || filterCategories.length > 0 ? "blue" : "gray"}
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

              {/* Global Actions Group */}
              <Group gap="xs" style={{ borderLeft: '1px solid var(--mantine-color-default-border)', paddingLeft: '12px' }}>

                <Tooltip label={isEditMode ? "Bearbeitungsmodus beenden" : "Bearbeitungsmodus aktivieren"}>
                  <ActionIcon
                    variant="light"
                    color={isEditMode ? "blue" : "gray"}
                    onClick={() => setIsEditMode(!isEditMode)}
                    size="lg"
                  >
                    <IconEdit size={20} />
                  </ActionIcon>
                </Tooltip>
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

              {/* Saved Views Tabs */}
              <ViewTabs
                savedViews={savedViews || []}
                activeViewId={activeViewId}
                isViewDirty={isViewDirty}
                onSelectView={handleSelectView}
                onDeleteView={handleDeleteView}
                onUpdateViewName={(id, name) => updateSavedView(id, { ...savedViews.find(v => v.id === id)!, name })}
                onSaveCurrentView={handleUpdateCurrentView}
                onClearView={handleClearView}
                onCreateNewView={() => setSaveViewModalOpened(true)}
              />
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
                    columns={matrixColumns}
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
                    onAddEmployee={() => {
                      setEditingEmployeeId(null);
                      setEmployeeDrawerOpened(true);
                    }}
                    onNavigate={onNavigate}

                    labelWidth={responsiveLabelWidth}
                  />
                </div>

                {displayedCategories.map((cat) => {
                  // [NEW] Filter Subcategories and Skills if hidden
                  const catSubcategories = subcategories.filter(s => s.categoryId === cat.id);
                  const catSkills = skills.filter(s => {
                    if (!hideNaColumns) return true;
                    // Check if this skill has ANY relevant data across displayed employees
                    const avg = calculateAverage([s.id!]);
                    return avg !== null;
                  });

                  // If hiding N/A, we also need to check if subcategories have any visible skills OR nested subcategories with visible skills
                  // calculateAverage handles the check against displayedEmployees.

                  // Effective check for a category/subcategory being visible:
                  // Recursive function to check if a subcategory has visible content
                  const hasVisibleContent = (subId: string): boolean => {
                    const subSkills = catSkills.filter(s => s.subCategoryId === subId);
                    if (subSkills.length > 0) return true;

                    const children = catSubcategories.filter(s => s.parentSubCategoryId === subId);
                    return children.some(c => hasVisibleContent(c.id!));
                  };

                  // If hiding N/A, filter subcategories
                  const visibleSubcategories = hideNaColumns
                    ? catSubcategories.filter(s => hasVisibleContent(s.id!))
                    : catSubcategories;

                  // If hiding N/A and no visible subcategories (and no direct skills? skills are in subcategories), hide category
                  if (hideNaColumns && visibleSubcategories.length === 0) return null;

                  return (
                    <MatrixCategoryRow
                      key={cat.id}
                      category={cat}
                      subcategories={visibleSubcategories}
                      skills={catSkills}
                      employees={displayedEmployees}
                      columns={matrixColumns}
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
                      onAddSubcategory={(parentSubId) => handleAddSubCategory(cat.id!, parentSubId)}
                      onAddSkill={(subId) => handleOpenAddSkill(subId)}
                      skillSort={skillSort}
                      labelWidth={responsiveLabelWidth}
                      onNavigate={onNavigate}
                    />
                  );
                })}

                {isEditMode && (
                  <div style={{ display: "flex", borderBottom: "1px solid var(--mantine-color-default-border)", backgroundColor: "var(--mantine-color-body)" }}>
                    <div
                      style={{
                        width: responsiveLabelWidth,
                        padding: "8px 12px",
                        position: "sticky",
                        left: 0,
                        zIndex: 10,
                        backgroundColor: "var(--mantine-color-body)",
                        borderRight: "1px solid var(--mantine-color-default-border)",
                        transition: "width 0.2s ease",
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
      )
      }

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
                  roles: emp.roles || [],
                  isActive: emp.isActive,
                  deactivationDate: emp.deactivationDate,
                  reactivationDate: emp.reactivationDate
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
        selectedDepartmentId={editEntityDepartmentId}
        selectedRoleIds={editEntityRoleIds}
        onInputChange={setEditEntityName}
        onDescriptionChange={setEditEntityDescription}
        onDepartmentChange={setEditEntityDepartmentId}
        onRolesChange={setEditEntityRoleIds}
        onSave={handleSaveEditedEntity}
        onDelete={handleDeleteEntity}
        parentContext={parentContext}
        initialValues={initialValues}
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
      <SaveViewModal
        opened={saveViewModalOpened}
        onClose={() => setSaveViewModalOpened(false)}
        onSave={handleSaveView}
      />

      <Modal
        opened={deleteModalOpen}
        onClose={() => setDeleteModalOpen(false)}
        title="Löschen bestätigen"
        centered
      >
        <Text size="sm">
          Sind Sie sicher, dass Sie diesen Eintrag löschen möchten? Diese Aktion kann nicht rückgängig gemacht werden.
        </Text>
        <Group justify="flex-end" mt="md">
          <Button variant="default" onClick={() => setDeleteModalOpen(false)}>
            Abbrechen
          </Button>
          <Button color="red" onClick={confirmDelete}>
            Löschen
          </Button>
        </Group>
      </Modal>
    </Box >
  );
};
