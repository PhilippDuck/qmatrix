import React, { useState, useEffect } from "react";
import {
  Drawer,
  Stack,
  TextInput,
  Group,
  Button,
  Text,
  Divider,
  Tabs,
  Autocomplete,
} from "@mantine/core";
import { useHotkeys } from "@mantine/hooks";
import { IconPlus, IconHistory, IconUser } from "@tabler/icons-react";
import { HistoryTimeline } from "./HistoryTimeline";
import { useData } from "../../context/DataContext";

interface EmployeeDrawerProps {
  opened: boolean;
  onClose: () => void;
  onSave: (name: string, department: string, role: string) => Promise<void>;
  onDelete?: (id: string) => Promise<void>;
  initialData?: { name: string; department: string; role?: string };
  isEditing?: boolean;
  employeeId?: string | null;
}

export const EmployeeDrawer: React.FC<EmployeeDrawerProps> = ({
  opened,
  onClose,
  onSave,
  onDelete,
  initialData,
  isEditing = false,
  employeeId,
}) => {
  const { employees, departments, roles, addDepartment, addRole } = useData();
  const [formData, setFormData] = useState({ name: "", department: "", role: "" });
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<string | null>("details");

  useEffect(() => {
    if (opened) {
      setFormData({
        name: initialData?.name || "",
        department: initialData?.department || "",
        role: initialData?.role || "",
      });
      setActiveTab("details");
    }
  }, [opened, initialData]);

  const handleSave = async () => {
    if (!formData.name.trim()) return;

    setLoading(true);
    try {
      const trimmedName = formData.name.trim();
      const trimmedDept = formData.department.trim();
      const trimmedRole = formData.role.trim();



      // Check duplications
      const isDuplicate = employees.some(e =>
        e.name.toLowerCase() === trimmedName.toLowerCase() &&
        e.id !== employeeId
      );

      if (isDuplicate) {
        alert("Ein Mitarbeiter mit diesem Namen existiert bereits.");
        return;
      }


      // Check and create Department if new
      if (trimmedDept && !departments.some(d => d.name === trimmedDept)) {
        await addDepartment(trimmedDept);
      }

      // Check and create Role if new
      if (trimmedRole && !roles.some(r => r.name === trimmedRole)) {
        await addRole({ name: trimmedRole });
      }

      await onSave(formData.name.trim(), trimmedDept, trimmedRole);
      onClose();
    } catch (error) {
      console.error("Fehler beim Speichern:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!employeeId || !onDelete) return;

    if (window.confirm("Sind Sie sicher, dass Sie diesen Mitarbeiter löschen möchten?")) {
      setLoading(true);
      try {
        await onDelete(employeeId);
        onClose();
      } catch (error) {
        console.error("Fehler beim Löschen:", error);
      } finally {
        setLoading(false);
      }
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleSave();
    }
  };

  useHotkeys([["mod+Enter", (event) => {
    event.preventDefault();
    handleSave();
  }]], ['INPUT', 'TEXTAREA', 'SELECT']);

  // Removed manual onCreate handlers as we now handle creation on save via Autocomplete
  /*
  const handleCreateDepartment = async (query: string) => {
    await addDepartment(query);
    setFormData({ ...formData, department: query });
    return { value: query, label: query };
  };

  const handleCreateRole = async (query: string) => {
    await addRole({ name: query }); // Fixed type error here just in case, but unused now
    setFormData({ ...formData, role: query });
    return { value: query, label: query };
  };
  */

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
      {isEditing && employeeId ? (
        <Tabs value={activeTab} onChange={setActiveTab}>
          <Tabs.List mb="md" grow>
            <Tabs.Tab value="details" leftSection={<IconUser size={16} />}>
              Stammdaten
            </Tabs.Tab>
            <Tabs.Tab value="history" leftSection={<IconHistory size={16} />}>
              Historie
            </Tabs.Tab>
          </Tabs.List>

          <Tabs.Panel value="details">
            <Stack gap="md">
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

              <Autocomplete
                label="Abteilung / Team"
                placeholder="Wähle eine Abteilung oder erstelle neu"
                data={departments.map((d) => d.name)}
                value={formData.department}
                onChange={(value) =>
                  setFormData({ ...formData, department: value || "" })
                }
              />

              <Autocomplete
                label="Rolle / Qualifikations-Level"
                placeholder="Wähle eine Rolle oder erstelle neu"
                data={roles.map(r => r.name)}
                value={formData.role}
                onChange={(value) => setFormData({ ...formData, role: value || "" })}
              />

              <Group justify="space-between" mt="xl">
                {onDelete && (
                  <Button variant="light" color="red" onClick={handleDelete} loading={loading}>
                    Löschen
                  </Button>
                )}
                <Group>
                  <Button variant="subtle" color="gray" onClick={onClose}>
                    Abbrechen
                  </Button>
                  <Button
                    onClick={handleSave}
                    loading={loading}
                    leftSection={<IconPlus size={16} />}
                  >
                    Aktualisieren
                  </Button>
                </Group>
              </Group>
            </Stack>
          </Tabs.Panel>

          <Tabs.Panel value="history">
            <HistoryTimeline employeeId={employeeId} />
          </Tabs.Panel>
        </Tabs>
      ) : (
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

          <Autocomplete
            label="Abteilung / Team"
            placeholder="Wähle eine Abteilung oder erstelle neu"
            data={departments.map((d) => d.name)}
            value={formData.department}
            onChange={(value) =>
              setFormData({ ...formData, department: value || "" })
            }
          />

          <Autocomplete
            label="Rolle / Qualifikations-Level"
            placeholder="Wähle eine Rolle oder erstelle neu"
            data={roles.map(r => r.name)}
            value={formData.role}
            onChange={(value) => setFormData({ ...formData, role: value || "" })}
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
              Mitarbeiter anlegen
            </Button>
          </Group>
        </Stack>
      )}
    </Drawer>
  );
};
