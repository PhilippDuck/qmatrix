import React, { useMemo, useState } from "react";
import { LineChart } from "@mantine/charts";
import {
    Stack,
    Group,
    Text,
    Paper,
    SimpleGrid,
    Card,
    ThemeIcon,
    Badge,
    SegmentedControl,
    Table,
    Box,
    Tooltip,
    Divider,
    useComputedColorScheme,
} from "@mantine/core";
import {
    IconTrendingUp,
    IconTrendingDown,
    IconUsers,
    IconUserMinus,
    IconAlertTriangle,
    IconCertificate,
    IconArrowUpRight,
    IconArrowDownRight,
    IconMinus,
    IconCalendarStats,
    IconSum,
} from "@tabler/icons-react";
import { useData } from "../../context/DataContext";
import { usePrivacy } from "../../context/PrivacyContext";
import {
    generateForecastWithPlans,
    ForecastResult,
    ForecastCategoryBar,
    ForecastEmployeeRow,
    ForecastSkillBreakdown,
} from "../../utils/forecastCalculations";

// ── Helper: Delta Badge ──────────────────────────────────────────────

const DeltaBadge: React.FC<{ delta: number; suffix?: string; invert?: boolean }> = ({
    delta,
    suffix = "",
    invert = false,
}) => {
    const isPositive = invert ? delta < 0 : delta > 0;
    const isNegative = invert ? delta > 0 : delta < 0;

    if (delta === 0) {
        return (
            <Badge variant="light" color="gray" size="sm" leftSection={<IconMinus size={10} />}>
                ±0{suffix}
            </Badge>
        );
    }

    return (
        <Badge
            variant="light"
            color={isPositive ? "green" : "red"}
            size="sm"
            leftSection={
                isPositive ? <IconArrowUpRight size={10} /> : <IconArrowDownRight size={10} />
            }
        >
            {delta > 0 ? "+" : ""}
            {delta}
            {suffix}
        </Badge>
    );
};

// ── Category Bar Chart (pure CSS) ────────────────────────────────────

