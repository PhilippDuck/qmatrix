import React, { useState } from "react";
import {
  Table,
  Button,
  TextInput,
  Group,
  ActionIcon,
  Title,
  Card,
  Stack,
  Drawer,
  Text,
  Divider,
  Box,
  Badge,
} from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import {
  IconPlus,
  IconEdit,
  IconTrash,
  IconCategory,
  IconArrowRight,
  IconTarget,
} from "@tabler/icons-react";
import { useData } from "../context/DataContext";

type FormMode = "category" | "subcategory" | "skill";

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

  // Drawer Steuerung
  const [opened, { open, close }] = useDisclosure(false);
  const [formMode, setFormMode] = useState<FormMode>("category");

  // Auswahl-Status
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedSubCategory, setSelectedSubCategory] = useState<string | null>(
    null,
  );

  // Formular-Status
  const [inputValue, setInputValue] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);

  // Öffnet das Formular im Drawer
  const openForm = (
    mode: FormMode,
    id: string | null = null,
    initialValue: string = "",
  ) => {
    setFormMode(mode);
    setEditingId(id);
    setInputValue(initialValue);
    open();
  };

  const handleSave = async () => {
    if (!inputValue.trim()) return;

    try {
      if (formMode === "category") {
        editingId
          ? await updateCategory(editingId, { name: inputValue })
          : await addCategory({ name: inputValue });
      } else if (formMode === "subcategory" && selectedCategory) {
        editingId
          ? await updateSubCategory(editingId, {
              categoryId: selectedCategory,
              name: inputValue,
            })
          : await addSubCategory({
              categoryId: selectedCategory,
              name: inputValue,
            });
      } else if (formMode === "skill" && selectedSubCategory) {
        editingId
          ? await updateSkill(editingId, {
              subCategoryId: selectedSubCategory,
              name: inputValue,
            })
          : await addSkill({
              subCategoryId: selectedSubCategory,
              name: inputValue,
            });
      }

      setInputValue("");
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
        {/* 1. Spalte: Hauptkategorien */}
        <Card withBorder shadow="sm" radius="md" style={{ flex: 1 }}>
          <Group justify="space-between" mb="md">
            <Group gap="xs">
              <IconCategory
                size={20}
                color="var(--mantine-color-blue-filled)"
              />
              <Title order={4}>Kategorien</Title>
            </Group>
            <Button
              size="compact-xs"
              variant="light"
              leftSection={<IconPlus size={14} />}
              onClick={() => openForm("category")}
            >
              Neu
            </Button>
          </Group>

          <Table verticalSpacing="sm" highlightOnHover>
            <Table.Tbody>
              {categories.map((cat) => (
                <Table.Tr
                  key={cat.id}
                  style={{
                    cursor: "pointer",
                    backgroundColor:
                      selectedCategory === cat.id
                        ? "var(--mantine-color-blue-light)"
                        : "transparent",
                  }}
                  onClick={() => {
                    setSelectedCategory(cat.id!);
                    setSelectedSubCategory(null);
                  }}
                >
                  <Table.Td>
                    <Group justify="space-between" wrap="nowrap">
                      <Text
                        size="sm"
                        fw={selectedCategory === cat.id ? 600 : 400}
                      >
                        {cat.name}
                      </Text>
                      <Badge variant="light" color="blue" size="xs" circle>
                        {getSubCategoriesByCategory(cat.id!).length}
                      </Badge>
                    </Group>
                  </Table.Td>
                  <Table.Td style={{ width: 70 }}>
                    <Group gap={4} justify="flex-end">
                      <ActionIcon
                        size="sm"
                        variant="subtle"
                        onClick={(e) => {
                          e.stopPropagation();
                          openForm("category", cat.id!, cat.name);
                        }}
                      >
                        <IconEdit size={14} />
                      </ActionIcon>
                      <ActionIcon
                        size="sm"
                        variant="subtle"
                        color="red"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (confirm("Kategorie löschen?"))
                            deleteCategory(cat.id!);
                        }}
                      >
                        <IconTrash size={14} />
                      </ActionIcon>
                    </Group>
                  </Table.Td>
                </Table.Tr>
              ))}
            </Table.Tbody>
          </Table>
        </Card>

        {/* 2. Spalte: Unterkategorien */}
        <Card
          withBorder
          shadow="sm"
          radius="md"
          style={{ flex: 1, opacity: selectedCategory ? 1 : 0.6 }}
        >
          <Group justify="space-between" mb="md">
            <Group gap="xs">
              <IconArrowRight size={20} color="gray" />
              <Title order={4}>Unterkategorien</Title>
            </Group>
            <Button
              size="compact-xs"
              variant="light"
              disabled={!selectedCategory}
              leftSection={<IconPlus size={14} />}
              onClick={() => openForm("subcategory")}
            >
              Neu
            </Button>
          </Group>
          {selectedCategory ? (
            <Table verticalSpacing="sm" highlightOnHover>
              <Table.Tbody>
                {subCatsInCategory.map((sub) => (
                  <Table.Tr
                    key={sub.id}
                    style={{
                      cursor: "pointer",
                      backgroundColor:
                        selectedSubCategory === sub.id
                          ? "var(--mantine-color-blue-light)"
                          : "transparent",
                    }}
                    onClick={() => setSelectedSubCategory(sub.id!)}
                  >
                    <Table.Td>
                      <Group justify="space-between" wrap="nowrap">
                        <Text
                          size="sm"
                          fw={selectedSubCategory === sub.id ? 600 : 400}
                        >
                          {sub.name}
                        </Text>
                        <Badge variant="light" color="cyan" size="xs" circle>
                          {getSkillsBySubCategory(sub.id!).length}
                        </Badge>
                      </Group>
                    </Table.Td>
                    <Table.Td style={{ width: 70 }}>
                      <Group gap={4} justify="flex-end">
                        <ActionIcon
                          size="sm"
                          variant="subtle"
                          onClick={(e) => {
                            e.stopPropagation();
                            openForm("subcategory", sub.id!, sub.name);
                          }}
                        >
                          <IconEdit size={14} />
                        </ActionIcon>
                        <ActionIcon
                          size="sm"
                          variant="subtle"
                          color="red"
                          onClick={(e) => {
                            e.stopPropagation();
                            if (confirm("Unterkategorie löschen?"))
                              deleteSubCategory(sub.id!);
                          }}
                        >
                          <IconTrash size={14} />
                        </ActionIcon>
                      </Group>
                    </Table.Td>
                  </Table.Tr>
                ))}
              </Table.Tbody>
            </Table>
          ) : (
            <Text c="dimmed" size="sm" ta="center" py="xl">
              Wählen Sie erst eine Kategorie
            </Text>
          )}
        </Card>

        {/* 3. Spalte: Skills */}
        <Card
          withBorder
          shadow="sm"
          radius="md"
          style={{ flex: 1, opacity: selectedSubCategory ? 1 : 0.6 }}
        >
          <Group justify="space-between" mb="md">
            <Group gap="xs">
              <IconTarget size={20} color="var(--mantine-color-teal-filled)" />
              <Title order={4}>Skills</Title>
            </Group>
            <Button
              size="compact-xs"
              variant="light"
              disabled={!selectedSubCategory}
              leftSection={<IconPlus size={14} />}
              onClick={() => openForm("skill")}
            >
              Neu
            </Button>
          </Group>
          {selectedSubCategory ? (
            <Table verticalSpacing="sm" highlightOnHover>
              <Table.Tbody>
                {skillsInSubCategory.map((skill) => (
                  <Table.Tr key={skill.id}>
                    <Table.Td>
                      <Text size="sm">{skill.name}</Text>
                    </Table.Td>
                    <Table.Td style={{ width: 70 }}>
                      <Group gap={4} justify="flex-end">
                        <ActionIcon
                          size="sm"
                          variant="subtle"
                          onClick={() =>
                            openForm("skill", skill.id!, skill.name)
                          }
                        >
                          <IconEdit size={14} />
                        </ActionIcon>
                        <ActionIcon
                          size="sm"
                          variant="subtle"
                          color="red"
                          onClick={() => {
                            if (confirm("Skill löschen?"))
                              deleteSkill(skill.id!);
                          }}
                        >
                          <IconTrash size={14} />
                        </ActionIcon>
                      </Group>
                    </Table.Td>
                  </Table.Tr>
                ))}
              </Table.Tbody>
            </Table>
          ) : (
            <Text c="dimmed" size="sm" ta="center" py="xl">
              Wählen Sie erst eine Unterkategorie
            </Text>
          )}
        </Card>
      </Group>

      {/* --- Zentraler Drawer --- */}
      <Drawer
        opened={opened}
        onClose={close}
        position="right"
        size="md"
        overlayProps={{ backgroundOpacity: 0.5, blur: 4 }}
        title={
          <Text fw={700} size="lg">
            {editingId ? "Eintrag bearbeiten" : "Neuer Eintrag"}
          </Text>
        }
      >
        <Stack gap="md">
          <Divider label={`Eingabe für ${formMode}`} labelPosition="center" />

          <TextInput
            label="Name"
            placeholder="Bezeichnung eingeben..."
            value={inputValue}
            onChange={(e) => setInputValue(e.currentTarget.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSave()}
            data-autofocus
          />

          <Group justify="flex-end" mt="xl">
            <Button variant="subtle" color="gray" onClick={close}>
              Abbrechen
            </Button>
            <Button onClick={handleSave} color="blue">
              Speichern
            </Button>
          </Group>
        </Stack>
      </Drawer>
    </Box>
  );
};
