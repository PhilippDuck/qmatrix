import React from "react";
import {
  Paper,
  Group,
  Text,
  Avatar,
  ActionIcon,
  Stack,
  Badge,
  Tooltip,
  ThemeIcon,
} from "@mantine/core";
import { IconCheck, IconUser, IconStar } from "@tabler/icons-react";
import { Employee } from "../../context/DataContext";

interface MentorSuggestionProps {
  mentors: Employee[];
  selectedMentorId?: string;
  onSelect: (mentorId: string) => void;
}

export const MentorSuggestion: React.FC<MentorSuggestionProps> = ({
  mentors,
  selectedMentorId,
  onSelect,
}) => {
  if (mentors.length === 0) {
    return null;
  }

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <Stack gap="xs">
      <Group gap="xs">
        <ThemeIcon variant="light" size="sm" color="teal">
          <IconStar size={12} />
        </ThemeIcon>
        <Text size="xs" c="dimmed">
          Verfügbare Mentoren ({mentors.length})
        </Text>
      </Group>

      <Stack gap={4}>
        {mentors.map((mentor) => {
          const isSelected = selectedMentorId === mentor.id;

          return (
            <Paper
              key={mentor.id}
              p="xs"
              radius="sm"
              withBorder
              style={{
                cursor: "pointer",
                borderColor: isSelected
                  ? "var(--mantine-color-blue-5)"
                  : undefined,
                backgroundColor: isSelected
                  ? "var(--mantine-color-blue-light)"
                  : undefined,
              }}
              onClick={() => onSelect(mentor.id!)}
            >
              <Group justify="space-between">
                <Group gap="sm">
                  <Avatar size="sm" radius="xl" color="blue">
                    {getInitials(mentor.name)}
                  </Avatar>
                  <div>
                    <Text size="sm" fw={500}>
                      {mentor.name}
                    </Text>
                    {mentor.department && (
                      <Text size="xs" c="dimmed">
                        {mentor.department}
                      </Text>
                    )}
                  </div>
                </Group>

                <Group gap="xs">
                  <Tooltip label="100% Skill-Level">
                    <Badge size="xs" color="green" variant="light">
                      100%
                    </Badge>
                  </Tooltip>
                  {isSelected && (
                    <ThemeIcon size="sm" color="blue" variant="filled" radius="xl">
                      <IconCheck size={12} />
                    </ThemeIcon>
                  )}
                </Group>
              </Group>
            </Paper>
          );
        })}
      </Stack>
    </Stack>
  );
};
