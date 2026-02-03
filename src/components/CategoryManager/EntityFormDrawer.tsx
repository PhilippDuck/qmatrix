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
  selectedSubCategoryIds?: string[]; // For assigning skill to multiple subcategories

  onInputChange: (value: string) => void;
  onDescriptionChange: (value: string) => void;
  onDepartmentChange?: (value: string | null) => void;
  onRolesChange?: (values: string[]) => void;
  onSubcategoriesChange?: (values: string[]) => void; // New callback

  onSave: () => void;
  onDelete?: () => void;
  parentContext?: string;

  departments: Department[];
  roles: EmployeeRole[];
  subcategories?: any[]; // Allow grouped or flat data
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
  selectedSubCategoryIds,
  onInputChange,
  onDescriptionChange,
  onDepartmentChange,
  onRolesChange,
  onSubcategoriesChange,
  onSave,
  onDelete,
  parentContext,
  departments,
  roles,
  subcategories = [],
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
        {parentContext && (
          <div
            style={{
              backgroundColor: "var(--mantine-color-blue-light)",
              padding: "8px 12px",
              borderRadius: "4px",
              border: "1px solid var(--mantine-color-blue-2)",
            }}
          >
            <Text size="sm" c="blue.8" fw={500}>
              Zuordnung: {parentContext}
            </Text>
          </div>
        )}

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

            {!editingId && onSubcategoriesChange && (
              <MultiSelect
                label="Auch anderen Kategorien hinzufügen (Kopie)"
                placeholder="Wähle weitere Unterkategorien"
                description="Der Skill wird auch in den gewählten Unterkategorien erstellt."
                data={subcategories}
                value={selectedSubCategoryIds || []}
                onChange={(vals) => onSubcategoriesChange && onSubcategoriesChange(vals)}
                searchable
                clearable
                mt="md"
              />
            )}
          </>
        )}

        <Group justify="space-between" mt="xl">
          {editingId && onDelete ? (
            <Button variant="light" color="red" onClick={onDelete}>
              Löschen
            </Button>
          ) : (
            <div /> // Spacer if no delete button
          )}
          <Group gap="sm">
            <Button variant="subtle" color="gray" onClick={onClose}>
              Abbrechen
            </Button>
            <Button onClick={onSave} color="blue">
              Speichern
            </Button>
          </Group>
        </Group>
      </Stack>
    </Drawer>
  );
};