const CategoryBarChart: React.FC<{ bars: ForecastCategoryBar[] }> = ({ bars }) => {
    const computedColorScheme = useComputedColorScheme("light");
    const isDark = computedColorScheme === "dark";

    // Filter out categories with no data at all
    const activeBars = bars.filter(b => b.currentAvgScore > 0 || b.forecastAvgScore > 0);

    if (activeBars.length === 0) {
        return (
            <Text c="dimmed" ta="center" py="lg" size="sm">
                Keine Kategorie-Daten vorhanden.
            </Text>
        );
    }

    return (
        <Stack gap="md">
            {activeBars.map((bar) => (
                <Box key={bar.categoryId}>
                    <Group justify="space-between" mb={4}>
                        <Text size="sm" fw={600}>
                            {bar.categoryName}
                        </Text>
                        <DeltaBadge delta={bar.delta} suffix="%" />
                    </Group>

                    {/* Current bar */}
                    <Group gap="xs" mb={4}>
                        <Text size="xs" c="dimmed" w={40}>
                            Ist
                        </Text>
                        <Box style={{ flex: 1, position: "relative", height: 20, borderRadius: 4, overflow: "hidden" }}>
                            <Box
                                style={{
                                    position: "absolute",
                                    inset: 0,
                                    backgroundColor: isDark ? "var(--mantine-color-dark-6)" : "var(--mantine-color-gray-1)",
                                    borderRadius: 4,
                                }}
                            />
                            <Box
                                style={{
                                    position: "absolute",
                                    left: 0,
                                    top: 0,
                                    bottom: 0,
                                    width: `${bar.currentAvgScore}%`,
                                    background: "linear-gradient(90deg, var(--mantine-color-blue-4), var(--mantine-color-blue-6))",
                                    borderRadius: 4,
                                    transition: "width 0.5s ease",
                                }}
                            />
                            <Text
                                size="xs"
                                fw={600}
                                style={{
                                    position: "absolute",
                                    right: 6,
                                    top: "50%",
                                    transform: "translateY(-50%)",
                                    color: isDark ? "var(--mantine-color-gray-3)" : "var(--mantine-color-dark-4)",
                                }}
                            >
                                {bar.currentAvgScore}%
                            </Text>
                        </Box>
                    </Group>

                    {/* Forecast bar */}
                    <Group gap="xs">
                        <Text size="xs" c="dimmed" w={40}>
                            Prog.
                        </Text>
                        <Box style={{ flex: 1, position: "relative", height: 20, borderRadius: 4, overflow: "hidden" }}>
                            <Box
                                style={{
                                    position: "absolute",
                                    inset: 0,
                                    backgroundColor: isDark ? "var(--mantine-color-dark-6)" : "var(--mantine-color-gray-1)",
                                    borderRadius: 4,
                                }}
                            />
                            <Box
                                style={{
                                    position: "absolute",
                                    left: 0,
                                    top: 0,
                                    bottom: 0,
                                    width: `${bar.forecastAvgScore}%`,
                                    background:
                                        bar.delta >= 0
                                            ? "linear-gradient(90deg, var(--mantine-color-teal-4), var(--mantine-color-teal-6))"
                                            : "linear-gradient(90deg, var(--mantine-color-orange-4), var(--mantine-color-orange-6))",
                                    borderRadius: 4,
                                    transition: "width 0.5s ease",
                                }}
                            />
                            <Text
                                size="xs"
                                fw={600}
                                style={{
                                    position: "absolute",
                                    right: 6,
                                    top: "50%",
                                    transform: "translateY(-50%)",
                                    color: isDark ? "var(--mantine-color-gray-3)" : "var(--mantine-color-dark-4)",
                                }}
                            >
                                {bar.forecastAvgScore}%
                            </Text>
                        </Box>
                    </Group>
                </Box>
            ))}
        </Stack>
    );
};

// ── Breakdown Tooltip Content ────────────────────────────────────────

