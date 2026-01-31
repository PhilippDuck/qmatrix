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
  Select,
} from "@mantine/core";
import { IconPlus, IconHistory, IconUser } from "@tabler/icons-react";
import { HistoryTimeline } from "./HistoryTimeline";
import { useData } from "../../context/DataContext";

interface EmployeeDrawerProps {
  opened: boolean;
  onClose: () => void;
  onSave: (name: string, department: string, role: string) => Promise<void>;
  initialData?: { name: string; department: string; role?: string };
  isEditing?: boolean;
  employeeId?: string | null;
}

export const EmployeeDrawer: React.FC<EmployeeDrawerProps> = ({
  opened,
  onClose,
  onSave,
  initialData,
  isEditing = false,
  employeeId,
}) => {
  const { departments, roles, addDepartment, addRole } = useData();
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
      await onSave(formData.name.trim(), formData.department.trim(), formData.role.trim());
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

  const handleCreateDepartment = async (query: string) => {
    await addDepartment(query);
    setFormData({ ...formData, department: query });
    return { value: query, label: query };
  };

  const handleCreateRole = async (query: string) => {
    await addRole(query);
    setFormData({ ...formData, role: query });
    return { value: query, label: query };
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

              <Select
                label="Abteilung / Team"
                placeholder="Wähle eine Abteilung"
                data={departments.map((d) => d.name)}
                value={formData.department}
                onChange={(value) =>
                  setFormData({ ...formData, department: value || "" })
                }
                clearable
                searchable
                creatable
                getCreateLabel={(query) => `+ ${query} erstellen`}
                onCreate={handleCreateDepartment}
              />

              <Select
                label="Rolle / Qualifikations-Level"
                placeholder="Wähle eine Rolle"
                data={roles.map(r => r.name)}
                value={formData.role}
                onChange={(value) => setFormData({ ...formData, role: value || "" })}
                clearable
                searchable
                creatable
                getCreateLabel={(query) => `+ ${query} erstellen`}
                onCreate={handleCreateRole}
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
                  Aktualisieren
                </Button>
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

          <Select
            label="Abteilung / Team"
            placeholder="Wähle eine Abteilung"
            data={departments.map((d) => d.name)}
            value={formData.department}
            onChange={(value) =>
              setFormData({ ...formData, department: value || "" })
            }
            clearable
            searchable
            creatable
            getCreateLabel={(query) => `+ ${query} erstellen`}
            onCreate={handleCreateDepartment}
          />

          <Select
            label="Rolle / Qualifikations-Level"
            placeholder="Wähle eine Rolle"
            data={roles.map(r => r.name)}
            value={formData.role}
            onChange={(value) => setFormData({ ...formData, role: value || "" })}
            clearable
            searchable
            creatable
            getCreateLabel={(query) => `+ ${query} erstellen`}
            onCreate={handleCreateRole}
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
