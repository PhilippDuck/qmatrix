import React from "react";
import {
  Paper,
  Group,
  Text,
  Badge,
  Stack,
  Box,
  Tooltip,
  ThemeIcon,
} from "@mantine/core";
import {
  IconCircleCheck,
  IconCircleDashed,
  IconPlayerPlay,
  IconCircleX,
  IconCalendar,
} from "@tabler/icons-react";
import { QualificationMeasure, Skill } from "../../context/DataContext";

interface TimelineProps {
  measures: QualificationMeasure[];
  skills: Skill[];
}

const statusIcons: Record<QualificationMeasure["status"], React.ReactNode> = {
  pending: <IconCircleDashed size={16} />,
  in_progress: <IconPlayerPlay size={16} />,
  completed: <IconCircleCheck size={16} />,
  cancelled: <IconCircleX size={16} />,
};

const statusColors: Record<QualificationMeasure["status"], string> = {
  pending: "gray",
  in_progress: "blue",
  completed: "green",
  cancelled: "red",
};

const statusLabels: Record<QualificationMeasure["status"], string> = {
  pending: "Geplant",
  in_progress: "In Bearbeitung",
  completed: "Abgeschlossen",
  cancelled: "Abgebrochen",
};

export const Timeline: React.FC<TimelineProps> = ({ measures, skills }) => {
  // Sort measures by target date, then by start date
  const sortedMeasures = [...measures].sort((a, b) => {
    const aDate = a.targetDate || a.startDate || 0;
    const bDate = b.targetDate || b.startDate || 0;
    return aDate - bDate;
  });

  const formatDate = (timestamp?: number) => {
    if (!timestamp) return null;
    return new Date(timestamp).toLocaleDateString("de-DE", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  const getSkillName = (skillId: string) => {
    return skills.find((s) => s.id === skillId)?.name || "Unbekannt";
  };

  if (measures.length === 0) {
    return (
      <Paper p="lg" radius="md" withBorder ta="center">
        <ThemeIcon variant="light" size="xl" radius="xl" color="gray" mx="auto">
          <IconCalendar size={24} />
        </ThemeIcon>
        <Text mt="md" fw={500}>
          Keine Maßnahmen vorhanden
        </Text>
        <Text size="sm" c="dimmed">
          Fügen Sie Maßnahmen hinzu, um die Timeline zu sehen.
        </Text>
      </Paper>
    );
  }

  return (
    <Stack gap={0}>
      {sortedMeasures.map((measure, index) => {
        const isLast = index === sortedMeasures.length - 1;
        const skill = skills.find((s) => s.id === measure.skillId);

        return (
          <Group key={measure.id} gap="md" wrap="nowrap" align="flex-start">
            {/* Timeline Line */}
            <Stack gap={0} align="center" style={{ width: 24 }}>
              <ThemeIcon
                variant="light"
                size="md"
                radius="xl"
                color={statusColors[measure.status]}
              >
                {statusIcons[measure.status]}
              </ThemeIcon>
              {!isLast && (
                <Box
                  style={{
                    width: 2,
                    flex: 1,
                    minHeight: 40,
                    backgroundColor:
                      measure.status === "completed"
                        ? "var(--mantine-color-green-3)"
                        : "var(--mantine-color-gray-3)",
                  }}
                />
              )}
            </Stack>

            {/* Content */}
            <Paper
              p="sm"
              radius="sm"
              withBorder
              style={{ flex: 1, marginBottom: isLast ? 0 : 8 }}
            >
              <Group justify="space-between" wrap="nowrap">
                <div>
                  <Text fw={500} size="sm">
                    {getSkillName(measure.skillId)}
                  </Text>
                  <Text size="xs" c="dimmed">
                    {measure.type === "internal"
                      ? "Interne Schulung"
                      : "Externe Schulung"}
                    {measure.externalCourse && ` - ${measure.externalCourse}`}
                  </Text>
                </div>

                <Group gap="xs">
                  {measure.targetDate && (
                    <Tooltip label="Zieldatum">
                      <Badge
                        size="xs"
                        variant="light"
                        color={
                          measure.status === "completed"
                            ? "green"
                            : measure.targetDate < Date.now() &&
                              measure.status !== "cancelled"
                            ? "red"
                            : "gray"
                        }
                        leftSection={<IconCalendar size={10} />}
                      >
                        {formatDate(measure.targetDate)}
                      </Badge>
                    </Tooltip>
                  )}
                  <Badge
                    size="xs"
                    color={statusColors[measure.status]}
                    variant="light"
                  >
                    {statusLabels[measure.status]}
                  </Badge>
                </Group>
              </Group>

              {/* Level Progress */}
              <Group gap="xs" mt="xs">
                <Text size="xs" c="dimmed">
                  Level:
                </Text>
                <Badge size="xs" color="gray" variant="outline">
                  {measure.currentLevel}%
                </Badge>
                <Text size="xs" c="dimmed">
                  →
                </Text>
                <Badge size="xs" color="blue" variant="outline">
                  {measure.targetLevel}%
                </Badge>
              </Group>
            </Paper>
          </Group>
        );
      })}
    </Stack>
  );
};
