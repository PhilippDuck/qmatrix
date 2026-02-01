import React, { useState } from "react";
import {
  Table,
  Button,
  Group,
  ActionIcon,
  Title,
  Card,
  Text,
  Select,
} from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { IconPlus, IconEdit, IconTrash, IconUser } from "@tabler/icons-react";
import { useData } from "../context/DataContext";
import { usePrivacy } from "../context/PrivacyContext";
import { Employee } from "../services/indexeddb";
import { EmployeeDrawer } from "./shared/EmployeeDrawer";

export const EmployeeList: React.FC = () => {
  const { employees, addEmployee, updateEmployee, deleteEmployee, roles, departments } = useData();
  const { anonymizeName } = usePrivacy();

  const [opened, { open, close }] = useDisclosure(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [initialData, setInitialData] = useState({ name: "", department: "", role: "" });
  const [filterRole, setFilterRole] = useState<string | null>(null);
  const [filterDepartment, setFilterDepartment] = useState<string | null>(null);

  const handleOpenNew = () => {
    setInitialData({ name: "", department: "", role: "" });
    setIsEditing(false);
    setEditingId(null);
    open();
  };

  const handleOpenEdit = (employee: Employee) => {
    setInitialData({
      name: employee.name,
      department: employee.department || "",
      role: employee.role || ""
    });
    setIsEditing(true);
    setEditingId(employee.id!);
    open();
  };

  const handleSave = async (name: string, department: string, role: string) => {
    if (isEditing && editingId) {
      await updateEmployee(editingId, { name, department, role });
    } else {
      await addEmployee({ name, department, role });
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

  const filteredEmployees = employees.filter((emp) => {
    if (filterRole && emp.role !== filterRole) return false;
    if (filterDepartment && emp.department !== filterDepartment) return false;
    return true;
  });

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

      <Card withBorder padding="sm" mb="md" radius="md">
        <Group>
          <Select
            label="Filter nach Rolle"
            placeholder="Alle Rollen"
            data={roles.map(r => r.name)}
            value={filterRole}
            onChange={setFilterRole}
            clearable
            style={{ width: 250 }}
          />
          <Select
            label="Filter nach Abteilung"
            placeholder="Alle Abteilungen"
            data={departments.map(d => d.name)}
            value={filterDepartment}
            onChange={setFilterDepartment}
            clearable
            style={{ width: 250 }}
          />
        </Group>
      </Card>

      <Card withBorder padding={0} radius="md" shadow="sm">
        <Table striped highlightOnHover verticalSpacing="sm">
          <Table.Thead>
            <Table.Tr>
              <Table.Th style={{ paddingLeft: "20px" }}>Name</Table.Th>
              <Table.Th>Abteilung</Table.Th>
              <Table.Th>Rolle</Table.Th>
              <Table.Th
                style={{ width: 120, textAlign: "right", paddingRight: "20px" }}
              >
                Aktionen
              </Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {filteredEmployees.length > 0 ? (
              filteredEmployees.map((employee) => (
                <Table.Tr key={employee.id}>
                  <Table.Td style={{ paddingLeft: "20px" }}>
                    <Group gap="sm">
                      <IconUser size={16} color="gray" />
                      <Text size="sm" fw={500}>
                        {anonymizeName(employee.name, employee.id)}
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
                  <Table.Td>
                    <Text
                      size="sm"
                      c={employee.role ? "inherit" : "dimmed"}
                    >
                      {employee.role || "-"}
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
                <Table.Td colSpan={4} style={{ textAlign: "center", py: "xl" }}>
                  <Text c="dimmed">Keine Mitarbeiter gefunden</Text>
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
        employeeId={editingId}
      />
    </>
  );
};
