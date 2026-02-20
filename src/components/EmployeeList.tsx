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
import { useDisclosure, useHotkeys } from "@mantine/hooks";
import { modals } from "@mantine/modals";
import { IconPlus, IconEdit, IconTrash, IconUser, IconUserOff } from "@tabler/icons-react";
import { useStore } from "../store/useStore";
import { usePrivacy } from "../context/PrivacyContext";
import { Employee } from "../services/indexeddb";
import { EmployeeDrawer } from "./shared/EmployeeDrawer";

export const EmployeeList: React.FC = () => {
  const { employees, addEmployee, updateEmployee, deleteEmployee, roles, departments } = useStore();
  const { anonymizeName } = usePrivacy();

  const [opened, { open, close }] = useDisclosure(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [initialData, setInitialData] = useState({
    name: "",
    department: "",
    roles: [] as string[],
    isActive: true,
    deactivationDate: undefined as string | undefined,
    reactivationDate: undefined as string | undefined
  });
  const [filterRole, setFilterRole] = useState<string | null>(null);
  const [filterDepartment, setFilterDepartment] = useState<string | null>(null);

  const handleOpenNew = () => {
    setInitialData({
      name: "",
      department: "",
      roles: [],
      isActive: true,
      deactivationDate: undefined,
      reactivationDate: undefined
    });
    setIsEditing(false);
    setEditingId(null);
    open();
  };

  const handleOpenEdit = (employee: Employee) => {
    setInitialData({
      name: employee.name,
      department: employee.department || "",
      roles: employee.roles || [],
      isActive: employee.isActive !== undefined ? employee.isActive : true,
      deactivationDate: employee.deactivationDate,
      reactivationDate: employee.reactivationDate
    });
    setIsEditing(true);
    setEditingId(employee.id!);
    open();
  };

  useHotkeys([["alt+N", (event) => {
    event.preventDefault();
    handleOpenNew();
  }]], ['INPUT', 'TEXTAREA', 'SELECT']);

  const handleSave = async (name: string, department: string, roles: string[], isActive: boolean, deactivationDate?: Date | null | string, reactivationDate?: Date | null | string) => {
    const formatDate = (date: Date | null | string | undefined) => {
      if (!date) return undefined;
      if (typeof date === 'string') return date;
      if (date instanceof Date) return date.toISOString();
      return undefined;
    };

    // Force active if deactivation date is in the future
    let finalIsActive = isActive;
    if (deactivationDate) {
      const dDate = deactivationDate instanceof Date ? deactivationDate : new Date(deactivationDate);
      if (dDate > new Date()) {
        finalIsActive = true;
      }
    } else {
      // If no deactivation date, trust the isActive toggle
      finalIsActive = isActive;
    }

    const data = {
      name,
      department,
      roles,
      isActive: finalIsActive,
      deactivationDate: formatDate(deactivationDate),
      reactivationDate: formatDate(reactivationDate)
    };
    if (isEditing && editingId) {
      await updateEmployee(editingId, data);
    } else {
      await addEmployee(data);
    }
  };

  const handleDelete = async (id: string) => {
    modals.openConfirmModal({
      title: 'Mitarbeiter löschen',
      centered: true,
      children: (
        <Text size="sm">
          Mitarbeiter wirklich löschen?
        </Text>
      ),
      labels: { confirm: 'Löschen', cancel: 'Abbrechen' },
      confirmProps: { color: 'red' },
      onConfirm: async () => {
        try {
          await deleteEmployee(id);
        } catch (error) {
          console.error("Fehler beim Löschen:", error);
        }
      },
    });
  };

  const filteredEmployees = employees.filter((emp) => {
    if (filterRole && (!emp.roles || !emp.roles.includes(filterRole))) return false;
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
              <Table.Th>Rollen</Table.Th>
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

                      {employee.isActive === false ? (
                        <IconUserOff size={16} color="gray" />
                      ) : (
                        <IconUser size={16} color="gray" />
                      )}
                      <Text size="sm" fw={500} td={employee.isActive === false ? "line-through" : undefined} c={employee.isActive === false ? "dimmed" : undefined}>
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
                      c={employee.roles && employee.roles.length > 0 ? "inherit" : "dimmed"}
                    >
                      {employee.roles && employee.roles.length > 0 ? employee.roles.join(", ") : "-"}
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
