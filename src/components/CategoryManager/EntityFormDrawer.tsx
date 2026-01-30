import React from "react";
import {
  Drawer,
  Stack,
  Divider,
  TextInput,
  Textarea,
  Group,
  Button,
  Text,
} from "@mantine/core";

export type FormMode = "category" | "subcategory" | "skill";

interface EntityFormDrawerProps {
  opened: boolean;
  onClose: () => void;
  formMode: FormMode;
  editingId: string | null;
  inputValue: string;
  inputDescription: string;
  onInputChange: (value: string) => void;
  onDescriptionChange: (value: string) => void;
  onSave: () => void;
}

const MODE_LABELS: Record<FormMode, string> = {
  category: "Kategorie",
  subcategory: "Unterkategorie",
  skill: "Skill",
};

export const EntityFormDrawer: React.FC<EntityFormDrawerProps> = ({
  opened,
  onClose,
  formMode,
  editingId,
  inputValue,
  inputDescription,
  onInputChange,
  onDescriptionChange,
  onSave,
}) => {
  return (
    <Drawer
      opened={opened}
      onClose={onClose}
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
        <Divider
          label={`Eingabe für ${MODE_LABELS[formMode]}`}
          labelPosition="center"
        />

        <TextInput
          label="Name"
          placeholder="Bezeichnung eingeben..."
          value={inputValue}
          onChange={(e) => onInputChange(e.currentTarget.value)}
          data-autofocus
          required
        />

        <Textarea
          label="Beschreibung"
          placeholder="Zusätzliche Informationen, Details oder Lernziele..."
          value={inputDescription}
          onChange={(e) => onDescriptionChange(e.currentTarget.value)}
          minRows={4}
          autosize
        />

        <Group justify="flex-end" mt="xl">
          <Button variant="subtle" color="gray" onClick={onClose}>
            Abbrechen
          </Button>
          <Button onClick={onSave} color="blue">
            Speichern
          </Button>
        </Group>
      </Stack>
    </Drawer>
  );
};
