import React from "react";
import { Tree, TreeNode } from "react-organizational-chart";
import { Paper, Text, ThemeIcon, Stack, Box, useMantineColorScheme, Badge, Group, Tooltip, Divider, Avatar } from "@mantine/core";
import { IconBulb, IconUsers } from "@tabler/icons-react";
import { EmployeeRole, Skill, Employee } from "../../services/indexeddb";
import { getIconByName } from "../shared/RoleIconPicker";
import { usePrivacy } from "../../context/PrivacyContext";

interface RoleOrgChartProps {
    roles: EmployeeRole[];
    skills: Skill[];
    employees: Employee[];
    onRoleClick?: (role: EmployeeRole) => void;
}

interface RoleNode {
    role: EmployeeRole;
    children: RoleNode[];
}

// Helper to get all inherited role IDs (including the role itself)
const getInheritedRoleIds = (roleId: string, roles: EmployeeRole[]): string[] => {
    const result: string[] = [roleId];
    const role = roles.find(r => r.id === roleId);

    if (role?.inheritsFromId) {
        const parentIds = getInheritedRoleIds(role.inheritsFromId, roles);
        result.push(...parentIds);
    }

    return result;
};

// Get skills for a role (including inherited skills)
const getSkillsForRole = (roleId: string, roles: EmployeeRole[], skills: Skill[]): Skill[] => {
    const inheritedRoleIds = getInheritedRoleIds(roleId, roles);

    return skills.filter(skill =>
        skill.requiredByRoleIds?.some(id => inheritedRoleIds.includes(id))
    );
};

// Get only directly assigned skills (not inherited)
const getDirectSkillsForRole = (roleId: string, skills: Skill[]): Skill[] => {
    return skills.filter(skill =>
        skill.requiredByRoleIds?.includes(roleId)
    );
};

const RoleCard: React.FC<{
    role: EmployeeRole;
    roles: EmployeeRole[];
    skills: Skill[];
    employees: Employee[];
    isRoot?: boolean;
    onClick?: () => void;
}> = ({ role, roles, skills, employees, isRoot, onClick }) => {
    const { colorScheme } = useMantineColorScheme();
    const { anonymizeName, anonymizeInitials } = usePrivacy();
    const isDark = colorScheme === 'dark';

    const directSkills = getDirectSkillsForRole(role.id!, skills);
    const allSkills = getSkillsForRole(role.id!, roles, skills);
    const inheritedSkillCount = allSkills.length - directSkills.length;

    // Find employees with this role
    const roleEmployees = employees.filter(emp => emp.role === role.name);

    return (
        <Tooltip
            label={
                <Stack gap={4}>
                    <Text size="xs" fw={700}>{role.name}</Text>
                    <Divider my={4} />

                    {roleEmployees.length > 0 && (
                        <>
                            <Text size="xs" c="dimmed">Mitarbeiter:</Text>
                            {roleEmployees.slice(0, 5).map(emp => (
                                <Text key={emp.id} size="xs">• {anonymizeName(emp.name, emp.id)}</Text>
                            ))}
                            {roleEmployees.length > 5 && (
                                <Text size="xs" c="dimmed">... +{roleEmployees.length - 5} weitere</Text>
                            )}
                        </>
                    )}

                    {allSkills.length > 0 && (
                        <>
                            {roleEmployees.length > 0 && <Divider my={4} />}
                            <Text size="xs" c="dimmed">Skills ({allSkills.length}):</Text>
                            {directSkills.slice(0, 5).map(skill => (
                                <Text key={skill.id} size="xs">• {skill.name}</Text>
                            ))}
                            {directSkills.length > 5 && (
                                <Text size="xs" c="dimmed">... +{directSkills.length - 5} weitere</Text>
                            )}
                            {inheritedSkillCount > 0 && (
                                <Text size="xs" c="dimmed" mt={4}>+ {inheritedSkillCount} geerbt</Text>
                            )}
                        </>
                    )}

                    {roleEmployees.length === 0 && allSkills.length === 0 && (
                        <Text size="xs" c="dimmed">Keine Mitarbeiter oder Skills zugewiesen</Text>
                    )}
                </Stack>
            }
            multiline
            w={220}
            withArrow
            position="right"
        >
            <Paper
                shadow="sm"
                p="xs"
                radius="md"
                withBorder
                style={{
                    display: 'inline-block',
                    cursor: onClick ? 'pointer' : 'default',
                    backgroundColor: isDark
                        ? 'var(--mantine-color-dark-6)'
                        : 'white',
                    transition: 'transform 0.15s ease, box-shadow 0.15s ease',
                    minWidth: 120,
                }}
                onClick={onClick}
                onMouseEnter={(e) => {
                    if (onClick) {
                        e.currentTarget.style.transform = 'scale(1.05)';
                        e.currentTarget.style.boxShadow = 'var(--mantine-shadow-md)';
                    }
                }}
                onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'scale(1)';
                    e.currentTarget.style.boxShadow = '';
                }}
            >
                <Stack gap={4} align="center">
                    {(() => {
                        const RoleIcon = getIconByName(role.icon);
                        return (
                            <ThemeIcon
                                size="sm"
                                variant="light"
                                color="gray"
                                radius="xl"
                            >
                                <RoleIcon size={12} />
                            </ThemeIcon>
                        );
                    })()}
                    <Text size="xs" fw={600} ta="center" style={{ maxWidth: 100 }}>
                        {role.name}
                    </Text>

                    {roleEmployees.length > 0 && (
                        <Tooltip.Group>
                            <Avatar.Group spacing="xs">
                                {roleEmployees.slice(0, 3).map(emp => (
                                    <Tooltip key={emp.id} label={anonymizeName(emp.name, emp.id)} withArrow>
                                        <Avatar size="xs" radius="xl" color="blue">
                                            {anonymizeInitials(emp.name, emp.id)}
                                        </Avatar>
                                    </Tooltip>
                                ))}
                                {roleEmployees.length > 3 && (
                                    <Avatar size="xs" radius="xl" color="gray">
                                        +{roleEmployees.length - 3}
                                    </Avatar>
                                )}
                            </Avatar.Group>
                        </Tooltip.Group>
                    )}

                    {allSkills.length > 0 && (
                        <Group gap={4} wrap="nowrap">
                            <Badge
                                size="xs"
                                variant="light"
                                color="teal"
                                leftSection={<IconBulb size={10} />}
                            >
                                {allSkills.length} Skills
                            </Badge>
                        </Group>
                    )}
                </Stack>
            </Paper>
        </Tooltip>
    );
};