const BreakdownTooltipContent: React.FC<{
    breakdown: ForecastSkillBreakdown[];
    mode: "current" | "forecast";
    avgScore: number | null;
}> = ({ breakdown, mode, avgScore: avg }) => {
    if (breakdown.length === 0) {
        return <Text size="xs">Keine Skill-Daten vorhanden</Text>;
    }

    // Show max 10 skills, sorted by lowest fulfillment first
    const shown = mode === "current"
        ? [...breakdown].sort((a, b) => a.currentFulfillment - b.currentFulfillment).slice(0, 12)
        : [...breakdown].sort((a, b) => a.forecastFulfillment - b.forecastFulfillment).slice(0, 12);
    const hasMore = breakdown.length > 12;

    return (
        <Box style={{ maxWidth: 380 }}>
            <Text size="xs" fw={700} mb={6}>
                {mode === "current" ? "Ist-Erfüllung" : "Prognose-Erfüllung"} — Ø {avg ?? 0}%
            </Text>
            <Table
                horizontalSpacing={6}
                verticalSpacing={2}
                style={{ fontSize: 11 }}
            >
                <Table.Thead>
                    <Table.Tr>
                        <Table.Th style={{ fontSize: 10, padding: '2px 4px' }}>Skill</Table.Th>
                        <Table.Th style={{ fontSize: 10, padding: '2px 4px', textAlign: 'right' }}>{mode === "current" ? "Ist" : "Prog."}</Table.Th>
                        <Table.Th style={{ fontSize: 10, padding: '2px 4px', textAlign: 'right' }}>Soll</Table.Th>
                        <Table.Th style={{ fontSize: 10, padding: '2px 4px', textAlign: 'right' }}>Erf.%</Table.Th>
                    </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                    {shown.map((s) => {
                        const level = mode === "current" ? s.currentLevel : s.forecastLevel;
                        const ful = mode === "current" ? s.currentFulfillment : s.forecastFulfillment;
                        const fulColor = ful >= 100 ? "var(--mantine-color-green-4)"
                            : ful >= 67 ? "var(--mantine-color-yellow-4)"
                                : "var(--mantine-color-red-4)";
                        const hasSoll = s.targetLevel && s.targetLevel > 0;
                        const displayColor = !hasSoll ? "var(--mantine-color-dimmed)" : fulColor;
                        return (
                            <Table.Tr key={s.skillId} style={!hasSoll ? { opacity: 0.55, fontStyle: 'italic' } : undefined}>
                                <Table.Td style={{ padding: '2px 4px', maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                    {s.skillName}
                                </Table.Td>
                                <Table.Td style={{ padding: '2px 4px', textAlign: 'right' }}>{level}%</Table.Td>
                                <Table.Td style={{ padding: '2px 4px', textAlign: 'right' }}>
                                    {s.targetLevel ? `${s.targetLevel}%` : "–"}
                                </Table.Td>
                                <Table.Td style={{ padding: '2px 4px', textAlign: 'right', fontWeight: 600, color: displayColor }}>
                                    {hasSoll ? `${ful}%` : `${level}%`}
                                </Table.Td>
                            </Table.Tr>
                        );
                    })}
                </Table.Tbody>
            </Table>
            {hasMore && (
                <Text size="xs" c="dimmed" mt={4} ta="center">
                    … und {breakdown.length - 12} weitere Skills
                </Text>
            )}
            <Divider my={4} />
            <Text size="xs" c="dimmed">
                Nur Skills mit Soll zählen für den Ø. Erf.% = min(100, Ist÷Soll×100).
            </Text>
        </Box>
    );
};

// ── Employee Table ───────────────────────────────────────────────────

const EmployeeTable: React.FC<{
    rows: ForecastEmployeeRow[];
    anonymizeName: (name: string, id?: string) => string;
}> = ({ rows, anonymizeName }) => {
    const [sortField, setSortField] = useState<"delta" | "current" | "forecast">("delta");
    const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

    const sorted = useMemo(() => {
        return [...rows].sort((a, b) => {
            let va: number, vb: number;
            switch (sortField) {
                case "delta":
                    va = a.delta;
                    vb = b.delta;
                    break;
                case "current":
                    va = a.currentAvgScore ?? -1;
                    vb = b.currentAvgScore ?? -1;
                    break;
                case "forecast":
                    va = a.forecastAvgScore ?? -1;
                    vb = b.forecastAvgScore ?? -1;
                    break;
            }
            return sortDir === "desc" ? vb - va : va - vb;
        });
    }, [rows, sortField, sortDir]);

    const toggleSort = (field: typeof sortField) => {
        if (sortField === field) {
            setSortDir((d) => (d === "asc" ? "desc" : "asc"));
        } else {
            setSortField(field);
            setSortDir("desc");
        }
    };

    const SortableHeader: React.FC<{
        field: typeof sortField;
        label: string;
    }> = ({ field, label }) => (
        <Table.Th
            style={{ cursor: "pointer", userSelect: "none" }}
            onClick={() => toggleSort(field)}
        >
            <Group gap={4}>
                <Text size="xs" fw={600}>
                    {label}
                </Text>
                {sortField === field && (
                    <Text size="xs" c="dimmed">
                        {sortDir === "desc" ? "↓" : "↑"}
                    </Text>
                )}
            </Group>
        </Table.Th>
    );

    if (rows.length === 0) {
        return (
            <Text c="dimmed" ta="center" py="lg" size="sm">
                Keine Mitarbeiterdaten vorhanden.
            </Text>
        );
    }

    return (
        <Table.ScrollContainer minWidth={600}>
            <Table striped highlightOnHover>
                <Table.Thead>
                    <Table.Tr>
                        <Table.Th>
                            <Text size="xs" fw={600}>Mitarbeiter</Text>
                        </Table.Th>
                        <SortableHeader field="current" label="Ist Erf. %" />
                        <SortableHeader field="forecast" label="Prog. Erf. %" />
                        <SortableHeader field="delta" label="Δ" />
                        <Table.Th>
                            <Text size="xs" fw={600}>Maßnahmen</Text>
                        </Table.Th>
                        <Table.Th>
                            <Text size="xs" fw={600}>Status</Text>
                        </Table.Th>
                    </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                    {sorted.map((row) => (
                        <Table.Tr
                            key={row.employeeId}
                            style={row.isDeparting ? { opacity: 0.6 } : undefined}
                        >
                            <Table.Td>
                                <Group gap="xs">
                                    <Text size="sm" fw={500}>
                                        {anonymizeName(row.employeeName, row.employeeId)}
                                    </Text>
                                    {row.isDeparting && (
                                        <Tooltip label={`Abgang: ${row.departureDate ? new Date(row.departureDate).toLocaleDateString("de-DE") : "geplant"}`}>
                                            <Badge size="xs" variant="light" color="red" leftSection={<IconUserMinus size={10} />}>
                                                Abgang
                                            </Badge>
                                        </Tooltip>
                                    )}
                                </Group>
                            </Table.Td>
                            <Table.Td>
                                <Tooltip
                                    label={<BreakdownTooltipContent breakdown={row.skillBreakdown} mode="current" avgScore={row.currentAvgScore} />}
                                    multiline
                                    w={400}
                                    position="bottom"
                                    withArrow
                                >
                                    <Text size="sm" style={{ cursor: 'help', textDecoration: 'underline dotted' }}>
                                        {row.currentAvgScore !== null ? `${row.currentAvgScore}%` : "–"}
                                    </Text>
                                </Tooltip>
                            </Table.Td>
                            <Table.Td>
                                <Tooltip
                                    label={<BreakdownTooltipContent breakdown={row.skillBreakdown} mode="forecast" avgScore={row.forecastAvgScore} />}
                                    multiline
                                    w={400}
                                    position="bottom"
                                    withArrow
                                >
                                    <Text size="sm" fw={500} c={row.isDeparting ? "red" : undefined} style={{ cursor: row.isDeparting ? undefined : 'help', textDecoration: row.isDeparting ? undefined : 'underline dotted' }}>
                                        {row.isDeparting
                                            ? "–"
                                            : row.forecastAvgScore !== null
                                                ? `${row.forecastAvgScore}%`
                                                : "–"}
                                    </Text>
                                </Tooltip>
                            </Table.Td>
                            <Table.Td>
                                {row.isDeparting ? (
                                    <Badge size="xs" variant="light" color="red">
                                        Entfällt
                                    </Badge>
                                ) : (
                                    <DeltaBadge delta={row.delta} suffix="%" />
                                )}
                            </Table.Td>
                            <Table.Td>
                                <Group gap={4}>
                                    {row.completingMeasureCount > 0 && (
                                        <Badge size="xs" variant="light" color="green">
                                            {row.completingMeasureCount} abschl.
                                        </Badge>
                                    )}
                                    {row.plannedMeasureCount > 0 && (
                                        <Badge size="xs" variant="light" color="blue">
                                            {row.plannedMeasureCount} geplant
                                        </Badge>
                                    )}
                                    {row.plannedMeasureCount === 0 && !row.isDeparting && (
                                        <Text size="xs" c="dimmed">–</Text>
                                    )}
                                </Group>
                            </Table.Td>
                            <Table.Td>
                                {row.isDeparting ? (
                                    <Badge size="xs" color="red" variant="filled">Abgang</Badge>
                                ) : row.delta > 0 ? (
                                    <Badge size="xs" color="green" variant="light">Aufsteigend</Badge>
                                ) : row.delta < 0 ? (
                                    <Badge size="xs" color="orange" variant="light">Rückgang</Badge>
                                ) : (
                                    <Badge size="xs" color="gray" variant="light">Stabil</Badge>
                                )}
                            </Table.Td>
                        </Table.Tr>
                    ))}
                </Table.Tbody>
            </Table>
        </Table.ScrollContainer>
    );
};

// ── Main Component ───────────────────────────────────────────────────

export const ForecastView: React.FC = () => {
    const {
        employees,
        assessments,
        qualificationMeasures,
        qualificationPlans,
        skills,
        categories,
        subcategories,
        roles,
    } = useData();
    const { anonymizeName } = usePrivacy();
    const computedColorScheme = useComputedColorScheme("light");
    const isDark = computedColorScheme === "dark";

    const [horizonMonths, setHorizonMonths] = useState<string>("6");

    const forecast: ForecastResult = useMemo(() => {
        return generateForecastWithPlans(
            employees,
            assessments,
            qualificationMeasures,
            qualificationPlans,
            skills,
            categories,
            subcategories,
            roles,
            parseInt(horizonMonths, 10)
        );
    }, [
        employees,
        assessments,
        qualificationMeasures,
        qualificationPlans,
        skills,
        categories,
        subcategories,
        roles,
        horizonMonths,
    ]);

    const chartData = useMemo(() => {
        const horizon = parseInt(horizonMonths, 10);
        const data = [];
        const today = new Date();

        for (let m = 0; m <= horizon; m++) {
            // Optimization: If 12 months, maybe skip some? No, 13 points is fine.
            const res = generateForecastWithPlans(
                employees,
                assessments,
                qualificationMeasures,
                qualificationPlans,
                skills,
                categories,
                subcategories,
                roles,
                m
            );

            const d = new Date(today);
            d.setMonth(d.getMonth() + m);
            const label = d.toLocaleDateString('de-DE', { month: 'short', year: '2-digit' });

            data.push({
                label,
                month: m,
                xp: res.kpis.forecastTotalXP,
                fulfillment: res.kpis.forecastAvgScore,
                employees: res.kpis.forecastEmployeeCount
            });
        }
        return data;
    }, [
        employees,
        assessments,
        qualificationMeasures,
        qualificationPlans,
        skills,
        categories,
        subcategories,
        roles,
        horizonMonths
    ]);

    const horizonLabel = new Date(forecast.scenario.horizonDate).toLocaleDateString("de-DE", {
        month: "long",
        year: "numeric",
    });

    return (
        <Stack gap="lg">
            {/* Header */}
            <Group justify="space-between">
                <Group gap="sm">
                    <ThemeIcon variant="light" size="lg" radius="md" color="violet">
                        <IconCalendarStats size={20} />
                    </ThemeIcon>
                    <div>
                        <Text fw={700} size="lg">
                            Qualifizierungs-Prognose
                        </Text>
                        <Text size="xs" c="dimmed">
                            Prognose bis {horizonLabel}
                        </Text>
                    </div>
                </Group>

                <SegmentedControl
                    value={horizonMonths}
                    onChange={setHorizonMonths}
                    data={[
                        { value: "3", label: "3 Mon." },
                        { value: "6", label: "6 Mon." },
                        { value: "12", label: "1 Jahr" },
                        { value: "24", label: "2 Jahre" },
                    ]}
                    size="sm"
                />
            </Group>

            {/* KPI Cards */}
            <SimpleGrid cols={{ base: 1, sm: 2, lg: 5 }} spacing="md">
                {/* Avg Score */}
                <Card shadow="sm" padding="lg" radius="md" withBorder>
                    <Group justify="space-between" mb="xs">
                        <ThemeIcon
                            variant="light"
                            size="xl"
                            radius="md"
                            color={forecast.kpis.scoreDelta >= 0 ? "green" : "orange"}
                        >
                            {forecast.kpis.scoreDelta >= 0 ? (
                                <IconTrendingUp size={24} />
                            ) : (
                                <IconTrendingDown size={24} />
                            )}
                        </ThemeIcon>
                        <DeltaBadge delta={forecast.kpis.scoreDelta} suffix="%" />
                    </Group>
                    <Group gap="xs" align="baseline">
                        <Text size="xl" fw={700}>
                            {forecast.kpis.currentAvgScore}%
                        </Text>
                        <Text size="sm" c="dimmed">→</Text>
                        <Text size="xl" fw={700} c={forecast.kpis.scoreDelta >= 0 ? "green" : "orange"}>
                            {forecast.kpis.forecastAvgScore}%
                        </Text>
                    </Group>
                    <Text size="sm" c="dimmed" mt={4}>
                        Ø Soll-Erfüllung
                    </Text>
                </Card>

                {/* Total XP */}
                <Card shadow="sm" padding="lg" radius="md" withBorder>
                    <Group justify="space-between" mb="xs">
                        <ThemeIcon
                            variant="light"
                            size="xl"
                            radius="md"
                            color={forecast.kpis.xpDelta >= 0 ? "blue" : "orange"}
                        >
                            <IconSum size={24} />
                        </ThemeIcon>
                        <DeltaBadge delta={forecast.kpis.xpDelta} />
                    </Group>
                    <Group gap="xs" align="baseline">
                        <Text size="xl" fw={700}>
                            {forecast.kpis.currentTotalXP}
                        </Text>
                        <Text size="sm" c="dimmed">→</Text>
                        <Text size="xl" fw={700} c={forecast.kpis.xpDelta >= 0 ? "blue" : "orange"}>
                            {forecast.kpis.forecastTotalXP}
                        </Text>
                        <Text size="xs" c="dimmed">XP</Text>
                    </Group>
                    <Text size="sm" c="dimmed" mt={4}>
                        Gesamt-Qualifikation
                    </Text>
                </Card>

                {/* Deficit Count */}
                <Card shadow="sm" padding="lg" radius="md" withBorder>
                    <Group justify="space-between" mb="xs">
                        <ThemeIcon
                            variant="light"
                            size="xl"
                            radius="md"
                            color={forecast.kpis.deficitDelta <= 0 ? "green" : "red"}
                        >
                            <IconAlertTriangle size={24} />
                        </ThemeIcon>
                        <DeltaBadge delta={forecast.kpis.deficitDelta} invert />
                    </Group>
                    <Group gap="xs" align="baseline">
                        <Text size="xl" fw={700}>
                            {forecast.kpis.currentDeficitCount}
                        </Text>
                        <Text size="sm" c="dimmed">→</Text>
                        <Text
                            size="xl"
                            fw={700}
                            c={forecast.kpis.deficitDelta <= 0 ? "green" : "red"}
                        >
                            {forecast.kpis.forecastDeficitCount}
                        </Text>
                    </Group>
                    <Text size="sm" c="dimmed" mt={4}>
                        Skill-Defizite
                    </Text>
                </Card>

                {/* Departures */}
                <Card shadow="sm" padding="lg" radius="md" withBorder>
                    <Group justify="space-between" mb="xs">
                        <ThemeIcon
                            variant="light"
                            size="xl"
                            radius="md"
                            color={forecast.kpis.departureCount > 0 ? "red" : "green"}
                        >
                            <IconUserMinus size={24} />
                        </ThemeIcon>
                    </Group>
                    <Text size="xl" fw={700}>
                        {forecast.kpis.departureCount}
                    </Text>
                    <Text size="sm" c="dimmed" mt={4}>
                        Abgänge im Zeitraum
                    </Text>
                    {forecast.kpis.departureNames.length > 0 && (
                        <Tooltip
                            label={forecast.kpis.departureNames.map(n => anonymizeName(n)).join(", ")}
                            multiline
                            w={250}
                        >
                            <Text size="xs" c="dimmed" mt={4} style={{ cursor: "help", textDecoration: "underline dotted" }}>
                                {forecast.kpis.departureNames.length} Mitarbeiter
                            </Text>
                        </Tooltip>
                    )}
                </Card>

                {/* Completing Measures */}
                <Card shadow="sm" padding="lg" radius="md" withBorder>
                    <Group justify="space-between" mb="xs">
                        <ThemeIcon variant="light" size="xl" radius="md" color="blue">
                            <IconCertificate size={24} />
                        </ThemeIcon>
                    </Group>
                    <Group gap="xs" align="baseline">
                        <Text size="xl" fw={700}>
                            {forecast.kpis.completingMeasureCount}
                        </Text>
                        <Text size="sm" c="dimmed">
                            / {forecast.kpis.totalPlannedMeasureCount}
                        </Text>
                    </Group>
                    <Text size="sm" c="dimmed" mt={4}>
                        Maßnahmen abgeschlossen
                    </Text>
                </Card>
            </SimpleGrid>

            {/* Forecast Trend Chart */}
            <Paper shadow="xs" p="md" radius="md" withBorder>
                <Text fw={600} mb="md">Prognose-Verlauf</Text>
                <LineChart
                    h={300}
                    data={chartData}
                    dataKey="label"
                    withLegend
                    withYAxis={false}
                    yAxisProps={{ domain: [0, 'auto'] }}
                    rightYAxisProps={{ domain: [0, 100] }}
                    series={[
                        { name: 'xp', label: 'Gesamt-XP', color: 'blue.6', yAxisId: 'left' },
                        { name: 'fulfillment', label: 'Soll-Erfüllung (%)', color: 'teal.6', yAxisId: 'right' },
                        { name: 'employees', label: 'Mitarbeiter', color: 'gray.6', yAxisId: 'right', strokeDasharray: '5 5' },
                    ]}
                    curveType="monotone"
                    tickLine="y"
                />
            </Paper>

            {/* Category Comparison */}
            <Paper shadow="xs" p="md" radius="md" withBorder>
                <Text fw={600} mb="md">
                    Prognose nach Kategorie
                </Text>
                <CategoryBarChart bars={forecast.categoryBars} />
            </Paper>

            {/* Employee Detail Table */}
            <Paper shadow="xs" p="md" radius="md" withBorder>
                <Group justify="space-between" mb="md">
                    <Text fw={600}>
                        Mitarbeiter-Prognose
                    </Text>
                    <Badge variant="light" color="gray" size="sm">
                        {forecast.employeeRows.length} Mitarbeiter
                    </Badge>
                </Group>
                <EmployeeTable
                    rows={forecast.employeeRows}
                    anonymizeName={anonymizeName}
                />
            </Paper>

            {/* Info Footer */}
            <Paper
                p="sm"
                radius="md"
                style={{
                    backgroundColor: isDark
                        ? "rgba(34, 139, 230, 0.08)"
                        : "rgba(34, 139, 230, 0.04)",
                    border: `1px solid ${isDark ? "rgba(34, 139, 230, 0.2)" : "rgba(34, 139, 230, 0.15)"}`,
                }}
            >
                <Text size="xs" c="dimmed">
                    <strong>Hinweis:</strong> Die Werte zeigen den <strong>Soll-Erfüllungsgrad</strong>: Nur Skills
                    mit definiertem Soll zählen für den Durchschnitt. Zusatz-Skills ohne Soll werden im
                    Tooltip aufgeschlüsselt, ziehen den Schnitt aber nicht runter. Die Prognose basiert auf
                    der Annahme, dass alle geplanten Maßnahmen mit Zieldatum vor dem {horizonLabel} erfolgreich
                    abgeschlossen werden.
                </Text>
            </Paper>
        </Stack>
    );
};
