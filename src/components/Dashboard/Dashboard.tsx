import React, { useMemo, useState, useEffect } from "react";
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
    Tooltip,
    useMantineColorScheme,
    SegmentedControl,
    Loader,
} from "@mantine/core";
import {
    IconUsers,
    IconBulb,
    IconTarget,
    IconTrendingUp,
    IconTrendingDown,
    IconChartBar,
    IconAlertTriangle,
    IconBuildingSkyscraper,
    IconBadge,
    IconMinus,
    IconCalendar,
    IconRocket,
    IconShieldCheck,
    IconChartHistogram,
    IconPlus,
    IconChecklist,
} from "@tabler/icons-react";
import { useData, AssessmentLogEntry } from "../../context/DataContext";
import { getScoreColor } from "../../utils/skillCalculations";
import { getIconByName } from "../shared/RoleIconPicker";

type ComparisonPeriod = "quarter" | "year";

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
                        <Tooltip label={`Vergleich zum ${trend.label}`} withArrow>
                            <Group gap={4} mt={8}>
                                {trend.value > 0 ? (
                                    <IconTrendingUp size={14} color="var(--mantine-color-teal-6)" />
                                ) : trend.value < 0 ? (
                                    <IconTrendingDown size={14} color="var(--mantine-color-red-6)" />
                                ) : (
                                    <IconMinus size={14} color="var(--mantine-color-gray-6)" />
                                )}
                                <Text size="xs" c={trend.value > 0 ? "teal" : trend.value < 0 ? "red" : "dimmed"}>
                                    {trend.value > 0 ? "+" : ""}{trend.value}%
                                </Text>
                            </Group>
                        </Tooltip>
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

// Helper function to calculate XP at a specific point in time
const calculateHistoricalXP = (
    currentAssessments: { employeeId: string; skillId: string; level: number }[],
    historyLogs: AssessmentLogEntry[],
    beforeTimestamp: number
): number => {
    const levelMap = new Map<string, number>();
    currentAssessments.forEach(a => {
        levelMap.set(`${a.employeeId}-${a.skillId}`, a.level);
    });

    const recentLogs = historyLogs
        .filter(log => log.timestamp > beforeTimestamp)
        .sort((a, b) => b.timestamp - a.timestamp);

    recentLogs.forEach(log => {
        const key = `${log.employeeId}-${log.skillId}`;
        levelMap.set(key, log.previousLevel);
    });

    return Array.from(levelMap.values()).reduce((sum, level) => sum + level, 0);
};

// Helper to get period boundaries
const getPeriodBoundaries = (period: ComparisonPeriod): { currentStart: number; previousStart: number; previousEnd: number } => {
    const now = new Date();

    if (period === "quarter") {
        const currentQuarter = Math.floor(now.getMonth() / 3);
        const currentYear = now.getFullYear();
        const currentStart = new Date(currentYear, currentQuarter * 3, 1).getTime();

        let prevQuarter = currentQuarter - 1;
        let prevYear = currentYear;
        if (prevQuarter < 0) {
            prevQuarter = 3;
            prevYear -= 1;
        }
        const previousStart = new Date(prevYear, prevQuarter * 3, 1).getTime();
        const previousEnd = currentStart;

        return { currentStart, previousStart, previousEnd };
    } else {
        const currentYear = now.getFullYear();
        const currentStart = new Date(currentYear, 0, 1).getTime();
        const previousStart = new Date(currentYear - 1, 0, 1).getTime();
        const previousEnd = currentStart;

        return { currentStart, previousStart, previousEnd };
    }
};

