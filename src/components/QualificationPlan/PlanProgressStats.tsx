import React from "react";
import { Paper, SimpleGrid, Card, Group, ThemeIcon, Text, Stack, Progress } from "@mantine/core";
import { IconList, IconTarget } from "@tabler/icons-react";

interface PlanProgressStatsProps {
    completedCount: number;
    totalCount: number;
    totalGaps: number;
    addressedGaps: number;
}

export const PlanProgressStats: React.FC<PlanProgressStatsProps> = ({
    completedCount,
    totalCount,
    totalGaps,
    addressedGaps,
}) => {
    const progressPercent =
        totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

    const unaddressedCount = totalGaps - addressedGaps;

    return (
        <Paper shadow="xs" p="md" radius="md" withBorder mb="lg">
            <SimpleGrid cols={{ base: 1, sm: 3 }} spacing="md">
                <Card padding="sm" radius="sm">
                    <Group>
                        <ThemeIcon variant="light" size="lg" radius="md" color="blue">
                            <IconList size={18} />
                        </ThemeIcon>
                        <div>
                            <Text size="xl" fw={700}>
                                {completedCount} / {totalCount}
                            </Text>
                            <Text size="xs" c="dimmed">
                                Maßnahmen abgeschlossen
                            </Text>
                        </div>
                    </Group>
                </Card>

                <Card padding="sm" radius="sm">
                    <Group>
                        <ThemeIcon
                            variant="light"
                            size="lg"
                            radius="md"
                            color={unaddressedCount > 0 ? "orange" : "green"}
                        >
                            <IconTarget size={18} />
                        </ThemeIcon>
                        <div>
                            <Text size="xl" fw={700}>
                                {addressedGaps} / {totalGaps}
                            </Text>
                            <Text size="xs" c="dimmed">
                                Defizite adressiert
                            </Text>
                        </div>
                    </Group>
                </Card>

                <Card padding="sm" radius="sm">
                    <Stack gap={4}>
                        <Group justify="space-between">
                            <Text size="sm" c="dimmed">
                                Fortschritt
                            </Text>
                            <Text size="sm" fw={500}>
                                {progressPercent}%
                            </Text>
                        </Group>
                        <Progress
                            value={progressPercent}
                            color={progressPercent === 100 ? "green" : "blue"}
                            size="lg"
                            radius="xl"
                        />
                    </Stack>
                </Card>
            </SimpleGrid>
        </Paper>
    );
};
