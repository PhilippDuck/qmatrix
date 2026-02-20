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
  MultiSelect,
  Modal,
  Switch,
  Box,
  TagsInput,
} from "@mantine/core";
import { DatePickerInput } from "@mantine/dates";
import "@mantine/dates/styles.css";
import { useHotkeys } from "@mantine/hooks";
import { modals } from "@mantine/modals";
import { notifications } from "@mantine/notifications";
import { IconPlus, IconHistory, IconUser } from "@tabler/icons-react";
import { HistoryTimeline } from "./HistoryTimeline";
import { useStore } from "../../store/useStore";

interface EmployeeDrawerProps {
  opened: boolean;
  onClose: () => void;
  onSave: (name: string, department: string, roles: string[], isActive: boolean, deactivationDate?: Date | null, reactivationDate?: Date | null) => Promise<void>;
  onDelete?: (id: string) => Promise<void>;
  initialData?: { name: string; department: string; roles?: string[]; isActive?: boolean; deactivationDate?: string; reactivationDate?: string };
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
  const { employees, departments, roles, addDepartment, addRole } = useStore();
  const [formData, setFormData] = useState({
    name: "",
    department: "",
    roles: [] as string[],
    isActive: true,
    deactivationDate: null as Date | null,
    reactivationDate: null as Date | null,
  });
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<string | null>("details");