export const Dashboard: React.FC = () => {
    const {
        employees,
        skills,
        assessments,
        categories,
        subcategories,
        departments,
        roles,
        getAllHistory
    } = useData();
    const { colorScheme } = useMantineColorScheme();
    const isDark = colorScheme === 'dark';

    const [period, setPeriod] = useState<ComparisonPeriod>("quarter");
    const [historyLogs, setHistoryLogs] = useState<AssessmentLogEntry[]>([]);
    const [loadingHistory, setLoadingHistory] = useState(true);

    useEffect(() => {
        const loadHistory = async () => {
            setLoadingHistory(true);
            try {
                const logs = await getAllHistory();
                setHistoryLogs(logs);
            } catch (e) {
                console.error("Failed to load history", e);
            }
            setLoadingHistory(false);
        };
        loadHistory();
    }, [getAllHistory]);

    const kpis = useMemo(() => {
        const { currentStart, previousStart, previousEnd } = getPeriodBoundaries(period);

        // Current period metrics
        const employeeAverages = employees.map(emp => {
            const empAssessments = assessments.filter(a => a.employeeId === emp.id && a.level > 0);
            if (empAssessments.length === 0) return null;
            const avg = empAssessments.reduce((sum, a) => sum + a.level, 0) / empAssessments.length;
            return { employee: emp, avg };
        }).filter(Boolean) as { employee: typeof employees[0]; avg: number }[];

        const globalAverage = employeeAverages.length > 0
            ? Math.round(employeeAverages.reduce((sum, e) => sum + e.avg, 0) / employeeAverages.length)
            : 0;

        const activeSkillIds = new Set(assessments.filter(a => a.level > 0).map(a => a.skillId));
        const activeSkillCount = activeSkillIds.size;

        const totalXP = assessments.reduce((sum, a) => sum + a.level, 0);

        const assessmentsWithTargets = assessments.filter(a => a.targetLevel && a.targetLevel > 0);
        const achievedTargets = assessmentsWithTargets.filter(a => a.level >= (a.targetLevel || 0));
        const goalFulfillment = assessmentsWithTargets.length > 0
            ? Math.round((achievedTargets.length / assessmentsWithTargets.length) * 100)
            : 0;

        const previousXP = calculateHistoricalXP(
            assessments.map(a => ({ employeeId: a.employeeId, skillId: a.skillId, level: a.level })),
            historyLogs,
            previousEnd
        );

        const xpChange = previousXP > 0
            ? Math.round(((totalXP - previousXP) / previousXP) * 100)
            : totalXP > 0 ? 100 : 0;

        const currentPeriodImprovements = historyLogs.filter(
            log => log.timestamp >= currentStart && log.newLevel > log.previousLevel
        ).length;

        const previousPeriodImprovements = historyLogs.filter(
            log => log.timestamp >= previousStart && log.timestamp < previousEnd && log.newLevel > log.previousLevel
        ).length;

        const improvementsTrend = previousPeriodImprovements > 0
            ? Math.round(((currentPeriodImprovements - previousPeriodImprovements) / previousPeriodImprovements) * 100)
            : currentPeriodImprovements > 0 ? 100 : 0;

        // Most improved skills (aggregated)
        const skillImprovements = new Map<string, number>();
        historyLogs
            .filter(log => log.timestamp >= currentStart && log.newLevel > log.previousLevel)
            .forEach(log => {
                const current = skillImprovements.get(log.skillId) || 0;
                skillImprovements.set(log.skillId, current + (log.newLevel - log.previousLevel));
            });

        const mostImprovedSkills = Array.from(skillImprovements.entries())
            .map(([skillId, improvement]) => ({
                skill: skills.find(s => s.id === skillId),
                improvement
            }))
            .filter(s => s.skill)
            .sort((a, b) => b.improvement - a.improvement)
            .slice(0, 5);

        // Skill coverage (how many employees have each skill at 50%+)
        const skillCoverage = skills.map(skill => {
            const skillAssessments = assessments.filter(a => a.skillId === skill.id && a.level >= 50);
            return {
                skill,
                coverage: skillAssessments.length,
                percentage: employees.length > 0 ? Math.round((skillAssessments.length / employees.length) * 100) : 0
            };
        }).sort((a, b) => b.coverage - a.coverage).slice(0, 5);

        // Low coverage skills (critical skills with low coverage)
        const lowCoverageSkills = skills
            .map(skill => {
                const skillAssessments = assessments.filter(a => a.skillId === skill.id && a.level >= 50);
                return {
                    skill,
                    coverage: skillAssessments.length,
                    percentage: employees.length > 0 ? Math.round((skillAssessments.length / employees.length) * 100) : 0
                };
            })
            .filter(s => s.percentage < 30 && employees.length > 0)
            .sort((a, b) => a.percentage - b.percentage)
            .slice(0, 5);

        // Skill level distribution
        const levelDistribution = {
            level0: assessments.filter(a => a.level === 0).length,
            level25: assessments.filter(a => a.level === 25).length,
            level50: assessments.filter(a => a.level === 50).length,
            level75: assessments.filter(a => a.level === 75).length,
            level100: assessments.filter(a => a.level === 100).length,
        };
        const totalAssessments = Object.values(levelDistribution).reduce((a, b) => a + b, 0);

        // Open learning goals
        const openGoals = assessmentsWithTargets.filter(a => a.level < (a.targetLevel || 0));
        const openGoalsCount = openGoals.length;

        // Recently added (skills, categories in last 30 days - we'll show counts)
        const thirtyDaysAgo = Date.now() - (30 * 24 * 60 * 60 * 1000);
        const recentSkillChanges = historyLogs.filter(log => log.timestamp >= thirtyDaysAgo).length;

        // Department progress
        const departmentProgress = departments.map(dept => {
            const deptEmployeeIds = employees.filter(e => e.department === dept.name).map(e => e.id);
            const deptCurrentPeriodImprovements = historyLogs.filter(
                log => log.timestamp >= currentStart &&
                    log.newLevel > log.previousLevel &&
                    deptEmployeeIds.includes(log.employeeId)
            ).length;
            return { department: dept, improvements: deptCurrentPeriodImprovements };
        }).sort((a, b) => b.improvements - a.improvements);

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

        const recentActivity = {
            improvements: currentPeriodImprovements,
            improvementsTrend,
            totalChanges: historyLogs.filter(log => log.timestamp >= currentStart).length,
        };

        return {
            globalAverage,
            employeeCount: employees.length,
            skillCount: skills.length,
            activeSkillCount,
            totalXP,
            xpChange,
            goalFulfillment,
            biggestGaps,
            departmentStats,
            roleDistribution,
            categoryStats,
            recentActivity,
            previousXP,
            mostImprovedSkills,
            skillCoverage,
            lowCoverageSkills,
            levelDistribution,
            totalAssessments,
            openGoalsCount,
            recentSkillChanges,
            departmentProgress,
        };
    }, [employees, skills, assessments, categories, subcategories, departments, roles, historyLogs, period]);

    const periodLabel = period === "quarter" ? "Vorquartal" : "Vorjahr";
    const periodName = period === "quarter" ? "Quartal" : "Jahr";

    return (
        <Stack gap="lg" p="md" style={{ height: '100%', overflow: 'auto' }}>
            <Group justify="space-between" align="center">
                <Title order={2}>Dashboard</Title>
                <Group gap="sm">
                    <IconCalendar size={16} color="gray" />
                    <SegmentedControl
                        size="xs"
                        value={period}
                        onChange={(v) => setPeriod(v as ComparisonPeriod)}
                        data={[
                            { label: 'Quartal', value: 'quarter' },
                            { label: 'Jahr', value: 'year' },
                        ]}
                    />
                    {loadingHistory && <Loader size="xs" />}
                </Group>
            </Group>

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
                    title="Gesamt-XP"
                    value={kpis.totalXP.toLocaleString()}
                    subtitle={`${kpis.activeSkillCount} aktive Skills`}
                    icon={<IconBulb size={24} />}
                    color="violet"
                    trend={!loadingHistory ? {
                        value: kpis.xpChange,
                        label: periodLabel
                    } : undefined}
                />
                <StatCard
                    title="Zielerfüllung"
                    value={`${kpis.goalFulfillment}%`}
                    subtitle="Ziele erreicht"
                    icon={<IconTarget size={24} />}
                    color={kpis.goalFulfillment >= 70 ? "teal" : kpis.goalFulfillment >= 40 ? "yellow" : "red"}
                />
            </SimpleGrid>

            {/* Activity Card */}
            {!loadingHistory && (
                <Card withBorder radius="md" p="md">
                    <Group justify="space-around" wrap="wrap">
                        <Box ta="center">
                            <Text size="xs" c="dimmed" tt="uppercase">Skill-Verbesserungen</Text>
                            <Group gap={8} justify="center">
                                <Text size="xl" fw={700} c="teal">{kpis.recentActivity.improvements}</Text>
                                {kpis.recentActivity.improvementsTrend !== 0 && (
                                    <Badge
                                        size="sm"
                                        variant="light"
                                        color={kpis.recentActivity.improvementsTrend > 0 ? "teal" : "red"}
                                        leftSection={
                                            kpis.recentActivity.improvementsTrend > 0
                                                ? <IconTrendingUp size={10} />
                                                : <IconTrendingDown size={10} />
                                        }
                                    >
                                        {kpis.recentActivity.improvementsTrend > 0 ? "+" : ""}
                                        {kpis.recentActivity.improvementsTrend}%
                                    </Badge>
                                )}
                            </Group>
                            <Text size="xs" c="dimmed">dieses {periodName}</Text>
                        </Box>
                        <Divider orientation="vertical" />
                        <Box ta="center">
                            <Text size="xs" c="dimmed" tt="uppercase">Offene Lernziele</Text>
                            <Text size="xl" fw={700} c={kpis.openGoalsCount > 0 ? "orange" : "teal"}>
                                {kpis.openGoalsCount}
                            </Text>
                            <Text size="xs" c="dimmed">noch zu erreichen</Text>
                        </Box>
                        <Divider orientation="vertical" />
                        <Box ta="center">
                            <Text size="xs" c="dimmed" tt="uppercase">Aktivität (30 Tage)</Text>
                            <Text size="xl" fw={700}>{kpis.recentSkillChanges}</Text>
                            <Text size="xs" c="dimmed">Bewertungsänderungen</Text>
                        </Box>
                        <Divider orientation="vertical" />
                        <Box ta="center">
                            <Text size="xs" c="dimmed" tt="uppercase">XP-Entwicklung</Text>
                            <Group gap={4} justify="center">
                                <Text size="sm" c="dimmed">{kpis.previousXP.toLocaleString()}</Text>
                                <IconTrendingUp size={14} color="var(--mantine-color-gray-5)" />
                                <Text size="sm" fw={700} c="blue">{kpis.totalXP.toLocaleString()}</Text>
                            </Group>
                            <Text size="xs" c="dimmed">{periodLabel} → Jetzt</Text>
                        </Box>
                    </Group>
                </Card>
            )}

            <SimpleGrid cols={{ base: 1, md: 2, lg: 3 }} spacing="md">
                {/* Most Improved Skills */}
                <Card withBorder radius="md" p="md">
                    <Group justify="space-between" mb="md">
                        <Text fw={700} size="sm">
                            <Group gap={8}>
                                <IconRocket size={16} color="var(--mantine-color-teal-6)" />
                                Am meisten verbesserte Skills
                            </Group>
                        </Text>
                        <Badge size="xs" variant="light">dieses {periodName}</Badge>
                    </Group>
                    <Stack gap="sm">
                        {kpis.mostImprovedSkills.length > 0 ? (
                            kpis.mostImprovedSkills.map((item) => (
                                <Group key={item.skill?.id} justify="space-between">
                                    <Text size="sm" fw={500} truncate style={{ maxWidth: 180 }}>
                                        {item.skill?.name}
                                    </Text>
                                    <Badge color="teal" variant="light" size="sm">
                                        +{item.improvement} XP
                                    </Badge>
                                </Group>
                            ))
                        ) : (
                            <Text size="sm" c="dimmed" ta="center">Noch keine Verbesserungen dieses {periodName}</Text>
                        )}
                    </Stack>
                </Card>

                {/* Skill Coverage */}
                <Card withBorder radius="md" p="md">
                    <Group justify="space-between" mb="md">
                        <Text fw={700} size="sm">
                            <Group gap={8}>
                                <IconShieldCheck size={16} color="var(--mantine-color-blue-6)" />
                                Höchste Skill-Abdeckung
                            </Group>
                        </Text>
                        <Tooltip label="Mitarbeiter mit ≥50% Level" withArrow>
                            <Badge size="xs" variant="light" color="gray">≥50%</Badge>
                        </Tooltip>
                    </Group>
                    <Stack gap="sm">
                        {kpis.skillCoverage.length > 0 ? (
                            kpis.skillCoverage.map((item) => (
                                <Box key={item.skill.id}>
                                    <Group justify="space-between" mb={4}>
                                        <Text size="sm" fw={500} truncate style={{ maxWidth: 160 }}>
                                            {item.skill.name}
                                        </Text>
                                        <Text size="xs" c="dimmed">
                                            {item.coverage}/{employees.length} ({item.percentage}%)
                                        </Text>
                                    </Group>
                                    <Progress
                                        value={item.percentage}
                                        color="blue"
                                        size="xs"
                                        radius="xl"
                                    />
                                </Box>
                            ))
                        ) : (
                            <Text size="sm" c="dimmed" ta="center">Keine Skills vorhanden</Text>
                        )}
                    </Stack>
                </Card>

                {/* Low Coverage Skills */}
                <Card withBorder radius="md" p="md">
                    <Group justify="space-between" mb="md">
                        <Text fw={700} size="sm">
                            <Group gap={8}>
                                <IconAlertTriangle size={16} color="var(--mantine-color-orange-6)" />
                                Geringe Skill-Abdeckung
                            </Group>
                        </Text>
                        <Tooltip label="Skills mit <30% Abdeckung" withArrow>
                            <Badge size="xs" variant="light" color="orange">&lt;30%</Badge>
                        </Tooltip>
                    </Group>
                    <Stack gap="sm">
                        {kpis.lowCoverageSkills.length > 0 ? (
                            kpis.lowCoverageSkills.map((item) => (
                                <Box key={item.skill.id}>
                                    <Group justify="space-between" mb={4}>
                                        <Text size="sm" fw={500} truncate style={{ maxWidth: 160 }}>
                                            {item.skill.name}
                                        </Text>
                                        <Badge color="orange" variant="light" size="sm">
                                            {item.coverage}/{employees.length}
                                        </Badge>
                                    </Group>
                                    <Progress
                                        value={item.percentage}
                                        color="orange"
                                        size="xs"
                                        radius="xl"
                                    />
                                </Box>
                            ))
                        ) : (
                            <Text size="sm" c="dimmed" ta="center">Alle Skills gut abgedeckt 🎉</Text>
                        )}
                    </Stack>
                </Card>

                {/* Skill Level Distribution */}
                <Card withBorder radius="md" p="md">
                    <Group justify="space-between" mb="md">
                        <Text fw={700} size="sm">
                            <Group gap={8}>
                                <IconChartHistogram size={16} color="var(--mantine-color-violet-6)" />
                                Skill-Level Verteilung
                            </Group>
                        </Text>
                        <Text size="xs" c="dimmed">{kpis.totalAssessments} Bewertungen</Text>
                    </Group>
                    <Stack gap="xs">
                        {[
                            { level: '100%', count: kpis.levelDistribution.level100, color: 'teal' },
                            { level: '75%', count: kpis.levelDistribution.level75, color: 'green' },
                            { level: '50%', count: kpis.levelDistribution.level50, color: 'yellow' },
                            { level: '25%', count: kpis.levelDistribution.level25, color: 'orange' },
                            { level: '0%', count: kpis.levelDistribution.level0, color: 'gray' },
                        ].map((item) => {
                            const pct = kpis.totalAssessments > 0
                                ? Math.round((item.count / kpis.totalAssessments) * 100)
                                : 0;
                            return (
                                <Group key={item.level} gap="xs">
                                    <Text size="xs" w={35} ta="right" c="dimmed">{item.level}</Text>
                                    <Progress
                                        value={pct}
                                        color={item.color}
                                        size="sm"
                                        radius="xl"
                                        style={{ flex: 1 }}
                                    />
                                    <Text size="xs" w={40} c="dimmed">{item.count}</Text>
                                </Group>
                            );
                        })}
                    </Stack>
                </Card>

                {/* Open Learning Goals */}
                <Card withBorder radius="md" p="md">
                    <Group justify="space-between" mb="md">
                        <Text fw={700} size="sm">
                            <Group gap={8}>
                                <IconChecklist size={16} color="var(--mantine-color-orange-6)" />
                                Offene Lernziele
                            </Group>
                        </Text>
                    </Group>
                    <Stack gap="sm" align="center">
                        <RingProgress
                            size={100}
                            thickness={10}
                            roundCaps
                            sections={[{ value: kpis.goalFulfillment, color: kpis.goalFulfillment >= 70 ? 'teal' : kpis.goalFulfillment >= 40 ? 'yellow' : 'orange' }]}
                            label={
                                <Text size="lg" ta="center" fw={700}>
                                    {kpis.goalFulfillment}%
                                </Text>
                            }
                        />
                        <Text size="sm" c="dimmed" ta="center">
                            {kpis.openGoalsCount} von {kpis.openGoalsCount + Math.round(kpis.openGoalsCount * kpis.goalFulfillment / (100 - kpis.goalFulfillment) || 0)} Zielen noch offen
                        </Text>
                    </Stack>
                </Card>

                {/* Department Progress */}
                <Card withBorder radius="md" p="md">
                    <Group justify="space-between" mb="md">
                        <Text fw={700} size="sm">
                            <Group gap={8}>
                                <IconBuildingSkyscraper size={16} color="var(--mantine-color-cyan-6)" />
                                Abteilungs-Fortschritt
                            </Group>
                        </Text>
                        <Badge size="xs" variant="light">dieses {periodName}</Badge>
                    </Group>
                    <Stack gap="sm">
                        {kpis.departmentProgress.length > 0 ? (
                            kpis.departmentProgress.slice(0, 5).map((item, idx) => (
                                <Group key={item.department.id} justify="space-between">
                                    <Group gap="xs">
                                        {idx === 0 && item.improvements > 0 && (
                                            <ThemeIcon size="xs" color="cyan" variant="light">
                                                <IconTrendingUp size={10} />
                                            </ThemeIcon>
                                        )}
                                        <Text size="sm" fw={500}>{item.department.name}</Text>
                                    </Group>
                                    <Badge color="cyan" variant="light" size="sm">
                                        {item.improvements} Verbesserungen
                                    </Badge>
                                </Group>
                            ))
                        ) : (
                            <Text size="sm" c="dimmed" ta="center">Keine Abteilungen vorhanden</Text>
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
        </Stack>
    );
};
