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
  IconEdit,
  IconUsersGroup,
  IconBuilding,
  IconUserCircle,
  IconSum,
  IconPercentage,
  IconTargetArrow,
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
import { useMatrixState } from "../../hooks/useMatrixState";
import { useMatrixCalculations } from "../../hooks/useMatrixCalculations";
import { MatrixToolbar } from "./MatrixToolbar";

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
    assessments,
  } = useData();

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

  const matrixState = useMatrixState(savedViews, addSavedView, updateSavedView, deleteSavedView);
  const {
    collapsedStates, updateCollapsedStates, toggleItem,
    filterDepartments, setFilterDepartments,
    filterRoles, setFilterRoles,
    filterCategories, setFilterCategories,
    metricMode, setMetricMode, nextMetricMode,
    employeeSort, setEmployeeSort,
    skillSort, setSkillSort,
    groupingMode, setGroupingMode, nextGroupingMode,
    hideEmployees, setHideEmployees,
    hideNaColumns, setHideNaColumns,
    showInactive, setShowInactive,
    activeViewId, setActiveViewId,
    isViewDirty,
    handleSelectView,
    handleSaveView,
    handleUpdateCurrentView,
    handleClearView,
    handleDeleteView,
  } = matrixState;

  const showMaxValues = metricMode === 'max';
  const [saveViewModalOpened, setSaveViewModalOpened] = useState(false);
  const [filtersOpened, setFiltersOpened] = useState(false);

  const {
    displayedEmployees,
    displayedCategories,
    matrixColumns,
    calculateAverage,
    calculateEmployeeAverage
  } = useMatrixCalculations({
    employees, categories, subcategories, skills, departments, roles, getAssessment, assessments,
    focusEmployeeId, showInactive, filterDepartments, filterRoles, employeeSort,
    filterCategories, skillSort, metricMode, showMaxValues, groupingMode, hideEmployees
  });

  const getGroupingLabel = (mode: 'none' | 'department' | 'role') => {
    switch (mode) {
      case 'none': return 'Keine Gruppierung';
      case 'department': return 'Nach Abteilung';
      case 'role': return 'Nach Rolle';
    }
  };

  const handleGlobalToggle = () => {
    const categoryIds = categories.map((c) => c.id!);
    const subcategoryIds = subcategories.map((s) => s.id!);

    const collapsedCategories = categoryIds.filter((id) => collapsedStates[id]).length;
    const collapsedSubcategories = subcategoryIds.filter((id) => collapsedStates[id]).length;

    const allCollapsed = collapsedCategories === categoryIds.length;
    const onlySubsCollapsed = collapsedCategories === 0 && collapsedSubcategories === subcategoryIds.length;

    if (allCollapsed) {
      // State 1 -> State 2: Open categories, keep subcategories collapsed
      updateCollapsedStates(
        Object.fromEntries(subcategoryIds.map((id) => [id, true]))
      );
    } else if (onlySubsCollapsed) {
      // State 2 -> State 3: Expand everything
      updateCollapsedStates({});
    } else {
      // State 3 (or any other) -> State 1: Collapse everything
      updateCollapsedStates(
        Object.fromEntries([...categoryIds, ...subcategoryIds].map((id) => [id, true]))
      );
    }
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
        <Stack gap="md" h="100%" style={{ overflow: "hidden", minHeight: 0 }}>
          <MatrixToolbar
            groupingMode={groupingMode}
            nextGroupingMode={nextGroupingMode}
            getGroupingLabel={getGroupingLabel}
            hideEmployees={hideEmployees}
            setHideEmployees={setHideEmployees}
            metricMode={metricMode}
            nextMetricMode={nextMetricMode}
            handleGlobalToggle={handleGlobalToggle}
            hideNaColumns={hideNaColumns}
            setHideNaColumns={setHideNaColumns}
            filtersOpened={filtersOpened}
            setFiltersOpened={setFiltersOpened}
            filterDepartments={filterDepartments}
            setFilterDepartments={setFilterDepartments}
            filterRoles={filterRoles}
            setFilterRoles={setFilterRoles}
            filterCategories={filterCategories}
            setFilterCategories={setFilterCategories}
            departments={departments}
            roles={roles}
            categories={categories}
            isEditMode={isEditMode}
            setIsEditMode={setIsEditMode}
            setSkillDrawerOpened={setSkillDrawerOpened}
            setEmployeeDrawerOpened={setEmployeeDrawerOpened}
            savedViews={savedViews}
            activeViewId={activeViewId}
            isViewDirty={isViewDirty}
            handleSelectView={handleSelectView}
            handleDeleteView={handleDeleteView}
            updateSavedView={updateSavedView}
            handleUpdateCurrentView={handleUpdateCurrentView}
            handleClearView={handleClearView}
            setSaveViewModalOpened={setSaveViewModalOpened}
            focusEmployeeId={focusEmployeeId}
            setFocusEmployeeId={setFocusEmployeeId}
          />


          <Card
            withBorder
            p={0}
            style={{
              flex: "0 1 auto",
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
                    zIndex: 31,
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
                    showMaxValues={metricMode}
                    isEditMode={isEditMode}
                    onAddEmployee={() => {
                      setEditingEmployeeId(null);
                      setEmployeeDrawerOpened(true);
                    }}
                    onNavigate={onNavigate}

                    labelWidth={responsiveLabelWidth}
                    employeeSort={employeeSort}
                    onEmployeeSortChange={setEmployeeSort}
                    skillSort={skillSort}
                    onSkillSortChange={setSkillSort}
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
                      showMaxValues={metricMode}
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
                        zIndex: 30,
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
