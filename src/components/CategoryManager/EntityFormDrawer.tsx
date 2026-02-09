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
  Modal,
  Box,
} from "@mantine/core";
import { useHotkeys } from "@mantine/hooks";
import { Department, EmployeeRole } from "../../services/indexeddb";

export type FormMode = "category" | "subcategory" | "skill";

export interface EntityFormValues {
  name: string;
  description: string;
  departmentId: string | null;
  roleIds: string[];
  subCategoryIds: string[];
}

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

  initialValues: EntityFormValues; // New prop for dirty checking

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
  initialValues,
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
  const [confirmationOpen, setConfirmationOpen] = React.useState(false);

  const hasChanges = () => {
    if (inputValue !== initialValues.name) return true;
    if (inputDescription !== initialValues.description) return true;
    if ((selectedDepartmentId || null) !== (initialValues.departmentId || null)) return true;

    // Array comparison
    const currentRoles = (selectedRoleIds || []).slice().sort();
    const initRoles = (initialValues.roleIds || []).slice().sort();
    if (JSON.stringify(currentRoles) !== JSON.stringify(initRoles)) return true;

    const currentSubs = (selectedSubCategoryIds || []).slice().sort();
    const initSubs = (initialValues.subCategoryIds || []).slice().sort();
    if (JSON.stringify(currentSubs) !== JSON.stringify(initSubs)) return true;

    return false;
  };

  const handleCloseAttempt = () => {
    if (hasChanges()) {
      setConfirmationOpen(true);
    } else {
      onClose();
    }
  };

  const handleCreate = () => {
    onSave();
    // Ensure confirmation doesn't pop up after save if parent doesn't close immediately (though it usually does logic to close)
    // Ideally onSave should be successful.
  };

  useHotkeys([
    ["mod+Enter", (event) => { event.preventDefault(); handleCreate(); }]
  ], ['INPUT', 'TEXTAREA', 'SELECT']);

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
            {editingId ? "Eintrag bearbeiten" : "Neuer Eintrag"}
          </Text>
        }
      >
        <Stack gap="md" h="calc(100vh - 100px)" justify="space-between">
          <Box style={{ flex: 1, overflowY: 'auto', paddingRight: 4 }}>
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
                onKeyDown={(e) => {
                  if (e.key === "Enter" && inputValue.trim()) {
                    e.preventDefault();
                    handleCreate();
                  }
                }}
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
            </Stack>
          </Box>

          <Group justify="space-between" mt="md" pt="md" style={{ borderTop: '1px solid var(--mantine-color-default-border)' }}>
            {editingId && onDelete ? (
              <Button variant="light" color="red" onClick={onDelete}>
                Löschen
              </Button>
            ) : (
              <div /> // Spacer if no delete button
            )}
            <Group gap="sm">
              <Button variant="subtle" color="gray" onClick={handleCloseAttempt}>
                Abbrechen
              </Button>
              <Button onClick={handleCreate} color="blue">
                Speichern
              </Button>
            </Group>
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
            onClose(); // Close parent drawer
          }}>
            Verwerfen
          </Button>
          <Button onClick={() => {
            setConfirmationOpen(false);
            handleCreate(); // Save and try to close logic from parent
          }}>
            Speichern
          </Button>
        </Group>
      </Modal>
    </>
  );
};
