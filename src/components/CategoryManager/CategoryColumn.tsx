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
  IconCategory,
  IconInfoCircle,
} from "@tabler/icons-react";
import { Category } from "../../context/DataContext";

interface CategoryColumnProps {
  categories: Category[];
  selectedCategory: string | null;
  onSelect: (categoryId: string) => void;
  onAdd: () => void;
  onEdit: (category: Category) => void;
  onDelete: (categoryId: string) => void;
  getSubcategoryCount: (categoryId: string) => number;
}

export const CategoryColumn: React.FC<CategoryColumnProps> = ({
  categories,
  selectedCategory,
  onSelect,
  onAdd,
  onEdit,
  onDelete,
  getSubcategoryCount,
}) => {
  return (
    <Card withBorder shadow="sm" radius="md" style={{ flex: 1 }}>
      <Group justify="space-between" mb="md">
        <Group gap="xs">
          <IconCategory size={20} color="var(--mantine-color-blue-filled)" />
          <Title order={4}>Kategorien</Title>
        </Group>
        <Button
          size="compact-xs"
          variant="light"
          leftSection={<IconPlus size={14} />}
          onClick={onAdd}
        >
          Neu
        </Button>
      </Group>

      <Table verticalSpacing="sm" highlightOnHover>
        <Table.Tbody>
          {categories.map((cat) => (
            <Table.Tr
              key={cat.id}
              style={{
                cursor: "pointer",
                backgroundColor:
                  selectedCategory === cat.id
                    ? "var(--mantine-color-blue-light)"
                    : "transparent",
              }}
              onClick={() => onSelect(cat.id!)}
            >
              <Table.Td>
                <Group justify="space-between" wrap="nowrap">
                  <Group gap="xs">
                    <Text
                      size="sm"
                      fw={selectedCategory === cat.id ? 600 : 400}
                    >
                      {cat.name}
                    </Text>
                    {cat.description && (
                      <Tooltip
                        label={cat.description}
                        multiline
                        w={220}
                        withArrow
                      >
                        <IconInfoCircle size={14} style={{ color: "var(--mantine-color-dimmed)" }} />
                      </Tooltip>
                    )}
                  </Group>
                  <Badge variant="light" color="blue" size="xs" circle>
                    {getSubcategoryCount(cat.id!)}
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
                      onEdit(cat);
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
                      if (confirm("Kategorie löschen?")) onDelete(cat.id!);
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
    </Card>
  );
};
