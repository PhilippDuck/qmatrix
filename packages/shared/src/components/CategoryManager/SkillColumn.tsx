import React from "react";
import {
  Card,
  Table,
  Button,
  Group,
  ActionIcon,
  Title,
  Text,
  Tooltip,
} from "@mantine/core";
import {
  IconPlus,
  IconEdit,
  IconTrash,
  IconTarget,
  IconInfoCircle,
} from "@tabler/icons-react";
import { Skill } from "../../store/useStore";

interface SkillColumnProps {
  skills: Skill[];
  isEnabled: boolean;
  onAdd: () => void;
  onEdit: (skill: Skill) => void;
  onDelete: (skillId: string) => void;
}

export const SkillColumn: React.FC<SkillColumnProps> = ({
  skills,
  isEnabled,
  onAdd,
  onEdit,
  onDelete,
}) => {
  return (
    <Card
      withBorder
      shadow="sm"
      radius="md"
      style={{ flex: 1, opacity: isEnabled ? 1 : 0.6 }}
    >
      <Group justify="space-between" mb="md">
        <Group gap="xs">
          <IconTarget size={20} style={{ color: "var(--mantine-color-dimmed)" }} />
          <Title order={4}>Skills</Title>
        </Group>
        <Button
          size="compact-xs"
          variant="light"
          disabled={!isEnabled}
          leftSection={<IconPlus size={14} />}
          onClick={onAdd}
        >
          Neu
        </Button>
      </Group>

      {isEnabled ? (
        <Table verticalSpacing="sm" highlightOnHover>
          <Table.Tbody>
            {skills.map((skill) => (
              <Table.Tr key={skill.id}>
                <Table.Td>
                  <Group gap="xs">
                    <Text size="sm">{skill.name}</Text>
                    {skill.description && (
                      <Tooltip
                        label={skill.description}
                        multiline
                        w={220}
                        withArrow
                      >
                        <IconInfoCircle size={14} style={{ color: "var(--mantine-color-dimmed)" }} />
                      </Tooltip>
                    )}
                  </Group>
                </Table.Td>
                <Table.Td style={{ width: 70 }}>
                  <Group gap={4} justify="flex-end">
                    <ActionIcon
                      size="sm"
                      variant="subtle"
                      onClick={() => onEdit(skill)}
                    >
                      <IconEdit size={14} />
                    </ActionIcon>
                    <ActionIcon
                      size="sm"
                      variant="subtle"
                      color="red"
                      onClick={() => {
                        if (confirm("Skill löschen?")) onDelete(skill.id!);
                      }}
                    >
                      <IconTrash size={14} />
                    </ActionIcon>
                  </Group>
                </Table.Td>
              </Table.Tr>
            ))}
          </Table.Tbody>
        </Table>
      ) : (
        <Text c="dimmed" size="sm" ta="center" py="xl">
          Wählen Sie erst eine Unterkategorie
        </Text>
      )}
    </Card>
  );
};
