import React, { useState, useEffect } from "react";
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
} from "@mantine/core";
import { IconPlus, IconTrash, IconBuilding, IconEdit } from "@tabler/icons-react";
import { useDisclosure } from "@mantine/hooks";
import { useData } from "../../context/DataContext";
import { Department } from "../../services/indexeddb";

export const DepartmentManager: React.FC = () => {
    const { departments, addDepartment, deleteDepartment, updateDepartment } = useData();
    const [opened, { open, close }] = useDisclosure(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [name, setName] = useState("");
    const [loading, setLoading] = useState(false);

    const handleOpenAdd = () => {
        setEditingId(null);
        setName("");
        open();
    };

    const handleOpenEdit = (dept: Department) => {
        setEditingId(dept.id!);
        setName(dept.name);
        open();
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
                            <Table.Th style={{ width: 100, textAlign: "right" }}>
                                Aktionen
                            </Table.Th>
                        </Table.Tr>
                    </Table.Thead>
                    <Table.Tbody>
                        {departments.length > 0 ? (
                            departments.map((dept) => (
                                <Table.Tr key={dept.id}>
                                    <Table.Td>
                                        <Group gap="sm">
                                            <IconBuilding size={16} color="gray" />
                                            <Text size="sm" fw={500}>
                                                {dept.name}
                                            </Text>
                                        </Group>
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
                            ))
                        ) : (
                            <Table.Tr>
                                <Table.Td colSpan={2} style={{ textAlign: "center", py: "xl" }}>
                                    <Text c="dimmed">Keine Abteilungen angelegt</Text>
                                </Table.Td>
                            </Table.Tr>
                        )}
                    </Table.Tbody>
                </Table>
            </Card>

            <Drawer
                opened={opened}
                onClose={close}
                position="right"
                title={editingId ? "Abteilung bearbeiten" : "Neue Abteilung"}
                overlayProps={{ backgroundOpacity: 0.5, blur: 4 }}
            >
                <Stack>
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
                    <Group justify="flex-end" mt="md">
                        <Button variant="default" onClick={close}>
                            Abbrechen
                        </Button>
                        <Button onClick={handleSave} loading={loading}>
                            Speichern
                        </Button>
                    </Group>
                </Stack>
            </Drawer>
        </Stack>
    );
};
