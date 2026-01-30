import React, { useState } from "react";
import { Box, Group, Title } from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { useData } from "../../context/DataContext";
import { CategoryColumn } from "./CategoryColumn";
import { SubcategoryColumn } from "./SubcategoryColumn";
import { SkillColumn } from "./SkillColumn";
import { EntityFormDrawer, FormMode } from "./EntityFormDrawer";

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
  } = useData();

  const [opened, { open, close }] = useDisclosure(false);
  const [formMode, setFormMode] = useState<FormMode>("category");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedSubCategory, setSelectedSubCategory] = useState<string | null>(null);
  const [inputValue, setInputValue] = useState("");
  const [inputDescription, setInputDescription] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);

  const openForm = (
    mode: FormMode,
    id: string | null = null,
    initialValue: string = "",
    initialDescription: string = ""
  ) => {
    setFormMode(mode);
    setEditingId(id);
    setInputValue(initialValue);
    setInputDescription(initialDescription);
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
        editingId
          ? await updateSkill(editingId, {
              subCategoryId: selectedSubCategory,
              name: inputValue,
              description: inputDescription,
            })
          : await addSkill({
              subCategoryId: selectedSubCategory,
              name: inputValue,
              description: inputDescription,
            });
      }

      setInputValue("");
      setInputDescription("");
      close();
    } catch (error) {
      console.error("Fehler beim Speichern:", error);
    }
  };

  const subCatsInCategory = selectedCategory
    ? getSubCategoriesByCategory(selectedCategory)
    : [];
  const skillsInSubCategory = selectedSubCategory
    ? getSkillsBySubCategory(selectedSubCategory)
    : [];

  return (
    <Box style={{ width: "100%" }}>
      <Title order={2} mb="lg">
        Kategorien & Skills
      </Title>

      <Group
        grow
        align="flex-start"
        gap="md"
        wrap="nowrap"
        style={{ alignItems: "stretch" }}
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
          onEdit={(skill) => openForm("skill", skill.id!, skill.name, skill.description || "")}
          onDelete={deleteSkill}
        />
      </Group>

      <EntityFormDrawer
        opened={opened}
        onClose={close}
        formMode={formMode}
        editingId={editingId}
        inputValue={inputValue}
        inputDescription={inputDescription}
        onInputChange={setInputValue}
        onDescriptionChange={setInputDescription}
        onSave={handleSave}
      />
    </Box>
  );
};
