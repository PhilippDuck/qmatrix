import React from "react";
import {
  Card,
  Table,
  Button,
  Group,
  ActionIcon,
  Title,
  Text,
  Badge,
  Tooltip,
} from "@mantine/core";
import {
  IconPlus,
  IconEdit,
  IconTrash,
  IconArrowRight,
  IconInfoCircle,
} from "@tabler/icons-react";
import { SubCategory } from "../../context/DataContext";

interface SubcategoryColumnProps {
  subcategories: SubCategory[];
  selectedSubCategory: string | null;
  isEnabled: boolean;
  onSelect: (subcategoryId: string) => void;
  onAdd: () => void;
  onEdit: (subcategory: SubCategory) => void;
  onDelete: (subcategoryId: string) => void;
  getSkillCount: (subcategoryId: string) => number;
}

export const SubcategoryColumn: React.FC<SubcategoryColumnProps> = ({
  subcategories,
  selectedSubCategory,
  isEnabled,
  onSelect,
  onAdd,
  onEdit,
  onDelete,
  getSkillCount,
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
          <IconArrowRight size={20} style={{ color: "var(--mantine-color-dimmed)" }} />
          <Title order={4}>Unterkategorien</Title>
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
            {subcategories.map((sub) => (
              <Table.Tr
                key={sub.id}
                style={{
                  cursor: "pointer",
                  backgroundColor:
                    selectedSubCategory === sub.id
                      ? "var(--mantine-color-default-hover)"
                      : "transparent",
                  borderLeft:
                    selectedSubCategory === sub.id
                      ? "3px solid var(--mantine-color-blue-filled)"
                      : "3px solid transparent",
                }}
                onClick={() => onSelect(sub.id!)}
              >
                <Table.Td>
                  <Group justify="space-between" wrap="nowrap">
                    <Group gap="xs">
                      <Text
                        size="sm"
                        fw={selectedSubCategory === sub.id ? 600 : 400}
                      >
                        {sub.name}
                      </Text>
                      {sub.description && (
                        <Tooltip
                          label={sub.description}
                          multiline
                          w={220}
                          withArrow
                        >
                          <IconInfoCircle size={14} style={{ color: "var(--mantine-color-dimmed)" }} />
                        </Tooltip>
                      )}
                    </Group>
                    <Badge variant="light" color="gray" size="xs" circle>
                      {getSkillCount(sub.id!)}
                    </Badge>
                  </Group>
                </Table.Td>
                <Table.Td style={{ width: 70 }}>
                  <Group gap={4} justify="flex-end">
                    <ActionIcon
                      size="sm"
                      variant="subtle"
                      onClick={(e) => {
                        e.stopPropagation();
                        onEdit(sub);
                      }}
                    >
                      <IconEdit size={14} />
                    </ActionIcon>
                    <ActionIcon
                      size="sm"
                      variant="subtle"
                      color="red"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (confirm("Unterkategorie löschen?"))
                          onDelete(sub.id!);
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
          Wählen Sie erst eine Kategorie
        </Text>
      )}
    </Card>
  );
};
