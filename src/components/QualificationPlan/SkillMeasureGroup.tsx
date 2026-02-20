import React, { useMemo } from "react";
import { Paper, Group, ThemeIcon, Text, Button, SimpleGrid, Stack } from "@mantine/core";
import { IconTarget, IconPlus } from "@tabler/icons-react";
import { QualificationMeasure, SkillGap } from "../../store/useStore";
import { useStore } from "../../store/useStore";
import { MeasureCard } from "./MeasureCard";

interface SkillMeasureGroupProps {
    skillId: string;
    measures: QualificationMeasure[];
    skillGaps: SkillGap[];
    employeeId: string;
    onAddMeasure: (skillId: string) => void;
    onEditMeasure: (measure: QualificationMeasure) => void;
    onDeleteMeasure: (measureId: string) => void;
    onStatusChange: (measureId: string, status: QualificationMeasure["status"]) => void;
    onUpdateProgress: (skillId: string, level: number) => void;
}

export const SkillMeasureGroup: React.FC<SkillMeasureGroupProps> = ({
    skillId,
    measures,
    skillGaps,
    employeeId,
    onAddMeasure,
    onEditMeasure,
    onDeleteMeasure,
    onStatusChange,
    onUpdateProgress,
}) => {
    const { skills, categories, subcategories, employees } = useStore();

    const skill = skills.find((s) => s.id === skillId);
    const subCategory = subcategories.find((s) => s.id === skill?.subCategoryId);
    const category = categories.find((c) => c.id === subCategory?.categoryId);

    // Check if fully planned
    const gap = skillGaps.find((g) => g.skillId === skillId);
    const maxPlannedLevel = Math.max(0, ...measures.map((m) => m.targetLevel));
    const isFullyPlanned = maxPlannedLevel >= (gap?.targetLevel ?? 100);

    // Sort measures by startLevel (Chain order)
    const sortedMeasures = useMemo(() =>
        [...measures].sort((a, b) => (a.startLevel ?? 0) - (b.startLevel ?? 0)),
        [measures]
    );

    const getMentor = (mentorId?: string) =>
        mentorId ? employees.find((e) => e.id === mentorId) : undefined;

    return (
        <Paper withBorder p="md" radius="md">
            <Group mb="md" align="center" justify="space-between">
                <Group>
                    <ThemeIcon variant="light" color="blue" radius="xl">
                        <IconTarget size={16} />
                    </ThemeIcon>
                    <div>
                        <Text
                            size="sm"
                            fw={700}
                            tt="uppercase"
                            c="dimmed"
                            style={{ fontSize: "10px", lineHeight: 1 }}
                        >
                            {category?.name || "Kategorie"} &rsaquo;{" "}
                            {subCategory?.name || "Subkategorie"}
                        </Text>
                        <Text fw={600} size="lg" style={{ lineHeight: 1.2 }}>
                            {skill?.name || "Unbekannter Skill"}
                        </Text>
                    </div>
                </Group>
                <Button
                    variant="subtle"
                    size="xs"
                    leftSection={<IconPlus size={14} />}
                    onClick={() => onAddMeasure(skillId)}
                    disabled={isFullyPlanned}
                    title={
                        isFullyPlanned
                            ? "Skill bereits vollständig geplant"
                            : "Maßnahme hinzufügen"
                    }
                >
                    Maßnahme
                </Button>
            </Group>

            <SimpleGrid cols={{ base: 1, md: 2, lg: 3 }} spacing="md">
                {sortedMeasures.map((measure) => (
                    <MeasureCard
                        key={measure.id}
                        measure={measure}
                        skill={skill}
                        mentor={getMentor(measure.mentorId)}
                        onEdit={() => onEditMeasure(measure)}
                        onDelete={() => onDeleteMeasure(measure.id!)}
                        onStatusChange={(status) => onStatusChange(measure.id!, status)}
                        onUpdateProgress={(level) =>
                            onUpdateProgress(measure.skillId, level)
                        }
                    />
                ))}
            </SimpleGrid>
        </Paper>
    );
};
