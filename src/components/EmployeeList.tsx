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
  Box,
  Drawer,
  Text,
  Divider,
  Container,
} from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { IconPlus, IconEdit, IconTrash, IconUser } from "@tabler/icons-react";
import { useData } from "../context/DataContext";
import { Employee } from "../services/indexeddb";

export const EmployeeList: React.FC = () => {
  const { employees, addEmployee, updateEmployee, deleteEmployee } = useData();

  // Drawer Steuerung
  const [opened, { open, close }] = useDisclosure(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({ name: "", department: "" });

  const handleOpenNew = () => {
    setFormData({ name: "", department: "" });
    setIsEditing(false);
    setEditingId(null);
    open();
  };

  const handleOpenEdit = (employee: Employee) => {
    setFormData({ name: employee.name, department: employee.department || "" });
    setIsEditing(true);
    setEditingId(employee.id!);
    open();
  };

  const handleSave = async () => {
    if (!formData.name.trim()) return;

    try {
      if (isEditing && editingId) {
        await updateEmployee(editingId, {
          name: formData.name,
          department: formData.department,
        });
      } else {
        await addEmployee({
          name: formData.name,
          department: formData.department,
        });
      }
      close();
    } catch (error) {
      console.error("Fehler beim Speichern:", error);
    }
  };

  const handleDelete = async (id: string) => {
    if (window.confirm("Mitarbeiter wirklich löschen?")) {
      try {
        await deleteEmployee(id);
      } catch (error) {
        console.error("Fehler beim Löschen:", error);
      }
    }
  };

  return (
    <>
      <Group justify="space-between" mb="lg">
        <Title order={2}>Mitarbeiterverwaltung</Title>
        <Button
          leftSection={<IconPlus size={18} />}
          onClick={handleOpenNew}
          variant="filled"
        >
          Mitarbeiter hinzufügen
        </Button>
      </Group>

      <Card withBorder padding={0} radius="md" shadow="sm">
        <Table striped highlightOnHover verticalSpacing="sm">
          <Table.Thead>
            <Table.Tr>
              <Table.Th style={{ paddingLeft: "20px" }}>Name</Table.Th>
              <Table.Th>Abteilung</Table.Th>
              <Table.Th
                style={{ width: 120, textAlign: "right", paddingRight: "20px" }}
              >
                Aktionen
              </Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {employees.length > 0 ? (
              employees.map((employee) => (
                <Table.Tr key={employee.id}>
                  <Table.Td style={{ paddingLeft: "20px" }}>
                    <Group gap="sm">
                      <IconUser size={16} color="gray" />
                      <Text size="sm" fw={500}>
                        {employee.name}
                      </Text>
                    </Group>
                  </Table.Td>
                  <Table.Td>
                    <Text
                      size="sm"
                      c={employee.department ? "inherit" : "dimmed"}
                    >
                      {employee.department || "Keine Abteilung"}
                    </Text>
                  </Table.Td>
                  <Table.Td style={{ paddingRight: "20px" }}>
                    <Group gap="xs" justify="flex-end">
                      <ActionIcon
                        size="md"
                        color="blue"
                        variant="subtle"
                        onClick={() => handleOpenEdit(employee)}
                      >
                        <IconEdit size={18} />
                      </ActionIcon>
                      <ActionIcon
                        size="md"
                        color="red"
                        variant="subtle"
                        onClick={() => handleDelete(employee.id!)}
                      >
                        <IconTrash size={18} />
                      </ActionIcon>
                    </Group>
                  </Table.Td>
                </Table.Tr>
              ))
            ) : (
              <Table.Tr>
                <Table.Td colSpan={3} style={{ textAlign: "center", py: "xl" }}>
                  <Text c="dimmed">Noch keine Mitarbeiter angelegt</Text>
                </Table.Td>
              </Table.Tr>
            )}
          </Table.Tbody>
        </Table>
      </Card>

      {/* Mitarbeiter Drawer */}
      <Drawer
        opened={opened}
        onClose={close}
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
            onKeyDown={(e) => e.key === "Enter" && handleSave()}
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
            onKeyDown={(e) => e.key === "Enter" && handleSave()}
          />

          <Group justify="flex-end" mt="xl">
            <Button variant="subtle" color="gray" onClick={close}>
              Abbrechen
            </Button>
            <Button onClick={handleSave} leftSection={<IconPlus size={16} />}>
              {isEditing ? "Aktualisieren" : "Mitarbeiter anlegen"}
            </Button>
          </Group>
        </Stack>
      </Drawer>
    </>
  );
};
