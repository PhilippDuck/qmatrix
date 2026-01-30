import React, { useState, useEffect } from "react";
import {
  Drawer,
  Stack,
  TextInput,
  Group,
  Button,
  Text,
  Divider,
} from "@mantine/core";
import { IconPlus } from "@tabler/icons-react";

interface EmployeeDrawerProps {
  opened: boolean;
  onClose: () => void;
  onSave: (name: string, department: string) => Promise<void>;
  initialData?: { name: string; department: string };
  isEditing?: boolean;
}

export const EmployeeDrawer: React.FC<EmployeeDrawerProps> = ({
  opened,
  onClose,
  onSave,
  initialData,
  isEditing = false,
}) => {
  const [formData, setFormData] = useState({ name: "", department: "" });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (opened) {
      setFormData(initialData || { name: "", department: "" });
    }
  }, [opened, initialData]);

  const handleSave = async () => {
    if (!formData.name.trim()) return;

    setLoading(true);
    try {
      await onSave(formData.name.trim(), formData.department.trim());
      onClose();
    } catch (error) {
      console.error("Fehler beim Speichern:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleSave();
    }
  };

  return (
    <Drawer
      opened={opened}
      onClose={onClose}
      position="right"
      size="md"
      overlayProps={{ backgroundOpacity: 0.5, blur: 4 }}
      title={
        <Text fw={700} size="lg">
          {isEditing ? "Mitarbeiter bearbeiten" : "Neuen Mitarbeiter anlegen"}
        </Text>
      }
    >
      <Stack gap="md">
        <Divider label="Personalinformationen" labelPosition="center" />

        <TextInput
          label="Vollständiger Name"
          placeholder="z.B. Max Mustermann"
          value={formData.name}
          onChange={(e) =>
            setFormData({ ...formData, name: e.currentTarget.value })
          }
          onKeyDown={handleKeyDown}
          data-autofocus
          required
        />

        <TextInput
          label="Abteilung / Team"
          placeholder="z.B. Softwareentwicklung"
          value={formData.department}
          onChange={(e) =>
            setFormData({ ...formData, department: e.currentTarget.value })
          }
          onKeyDown={handleKeyDown}
        />

        <Group justify="flex-end" mt="xl">
          <Button variant="subtle" color="gray" onClick={onClose}>
            Abbrechen
          </Button>
          <Button
            onClick={handleSave}
            loading={loading}
            leftSection={<IconPlus size={16} />}
          >
            {isEditing ? "Aktualisieren" : "Mitarbeiter anlegen"}
          </Button>
        </Group>
      </Stack>
    </Drawer>
  );
};
