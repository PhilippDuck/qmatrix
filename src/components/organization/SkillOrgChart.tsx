import React, { useMemo, useRef, useEffect } from "react";
import { Tree, TreeNode } from "react-organizational-chart";
import { Paper, Text, Stack, Box, useMantineColorScheme, Badge, Group, Tooltip, ThemeIcon, ActionIcon, Divider } from "@mantine/core";
import { IconTags, IconCategory, IconBulb, IconPlus, IconUserShield, IconSitemap } from "@tabler/icons-react";
import { Skill, Category, SubCategory, EmployeeRole } from "../../services/indexeddb";

// ----------------------------------------------------------------------------
// Types
// ----------------------------------------------------------------------------

interface HierarchyNode {
    type: 'root' | 'category' | 'subcategory' | 'skill';
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
    onAddSubCategory?: (categoryId: string) => void;
    onAddSkill?: (subcategoryId: string) => void;
}

// ----------------------------------------------------------------------------
// Helper Components (Node Card)
// ----------------------------------------------------------------------------

const NodeCard: React.FC<{
    node: HierarchyNode;
    roles: EmployeeRole[];
    onClick?: () => void;
}> = ({ node, roles, onClick }) => {
    const { colorScheme } = useMantineColorScheme();
    const isDark = colorScheme === 'dark';

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
                    style={{ border: '1px dashed var(--mantine-color-gray-5)' }}
                >
                    <IconPlus size={18} />
                </ActionIcon>
            </Tooltip>
        );
    }

    // Styles based on node type
    let cardWidth = 220;
    let icon = IconBulb;
    let color = 'gray';
    let labelSize = 'sm';

    switch (node.type) {
        case 'root':
            cardWidth = 260;
            icon = IconSitemap;
            color = 'indigo';
            labelSize = 'md';
            break;
        case 'category':
            cardWidth = 240;
            icon = IconCategory;
            color = 'blue';
            labelSize = 'sm';
            break;
        case 'subcategory':
            cardWidth = 200;
            icon = IconTags;
            color = 'cyan';
            labelSize = 'xs';
            break;
        case 'skill':
            cardWidth = 180;
            icon = IconBulb;
            color = 'teal';
            labelSize = 'xs';
            break;
    }

    const IconComponent = icon;

    // Find roles related to this node
    const relatedRoles = (node.type === 'skill' && node.data)
        ? (roles || []).filter(r => (node.data as Skill).requiredByRoleIds?.includes(r.id!))
        : [];

    // Construct Tooltip Label
    const tooltipLabel = (
        <Stack gap="xs" p={4}>
            <Text size="xs" fw={700}>{node.name}</Text>
            {node.description && <Text size="xs" c="dimmed" style={{ whiteSpace: 'pre-wrap' }}>{node.description}</Text>}

            {relatedRoles.length > 0 && (
                <>
                    <Divider my={2} color="gray.7" />
                    <Group gap={4}>
                        <IconUserShield size={12} style={{ opacity: 0.8 }} />
                        <Text size="xs" fw={600}>Benötigt von:</Text>
                    </Group>
                    <Stack gap={2}>
                        {relatedRoles.map(r => (
                            <Text key={r.id} size="xs">• {r.name}</Text>
                        ))}
                    </Stack>
                </>
            )}
        </Stack>
    );

    return (
        <Tooltip
            label={tooltipLabel}
            multiline
            withArrow
            maw={300}
            disabled={node.type === 'root' && !node.description}
            transitionProps={{ transition: 'pop', duration: 200 }}
        >
            <Paper
                withBorder
                p="xs"
                shadow="sm"
                onClick={(e) => {
                    e.stopPropagation();
                    onClick && onClick();
                }}
                style={{
                    width: cardWidth,
                    cursor: node.type === 'root' ? 'default' : 'pointer',
                    display: 'inline-block',
                    backgroundColor: isDark ? 'var(--mantine-color-dark-6)' : 'white',
                    borderColor: isDark ? 'var(--mantine-color-dark-4)' : 'var(--mantine-color-gray-4)',
                    transition: 'transform 0.2s, box-shadow 0.2s',
                }}
                onMouseEnter={(e) => {
                    if (node.type !== 'root') {
                        e.currentTarget.style.transform = 'translateY(-2px)';
                        e.currentTarget.style.boxShadow = 'var(--mantine-shadow-md)';
                    }
                }}
                onMouseLeave={(e) => {
                    if (node.type !== 'root') {
                        e.currentTarget.style.transform = 'translateY(0)';
                        e.currentTarget.style.boxShadow = 'var(--mantine-shadow-sm)';
                    }
                }}
            >
                <Stack gap={6} align="center">
                    <ThemeIcon variant="light" color={color} size="lg" radius="md">
                        <IconComponent size={20} />
                    </ThemeIcon>

                    <Text fw={600} size={labelSize} style={{ lineHeight: 1.2 }}>
                        {node.name || "Untitled"}
                    </Text>

                    {node.children.length > 0 && !node.children[0].isAddNode ? (
                        <Badge variant="outline" color="gray" size="xs">
                            {node.children.filter(c => !c.isAddNode).length} items
                        </Badge>
                    ) : null}

                    {relatedRoles.length > 0 && (
                        <Group gap={4}>
                            <IconUserShield size={12} color="var(--mantine-color-orange-5)" />
                            <Text size="xs" c="dimmed">{relatedRoles.length}</Text>
                        </Group>
                    )}
                </Stack>
            </Paper>
        </Tooltip>
    );
};

