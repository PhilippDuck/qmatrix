import React, { useMemo } from "react";
import {
    Card,
    SimpleGrid,
    Text,
    Group,
    Stack,
    Title,
    ThemeIcon,
    Progress,
    Badge,
    Paper,
    Box,
    RingProgress,
    Divider,
    Avatar,
    Tooltip,
    useMantineColorScheme,
} from "@mantine/core";
import {
    IconUsers,
    IconBulb,
    IconTarget,
    IconTrendingUp,
    IconTrendingDown,
    IconChartBar,
    IconCrown,
    IconAlertTriangle,
    IconBuildingSkyscraper,
    IconBadge,
} from "@tabler/icons-react";
import { useData } from "../../context/DataContext";
import { getScoreColor } from "../../utils/skillCalculations";
import { getIconByName } from "../shared/RoleIconPicker";

interface StatCardProps {
    title: string;
    value: string | number;
    subtitle?: string;
    icon: React.ReactNode;
    color: string;
    trend?: {
        value: number;
        label: string;
    };
}

const StatCard: React.FC<StatCardProps> = ({ title, value, subtitle, icon, color, trend }) => {
    const { colorScheme } = useMantineColorScheme();
    const isDark = colorScheme === 'dark';

    return (
        <Card withBorder radius="md" p="md" style={{ height: '100%' }}>
            <Group justify="space-between" align="flex-start">
                <Box>
                    <Text size="xs" c="dimmed" tt="uppercase" fw={700}>
                        {title}
                    </Text>
                    <Text size="xl" fw={700} mt={4}>
                        {value}
                    </Text>
                    {subtitle && (
                        <Text size="xs" c="dimmed" mt={2}>
                            {subtitle}
                        </Text>
                    )}
                    {trend && (
                        <Group gap={4} mt={8}>
                            {trend.value >= 0 ? (
                                <IconTrendingUp size={14} color="var(--mantine-color-teal-6)" />
                            ) : (
                                <IconTrendingDown size={14} color="var(--mantine-color-red-6)" />
                            )}
                            <Text size="xs" c={trend.value >= 0 ? "teal" : "red"}>
                                {trend.value >= 0 ? "+" : ""}{trend.value}% {trend.label}
                            </Text>
                        </Group>
                    )}
                </Box>
                <ThemeIcon
                    size={48}
                    radius="md"
                    variant="light"
                    color={color}
                >
                    {icon}
                </ThemeIcon>
            </Group>
        </Card>
    );
};

