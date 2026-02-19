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
  Timeline as MantineTimeline,
  Divider,
  getThemeColor,
  useMantineTheme,
} from "@mantine/core";
import {
  IconCircleCheck,
  IconCircleDashed,
  IconPlayerPlay,
  IconCircleX,
  IconCalendar,
  IconClock,
  IconSchool,
  IconUser,
  IconBook,
  IconTarget,
} from "@tabler/icons-react";
import { QualificationMeasure, Skill, Category, SubCategory } from "../../context/DataContext";

interface TimelineProps {
  measures: QualificationMeasure[];
  skills: Skill[];
  categories: Category[]; // Added prop
  subcategories: SubCategory[]; // Added prop
}

const statusIcons: Record<QualificationMeasure["status"], React.ReactNode> = {
  pending: <IconCircleDashed size={14} />,
  in_progress: <IconPlayerPlay size={14} />,
  completed: <IconCircleCheck size={14} />,
  cancelled: <IconCircleX size={14} />,
};

const statusColors: Record<QualificationMeasure["status"], string> = {
  pending: "gray",
  in_progress: "blue",
  completed: "green",
  cancelled: "red",
};

const statusLabels: Record<QualificationMeasure["status"], string> = {
  pending: "Geplant",
  in_progress: "Aktiv",
  completed: "Erledigt",
  cancelled: "Abgebrochen",
};

const typeIcons: Record<string, React.ReactNode> = {
  internal: <IconUser size={14} />,
  external: <IconSchool size={14} />,
  self_learning: <IconBook size={14} />,
};

const typeLabels: Record<string, string> = {
  internal: "Internes Mentoring",
  external: "Externe Schulung",
  self_learning: "Selbststudium",
};

export const Timeline: React.FC<TimelineProps> = ({ measures, skills, categories, subcategories }) => {
  const theme = useMantineTheme();

  // Sort measures by start date
  const sortedMeasures = [...measures].sort((a, b) => {
    return (a.startDate || 0) - (b.startDate || 0);
  });

  const getSkillDetails = (skillId: string) => {
    const skill = skills.find((s) => s.id === skillId);
    if (!skill) return { name: "Unbekannt", path: "" };

    const sub = subcategories.find(sc => sc.id === skill.subCategoryId);
    const cat = sub ? categories.find(c => c.id === sub.categoryId) : null;

    // Construct path: Category > Subcategory
    let path = "";
    if (cat) path += cat.name;
    if (sub) path += ` > ${sub.name}`;

    return { name: skill.name, path };
  };

  const formatDate = (timestamp?: number) => {
    if (!timestamp) return "";
    return new Date(timestamp).toLocaleDateString("de-DE", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  };

  const getMeasureDuration = (start?: number, end?: number) => {
    if (!start || !end) return "";
    const diffTime = Math.abs(end - start);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return `${diffDays} Tage`;
  };

  // Check if we have current/active measures to show "Active Now" indicator
  const now = Date.now();
  const hasActive = measures.some(m => m.status === 'in_progress');
  const upcomingMeasures = measures.filter(m => (m.startDate || 0) > now && m.status === 'pending');

  if (measures.length === 0) {
    return (
      <Paper p="xl" radius="md" withBorder ta="center">
        <ThemeIcon variant="light" size={50} radius="xl" color="gray" mx="auto" mb="md">
          <IconCalendar size={30} />
        </ThemeIcon>
        <Text size="lg" fw={600} mb="xs">
          Keine Timeline verfügbar
        </Text>
        <Text size="sm" c="dimmed" maw={400} mx="auto">
          Sobald Maßnahmen geplant sind, erscheinen sie hier in chronologischer Reihenfolge.
        </Text>
      </Paper>
    );
  }

  return (
    <Box>
      {/* Summary Header */}
      <Paper p="md" radius="md" withBorder mb="xl" bg="var(--mantine-color-blue-light)">
        <Group justify="space-between">
          <Group>
            <ThemeIcon size="lg" variant="white" color="blue" radius="md">
              <IconClock size={20} />
            </ThemeIcon>
            <div>
              <Text size="sm" fw={700} c="blue">Zeitplan Übersicht</Text>
              <Text size="xs" c="dimmed">
                {measures.length} Maßnahmen gesamt • {hasActive ? "Laufende Aktivitäten" : "Keine laufenden Aktivitäten"}
              </Text>
            </div>
          </Group>
          {hasActive && (
            <Badge variant="filled" color="blue" leftSection={<IconPlayerPlay size={12} className="mantine-rotate-pulse" />}>
              Aktiv
            </Badge>
          )}
        </Group>
      </Paper>


      <MantineTimeline active={-1} bulletSize={32} lineWidth={2}>
        {sortedMeasures.map((measure) => {
          const { name, path } = getSkillDetails(measure.skillId);
          const isPast = (measure.targetDate || 0) < now;
          const isActive = measure.status === 'in_progress';

          return (
            <MantineTimeline.Item
              key={measure.id}
              bullet={statusIcons[measure.status]}
              color={statusColors[measure.status]}
              title={
                <Group justify="space-between" mb={4}>
                  <Text size="sm" fw={600}>{name}</Text>
                  {isActive && <Badge size="sm" variant="dot">Aktiv</Badge>}
                </Group>
              }
            >
              <Paper withBorder p="sm" radius="md" mt="xs" shadow={isActive ? "sm" : "none"} style={isActive ? { borderColor: 'var(--mantine-color-blue-4)' } : {}}>
                {/* Metadata Row */}
                <Group justify="space-between" mb="xs" align="start">
                  <div>
                    <Text size="xs" c="dimmed" fw={500} mb={2}>{path}</Text>
                    <Group gap="xs">
                      <Badge size="xs" variant="light" color="gray" leftSection={typeIcons[measure.type]}>
                        {typeLabels[measure.type]}
                      </Badge>
                      {measure.externalCourse && (
                        <Text size="xs" c="dimmed">- {measure.externalCourse}</Text>
                      )}
                    </Group>
                  </div>
                  <Stack gap={2} align="flex-end">
                    <Group gap={4}>
                      <IconCalendar size={12} style={{ opacity: 0.5 }} />
                      <Text size="xs" fw={500}>
                        {formatDate(measure.startDate)} - {formatDate(measure.targetDate)}
                      </Text>
                    </Group>
                    <Text size="xs" c="dimmed">Dauer: {getMeasureDuration(measure.startDate, measure.targetDate)}</Text>
                  </Stack>
                </Group>

                <Divider my="xs" variant="dashed" />

                {/* Goals Row */}
                <Group justify="space-between" align="center">
                  <Group gap="xs">
                    <Text size="xs" fw={500}>Level Entwicklung:</Text>
                    <Badge variant="outline" color="gray" size="sm">{measure.currentLevel}%</Badge>
                    <IconTarget size={14} style={{ opacity: 0.3 }} />
                    <Badge variant="outline" color="blue" size="sm">{measure.targetLevel}%</Badge>
                  </Group>

                  <Badge color={statusColors[measure.status]} variant="light" size="sm">
                    {statusLabels[measure.status]}
                  </Badge>
                </Group>
              </Paper>
            </MantineTimeline.Item>
          );
        })}
      </MantineTimeline>
    </Box>
  );
};