const buildTree = (roles: EmployeeRole[]): RoleNode[] => {
    // Find root roles (roles that don't inherit from anyone)
    const roleMap = new Map<string, RoleNode>();

    // Initialize all nodes
    roles.forEach(role => {
        roleMap.set(role.id!, { role, children: [] });
    });

    const roots: RoleNode[] = [];

    // Build tree structure
    roles.forEach(role => {
        const node = roleMap.get(role.id!)!;

        if (role.inheritsFromId) {
            const parent = roleMap.get(role.inheritsFromId);
            if (parent) {
                parent.children.push(node);
            } else {
                // Parent not found, treat as root
                roots.push(node);
            }
        } else {
            roots.push(node);
        }
    });

    return roots;
};

const RenderTreeNode: React.FC<{
    node: RoleNode;
    roles: EmployeeRole[];
    skills: Skill[];
    employees: Employee[];
    onRoleClick?: (role: EmployeeRole) => void;
    isRoot?: boolean;
}> = ({ node, roles, skills, employees, onRoleClick, isRoot }) => {
    if (node.children.length === 0) {
        return (
            <TreeNode
                label={
                    <RoleCard
                        role={node.role}
                        roles={roles}
                        skills={skills}
                        employees={employees}
                        isRoot={isRoot}
                        onClick={onRoleClick ? () => onRoleClick(node.role) : undefined}
                    />
                }
            />
        );
    }

    return (
        <TreeNode
            label={
                <RoleCard
                    role={node.role}
                    roles={roles}
                    skills={skills}
                    employees={employees}
                    isRoot={isRoot}
                    onClick={onRoleClick ? () => onRoleClick(node.role) : undefined}
                />
            }
        >
            {node.children.map(child => (
                <RenderTreeNode
                    key={child.role.id}
                    node={child}
                    roles={roles}
                    skills={skills}
                    employees={employees}
                    onRoleClick={onRoleClick}
                />
            ))}
        </TreeNode>
    );
};

export const RoleOrgChart: React.FC<RoleOrgChartProps> = ({ roles, skills, employees, onRoleClick }) => {
    const { colorScheme } = useMantineColorScheme();
    const isDark = colorScheme === 'dark';
    const trees = buildTree(roles);

    if (roles.length === 0) {
        return (
            <Box p="xl" ta="center">
                <Text c="dimmed" fs="italic">
                    Keine Rollen vorhanden
                </Text>
            </Box>
        );
    }

    // Custom line color based on theme
    const lineColor = isDark ? 'var(--mantine-color-dark-4)' : 'var(--mantine-color-gray-4)';

    return (
        <Box
            p="md"
            style={{
                overflowX: 'auto',
                // Override react-organizational-chart default styles
                '--tree-line-color': lineColor,
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

            {trees.map((tree, index) => (
                <Box key={tree.role.id || index} mb="lg" style={{ display: 'inline-block', minWidth: '100%' }}>
                    <Tree
                        lineWidth="2px"
                        lineColor={lineColor}
                        lineBorderRadius="8px"
                        label={
                            <RoleCard
                                role={tree.role}
                                roles={roles}
                                skills={skills}
                                employees={employees}
                                isRoot
                                onClick={onRoleClick ? () => onRoleClick(tree.role) : undefined}
                            />
                        }
                    >
                        {tree.children.map(child => (
                            <RenderTreeNode
                                key={child.role.id}
                                node={child}
                                roles={roles}
                                skills={skills}
                                employees={employees}
                                onRoleClick={onRoleClick}
                            />
                        ))}
                    </Tree>
                </Box>
            ))}
        </Box>
    );
};
