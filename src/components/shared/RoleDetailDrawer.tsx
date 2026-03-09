import React, { useMemo } from "react";
import {
    Drawer,
    Stack,
    Text,
    Group,
    ThemeIcon,
    Divider,
    Badge,
    Box,
    Paper,
    Tooltip,
    Accordion,
    Button,
} from "@mantine/core";
import { IconArrowUpRight, IconEdit } from "@tabler/icons-react";
import { useStore } from "../../store/useStore";
import { EmployeeRole } from "../../services/indexeddb";
import { getIconByName } from "./RoleIconPicker";
import { LEVELS } from "../../constants/skillLevels";

interface RoleDetailDrawerProps {
    roleId: string | null;
    onClose: () => void;
    onEdit?: (role: EmployeeRole) => void;
}

export const RoleDetailDrawer: React.FC<RoleDetailDrawerProps> = ({ roleId, onClose, onEdit }) => {
    const { roles, skills, categories, subcategories } = useStore();

    const role = useMemo(() => roles.find(r => r.id === roleId) ?? null, [roleId, roles]);

    const inheritedDescriptions = useMemo(() => {
        if (!role?.inheritsFromId) return [];
        const chain: { roleName: string; description: string }[] = [];
        const visited = new Set<string>();
        let currentId: string | null = role.inheritsFromId;
        while (currentId && !visited.has(currentId)) {
            visited.add(currentId);
            const parent = roles.find(r => r.id === currentId);
            if (!parent) break;
            if (parent.description) chain.unshift({ roleName: parent.name, description: parent.description });
            currentId = parent.inheritsFromId ?? null;
        }
        return chain;
    }, [role, roles]);


    const inheritedSkills = useMemo(() => {
        const skillsMap = new Map<string, { skillId: string; level: number; sourceRoleName: string }>();
        if (!role?.inheritsFromId) return [];
        let currentParentId = role.inheritsFromId;
        const visited = new Set<string>();
        while (currentParentId && !visited.has(currentParentId)) {
            visited.add(currentParentId);
            const parent = roles.find(r => r.id === currentParentId);
            if (!parent) break;
            if (parent.requiredSkills) {
                parent.requiredSkills.forEach(rs => {
                    if (!skillsMap.has(rs.skillId)) {
                        skillsMap.set(rs.skillId, { ...rs, sourceRoleName: parent.name });
                    }
                });
            }
            currentParentId = parent.inheritsFromId || "";
        }
        return Array.from(skillsMap.values());
    }, [role, roles]);

    const skillsAccordion = useMemo(() => {
        if (!role) return null;

        type EnrichedSkill = {
            skillId: string;
            level: number;
            inherited: boolean;
            sourceRoleName?: string;
            isOverride: boolean;
            catId: string;
            catName: string;
            subId: string;
            subName: string;
        };

        const directSkills: EnrichedSkill[] = (role.requiredSkills ?? []).map(req => {
            const skill = skills.find(s => s.id === req.skillId);
            const sub = subcategories.find(sc => sc.id === skill?.subCategoryId);
            const cat = categories.find(c => c.id === sub?.categoryId);
            return {
                skillId: req.skillId,
                level: req.level,
                inherited: false,
                isOverride: inheritedSkills.some(is => is.skillId === req.skillId),
                catId: cat?.id ?? "_",
                catName: cat?.name ?? "?",
                subId: sub?.id ?? "_",
                subName: sub?.name ?? "?",
            };
        });

        const inheritedOnly: EnrichedSkill[] = inheritedSkills
            .filter(is => !(role.requiredSkills ?? []).some(rs => rs.skillId === is.skillId))
            .map(req => {
                const skill = skills.find(s => s.id === req.skillId);
                const sub = subcategories.find(sc => sc.id === skill?.subCategoryId);
                const cat = categories.find(c => c.id === sub?.categoryId);
                return {
                    skillId: req.skillId,
                    level: req.level,
                    inherited: true,
                    sourceRoleName: req.sourceRoleName,
                    isOverride: false,
                    catId: cat?.id ?? "_",
                    catName: cat?.name ?? "?",
                    subId: sub?.id ?? "_",
                    subName: sub?.name ?? "?",
                };
            });

        const all = [...directSkills, ...inheritedOnly];
        if (all.length === 0) return null;

        const catOrder = categories.map(c => c.id!);
        const subOrder = subcategories.map(s => s.id!);

        const grouped = new Map<string, { catName: string; subs: Map<string, { subName: string; items: EnrichedSkill[] }> }>();
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
                                        <Text size="sm" fw={600} style={{ cursor: cat?.description ? 'help' : 'default' }}>
                                            {catGroup.catName}
                                        </Text>
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
                                            <Box px="sm" py={6} bg="var(--mantine-color-default-hover)">
                                                <Tooltip label={sub?.description} disabled={!sub?.description} withArrow multiline w={240} position="right">
                                                    <Text size="xs" c="dimmed" fw={500} style={{ cursor: sub?.description ? 'help' : 'default' }}>
                                                        {subGroup.subName}
                                                    </Text>
                                                </Tooltip>
                                            </Box>
                                            <Stack gap={0}>
                                                {subGroup.items.map((item, itemIdx) => {
                                                    const skill = skills.find(s => s.id === item.skillId);
                                                    const lvl = LEVELS.find(l => l.value === item.level);
                                                    return (
                                                        <Box
                                                            key={item.skillId}
                                                            px="sm"
                                                            py={7}
                                                            style={{
                                                                borderTop: itemIdx > 0 ? '1px solid var(--mantine-color-default-border)' : undefined,
                                                                opacity: item.inherited ? 0.8 : 1,
                                                            }}
                                                        >
                                                            <Group justify="space-between">
                                                                <Group gap="xs">
                                                                    <Tooltip
                                                                        label={skill?.description}
                                                                        disabled={!skill?.description}
                                                                        withArrow
                                                                        multiline
                                                                        w={240}
                                                                        position="top-start"
                                                                    >
                                                                        <Text size="sm" style={{ cursor: skill?.description ? "help" : "default" }}>
                                                                            {skill?.name ?? "Unbekannt"}
                                                                        </Text>
                                                                    </Tooltip>
                                                                    {item.isOverride && (
                                                                        <Tooltip label="Überschreibt einen geerbten Skill" withArrow position="top">
                                                                            <Badge size="xs" color="orange" variant="light" style={{ cursor: 'help' }}>Überschreibt</Badge>
                                                                        </Tooltip>
                                                                    )}
                                                                    {item.inherited && (
                                                                        <Tooltip label={`Geerbt von: ${item.sourceRoleName}`} withArrow position="top">
                                                                            <Badge size="xs" color="gray" variant="light" style={{ cursor: 'help' }}>
                                                                                <Group gap={4} wrap="nowrap">
                                                                                    <IconArrowUpRight size={10} />
                                                                                    {item.sourceRoleName}
                                                                                </Group>
                                                                            </Badge>
                                                                        </Tooltip>
                                                                    )}
                                                                </Group>
                                                                <Badge
                                                                    color={lvl?.color ?? "gray"}
                                                                    variant={item.inherited ? "light" : "filled"}
                                                                    size="sm"
                                                                >
                                                                    {lvl?.title ?? `${item.level}%`}
                                                                </Badge>
                                                            </Group>
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
    }, [role, skills, categories, subcategories, inheritedSkills]);

    return (
        <Drawer
            opened={roleId !== null}
            onClose={onClose}
            position="right"
            size="lg"
            title={
                role ? (
                    <Group gap="sm">
                        {(() => {
                            const RoleIcon = getIconByName(role.icon);
                            return (
                                <ThemeIcon variant="light" size="lg" radius="md">
                                    <RoleIcon size={20} />
                                </ThemeIcon>
                            );
                        })()}
                        <Stack gap={0}>
                            <Text fw={700} size="lg">{role.name}</Text>
                            <Text size="xs" c="dimmed">Rollen-Details</Text>
                        </Stack>
                    </Group>
                ) : "Rollen-Details"
            }
            overlayProps={{ backgroundOpacity: 0.4, blur: 3 }}
        >
            {role && (
                <Stack gap="lg">
                    {/* Beschreibung */}
                    <Stack gap={4}>
                        <Text size="sm" fw={600} c="dimmed">Beschreibung</Text>
                        {(inheritedDescriptions.length > 0 || role.description) ? (() => {
                            const all = [
                                ...inheritedDescriptions,
                                ...(role.description ? [{ roleName: role.name, description: role.description }] : []),
                            ];
                            return (
                                <Stack gap={8}>
                                    {all.map((entry, i) => (
                                        <Box key={i}>
                                            {i > 0 && (
                                                <Text size="xs" c="dimmed" fw={500} mb={2}>
                                                    Ergänzung durch Rolle <strong>{entry.roleName}</strong>:
                                                </Text>
                                            )}
                                            <div
                                                className="role-description-html"
                                                dangerouslySetInnerHTML={{ __html: entry.description }}
                                                style={{ fontSize: "var(--mantine-font-size-sm)" }}
                                            />
                                        </Box>
                                    ))}
                                </Stack>
                            );
                        })() : (
                            <Text size="sm" c="dimmed" fs="italic">Keine Beschreibung hinterlegt.</Text>
                        )}
                    </Stack>

                    <Divider />

                    {/* Vererbung */}
                    <Stack gap={4}>
                        <Text size="sm" fw={600} c="dimmed">Vererbung</Text>
                        {role.inheritsFromId ? (() => {
                            const parent = roles.find(r => r.id === role.inheritsFromId);
                            const ParentIcon = getIconByName(parent?.icon);
                            return (
                                <Group gap="xs">
                                    <IconArrowUpRight size={16} color="gray" />
                                    <ParentIcon size={14} color="gray" />
                                    <Text size="sm">{parent?.name ?? "Unbekannte Rolle"}</Text>
                                </Group>
                            );
                        })() : (
                            <Text size="sm" c="dimmed" fs="italic">Keine Vererbung – eigenständige Rolle.</Text>
                        )}
                    </Stack>

                    <Divider />

                    {/* Skills */}
                    <Stack gap="sm">
                        <Text size="sm" fw={600} c="dimmed">Benötigte Skills & Soll-Level</Text>
                        {skillsAccordion ?? (
                            <Text size="sm" c="dimmed" fs="italic">Keine Skills zugeordnet.</Text>
                        )}
                    </Stack>

                    <Divider />

                    <Group justify="flex-end">
                        <Button variant="default" onClick={onClose}>Schließen</Button>
                        {onEdit && (
                            <Button leftSection={<IconEdit size={16} />} onClick={() => { onClose(); onEdit(role); }}>
                                Bearbeiten
                            </Button>
                        )}
                    </Group>
                </Stack>
            )}
        </Drawer>
    );
};
