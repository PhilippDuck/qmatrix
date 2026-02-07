import React, { useMemo, useRef, useEffect } from "react";
import { Tree, TreeNode } from "react-organizational-chart";
import {
  Paper,
  Text,
  Stack,
  Box,
  useMantineColorScheme,
  Badge,
  Group,
  Tooltip,
  ThemeIcon,
  ActionIcon,
  Divider,
  Menu,
} from "@mantine/core";
import {
  IconTags,
  IconCategory,
  IconBulb,
  IconPlus,
  IconUserShield,
  IconSitemap,
  IconDotsVertical,
  IconCopy,
  IconScissors,
  IconClipboard,
  IconPencil,
} from "@tabler/icons-react";
import {
  Skill,
  Category,
  SubCategory,
  EmployeeRole,
} from "../../services/indexeddb";

// ----------------------------------------------------------------------------
// Types
// ----------------------------------------------------------------------------

export interface ClipboardItem {
  type: "skill" | "subcategory";
  id: string;
  data: any; // Skill or SubCategory object
  mode: "cut" | "copy";
}

interface HierarchyNode {
  type: "root" | "category" | "subcategory" | "skill";
  id: string;
  name: string;
  description?: string;
  children: HierarchyNode[];
  data?: any;
  isAddNode?: boolean;
  parentId?: string;
}

interface SkillOrgChartProps {
  categories: Category[];
  subcategories: SubCategory[];
  skills: Skill[];
  roles?: EmployeeRole[];
  projectTitle?: string;
  onEditCategory?: (category: Category) => void;
  onEditSubCategory?: (subcategory: SubCategory) => void;
  onEditSkill?: (skill: Skill) => void;
  onAddCategory?: () => void;
  onAddSubCategory?: (categoryId: string, parentSubId?: string) => void;
  onAddSkill?: (subcategoryId: string) => void;
  // Clipboard Props
  clipboardItem?: ClipboardItem | null;
  onCopy?: (item: ClipboardItem) => void;
  onCut?: (item: ClipboardItem) => void;
  onPaste?: (targetId: string, targetType: "category" | "subcategory") => void;
}

// ----------------------------------------------------------------------------
// Helper Components (Node Card)
// ----------------------------------------------------------------------------