export const Dashboard: React.FC = () => {
    const {
        employees,
        skills,
        assessments,
        categories,
        subcategories,
        departments,
        roles
    } = useData();
    const { colorScheme } = useMantineColorScheme();
    const isDark = colorScheme === 'dark';

    // Calculate global KPIs
    const kpis = useMemo(() => {
        // Average expertise across all employees
        const employeeAverages = employees.map(emp => {
            const empAssessments = assessments.filter(a => a.employeeId === emp.id && a.level > 0);
            if (empAssessments.length === 0) return null;
            const avg = empAssessments.reduce((sum, a) => sum + a.level, 0) / empAssessments.length;
            return { employee: emp, avg };
        }).filter(Boolean) as { employee: typeof employees[0]; avg: number }[];

        const globalAverage = employeeAverages.length > 0
            ? Math.round(employeeAverages.reduce((sum, e) => sum + e.avg, 0) / employeeAverages.length)
            : 0;

        // Active skills (skills that have at least one assessment > 0)
        const activeSkillIds = new Set(assessments.filter(a => a.level > 0).map(a => a.skillId));
        const activeSkillCount = activeSkillIds.size;

        // Total XP (sum of all assessments)
        const totalXP = assessments.reduce((sum, a) => sum + a.level, 0);

        // Goal fulfillment
        const assessmentsWithTargets = assessments.filter(a => a.targetLevel && a.targetLevel > 0);
        const achievedTargets = assessmentsWithTargets.filter(a => a.level >= (a.targetLevel || 0));
        const goalFulfillment = assessmentsWithTargets.length > 0
            ? Math.round((achievedTargets.length / assessmentsWithTargets.length) * 100)
            : 0;

        // Top performers
        const topPerformers = employeeAverages
            .sort((a, b) => b.avg - a.avg)
            .slice(0, 5);

        // Skills with biggest gaps
        const skillGaps = skills.map(skill => {
            const skillAssessments = assessments.filter(a => a.skillId === skill.id && a.targetLevel && a.targetLevel > 0);
            if (skillAssessments.length === 0) return null;

            const totalGap = skillAssessments.reduce((sum, a) => sum + ((a.targetLevel || 0) - a.level), 0);
            const avgGap = totalGap / skillAssessments.length;

            return { skill, avgGap, count: skillAssessments.length };
        }).filter(Boolean) as { skill: typeof skills[0]; avgGap: number; count: number }[];

        const biggestGaps = skillGaps
            .filter(g => g.avgGap > 0)
            .sort((a, b) => b.avgGap - a.avgGap)
            .slice(0, 5);

        // Department stats
        const departmentStats = departments.map(dept => {
            const deptEmployees = employees.filter(e => e.department === dept.name);
            const deptAverages = deptEmployees.map(emp => {
                const empAssessments = assessments.filter(a => a.employeeId === emp.id && a.level > 0);
                if (empAssessments.length === 0) return 0;
                return empAssessments.reduce((sum, a) => sum + a.level, 0) / empAssessments.length;
            });
            const avgScore = deptAverages.length > 0
                ? Math.round(deptAverages.reduce((a, b) => a + b, 0) / deptAverages.length)
                : 0;
            return { department: dept, employeeCount: deptEmployees.length, avgScore };
        }).sort((a, b) => b.avgScore - a.avgScore);

        // Role distribution
        const roleDistribution = roles.map(role => {
            const count = employees.filter(e => e.role === role.name).length;
            return { role, count };
        }).filter(r => r.count > 0).sort((a, b) => b.count - a.count);

        // Category coverage
        const categoryStats = categories.map(cat => {
            const catSubcategories = subcategories.filter(s => s.categoryId === cat.id);
            const catSkillIds = skills
                .filter(s => catSubcategories.some(sub => sub.id === s.subCategoryId))
                .map(s => s.id);

            const catAssessments = assessments.filter(a => catSkillIds.includes(a.skillId) && a.level > 0);
            const avgLevel = catAssessments.length > 0
                ? Math.round(catAssessments.reduce((sum, a) => sum + a.level, 0) / catAssessments.length)
                : 0;

            return { category: cat, skillCount: catSkillIds.length, avgLevel };
        }).sort((a, b) => b.avgLevel - a.avgLevel);

        return {
            globalAverage,
            employeeCount: employees.length,
            skillCount: skills.length,
            activeSkillCount,
            totalXP,
            goalFulfillment,
            topPerformers,
            biggestGaps,
            departmentStats,
            roleDistribution,
            categoryStats,
        };
    }, [employees, skills, assessments, categories, subcategories, departments, roles]);

    return (
        <Stack gap="lg" p="md" style={{ height: '100%', overflow: 'auto' }}>
            <Title order={2}>Dashboard</Title>

            {/* Main Stats */}
            <SimpleGrid cols={{ base: 1, xs: 2, md: 4 }} spacing="md">
                <StatCard
                    title="Mitarbeiter"
                    value={kpis.employeeCount}
                    subtitle={`${departments.length} Abteilungen`}
                    icon={<IconUsers size={24} />}
                    color="blue"
                />
                <StatCard
                    title="Globale Expertise"
                    value={`${kpis.globalAverage}%`}
                    subtitle="Durchschnitt aller Mitarbeiter"
                    icon={<IconChartBar size={24} />}
                    color={kpis.globalAverage >= 50 ? "teal" : kpis.globalAverage >= 25 ? "yellow" : "red"}
                />
                <StatCard
                    title="Skills"
                    value={kpis.skillCount}
                    subtitle={`${kpis.activeSkillCount} aktiv genutzt`}
                    icon={<IconBulb size={24} />}
                    color="violet"
                />
                <StatCard
                    title="Zielerfüllung"
                    value={`${kpis.goalFulfillment}%`}
                    subtitle="Ziele erreicht"
                    icon={<IconTarget size={24} />}
                    color={kpis.goalFulfillment >= 70 ? "teal" : kpis.goalFulfillment >= 40 ? "yellow" : "red"}
                />
            </SimpleGrid>

            <SimpleGrid cols={{ base: 1, md: 2, lg: 3 }} spacing="md">
                {/* Top Performers */}
                <Card withBorder radius="md" p="md">
                    <Group justify="space-between" mb="md">
                        <Text fw={700} size="sm">
                            <Group gap={8}>
                                <IconCrown size={16} color="var(--mantine-color-yellow-6)" />
                                Top Performer
                            </Group>
                        </Text>
                    </Group>
                    <Stack gap="sm">
                        {kpis.topPerformers.length > 0 ? (
                            kpis.topPerformers.map((item, index) => (
                                <Group key={item.employee.id} justify="space-between">
                                    <Group gap="sm">
                                        <Avatar size="sm" radius="xl" color="blue">
                                            {item.employee.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                                        </Avatar>
                                        <Box>
                                            <Text size="sm" fw={500}>{item.employee.name}</Text>
                                            <Text size="xs" c="dimmed">{item.employee.department}</Text>
                                        </Box>
                                    </Group>
                                    <Badge color={getScoreColor(Math.round(item.avg))} variant="light">
                                        {Math.round(item.avg)}%
                                    </Badge>
                                </Group>
                            ))
                        ) : (
                            <Text size="sm" c="dimmed" ta="center">Keine Daten vorhanden</Text>
                        )}
                    </Stack>
                </Card>

                {/* Biggest Skill Gaps */}
                <Card withBorder radius="md" p="md">
                    <Group justify="space-between" mb="md">
                        <Text fw={700} size="sm">
                            <Group gap={8}>
                                <IconAlertTriangle size={16} color="var(--mantine-color-red-6)" />
                                Größte Skill-Gaps
                            </Group>
                        </Text>
                    </Group>
                    <Stack gap="sm">
                        {kpis.biggestGaps.length > 0 ? (
                            kpis.biggestGaps.map((item) => (
                                <Box key={item.skill.id}>
                                    <Group justify="space-between" mb={4}>
                                        <Text size="sm" fw={500} truncate style={{ maxWidth: 180 }}>
                                            {item.skill.name}
                                        </Text>
                                        <Badge color="red" variant="light" size="sm">
                                            -{Math.round(item.avgGap)}%
                                        </Badge>
                                    </Group>
                                    <Progress
                                        value={100 - item.avgGap}
                                        color="red"
                                        size="xs"
                                        radius="xl"
                                    />
                                </Box>
                            ))
                        ) : (
                            <Text size="sm" c="dimmed" ta="center">Keine Gaps vorhanden 🎉</Text>
                        )}
                    </Stack>
                </Card>

                {/* Department Overview */}
                <Card withBorder radius="md" p="md">
                    <Group justify="space-between" mb="md">
                        <Text fw={700} size="sm">
                            <Group gap={8}>
                                <IconBuildingSkyscraper size={16} />
                                Abteilungen
                            </Group>
                        </Text>
                    </Group>
                    <Stack gap="sm">
                        {kpis.departmentStats.length > 0 ? (
                            kpis.departmentStats.slice(0, 5).map((item) => (
                                <Group key={item.department.id} justify="space-between">
                                    <Box style={{ flex: 1 }}>
                                        <Text size="sm" fw={500}>{item.department.name}</Text>
                                        <Text size="xs" c="dimmed">{item.employeeCount} Mitarbeiter</Text>
                                    </Box>
                                    <RingProgress
                                        size={40}
                                        thickness={4}
                                        roundCaps
                                        sections={[{ value: item.avgScore, color: getScoreColor(item.avgScore) }]}
                                        label={
                                            <Text size="xs" ta="center" fw={700}>
                                                {item.avgScore}
                                            </Text>
                                        }
                                    />
                                </Group>
                            ))
                        ) : (
                            <Text size="sm" c="dimmed" ta="center">Keine Abteilungen vorhanden</Text>
                        )}
                    </Stack>
                </Card>

                {/* Role Distribution */}
                <Card withBorder radius="md" p="md">
                    <Group justify="space-between" mb="md">
                        <Text fw={700} size="sm">
                            <Group gap={8}>
                                <IconBadge size={16} />
                                Rollen-Verteilung
                            </Group>
                        </Text>
                    </Group>
                    <Stack gap="sm">
                        {kpis.roleDistribution.length > 0 ? (
                            kpis.roleDistribution.slice(0, 5).map((item) => {
                                const RoleIcon = getIconByName(item.role.icon);
                                const percentage = Math.round((item.count / employees.length) * 100);
                                return (
                                    <Box key={item.role.id}>
                                        <Group justify="space-between" mb={4}>
                                            <Group gap="xs">
                                                <RoleIcon size={14} />
                                                <Text size="sm" fw={500}>{item.role.name}</Text>
                                            </Group>
                                            <Text size="xs" c="dimmed">{item.count} ({percentage}%)</Text>
                                        </Group>
                                        <Progress
                                            value={percentage}
                                            color="blue"
                                            size="xs"
                                            radius="xl"
                                        />
                                    </Box>
                                );
                            })
                        ) : (
                            <Text size="sm" c="dimmed" ta="center">Keine Rollen zugewiesen</Text>
                        )}
                    </Stack>
                </Card>

                {/* Category Performance */}
                <Card withBorder radius="md" p="md" style={{ gridColumn: 'span 2' }}>
                    <Group justify="space-between" mb="md">
                        <Text fw={700} size="sm">
                            <Group gap={8}>
                                <IconTrendingUp size={16} />
                                Kategorie-Performance
                            </Group>
                        </Text>
                    </Group>
                    <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md">
                        {kpis.categoryStats.length > 0 ? (
                            kpis.categoryStats.map((item) => (
                                <Paper
                                    key={item.category.id}
                                    p="sm"
                                    radius="md"
                                    bg={isDark ? 'var(--mantine-color-dark-6)' : 'var(--mantine-color-gray-0)'}
                                >
                                    <Group justify="space-between" mb="xs">
                                        <Box style={{ flex: 1 }}>
                                            <Text size="sm" fw={600}>{item.category.name}</Text>
                                            <Text size="xs" c="dimmed">{item.skillCount} Skills</Text>
                                        </Box>
                                        <Text size="lg" fw={700} c={getScoreColor(item.avgLevel)}>
                                            {item.avgLevel}%
                                        </Text>
                                    </Group>
                                    <Progress
                                        value={item.avgLevel}
                                        color={getScoreColor(item.avgLevel)}
                                        size="sm"
                                        radius="xl"
                                    />
                                </Paper>
                            ))
                        ) : (
                            <Text size="sm" c="dimmed" ta="center">Keine Kategorien vorhanden</Text>
                        )}
                    </SimpleGrid>
                </Card>
            </SimpleGrid>

            {/* Summary Stats */}
            <Card withBorder radius="md" p="md">
                <Group justify="space-around" wrap="wrap">
                    <Box ta="center">
                        <Text size="xs" c="dimmed" tt="uppercase">Gesamt XP</Text>
                        <Text size="xl" fw={700} c="blue">{kpis.totalXP.toLocaleString()}</Text>
                    </Box>
                    <Divider orientation="vertical" />
                    <Box ta="center">
                        <Text size="xs" c="dimmed" tt="uppercase">Ø Skills/Mitarbeiter</Text>
                        <Text size="xl" fw={700}>
                            {employees.length > 0
                                ? Math.round(kpis.activeSkillCount / employees.length * 10) / 10
                                : 0}
                        </Text>
                    </Box>
                    <Divider orientation="vertical" />
                    <Box ta="center">
                        <Text size="xs" c="dimmed" tt="uppercase">Kategorien</Text>
                        <Text size="xl" fw={700}>{categories.length}</Text>
                    </Box>
                    <Divider orientation="vertical" />
                    <Box ta="center">
                        <Text size="xs" c="dimmed" tt="uppercase">Rollen</Text>
                        <Text size="xl" fw={700}>{roles.length}</Text>
                    </Box>
                </Group>
            </Card>
        </Stack>
    );
};
