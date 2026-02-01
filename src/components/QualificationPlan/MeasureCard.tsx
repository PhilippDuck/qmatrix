import React from "react";
import {
  Card,
  Group,
  Text,
  Badge,
  ActionIcon,
  Menu,
  Stack,
  Progress,
  ThemeIcon,
  Tooltip,
} from "@mantine/core";
import {
  IconDotsVertical,
  IconEdit,
  IconTrash,
  IconCheck,
  IconX,
  IconUsers,
  IconSchool,
  IconArrowRight,
  IconCalendar,
  IconClock,
  IconPlayerPlay,
} from "@tabler/icons-react";
import { QualificationMeasure, Employee, Skill } from "../../context/DataContext";
import { usePrivacy } from "../../context/PrivacyContext";

interface MeasureCardProps {
  measure: QualificationMeasure;
  skill?: Skill;
  mentor?: Employee;
  onEdit: () => void;
  onDelete: () => void;
  onStatusChange: (status: QualificationMeasure["status"]) => void;
}

const statusLabels: Record<QualificationMeasure["status"], string> = {
  pending: "Geplant",
  in_progress: "In Bearbeitung",
  completed: "Abgeschlossen",
  cancelled: "Abgebrochen",
};

const statusColors: Record<QualificationMeasure["status"], string> = {
  pending: "gray",
  in_progress: "blue",
  completed: "green",
  cancelled: "red",
};