const NodeCard: React.FC<{
  node: HierarchyNode;
  roles: EmployeeRole[];
  onClick?: () => void;
  clipboardItem?: ClipboardItem | null;
  onCopy?: (item: ClipboardItem) => void;
  onCut?: (item: ClipboardItem) => void;
  onPaste?: (targetId: string, targetType: "category" | "subcategory") => void;
}> = ({ node, roles, onClick, clipboardItem, onCopy, onCut, onPaste }) => {
  const { colorScheme } = useMantineColorScheme();
  const isDark = colorScheme === "dark";

  if (node.isAddNode) {
    return (
      <Tooltip label={node.name} withArrow>
        <ActionIcon
          variant="light"
          color="gray"
          radius="xl"
          size="lg"
          onClick={(e) => {
            e.stopPropagation();
            onClick && onClick();
          }}
          style={{ border: "1px dashed var(--mantine-color-gray-5)" }}
        >
          <IconPlus size={18} />
        </ActionIcon>
      </Tooltip>
    );
  }

  // Styles based on node type
  let cardWidth = 100;
  let icon = IconBulb;
  let color = "gray";
  let labelSize = "sm";

  switch (node.type) {
    case "root":
      cardWidth = 200;
      icon = IconSitemap;
      color = "indigo";
      labelSize = "md";
      break;
    case "category":
      cardWidth = 180;
      icon = IconCategory;
      color = "blue";
      labelSize = "sm";
      break;
    case "subcategory":
      cardWidth = 150;
      icon = IconTags;
      color = "cyan";
      labelSize = "xs";
      break;
    case "skill":
      cardWidth = 100;
      icon = IconBulb;
      color = "teal";
      labelSize = "xs";
      break;
  }

  const IconComponent = icon;

  // Find roles related to this node
  const relatedRoles =
    node.type === "skill" && node.data
      ? (roles || []).filter((r) =>
        (node.data as Skill).requiredByRoleIds?.includes(r.id!),
      )
      : [];

  // Check if this node is currently in clipboard (cut mode)
  const isCut =
    clipboardItem?.mode === "cut" &&
    clipboardItem.type === node.type &&
    clipboardItem.id === node.id;

  // Check if paste is valid here
  // Paste Skill -> into SubCategory
  // Paste SubCategory -> into Category
  const canPaste =
    clipboardItem &&
    ((clipboardItem.type === "skill" && node.type === "subcategory") ||
      (clipboardItem.type === "subcategory" && node.type === "category"));

  // Construct Tooltip Label
  const tooltipLabel = (
    <Stack gap="xs" p={4}>
      <Text size="xs" fw={700}>
        {node.name}
      </Text>
      {node.description && (
        <Text size="xs" c="dimmed" style={{ whiteSpace: "pre-wrap" }}>
          {node.description}
        </Text>
      )}

      {relatedRoles.length > 0 && (
        <>
          <Divider my={2} color="gray.7" />
          <Group gap={4}>
            <IconUserShield size={12} style={{ opacity: 0.8 }} />
            <Text size="xs" fw={600}>
              Benötigt von:
            </Text>
          </Group>
          <Stack gap={2}>
            {relatedRoles.map((r) => (
              <Text key={r.id} size="xs">
                • {r.name}
              </Text>
            ))}
          </Stack>
        </>
      )}
    </Stack>
  );

  const mainContent = (
    <Paper
      withBorder
      p="xs"
      shadow="sm"
      style={{
        width: cardWidth,
        cursor: node.type === "root" ? "default" : "pointer",
        display: "inline-block",
        backgroundColor: isDark ? "var(--mantine-color-dark-6)" : "white",
        borderColor: isDark
          ? "var(--mantine-color-dark-4)"
          : "var(--mantine-color-gray-4)",
        transition: "transform 0.2s, box-shadow 0.2s, opacity 0.2s",
        opacity: isCut ? 0.5 : 1,
      }}
      onMouseEnter={(e) => {
        if (node.type !== "root") {
          e.currentTarget.style.transform = "translateY(-2px)";
          e.currentTarget.style.boxShadow = "var(--mantine-shadow-md)";
        }
      }}
      onMouseLeave={(e) => {
        if (node.type !== "root") {
          e.currentTarget.style.transform = "translateY(0)";
          e.currentTarget.style.boxShadow = "var(--mantine-shadow-sm)";
        }
      }}
    >
      <Stack gap={6} align="center">
        <Group gap={4} wrap="nowrap" style={{ width: '100%', justifyContent: 'center', position: 'relative' }}>
          <ThemeIcon variant="light" color={color} size="lg" radius="md">
            <IconComponent size={20} />
          </ThemeIcon>

          {/* Menu Action Icon - absolute positioned or just next to it? Let's try absolute if possible, or just click to open menu? 
              User requested Context Menu. We can wrap the whole card in Menu Target if we want left click to open menu, 
              or use right click. For mobile/touch friendliness, a 3-dots icon is often better or just left click logic.
              
              Current logic: Left click calls onClick (Edit). 
              Let's add 3-dots for Menu.
          */}
        </Group>

        <Text fw={600} size={labelSize} style={{ lineHeight: 1.2 }}>
          {node.name || "Untitled"}
        </Text>

        {node.children.length > 0 && !node.children[0].isAddNode ? (
          <Badge variant="outline" color="gray" size="xs">
            {node.children.filter((c) => !c.isAddNode).length} items
          </Badge>
        ) : null}

        {relatedRoles.length > 0 && (
          <Group gap={4}>
            <IconUserShield size={12} color="var(--mantine-color-orange-5)" />
            <Text size="xs" c="dimmed">
              {relatedRoles.length}
            </Text>
          </Group>
        )}
      </Stack>
    </Paper>
  );

  // If root, just return card (no menu usually needed for root unless we want to paste categories into root?)
  // Requirement says: Paste SubCategory -> into Category. Paste Skill -> into SubCategory.
  // It doesn't mention moving Categories themselves.
  if (node.type === "root") return mainContent;

  return (
    <Menu shadow="md" width={200} withArrow position="bottom">
      <Menu.Target>
        {/* We wrap the Tooltip here so hovering still works, but clicking opens menu? 
            Or standard behavior: Click = Edit, Right Click = Menu?
            Simple solution: Add 3-dots icon to the card top-right. 
            Better: Wrapper div.
        */}
        <Box style={{ display: 'inline-block', position: 'relative' }}>
          <Tooltip
            label={tooltipLabel}
            multiline
            withArrow
            maw={300}
            transitionProps={{ transition: "pop", duration: 200 }}
          >
            {mainContent}
          </Tooltip>

          <ActionIcon
            variant="transparent"
            size="sm"
            color="gray"
            style={{ position: 'absolute', top: 2, right: 2, zIndex: 10 }}
            onClick={(e) => {
              // Open menu triggers automatically on Menu.Target click, but we want to prevent bubbling to Card onClick
              // e.stopPropagation(); -> Actually Menu.Target propagates click. 
              // This is tricky with Menu.Target wrapping the whole thing.
              // Let's use a custom Target.
            }}
          >
            <IconDotsVertical size={14} />
          </ActionIcon>
        </Box>
      </Menu.Target>

      <Menu.Dropdown>
        <Menu.Label>Aktionen</Menu.Label>
        <Menu.Item leftSection={<IconPencil size={14} />} onClick={() => onClick && onClick()}>
          Bearbeiten
        </Menu.Item>

        {/* Copy/Cut/Paste */}
        {(node.type === 'skill' || node.type === 'subcategory') && (
          <>
            <Menu.Divider />
            <Menu.Item
              leftSection={<IconScissors size={14} />}
              onClick={() => onCut && onCut({ type: node.type as any, id: node.id, data: node.data, mode: 'cut' })}
            >
              Ausschneiden
            </Menu.Item>
            <Menu.Item
              leftSection={<IconCopy size={14} />}
              onClick={() => onCopy && onCopy({ type: node.type as any, id: node.id, data: node.data, mode: 'copy' })}
            >
              Kopieren
            </Menu.Item>
          </>
        )}

        {canPaste && (
          <>
            <Menu.Divider />
            <Menu.Item
              leftSection={<IconClipboard size={14} />}
              color="blue"
              onClick={() => onPaste && onPaste(node.id, node.type as any)}
            >
              Einfügen ({clipboardItem.type === 'skill' ? 'Skill' : 'Bereich'})
            </Menu.Item>
          </>
        )}
      </Menu.Dropdown>
    </Menu>
  );
};

