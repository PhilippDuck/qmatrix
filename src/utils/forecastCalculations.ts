/**
 * Forecast / Prognose Berechnungen
 * 
 * Simuliert zukünftige Qualifizierungsstände basierend auf:
 * - Geplante Maßnahmen (pending/in_progress mit targetDate)
 * - Mitarbeiter-Abgänge (deactivationDate in der Zukunft)
 */

import type { Employee, Assessment, QualificationMeasure, Skill, Category, SubCategory, EmployeeRole } from "../services/indexeddb";
import { getMaxRoleTargetForSkill } from "./skillCalculations";

// ── Types ────────────────────────────────────────────────────────────

export interface ForecastScenario {
    label: string;
    months: number;
    horizonDate: Date;
}

export interface ForecastSkillBreakdown {
    skillId: string;
    skillName: string;
    currentLevel: number;
    targetLevel: number | undefined;
    currentFulfillment: number;
    forecastLevel: number;
    forecastFulfillment: number;
}

export interface ForecastEmployeeRow {
    employeeId: string;
    employeeName: string;
    department?: string;
    currentAvgScore: number | null;
    forecastAvgScore: number | null;
    delta: number;
    isDeparting: boolean;
    departureDate?: string;
    plannedMeasureCount: number;
    completingMeasureCount: number;
    skillBreakdown: ForecastSkillBreakdown[];
}

export interface ForecastCategoryBar {
    categoryId: string;
    categoryName: string;
    currentAvgScore: number;
    forecastAvgScore: number;
    delta: number;
}

export interface ForecastKPIs {
    currentAvgScore: number;
    forecastAvgScore: number;
    scoreDelta: number;
    currentDeficitCount: number;
    forecastDeficitCount: number;
    deficitDelta: number;
    departureCount: number;
    departureNames: string[];
    completingMeasureCount: number;
    totalPlannedMeasureCount: number;
    currentTotalXP: number;
    forecastTotalXP: number;
    xpDelta: number;
}

export interface ForecastResult {
    kpis: ForecastKPIs;
    employeeRows: ForecastEmployeeRow[];
    categoryBars: ForecastCategoryBar[];
    scenario: ForecastScenario;
}

// ── Helpers ──────────────────────────────────────────────────────────

/**
 * Berechnet den Erfüllungsgrad eines Assessments.
 * Wenn ein Soll (targetLevel) definiert ist: Erfüllung = min(100, level/targetLevel * 100)
 *   → 75% Ist bei 75% Soll = 100% Erfüllung
 *   → 0% Ist bei 75% Soll = 0% Erfüllung
 * Ohne Soll: Rohwert wird verwendet (level selbst).
 * level = -1 (N/A) → -1 (signalisiert "nicht bewertet")
 */
function fulfillmentScore(level: number, targetLevel?: number): number {
    if (level < 0) return -1; // N/A = not assessed
    if (targetLevel && targetLevel > 0) {
        return Math.min(100, Math.round((level / targetLevel) * 100));
    }
    return level; // Fallback: raw level if no Soll defined
}

/** Average for raw level arrays – ignores 0 and -1 (N/A). */
function avgScore(levels: number[]): number | null {
    const valid = levels.filter(l => l > 0); // ignore 0 and -1 (N/A)
    if (valid.length === 0) return null;
    return Math.round(valid.reduce((s, v) => s + v, 0) / valid.length);
}

/** Average for Soll-fulfillment arrays – includes 0% (level=0 with Soll), ignores -1 (N/A). */
function avgFulfillment(values: number[]): number | null {
    const valid = values.filter(v => v >= 0); // include 0% fulfillment, exclude -1 (N/A)
    if (valid.length === 0) return null;
    return Math.round(valid.reduce((s, v) => s + v, 0) / valid.length);
}

function countDeficits(
    assessments: Assessment[],
    measures: QualificationMeasure[],
    activeEmployeeIds: Set<string>,
    effectiveTarget: (empId: string, skillId: string) => number,
): number {
    let deficits = 0;
    for (const a of assessments) {
        if (!activeEmployeeIds.has(a.employeeId)) continue;
        const target = effectiveTarget(a.employeeId, a.skillId);
        if (target > 0 && a.level < target) {
            deficits++;
        }
    }
    return deficits;
}

// ── Main Forecast Function ───────────────────────────────────────────