export const MeasureCard: React.FC<MeasureCardProps> = ({
  measure,
  skill,
  mentor,
  onEdit,
  onDelete,
  onStatusChange,
}) => {
  const { anonymizeName } = usePrivacy();
  const isInternal = measure.type === "internal";
  const progressPercent = measure.currentLevel > 0
    ? Math.round(((measure.targetLevel - measure.currentLevel) / measure.targetLevel) * 100)
    : 100;

  const formatDate = (timestamp?: number) => {
    if (!timestamp) return "-";
    return new Date(timestamp).toLocaleDateString("de-DE", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  };

  return (
    <Card shadow="sm" padding="md" radius="md" withBorder>
      <Card.Section withBorder inheritPadding py="xs">
        <Group justify="space-between">
          <Group gap="sm">
            <ThemeIcon
              variant="light"
              size="lg"
              radius="md"
              color={isInternal ? "teal" : "violet"}
            >
              {isInternal ? <IconUsers size={18} /> : <IconSchool size={18} />}
            </ThemeIcon>
            <div>
              <Text fw={600} size="sm">
                {skill?.name || "Unbekannter Skill"}
              </Text>
              <Text size="xs" c="dimmed">
                {isInternal ? "Interne Schulung" : "Externe Schulung"}
              </Text>
            </div>
          </Group>

          <Group gap="xs">
            <Badge color={statusColors[measure.status]} variant="light" size="sm">
              {statusLabels[measure.status]}
            </Badge>
            <Menu shadow="md" width={200}>
              <Menu.Target>
                <ActionIcon variant="subtle" color="gray" size="sm">
                  <IconDotsVertical size={14} />
                </ActionIcon>
              </Menu.Target>
              <Menu.Dropdown>
                <Menu.Label>Status ändern</Menu.Label>
                {measure.status !== "in_progress" && (
                  <Menu.Item
                    leftSection={<IconPlayerPlay size={14} />}
                    onClick={() => onStatusChange("in_progress")}
                  >
                    Starten
                  </Menu.Item>
                )}
                {measure.status !== "completed" && (
                  <Menu.Item
                    leftSection={<IconCheck size={14} />}
                    color="green"
                    onClick={() => onStatusChange("completed")}
                  >
                    Abschließen
                  </Menu.Item>
                )}
                {measure.status !== "cancelled" && (
                  <Menu.Item
                    leftSection={<IconX size={14} />}
                    color="red"
                    onClick={() => onStatusChange("cancelled")}
                  >
                    Abbrechen
                  </Menu.Item>
                )}
                <Menu.Divider />
                <Menu.Item leftSection={<IconEdit size={14} />} onClick={onEdit}>
                  Bearbeiten
                </Menu.Item>
                <Menu.Item
                  color="red"
                  leftSection={<IconTrash size={14} />}
                  onClick={onDelete}
                >
                  Löschen
                </Menu.Item>
              </Menu.Dropdown>
            </Menu>
          </Group>
        </Group>
      </Card.Section>

      <Stack gap="sm" mt="md">
        {/* Level Progress */}
        <div>
          <Group justify="space-between" mb={4}>
            <Text size="xs" c="dimmed">
              Level-Fortschritt
            </Text>
            <Group gap={4}>
              <Badge size="xs" color="gray" variant="light">
                {measure.currentLevel}%
              </Badge>
              <IconArrowRight size={10} />
              <Badge size="xs" color="blue" variant="light">
                {measure.targetLevel}%
              </Badge>
            </Group>
          </Group>
          <Progress
            value={measure.status === "completed" ? 100 : (measure.currentLevel / measure.targetLevel) * 100}
            color={measure.status === "completed" ? "green" : "blue"}
            size="sm"
            radius="xl"
          />
        </div>

        {/* Mentor or External Info */}
        {isInternal && mentor && (
          <Group gap="xs">
            <IconUsers size={14} color="var(--mantine-color-dimmed)" />
            <Text size="xs" c="dimmed">
              Mentor:
            </Text>
            <Text size="xs" fw={500}>
              {anonymizeName(mentor.name, mentor.id)}
            </Text>
          </Group>
        )}

        {!isInternal && (measure.externalProvider || measure.externalCourse) && (
          <Stack gap={4}>
            {measure.externalProvider && (
              <Group gap="xs">
                <IconSchool size={14} color="var(--mantine-color-dimmed)" />
                <Text size="xs" c="dimmed">
                  Anbieter:
                </Text>
                <Text size="xs" fw={500}>
                  {measure.externalProvider}
                </Text>
              </Group>
            )}
            {measure.externalCourse && (
              <Group gap="xs">
                <IconSchool size={14} color="var(--mantine-color-dimmed)" />
                <Text size="xs" c="dimmed">
                  Kurs:
                </Text>
                <Text size="xs" fw={500}>
                  {measure.externalCourse}
                </Text>
              </Group>
            )}
            {measure.estimatedCost !== undefined && measure.estimatedCost > 0 && (
              <Text size="xs" c="dimmed">
                Geschätzte Kosten: {measure.estimatedCost.toLocaleString("de-DE")} €
              </Text>
            )}
          </Stack>
        )}

        {/* Timeline */}
        <Group gap="lg">
          {measure.startDate && (
            <Tooltip label="Startdatum">
              <Group gap={4}>
                <IconCalendar size={14} color="var(--mantine-color-dimmed)" />
                <Text size="xs">{formatDate(measure.startDate)}</Text>
              </Group>
            </Tooltip>
          )}
          {measure.targetDate && (
            <Tooltip label="Zieldatum">
              <Group gap={4}>
                <IconClock size={14} color="var(--mantine-color-dimmed)" />
                <Text size="xs">{formatDate(measure.targetDate)}</Text>
              </Group>
            </Tooltip>
          )}
          {measure.completedDate && (
            <Tooltip label="Abgeschlossen am">
              <Group gap={4}>
                <IconCheck size={14} color="var(--mantine-color-green-6)" />
                <Text size="xs" c="green">
                  {formatDate(measure.completedDate)}
                </Text>
              </Group>
            </Tooltip>
          )}
        </Group>

        {/* Notes */}
        {measure.notes && (
          <Text size="xs" c="dimmed" lineClamp={2}>
            {measure.notes}
          </Text>
        )}
      </Stack>
    </Card>
  );
};
