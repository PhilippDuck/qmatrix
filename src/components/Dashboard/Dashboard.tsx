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
    ActionIcon,
    Menu,
    Checkbox,
} from "@mantine/core";
import { useLocalStorage } from "@mantine/hooks";
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
    IconEye,
    IconEyeOff,
    IconSettings,
} from "@tabler/icons-react";
import { useData, AssessmentLogEntry } from "../../context/DataContext";
import { getScoreColor } from "../../utils/skillCalculations";
import { getIconByName } from "../shared/RoleIconPicker";
import {
    calculateHistoricalXP,
    getPeriodBoundaries,
    ComparisonPeriod
} from "../../utils/dashboardCalculations";

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

    const getTooltipContent = (title: string) => {
        switch (title) {
            case "Mitarbeiter":
                return "Anzahl der aktuell erfassten Mitarbeiter im System.";
            case "Globale Expertise":
                return "Durchschnittlicher Erfüllungsgrad aller aktiven Skills über alle Mitarbeiter hinweg. Ein Wert von 100% bedeutet, dass im Schnitt das höchste Skill-Level erreicht wurde.";
            case "Gesamt-XP":
                return "Summe aller Skill-Punkte (Experience Points) aller Mitarbeiter. Ein Indikator für das gesamte im Unternehmen vorhandene Wissen.";
            case "Zielerfüllung":
                return "Prozentsatz der definierten Soll-Ziele (Target Level), die von den Mitarbeitern erreicht oder übertroffen wurden.";
            default:
                return null;
        }
    };

    const tooltipContent = getTooltipContent(title);

    return (
        <Card withBorder radius="md" p="md" style={{ height: '100%' }}>
            <Group justify="space-between" align="flex-start">
                <Box>
                    <Tooltip label={tooltipContent} disabled={!tooltipContent} multiline w={220} withArrow transitionProps={{ duration: 200 }}>
                        <Text size="xs" c="dimmed" tt="uppercase" fw={700} style={{ cursor: tooltipContent ? 'help' : 'default', width: 'fit-content' }}>
                            {title}
                        </Text>
                    </Tooltip>

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
}

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

    const periodLabel = period === "quarter" ? "Vorquartal" : "Vorjahr";
    const periodName = period === "quarter" ? "Quartal" : "Jahr";

    const getCategoryPath = (skillId: string) => {
        const skill = skills.find(s => s.id === skillId);
        if (!skill) return "";
        const subcat = subcategories.find(sc => sc.id === skill.subCategoryId);
        if (!subcat) return "";
        const cat = categories.find(c => c.id === subcat.categoryId);
        return `${cat?.name || '?'} > ${subcat.name}`;
    };

    const [visibleTiles, setVisibleTiles] = useLocalStorage<Record<string, boolean>>({
        key: 'skillgrid-dashboard-tiles',
        defaultValue: {
            stats: true,
            activity: true,
            improvedSkills: true,
            coverage: true,
            lowCoverage: true,
            distribution: true,
            learningGoals: true,
            deptProgress: true,
            skillGaps: true,
            roleDist: true,
            catPerformance: true,
        },
    });

    const toggleTile = (id: string) => {
        setVisibleTiles((prev) => ({ ...prev, [id]: !prev[id] }));
    };

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

        const totalXP = assessments.reduce((sum, a) => sum + (a.level > 0 ? a.level : 0), 0);

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



    const tileLabels: Record<string, string> = {
        stats: "Haupt-KPIs",
        activity: "Aktivitäts-Übersicht",
        improvedSkills: "Verbesserte Skills",
        coverage: "Skill-Abdeckung",
        lowCoverage: "Geringe Abdeckung",
        distribution: "Level-Verteilung",
        learningGoals: "Lernziele",
        deptProgress: "Abteilungs-Fortschritt",
        skillGaps: "Skill-Gaps",
        roleDist: "Rollen-Verteilung",
        catPerformance: "Kategorie-Performance",
    };

    const HideButton = ({ id }: { id: string }) => (
        <Tooltip label="Kachel vorübergehend ausblenden">
            <ActionIcon
                variant="subtle"
                color="gray"
                size="sm"
                onClick={() => toggleTile(id)}
                className="hide-button"
            >
                <IconEyeOff size={14} />
            </ActionIcon>
        </Tooltip>
    );

    return (
        <Stack gap="lg" style={{ height: '100%', overflow: 'auto' }}>
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

                    <Menu shadow="md" width={200} position="bottom-end" closeOnItemClick={false}>
                        <Menu.Target>
                            <Tooltip label="Dashboard anpassen">
                                <ActionIcon variant="light" color="blue" size="md">
                                    <IconSettings size={18} />
                                </ActionIcon>
                            </Tooltip>
                        </Menu.Target>

                        <Menu.Dropdown>
                            <Menu.Label>Sichtbare Kacheln</Menu.Label>
                            {Object.entries(tileLabels).map(([id, label]) => (
                                <Menu.Item
                                    key={id}
                                    onClick={() => toggleTile(id)}
                                >
                                    <Group gap="xs">
                                        <Checkbox
                                            checked={visibleTiles[id]}
                                            readOnly
                                            size="xs"
                                        />
                                        <Text size="sm">{label}</Text>
                                    </Group>
                                </Menu.Item>
                            ))}
                            <Menu.Divider />
                            <Menu.Item
                                color="red"
                                onClick={() => setVisibleTiles({
                                    stats: true,
                                    activity: true,
                                    improvedSkills: true,
                                    coverage: true,
                                    lowCoverage: true,
                                    distribution: true,
                                    learningGoals: true,
                                    deptProgress: true,
                                    skillGaps: true,
                                    roleDist: true,
                                    catPerformance: true,
                                })}
                            >
                                Alle einblenden
                            </Menu.Item>
                        </Menu.Dropdown>
                    </Menu>

                    {loadingHistory && <Loader size="xs" />}
                </Group>
            </Group>

            {/* Main Stats */}
            {visibleTiles.stats && (
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
            )}

            {/* Activity Card */}
            {visibleTiles.activity && !loadingHistory && (
                <Card withBorder radius="md" p="md">
                    <Group justify="space-between" mb="xs">
                        <Tooltip label="Zusammenfassung der Aktivitäten und Entwicklungen im ausgewählten Zeitraum." withArrow>
                            <Text size="xs" c="dimmed" fw={700} tt="uppercase" style={{ cursor: 'help' }}>Aktivitäts-Übersicht</Text>
                        </Tooltip>
                        <HideButton id="activity" />
                    </Group>
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
                {visibleTiles.improvedSkills && (
                    <Card withBorder radius="md" p="md">
                        <Group justify="space-between" mb="md">
                            <Text fw={700} size="sm">
                                <Tooltip label="Skills mit dem größten Zuwachs an Erfahrungspunkten (XP) im aktuellen Zeitraum." withArrow>
                                    <Group gap={8} style={{ cursor: 'help' }}>
                                        <IconRocket size={16} color="var(--mantine-color-teal-6)" />
                                        Am meisten verbesserte Skills
                                    </Group>
                                </Tooltip>
                            </Text>
                            <Group gap="xs">
                                <Badge size="xs" variant="light">dieses {periodName}</Badge>
                                <HideButton id="improvedSkills" />
                            </Group>
                        </Group>
                        <Stack gap="sm">
                            {kpis.mostImprovedSkills.length > 0 ? (
                                kpis.mostImprovedSkills.map((item) => (
                                    <Group key={item.skill?.id} justify="space-between">
                                        <Box style={{ maxWidth: '70%' }}>
                                            <Text size="sm" fw={500} truncate>
                                                {item.skill?.name}
                                            </Text>
                                            <Text size="xs" c="dimmed" truncate>
                                                {item.skill?.id && getCategoryPath(item.skill.id)}
                                            </Text>
                                        </Box>
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
                )}

                {/* Skill Coverage */}
                {visibleTiles.coverage && (
                    <Card withBorder radius="md" p="md">
                        <Group justify="space-between" mb="md">
                            <Text fw={700} size="sm">
                                <Tooltip label="Skills, die von den meisten Mitarbeitern auf einem Level von mindestens 50% beherrscht werden." withArrow>
                                    <Group gap={8} style={{ cursor: 'help' }}>
                                        <IconShieldCheck size={16} color="var(--mantine-color-blue-6)" />
                                        Höchste Skill-Abdeckung
                                    </Group>
                                </Tooltip>
                            </Text>
                            <Group gap="xs">
                                <Tooltip label="Mitarbeiter mit ≥50% Level" withArrow>
                                    <Badge size="xs" variant="light" color="gray">≥50%</Badge>
                                </Tooltip>
                                <HideButton id="coverage" />
                            </Group>
                        </Group>
                        <Stack gap="sm">
                            {kpis.skillCoverage.length > 0 ? (
                                kpis.skillCoverage.map((item) => (
                                    <Box key={item.skill.id}>
                                        <Group justify="space-between" mb={4}>
                                            <Box style={{ maxWidth: '75%' }}>
                                                <Text size="sm" fw={500} truncate>
                                                    {item.skill.name}
                                                </Text>
                                                <Text size="xs" c="dimmed" truncate>
                                                    {getCategoryPath(item.skill.id!)}
                                                </Text>
                                            </Box>
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
                )}

                {/* Low Coverage Skills */}
                {visibleTiles.lowCoverage && (
                    <Card withBorder radius="md" p="md">
                        <Group justify="space-between" mb="md">
                            <Text fw={700} size="sm">
                                <Tooltip label="Kritische Skills, die von weniger als 30% der Belegschaft beherrscht werden (Level ≥ 50%)." withArrow>
                                    <Group gap={8} style={{ cursor: 'help' }}>
                                        <IconAlertTriangle size={16} color="var(--mantine-color-orange-6)" />
                                        Geringe Skill-Abdeckung
                                    </Group>
                                </Tooltip>
                            </Text>
                            <Group gap="xs">
                                <Tooltip label="Skills mit <30% Abdeckung" withArrow>
                                    <Badge size="xs" variant="light" color="orange">&lt;30%</Badge>
                                </Tooltip>
                                <HideButton id="lowCoverage" />
                            </Group>
                        </Group>
                        <Stack gap="sm">
                            {kpis.lowCoverageSkills.length > 0 ? (
                                kpis.lowCoverageSkills.map((item) => (
                                    <Box key={item.skill.id}>
                                        <Group justify="space-between" mb={4}>
                                            <Box style={{ maxWidth: '75%' }}>
                                                <Text size="sm" fw={500} truncate>
                                                    {item.skill.name}
                                                </Text>
                                                <Text size="xs" c="dimmed" truncate>
                                                    {getCategoryPath(item.skill.id!)}
                                                </Text>
                                            </Box>
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
                )}

                {/* Skill Level Distribution */}
                {visibleTiles.distribution && (
                    <Card withBorder radius="md" p="md">
                        <Group justify="space-between" mb="md">
                            <Text fw={700} size="sm">
                                <Tooltip label="Verteilung der aktuellen Skill-Level über alle Bewertungen hinweg." withArrow>
                                    <Group gap={8} style={{ cursor: 'help' }}>
                                        <IconChartHistogram size={16} color="var(--mantine-color-violet-6)" />
                                        Skill-Level Verteilung
                                    </Group>
                                </Tooltip>
                            </Text>
                            <Group gap="xs">
                                <Text size="xs" c="dimmed">{kpis.totalAssessments} Bewertungen</Text>
                                <HideButton id="distribution" />
                            </Group>
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
                )}

                {/* Open Learning Goals */}
                {visibleTiles.learningGoals && (
                    <Card withBorder radius="md" p="md">
                        <Group justify="space-between" mb="md">
                            <Text fw={700} size="sm">
                                <Tooltip label="Offene Lernziele, bei denen das Ist-Level (noch) unter dem Soll-Level liegt." withArrow>
                                    <Group gap={8} style={{ cursor: 'help' }}>
                                        <IconChecklist size={16} color="var(--mantine-color-orange-6)" />
                                        Offene Lernziele
                                    </Group>
                                </Tooltip>
                            </Text>
                            <HideButton id="learningGoals" />
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
                )}

                {/* Department Progress */}
                {visibleTiles.deptProgress && (
                    <Card withBorder radius="md" p="md">
                        <Group justify="space-between" mb="md">
                            <Text fw={700} size="sm">
                                <Tooltip label="Anzahl der Verbesserungen (Skill-Level Erhöhungen) pro Abteilung im aktuellen Zeitraum." withArrow>
                                    <Group gap={8} style={{ cursor: 'help' }}>
                                        <IconBuildingSkyscraper size={16} color="var(--mantine-color-cyan-6)" />
                                        Abteilungs-Fortschritt
                                    </Group>
                                </Tooltip>
                            </Text>
                            <Group gap="xs">
                                <Badge size="xs" variant="light">dieses {periodName}</Badge>
                                <HideButton id="deptProgress" />
                            </Group>
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
                )}

                {/* Biggest Skill Gaps */}
                {visibleTiles.skillGaps && (
                    <Card withBorder radius="md" p="md">
                        <Group justify="space-between" mb="md">
                            <Text fw={700} size="sm">
                                <Tooltip label="Größte Differenzen zwischen definiertem Soll-Level und aktuellem Ist-Level." withArrow>
                                    <Group gap={8} style={{ cursor: 'help' }}>
                                        <IconAlertTriangle size={16} color="var(--mantine-color-red-6)" />
                                        Größte Skill-Gaps
                                    </Group>
                                </Tooltip>
                            </Text>
                            <HideButton id="skillGaps" />
                        </Group>
                        <Stack gap="sm">
                            {kpis.biggestGaps.length > 0 ? (
                                kpis.biggestGaps.map((item) => (
                                    <Box key={item.skill.id}>
                                        <Group justify="space-between" mb={4}>
                                            <Box style={{ maxWidth: '75%' }}>
                                                <Text size="sm" fw={500} truncate>
                                                    {item.skill.name}
                                                </Text>
                                                <Text size="xs" c="dimmed" truncate>
                                                    {getCategoryPath(item.skill.id!)}
                                                </Text>
                                            </Box>
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
                )}

                {/* Role Distribution */}
                {visibleTiles.roleDist && (
                    <Card withBorder radius="md" p="md">
                        <Group justify="space-between" mb="md">
                            <Text fw={700} size="sm">
                                <Tooltip label="Anzahl der Mitarbeiter, die der jeweiligen Rolle zugeordnet sind." withArrow>
                                    <Group gap={8} style={{ cursor: 'help' }}>
                                        <IconBadge size={16} />
                                        Rollen-Verteilung
                                    </Group>
                                </Tooltip>
                            </Text>
                            <HideButton id="roleDist" />
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
                )}

                {/* Category Performance */}
                {visibleTiles.catPerformance && (
                    <Card withBorder radius="md" p="md" style={{ gridColumn: 'span 2' }}>
                        <Group justify="space-between" mb="md">
                            <Text fw={700} size="sm">
                                <Tooltip label="Durchschnittlicher Erfüllungsgrad (Level) aller Skills innerhalb einer Kategorie." withArrow>
                                    <Group gap={8} style={{ cursor: 'help' }}>
                                        <IconTrendingUp size={16} />
                                        Kategorie-Performance
                                    </Group>
                                </Tooltip>
                            </Text>
                            <HideButton id="catPerformance" />
                        </Group>
                        <SimpleGrid cols={{ base: 1, sm: kpis.categoryStats.length === 1 ? 1 : 2 }} spacing="md">
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
                )}
            </SimpleGrid>
        </Stack>
    );
};