  useEffect(() => {
    if (opened) {
      setFormData({
        name: initialData?.name || "",
        department: initialData?.department || "",
        roles: initialData?.roles || [],
        isActive: initialData?.isActive !== undefined ? initialData.isActive : true,
        deactivationDate: initialData?.deactivationDate ? new Date(initialData.deactivationDate) : null,
        reactivationDate: initialData?.reactivationDate ? new Date(initialData.reactivationDate) : null,
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
      const trimmedRoles = formData.roles.map(r => r.trim()).filter(r => r.length > 0);

      // Check duplications
      const isDuplicate = employees.some(e =>
        e.name.toLowerCase() === trimmedName.toLowerCase() &&
        e.id !== employeeId
      );

      if (isDuplicate) {
        notifications.show({
          title: 'Fehler',
          message: 'Ein Mitarbeiter mit diesem Namen existiert bereits.',
          color: 'red',
        });
        return;
      }

      // Check and create Department if new
      if (trimmedDept && !departments.some(d => d.name === trimmedDept)) {
        await addDepartment(trimmedDept);
      }

      // Check and create Roles if new
      for (const roleName of trimmedRoles) {
        if (!roles.some(r => r.name === roleName)) {
          await addRole({ name: roleName });
        }
      }

      await onSave(
        formData.name.trim(),
        trimmedDept,
        trimmedRoles,
        formData.isActive,
        formData.deactivationDate,
        formData.reactivationDate
      );
      onClose();
    } catch (error) {
      console.error("Fehler beim Speichern:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!employeeId || !onDelete) return;

    modals.openConfirmModal({
      title: 'Mitarbeiter löschen',
      centered: true,
      children: (
        <Text size="sm">
          Sind Sie sicher, dass Sie diesen Mitarbeiter löschen möchten?
        </Text>
      ),
      labels: { confirm: 'Löschen', cancel: 'Abbrechen' },
      confirmProps: { color: 'red' },
      onConfirm: async () => {
        setLoading(true);
        try {
          await onDelete(employeeId);
          onClose();
        } catch (error) {
          console.error("Fehler beim Löschen:", error);
        } finally {
          setLoading(false);
        }
      },
    });
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

  // Unsaved Changes Logic
  const [confirmationOpen, setConfirmationOpen] = useState(false);

  const hasChanges = () => {
    const initName = initialData?.name || "";
    const initDept = initialData?.department || "";
    const initRoles = (initialData?.roles || []).slice().sort();
    const initActive = initialData?.isActive !== undefined ? initialData.isActive : true;

    // Normalize dates for comparison (null vs undefined, string vs Date)
    const initDeact = initialData?.deactivationDate ? new Date(initialData.deactivationDate).getTime() : 0;
    const currDeact = formData.deactivationDate ? formData.deactivationDate.getTime() : 0;

    const initReact = initialData?.reactivationDate ? new Date(initialData.reactivationDate).getTime() : 0;
    const currReact = formData.reactivationDate ? formData.reactivationDate.getTime() : 0;


    if (formData.name !== initName) return true;
    if (formData.department !== initDept) return true;
    if (formData.isActive !== initActive) return true;
    if (initDeact !== currDeact) return true;
    if (initReact !== currReact) return true;

    const currRoles = formData.roles.slice().sort();
    if (JSON.stringify(currRoles) !== JSON.stringify(initRoles)) return true;

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
              <Stack gap="md" h="calc(100vh - 140px)" justify="space-between">
                <Box style={{ flex: 1, overflowY: "auto", paddingRight: 4 }}>
                  <Stack>
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

                    <TagsInput
                      label="Rollen / Qualifikations-Level"
                      placeholder="Wähle Rollen oder erstelle neu"
                      data={roles.map(r => r.name)}
                      value={formData.roles}
                      onChange={(value) => setFormData({ ...formData, roles: value })}
                      splitChars={[',']}
                      clearable
                    />
                    {/* Deactivation Section */}
                    <Divider label="Status & Deaktivierung" labelPosition="center" mt="md" />

                    <Switch
                      label="Mitarbeiter ist aktiv"
                      labelPosition="left"
                      checked={formData.isActive}
                      onChange={(event) => {
                        const active = event.currentTarget.checked;
                        setFormData(prev => ({
                          ...prev,
                          isActive: active,
                          deactivationDate: active ? null : (!prev.deactivationDate ? new Date() : prev.deactivationDate)
                        }));
                      }}
                      size="md"
                      onLabel="JA"
                      offLabel="NEIN"
                      mb={formData.isActive && !formData.deactivationDate ? 0 : "md"}
                    />

                    {(!formData.isActive || (formData.deactivationDate && new Date(formData.deactivationDate) > new Date())) && (
                      <Group grow mt="xs">
                        <DatePickerInput
                          label="Deaktiviert ab"
                          placeholder="Datum wählen"
                          value={formData.deactivationDate}
                          onChange={(date) => {
                            const newDate = date as Date | null;
                            const isFuture = newDate && newDate > new Date();
                            setFormData(prev => ({
                              ...prev,
                              deactivationDate: newDate,
                              isActive: isFuture ? true : prev.isActive
                            }));
                          }}
                          clearable
                        />
                        <DatePickerInput
                          label="Wieder aktiv ab (optional)"
                          placeholder="Datum wählen"
                          description="z.B. bei Elternzeit oder Sabbatical"
                          value={formData.reactivationDate}
                          onChange={(date) => setFormData({ ...formData, reactivationDate: date as Date | null })}
                          clearable
                        />
                      </Group>
                    )}
                  </Stack>


                </Box>
                <Group justify="space-between" mt="md" pt="md" style={{ borderTop: '1px solid var(--mantine-color-default-border)' }}>
                  {onDelete && (
                    <Button variant="light" color="red" onClick={handleDelete} loading={loading}>
                      Löschen
                    </Button>
                  )}
                  <Group>
                    <Button variant="subtle" color="gray" onClick={handleCloseAttempt}>
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
          </Tabs >
        ) : (
          <Stack gap="md" h="calc(100vh - 100px)" justify="space-between">
            <Box style={{ flex: 1, overflowY: "auto", paddingRight: 4 }}>
              <Stack>
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

                <TagsInput
                  label="Rollen / Qualifikations-Level"
                  placeholder="Wähle Rollen oder erstelle neu"
                  data={roles.map(r => r.name)}
                  value={formData.roles}
                  onChange={(value) => setFormData({ ...formData, roles: value })}
                  splitChars={[',']}
                  clearable
                />
              </Stack>
            </Box>

            <Group justify="flex-end" mt="md" pt="md" style={{ borderTop: '1px solid var(--mantine-color-default-border)' }}>
              <Button variant="subtle" color="gray" onClick={handleCloseAttempt}>
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
      </Drawer >

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
