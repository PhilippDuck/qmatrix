import { AssessmentLogEntry } from "../context/DataContext";

/**
 * Berechnet XP zu einem bestimmten Zeitpunkt in der Vergangenheit.
 * Nutzt aktuelle Bewertungen und History-Logs um den historischen Stand zu rekonstruieren.
 */
export const calculateHistoricalXP = (
    currentAssessments: { employeeId: string; skillId: string; level: number }[],
    historyLogs: AssessmentLogEntry[],
    beforeTimestamp: number
): number => {
    const levelMap = new Map<string, number>();

    // Start with current assessments
    currentAssessments.forEach(a => {
        levelMap.set(`${a.employeeId}-${a.skillId}`, a.level);
    });

    // Apply history in reverse to get to the previous state
    const recentLogs = historyLogs
        .filter(log => log.timestamp > beforeTimestamp)
        .sort((a, b) => b.timestamp - a.timestamp);

    recentLogs.forEach(log => {
        const key = `${log.employeeId}-${log.skillId}`;
        levelMap.set(key, log.previousLevel);
    });

    return Array.from(levelMap.values()).reduce((sum, level) => sum + level, 0);
};

export type ComparisonPeriod = "quarter" | "year";

export interface PeriodBoundaries {
    currentStart: number;
    previousStart: number;
    previousEnd: number;
}

/**
 * Berechnet die Zeitgrenzen für aktuelle und vorherige Periode.
 */
export const getPeriodBoundaries = (
    period: ComparisonPeriod,
    referenceDate: Date = new Date()
): PeriodBoundaries => {
    const now = referenceDate;

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

/**
 * Berechnet den Durchschnittswert für eine Reihe von Skill-Bewertungen.
 * Ignoriert N/A (-1) Werte.
 */
export const calculateAverageScore = (
    assessments: { level: number }[]
): number | null => {
    const validAssessments = assessments.filter(a => a.level !== -1);

    if (validAssessments.length === 0) return null;

    const total = validAssessments.reduce((sum, a) => sum + a.level, 0);
    return Math.round(total / validAssessments.length);
};

/**
 * Berechnet die prozentuale Veränderung zwischen zwei Werten.
 */
export const calculatePercentageChange = (
    previousValue: number,
    currentValue: number
): number => {
    if (previousValue === 0) {
        return currentValue > 0 ? 100 : 0;
    }
    return Math.round(((currentValue - previousValue) / previousValue) * 100);
};

/**
 * Berechnet die Skill-Abdeckung (Anzahl Mitarbeiter mit Level >= threshold).
 */
export const calculateSkillCoverage = (
    assessments: { level: number }[],
    totalEmployees: number,
    threshold: number = 50
): { count: number; percentage: number } => {
    const qualifiedCount = assessments.filter(a => a.level >= threshold).length;
    const percentage = totalEmployees > 0
        ? Math.round((qualifiedCount / totalEmployees) * 100)
        : 0;

    return { count: qualifiedCount, percentage };
};

/**
 * Berechnet die Zielerfüllung (wie viele Bewertungen erreichen ihr Ziel).
 */
export const calculateGoalFulfillment = (
    assessments: { level: number; targetLevel?: number }[]
): { achieved: number; total: number; percentage: number } => {
    const withTargets = assessments.filter(a => a.targetLevel && a.targetLevel > 0);
    const achieved = withTargets.filter(a => a.level >= (a.targetLevel || 0));

    const percentage = withTargets.length > 0
        ? Math.round((achieved.length / withTargets.length) * 100)
        : 0;

    return {
        achieved: achieved.length,
        total: withTargets.length,
        percentage
    };
};

/**
 * Berechnet den durchschnittlichen Gap zwischen Level und Target.
 */
export const calculateAverageGap = (
    assessments: { level: number; targetLevel?: number }[]
): number => {
    const withTargets = assessments.filter(a => a.targetLevel && a.targetLevel > 0);

    if (withTargets.length === 0) return 0;

    const totalGap = withTargets.reduce(
        (sum, a) => sum + ((a.targetLevel || 0) - a.level),
        0
    );

    return totalGap / withTargets.length;
};