// ----------------------------------------------------------------------------
// Vertical Tree Renderer (Standard)
// ----------------------------------------------------------------------------

const RenderTreeNode: React.FC<{
  node: HierarchyNode;
  roles: EmployeeRole[];
  onNodeClick: (node: HierarchyNode) => void;
  clipboardItem?: ClipboardItem | null;
  onCopy?: (item: ClipboardItem) => void;
  onCut?: (item: ClipboardItem) => void;
  onPaste?: (targetId: string, targetType: "category" | "subcategory") => void;
}> = ({ node, roles, onNodeClick, clipboardItem, onCopy, onCut, onPaste }) => {
  return (
    <TreeNode
      label={
        <NodeCard
          node={node}
          roles={roles}
          onClick={() => onNodeClick(node)}
          clipboardItem={clipboardItem}
          onCopy={onCopy}
          onCut={onCut}
          onPaste={onPaste}
        />
      }
    >
      {node.children.map((child) => (
        <RenderTreeNode
          key={child.id}
          node={child}
          roles={roles}
          onNodeClick={onNodeClick}
          clipboardItem={clipboardItem}
          onCopy={onCopy}
          onCut={onCut}
          onPaste={onPaste}
        />
      ))}
    </TreeNode>
  );
};

// ----------------------------------------------------------------------------
// Main Component
// ----------------------------------------------------------------------------