export function generateForecast(
    employees: Employee[],
    assessments: Assessment[],
    measures: QualificationMeasure[],
    skills: Skill[],
    categories: Category[],
    subcategories: SubCategory[],
    horizonMonths: number,
): ForecastResult {
    const now = new Date();
    const horizonDate = new Date(now);
    horizonDate.setMonth(horizonDate.getMonth() + horizonMonths);

    const scenario: ForecastScenario = {
        label: `${horizonMonths} Monate`,
        months: horizonMonths,
        horizonDate,
    };

    // ── Identify departures ────────────────────────────────────────
    const departures = employees.filter(emp => {
        if (emp.isActive === false && emp.deactivationDate) {
            const deactDate = new Date(emp.deactivationDate);
            return deactDate > now && deactDate <= horizonDate;
        }
        return false;
    });
    const departingIds = new Set(departures.map(e => e.id!));

    // Active employees NOW
    const currentActiveEmployees = employees.filter(e => e.isActive !== false);
    const currentActiveIds = new Set(currentActiveEmployees.map(e => e.id!));

    // Active employees in FORECAST (remove departures)
    const forecastActiveIds = new Set(
        [...currentActiveIds].filter(id => !departingIds.has(id))
    );

    // ── Identify completing measures ──────────────────────────────
    const pendingOrInProgress = measures.filter(
        m => m.status === "pending" || m.status === "in_progress"
    );
    const completingMeasures = pendingOrInProgress.filter(m => {
        if (!m.targetDate) return false;
        const target = new Date(m.targetDate);
        return target <= horizonDate;
    });

    // ── Build forecast assessments ─────────────────────────────────
    // Start with a clone of current assessments
    const forecastAssessmentMap = new Map<string, number>();
    for (const a of assessments) {
        const key = `${a.employeeId}::${a.skillId}`;
        forecastAssessmentMap.set(key, a.level);
    }

    // Apply completing measures: bump level to targetLevel
    for (const m of completingMeasures) {
        // Find which employee this measure belongs to
        // measures have planId → we need to map planId → employeeId
        // But we don't have plans here. Let's find the assessment by skillId for employees that have this plan's measures.
        // Alternative: iterate assessments to find matches
        // Actually, we need the qualification plans to resolve planId → employeeId
        // For simplicity, let's use the assessment key: find the employee who has a pending measure
        // We'll need to find the employee from measures differently.
        // The measure has a planId, and the plan has an employeeId.
        // Since we don't have plans passed in, let's find any assessment for this skillId where the employee is active.

        // Actually, let's find the employee from existing assessments:
        // Finding the right employee for a measure: iterate all assessments with that skillId
        for (const a of assessments) {
            if (a.skillId === m.skillId && forecastActiveIds.has(a.employeeId)) {
                const key = `${a.employeeId}::${a.skillId}`;
                const currentLevel = forecastAssessmentMap.get(key) ?? 0;
                if (m.targetLevel > currentLevel) {
                    forecastAssessmentMap.set(key, m.targetLevel);
                }
            }
        }
    }

    // ── Calculate current KPIs ─────────────────────────────────────
    const currentLevels = assessments
        .filter(a => currentActiveIds.has(a.employeeId) && a.level > 0)
        .map(a => a.level);
    const currentAvgScore = avgScore(currentLevels) ?? 0;
    const currentDeficits = countDeficits(assessments, measures, currentActiveIds, (empId, skillId) => {
        const found = assessments.find(x => x.employeeId === empId && x.skillId === skillId);
        return found?.targetLevel || 0;
    });

    // ── Calculate forecast KPIs ────────────────────────────────────
    const forecastLevels: number[] = [];
    for (const [key, level] of forecastAssessmentMap) {
        const empId = key.split("::")[0];
        if (forecastActiveIds.has(empId) && level > 0) {
            forecastLevels.push(level);
        }
    }
    const forecastAvgScore = avgScore(forecastLevels) ?? 0;

    // Count forecast deficits
    let forecastDeficits = 0;
    for (const a of assessments) {
        if (!forecastActiveIds.has(a.employeeId)) continue;
        if (a.targetLevel && a.targetLevel > 0) {
            const key = `${a.employeeId}::${a.skillId}`;
            const forecastLevel = forecastAssessmentMap.get(key) ?? a.level;
            if (forecastLevel < a.targetLevel) {
                forecastDeficits++;
            }
        }
    }

    const kpis: ForecastKPIs = {
        currentAvgScore,
        forecastAvgScore,
        scoreDelta: forecastAvgScore - currentAvgScore,
        currentDeficitCount: currentDeficits,
        forecastDeficitCount: forecastDeficits,
        deficitDelta: forecastDeficits - currentDeficits,
        departureCount: departures.length,
        departureNames: departures.map(e => e.name),
        completingMeasureCount: completingMeasures.length,
        totalPlannedMeasureCount: pendingOrInProgress.length,
        currentTotalXP: 0,
        forecastTotalXP: 0,
        xpDelta: 0,
    };

    // ── Employee rows ──────────────────────────────────────────────
    const employeeRows: ForecastEmployeeRow[] = currentActiveEmployees.map(emp => {
        const empAssessments = assessments.filter(a => a.employeeId === emp.id);
        const currentLevels = empAssessments.filter(a => a.level > 0).map(a => a.level);
        const currentAvg = avgScore(currentLevels);

        // Forecast levels for this employee
        const forecastLevels: number[] = [];
        for (const a of empAssessments) {
            const key = `${a.employeeId}::${a.skillId}`;
            const fl = forecastAssessmentMap.get(key) ?? a.level;
            if (fl > 0) forecastLevels.push(fl);
        }
        const forecastAvg = departingIds.has(emp.id!) ? null : avgScore(forecastLevels);

        const empMeasures = pendingOrInProgress.filter(m =>
            empAssessments.some(a => a.skillId === m.skillId)
        );
        const empCompleting = completingMeasures.filter(m =>
            empAssessments.some(a => a.skillId === m.skillId)
        );

        const departure = departures.find(d => d.id === emp.id);

        return {
            employeeId: emp.id!,
            employeeName: emp.name,
            department: emp.department,
            currentAvgScore: currentAvg,
            forecastAvgScore: forecastAvg,
            delta: (forecastAvg ?? 0) - (currentAvg ?? 0),
            isDeparting: departingIds.has(emp.id!),
            departureDate: departure?.deactivationDate,
            plannedMeasureCount: empMeasures.length,
            completingMeasureCount: empCompleting.length,
            skillBreakdown: [],
        };
    });

    // Sort by delta descending (biggest improvers first)
    employeeRows.sort((a, b) => b.delta - a.delta);

    // ── Category bars ──────────────────────────────────────────────
    const categoryBars: ForecastCategoryBar[] = categories.map(cat => {
        // Find all skills in this category
        const catSubcats = subcategories.filter(sc => sc.categoryId === cat.id);
        const catSubcatIds = new Set(catSubcats.map(sc => sc.id!));
        const catSkills = skills.filter(s => catSubcatIds.has(s.subCategoryId));
        const catSkillIds = new Set(catSkills.map(s => s.id!));

        // Current scores for this category
        const catCurrentLevels = assessments
            .filter(a => catSkillIds.has(a.skillId) && currentActiveIds.has(a.employeeId) && a.level > 0)
            .map(a => a.level);
        const catCurrentAvg = avgScore(catCurrentLevels) ?? 0;

        // Forecast scores for this category
        const catForecastLevels: number[] = [];
        for (const a of assessments) {
            if (!catSkillIds.has(a.skillId)) continue;
            if (!forecastActiveIds.has(a.employeeId)) continue;
            const key = `${a.employeeId}::${a.skillId}`;
            const fl = forecastAssessmentMap.get(key) ?? a.level;
            if (fl > 0) catForecastLevels.push(fl);
        }
        const catForecastAvg = avgScore(catForecastLevels) ?? 0;

        return {
            categoryId: cat.id!,
            categoryName: cat.name,
            currentAvgScore: catCurrentAvg,
            forecastAvgScore: catForecastAvg,
            delta: catForecastAvg - catCurrentAvg,
        };
    });

    return {
        kpis,
        employeeRows,
        categoryBars,
        scenario,
    };
}

