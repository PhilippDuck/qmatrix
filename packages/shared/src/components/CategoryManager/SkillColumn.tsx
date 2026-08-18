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
  Badge,
} from "@mantine/core";
import {
  IconPlus,
  IconEdit,
  IconTrash,
  IconTarget,
  IconInfoCircle,
} from "@tabler/icons-react";
import { Skill } from "../../store/hooks";
import { CatalogDirtyTag } from "../shared/CatalogDirtyTag";

interface SkillColumnProps {
  skills: Skill[];
  isEnabled: boolean;
  onAdd: () => void;
  onEdit: (skill: Skill) => void;
  onDelete: (skillId: string) => void;
  readOnly?: boolean;
}

export const SkillColumn: React.FC<SkillColumnProps> = ({
  skills,
  isEnabled,
  onAdd,
  onEdit,
  onDelete,
  readOnly = false,
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
        {!readOnly && (
          <Button
            size="compact-xs"
            variant="light"
            disabled={!isEnabled}
            leftSection={<IconPlus size={14} />}
            onClick={onAdd}
          >
            Neu
          </Button>
        )}
      </Group>

      {isEnabled ? (
        <Table verticalSpacing="sm" highlightOnHover>
          <Table.Tbody>
            {skills.map((skill) => (
              <Table.Tr key={skill.id}>
                <Table.Td>
                  <Group gap="xs">
                    <Text size="sm" c={skill.catalogDeprecated ? "dimmed" : undefined}>
                      {skill.name}
                    </Text>
                    <CatalogDirtyTag kind="skills" id={skill.id} />
                    {skill.catalogDeprecated && (
                      <Badge size="xs" color="gray" variant="outline">
                        Veraltet
                      </Badge>
                    )}
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
                  {!readOnly ? (
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
                  ) : (
                    <Group gap={4} justify="flex-end">
                      <ActionIcon
                        size="sm"
                        variant="subtle"
                        onClick={() => onEdit(skill)}
                        title="Details anzeigen"
                      >
                        <IconEdit size={14} />
                      </ActionIcon>
                    </Group>
                  )}
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
