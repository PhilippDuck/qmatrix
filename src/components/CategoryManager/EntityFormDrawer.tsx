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
  Select,
  MultiSelect,
} from "@mantine/core";
import { useHotkeys } from "@mantine/hooks";
import { Department, EmployeeRole } from "../../services/indexeddb";

export type FormMode = "category" | "subcategory" | "skill";

interface EntityFormDrawerProps {
  opened: boolean;
  onClose: () => void;
  formMode: FormMode;
  editingId: string | null;

  inputValue: string;
  inputDescription: string;
  selectedDepartmentId?: string | null;
  selectedRoleIds?: string[];

  onInputChange: (value: string) => void;
  onDescriptionChange: (value: string) => void;
  onDepartmentChange?: (value: string | null) => void;
  onRolesChange?: (values: string[]) => void;

  onSave: () => void;

  departments: Department[];
  roles: EmployeeRole[];
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
  selectedDepartmentId,
  selectedRoleIds,
  onInputChange,
  onDescriptionChange,
  onDepartmentChange,
  onRolesChange,
  onSave,
  departments,
  roles,
}) => {
  useHotkeys([
    ["mod+Enter", (event) => { event.preventDefault(); onSave(); }]
  ], ['INPUT', 'TEXTAREA', 'SELECT']);

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

        {formMode === "skill" && (
          <>
            <Divider label="Zuordnung & Anforderungen" labelPosition="center" />

            <Select
              label="Zuständige Abteilung (Optional)"
              placeholder="Wähle eine Abteilung"
              data={departments.map(d => ({ value: d.id!, label: d.name }))}
              value={selectedDepartmentId}
              onChange={(val) => onDepartmentChange?.(val)}
              clearable
              searchable
            />

            <MultiSelect
              label="Erforderlich für Rollen / Level (Optional)"
              placeholder="Wähle Rollen aus"
              data={roles.map(r => ({ value: r.id!, label: r.name }))}
              value={selectedRoleIds || []}
              onChange={(vals) => onRolesChange?.(vals)}
              searchable
              clearable
            />
          </>
        )}

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
