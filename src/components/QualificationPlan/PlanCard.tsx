import React from "react";
import { Card, Group, ThemeIcon, Text, Menu, ActionIcon, Stack, Badge, Progress, Button } from "@mantine/core";
import { IconUser, IconDotsVertical, IconEye, IconEdit, IconArchive, IconTrash } from "@tabler/icons-react";
import { QualificationPlan } from "../../context/DataContext";
import { useStore } from "../../store/useStore";
import { usePrivacy } from "../../context/PrivacyContext";

interface PlanCardProps {
    plan: QualificationPlan;
    onView: (planId: string) => void;
    onEdit: (plan: QualificationPlan) => void;
    onArchive: (planId: string) => void;
    onDelete: (planId: string) => void;
}

const statusLabels: Record<QualificationPlan["status"], string> = {
    active: "Aktiv",
    completed: "Abgeschlossen",
    archived: "Archiviert",
};

const statusColors: Record<QualificationPlan["status"], string> = {
    active: "blue",
    completed: "green",
    archived: "orange",
};

export const PlanCard: React.FC<PlanCardProps> = ({ plan, onView, onEdit, onArchive, onDelete }) => {
    const { employees, roles, qualificationMeasures } = useStore();
    const { anonymizeName } = usePrivacy();

    const employee = employees.find((e) => e.id === plan.employeeId);
    const role = roles.find((r) => r.id === plan.targetRoleId);

    const getPlanProgress = (planId: string) => {
        const measures = qualificationMeasures.filter((m) => m.planId === planId);
        if (measures.length === 0) return { completed: 0, total: 0, percent: 0 };
        const completed = measures.filter((m) => m.status === "completed").length;
        return {
            completed,
            total: measures.length,
            percent: Math.round((completed / measures.length) * 100),
        };
    };

    const progress = getPlanProgress(plan.id!);

    return (
        <Card shadow="sm" padding="lg" radius="md" withBorder>
            <Card.Section withBorder inheritPadding py="xs">
                <Group justify="space-between">
                    <Group gap="sm">
                        <ThemeIcon variant="light" size="lg" radius="md">
                            <IconUser size={18} />
                        </ThemeIcon>
                        <div>
                            <Text fw={600}>{employee ? anonymizeName(employee.name, employee.id) : "Unbekannt"}</Text>
                            <Text size="xs" c="dimmed">
                                Zielrolle: {role?.name || "Keine"}
                            </Text>
                        </div>
                    </Group>
                    <Menu shadow="md" width={200}>
                        <Menu.Target>
                            <ActionIcon variant="subtle" color="gray">
                                <IconDotsVertical size={16} />
                            </ActionIcon>
                        </Menu.Target>
                        <Menu.Dropdown>
                            <Menu.Item
                                leftSection={<IconEye size={14} />}
                                onClick={() => onView(plan.id!)}
                            >
                                Details anzeigen
                            </Menu.Item>
                            <Menu.Item
                                leftSection={<IconEdit size={14} />}
                                onClick={() => onEdit(plan)}
                            >
                                Bearbeiten
                            </Menu.Item>
                            <Menu.Divider />
                            {plan.status !== "archived" && (
                                <Menu.Item
                                    leftSection={<IconArchive size={14} />}
                                    onClick={() => onArchive(plan.id!)}
                                >
                                    Archivieren
                                </Menu.Item>
                            )}
                            <Menu.Item
                                color="red"
                                leftSection={<IconTrash size={14} />}
                                onClick={() => onDelete(plan.id!)}
                            >
                                Löschen
                            </Menu.Item>
                        </Menu.Dropdown>
                    </Menu>
                </Group>
            </Card.Section>

            <Stack gap="xs" mt="md">
                <Group justify="space-between">
                    <Badge color={statusColors[plan.status]} variant="light">
                        {statusLabels[plan.status]}
                    </Badge>
                    <Text size="xs" c="dimmed">
                        {progress.completed} / {progress.total} Maßnahmen
                    </Text>
                </Group>

                <Progress
                    value={progress.percent}
                    color={progress.percent === 100 ? "green" : "blue"}
                    size="sm"
                    radius="xl"
                />

                <Text size="xs" c="dimmed">
                    Erstellt: {new Date(plan.createdAt).toLocaleDateString("de-DE")}
                </Text>
            </Stack>

            <Button
                variant="light"
                fullWidth
                mt="md"
                radius="md"
                onClick={() => onView(plan.id!)}
            >
                Details anzeigen
            </Button>
        </Card>
    );
};
