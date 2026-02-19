import React, { useMemo, useState, useRef, useEffect, useCallback } from "react";
import {
    Paper,
    Group,
    Text,
    Badge,
    Stack,
    Box,
    Tooltip,
    ThemeIcon,
    ActionIcon,
    ScrollArea,
    SegmentedControl,
} from "@mantine/core";
import {
    IconCalendar,
    IconChevronLeft,
    IconChevronRight,
    IconCalendarEvent,
    IconCircleCheck,
    IconCircleDashed,
    IconPlayerPlay,
    IconCircleX,
} from "@tabler/icons-react";
import {
    useData,
    QualificationMeasure,
    QualificationPlan,
    Employee,
    Skill,
    Category,
    SubCategory,
} from "../../context/DataContext";
import { usePrivacy } from "../../context/PrivacyContext";

// ─── Helpers ────────────────────────────────────────────────

const statusColors: Record<QualificationMeasure["status"], string> = {
    pending: "gray",
    in_progress: "blue",
    completed: "green",
    cancelled: "red",
};

const statusLabels: Record<QualificationMeasure["status"], string> = {
    pending: "Geplant",
    in_progress: "Aktiv",
    completed: "Erledigt",
    cancelled: "Abgebrochen",
};

const typeLabels: Record<string, string> = {
    internal: "Internes Mentoring",
    external: "Externe Schulung",
    self_learning: "Selbststudium",
};

