import React, { useState, useMemo } from "react";
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
    MultiSelect,
    Slider,
    Paper,
    Divider,
    ScrollArea,
    Badge,
    Modal,
    Box,
    Tooltip,
} from "@mantine/core";
import { IconPlus, IconTrash, IconBadge, IconArrowUpRight, IconEdit, IconList, IconHierarchy, IconX } from "@tabler/icons-react";
import { useDisclosure } from "@mantine/hooks";
import { useStore } from "../../store/useStore";
import { EmployeeRole } from "../../services/indexeddb";
import { RoleOrgChart } from "./RoleOrgChart";
import { RoleIconPicker, getIconByName } from "../shared/RoleIconPicker";
import { LEVELS } from "../../constants/skillLevels";

const sliderMarksWithTooltips = [0, 25, 50, 75, 100].map(val => {
    const lvl = LEVELS.find((l) => l.value === val);
    return {
        value: val,
        label: (
            <Tooltip
                label={
                    lvl ? (
                        <Stack gap={2}>
                            <Text size="xs" fw={700}>
                                {lvl.title}
                            </Text>
                            {lvl.description && <Text size="xs">{lvl.description}</Text>}
                        </Stack>
                    ) : (
                        `${val}%`
                    )
                }
                position="top"
                withArrow
                multiline
                w={200}
                withinPortal
                openDelay={200}
            >
                <div style={{ cursor: "help", padding: "4px", pointerEvents: "auto" }}>{val}</div>
            </Tooltip>
        )
    };
});

