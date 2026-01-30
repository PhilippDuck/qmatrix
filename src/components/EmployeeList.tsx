import React, { useState } from "react";
import {
  Table,
  Button,
  Group,
  ActionIcon,
  Title,
  Card,
  Text,
} from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { IconPlus, IconEdit, IconTrash, IconUser } from "@tabler/icons-react";
import { useData } from "../context/DataContext";
import { Employee } from "../services/indexeddb";
import { EmployeeDrawer } from "./shared/EmployeeDrawer";

export const EmployeeList: React.FC = () => {
  const { employees, addEmployee, updateEmployee, deleteEmployee } = useData();

  const [opened, { open, close }] = useDisclosure(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [initialData, setInitialData] = useState({ name: "", department: "" });

  const handleOpenNew = () => {
    setInitialData({ name: "", department: "" });
    setIsEditing(false);
    setEditingId(null);
    open();
  };

  const handleOpenEdit = (employee: Employee) => {
    setInitialData({ name: employee.name, department: employee.department || "" });
    setIsEditing(true);
    setEditingId(employee.id!);
    open();
  };

  const handleSave = async (name: string, department: string) => {
    if (isEditing && editingId) {
      await updateEmployee(editingId, { name, department });
    } else {
      await addEmployee({ name, department });
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

      <EmployeeDrawer
        opened={opened}
        onClose={close}
        onSave={handleSave}
        initialData={initialData}
        isEditing={isEditing}
      />
    </>
  );
};