/** ISO week number for a given date */
function getISOWeek(d: Date): number {
    const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
    date.setUTCDate(date.getUTCDate() + 4 - (date.getUTCDay() || 7));
    const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
    return Math.ceil(((date.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
}

/** Start of ISO week (Monday) */
function startOfWeek(d: Date): Date {
    const date = new Date(d);
    const day = date.getDay() || 7; // Mon=1 … Sun=7
    date.setDate(date.getDate() - day + 1);
    date.setHours(0, 0, 0, 0);
    return date;
}

/** Add N days to a date */
function addDays(d: Date, n: number): Date {
    const r = new Date(d);
    r.setDate(r.getDate() + n);
    return r;
}

function formatShortDate(ts: number): string {
    return new Date(ts).toLocaleDateString("de-DE", {
        day: "2-digit",
        month: "2-digit",
        year: "2-digit",
    });
}

const MONTH_NAMES = [
    "Jan", "Feb", "Mär", "Apr", "Mai", "Jun",
    "Jul", "Aug", "Sep", "Okt", "Nov", "Dez",
];

// ─── Types ──────────────────────────────────────────────────

interface EmployeeRow {
    employee: Employee;
    measures: (QualificationMeasure & { skillName: string; skillPath: string })[];
}

interface WeekColumn {
    weekNum: number;
    year: number;
    start: Date;
    end: Date; // end of week (Sunday)
    label: string;
    monthLabel?: string; // only on first week of a month
}

// ─── Constants ──────────────────────────────────────────────

const ROW_HEIGHT = 32;
const MIN_WEEK_WIDTH = 48;
const LABEL_WIDTH = 180;
const GROUP_GAP = 2;
const WEEK_COUNT = 16;

// ─── Component ──────────────────────────────────────────────

interface GanttTimelineProps {
    onViewPlan?: (planId: string) => void;
    /** When set, only show measures for this specific plan (single-employee mode) */
    planId?: string;
}

export const GanttTimeline: React.FC<GanttTimelineProps> = ({ onViewPlan, planId: filterPlanId }) => {
    const {
        qualificationMeasures,
        qualificationPlans,
        employees,
        skills,
        categories,
        subcategories,
    } = useData();
    const { anonymizeName } = usePrivacy();

    const [monthOffset, setMonthOffset] = useState(0);
    const [showFilter, setShowFilter] = useState<"active" | "all">("active");
    const containerRef = useRef<HTMLDivElement>(null);
    const [weekWidth, setWeekWidth] = useState(MIN_WEEK_WIDTH);

    // ── Dynamic width calculation ─────────────────────────

    const updateWeekWidth = useCallback(() => {
        if (containerRef.current) {
            const available = containerRef.current.offsetWidth - LABEL_WIDTH - 2; // 2px border
            const dynamic = Math.floor(available / WEEK_COUNT);
            setWeekWidth(Math.max(dynamic, MIN_WEEK_WIDTH));
        }
    }, []);

    useEffect(() => {
        updateWeekWidth();
        const observer = new ResizeObserver(updateWeekWidth);
        if (containerRef.current) observer.observe(containerRef.current);
        return () => observer.disconnect();
    }, [updateWeekWidth]);

    // ── Filter measures ─────────────────────────────────────

    const filteredMeasures = useMemo(() => {
        return qualificationMeasures.filter((m) => {
            if (filterPlanId && m.planId !== filterPlanId) return false;
            if (!m.startDate && !m.targetDate) return false;
            if (showFilter === "active") {
                return m.status === "pending" || m.status === "in_progress";
            }
            return true;
        });
    }, [qualificationMeasures, showFilter, filterPlanId]);

    // ── Group by employee ───────────────────────────────────

    const employeeRows: EmployeeRow[] = useMemo(() => {
        const planMap = new Map<string, QualificationPlan>();
        qualificationPlans.forEach((p) => planMap.set(p.id!, p));

        const skillMap = new Map<string, Skill>();
        skills.forEach((s) => skillMap.set(s.id!, s));

        const catMap = new Map<string, Category>();
        categories.forEach((c) => catMap.set(c.id!, c));

        const subCatMap = new Map<string, SubCategory>();
        subcategories.forEach((sc) => subCatMap.set(sc.id!, sc));

        // Build category path for a skill
        const getSkillPath = (skill: Skill): string => {
            const parts: string[] = [];
            const sub = subCatMap.get(skill.subCategoryId);
            if (sub) {
                // Walk up parentSubCategoryId chain
                let current: SubCategory | undefined = sub;
                const subParts: string[] = [];
                while (current) {
                    subParts.unshift(current.name);
                    current = current.parentSubCategoryId ? subCatMap.get(current.parentSubCategoryId) : undefined;
                }
                const cat = catMap.get(sub.categoryId);
                if (cat) parts.push(cat.name);
                parts.push(...subParts);
            }
            return parts.join(" › ");
        };

        const grouped = new Map<string, (QualificationMeasure & { skillName: string; skillPath: string })[]>();

        filteredMeasures.forEach((m) => {
            const plan = planMap.get(m.planId);
            if (!plan) return;
            const empId = plan.employeeId;
            if (!grouped.has(empId)) grouped.set(empId, []);
            const skill = skillMap.get(m.skillId);
            grouped.get(empId)!.push({
                ...m,
                skillName: skill?.name || "Unbekannt",
                skillPath: skill ? getSkillPath(skill) : "",
            });
        });

        const rows: EmployeeRow[] = [];
        grouped.forEach((measures, empId) => {
            const emp = employees.find((e) => e.id === empId);
            if (!emp) return;
            // Sort measures by startDate
            measures.sort((a, b) => (a.startDate || 0) - (b.startDate || 0));
            rows.push({ employee: emp, measures });
        });

        // Sort by employee name
        rows.sort((a, b) => a.employee.name.localeCompare(b.employee.name, "de"));
        return rows;
    }, [filteredMeasures, qualificationPlans, employees, skills, categories, subcategories]);

    // ── Calculate time window (12 weeks centered around now + offset) ─

    const { weeks, todayOffset } = useMemo(() => {
        const now = new Date();
        const baseStart = startOfWeek(now);
        // Shift by monthOffset (each "month" = 4 weeks)
        const shiftedStart = addDays(baseStart, monthOffset * 28 - 2 * 7); // start 2 weeks before
        const weekCount = 16; // show 16 weeks

        const weeks: WeekColumn[] = [];
        let lastMonth = -1;
        for (let i = 0; i < weekCount; i++) {
            const wStart = addDays(shiftedStart, i * 7);
            const wEnd = addDays(wStart, 6);
            const wNum = getISOWeek(wStart);
            const month = wStart.getMonth();
            weeks.push({
                weekNum: wNum,
                year: wStart.getFullYear(),
                start: wStart,
                end: wEnd,
                label: `KW ${wNum}`,
                monthLabel: month !== lastMonth ? `${MONTH_NAMES[month]} ${wStart.getFullYear()}` : undefined,
            });
            lastMonth = month;
        }

        // Calculate "today" pixel offset from the left edge
        const firstWeekStart = weeks[0].start.getTime();
        const totalMs = weekCount * 7 * 86400000;
        const todayMs = now.getTime() - firstWeekStart;
        const todayOffset = todayMs >= 0 && todayMs <= totalMs
            ? (todayMs / totalMs) * (weekCount * weekWidth)
            : -1;

        return { weeks, todayOffset };
    }, [monthOffset, weekWidth]);

    // ── Calculate bar geometry ──────────────────────────────

    const getBarStyle = (m: QualificationMeasure) => {
        if (!m.startDate || !m.targetDate) return null;

        const firstWeekStart = weeks[0].start.getTime();
        const lastWeekEnd = addDays(weeks[weeks.length - 1].start, 7).getTime();
        const totalMs = lastWeekEnd - firstWeekStart;
        const totalWidth = weeks.length * weekWidth;

        const barStartMs = Math.max(m.startDate, firstWeekStart);
        const barEndMs = Math.min(m.targetDate, lastWeekEnd);

        if (barEndMs <= firstWeekStart || barStartMs >= lastWeekEnd) return null;

        const left = ((barStartMs - firstWeekStart) / totalMs) * totalWidth;
        const width = Math.max(((barEndMs - barStartMs) / totalMs) * totalWidth, 4);

        return { left, width };
    };

    // ── Empty state ─────────────────────────────────────────

    if (filteredMeasures.length === 0) {
        return (
            <Paper p="xl" radius="md" withBorder ta="center">
                <ThemeIcon variant="light" size={50} radius="xl" color="gray" mx="auto" mb="md">
                    <IconCalendar size={30} />
                </ThemeIcon>
                <Text size="lg" fw={600} mb="xs">
                    Keine Maßnahmen mit Zeitraum vorhanden
                </Text>
                <Text size="sm" c="dimmed" maw={400} mx="auto">
                    Erstellen Sie Qualifizierungsmaßnahmen mit Start- und Zieldatum, um sie hier als Timeline zu sehen.
                </Text>
            </Paper>
        );
    }

    // ── Month header spans ──────────────────────────────────

    const monthSpans: { label: string; colStart: number; colSpan: number }[] = [];
    let currentMonth = "";
    let currentStart = 0;
    let currentSpan = 0;

    weeks.forEach((w, i) => {
        const monthKey = `${w.start.getMonth()}-${w.start.getFullYear()}`;
        if (monthKey !== currentMonth) {
            if (currentSpan > 0) {
                monthSpans.push({ label: currentMonth, colStart: currentStart, colSpan: currentSpan });
            }
            currentMonth = monthKey;
            currentStart = i;
            currentSpan = 1;
        } else {
            currentSpan++;
        }
    });
    if (currentSpan > 0) {
        monthSpans.push({ label: currentMonth, colStart: currentStart, colSpan: currentSpan });
    }

    return (
        <Stack gap="md">
            {/* Controls */}
            <Group justify="space-between">
                <Group gap="xs">
                    <ThemeIcon variant="light" size="lg" color="blue" radius="md">
                        <IconCalendarEvent size={20} />
                    </ThemeIcon>
                    <div>
                        <Text size="sm" fw={700}>Maßnahmen-Timeline</Text>
                        <Text size="xs" c="dimmed">
                            {filteredMeasures.length} Maßnahmen{!filterPlanId && ` • ${employeeRows.length} Mitarbeiter`}
                        </Text>
                    </div>
                </Group>

                <Group gap="sm">
                    <SegmentedControl
                        size="xs"
                        value={showFilter}
                        onChange={(v) => setShowFilter(v as "active" | "all")}
                        data={[
                            { label: "Aktiv & Geplant", value: "active" },
                            { label: "Alle", value: "all" },
                        ]}
                    />
                    <Group gap={4}>
                        <ActionIcon variant="light" size="sm" onClick={() => setMonthOffset((o) => o - 1)}>
                            <IconChevronLeft size={14} />
                        </ActionIcon>
                        <Tooltip label="Zurück zu heute">
                            <ActionIcon
                                variant={monthOffset === 0 ? "filled" : "light"}
                                size="sm"
                                color="blue"
                                onClick={() => setMonthOffset(0)}
                            >
                                <IconCalendar size={14} />
                            </ActionIcon>
                        </Tooltip>
                        <ActionIcon variant="light" size="sm" onClick={() => setMonthOffset((o) => o + 1)}>
                            <IconChevronRight size={14} />
                        </ActionIcon>
                    </Group>
                </Group>
            </Group>

            {/* Gantt Chart */}
            <Paper ref={containerRef} withBorder radius="md" style={{ overflow: "hidden" }}>
                <ScrollArea scrollbars="x" type="hover">
                    <div style={{ display: "flex", minWidth: LABEL_WIDTH + weeks.length * weekWidth }}>
                        {/* ── Left: Employee labels ── */}
                        <div
                            style={{
                                width: LABEL_WIDTH,
                                minWidth: LABEL_WIDTH,
                                position: "sticky",
                                left: 0,
                                zIndex: 10,
                                backgroundColor: "var(--mantine-color-body)",
                                borderRight: "2px solid var(--mantine-color-default-border)",
                            }}
                        >
                            {/* Month header placeholder */}
                            <div
                                style={{
                                    height: 24,
                                    borderBottom: "1px solid var(--mantine-color-default-border)",
                                    backgroundColor: "var(--mantine-color-blue-light)",
                                }}
                            />
                            {/* Week header placeholder */}
                            <div
                                style={{
                                    height: 28,
                                    borderBottom: "2px solid var(--mantine-color-default-border)",
                                    display: "flex",
                                    alignItems: "center",
                                    paddingLeft: 12,
                                }}
                            >
                                <Text size="xs" fw={600} c="dimmed" tt="uppercase">
                                    {filterPlanId ? "Skill" : "Mitarbeiter"}
                                </Text>
                            </div>
                            {/* Employee rows */}
                            {employeeRows.map((row) => (
                                <div key={row.employee.id}>
                                    {/* Employee name header (hidden in single-plan mode) */}
                                    {!filterPlanId && (
                                        <div
                                            style={{
                                                height: ROW_HEIGHT,
                                                display: "flex",
                                                alignItems: "center",
                                                paddingLeft: 12,
                                                backgroundColor: "var(--mantine-color-default-hover)",
                                                borderBottom: "1px solid var(--mantine-color-default-border)",
                                            }}
                                        >
                                            <Text size="xs" fw={700} truncate style={{ maxWidth: LABEL_WIDTH - 20 }}>
                                                {anonymizeName(row.employee.name, row.employee.id)}
                                            </Text>
                                        </div>
                                    )}
                                    {/* Measure rows */}
                                    {row.measures.map((m) => (
                                        <div
                                            key={m.id}
                                            style={{
                                                height: ROW_HEIGHT,
                                                display: "flex",
                                                alignItems: "center",
                                                paddingLeft: filterPlanId ? 12 : 20,
                                                borderBottom: "1px solid var(--mantine-color-default-border)",
                                            }}
                                        >
                                            <Tooltip
                                                label={m.skillPath ? `${m.skillPath} › ${m.skillName}` : m.skillName}
                                                position="right"
                                                withArrow
                                                openDelay={300}
                                            >
                                                <Text size="xs" c="dimmed" fw={filterPlanId ? 500 : 400} truncate style={{ maxWidth: LABEL_WIDTH - (filterPlanId ? 20 : 28) }}>
                                                    {m.skillName}
                                                </Text>
                                            </Tooltip>
                                        </div>
                                    ))}
                                    {/* Group separator */}
                                    {!filterPlanId && <div style={{ height: GROUP_GAP }} />}
                                </div>
                            ))}
                        </div>

                        {/* ── Right: Timeline grid ── */}
                        <div style={{ flex: 1, position: "relative" }}>
                            {/* Month headers */}
                            <div style={{ display: "flex", height: 24 }}>
                                {monthSpans.map((span, i) => {
                                    const monthIdx = parseInt(span.label.split("-")[0]);
                                    const yearStr = span.label.split("-")[1];
                                    return (
                                        <div
                                            key={i}
                                            style={{
                                                width: span.colSpan * weekWidth,
                                                display: "flex",
                                                alignItems: "center",
                                                justifyContent: "center",
                                                backgroundColor: "var(--mantine-color-blue-light)",
                                                borderBottom: "1px solid var(--mantine-color-default-border)",
                                                borderRight: "1px solid var(--mantine-color-default-border)",
                                            }}
                                        >
                                            <Text size="xs" fw={700} c="blue">
                                                {MONTH_NAMES[monthIdx]} {yearStr}
                                            </Text>
                                        </div>
                                    );
                                })}
                            </div>

                            {/* Week headers */}
                            <div style={{ display: "flex", height: 28, borderBottom: "2px solid var(--mantine-color-default-border)" }}>
                                {weeks.map((w, i) => {
                                    const isCurrentWeek =
                                        todayOffset >= 0 &&
                                        todayOffset >= i * weekWidth &&
                                        todayOffset < (i + 1) * weekWidth;
                                    return (
                                        <div
                                            key={i}
                                            style={{
                                                width: weekWidth,
                                                display: "flex",
                                                alignItems: "center",
                                                justifyContent: "center",
                                                borderRight: "1px solid var(--mantine-color-default-border)",
                                                backgroundColor: isCurrentWeek ? "var(--mantine-color-blue-light)" : "transparent",
                                            }}
                                        >
                                            <Text size="10px" fw={isCurrentWeek ? 700 : 400} c={isCurrentWeek ? "blue" : "dimmed"}>
                                                {w.label}
                                            </Text>
                                        </div>
                                    );
                                })}
                            </div>

                            {/* Data rows with grid lines */}
                            {employeeRows.map((row) => (
                                <div key={row.employee.id}>
                                    {/* Employee header row (grid background) - hidden in single-plan mode */}
                                    {!filterPlanId && (
                                        <div style={{ height: ROW_HEIGHT, position: "relative", display: "flex" }}>
                                            {weeks.map((_, wi) => (
                                                <div
                                                    key={wi}
                                                    style={{
                                                        width: weekWidth,
                                                        height: ROW_HEIGHT,
                                                        borderRight: "1px solid var(--mantine-color-default-border)",
                                                        borderBottom: "1px solid var(--mantine-color-default-border)",
                                                        backgroundColor: "var(--mantine-color-default-hover)",
                                                    }}
                                                />
                                            ))}
                                        </div>
                                    )}
                                    {/* Measure bars */}
                                    {row.measures.map((m) => {
                                        const bar = getBarStyle(m);
                                        const plan = qualificationPlans.find((p) => p.id === m.planId);
                                        return (
                                            <div
                                                key={m.id}
                                                style={{
                                                    height: ROW_HEIGHT,
                                                    position: "relative",
                                                    display: "flex",
                                                }}
                                            >
                                                {/* Grid bg */}
                                                {weeks.map((_, wi) => (
                                                    <div
                                                        key={wi}
                                                        style={{
                                                            width: weekWidth,
                                                            height: ROW_HEIGHT,
                                                            borderRight: "1px solid var(--mantine-color-default-border)",
                                                            borderBottom: "1px solid var(--mantine-color-default-border)",
                                                        }}
                                                    />
                                                ))}
                                                {/* Bar */}
                                                {bar && (
                                                    <Tooltip
                                                        multiline
                                                        w={240}
                                                        position="top"
                                                        withArrow
                                                        label={
                                                            <Stack gap={4}>
                                                                {m.skillPath && (
                                                                    <Text size="10px" c="dimmed" style={{ opacity: 0.8 }}>
                                                                        {m.skillPath}
                                                                    </Text>
                                                                )}
                                                                <Text size="xs" fw={700}>
                                                                    {m.skillName}
                                                                </Text>
                                                                <Text size="xs">
                                                                    {typeLabels[m.type] || m.type}
                                                                </Text>
                                                                <Text size="xs">
                                                                    Level: {m.currentLevel}% → {m.targetLevel}%
                                                                </Text>
                                                                <Text size="xs">
                                                                    {m.startDate ? formatShortDate(m.startDate) : "?"} – {m.targetDate ? formatShortDate(m.targetDate) : "?"}
                                                                </Text>
                                                                <Badge size="xs" color={statusColors[m.status]} variant="filled">
                                                                    {statusLabels[m.status]}
                                                                </Badge>
                                                            </Stack>
                                                        }
                                                    >
                                                        <div
                                                            onClick={() => plan && onViewPlan?.(plan.id!)}
                                                            style={{
                                                                position: "absolute",
                                                                top: 4,
                                                                left: bar.left,
                                                                width: bar.width,
                                                                height: ROW_HEIGHT - 8,
                                                                borderRadius: 6,
                                                                backgroundColor: `var(--mantine-color-${statusColors[m.status]}-6)`,
                                                                opacity: m.status === "cancelled" ? 0.4 : 1,
                                                                cursor: onViewPlan ? "pointer" : "default",
                                                                display: "flex",
                                                                alignItems: "center",
                                                                paddingLeft: 6,
                                                                paddingRight: 4,
                                                                overflow: "hidden",
                                                                transition: "opacity 0.15s ease, transform 0.1s ease",
                                                                boxShadow: m.status === "in_progress" ? "0 1px 4px rgba(0,0,0,0.15)" : "none",
                                                            }}
                                                            onMouseEnter={(e) => {
                                                                (e.currentTarget as HTMLDivElement).style.opacity = "1";
                                                                (e.currentTarget as HTMLDivElement).style.transform = "scaleY(1.15)";
                                                            }}
                                                            onMouseLeave={(e) => {
                                                                const base = m.status === "cancelled" ? "0.4" : "1";
                                                                (e.currentTarget as HTMLDivElement).style.opacity = base;
                                                                (e.currentTarget as HTMLDivElement).style.transform = "scaleY(1)";
                                                            }}
                                                        >
                                                            <Text
                                                                size="10px"
                                                                c="white"
                                                                fw={600}
                                                                truncate
                                                                style={{
                                                                    lineHeight: 1,
                                                                    textShadow: "0 1px 2px rgba(0,0,0,0.4)",
                                                                }}
                                                            >
                                                                {bar.width > 40 ? m.skillName : ""}
                                                            </Text>
                                                        </div>
                                                    </Tooltip>
                                                )}
                                            </div>
                                        );
                                    })}
                                    {/* Group separator */}
                                    {!filterPlanId && <div style={{ height: GROUP_GAP }} />}
                                </div>
                            ))}

                            {/* Today line */}
                            {todayOffset >= 0 && (
                                <div
                                    style={{
                                        position: "absolute",
                                        top: 0,
                                        bottom: 0,
                                        left: todayOffset,
                                        width: 2,
                                        backgroundColor: "var(--mantine-color-red-6)",
                                        zIndex: 5,
                                        pointerEvents: "none",
                                    }}
                                >
                                    <div
                                        style={{
                                            position: "absolute",
                                            top: -2,
                                            left: -4,
                                            width: 10,
                                            height: 10,
                                            borderRadius: "50%",
                                            backgroundColor: "var(--mantine-color-red-6)",
                                        }}
                                    />
                                </div>
                            )}
                        </div>
                    </div>
                </ScrollArea>
            </Paper>
        </Stack>
    );
};
