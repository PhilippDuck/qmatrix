import React, { useState, useMemo, useEffect } from "react";
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
    Textarea,
    ThemeIcon,
    Accordion,
} from "@mantine/core";
import { IconPlus, IconTrash, IconBadge, IconArrowUpRight, IconEdit, IconList, IconHierarchy, IconX, IconEye } from "@tabler/icons-react";
import { useDisclosure } from "@mantine/hooks";
import { useStore } from "../../store/useStore";
import { EmployeeRole } from "../../services/indexeddb";
import { RoleOrgChart } from "./RoleOrgChart";
import { RoleIconPicker, getIconByName } from "../shared/RoleIconPicker";
import { RoleDetailDrawer } from "../shared/RoleDetailDrawer";
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

interface RoleManagerProps {
    initialEditRoleId?: string;
    onClearParams?: () => void;
}

export const RoleManager: React.FC<RoleManagerProps> = ({ initialEditRoleId, onClearParams }) => {
    const { roles, skills, employees, categories, subcategories, addRole, updateRole, deleteRole, updateSkillsForRole } = useStore();
    const [opened, { open, close }] = useDisclosure(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [name, setName] = useState("");
    const [description, setDescription] = useState("");
    const [inheritsFrom, setInheritsFrom] = useState<string | null>(null);
    const [icon, setIcon] = useState<string>("IconUser");
    const [requiredSkills, setRequiredSkills] = useState<{ skillId: string; level: number }[]>([]);
    const [loading, setLoading] = useState(false);

    // Detail view
    const [detailRoleId, setDetailRoleId] = useState<string | null>(null);

    // Auto-open edit drawer from external navigation
    useEffect(() => {
        if (initialEditRoleId && roles.length > 0) {
            const role = roles.find(r => r.id === initialEditRoleId);
            if (role) {
                handleOpenEdit(role);
                onClearParams?.();
            }
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [initialEditRoleId, roles]);

    // Unsaved Changes
    const [confirmationOpen, setConfirmationOpen] = useState(false);
    const [initialRoleState, setInitialRoleState] = useState<{
        name: string;
        description: string;
        inheritsFrom: string | null;
        icon: string;
        requiredSkills: { skillId: string; level: number }[];
    } | null>(null);

    const handleOpenAdd = () => {
        setEditingId(null);
        setName("");
        setDescription("");
        setInheritsFrom(null);
        setIcon("IconUser");
        setRequiredSkills([]);
        setInitialRoleState({
            name: "",
            description: "",
            inheritsFrom: null,
            icon: "IconUser",
            requiredSkills: [],
        });
        open();
    };

    const handleOpenEdit = (role: EmployeeRole) => {
        setEditingId(role.id!);
        setName(role.name);
        setDescription(role.description || "");
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
            description: role.description || "",
            inheritsFrom: role.inheritsFromId || null,
            icon: role.icon || "IconUser",
            requiredSkills: initialSkills.map(s => ({ ...s })), // deep copy
        });

        open();
    };

    const hasChanges = () => {
        if (!initialRoleState) return false;
        if (name !== initialRoleState.name) return true;
        if (description !== initialRoleState.description) return true;
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

    const handleSave = async () => {
        if (!name.trim()) return;

        setLoading(true);
        try {
            const roleData = {
                name: name.trim(),
                description: description.trim(),
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

            // Legacy Sync (Optional - can be removed if we fully switch)
            if (roleId) {
                await updateSkillsForRole(roleId, requiredSkills.map(s => s.skillId));
            }

            close();
            setName("");
            setDescription("");
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

    // Grouped + sorted role list for the table view (tree by inheritance)
    const groupedRoles = useMemo(() => {
        const roots = roles
            .filter(r => !r.inheritsFromId || !roles.some(p => p.id === r.inheritsFromId))
            .sort((a, b) => a.name.localeCompare(b.name, "de"));

        const result: { role: EmployeeRole; depth: number; isLastInFamily: boolean }[] = [];

        const addWithChildren = (role: EmployeeRole, depth: number) => {
            const children = roles
                .filter(r => r.inheritsFromId === role.id)
                .sort((a, b) => a.name.localeCompare(b.name, "de"));
            result.push({ role, depth, isLastInFamily: children.length === 0 && depth === 0 });
            children.forEach(child => addWithChildren(child, depth + 1));
        };

        roots.forEach(root => addWithChildren(root, 0));

        // Orphans (parent referenced but missing)
        const placed = new Set(result.map(r => r.role.id));
        roles
            .filter(r => !placed.has(r.id))
            .sort((a, b) => a.name.localeCompare(b.name, "de"))
            .forEach(r => result.push({ role: r, depth: 0, isLastInFamily: true }));

        return result;
    }, [roles]);

    // Filter roles to prevent circular inheritance (simple check: exclude self if editing)
    const roleOptions = roles
        .filter((r) => !editingId || r.id !== editingId)
        .map((r) => ({ value: r.id!, label: r.name }));

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
                                    <Table.Th>Beschreibung</Table.Th>
                                    <Table.Th>Erbt von</Table.Th>
                                    <Table.Th>Skills</Table.Th>
                                    <Table.Th>Mitarbeiter</Table.Th>
                                    <Table.Th style={{ width: 100, textAlign: "right" }}>
                                        Aktionen
                                    </Table.Th>
                                </Table.Tr>
                            </Table.Thead>
                            <Table.Tbody>
                                {groupedRoles.length > 0 ? (() => {
                                    return groupedRoles.map(({ role, depth }, rowIdx) => {
                                        const isRoot = depth === 0;
                                        const needsSeparator = isRoot && rowIdx > 0;

                                        const parentRole = roles.find(r => r.id === role.inheritsFromId);
                                        const skillCount = role.requiredSkills?.length
                                            ?? skills.filter(s => s.requiredByRoleIds?.includes(role.id!)).length;
                                        const RoleIcon = getIconByName(role.icon);
                                        const empCount = employees.filter(e =>
                                            e.roles?.some((r: string) => r === role.name || r === role.id)
                                        ).length;

                                        return (
                                            <Table.Tr
                                                key={role.id}
                                                style={needsSeparator ? { borderTop: '2px solid var(--mantine-color-default-border)' } : undefined}
                                            >
                                                <Table.Td>
                                                    <Group gap="sm" wrap="nowrap" style={{ paddingLeft: depth * 20 }}>
                                                        {depth > 0 && (
                                                            <Text size="xs" c="dimmed" style={{ flexShrink: 0 }}>↳</Text>
                                                        )}
                                                        <RoleIcon size={16} color={isRoot ? "var(--mantine-color-blue-6)" : "gray"} />
                                                        <Text size="sm" fw={isRoot ? 600 : 400}>
                                                            {role.name}
                                                        </Text>
                                                        {isRoot && roles.some(r => r.inheritsFromId === role.id) && (
                                                            <Badge size="xs" variant="light" color="blue">
                                                                {roles.filter(r => r.inheritsFromId === role.id).length} Unterrollen
                                                            </Badge>
                                                        )}
                                                    </Group>
                                                </Table.Td>
                                                <Table.Td>
                                                    {role.description ? (
                                                        <Tooltip label={role.description} multiline w={300} position="top" withArrow>
                                                            <Text size="sm" c="dimmed" truncate style={{ maxWidth: 200 }}>
                                                                {role.description}
                                                            </Text>
                                                        </Tooltip>
                                                    ) : (
                                                        <Text size="sm" c="dimmed">-</Text>
                                                    )}
                                                </Table.Td>
                                                <Table.Td>
                                                    {parentRole ? (
                                                        <Group gap="xs">
                                                            <IconArrowUpRight size={14} color="gray" />
                                                            <Text size="sm" c="dimmed">{parentRole.name}</Text>
                                                        </Group>
                                                    ) : (
                                                        <Text size="sm" c="dimmed">-</Text>
                                                    )}
                                                </Table.Td>
                                                <Table.Td>
                                                    <Text size="sm" c={skillCount > 0 ? undefined : "dimmed"}>
                                                        {skillCount} Skills zugeordnet
                                                    </Text>
                                                </Table.Td>
                                                <Table.Td>
                                                    <Tooltip
                                                        label={empCount === 0 ? "Keine Mitarbeiter zugewiesen" : `${empCount} Mitarbeiter mit dieser Rolle`}
                                                        withArrow
                                                        position="top"
                                                    >
                                                        <Badge
                                                            size="sm"
                                                            variant={empCount > 0 ? "light" : "outline"}
                                                            color={empCount > 0 ? "blue" : "gray"}
                                                            style={{ cursor: 'help' }}
                                                        >
                                                            {empCount}
                                                        </Badge>
                                                    </Tooltip>
                                                </Table.Td>
                                                <Table.Td style={{ textAlign: "right" }}>
                                                    <Group gap={0} justify="flex-end" wrap="nowrap">
                                                        <Tooltip label="Details anzeigen" withArrow position="top">
                                                            <ActionIcon variant="subtle" color="gray" onClick={() => setDetailRoleId(role.id!)}>
                                                                <IconEye size={16} />
                                                            </ActionIcon>
                                                        </Tooltip>
                                                        <Tooltip label="Bearbeiten" withArrow position="top">
                                                            <ActionIcon variant="subtle" color="blue" onClick={() => handleOpenEdit(role)}>
                                                                <IconEdit size={16} />
                                                            </ActionIcon>
                                                        </Tooltip>
                                                        <Tooltip label="Löschen" withArrow position="top">
                                                            <ActionIcon color="red" variant="subtle" onClick={() => handleDelete(role.id!, role.name)}>
                                                                <IconTrash size={16} />
                                                            </ActionIcon>
                                                        </Tooltip>
                                                    </Group>
                                                </Table.Td>
                                            </Table.Tr>
                                        );
                                    });
                                })() : (
                                    <Table.Tr>
                                        <Table.Td colSpan={6} style={{ textAlign: "center", py: "xl" }}>
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
                            <Textarea
                                label="Beschreibung"
                                placeholder="Zusätzliche Informationen zur Rolle"
                                value={description}
                                onChange={(e) => setDescription(e.currentTarget.value)}
                                minRows={3}
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

                                {(() => {
                                    type EditSkillEntry = {
                                        skillId: string;
                                        level: number;
                                        isDirect: boolean;
                                        isInheritedOnly: boolean;
                                        isOverride: boolean;
                                        sourceRoleName?: string;
                                        catId: string;
                                        catName: string;
                                        subId: string;
                                        subName: string;
                                    };

                                    const directEntries: EditSkillEntry[] = requiredSkills.map(req => {
                                        const skill = skills.find(s => s.id === req.skillId);
                                        const sub = subcategories.find(sc => sc.id === skill?.subCategoryId);
                                        const cat = categories.find(c => c.id === sub?.categoryId);
                                        return {
                                            skillId: req.skillId,
                                            level: req.level,
                                            isDirect: true,
                                            isInheritedOnly: false,
                                            isOverride: inheritedSkills.some(is => is.skillId === req.skillId),
                                            catId: cat?.id ?? "_",
                                            catName: cat?.name ?? "?",
                                            subId: sub?.id ?? "_",
                                            subName: sub?.name ?? "?",
                                        };
                                    });

                                    const inheritedOnlyEntries: EditSkillEntry[] = inheritedSkills
                                        .filter(is => !requiredSkills.some(rs => rs.skillId === is.skillId))
                                        .map(req => {
                                            const skill = skills.find(s => s.id === req.skillId);
                                            const sub = subcategories.find(sc => sc.id === skill?.subCategoryId);
                                            const cat = categories.find(c => c.id === sub?.categoryId);
                                            return {
                                                skillId: req.skillId,
                                                level: req.level,
                                                isDirect: false,
                                                isInheritedOnly: true,
                                                isOverride: false,
                                                sourceRoleName: req.sourceRoleName,
                                                catId: cat?.id ?? "_",
                                                catName: cat?.name ?? "?",
                                                subId: sub?.id ?? "_",
                                                subName: sub?.name ?? "?",
                                            };
                                        });

                                    const all = [...directEntries, ...inheritedOnlyEntries];

                                    if (all.length === 0) {
                                        return (
                                            <Text size="xs" c="dimmed" fs="italic">
                                                Wähle oben Skills aus oder nutze die Vererbung, um Soll-Level zu definieren.
                                            </Text>
                                        );
                                    }

                                    const catOrder = categories.map(c => c.id!);
                                    const subOrder = subcategories.map(s => s.id!);

                                    const grouped = new Map<string, { catName: string; subs: Map<string, { subName: string; items: EditSkillEntry[] }> }>();
                                    all.forEach(item => {
                                        if (!grouped.has(item.catId)) grouped.set(item.catId, { catName: item.catName, subs: new Map() });
                                        const catGroup = grouped.get(item.catId)!;
                                        if (!catGroup.subs.has(item.subId)) catGroup.subs.set(item.subId, { subName: item.subName, items: [] });
                                        catGroup.subs.get(item.subId)!.items.push(item);
                                    });

                                    const sortedCats = [...grouped.entries()].sort((a, b) => catOrder.indexOf(a[0]) - catOrder.indexOf(b[0]));

                                    return (
                                        <Accordion multiple variant="separated" radius="sm">
                                            {sortedCats.map(([catId, catGroup]) => {
                                                const cat = categories.find(c => c.id === catId);
                                                const sortedSubs = [...catGroup.subs.entries()].sort((a, b) => subOrder.indexOf(a[0]) - subOrder.indexOf(b[0]));
                                                const totalCount = sortedSubs.reduce((acc, [, sg]) => acc + sg.items.length, 0);
                                                return (
                                                    <Accordion.Item key={catId} value={catId}>
                                                        <Accordion.Control>
                                                            <Group gap="sm">
                                                                <Tooltip label={cat?.description} disabled={!cat?.description} withArrow multiline w={240} position="right">
                                                                    <Text size="sm" fw={600} style={{ cursor: cat?.description ? 'help' : 'default' }}>{catGroup.catName}</Text>
                                                                </Tooltip>
                                                                <Badge size="xs" variant="light" color="gray">{totalCount}</Badge>
                                                            </Group>
                                                        </Accordion.Control>
                                                        <Accordion.Panel p={0}>
                                                            <Stack gap={0}>
                                                                {sortedSubs.map(([subId, subGroup], subIdx) => {
                                                                    const sub = subcategories.find(s => s.id === subId);
                                                                    return (
                                                                    <Box key={subId}>
                                                                        {subIdx > 0 && <Divider />}
                                                                        <Box px="xs" py={5} bg="var(--mantine-color-default-hover)">
                                                                            <Tooltip label={sub?.description} disabled={!sub?.description} withArrow multiline w={240} position="right">
                                                                                <Text size="xs" c="dimmed" fw={500} style={{ cursor: sub?.description ? 'help' : 'default' }}>{subGroup.subName}</Text>
                                                                            </Tooltip>
                                                                        </Box>
                                                                        <Stack gap={0}>
                                                                            {subGroup.items.map((item, itemIdx) => {
                                                                                const skill = skills.find(s => s.id === item.skillId);
                                                                                const currentLevel = item.isDirect
                                                                                    ? (requiredSkills.find(r => r.skillId === item.skillId)?.level ?? item.level)
                                                                                    : item.level;
                                                                                return (
                                                                                    <Box
                                                                                        key={item.skillId}
                                                                                        px="xs"
                                                                                        style={{
                                                                                            paddingTop: 8,
                                                                                            paddingBottom: 28,
                                                                                            borderTop: itemIdx > 0 ? '1px solid var(--mantine-color-default-border)' : undefined,
                                                                                            opacity: item.isInheritedOnly ? 0.8 : 1,
                                                                                        }}
                                                                                    >
                                                                                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                                                                            <Group gap="xs" style={{ width: '140px' }} wrap="nowrap">
                                                                                                <Text size="sm" truncate style={{ flexShrink: 1 }}>{skill?.name ?? "Unbekannt"}</Text>
                                                                                                {item.isOverride && (
                                                                                                    <Tooltip label="Überschreibt einen geerbten Skill" withArrow position="top">
                                                                                                        <Badge size="xs" color="orange" variant="light" style={{ flexShrink: 0, cursor: 'help' }}>↑</Badge>
                                                                                                    </Tooltip>
                                                                                                )}
                                                                                                {item.isInheritedOnly && (
                                                                                                    <Tooltip label={`Geerbt von: ${item.sourceRoleName}`} withArrow>
                                                                                                        <Badge size="xs" color="gray" variant="light" style={{ flexShrink: 0, cursor: 'help' }}>
                                                                                                            <IconArrowUpRight size={10} />
                                                                                                        </Badge>
                                                                                                    </Tooltip>
                                                                                                )}
                                                                                            </Group>
                                                                                            <Slider
                                                                                                style={{ flex: 1 }}
                                                                                                min={0}
                                                                                                max={100}
                                                                                                step={25}
                                                                                                color={LEVELS.find(l => l.value === currentLevel)?.color ?? "gray"}
                                                                                                marks={sliderMarksWithTooltips}
                                                                                                value={currentLevel}
                                                                                                onChange={(val) => {
                                                                                                    if (item.isDirect) {
                                                                                                        setRequiredSkills(prev => prev.map(p => p.skillId === item.skillId ? { ...p, level: val } : p));
                                                                                                    } else {
                                                                                                        setRequiredSkills(prev => {
                                                                                                            const idx = prev.findIndex(p => p.skillId === item.skillId);
                                                                                                            if (idx >= 0) return prev.map((p, i) => i === idx ? { ...p, level: val } : p);
                                                                                                            return [...prev, { skillId: item.skillId, level: val }];
                                                                                                        });
                                                                                                    }
                                                                                                }}
                                                                                                label={null}
                                                                                            />
                                                                                            {item.isDirect ? (
                                                                                                <ActionIcon
                                                                                                    color="red" variant="subtle" size="sm"
                                                                                                    onClick={() => setRequiredSkills(prev => prev.filter(p => p.skillId !== item.skillId))}
                                                                                                >
                                                                                                    <IconX size={16} />
                                                                                                </ActionIcon>
                                                                                            ) : (
                                                                                                <div style={{ width: 28 }} />
                                                                                            )}
                                                                                        </div>
                                                                                    </Box>
                                                                                );
                                                                            })}
                                                                        </Stack>
                                                                    </Box>
                                                                    );
                                                                })}
                                                            </Stack>
                                                        </Accordion.Panel>
                                                    </Accordion.Item>
                                                );
                                            })}
                                        </Accordion>
                                    );
                                })()}
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
            <RoleDetailDrawer
                roleId={detailRoleId}
                onClose={() => setDetailRoleId(null)}
                onEdit={(role) => handleOpenEdit(role)}
            />

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
