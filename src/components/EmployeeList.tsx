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
  Container,
} from "@mantine/core";
import { IconPlus, IconEdit, IconTrash } from "@tabler/icons-react";
import { useData } from "../context/DataContext";
import { Employee } from "../services/indexeddb";

export const EmployeeList: React.FC = () => {
  const { employees, addEmployee, updateEmployee, deleteEmployee } = useData();
  const [showForm, setShowForm] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({ name: "", department: "" });

  const handleOpenNew = () => {
    setFormData({ name: "", department: "" });
    setIsEditing(false);
    setEditingId(null);
    setShowForm(true);
  };

  const handleOpenEdit = (employee: Employee) => {
    setFormData({ name: employee.name, department: employee.department || "" });
    setIsEditing(true);
    setEditingId(employee.id!);
    setShowForm(true);
  };

  const handleCancel = () => {
    setShowForm(false);
    setFormData({ name: "", department: "" });
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
      handleCancel();
    } catch (error) {
      console.error("Error saving employee:", error);
    }
  };

  const handleDelete = async (id: string) => {
    if (window.confirm("Mitarbeiter wirklich löschen?")) {
      try {
        await deleteEmployee(id);
      } catch (error) {
        console.error("Error deleting employee:", error);
      }
    }
  };

  const rows = employees.map((employee) => (
    <Table.Tr key={employee.id}>
      <Table.Td>{employee.name}</Table.Td>
      <Table.Td>{employee.department || "-"}</Table.Td>
      <Table.Td>
        <Group gap="xs">
          <ActionIcon
            size="sm"
            color="blue"
            variant="light"
            onClick={() => handleOpenEdit(employee)}
          >
            <IconEdit size={16} />
          </ActionIcon>
          <ActionIcon
            size="sm"
            color="red"
            variant="light"
            onClick={() => handleDelete(employee.id!)}
          >
            <IconTrash size={16} />
          </ActionIcon>
        </Group>
      </Table.Td>
    </Table.Tr>
  ));

  return (
    <>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "20px",
        }}
      >
        <Title order={2}>Mitarbeiter</Title>
        <Button leftSection={<IconPlus size={16} />} onClick={handleOpenNew}>
          Hinzufügen
        </Button>
      </div>

      {showForm && (
        <Card withBorder mb="lg" style={{ width: "100%" }}>
          <Stack gap="md">
            <Title order={4}>
              {isEditing ? "Mitarbeiter bearbeiten" : "Neuer Mitarbeiter"}
            </Title>
            <TextInput
              label="Name"
              placeholder="Name eingeben"
              value={formData.name}
              onChange={(e) =>
                setFormData({ ...formData, name: e.currentTarget.value })
              }
            />
            <TextInput
              label="Abteilung"
              placeholder="Abteilung eingeben (optional)"
              value={formData.department}
              onChange={(e) =>
                setFormData({ ...formData, department: e.currentTarget.value })
              }
            />
            <Group justify="flex-end">
              <Button variant="light" onClick={handleCancel}>
                Abbrechen
              </Button>
              <Button onClick={handleSave}>
                {isEditing ? "Aktualisieren" : "Erstellen"}
              </Button>
            </Group>
          </Stack>
        </Card>
      )}

      <Box withBorder style={{ width: "100%", overflowX: "auto" }}>
        <Table striped highlightOnHover style={{ width: "100%" }}>
          <Table.Thead>
            <Table.Tr>
              <Table.Th>Name</Table.Th>
              <Table.Th>Abteilung</Table.Th>
              <Table.Th style={{ width: 100 }}>Aktionen</Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>{rows}</Table.Tbody>
        </Table>
      </Box>
    </>
  );
};
