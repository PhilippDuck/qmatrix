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
    Select,
    Drawer,
    Tabs,
} from "@mantine/core";
import { IconPlus, IconTrash, IconBadge, IconArrowUpRight, IconEdit, IconList, IconHierarchy } from "@tabler/icons-react";
import { useDisclosure } from "@mantine/hooks";
import { useData } from "../../context/DataContext";
import { EmployeeRole } from "../../services/indexeddb";
import { RoleOrgChart } from "./RoleOrgChart";
import { RoleIconPicker, getIconByName } from "../shared/RoleIconPicker";


export const RoleManager: React.FC = () => {
    const { roles, skills, employees, categories, subcategories, addRole, updateRole, deleteRole } = useData();
    const [opened, { open, close }] = useDisclosure(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [name, setName] = useState("");
    const [inheritsFrom, setInheritsFrom] = useState<string | null>(null);
    const [icon, setIcon] = useState<string>("IconUser");
    const [loading, setLoading] = useState(false);

    const handleOpenAdd = () => {
        setEditingId(null);
        setName("");
        setInheritsFrom(null);
        setIcon("IconUser");
        open();
    };

    const handleOpenEdit = (role: EmployeeRole) => {
        setEditingId(role.id!);
        setName(role.name);
        setInheritsFrom(role.inheritsFromId || null);
        setIcon(role.icon || "IconUser");
        open();
    };

    const handleSave = async () => {
        if (!name.trim()) return;

        setLoading(true);
        try {
            const roleData = {
                name: name.trim(),
                inheritsFromId: inheritsFrom || undefined,
                icon: icon,
            };

            if (editingId) {
                await updateRole(editingId, roleData);
            } else {
                await addRole(roleData);
            }
            close();
            setName("");
            setInheritsFrom(null);
            setEditingId(null);
        } catch (error) {
            console.error("Failed to save role:", error);
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id: string, roleName: string) => {
        if (confirm(`Möchtest du die Rolle "${roleName}" wirklich löschen?`)) {
            try {
                await deleteRole(id);
            } catch (error) {
                console.error(error);
            }
        }
    };

    // Filter roles to prevent circular inheritance (simple check: exclude self if editing)
    const roleOptions = roles
        .filter((r) => !editingId || r.id !== editingId)
        .map((r) => ({ value: r.id!, label: r.name }));

    return (
        <Stack gap="lg" style={{ height: '100%' }}>
            <Group justify="space-between">
                <Title order={3}>Rollen & Qualifikations-Level verwalten</Title>
                <Button leftSection={<IconPlus size={16} />} onClick={handleOpenAdd}>
                    Rolle hinzufügen
                </Button>
            </Group>

            <Tabs defaultValue="list" style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                <Tabs.List mb="md">
                    <Tabs.Tab value="list" leftSection={<IconList size={16} />}>
                        Liste
                    </Tabs.Tab>
                    <Tabs.Tab value="chart" leftSection={<IconHierarchy size={16} />}>
                        Organigramm
                    </Tabs.Tab>
                </Tabs.List>

                <Tabs.Panel value="list" style={{ flex: 1 }}>
                    <Card withBorder radius="md" p={0} style={{ height: '100%', overflow: 'auto' }}>
                        <Table striped highlightOnHover stickyHeader>
                            <Table.Thead>
                                <Table.Tr>
                                    <Table.Th>Bezeichnung</Table.Th>
                                    <Table.Th>Erbt von</Table.Th>
                                    <Table.Th style={{ width: 100, textAlign: "right" }}>
                                        Aktionen
                                    </Table.Th>
                                </Table.Tr>
                            </Table.Thead>
                            <Table.Tbody>
                                {roles.length > 0 ? (
                                    roles.map((role) => {
                                        const parentRole = roles.find(
                                            (r) => r.id === role.inheritsFromId
                                        );
                                        return (
                                            <Table.Tr key={role.id}>
                                                <Table.Td>
                                                    {(() => {
                                                        const RoleIcon = getIconByName(role.icon);
                                                        return (
                                                            <Group gap="sm">
                                                                <RoleIcon size={16} color="gray" />
                                                                <Text size="sm" fw={500}>
                                                                    {role.name}
                                                                </Text>
                                                            </Group>
                                                        );
                                                    })()}
                                                </Table.Td>
                                                <Table.Td>
                                                    {parentRole ? (
                                                        <Group gap="xs">
                                                            <IconArrowUpRight size={14} color="gray" />
                                                            <Text size="sm" c="dimmed">
                                                                {parentRole.name}
                                                            </Text>
                                                        </Group>
                                                    ) : (
                                                        <Text size="sm" c="dimmed">
                                                            -
                                                        </Text>
                                                    )}
                                                </Table.Td>
                                                <Table.Td style={{ textAlign: "right" }}>
                                                    <Group gap={0} justify="flex-end">
                                                        <ActionIcon
                                                            variant="subtle"
                                                            color="blue"
                                                            onClick={() => handleOpenEdit(role)}
                                                        >
                                                            <IconEdit size={16} />
                                                        </ActionIcon>
                                                        <ActionIcon
                                                            color="red"
                                                            variant="subtle"
                                                            onClick={() => handleDelete(role.id!, role.name)}
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
                                            <Text c="dimmed">Keine Rollen angelegt</Text>
                                        </Table.Td>
                                    </Table.Tr>
                                )}
                            </Table.Tbody>
                        </Table>
                    </Card>
                </Tabs.Panel>

                <Tabs.Panel value="chart" style={{ flex: 1 }}>
                    <Card withBorder radius="md" p="md" style={{ height: '100%', overflow: 'auto' }}>
                        <RoleOrgChart
                            roles={roles}
                            skills={skills}
                            employees={employees}
                            categories={categories}
                            subcategories={subcategories}
                            onRoleClick={(role) => handleOpenEdit(role)}
                        />
                    </Card>
                </Tabs.Panel>
            </Tabs>

            <Drawer
                opened={opened}
                onClose={close}
                position="right"
                title={editingId ? "Rolle bearbeiten" : "Neue Rolle"}
                overlayProps={{ backgroundOpacity: 0.5, blur: 4 }}
            >
                <Stack>
                    <TextInput
                        label="Name"
                        placeholder="Bezeichnung der Rolle"
                        value={name}
                        onChange={(e) => setName(e.currentTarget.value)}
                        data-autofocus
                        required
                    />
                    <Select
                        label="Erbt von (Optional)"
                        placeholder="Keine Vererbung"
                        data={roleOptions}
                        value={inheritsFrom}
                        onChange={setInheritsFrom}
                        clearable
                        searchable
                        description="Wähle eine Rolle, von der alle Fähigkeiten geerbt werden sollen."
                    />
                    <Stack gap={4}>
                        <Text size="sm" fw={500}>Icon</Text>
                        <RoleIconPicker value={icon} onChange={setIcon} />
                    </Stack>
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
