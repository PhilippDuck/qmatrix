import React, { useState } from "react";
import {
    Title,
    Button,
    Group,
    TextInput,
    Table,
    ActionIcon,
    Card,
    Stack,
    Text,
    Drawer,
    Avatar,
    Tooltip,
    Modal,
    Box,
} from "@mantine/core";
import { IconPlus, IconTrash, IconBuilding, IconEdit } from "@tabler/icons-react";
import { useDisclosure } from "@mantine/hooks";
import { useStore } from "../../store/useStore";
import { usePrivacy } from "../../context/PrivacyContext";
import { Department } from "../../services/indexeddb";

export const DepartmentManager: React.FC = () => {
    const { departments, employees, addDepartment, deleteDepartment, updateDepartment } = useStore();
    const { anonymizeName, anonymizeInitials } = usePrivacy();
    const [opened, { open, close }] = useDisclosure(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [name, setName] = useState("");
    const [loading, setLoading] = useState(false);

    // Unsaved Changes
    const [confirmationOpen, setConfirmationOpen] = useState(false);
    const [initialName, setInitialName] = useState("");

    const handleOpenAdd = () => {
        setEditingId(null);
        setName("");
        setInitialName("");
        open();
    };

    const handleOpenEdit = (dept: Department) => {
        setEditingId(dept.id!);
        setName(dept.name);
        setInitialName(dept.name);
        open();
    };

    const hasChanges = () => {
        return name !== initialName;
    };

    const handleCloseAttempt = () => {
        if (hasChanges()) {
            setConfirmationOpen(true);
        } else {
            close();
        }
    };

    const handleSave = async () => {
        if (!name.trim()) return;

        setLoading(true);
        try {
            if (editingId) {
                await updateDepartment(editingId, { name: name.trim() });
            } else {
                await addDepartment(name.trim());
            }
            close();
            setName("");
            setEditingId(null);
        } catch (error) {
            console.error("Failed to save department:", error);
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id: string, deptName: string) => {
        if (confirm(`Möchtest du die Abteilung "${deptName}" wirklich löschen?`)) {
            try {
                await deleteDepartment(id);
            } catch (error) {
                console.error(error);
            }
        }
    };

    return (
        <Stack gap="lg" style={{ height: '100%' }}>
            <Group justify="space-between">
                <Title order={3}>Abteilungen verwalten</Title>
                <Button leftSection={<IconPlus size={16} />} onClick={handleOpenAdd}>
                    Abteilung hinzufügen
                </Button>
            </Group>

            <Card withBorder radius="md" p={0} style={{ flex: 1, overflow: 'auto' }}>
                <Table striped highlightOnHover stickyHeader>
                    <Table.Thead>
                        <Table.Tr>
                            <Table.Th>Name</Table.Th>
                            <Table.Th>Mitarbeiter</Table.Th>
                            <Table.Th style={{ width: 100, textAlign: "right" }}>
                                Aktionen
                            </Table.Th>
                        </Table.Tr>
                    </Table.Thead>
                    <Table.Tbody>
                        {departments.length > 0 ? (
                            departments.map((dept) => {
                                const deptEmployees = employees.filter(e => e.department === dept.name);

                                return (
                                    <Table.Tr key={dept.id}>
                                        <Table.Td>
                                            <Group gap="sm">
                                                <IconBuilding size={16} color="gray" />
                                                <Text size="sm" fw={500}>
                                                    {dept.name}
                                                </Text>
                                            </Group>
                                        </Table.Td>
                                        <Table.Td>
                                            {deptEmployees.length > 0 ? (
                                                <Group gap="xs">
                                                    <Avatar.Group spacing="sm">
                                                        {deptEmployees.slice(0, 5).map((emp) => (
                                                            <Tooltip key={emp.id} label={anonymizeName(emp.name, emp.id)} withArrow>
                                                                <Avatar size="sm" radius="xl" color="blue">
                                                                    {anonymizeInitials(emp.name, emp.id)}
                                                                </Avatar>
                                                            </Tooltip>
                                                        ))}
                                                        {deptEmployees.length > 5 && (
                                                            <Avatar size="sm" radius="xl" color="gray">
                                                                +{deptEmployees.length - 5}
                                                            </Avatar>
                                                        )}
                                                    </Avatar.Group>
                                                    <Text size="xs" c="dimmed">
                                                        ({deptEmployees.length})
                                                    </Text>
                                                </Group>
                                            ) : (
                                                <Text size="sm" c="dimmed" fs="italic">
                                                    Keine Mitarbeiter
                                                </Text>
                                            )}
                                        </Table.Td>
                                        <Table.Td style={{ textAlign: "right" }}>
                                            <Group gap={0} justify="flex-end">
                                                <ActionIcon
                                                    variant="subtle"
                                                    color="blue"
                                                    onClick={() => handleOpenEdit(dept)}
                                                >
                                                    <IconEdit size={16} />
                                                </ActionIcon>
                                                <ActionIcon
                                                    color="red"
                                                    variant="subtle"
                                                    onClick={() => handleDelete(dept.id!, dept.name)}
                                                >
                                                    <IconTrash size={16} />
                                                </ActionIcon>
                                            </Group>
                                        </Table.Td>
                                    </Table.Tr>
                                );
                            })
                        ) : (
                            <Table.Tr>
                                <Table.Td colSpan={3} style={{ textAlign: "center", py: "xl" }}>
                                    <Text c="dimmed">Keine Abteilungen angelegt</Text>
                                </Table.Td>
                            </Table.Tr>
                        )}
                    </Table.Tbody>
                </Table>
            </Card>

            <Drawer
                opened={opened}
                onClose={handleCloseAttempt}
                position="right"
                title={editingId ? "Abteilung bearbeiten" : "Neue Abteilung"}
                overlayProps={{ backgroundOpacity: 0.5, blur: 4 }}
            >
                <Stack h="calc(100vh - 100px)" justify="space-between" gap="md">
                    <Box style={{ flex: 1, overflowY: 'auto', paddingRight: 4 }}>
                        <TextInput
                            label="Name"
                            placeholder="Name der Abteilung"
                            value={name}
                            onChange={(e) => setName(e.currentTarget.value)}
                            data-autofocus
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') handleSave();
                            }}
                        />
                    </Box>
                    <Group justify="space-between" mt="md" pt="md" style={{ borderTop: '1px solid var(--mantine-color-default-border)' }}>
                        {editingId ? (
                            <Button
                                color="red"
                                variant="light"
                                onClick={() => {
                                    handleDelete(editingId, name);
                                    close();
                                }}
                            >
                                Löschen
                            </Button>
                        ) : (
                            <div />
                        )}
                        <Group>
                            <Button variant="default" onClick={handleCloseAttempt}>
                                Abbrechen
                            </Button>
                            <Button onClick={handleSave} loading={loading}>
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
                        close();
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
        </Stack>
    );
};
