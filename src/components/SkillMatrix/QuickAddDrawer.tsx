import React, { useState, useEffect, useMemo } from "react";
import {
  Drawer,
  Stack,
  TextInput,
  Textarea,
  Group,
  Button,
  Text,
  Select,
  Tooltip,
  ActionIcon,
  Modal,
} from "@mantine/core";
import { useHotkeys } from "@mantine/hooks";
import { IconPlus, IconX } from "@tabler/icons-react";
import { Category, SubCategory } from "../../context/DataContext";

export type QuickAddMode = "employee" | "skill";

interface QuickAddDrawerProps {
  opened: boolean;
  onClose: () => void;
  mode: QuickAddMode;
  categories?: Category[];
  subcategories?: SubCategory[];
  preselectedSubcategoryId?: string | null;
  onAddEmployee: (name: string) => Promise<void>;
  onAddSkill: (subcategoryId: string, name: string, description: string) => Promise<void>;
  onAddCategory: (name: string) => Promise<string>;
  onAddSubCategory: (categoryId: string, name: string) => Promise<string>;
}

export const QuickAddDrawer: React.FC<QuickAddDrawerProps> = ({
  opened,
  onClose,
  mode,
  categories = [],
  subcategories = [],
  preselectedSubcategoryId,
  onAddEmployee,
  onAddSkill,
  onAddCategory,
  onAddSubCategory,
}) => {
  // Employee state
  const [name, setName] = useState("");

  // Skill Data State
  const [skillName, setSkillName] = useState("");
  const [description, setDescription] = useState("");

  // Selection State
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [subcategoryId, setSubcategoryId] = useState<string | null>(null);

  // Creation Mode State
  const [isCreatingCategory, setIsCreatingCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");

  const [isCreatingSubCategory, setIsCreatingSubCategory] = useState(false);
  const [newSubCategoryName, setNewSubCategoryName] = useState("");

  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (opened) {
      setName("");
      setSkillName("");
      setDescription("");

      // Reset modes
      setIsCreatingCategory(false);
      setIsCreatingSubCategory(false);
      setNewCategoryName("");
      setNewSubCategoryName("");

      if (preselectedSubcategoryId) {
        setSubcategoryId(preselectedSubcategoryId);
        // Find parent category
        const sub = subcategories.find(s => s.id === preselectedSubcategoryId);
        if (sub) {
          setCategoryId(sub.categoryId);
        }
      } else {
        setSubcategoryId(null);
        setCategoryId(null);
      }
    }
  }, [opened, preselectedSubcategoryId, subcategories]);

  // Derived state: Filtered subcategories based on selected category
  const filteredSubcategories = useMemo(() => {
    if (!categoryId) return [];
    return subcategories.filter(sc => sc.categoryId === categoryId);
  }, [categoryId, subcategories]);

  // When creating a new category, subcategory creation is forced/implied (cannot add to new category otherwise)
  // Actually, we can just enforce IsCreatingSubCategory if IsCreatingCategory is true.
  useEffect(() => {
    if (isCreatingCategory) {
      setIsCreatingSubCategory(true);
    }
  }, [isCreatingCategory]);

  const handleSave = async () => {
    setLoading(true);
    try {
      if (mode === "employee") {
        if (!name.trim()) return;
        await onAddEmployee(name.trim());
      } else if (mode === "skill") {
        let finalSubCatId = subcategoryId;

        // 1. Create Category if needed
        let finalCatId = categoryId;
        if (isCreatingCategory) {
          if (!newCategoryName.trim()) return;
          finalCatId = await onAddCategory(newCategoryName.trim());
        }

        if (!finalCatId) return; // Should not happen

        // 2. Create Subcategory if needed
        if (isCreatingSubCategory) {
          if (!newSubCategoryName.trim()) return;
          finalSubCatId = await onAddSubCategory(finalCatId, newSubCategoryName.trim());
        } else {
          // Must have selected one
          if (!finalSubCatId) return;
        }

        // 3. Create Skill
        if (!skillName.trim() || !finalSubCatId) return;
        await onAddSkill(finalSubCatId, skillName.trim(), description.trim());
      }
      onClose();
    } catch (error) {
      console.error("Fehler beim Speichern:", error);
    } finally {
      setLoading(false);
    }
  };

  useHotkeys([["mod+Enter", (event) => {
    event.preventDefault();
    handleSave();
  }]], ['INPUT', 'TEXTAREA', 'SELECT']);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSave();
    }
  };

  // Validation
  let isValid = false;
  if (mode === "employee") {
    isValid = name.trim().length > 0;
  } else {
    // Skill validation
    const catValid = isCreatingCategory ? newCategoryName.trim().length > 0 : !!categoryId;
    const subCatValid = isCreatingSubCategory ? newSubCategoryName.trim().length > 0 : !!subcategoryId;
    const skillValid = skillName.trim().length > 0;
    isValid = catValid && subCatValid && skillValid;
  }

  // Unsaved Changes Logic
  const [confirmationOpen, setConfirmationOpen] = useState(false);

  const hasChanges = () => {
    // If saving/loading, allow close (or handle elsewhere). But usually close happens after save success.

    if (mode === 'employee') {
      if (name.trim()) return true;
    } else {
      // Skill
      if (skillName.trim()) return true;
      if (description.trim()) return true;
      if (isCreatingCategory && newCategoryName.trim()) return true;
      if (isCreatingSubCategory && newSubCategoryName.trim()) return true;
    }
    return false;
  };

  const handleCloseAttempt = () => {
    if (hasChanges()) {
      setConfirmationOpen(true);
    } else {
      onClose();
    }
  };

  return (
    <>
      <Drawer
        opened={opened}
        onClose={handleCloseAttempt}
        position="right"
        size="md"
        overlayProps={{ backgroundOpacity: 0.5, blur: 4 }}
        title={
          <Text fw={700} size="lg">
            {mode === "employee" ? "Neuer Mitarbeiter" : "Neuer Skill"}
          </Text>
        }
      >
        <Stack gap="md" h="calc(100vh - 100px)" justify="space-between">
          <Stack gap="md">
            {mode === "skill" && (
              <>
                {/* Category Selection/Creation */}
                <Group align="flex-end" gap="xs">
                  <div style={{ flex: 1 }}>
                    {isCreatingCategory ? (
                      <TextInput
                        label="Kategorie"
                        placeholder="Name der neuen Kategorie"
                        value={newCategoryName}
                        onChange={(e) => setNewCategoryName(e.currentTarget.value)}
                        required
                        data-autofocus
                      />
                    ) : (
                      <Select
                        label="Kategorie"
                        placeholder="Kategorie wählen..."
                        data={categories.map((c) => ({ value: c.id!, label: c.name }))}
                        value={categoryId}
                        onChange={(val) => {
                          setCategoryId(val);
                          setSubcategoryId(null); // Reset subcategory when category changes
                        }}
                        searchable
                        required
                      />
                    )}
                  </div>
                  <Tooltip label={isCreatingCategory ? "Auswahl verwenden" : "Neue Kategorie erstellen"}>
                    <ActionIcon
                      onClick={() => {
                        setIsCreatingCategory(!isCreatingCategory);
                        setNewCategoryName("");
                        if (!isCreatingCategory) {
                          setCategoryId(null);
                          setSubcategoryId(null);
                        }
                      }}
                      variant={isCreatingCategory ? "filled" : "light"}
                      color={isCreatingCategory ? "red" : "blue"}
                      size="lg"
                      mb={2}
                    >
                      {isCreatingCategory ? <IconX size={18} /> : <IconPlus size={18} />}
                    </ActionIcon>
                  </Tooltip>
                </Group>

                {/* Subcategory Selection/Creation */}
                <Group align="flex-end" gap="xs">
                  <div style={{ flex: 1 }}>
                    {isCreatingSubCategory ? (
                      <TextInput
                        label="Unterkategorie"
                        placeholder="Name der neuen Unterkategorie"
                        value={newSubCategoryName}
                        onChange={(e) => setNewSubCategoryName(e.currentTarget.value)}
                        required
                        disabled={!categoryId && !isCreatingCategory}
                      />
                    ) : (
                      <Select
                        label="Unterkategorie"
                        placeholder="Unterkategorie wählen..."
                        data={filteredSubcategories.map((sc) => ({ value: sc.id!, label: sc.name }))}
                        value={subcategoryId}
                        onChange={setSubcategoryId}
                        searchable
                        required
                        disabled={!categoryId}
                      />
                    )}
                  </div>
                  {/* Only show toggle if we are NOT forced to create subcategory (because parent is new) */}
                  <Tooltip label={isCreatingSubCategory ? "Auswahl verwenden" : "Neue Unterkategorie erstellen"}>
                    <ActionIcon
                      onClick={() => {
                        setIsCreatingSubCategory(!isCreatingSubCategory);
                        setNewSubCategoryName("");
                        if (!isCreatingSubCategory) setSubcategoryId(null);
                      }}
                      variant={isCreatingSubCategory ? "filled" : "light"}
                      color={isCreatingSubCategory ? "red" : "blue"}
                      size="lg"
                      mb={2}
                      disabled={isCreatingCategory || (!categoryId && !isCreatingCategory)}
                    >
                      {isCreatingSubCategory ? <IconX size={18} /> : <IconPlus size={18} />}
                    </ActionIcon>
                  </Tooltip>
                </Group>

                <TextInput
                  label="Skill-Bezeichnung"
                  placeholder="Name des Skills..."
                  value={skillName}
                  onChange={(e) => setSkillName(e.currentTarget.value)}
                  onKeyDown={handleKeyDown}
                  required
                />

                <Textarea
                  label="Beschreibung (optional)"
                  placeholder="Zusätzliche Informationen..."
                  value={description}
                  onChange={(e) => setDescription(e.currentTarget.value)}
                  minRows={3}
                  autosize
                />
              </>
            )}

            {mode === "employee" && (
              <TextInput
                label="Name"
                placeholder="Mitarbeitername..."
                value={name}
                onChange={(e) => setName(e.currentTarget.value)}
                onKeyDown={handleKeyDown}
                data-autofocus
                required
              />
            )}
          </Stack>

          <Group justify="flex-end" mt="md">
            <Button variant="subtle" color="gray" onClick={handleCloseAttempt}>
              Abbrechen
            </Button>
            <Button
              onClick={handleSave}
              loading={loading}
              disabled={!isValid}
            >
              Hinzufügen
            </Button>
          </Group>
        </Stack>
      </Drawer>

      <Modal
        opened={confirmationOpen}
        onClose={() => setConfirmationOpen(false)}
        title="Ungespeicherte Änderungen"
        centered
      >
        <Text size="sm" mb="lg">
          Du hast ungespeicherte Änderungen. Möchtest du diese speichern oder verwerfen?
        </Text>
        <Group justify="flex-end">
          <Button variant="subtle" color="gray" onClick={() => setConfirmationOpen(false)}>
            Abbrechen
          </Button>
          <Button variant="light" color="red" onClick={() => {
            setConfirmationOpen(false);
            onClose();
          }}>
            Verwerfen
          </Button>
          <Button onClick={() => {
            setConfirmationOpen(false);
            handleSave();
          }}>
            Speichern
          </Button>
        </Group>
      </Modal>
    </>
  );
};
