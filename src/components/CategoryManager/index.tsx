import React, { useState } from "react";
import { Box, Group, Title, Tabs, Badge, ActionIcon, Tooltip, Text } from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { modals } from "@mantine/modals";
import { IconList, IconHierarchy, IconClipboardOff } from "@tabler/icons-react";
import { useStore } from "../../store/useStore";
import { CategoryColumn } from "./CategoryColumn";
import { SubcategoryColumn } from "./SubcategoryColumn";
import { SkillColumn } from "./SkillColumn";
import { EntityFormDrawer, FormMode, EntityFormValues } from "./EntityFormDrawer";
import SkillOrgChart, { ClipboardItem } from "../organization/SkillOrgChart";

export const CategoryManager: React.FC = () => {
  const {
    categories,
    addCategory,
    updateCategory,
    deleteCategory,
    addSubCategory,
    updateSubCategory,
    deleteSubCategory,
    addSkill,
    updateSkill,
    deleteSkill,
    getSubCategoriesByCategory,
    getSkillsBySubCategory,
    departments,
    roles,
    skills,
    subcategories,
  } = useStore();

  const [opened, { open, close }] = useDisclosure(false);
  const [formMode, setFormMode] = useState<FormMode>("category");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedSubCategory, setSelectedSubCategory] = useState<string | null>(null);
  const [selectedParentSubCategory, setSelectedParentSubCategory] = useState<string | null>(null); // For creating nested subcategories

  // Form State
  const [inputValue, setInputValue] = useState("");
  const [inputDescription, setInputDescription] = useState("");
  const [selectedDepartmentId, setSelectedDepartmentId] = useState<string | null>(null);
  const [selectedRoleIds, setSelectedRoleIds] = useState<string[]>([]);
  const [selectedSubCategoryIds, setSelectedSubCategoryIds] = useState<string[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [initialValues, setInitialValues] = useState<EntityFormValues>({
    name: "",
    description: "",
    departmentId: null,
    roleIds: [],
    subCategoryIds: [],
  });

  // Clipboard State
  const [clipboardItem, setClipboardItem] = useState<ClipboardItem | null>(null);

  const openForm = (
    mode: FormMode,
    id: string | null = null,
    initialValue: string = "",
    initialDescription: string = "",
    initialDeptId: string | null = null,
    initialRoleIds: string[] = [],
    initialParentSubId: string | null = null // New parameter
  ) => {
    setFormMode(mode);
    setEditingId(id);
    setInputValue(initialValue);
    setInputDescription(initialDescription);
    setSelectedDepartmentId(initialDeptId);
    setSelectedRoleIds(initialRoleIds);
    setSelectedSubCategoryIds([]); // Reset
    setSelectedParentSubCategory(initialParentSubId); // Store parent context

    // Set initial values for dirty content check
    setInitialValues({
      name: initialValue,
      description: initialDescription,
      departmentId: initialDeptId,
      roleIds: initialRoleIds,
      subCategoryIds: [],
    });

    open();
  };


  const handleSave = async () => {
    if (!inputValue.trim()) return;

    try {
      if (formMode === "category") {
        editingId
          ? await updateCategory(editingId, {
            name: inputValue,
            description: inputDescription,
          })
          : await addCategory({
            name: inputValue,
            description: inputDescription,
          });
      } else if (formMode === "subcategory" && selectedCategory) {
        editingId
          ? await updateSubCategory(editingId, {
            categoryId: selectedCategory,
            name: inputValue,
            description: inputDescription,
          })
          : await addSubCategory({
            categoryId: selectedCategory,
            parentSubCategoryId: selectedParentSubCategory || undefined, // Use explicit parent if set
            name: inputValue,
            description: inputDescription,
          });
      } else if (formMode === "skill" && selectedSubCategory) {
        const skillData = {
          subCategoryId: selectedSubCategory,
          name: inputValue,
          description: inputDescription,
          departmentId: selectedDepartmentId || undefined,
          requiredByRoleIds: selectedRoleIds.length > 0 ? selectedRoleIds : undefined,
        };

        if (editingId) {
          await updateSkill(editingId, skillData);
        } else {
          // Add to current selected subcategory
          await addSkill({ ...skillData, subCategoryId: selectedSubCategory });

          // Add to other selected subcategories
          if (selectedSubCategoryIds.length > 0) {
            await Promise.all(selectedSubCategoryIds.map(subCatId =>
              addSkill({ ...skillData, subCategoryId: subCatId })
            ));
          }
        }
      }

      setInputValue("");
      setInputDescription("");
      setSelectedDepartmentId(null);
      setSelectedRoleIds([]);
      setSelectedSubCategoryIds([]);
      close();
    } catch (error) {
      console.error("Fehler beim Speichern:", error);
    }
  };


  const handleDelete = async () => {
    if (!editingId) return;

    modals.openConfirmModal({
      title: 'Eintrag löschen',
      centered: true,
      children: (
        <Text size="sm">
          Sind Sie sicher, dass Sie diesen Eintrag löschen möchten?
        </Text>
      ),
      labels: { confirm: 'Löschen', cancel: 'Abbrechen' },
      confirmProps: { color: 'red' },
      onConfirm: async () => {
        try {
          if (formMode === "category") {
            await deleteCategory(editingId);
          } else if (formMode === "subcategory") {
            await deleteSubCategory(editingId);
          } else if (formMode === "skill") {
            await deleteSkill(editingId);
          }
          close();
        } catch (error) {
          console.error("Fehler beim Löschen:", error);
        }
      },
    });
  };

  const [activeTab, setActiveTab] = useState<string | null>("chart");

  // ... (keep existing helper consts)
  // Get ALL subcategories for this category (recursive list building happens in component)
  const subCatsInCategory = selectedCategory
    ? subcategories.filter(s => s.categoryId === selectedCategory)
    : [];
  const skillsInSubCategory = selectedSubCategory
    ? getSkillsBySubCategory(selectedSubCategory)
    : [];

  // Prepare options for subcategory multi-select (Grouped)
  const groupedSubcategories: Record<string, any[]> = {};

  (subcategories || []).forEach(sc => {
    if (!sc.id || sc.id === selectedSubCategory) return;
    const parentCat = (categories || []).find(c => c.id === sc.categoryId);
    const groupName = parentCat?.name || "Andere";

    if (!groupedSubcategories[groupName]) {
      groupedSubcategories[groupName] = [];
    }
    groupedSubcategories[groupName].push({
      value: sc.id,
      label: sc.name
    });
  });

  const subcategoryOptions = Object.entries(groupedSubcategories)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([group, items]) => ({
      group,
      items: items.sort((a: any, b: any) => a.label.localeCompare(b.label))
    }));

  const handlePaste = async (targetId: string, targetType: "category" | "subcategory" | "root") => {
    if (!clipboardItem) return;

    try {
      // Recursive helper: clone a subcategory subtree under a new parent category
      const cloneSubtree = async (srcSubId: string, newCategoryId: string, newParentSubId?: string): Promise<string> => {
        const srcSub = subcategories.find(s => s.id === srcSubId);
        if (!srcSub) return "";
        const { id: _, ...subData } = srcSub;
        const newSubId = await addSubCategory({ ...subData, categoryId: newCategoryId, parentSubCategoryId: newParentSubId });
        const directSkills = skills.filter(s => s.subCategoryId === srcSubId);
        await Promise.all(directSkills.map(s => { const { id: sId, ...sData } = s; return addSkill({ ...sData, subCategoryId: newSubId }); }));
        const childSubs = subcategories.filter(s => s.parentSubCategoryId === srcSubId);
        await Promise.all(childSubs.map(child => cloneSubtree(child.id!, newCategoryId, newSubId)));
        return newSubId;
      };

      // Collect all descendant subcategories of a subcategory (snapshot of current state)
      const collectDescendants = (subId: string): typeof subcategories => {
        const children = subcategories.filter(s => s.parentSubCategoryId === subId);
        return children.concat(children.flatMap(c => collectDescendants(c.id!)));
      };

      if (clipboardItem.mode === "cut") {
        if (clipboardItem.type === "skill" && targetType === "subcategory") {
          if (clipboardItem.data.subCategoryId === targetId) return;
          await updateSkill(clipboardItem.id, { ...clipboardItem.data, subCategoryId: targetId });

        } else if (clipboardItem.type === "subcategory" && targetType === "root") {
          // CUT subcategory → root: convert to new top-level category
          const srcSub = subcategories.find(s => s.id === clipboardItem.id);
          if (!srcSub) return;
          const newCatId = await addCategory({ name: srcSub.name, description: srcSub.description });

          const allDescendants = collectDescendants(clipboardItem.id);
          const directChildren = subcategories.filter(s => s.parentSubCategoryId === clipboardItem.id);
          const deeperDescendants = allDescendants.filter(d => !directChildren.find(c => c.id === d.id));

          // Update deeper descendants: only change categoryId
          await Promise.all(deeperDescendants.map(d =>
            updateSubCategory(d.id!, { ...d, categoryId: newCatId })
          ));
          // Update direct children: new categoryId + clear parentSubCategoryId
          await Promise.all(directChildren.map(c =>
            updateSubCategory(c.id!, { ...c, categoryId: newCatId, parentSubCategoryId: undefined })
          ));

          // Direct skills on source sub → wrap in new subcategory under new category
          const directSkills = skills.filter(s => s.subCategoryId === clipboardItem.id);
          if (directSkills.length > 0) {
            const wrapperSubId = await addSubCategory({ name: srcSub.name, description: srcSub.description, categoryId: newCatId });
            await Promise.all(directSkills.map(s =>
              updateSkill(s.id!, { ...s, subCategoryId: wrapperSubId })
            ));
          }

          await deleteSubCategory(clipboardItem.id);

        } else if (clipboardItem.type === "subcategory" && targetType === "category") {
          // Move to root of category
          await updateSubCategory(clipboardItem.id, {
            ...clipboardItem.data,
            categoryId: targetId,
            parentSubCategoryId: undefined,
          });

        } else if (clipboardItem.type === "subcategory" && targetType === "subcategory") {
          // Move into another subcategory (nest)
          if (clipboardItem.id === targetId) return;
          const targetSub = subcategories.find(s => s.id === targetId);
          if (!targetSub) return;
          await updateSubCategory(clipboardItem.id, {
            ...clipboardItem.data,
            categoryId: targetSub.categoryId,
            parentSubCategoryId: targetId,
          });

        } else if (clipboardItem.type === "category" && (targetType === "category" || targetType === "subcategory")) {
          // CUT category → category/subcategory: convert to subcategory
          const srcCat = categories.find(c => c.id === clipboardItem.id);
          if (!srcCat) return;

          let targetCategoryId: string;
          let targetParentSubId: string | undefined;

          if (targetType === "category") {
            targetCategoryId = targetId;
            targetParentSubId = undefined;
          } else {
            const targetSub = subcategories.find(s => s.id === targetId);
            if (!targetSub) return;
            targetCategoryId = targetSub.categoryId;
            targetParentSubId = targetId;
          }

          const newSubId = await addSubCategory({
            name: srcCat.name,
            description: srcCat.description,
            categoryId: targetCategoryId,
            parentSubCategoryId: targetParentSubId,
          });

          const allCatSubcats = subcategories.filter(s => s.categoryId === clipboardItem.id);
          const rootSubcats = allCatSubcats.filter(s => !s.parentSubCategoryId);
          const deeperSubcats = allCatSubcats.filter(s => !!s.parentSubCategoryId);

          // Update all: deeper subcats get new categoryId only; root subcats get new categoryId + newSubId as parent
          await Promise.all([
            ...deeperSubcats.map(s => updateSubCategory(s.id!, { ...s, categoryId: targetCategoryId })),
            ...rootSubcats.map(s => updateSubCategory(s.id!, { ...s, categoryId: targetCategoryId, parentSubCategoryId: newSubId })),
          ]);

          await deleteCategory(clipboardItem.id);
        }
      } else {
        // Copy Mode
        if (clipboardItem.type === "skill" && targetType === "subcategory") {
          const { id, ...skillData } = clipboardItem.data;
          await addSkill({ ...skillData, subCategoryId: targetId });

        } else if (clipboardItem.type === "subcategory" && targetType === "root") {
          // COPY subcategory → root: create new top-level category
          const srcSub = subcategories.find(s => s.id === clipboardItem.id);
          if (!srcSub) return;
          const newCatId = await addCategory({ name: srcSub.name, description: srcSub.description });

          const directChildren = subcategories.filter(s => s.parentSubCategoryId === clipboardItem.id);
          await Promise.all(directChildren.map(child => cloneSubtree(child.id!, newCatId, undefined)));

          // Direct skills on source sub → wrap in a new subcategory
          const directSkills = skills.filter(s => s.subCategoryId === clipboardItem.id);
          if (directSkills.length > 0) {
            const wrapperSubId = await addSubCategory({ name: srcSub.name, description: srcSub.description, categoryId: newCatId });
            await Promise.all(directSkills.map(s => {
              const { id: sId, ...sData } = s;
              return addSkill({ ...sData, subCategoryId: wrapperSubId });
            }));
          }

        } else if (clipboardItem.type === "subcategory" && (targetType === "category" || targetType === "subcategory")) {
          // COPY subcategory → category/subcategory (with full subtree via cloneSubtree)
          const { id, ...subData } = clipboardItem.data;
          let targetCategoryId: string;
          let newSubId: string;

          if (targetType === "category") {
            targetCategoryId = targetId;
            newSubId = await addSubCategory({ ...subData, categoryId: targetId, parentSubCategoryId: undefined });
          } else {
            const targetSub = subcategories.find(s => s.id === targetId);
            if (!targetSub) return;
            targetCategoryId = targetSub.categoryId;
            newSubId = await addSubCategory({ ...subData, categoryId: targetSub.categoryId, parentSubCategoryId: targetId });
          }

          // Copy direct skills
          const directSkills = skills.filter(s => s.subCategoryId === clipboardItem.id);
          await Promise.all(directSkills.map(s => {
            const { id: sId, ...sData } = s;
            return addSkill({ ...sData, subCategoryId: newSubId });
          }));

          // Clone child subtrees (fixes previously missing sub-subcategory copying)
          const childSubs = subcategories.filter(s => s.parentSubCategoryId === clipboardItem.id);
          await Promise.all(childSubs.map(child => cloneSubtree(child.id!, targetCategoryId, newSubId)));

        } else if (clipboardItem.type === "category" && (targetType === "category" || targetType === "subcategory")) {
          // COPY category → category/subcategory: become a subcategory
          const srcCat = categories.find(c => c.id === clipboardItem.id);
          if (!srcCat) return;

          let targetCategoryId: string;
          let targetParentSubId: string | undefined;

          if (targetType === "category") {
            targetCategoryId = targetId;
            targetParentSubId = undefined;
          } else {
            const targetSub = subcategories.find(s => s.id === targetId);
            if (!targetSub) return;
            targetCategoryId = targetSub.categoryId;
            targetParentSubId = targetId;
          }

          const newSubId = await addSubCategory({
            name: srcCat.name,
            description: srcCat.description,
            categoryId: targetCategoryId,
            parentSubCategoryId: targetParentSubId,
          });

          // Clone all root-level subcategories of source category
          const rootSubcats = subcategories.filter(s => s.categoryId === clipboardItem.id && !s.parentSubCategoryId);
          await Promise.all(rootSubcats.map(sub => cloneSubtree(sub.id!, targetCategoryId, newSubId)));
        }
      }
      setClipboardItem(null);
    } catch (e) {
      console.error("Paste failed:", e);
    }
  };

  // Derive Parent Context String for Drawer
  let parentContextString: string | undefined;
  if (formMode === "skill" && selectedSubCategory) {
    const sub = subcategories.find(s => s.id === selectedSubCategory);
    if (sub) parentContextString = `Gruppe: ${sub.name}`;
  } else if (formMode === "subcategory") {
    if (selectedParentSubCategory) {
      const parent = subcategories.find(s => s.id === selectedParentSubCategory);
      if (parent) parentContextString = `Übergeordnete Gruppe: ${parent.name}`;
    } else if (selectedCategory) {
      const cat = categories.find(c => c.id === selectedCategory);
      if (cat) parentContextString = `Kategorie: ${cat.name}`;
    }
  }

  return (
    <Box style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column" }}>
      <Group justify="space-between" mb="lg">
        <Title order={2}>
          Kategorien & Skills
        </Title>

        {/* Sticky Clipboard Indicator */}
        {clipboardItem && (
          <Group
            gap="xs"
            bg="var(--mantine-color-blue-light)"
            px="sm"
            py={4}
            style={{ borderRadius: 'var(--mantine-radius-md)', border: '1px solid var(--mantine-color-blue-3)' }}
          >
            <Text size="sm" fw={500} c="blue">
              {clipboardItem.mode === 'cut' ? 'Ausschneiden:' : 'Kopieren:'}
              <span style={{ fontWeight: 700, marginLeft: 4 }}>{clipboardItem.data.name}</span>
            </Text>
            <Tooltip label="Zwischenablage leeren">
              <ActionIcon variant="subtle" color="gray" size="sm" onClick={() => setClipboardItem(null)}>
                <IconClipboardOff size={14} />
              </ActionIcon>
            </Tooltip>
          </Group>
        )}
      </Group>

      {/* ... tabs ... */}

      <Tabs value={activeTab} onChange={setActiveTab} style={{ flex: 1, display: "flex", flexDirection: "column" }}>
        {/* ... Tabs List ... */}
        <Tabs.List mb="md">
          <Tabs.Tab value="list" leftSection={<IconList size={16} />}>Liste</Tabs.Tab>
          <Tabs.Tab value="chart" leftSection={<IconHierarchy size={16} />}>Organigramm</Tabs.Tab>
        </Tabs.List>

        <Tabs.Panel value="list" style={{ flex: 1, overflow: "hidden" }}>
          <Group
            grow
            align="flex-start"
            gap="md"
            wrap="nowrap"
            style={{ alignItems: "stretch", height: "100%" }}
          >
            <CategoryColumn
              categories={categories}
              selectedCategory={selectedCategory}
              onSelect={(id) => {
                setSelectedCategory(id);
                setSelectedSubCategory(null);
              }}
              onAdd={() => openForm("category")}
              onEdit={(cat) => openForm("category", cat.id!, cat.name, cat.description || "")}
              onDelete={deleteCategory}
              getSubcategoryCount={(id) => getSubCategoriesByCategory(id).length}
            />

            <SubcategoryColumn
              subcategories={subCatsInCategory}
              selectedSubCategory={selectedSubCategory}
              isEnabled={!!selectedCategory}
              onSelect={setSelectedSubCategory}
              onAdd={() => openForm("subcategory")}
              onEdit={(sub) => openForm("subcategory", sub.id!, sub.name, sub.description || "")}
              onDelete={deleteSubCategory}
              getSkillCount={(id) => getSkillsBySubCategory(id).length}
              onAddNested={(parentId) => openForm("subcategory", null, "", "", null, [], parentId)} // New nested add
            />

            <SkillColumn
              skills={skillsInSubCategory}
              isEnabled={!!selectedSubCategory}
              onAdd={() => openForm("skill")}
              onEdit={(skill) =>
                openForm(
                  "skill",
                  skill.id!,
                  skill.name,
                  skill.description || "",
                  skill.departmentId || null,
                  skill.requiredByRoleIds || []
                )
              }
              onDelete={deleteSkill}
            />
          </Group>
        </Tabs.Panel>

        <Tabs.Panel value="chart" style={{ flex: 1, overflow: "hidden" }}>
          <Box p="md" style={{ height: "100%", overflow: "auto", border: "1px solid var(--mantine-color-default-border)", borderRadius: "var(--mantine-radius-md)" }}>
            <SkillOrgChart
              categories={categories}
              subcategories={subcategories}
              skills={skills}
              roles={roles}
              projectTitle={useStore().projectTitle} // Pass projectTitle
              onEditCategory={(cat) => openForm("category", cat.id!, cat.name, cat.description || "")}
              onEditSubCategory={(sub) => {
                setSelectedCategory(sub.categoryId);
                openForm("subcategory", sub.id!, sub.name, sub.description || "");
              }}
              onEditSkill={(skill) => {
                setSelectedSubCategory(skill.subCategoryId);
                openForm(
                  "skill",
                  skill.id!,
                  skill.name,
                  skill.description || "",
                  skill.departmentId || null,
                  skill.requiredByRoleIds || []
                );
              }}
              onAddCategory={() => openForm("category")}
              onAddSubCategory={(catId, parentSubId) => {
                setSelectedCategory(catId);
                openForm("subcategory", null, "", "", null, [], parentSubId);
              }}
              onAddSkill={(subCatId) => {
                setSelectedSubCategory(subCatId);
                openForm("skill");
              }}
              // Clipboard Props
              clipboardItem={clipboardItem}
              onCopy={setClipboardItem}
              onCut={setClipboardItem}
              onPaste={handlePaste}
            />
          </Box>
        </Tabs.Panel>
      </Tabs>

      <EntityFormDrawer
        opened={opened}
        onClose={close}
        formMode={formMode}
        editingId={editingId}
        inputValue={inputValue}
        inputDescription={inputDescription}
        selectedDepartmentId={selectedDepartmentId}
        selectedRoleIds={selectedRoleIds}
        selectedSubCategoryIds={selectedSubCategoryIds}
        onInputChange={setInputValue}
        onDescriptionChange={setInputDescription}
        onDepartmentChange={setSelectedDepartmentId}
        onRolesChange={setSelectedRoleIds}
        onSubcategoriesChange={setSelectedSubCategoryIds}
        onSave={handleSave}
        onDelete={handleDelete}
        departments={departments}
        roles={roles}
        subcategories={subcategoryOptions}
        initialValues={initialValues}
        parentContext={parentContextString}
      />

    </Box>
  );
};