export const RoleManager: React.FC = () => {
    const { roles, skills, employees, categories, subcategories, addRole, updateRole, deleteRole, updateSkillsForRole } = useStore();
    const [opened, { open, close }] = useDisclosure(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [name, setName] = useState("");
    const [inheritsFrom, setInheritsFrom] = useState<string | null>(null);
    const [icon, setIcon] = useState<string>("IconUser");
    const [requiredSkills, setRequiredSkills] = useState<{ skillId: string; level: number }[]>([]);
    const [loading, setLoading] = useState(false);

    // Unsaved Changes
    const [confirmationOpen, setConfirmationOpen] = useState(false);
    const [initialRoleState, setInitialRoleState] = useState<{
        name: string;
        inheritsFrom: string | null;
        icon: string;
        requiredSkills: { skillId: string; level: number }[];
    } | null>(null);

    const handleOpenAdd = () => {
        setEditingId(null);
        setName("");
        setInheritsFrom(null);
        setIcon("IconUser");
        setRequiredSkills([]);
        setInitialRoleState({
            name: "",
            inheritsFrom: null,
            icon: "IconUser",
            requiredSkills: [],
        });
        open();
    };

    const handleOpenEdit = (role: EmployeeRole) => {
        setEditingId(role.id!);
        setName(role.name);
        setInheritsFrom(role.inheritsFromId || null);
        setIcon(role.icon || "IconUser");

        let initialSkills: { skillId: string; level: number }[] = [];
        // Load existing requiredSkills or migrate from legacy
        if (role.requiredSkills && role.requiredSkills.length > 0) {
            setRequiredSkills(role.requiredSkills);
            initialSkills = role.requiredSkills;
        } else {
            // Legacy Migration: Find skills strictly by 'requiredByRoleIds'
            const roleSkills = skills
                .filter(s => s.requiredByRoleIds?.includes(role.id!))
                .map(s => ({ skillId: s.id!, level: 75 })); // Default to 75 if migrating
            setRequiredSkills(roleSkills);
            initialSkills = roleSkills;
        }

        setInitialRoleState({
            name: role.name,
            inheritsFrom: role.inheritsFromId || null,
            icon: role.icon || "IconUser",
            requiredSkills: initialSkills.map(s => ({ ...s })), // deep copy
        });

        open();
    };

    const hasChanges = () => {
        if (!initialRoleState) return false;
        if (name !== initialRoleState.name) return true;
        if (inheritsFrom !== initialRoleState.inheritsFrom) return true;
        if (icon !== initialRoleState.icon) return true;

        if (JSON.stringify(requiredSkills.sort((a, b) => a.skillId.localeCompare(b.skillId))) !==
            JSON.stringify(initialRoleState.requiredSkills.sort((a, b) => a.skillId.localeCompare(b.skillId)))) {
            return true;
        }

        return false;
    };

    const handleCloseAttempt = () => {
        if (hasChanges()) {
            setConfirmationOpen(true);
        } else {
            close();
        }
    };

    // ... (rest of component handles) Use handleCloseAttempt instead of close

    const handleSave = async () => {
        if (!name.trim()) return;

        setLoading(true);
        try {
            const roleData = {
                name: name.trim(),
                inheritsFromId: inheritsFrom || undefined,
                icon: icon,
                requiredSkills: requiredSkills,
            };
            let roleId = editingId;

            if (editingId) {
                await updateRole(editingId, roleData);
            } else {
                roleId = await addRole(roleData);
            }

            // Update skill associations if we have a valid role ID
            // We now save skills directly on the role, so updateSkillsForRole is legacy/cleanup?
            // Actually updateSkillsForRole was doing the INVERSE update.
            // Since we moved to direct storage, we don't strictly need to update the skills requiredByRoleIds anymore,
            // UNLESS other parts of the app rely on it.
            // For safety: clean up the inverse relationship or update it to match.
            // For now, let's just assume the Role object is the source of truth.

            /* Legacy Sync (Optional - can be removed if we fully switch) */
            if (roleId) {
                await updateSkillsForRole(roleId, requiredSkills.map(s => s.skillId));
            }

            close();
            setName("");
            setInheritsFrom(null);
            setEditingId(null);
            setRequiredSkills([]);
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

    // Group skills by category for better selection
    // Group skills by category -> subcategory for better selection
    const skillOptions = useMemo(() => {
        const options: { group: string; items: { value: string; label: string }[] }[] = [];

        categories.forEach(cat => {
            const catSubs = subcategories.filter(sc => sc.categoryId === cat.id);

            catSubs.forEach(sub => {
                const subSkills = skills.filter(s => s.subCategoryId === sub.id);
                if (subSkills.length > 0) {
                    options.push({
                        group: `${cat.name} > ${sub.name}`,
                        items: subSkills.map(s => ({ value: s.id!, label: s.name }))
                    });
                }
            });
        });

        return options;
    }, [categories, subcategories, skills]);

    // Calculate inherited skills
    const inheritedSkills = useMemo(() => {
        const skillsMap = new Map<string, { skillId: string; level: number; sourceRoleName: string }>();
        if (!inheritsFrom) return [];

        let currentParentId = inheritsFrom;
        const visited = new Set<string>();

        while (currentParentId && !visited.has(currentParentId)) {
            visited.add(currentParentId);
            const role = roles.find(r => r.id === currentParentId);
            if (!role) break;

            if (role.requiredSkills) {
                role.requiredSkills.forEach(rs => {
                    // Only add if not already in the map (child values take precedence in the chain)
                    if (!skillsMap.has(rs.skillId)) {
                        skillsMap.set(rs.skillId, {
                            ...rs,
                            sourceRoleName: role.name
                        });
                    }
                });
            }
            currentParentId = role.inheritsFromId || "";
        }
        return Array.from(skillsMap.values());
    }, [inheritsFrom, roles]);

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
                                    <Table.Th>Skills</Table.Th>
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
                                        // Count skills either from new property or legacy
                                        const skillCount = role.requiredSkills?.length
                                            ?? skills.filter(s => s.requiredByRoleIds?.includes(role.id!)).length;

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
                                                <Table.Td>
                                                    <Text size="sm" c={skillCount > 0 ? undefined : "dimmed"}>
                                                        {skillCount} Skills zugeordnet
                                                    </Text>
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
                                        <Table.Td colSpan={4} style={{ textAlign: "center", py: "xl" }}>
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
                onClose={handleCloseAttempt}
                position="right"
                title={editingId ? "Rolle bearbeiten" : "Neue Rolle"}
                overlayProps={{ backgroundOpacity: 0.5, blur: 4 }}
                size="lg"
            >
                <Stack h="calc(100vh - 100px)" justify="space-between" gap="md">
                    <Box style={{ flex: 1, overflowY: "auto", paddingRight: 4 }}>
                        <Stack gap="md">
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

                            <Stack gap="xs">
                                <Text size="sm" fw={500}>Benötigte Skills & Level</Text>

                                <MultiSelect
                                    placeholder="Skills hinzufügen..."
                                    data={skillOptions}
                                    value={requiredSkills.map(s => s.skillId)}
                                    onChange={(ids) => {
                                        // Merging new selections
                                        setRequiredSkills(prev => {
                                            const currentMap = new Map(prev.map(p => [p.skillId, p.level]));
                                            return ids.map(id => ({
                                                skillId: id,
                                                level: currentMap.get(id) ?? 75 // Default 75
                                            }));
                                        });
                                    }}
                                    searchable
                                    clearable
                                    hidePickedOptions
                                    maxDropdownHeight={300}
                                    nothingFoundMessage="Keine Skills gefunden"
                                />

                                {/* Skill Value Editor List */}
                                {/* Skill Value Editor List */}
                                {requiredSkills.length > 0 || inheritedSkills.length > 0 ? (
                                    <Paper withBorder p="xs" bg="var(--mantine-color-default)">
                                        <Stack gap="xs">
                                            {/* Auto-scroll removed */}
                                            <Stack gap="sm" pb="xl">
                                                {/* DIRECT SKILLS */}
                                                {requiredSkills.length > 0 && (
                                                    <>
                                                        <Divider label="Direkt zugeordnete Skills" labelPosition="left" />
                                                        {requiredSkills.map((req) => {
                                                            const skill = skills.find(s => s.id === req.skillId);
                                                            const sub = subcategories.find(sc => sc.id === skill?.subCategoryId);
                                                            const cat = categories.find(c => c.id === sub?.categoryId);
                                                            const breadcrumb = `${cat?.name || '?'} > ${sub?.name || '?'}`;
                                                            const isOverride = inheritedSkills.some(is => is.skillId === req.skillId);

                                                            return (
                                                                <div key={req.skillId}>
                                                                    <Text size="xs" c="dimmed" mb={2}>{breadcrumb}</Text>
                                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                                                        <Group gap="xs" style={{ width: '150px' }} wrap="nowrap">
                                                                            <Text size="sm" truncate style={{ flexShrink: 1 }}>{skill?.name || "Unknown"}</Text>
                                                                            {isOverride && (
                                                                                <Badge size="xs" color="orange" variant="light" style={{ flexShrink: 0 }}>Überschreibt</Badge>
                                                                            )}
                                                                        </Group>
                                                                        <Slider
                                                                            style={{ flex: 1 }}
                                                                            min={0}
                                                                            max={100}
                                                                            step={25}
                                                                            color={LEVELS.find(l => l.value === req.level)?.color || "gray"}
                                                                            marks={sliderMarksWithTooltips}
                                                                            value={req.level}
                                                                            onChange={(val) => {
                                                                                setRequiredSkills(prev => prev.map(p => p.skillId === req.skillId ? { ...p, level: val } : p));
                                                                            }}
                                                                            label={null}
                                                                        />
                                                                        <ActionIcon
                                                                            color="red" variant="subtle" size="sm"
                                                                            onClick={() => setRequiredSkills(prev => prev.filter(p => p.skillId !== req.skillId))}
                                                                        >
                                                                            <IconX size={16} />
                                                                        </ActionIcon>
                                                                    </div>
                                                                </div>
                                                            );
                                                        })}
                                                    </>
                                                )}

                                                {/* INHERITED SKILLS */}
                                                {inheritedSkills.length > 0 && (
                                                    <>
                                                        <Divider
                                                            label={
                                                                <Group gap="xs">
                                                                    <IconArrowUpRight size={14} />
                                                                    <Text size="xs">Geerbte Skills (über Vererbung)</Text>
                                                                </Group>
                                                            }
                                                            labelPosition="left"
                                                            mt="md"
                                                        // ... continuing same logic
                                                        />
                                                        {inheritedSkills
                                                            .filter(is => !requiredSkills.some(rs => rs.skillId === is.skillId))
                                                            .map((req) => {
                                                                const skill = skills.find(s => s.id === req.skillId);
                                                                const sub = subcategories.find(sc => sc.id === skill?.subCategoryId);
                                                                const cat = categories.find(c => c.id === sub?.categoryId);
                                                                const breadcrumb = `${cat?.name || '?'} > ${sub?.name || '?'}`;

                                                                return (
                                                                    <div key={req.skillId} style={{ opacity: 0.8 }}>
                                                                        <Group justify="space-between" mb={2}>
                                                                            <Text size="xs" c="dimmed">{breadcrumb} • Geerbt von {req.sourceRoleName}</Text>
                                                                        </Group>
                                                                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                                                            <Text size="sm" style={{ width: '150px' }} truncate>{skill?.name || "Unknown"}</Text>
                                                                            <Slider
                                                                                style={{ flex: 1 }}
                                                                                min={0}
                                                                                max={100}
                                                                                step={25}
                                                                                color="gray"
                                                                                marks={sliderMarksWithTooltips}
                                                                                value={req.level}
                                                                                onChange={(val) => {
                                                                                    // Adding or updating in direct skills as an override
                                                                                    setRequiredSkills(prev => {
                                                                                        const existingIdx = prev.findIndex(p => p.skillId === req.skillId);
                                                                                        if (existingIdx >= 0) {
                                                                                            return prev.map((p, idx) => idx === existingIdx ? { ...p, level: val } : p);
                                                                                        } else {
                                                                                            return [...prev, { skillId: req.skillId, level: val }];
                                                                                        }
                                                                                    });
                                                                                }}
                                                                                label={null}
                                                                            />
                                                                            <div style={{ width: 28 }} /> {/* Spacer for symmetry */}
                                                                        </div>
                                                                    </div>
                                                                );
                                                            })}
                                                    </>
                                                )}
                                            </Stack>
                                            {/* Auto-scroll removed */}
                                        </Stack>
                                    </Paper>
                                ) : (
                                    <Text size="xs" c="dimmed" fs="italic">
                                        Wähle oben Skills aus oder nutze die Vererbung, um Soll-Level zu definieren.
                                    </Text>
                                )}
                            </Stack>

                            <Stack gap={4}>
                                <Text size="sm" fw={500}>Icon</Text>
                                <RoleIconPicker value={icon} onChange={setIcon} />
                            </Stack>
                        </Stack>
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
