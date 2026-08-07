import React, { useState, useEffect } from "react";
import {
  Drawer,
  Stack,
  TextInput,
  Textarea,
  Group,
  Button,
  Text,
  Modal,
  ActionIcon,
  Combobox,
  useCombobox
} from "@mantine/core";
import { useHotkeys } from "@mantine/hooks";
import { IconX } from "@tabler/icons-react";
import { Category, SubCategory } from "../../store/useStore";

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
  onAddSubCategory: (categoryId: string, name: string, parentSubCategoryId?: string) => Promise<string>;
}

interface PathNode {
  id: string | null; // null if creating a new one
  name: string;
  isNew: boolean;
  options: { label: string, value: string }[];
}

function CustomCreatableSelect({
  label,
  options,
  value,
  onChange,
  onCreate,
  onClear,
  isNew
}: {
  label: string;
  options: { label: string, value: string }[];
  value: string;
  onChange: (val: string, label: string) => void;
  onCreate: (name: string) => void;
  onClear: () => void;
  isNew: boolean;
}) {
  const combobox = useCombobox({
    onDropdownClose: () => combobox.resetSelectedOption(),
  });

  const [search, setSearch] = useState("");

  useEffect(() => {
    if (value) {
      setSearch(value);
    } else {
      setSearch("");
    }
  }, [value]);

  const exactOptionMatch = options.find((item) => item.label.toLowerCase() === search.toLowerCase().trim());

  const optionsList = options
    .filter((o) => o.label.toLowerCase().includes(search.toLowerCase().trim()))
    .map((item) => (
      <Combobox.Option value={item.value} key={item.value}>
        {item.label}
      </Combobox.Option>
    ));

  return (
    <Combobox
      store={combobox}
      withinPortal={false}
      onOptionSubmit={(val) => {
        if (val === '$create') {
          onCreate(search.trim());
        } else {
          onChange(val, options.find(o => o.value === val)?.label || '');
        }
        combobox.closeDropdown();
      }}
    >
      <Combobox.Target>
        <TextInput
          label={label}
          placeholder={`${label} wählen oder tippen...`}
          value={search}
          onChange={(event) => {
            setSearch(event.currentTarget.value);
            combobox.openDropdown();
            combobox.updateSelectedOptionIndex();
          }}
          onClick={() => combobox.openDropdown()}
          onFocus={() => combobox.openDropdown()}
          onBlur={() => combobox.closeDropdown()}
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              // We stop event propagation so the global form doesn't submit
              event.stopPropagation();
              event.preventDefault();
              if (search.trim().length > 0 && !value) {
                if (exactOptionMatch) {
                  onChange(exactOptionMatch.value, exactOptionMatch.label);
                  combobox.closeDropdown();
                } else {
                  onCreate(search.trim());
                  combobox.closeDropdown();
                }
              }
            }
          }}
          required
          rightSection={
            value ? (
              <ActionIcon size="sm" color={isNew ? "orange" : "gray"} variant="subtle" onClick={(e) => {
                e.stopPropagation();
                onClear();
                setSearch("");
              }}>
                <IconX size={14} />
              </ActionIcon>
            ) : null
          }
        />
      </Combobox.Target>

      <Combobox.Dropdown>
        <Combobox.Options>
          {optionsList.length > 0 ? optionsList : null}
          {!exactOptionMatch && search.trim().length > 0 && (
            <Combobox.Option value="$create">+ "{search.trim()}" anlegen</Combobox.Option>
          )}
          {optionsList.length === 0 && search.trim().length === 0 && (
            <Combobox.Empty>Keine Gruppen gefunden</Combobox.Empty>
          )}
        </Combobox.Options>
      </Combobox.Dropdown>
    </Combobox>
  );
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

  // Cascading Path State
  const [path, setPath] = useState<PathNode[]>([]);

  const [loading, setLoading] = useState(false);

  // Initialize first level (Category)
  useEffect(() => {
    if (opened && mode === 'skill') {
      const rootOptions = categories
        .map(c => ({ value: c.id!, label: c.name }))
        .sort((a, b) => a.label.localeCompare(b.label));

      // Handle preselection logic (rebuild path from subcategoryId)
      if (preselectedSubcategoryId) {
        // Rebuild path bottom up
        const initialPath: PathNode[] = [];
        let currSubId: string | undefined = preselectedSubcategoryId;
        let finalCatId: string | null = null;

        while (currSubId) {
          const sc = subcategories.find(s => s.id === currSubId);
          if (!sc) break;

          finalCatId = sc.categoryId;

          // Build options for this level
          let levelOpts;
          if (sc.parentSubCategoryId) {
            levelOpts = subcategories.filter(s => s.parentSubCategoryId === sc.parentSubCategoryId).map(s => ({ value: s.id!, label: s.name })).sort((a, b) => a.label.localeCompare(b.label));
          } else {
            levelOpts = subcategories.filter(s => s.categoryId === sc.categoryId && !s.parentSubCategoryId).map(s => ({ value: s.id!, label: s.name })).sort((a, b) => a.label.localeCompare(b.label));
          }

          initialPath.unshift({
            id: sc.id!,
            name: sc.name,
            isNew: false,
            options: levelOpts
          });
          currSubId = sc.parentSubCategoryId;
        }

        if (finalCatId) {
          const cat = categories.find(c => c.id === finalCatId);
          if (cat) {
            initialPath.unshift({
              id: cat.id!,
              name: cat.name,
              isNew: false,
              options: rootOptions
            });
          }
        }

        // Add the empty trailing selection for the next possible level
        if (initialPath.length > 0) {
          const lastNode = initialPath[initialPath.length - 1];
          if (lastNode.id) {
            const nextOpts = subcategories.filter(s => s.parentSubCategoryId === lastNode.id).map(s => ({ value: s.id!, label: s.name })).sort((a, b) => a.label.localeCompare(b.label));
            if (nextOpts.length > 0) {
              initialPath.push({ id: null, name: "", isNew: false, options: nextOpts });
            } else {
              // Always offer to create the next level
              initialPath.push({ id: null, name: "", isNew: false, options: [] });
            }
          }
        }

        setPath(initialPath.length > 0 ? initialPath : [{ id: null, name: "", isNew: false, options: rootOptions }]);
      } else {
        setPath([{ id: null, name: "", isNew: false, options: rootOptions }]);
      }
    }
  }, [opened, mode, categories, subcategories, preselectedSubcategoryId]);

  useEffect(() => {
    if (opened) {
      setName("");
      setSkillName("");
      setDescription("");
    }
  }, [opened]);

  const handleLevelSelect = (levelIndex: number, value: string | null, label: string = "") => {
    if (!value) {
      // Clear this level and all subsequent levels
      setPath(prev => {
        const newPath = prev.slice(0, levelIndex + 1);
        newPath[levelIndex] = { ...newPath[levelIndex], id: null, name: "", isNew: false };
        return newPath;
      });
      return;
    }

    // A value was selected
    setPath(prev => {
      const newPath = prev.slice(0, levelIndex + 1);

      newPath[levelIndex] = {
        ...newPath[levelIndex],
        id: value,
        name: label,
        isNew: false
      };

      // Calculate next level options
      if (levelIndex === 0) { // Category selected, get root subcategories
        const nextOpts = subcategories
          .filter(sc => sc.categoryId === value && !sc.parentSubCategoryId)
          .map(sc => ({ value: sc.id!, label: sc.name }))
          .sort((a, b) => a.label.localeCompare(b.label));
        newPath.push({ id: null, name: "", isNew: false, options: nextOpts });
      } else { // Subcat selected, get child subcategories
        const nextOpts = subcategories
          .filter(sc => sc.parentSubCategoryId === value)
          .map(sc => ({ value: sc.id!, label: sc.name }))
          .sort((a, b) => a.label.localeCompare(b.label));
        newPath.push({ id: null, name: "", isNew: false, options: nextOpts });
      }

      return newPath;
    });
  };

  const handleCreateLevel = (levelIndex: number, newName: string) => {
    if (!newName.trim()) return;

    setPath(prev => {
      const newPath = prev.slice(0, levelIndex + 1);
      newPath[levelIndex] = {
        ...newPath[levelIndex],
        id: null,
        name: newName.trim(),
        isNew: true
      };
      // Immediately push the next empty row
      newPath.push({ id: null, name: "", isNew: false, options: [] });
      return newPath;
    });
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      if (mode === "employee") {
        if (!name.trim()) return;
        await onAddEmployee(name.trim());
      } else if (mode === "skill") {

        let currentCatId: string | null = null;
        let lastCreatedSubId: string | null = null;

        // Iterate through path to create required entities
        for (let i = 0; i < path.length; i++) {
          const node = path[i];

          // Skip empty trailing nodes
          if (!node.id && !node.isNew) continue;

          if (i === 0) {
            // Determine Category
            if (node.isNew) {
              currentCatId = await onAddCategory(node.name);
            } else {
              currentCatId = node.id!;
            }
          } else {
            // Determine Subcategory
            const parentId = (i === 1) ? undefined : lastCreatedSubId!;
            if (node.isNew) {
              // Create it on the fly
              lastCreatedSubId = await onAddSubCategory(currentCatId!, node.name, parentId);
            } else {
              lastCreatedSubId = node.id!;
            }
          }
        }

        // Must have at least a category
        if (!currentCatId) return;

        // Create Skill
        if (!lastCreatedSubId || !skillName.trim()) return;
        await onAddSkill(lastCreatedSubId, skillName.trim(), description.trim());
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
    // Path valid if at least the first level (Category) AND second level (Subcategory) are fully filled
    const hasCategory = path.length > 0 && !!(path[0].id || (path[0].isNew && path[0].name.trim()));
    const hasSubcategory = path.length > 1 && !!(path[1].id || (path[1].isNew && path[1].name.trim()));
    const skillValid = skillName.trim().length > 0;
    isValid = hasCategory && hasSubcategory && skillValid;
  }

  // Unsaved Changes Logic
  const [confirmationOpen, setConfirmationOpen] = useState(false);

  const hasChanges = () => {
    if (mode === 'employee') {
      if (name.trim()) return true;
    } else {
      if (skillName.trim()) return true;
      if (description.trim()) return true;
      if (path.length > 1 || path[0]?.id || path[0]?.name) return true;
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
                <Text size="sm" fw={500} mb={-8}>Gruppierung festlegen</Text>
                <Text size="xs" c="dimmed">Wähle Gruppen oder tippe neue Namen ein und bestätige mit Enter.</Text>

                {path.map((node, index) => {
                  const isCategory = index === 0;
                  const label = isCategory ? "Hauptkategorie" : `Unterkategorie Ebene ${index}`;

                  return (
                    <Group align="flex-end" gap="xs" key={index} style={{ paddingLeft: index > 0 ? index * 16 : 0, pr: 0 }}>
                      <div style={{ flex: 1 }}>
                        <CustomCreatableSelect
                          label={label}
                          options={node.options}
                          value={node.name}
                          onChange={(val, lbl) => handleLevelSelect(index, val, lbl)}
                          onCreate={(newName) => handleCreateLevel(index, newName)}
                          onClear={() => handleLevelSelect(index, null)}
                          isNew={node.isNew}
                        />
                      </div>
                    </Group>
                  );
                })}

                <TextInput
                  label="Skill-Bezeichnung"
                  placeholder="Name des Skills..."
                  value={skillName}
                  onChange={(e) => setSkillName(e.currentTarget.value)}
                  onKeyDown={handleKeyDown}
                  mt="md"
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