// ----------------------------------------------------------------------------
// Vertical Tree Renderer (Standard)
// ----------------------------------------------------------------------------

const RenderTreeNode: React.FC<{
    node: HierarchyNode;
    roles: EmployeeRole[];
    onNodeClick: (node: HierarchyNode) => void;
}> = ({ node, roles, onNodeClick }) => {
    return (
        <TreeNode
            label={
                <NodeCard
                    node={node}
                    roles={roles}
                    onClick={() => onNodeClick(node)}
                />
            }
        >
            {node.children.map(child => (
                <RenderTreeNode
                    key={child.id}
                    node={child}
                    roles={roles}
                    onNodeClick={onNodeClick}
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
    onAddSkill
}) => {
    const { colorScheme } = useMantineColorScheme();
    const isDark = colorScheme === 'dark';
    const lineColor = isDark ? 'var(--mantine-color-dark-4)' : 'var(--mantine-color-gray-4)';
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

        container.addEventListener('wheel', handleWheel, { passive: false });
        return () => container.removeEventListener('wheel', handleWheel);
    }, []);

    const trees = useMemo<HierarchyNode[]>(() => {
        const categoryNodes = categories.map(cat => {
            const catSubcategories = subcategories.filter(sc => sc.categoryId === cat.id);

            const children: HierarchyNode[] = catSubcategories.map(sc => {
                const subSkills = skills.filter(s => s.subCategoryId === sc.id);

                const skillNodes: HierarchyNode[] = subSkills.map(s => ({
                    type: 'skill' as const,
                    id: s.id!,
                    name: s.name,
                    description: s.description,
                    data: s,
                    children: []
                }));

                if (onAddSkill) {
                    skillNodes.push({
                        type: 'skill' as const,
                        id: `add-skill-${sc.id}`,
                        name: 'Skill hinzufügen',
                        isAddNode: true,
                        parentId: sc.id!,
                        children: []
                    });
                }

                return {
                    type: 'subcategory' as const,
                    id: sc.id!,
                    name: sc.name,
                    description: sc.description,
                    data: sc,
                    children: skillNodes
                };
            });

            if (onAddSubCategory) {
                children.push({
                    type: 'subcategory' as const,
                    id: `add-sub-${cat.id}`,
                    name: 'Bereich hinzufügen',
                    isAddNode: true,
                    parentId: cat.id!,
                    children: []
                });
            }

            return {
                type: 'category' as const,
                id: cat.id!,
                name: cat.name,
                description: cat.description,
                data: cat,
                children
            };
        });

        if (onAddCategory) {
            categoryNodes.push({
                type: 'category' as const,
                id: 'add-root-category',
                name: 'Kategorie hinzufügen',
                isAddNode: true,
                children: []
            });
        }

        const rootNode: HierarchyNode = {
            type: 'root' as const,
            id: 'root-project',
            name: projectTitle,
            children: categoryNodes
        };

        return [rootNode];
    }, [categories, subcategories, skills, projectTitle, onAddCategory, onAddSubCategory, onAddSkill]);

    const handleNodeClick = (node: HierarchyNode) => {
        if (node.isAddNode) {
            if (node.id === 'add-root-category' && onAddCategory) onAddCategory();
            else if (node.id.startsWith('add-sub') && onAddSubCategory && node.parentId) onAddSubCategory(node.parentId);
            else if (node.id.startsWith('add-skill') && onAddSkill && node.parentId) onAddSkill(node.parentId);
            return;
        }

        if (node.type === 'category' && onEditCategory) onEditCategory(node.data);
        if (node.type === 'subcategory' && onEditSubCategory) onEditSubCategory(node.data);
        if (node.type === 'skill' && onEditSkill) onEditSkill(node.data);
    };

    return (
        <Box
            ref={scrollContainerRef}
            p="md"
            style={{
                overflowX: 'auto',
                overflowY: 'hidden',
                textAlign: 'center',
                '--tree-line-color': lineColor,
                cursor: 'grab',
                height: '100%',
                maxHeight: '100%'
            } as React.CSSProperties}
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

            {trees.map(tree => (
                <Box key={tree.id} mb="xxl" style={{ display: 'inline-block', minWidth: '100%', verticalAlign: 'top' }}>
                    <Tree
                        lineWidth="2px"
                        lineColor={lineColor}
                        lineBorderRadius="10px"
                        label={
                            <NodeCard
                                node={tree}
                                roles={roles}
                                onClick={() => handleNodeClick(tree)}
                            />
                        }
                    >
                        {tree.children.map(child => (
                            <RenderTreeNode
                                key={child.id}
                                node={child}
                                roles={roles}
                                onNodeClick={handleNodeClick}
                            />
                        ))}
                    </Tree>
                </Box>
            ))}
        </Box>
    );
};

export default SkillOrgChart;
