import React, { useEffect, useState } from "react";
import { Timeline, Text, ThemeIcon, Loader, Center } from "@mantine/core";
import { IconArrowUp, IconArrowDown, IconStar } from "@tabler/icons-react";
import { AssessmentLogEntry } from "../../context/DataContext";
import { useStore } from "../../store/useStore";

interface HistoryTimelineProps {
    employeeId: string;
}

export const HistoryTimeline: React.FC<HistoryTimelineProps> = ({ employeeId }) => {
    const { getHistory, skills, categories, subcategories } = useStore();
    const [history, setHistory] = useState<AssessmentLogEntry[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const loadHistory = async () => {
            setLoading(true);
            const data = await getHistory(employeeId);
            // Sort by timestamp descending
            data.sort((a, b) => b.timestamp - a.timestamp);
            setHistory(data);
            setLoading(false);
        };
        loadHistory();
    }, [employeeId, getHistory]);

    if (loading) {
        return (
            <Center p="xl">
                <Loader size="sm" />
            </Center>
        );
    }

    if (history.length === 0) {
        return (
            <Text c="dimmed" fs="italic" ta="center" p="md">
                Keine Historie vorhanden.
            </Text>
        );
    }

    const resolveSkillInfo = (skillId: string) => {
        const skill = skills.find(s => s.id === skillId);
        if (!skill) return { name: "Unbekannter Skill", context: "" };

        const sub = subcategories.find(s => s.id === skill.subCategoryId);
        const cat = sub ? categories.find(c => c.id === sub.categoryId) : null;

        return {
            name: skill.name,
            context: sub && cat ? `${cat.name} • ${sub.name}` : ""
        };
    };

    return (
        <Timeline active={history.length} bulletSize={24} lineWidth={2}>
            {history.map((entry) => {
                const isImprovement = entry.newLevel > entry.previousLevel;
                const isFirst = entry.previousLevel === 0 && entry.newLevel > 0;
                const { name, context } = resolveSkillInfo(entry.skillId);

                return (
                    <Timeline.Item
                        key={entry.id}
                        bullet={
                            <ThemeIcon
                                size={22}
                                variant="gradient"
                                gradient={
                                    isFirst ? { from: 'yellow', to: 'orange' } :
                                        isImprovement ? { from: 'teal', to: 'lime' } : { from: 'red', to: 'orange' }
                                }
                                radius="xl"
                            >
                                {isFirst ? <IconStar size={12} /> : isImprovement ? <IconArrowUp size={12} /> : <IconArrowDown size={12} />}
                            </ThemeIcon>
                        }
                        title={
                            <div>
                                <Text size="sm" fw={500}>{name}</Text>
                                {context && <Text size="xs" c="dimmed">{context}</Text>}
                            </div>
                        }
                    >
                        <Text c="dimmed" size="xs" mt={4}>
                            {new Date(entry.timestamp).toLocaleString()}
                        </Text>
                        <Text size="sm" mt={4}>
                            Level geändert von <b>{entry.previousLevel}</b> auf <b>{entry.newLevel}</b>
                        </Text>
                        {entry.note && (
                            <Text size="xs" mt={4} c="dimmed">
                                Notiz: {entry.note}
                            </Text>
                        )}
                    </Timeline.Item>
                );
            })}
        </Timeline>
    );
};
