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
  onAddNested: (parentId: string) => void;
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
  onAddNested,
}) => {

  const renderSubcategoryRow = (sub: SubCategory, depth: number = 0) => {
    return (
      <React.Fragment key={sub.id}>
        <Table.Tr
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
          <Table.Td style={{ paddingLeft: `${16 + depth * 24}px` }}>
            <Group justify="space-between" wrap="nowrap">
              <Group gap="xs">
                {depth > 0 && (
                  <IconArrowRight size={14} style={{ color: "var(--mantine-color-dimmed)" }} />
                )}
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
          <Table.Td style={{ width: 100 }}>
            <Group gap={4} justify="flex-end">
              <ActionIcon
                size="sm"
                variant="subtle"
                color="blue"
                title="Untergruppe hinzufügen"
                onClick={(e) => {
                  e.stopPropagation();
                  onAddNested(sub.id!);
                }}
              >
                <IconPlus size={14} />
              </ActionIcon>
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
        {/* Render Children */}
        {subcategories
          .filter(child => child.parentSubCategoryId === sub.id)
          .sort((a, b) => a.name.localeCompare(b.name, 'de'))
          .map(child => renderSubcategoryRow(child, depth + 1))}
      </React.Fragment>
    );
  };

  const renderTree = (allSubs: SubCategory[]) => {
    // Find top-level items (either no parent, or parent not in this list - e.g. root of category)
    // For simplicity, we assume if parent is not in the list (filtered by category), it is top level for this view.
    // However, if we filter by category, all parents SHOULD be in the list unless data is inconsistent.
    // Safest bet: items where `parentSubCategoryId` is undefined/null.
    // What if we have cross-category nesting? Current model discourages it, but if it exists?
    // Let's assume strict Category containment.

    // items with no parent OR parent is not in the current list
    const topLevel = allSubs.filter(s => !s.parentSubCategoryId || !allSubs.find(p => p.id === s.parentSubCategoryId));

    return topLevel
      .sort((a, b) => a.name.localeCompare(b.name, 'de'))
      .map(root => renderSubcategoryRow(root));
  };

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
            {renderTree(subcategories)}
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