const SkillOrgChart: React.FC<SkillOrgChartProps> = ({
  categories,
  subcategories,
  skills,
  roles = [],
  projectTitle = "Skill Matrix",
  onEditCategory,
  onEditSubCategory,
  onEditSkill,
  onAddCategory,
  onAddSubCategory,
  onAddSkill,
  clipboardItem,
  onCopy,
  onCut,
  onPaste,
}) => {
  const { colorScheme } = useMantineColorScheme();
  const isDark = colorScheme === "dark";
  const lineColor = isDark
    ? "var(--mantine-color-dark-4)"
    : "var(--mantine-color-gray-4)";
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Mouse Wheel Horizontal Scroll Logic
  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;

    const handleWheel = (evt: WheelEvent) => {
      if (evt.deltaY !== 0) {
        evt.preventDefault();
        container.scrollLeft += evt.deltaY;
      }
    };

    container.addEventListener("wheel", handleWheel, { passive: false });
    return () => container.removeEventListener("wheel", handleWheel);
  }, []);

  const trees = useMemo<HierarchyNode[]>(() => {

    // Recursive helper to build subcategory nodes and their children (subcategories and skills)
    const buildSubcategoryNode = (sc: SubCategory): HierarchyNode => {
      // 1. Find Child Subcategories
      const childSubcats = subcategories
        .filter(child => child.parentSubCategoryId === sc.id)
        .sort((a, b) => a.name.localeCompare(b.name, 'de'));

      // 2. Find Skills for this Subcategory
      const subSkills = skills.filter(s => s.subCategoryId === sc.id)
        .sort((a, b) => a.name.localeCompare(b.name, 'de'));

      const childrenNodes: HierarchyNode[] = [];

      // Add Child Subcategory Nodes (Recursive)
      childrenNodes.push(...childSubcats.map(child => buildSubcategoryNode(child)));

      // Add Skill Nodes
      childrenNodes.push(...subSkills.map(s => ({
        type: "skill" as const,
        id: s.id!,
        name: s.name,
        description: s.description,
        data: s,
        children: [],
      })));

      // Add "Add Subcategory" Node (Nested)
      if (onAddSubCategory) {
        childrenNodes.push({
          type: "subcategory" as const,
          id: `add-sub-${sc.id}-nested`,
          name: "Bereich hinzufügen",
          isAddNode: true,
          parentId: sc.id!, // This is the parent SubCategory ID
          data: { categoryId: sc.categoryId }, // Pass categoryId context if needed
          children: [],
        });
      }

      // Add "Add Skill" Node
      if (onAddSkill) {
        childrenNodes.push({
          type: "skill" as const,
          id: `add-skill-${sc.id}`,
          name: "Skill hinzufügen",
          isAddNode: true,
          parentId: sc.id!,
          children: [],
        });
      }

      return {
        type: "subcategory" as const,
        id: sc.id!,
        name: sc.name,
        description: sc.description,
        data: sc,
        children: childrenNodes,
      };
    };

    const categoryNodes: HierarchyNode[] = categories.map((cat) => {
      // Find Top-Level Subcategories for this Category
      const topLevelSubcats = subcategories
        .filter((sc) => sc.categoryId === cat.id && !sc.parentSubCategoryId)
        .sort((a, b) => a.name.localeCompare(b.name, 'de'));

      const children: HierarchyNode[] = topLevelSubcats.map((sc) => buildSubcategoryNode(sc));

      if (onAddSubCategory) {
        children.push({
          type: "subcategory" as const,
          id: `add-sub-${cat.id}`,
          name: "Bereich hinzufügen",
          isAddNode: true,
          parentId: cat.id!, // This is the Category ID
          children: [],
        });
      }

      return {
        type: "category" as const,
        id: cat.id!,
        name: cat.name,
        description: cat.description,
        data: cat,
        children,
      };
    });

    if (onAddCategory) {
      categoryNodes.push({
        type: "category" as const,
        id: "add-root-category",
        name: "Kategorie hinzufügen",
        isAddNode: true,
        children: [],
      });
    }

    const rootNode: HierarchyNode = {
      type: "root" as const,
      id: "root-project",
      name: projectTitle,
      children: categoryNodes,
    };

    return [rootNode];
  }, [
    categories,
    subcategories,
    skills,
    projectTitle,
    onAddCategory,
    onAddSubCategory,
    onAddSkill,
  ]);

  const handleNodeClick = (node: HierarchyNode) => {
    if (node.isAddNode) {
      if (node.id === "add-root-category" && onAddCategory) onAddCategory();
      else if (node.id.startsWith("add-sub") && onAddSubCategory && node.parentId) {
        // Distinguish between adding to category (top level) or subcategory (nested)
        if (node.id.includes("nested")) {
          // Parent ID is the SubCategory ID
          // We need the Category ID too. We passed it in `data`.
          const catId = node.data?.categoryId;
          // If catId is missing we can't proceed easily, but we should have it.
          if (catId) onAddSubCategory(catId, node.parentId);
        } else {
          // Parent ID is the Category ID (Top Level)
          onAddSubCategory(node.parentId);
        }
      }
      else if (node.id.startsWith("add-skill") && onAddSkill && node.parentId)
        onAddSkill(node.parentId);
      return;
    }

    if (node.type === "category" && onEditCategory) onEditCategory(node.data);
    if (node.type === "subcategory" && onEditSubCategory)
      onEditSubCategory(node.data);
    if (node.type === "skill" && onEditSkill) onEditSkill(node.data);
  };

  return (
    <Box
      ref={scrollContainerRef}
      p="md"
      style={
        {
          overflowX: "auto",
          overflowY: "hidden",
          textAlign: "center",
          "--tree-line-color": lineColor,
          cursor: "grab",
          height: "100%",
          maxHeight: "100%",
        } as React.CSSProperties
      }
    >
      <style>
        {`
                  .rst__lineBlock {
                    stroke: ${lineColor} !important;
                  }
                  ul[role="group"] {
                    padding-inline-start: 0;
                  }
                  ul[role="group"]::before {
                    border-left-color: ${lineColor} !important;
                  }
                  li[role="treeitem"]::before,
                  li[role="treeitem"]::after {
                    border-color: ${lineColor} !important;
                  }
                `}
      </style>

      {trees.map((tree) => (
        <Box
          key={tree.id}
          mb="xxl"
          style={{
            display: "inline-block",
            minWidth: "100%",
            verticalAlign: "top",
          }}
        >
          <Tree
            lineWidth="2px"
            lineColor={lineColor}
            lineBorderRadius="10px"
            label={
              <NodeCard
                node={tree}
                roles={roles}
                onClick={() => handleNodeClick(tree)}
                clipboardItem={clipboardItem}
                onCopy={onCopy}
                onCut={onCut}
                onPaste={onPaste}
              />
            }
          >
            {tree.children.map((child) => (
              <RenderTreeNode
                key={child.id}
                node={child}
                roles={roles}
                onNodeClick={handleNodeClick}
                clipboardItem={clipboardItem}
                onCopy={onCopy}
                onCut={onCut}
                onPaste={onPaste}
              />
            ))}
          </Tree>
        </Box>
      ))}
    </Box>
  );
};

export default SkillOrgChart;