/**
 * Verbesserte Version: Nutzt QualificationPlans um die korrekte
 * Zuordnung Measure → Employee aufzulösen.
 */
export function generateForecastWithPlans(
    employees: Employee[],
    assessments: Assessment[],
    measures: QualificationMeasure[],
    plans: { id?: string; employeeId: string; status: string }[],
    skills: Skill[],
    categories: Category[],
    subcategories: SubCategory[],
    roles: EmployeeRole[],
    horizonMonths: number,
): ForecastResult {
    const now = new Date();
    const horizonDate = new Date(now);
    horizonDate.setMonth(horizonDate.getMonth() + horizonMonths);

    const scenario: ForecastScenario = {
        label: `${horizonMonths} Monate`,
        months: horizonMonths,
        horizonDate,
    };

    // Build planId → employeeId map
    const planToEmployee = new Map<string, string>();
    for (const p of plans) {
        if (p.id) planToEmployee.set(p.id, p.employeeId);
    }

    // ── Identify departures ────────────────────────────────────────
    // Key insight: When an employee has a FUTURE deactivation date,
    // they still have isActive=true (DataContext only sets isActive=false
    // when deactivationDate <= now). So we must check for:
    // 1. Active employees with a future deactivationDate within horizon
    // 2. Already-inactive employees (deactivationDate in the past)
    const futureDepartures = employees.filter(emp => {
        if (!emp.deactivationDate) return false;
        const deactDate = new Date(emp.deactivationDate);
        // Employee is still active but will depart within forecast horizon
        return emp.isActive !== false && deactDate > now && deactDate <= horizonDate;
    });
    const alreadyDeparted = employees.filter(emp => emp.isActive === false);

    const departingIds = new Set(futureDepartures.map(e => e.id!));
    const alreadyDepartedIds = new Set(alreadyDeparted.map(e => e.id!));

    // Current active employees (isActive !== false)
    const currentActiveEmployees = employees.filter(e => e.isActive !== false);
    const currentActiveIds = new Set(currentActiveEmployees.map(e => e.id!));

    // Forecast: currently active minus future departures
    const forecastActiveIds = new Set(
        [...currentActiveIds].filter(id => !departingIds.has(id))
    );

    // ── Identify completing measures ──────────────────────────────
    const pendingOrInProgress = measures.filter(
        m => m.status === "pending" || m.status === "in_progress"
    );
    const completingMeasures = pendingOrInProgress.filter(m => {
        if (!m.targetDate) return false;
        return new Date(m.targetDate) <= horizonDate;
    });

    // ── Build forecast assessments ─────────────────────────────────
    const forecastAssessmentMap = new Map<string, number>();
    for (const a of assessments) {
        forecastAssessmentMap.set(`${a.employeeId}::${a.skillId}`, a.level);
    }

    // Apply completing measures
    for (const m of completingMeasures) {
        const employeeId = planToEmployee.get(m.planId);
        if (!employeeId || !forecastActiveIds.has(employeeId)) continue;

        const key = `${employeeId}::${m.skillId}`;
        const currentLevel = forecastAssessmentMap.get(key) ?? 0;
        if (m.targetLevel > currentLevel) {
            forecastAssessmentMap.set(key, m.targetLevel);
        }
    }

    // ── Build effective target lookup ──────────────────────────────
    // Math.max(individualTarget, roleTarget) for each employee-skill pair
    const employeeMap = new Map<string, Employee>();
    for (const emp of employees) { if (emp.id) employeeMap.set(emp.id, emp); }

    const effectiveTargetCache = new Map<string, number>();
    const effectiveTarget = (empId: string, skillId: string): number => {
        const key = `${empId}::${skillId}`;
        const cached = effectiveTargetCache.get(key);
        if (cached !== undefined) return cached;
        const emp = employeeMap.get(empId);
        const asm = assessments.find(a => a.employeeId === empId && a.skillId === skillId);
        const individualTarget = asm?.targetLevel || 0;
        const roleTarget = getMaxRoleTargetForSkill(emp?.roles, skillId, roles) || 0;
        const target = Math.max(individualTarget, roleTarget);
        effectiveTargetCache.set(key, target);
        return target;
    };

    // ── KPIs ───────────────────────────────────────────────────────
    // Only skills WITH Soll count for fulfillment average.
    // For Soll-skills: include level=0 (0% fulfillment), exclude level=-1 (N/A)
    // Fallback to raw levels if no Soll-skills exist.
    const currentWithSoll = assessments
        .filter(a => currentActiveIds.has(a.employeeId) && a.level >= 0 && effectiveTarget(a.employeeId, a.skillId) > 0)
        .map(a => fulfillmentScore(a.level, effectiveTarget(a.employeeId, a.skillId)));
    const currentWithoutSoll = assessments
        .filter(a => currentActiveIds.has(a.employeeId) && a.level > 0 && effectiveTarget(a.employeeId, a.skillId) <= 0)
        .map(a => a.level);
    const currentAvgScoreVal = (currentWithSoll.length > 0 ? avgFulfillment(currentWithSoll) : avgScore(currentWithoutSoll)) ?? 0;
    const currentDeficits = countDeficits(assessments, measures, currentActiveIds, effectiveTarget);

    // Calculate Current Total XP
    let currentTotalXP = 0;
    for (const a of assessments) {
        if (currentActiveIds.has(a.employeeId) && a.level > 0) {
            currentTotalXP += a.level;
        }
    }

    const forecastWithSoll: number[] = [];
    const forecastWithoutSoll: number[] = [];
    let forecastTotalXP = 0;
    for (const [key, level] of forecastAssessmentMap) {
        const empId = key.split("::")[0];
        const skillId = key.split("::")[1];
        if (!forecastActiveIds.has(empId)) continue;

        // XP Calculation
        if (level > 0) forecastTotalXP += level;

        const target = effectiveTarget(empId, skillId);
        if (target > 0) {
            if (level >= 0) forecastWithSoll.push(fulfillmentScore(level, target));
        } else {
            if (level > 0) forecastWithoutSoll.push(level);
        }
    }
    const forecastAvgScoreVal = (forecastWithSoll.length > 0 ? avgFulfillment(forecastWithSoll) : avgScore(forecastWithoutSoll)) ?? 0;

    let forecastDeficits = 0;
    for (const a of assessments) {
        if (!forecastActiveIds.has(a.employeeId)) continue;
        const target = effectiveTarget(a.employeeId, a.skillId);
        if (target > 0) {
            const key = `${a.employeeId}::${a.skillId}`;
            const fl = forecastAssessmentMap.get(key) ?? a.level;
            if (fl < target) forecastDeficits++;
        }
    }

    const kpis: ForecastKPIs = {
        currentAvgScore: currentAvgScoreVal,
        forecastAvgScore: forecastAvgScoreVal,
        scoreDelta: forecastAvgScoreVal - currentAvgScoreVal,
        currentDeficitCount: currentDeficits,
        forecastDeficitCount: forecastDeficits,
        deficitDelta: forecastDeficits - currentDeficits,
        departureCount: futureDepartures.length,
        departureNames: futureDepartures.map(e => e.name),
        completingMeasureCount: completingMeasures.length,
        totalPlannedMeasureCount: pendingOrInProgress.length,
        currentTotalXP,
        forecastTotalXP,
        xpDelta: forecastTotalXP - currentTotalXP,
    };

    // ── Employee rows ──────────────────────────────────────────────
    // Build measure → employee mapping for counting
    const measuresByEmployee = new Map<string, QualificationMeasure[]>();
    const completingByEmployee = new Map<string, QualificationMeasure[]>();
    for (const m of pendingOrInProgress) {
        const empId = planToEmployee.get(m.planId);
        if (!empId) continue;
        if (!measuresByEmployee.has(empId)) measuresByEmployee.set(empId, []);
        measuresByEmployee.get(empId)!.push(m);
    }
    for (const m of completingMeasures) {
        const empId = planToEmployee.get(m.planId);
        if (!empId) continue;
        if (!completingByEmployee.has(empId)) completingByEmployee.set(empId, []);
        completingByEmployee.get(empId)!.push(m);
    }

    // Build skill name lookup
    const skillNameMap = new Map<string, string>();
    for (const s of skills) {
        if (s.id) skillNameMap.set(s.id, s.name);
    }

    const employeeRows: ForecastEmployeeRow[] = currentActiveEmployees.map(emp => {
        const empAssessments = assessments.filter(a => a.employeeId === emp.id);
        // Only skills WITH Soll count for the fulfillment average
        // For Soll-skills: include level=0 (0% fulfillment), exclude level=-1 (N/A)
        const curWithSoll = empAssessments
            .filter(a => a.level >= 0 && effectiveTarget(emp.id!, a.skillId) > 0)
            .map(a => fulfillmentScore(a.level, effectiveTarget(emp.id!, a.skillId)));
        const curWithoutSoll = empAssessments
            .filter(a => a.level > 0 && effectiveTarget(emp.id!, a.skillId) <= 0)
            .map(a => a.level);
        const currentAvg = (curWithSoll.length > 0 ? avgFulfillment(curWithSoll) : avgScore(curWithoutSoll));

        const fWithSoll: number[] = [];
        const fWithoutSoll: number[] = [];
        const breakdown: ForecastSkillBreakdown[] = [];

        for (const a of empAssessments) {
            const key = `${a.employeeId}::${a.skillId}`;
            const fl = forecastAssessmentMap.get(key) ?? a.level;
            const target = effectiveTarget(emp.id!, a.skillId);
            const curFul = fulfillmentScore(a.level, target || undefined);
            const fcFul = fulfillmentScore(fl, target || undefined);

            if (target > 0) {
                if (fl >= 0) fWithSoll.push(fcFul);
            } else {
                if (fl > 0) fWithoutSoll.push(fl);
            }

            // Include in breakdown if level >= 0 (has Soll) or level > 0 (any rating)
            if (a.level > 0 || (a.level >= 0 && target > 0)) {
                breakdown.push({
                    skillId: a.skillId,
                    skillName: skillNameMap.get(a.skillId) ?? a.skillId,
                    currentLevel: a.level,
                    targetLevel: target || undefined,
                    currentFulfillment: Math.max(0, curFul),
                    forecastLevel: fl,
                    forecastFulfillment: Math.max(0, fcFul),
                });
            }
        }

        // Sort breakdown: by fulfillment ascending (lowest first)
        breakdown.sort((a, b) => a.currentFulfillment - b.currentFulfillment);

        const forecastAvg = departingIds.has(emp.id!) ? null : (fWithSoll.length > 0 ? avgFulfillment(fWithSoll) : avgScore(fWithoutSoll));

        const departure = futureDepartures.find(d => d.id === emp.id);

        return {
            employeeId: emp.id!,
            employeeName: emp.name,
            department: emp.department,
            currentAvgScore: currentAvg,
            forecastAvgScore: forecastAvg,
            delta: (forecastAvg ?? 0) - (currentAvg ?? 0),
            isDeparting: departingIds.has(emp.id!),
            departureDate: departure?.deactivationDate,
            plannedMeasureCount: measuresByEmployee.get(emp.id!)?.length ?? 0,
            completingMeasureCount: completingByEmployee.get(emp.id!)?.length ?? 0,
            skillBreakdown: breakdown,
        };
    });

    employeeRows.sort((a, b) => b.delta - a.delta);

    // ── Category bars ──────────────────────────────────────────────
    const categoryBars: ForecastCategoryBar[] = categories.map(cat => {
        const catSubcats = subcategories.filter(sc => sc.categoryId === cat.id);
        const catSubcatIds = new Set(catSubcats.map(sc => sc.id!));
        const catSkills = skills.filter(s => catSubcatIds.has(s.subCategoryId));
        const catSkillIds = new Set(catSkills.map(s => s.id!));

        const catCurWithSoll = assessments
            .filter(a => catSkillIds.has(a.skillId) && currentActiveIds.has(a.employeeId) && a.level >= 0 && effectiveTarget(a.employeeId, a.skillId) > 0)
            .map(a => fulfillmentScore(a.level, effectiveTarget(a.employeeId, a.skillId)));
        const catCurWithoutSoll = assessments
            .filter(a => catSkillIds.has(a.skillId) && currentActiveIds.has(a.employeeId) && a.level > 0 && effectiveTarget(a.employeeId, a.skillId) <= 0)
            .map(a => a.level);
        const catCurAvg = (catCurWithSoll.length > 0 ? avgFulfillment(catCurWithSoll) : avgScore(catCurWithoutSoll)) ?? 0;

        const catFWithSoll: number[] = [];
        const catFWithoutSoll: number[] = [];
        for (const a of assessments) {
            if (!catSkillIds.has(a.skillId) || !forecastActiveIds.has(a.employeeId)) continue;
            const key = `${a.employeeId}::${a.skillId}`;
            const fl = forecastAssessmentMap.get(key) ?? a.level;
            const target = effectiveTarget(a.employeeId, a.skillId);
            if (target > 0) {
                if (fl >= 0) catFWithSoll.push(fulfillmentScore(fl, target));
            } else {
                if (fl > 0) catFWithoutSoll.push(fl);
            }
        }
        const catFAvg = (catFWithSoll.length > 0 ? avgFulfillment(catFWithSoll) : avgScore(catFWithoutSoll)) ?? 0;

        return {
            categoryId: cat.id!,
            categoryName: cat.name,
            currentAvgScore: catCurAvg,
            forecastAvgScore: catFAvg,
            delta: catFAvg - catCurAvg,
        };
    });

    return { kpis, employeeRows, categoryBars, scenario };
}
