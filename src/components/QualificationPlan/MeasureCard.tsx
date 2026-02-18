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
  Button,
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
  IconBook,
} from "@tabler/icons-react";
import { QualificationMeasure, Employee, Skill } from "../../context/DataContext";
import { usePrivacy } from "../../context/PrivacyContext";
import { LEVELS } from "../../constants/skillLevels";

interface MeasureCardProps {
  measure: QualificationMeasure;
  skill?: Skill;
  mentor?: Employee;
  onEdit: () => void;
  onDelete: () => void;
  onStatusChange: (status: QualificationMeasure["status"]) => void;
  onUpdateProgress: (level: number) => void;
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
  onUpdateProgress,
}) => {
  const { anonymizeName } = usePrivacy();
  const [localLevel, setLocalLevel] = React.useState(measure.currentLevel);

  React.useEffect(() => {
    setLocalLevel(measure.currentLevel);
  }, [measure.currentLevel]);

  const handleLevelUpdate = (newLevel: number) => {
    setLocalLevel(newLevel);
    onUpdateProgress(newLevel);
  };

  const isInternal = measure.type === "internal";
  const isSelfLearning = measure.type === "self_learning";

  const formatDate = (timestamp?: number) => {
    if (!timestamp) return "-";
    return new Date(timestamp).toLocaleDateString("de-DE", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  };

  const getLevelColor = (levelValue: number) => {
    return LEVELS.find(l => l.value === levelValue)?.color || "gray";
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
              color={isInternal ? "teal" : isSelfLearning ? "orange" : "violet"}
            >
              {isInternal ? <IconUsers size={18} /> : isSelfLearning ? <IconBook size={18} /> : <IconSchool size={18} />}
            </ThemeIcon>
            <div>
              <Tooltip
                label={skill?.description || "Keine Beschreibung verfügbar"}
                position="top-start"
                withArrow
                disabled={!skill?.description}
                multiline
                w={300}
              >
                <Text fw={600} size="sm" style={{ cursor: skill?.description ? "help" : "default" }}>
                  {skill?.name || "Unbekannter Skill"}
                </Text>
              </Tooltip>
              <Text size="xs" c="dimmed">
                {isInternal ? "Interne Schulung" : isSelfLearning ? "Selbststudium / Erfahrung" : "Externe Schulung"}
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
        {/* Level Progress */}
        <div>
          <Group justify="space-between" mb={4}>
            <Text size="xs" c="dimmed">
              Ziel-Bereich ({measure.startLevel ?? 0}% - {measure.targetLevel}%)
            </Text>
            <Group gap={4}>
              <Badge size="xs" color="gray" variant="light">
                Start: {measure.startLevel ?? 0}%
              </Badge>
              <IconArrowRight size={10} />
              <Badge size="xs" color="blue" variant="light">
                Ziel: {measure.targetLevel}%
              </Badge>
            </Group>
          </Group>
          <Progress.Root size="sm" radius="xl">
            <Progress.Section
              value={
                measure.status === "completed"
                  ? 100
                  : Math.max(0, Math.min(100, ((localLevel - (measure.startLevel ?? 0)) / (measure.targetLevel - (measure.startLevel ?? 0))) * 100))
              }
              color={measure.status === "completed" ? "green" : "blue"}
            >
              <Progress.Label>{localLevel}%</Progress.Label>
            </Progress.Section>
          </Progress.Root>

          <Group gap={4} mt="xs" grow>
            {LEVELS.filter(l => l.value >= (measure.startLevel ?? 0) && l.value <= measure.targetLevel).map(level => {
              const isSelected = localLevel >= level.value;
              const isCurrent = localLevel === level.value;

              return (
                <Tooltip
                  key={level.value}
                  label={
                    <Stack gap={2}>
                      <Text size="xs" fw={700}>
                        {level.title}
                      </Text>
                      {level.description && <Text size="xs">{level.description}</Text>}
                    </Stack>
                  }
                  multiline
                  w={200}
                  position="top"
                  withArrow
                  openDelay={200}
                >
                  <Button
                    size="compact-xs"
                    p={0}
                    variant={isCurrent ? "filled" : "default"}
                    color={level.color}
                    onClick={() => handleLevelUpdate(level.value)}
                    style={{
                      borderColor: isCurrent ? undefined : `var(--mantine-color-${level.color}-4)`,
                      color: isCurrent ? undefined : `var(--mantine-color-${level.color}-7)`,
                    }}
                  >
                    {level.value}%
                  </Button>
                </Tooltip>
              );
            })}
          </Group>
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
