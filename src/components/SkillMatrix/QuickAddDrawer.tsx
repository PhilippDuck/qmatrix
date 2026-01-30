import React, { useState, useEffect } from "react";
import {
  Drawer,
  Stack,
  TextInput,
  Textarea,
  Group,
  Button,
  Text,
  Select,
} from "@mantine/core";
import { SubCategory } from "../../context/DataContext";

export type QuickAddMode = "employee" | "skill";

interface QuickAddDrawerProps {
  opened: boolean;
  onClose: () => void;
  mode: QuickAddMode;
  subcategories?: SubCategory[];
  preselectedSubcategoryId?: string | null;
  onAddEmployee: (name: string) => Promise<void>;
  onAddSkill: (subcategoryId: string, name: string, description: string) => Promise<void>;
}

export const QuickAddDrawer: React.FC<QuickAddDrawerProps> = ({
  opened,
  onClose,
  mode,
  subcategories = [],
  preselectedSubcategoryId,
  onAddEmployee,
  onAddSkill,
}) => {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [subcategoryId, setSubcategoryId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (opened) {
      setName("");
      setDescription("");
      setSubcategoryId(preselectedSubcategoryId || null);
    }
  }, [opened, preselectedSubcategoryId]);

  const handleSave = async () => {
    if (!name.trim()) return;

    setLoading(true);
    try {
      if (mode === "employee") {
        await onAddEmployee(name.trim());
      } else if (mode === "skill" && subcategoryId) {
        await onAddSkill(subcategoryId, name.trim(), description.trim());
      }
      onClose();
    } catch (error) {
      console.error("Fehler beim Speichern:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSave();
    }
  };

  const isValid = mode === "employee"
    ? name.trim().length > 0
    : name.trim().length > 0 && subcategoryId;

  return (
    <Drawer
      opened={opened}
      onClose={onClose}
      position="right"
      size="sm"
      overlayProps={{ backgroundOpacity: 0.5, blur: 4 }}
      title={
        <Text fw={700} size="lg">
          {mode === "employee" ? "Neuer Mitarbeiter" : "Neuer Skill"}
        </Text>
      }
    >
      <Stack gap="md">
        {mode === "skill" && (
          <Select
            label="Unterkategorie"
            placeholder="Unterkategorie wählen..."
            data={subcategories.map((sc) => ({
              value: sc.id!,
              label: sc.name,
            }))}
            value={subcategoryId}
            onChange={setSubcategoryId}
            searchable
            required
          />
        )}

        <TextInput
          label="Name"
          placeholder={mode === "employee" ? "Mitarbeitername..." : "Skill-Bezeichnung..."}
          value={name}
          onChange={(e) => setName(e.currentTarget.value)}
          onKeyDown={handleKeyDown}
          data-autofocus
          required
        />

        {mode === "skill" && (
          <Textarea
            label="Beschreibung (optional)"
            placeholder="Zusätzliche Informationen..."
            value={description}
            onChange={(e) => setDescription(e.currentTarget.value)}
            minRows={3}
            autosize
          />
        )}

        <Group justify="flex-end" mt="md">
          <Button variant="subtle" color="gray" onClick={onClose}>
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
  );
};
