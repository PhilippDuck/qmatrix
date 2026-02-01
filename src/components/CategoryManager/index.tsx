import React, { useState } from "react";
import { Box, Group, Title, Tabs, SegmentedControl, Text } from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { IconList, IconHierarchy } from "@tabler/icons-react";
import { useData } from "../../context/DataContext";
import { CategoryColumn } from "./CategoryColumn";
import { SubcategoryColumn } from "./SubcategoryColumn";
import { SkillColumn } from "./SkillColumn";
import { EntityFormDrawer, FormMode } from "./EntityFormDrawer";
import SkillOrgChart from "../organization/SkillOrgChart";

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
  } = useData();

  const [opened, { open, close }] = useDisclosure(false);
  const [formMode, setFormMode] = useState<FormMode>("category");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedSubCategory, setSelectedSubCategory] = useState<string | null>(null);

  // Form State
  const [inputValue, setInputValue] = useState("");
  const [inputDescription, setInputDescription] = useState("");
  const [selectedDepartmentId, setSelectedDepartmentId] = useState<string | null>(null);
  const [selectedRoleIds, setSelectedRoleIds] = useState<string[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);

  const openForm = (
    mode: FormMode,
    id: string | null = null,
    initialValue: string = "",
    initialDescription: string = "",
    initialDeptId: string | null = null,
    initialRoleIds: string[] = []
  ) => {
    setFormMode(mode);
    setEditingId(id);
    setInputValue(initialValue);
    setInputDescription(initialDescription);
    setSelectedDepartmentId(initialDeptId);
    setSelectedRoleIds(initialRoleIds);
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

        editingId
          ? await updateSkill(editingId, skillData)
          : await addSkill(skillData);
      }

      setInputValue("");
      setInputDescription("");
      setSelectedDepartmentId(null);
      setSelectedRoleIds([]);
      close();
    } catch (error) {
      console.error("Fehler beim Speichern:", error);
    }
  };



  const [activeTab, setActiveTab] = useState<string | null>("list");


  // ... (keep existing helper consts)
  const subCatsInCategory = selectedCategory
    ? getSubCategoriesByCategory(selectedCategory)
    : [];
  const skillsInSubCategory = selectedSubCategory
    ? getSkillsBySubCategory(selectedSubCategory)
    : [];

  return (
    <Box style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column" }}>
      <Title order={2} mb="lg">
        Kategorien & Skills
      </Title>

      <Tabs value={activeTab} onChange={setActiveTab} style={{ flex: 1, display: "flex", flexDirection: "column" }}>
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
              projectTitle={useData().projectTitle} // Pass projectTitle
              onEditCategory={(cat) => openForm("category", cat.id!, cat.name, cat.description || "")}
              onEditSubCategory={(sub) => {
                setSelectedCategory(sub.categoryId);
                openForm("subcategory", sub.id!, sub.name, sub.description || "");
              }}
              onEditSkill={(skill) => {
                // We need to find the subcategory for this skill to set context if needed? 
                // openForm sets state, but maybe we should ensure selectedSubCategory is set too?
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
              onAddSubCategory={(catId) => {
                setSelectedCategory(catId);
                openForm("subcategory");
              }}
              onAddSkill={(subCatId) => {
                setSelectedSubCategory(subCatId);
                openForm("skill");
              }}
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
        onInputChange={setInputValue}
        onDescriptionChange={setInputDescription}
        onDepartmentChange={setSelectedDepartmentId}
        onRolesChange={setSelectedRoleIds}
        onSave={handleSave}
        departments={departments}
        roles={roles}
      />
    </Box>
  );
};
