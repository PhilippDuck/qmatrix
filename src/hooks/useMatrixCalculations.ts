import { useMemo, useCallback } from "react";
import { Employee, Category, SubCategory, Skill, Assessment, Department, EmployeeRole } from "../store/useStore";
import { getMaxRoleTargetForSkill } from "../utils/skillCalculations";
import { MatrixColumn } from "../components/SkillMatrix/types";
import { MetricMode } from "./useMatrixState";
import { useMantineColorScheme } from "@mantine/core";
import { getAllSkillIdsForCategory, getAllSkillIdsForSubcategory } from "../utils/hierarchyUtils";

// ---------------------------------------------------------------------------
// Module-level persistent average cache
// Lives outside React → survives component unmount/remount (page switches).
// Invalidated automatically when assessments OR roles reference changes
// (i.e. when the user actually edits data), so results are always correct.
// ---------------------------------------------------------------------------
const _avgCache = (() => {
    let _assessmentsRef: unknown = null;
    let _rolesRef: unknown = null;
    let _employeesRef: unknown = null;
    const _values = new Map<string, number | null>();
    return {
        getOrCompute(
            key: string,
            assessments: unknown,
            roles: unknown,
            employees: unknown,
            compute: () => number | null
        ): number | null {
            if (assessments !== _assessmentsRef || roles !== _rolesRef || employees !== _employeesRef) {
                _values.clear();
                _assessmentsRef = assessments;
                _rolesRef = roles;
                _employeesRef = employees;
            }
            if (_values.has(key)) return _values.get(key)!;
            const result = compute();
            _values.set(key, result);
            return result;
        },
    };
})();

export interface UseMatrixCalculationsProps {
    employees: Employee[];
    categories: Category[];
    subcategories: SubCategory[];
    skills: Skill[];
    departments: Department[];
    roles: EmployeeRole[];
    assessments: Assessment[];
    getAssessment: (employeeId: string, skillId: string) => Assessment | undefined;
    focusEmployeeId: string | null;
    showInactive: boolean;
    filterDepartments: string[];
    filterRoles: string[];
    filterCategories: string[];
    filterEmployees: string[];
    filterLevels: number[];
    filterSkills: string[];
    employeeSort: 'asc' | 'desc' | null;
    skillSort: 'asc' | 'desc' | null;
    metricMode: MetricMode;
    showMaxValues: MetricMode;
    groupingMode: 'none' | 'department' | 'role';
    hideEmployees: boolean;
    showOnlyGaps: boolean;
    hideNaColumns: boolean;
    isEditMode: boolean;
}

export function useMatrixCalculations({
    employees, categories, subcategories, skills, departments, roles, getAssessment: _getAssessment, assessments,
    focusEmployeeId, showInactive, filterDepartments, filterRoles, filterEmployees, filterLevels, filterSkills, employeeSort,
    filterCategories, skillSort, metricMode, showMaxValues, groupingMode, hideEmployees, showOnlyGaps, hideNaColumns, isEditMode
}: UseMatrixCalculationsProps) {
    const { colorScheme } = useMantineColorScheme();
    const isDark = colorScheme === 'dark';

    // O(1) assessment lookup map — replaces repeated O(n) .find() across the entire assessments array
    const assessmentMap = useMemo(() => {
        const map = new Map<string, Assessment>();
        assessments.forEach(a => map.set(`${a.employeeId}-${a.skillId}`, a));
        return map;
    }, [assessments]);

    const getAssessmentFast = useCallback(
        (employeeId: string, skillId: string): Assessment | undefined =>
            assessmentMap.get(`${employeeId}-${skillId}`),
        [assessmentMap]
    );

    const displayedEmployees = useMemo(() => {
        let result = employees;

        if (focusEmployeeId) {
            result = result.filter((e) => e.id === focusEmployeeId);
        }

        if (!showInactive) {
            result = result.filter(e => e.isActive !== false);
        }

        if (filterEmployees && filterEmployees.length > 0) {
            result = result.filter((e) => filterEmployees.includes(e.id!));
        }

        if (filterDepartments.length > 0) {
            result = result.filter((e) => filterDepartments.includes(e.department || ''));
        }

        if (filterRoles.length > 0) {
            const selectedRoleNames = roles
                .filter(r => filterRoles.includes(r.id!))
                .map(r => r.name);
            result = result.filter((e) =>
                e.roles && e.roles.some((role: string) => selectedRoleNames.includes(role))
            );
        }

        if (filterCategories.length > 0) {
            // Not applying category filter to employees directly here unless needed,
            // normally category filter only hides columns. 
            // Let's keep existing logic unchanged for categories.
        }

        if (filterLevels && filterLevels.length > 0) {
            const minSelected = Math.min(...filterLevels);
            result = result.filter(e => {
                return skills.some(s => {
                    const asm = getAssessmentFast(e.id!, s.id!);
                    return asm && asm.level >= minSelected;
                });
            });
        }

        if (filterSkills && filterSkills.length > 0) {
            result = result.filter(e => {
                return filterSkills.some(sId => {
                    const asm = getAssessmentFast(e.id!, sId);
                    return asm && asm.level > 0;
                });
            });
        }

        if (showOnlyGaps) {
            // A gap exists if current level is less than the target level (individual or role)
            result = result.filter(e => {
                return skills.some(s => {
                    // If filterSkills is active, only consider gaps in the selected skills
                    if (filterSkills && filterSkills.length > 0 && !filterSkills.includes(s.id!)) {
                        return false;
                    }
                    const asm = getAssessmentFast(e.id!, s.id!);
                    const indTarget = asm?.targetLevel || 0;
                    const roleTarget = getMaxRoleTargetForSkill(e.roles, s.id!, roles) || 0;
                    const maxTarget = Math.max(indTarget, roleTarget);
                    // Only consider it a gap if there IS a target > 0
                    if (maxTarget === 0) return false;

                    const currentLevel = asm?.level || 0;
                    return currentLevel < maxTarget;
                });
            });
        }

        if (employeeSort) {
            const allSkillIds = skills.map(s => s.id!);
            result = [...result].sort((a, b) => {
                if (showMaxValues === 'max') {
                    const calcXP = (empId: string, empRoles: string[] | undefined) => {
                        let total = 0;
                        allSkillIds.forEach(sId => {
                            const assessment = getAssessmentFast(empId, sId);
                            const roleTarget = getMaxRoleTargetForSkill(empRoles, sId, roles);
                            const rawLevel = assessment?.level ?? -1;
                            const val = (rawLevel === -1 && roleTarget !== undefined) ? 0 : rawLevel;
                            if (val > 0) total += val;
                        });
                        return total;
                    };
                    const valA = calcXP(a.id!, a.roles);
                    const valB = calcXP(b.id!, b.roles);
                    return employeeSort === 'asc' ? valA - valB : valB - valA;
                } else if (showMaxValues === 'fulfillment') {
                    const calcFulfillment = (empId: string, empRoles: string[] | undefined) => {
                        let total = 0, targets = 0;
                        allSkillIds.forEach(sId => {
                            const asm = getAssessmentFast(empId, sId);
                            const individualT = asm?.targetLevel || 0;
                            const roleT = getMaxRoleTargetForSkill(empRoles, sId, roles) || 0;
                            const t = Math.max(individualT, roleT);
                            if (t > 0) {
                                targets += t;
                                total += Math.max(asm?.level || 0, 0);
                            }
                        });
                        return targets > 0 ? (total / targets) * 100 : -1;
                    };
                    const fulA = calcFulfillment(a.id!, a.roles);
                    const fulB = calcFulfillment(b.id!, b.roles);

                    // Push -1 (N/A) to the bottom regardless of sort direction
                    if (fulA === -1 && fulB !== -1) return 1;
                    if (fulB === -1 && fulA !== -1) return -1;

                    return employeeSort === 'asc' ? fulA - fulB : fulB - fulA;
                } else {
                    const calcAvg = (empId: string, empRoles: string[] | undefined) => {
                        let total = 0, count = 0;
                        allSkillIds.forEach(sId => {
                            const assessment = getAssessmentFast(empId, sId);
                            const roleTarget = getMaxRoleTargetForSkill(empRoles, sId, roles);
                            const rawLevel = assessment?.level ?? -1;
                            const val = (rawLevel === -1 && roleTarget !== undefined) ? 0 : rawLevel;
                            if (val !== -1) { total += val; count++; }
                        });
                        return count > 0 ? total / count : 0;
                    };
                    const avgA = calcAvg(a.id!, a.roles);
                    const avgB = calcAvg(b.id!, b.roles);
                    return employeeSort === 'asc' ? avgA - avgB : avgB - avgA;
                }
            });
        } else {
            result = [...result].sort((a, b) => a.name.localeCompare(b.name, 'de'));
        }

        return result;
    }, [employees, focusEmployeeId, showInactive, filterDepartments, filterRoles, filterEmployees, filterLevels, filterSkills, showOnlyGaps, employeeSort, skills, departments, roles, metricMode, getAssessmentFast, showMaxValues]);

    const calculateAverage = useCallback((
        skillIds: string[],
        specificEmployeeId?: string
    ): number | null => {
        if (skillIds.length === 0) return null;
        if (employees.length === 0) return 0;

        // Build a stable cache key.
        // Per-employee: keyed by employeeId only (result doesn't depend on filters).
        // All-employees: keyed by the set of displayed employee IDs so filter
        //   changes produce different entries rather than stale results.
        const empKey = specificEmployeeId ?? displayedEmployees.map(e => e.id!).join(',');
        const cacheKey = `${empKey}|${skillIds.join(',')}`;

        return _avgCache.getOrCompute(cacheKey, assessments, roles, employees, () => {
            let totalScore = 0, relevantCount = 0;
            const targetEmps = specificEmployeeId
                ? employees.filter((e) => e.id === specificEmployeeId)
                : displayedEmployees;

            skillIds.forEach((sId) => {
                targetEmps.forEach((emp) => {
                    const assessment = getAssessmentFast(emp.id!, sId);
                    const roleTarget = getMaxRoleTargetForSkill(emp.roles, sId, roles);
                    const rawLevel = assessment?.level ?? -1;
                    const val = (rawLevel === -1 && roleTarget !== undefined) ? 0 : rawLevel;
                    if (val === -1) return;
                    totalScore += val;
                    relevantCount++;
                });
            });

            return relevantCount === 0 ? null : Math.round(totalScore / relevantCount);
        });
    }, [employees, displayedEmployees, getAssessmentFast, roles, assessments]);

    const calculateEmployeeAverage = useCallback((employeeId: string): number | null => {
        return calculateAverage(
            skills.map((s) => s.id!),
            employeeId
        );
    }, [skills, calculateAverage]);

    const displayedSkills = useMemo(() => {
        let result = skills;

        if (filterSkills && filterSkills.length > 0) {
            result = result.filter(s => filterSkills.includes(s.id!));
        }

        if (filterLevels && filterLevels.length > 0) {
            const minSelected = Math.min(...filterLevels);
            result = result.filter(s => {
                return displayedEmployees.some(e => {
                    const asm = getAssessmentFast(e.id!, s.id!);
                    return asm && asm.level >= minSelected;
                });
            });
        }

        if (showOnlyGaps) {
            result = result.filter(s => {
                return displayedEmployees.some(e => {
                    const asm = getAssessmentFast(e.id!, s.id!);
                    const indTarget = asm?.targetLevel || 0;
                    const roleTarget = getMaxRoleTargetForSkill(e.roles, s.id!, roles) || 0;
                    const maxTarget = Math.max(indTarget, roleTarget);
                    if (maxTarget === 0) return false;
                    const currentLevel = asm?.level || 0;
                    return currentLevel < maxTarget;
                });
            });
        }

        if (hideNaColumns) {
            result = result.filter(s => {
                const avg = calculateAverage([s.id!]);
                return avg !== null;
            });
        }

        return result;
    }, [skills, filterSkills, filterLevels, showOnlyGaps, hideNaColumns, displayedEmployees, getAssessmentFast, roles, calculateAverage]);

    const displayedSubcategories = useMemo(() => {
        let result = subcategories;

        if (!isEditMode && ((filterSkills && filterSkills.length > 0) || (filterLevels && filterLevels.length > 0) || showOnlyGaps || hideNaColumns)) {
            result = result.filter(sub => {
                const subSkillIds = getAllSkillIdsForSubcategory(sub.id!, subcategories, skills);
                return subSkillIds.some((sId: string) => displayedSkills.some(ds => ds.id === sId));
            });
        }

        return result;
    }, [subcategories, filterSkills, filterLevels, showOnlyGaps, hideNaColumns, skills, displayedSkills, isEditMode]);

    const displayedCategories = useMemo(() => {
        let result = [...categories];

        if (filterCategories.length > 0) {
            result = result.filter((c) => filterCategories.includes(c.id!));
        }

        // Hide categories that have no matching displayed skills
        if (!isEditMode && ((filterSkills && filterSkills.length > 0) || (filterLevels && filterLevels.length > 0) || showOnlyGaps || hideNaColumns)) {
            result = result.filter(c => {
                const catSkillIds = getAllSkillIdsForCategory(c.id!, subcategories, skills);
                return catSkillIds.some(sId => displayedSkills.some(ds => ds.id === sId));
            });
        }

        if (skillSort) {
            result = result.sort((a, b) => {
                if (showMaxValues === 'max') {
                    const calcMaxAvg = (catId: string) => {
                        const catSkillIds = getAllSkillIdsForCategory(catId, subcategories, skills);
                        const visibleSkillIds = catSkillIds.filter(id => displayedSkills.some(ds => ds.id === id));
                        if (visibleSkillIds.length === 0) return 0;

                        const allAvgs = displayedEmployees
                            .map(emp => calculateAverage(visibleSkillIds, emp.id!))
                            .filter((v): v is number => v !== null);

                        return allAvgs.length > 0 ? Math.max(...allAvgs) : 0;
                    };

                    const valA = calcMaxAvg(a.id!);
                    const valB = calcMaxAvg(b.id!);

                    if (valA === -1 && valB !== -1) return 1;
                    if (valB === -1 && valA !== -1) return -1;

                    return skillSort === 'asc' ? valA - valB : valB - valA;
                } else if (showMaxValues === 'fulfillment') {
                    const calcCatFulfillment = (catId: string) => {
                        const catSkillIds = getAllSkillIdsForCategory(catId, subcategories, skills);
                        const visibleSkillIds = catSkillIds.filter(id => displayedSkills.some(ds => ds.id === id));
                        if (visibleSkillIds.length === 0) return 0;

                        const scores: number[] = [];
                        displayedEmployees.forEach(emp => {
                            visibleSkillIds.forEach(sId => {
                                const asm = getAssessmentFast(emp.id!, sId);
                                const individualT = asm?.targetLevel || 0;
                                const roleT = getMaxRoleTargetForSkill(emp.roles, sId, roles) || 0;
                                const target = Math.max(individualT, roleT);
                                if (target > 0) {
                                    const level = asm?.level ?? (roleT ? 0 : -1);
                                    if (level >= 0) scores.push(Math.min(100, Math.round((level / target) * 100)));
                                }
                            });
                        });
                        return scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : -1;
                    };
                    const fulA = calcCatFulfillment(a.id!);
                    const fulB = calcCatFulfillment(b.id!);

                    // Push -1 (N/A) to the bottom regardless of sort direction
                    if (fulA === -1 && fulB !== -1) return 1;
                    if (fulB === -1 && fulA !== -1) return -1;

                    return skillSort === 'asc' ? fulA - fulB : fulB - fulA;
                } else {
                    const calcCatAvg = (catId: string) => {
                        const catSkillIds = getAllSkillIdsForCategory(catId, subcategories, skills);
                        const visibleSkillIds = catSkillIds.filter(id => displayedSkills.some(ds => ds.id === id));
                        if (visibleSkillIds.length === 0) return 0;

                        const avg = calculateAverage(visibleSkillIds);
                        return avg !== null ? avg : 0;
                    };

                    const avgA = calcCatAvg(a.id!);
                    const avgB = calcCatAvg(b.id!);

                    if (avgA === -1 && avgB !== -1) return 1;
                    if (avgB === -1 && avgA !== -1) return -1;

                    return skillSort === 'asc' ? avgA - avgB : avgB - avgA;
                }
            });
        } else {
            result = result.sort((a, b) => a.name.localeCompare(b.name, 'de'));
        }

        return result;
    }, [categories, filterCategories, filterSkills, filterLevels, showOnlyGaps, hideNaColumns, skillSort, subcategories, skills, displayedSkills, displayedEmployees, calculateAverage, showMaxValues, getAssessmentFast, roles]);

    const matrixColumns = useMemo<MatrixColumn[]>(() => {
        if (groupingMode === 'none') {
            return displayedEmployees.map(e => ({ type: 'employee', id: e.id!, employee: e }));
        }

        const groups = new Map<string, Employee[]>();

        displayedEmployees.forEach(e => {
            if (groupingMode === 'department') {
                const key = departments.find(d => d.id === e.department)?.name || e.department || 'Sonstige';
                if (!groups.has(key)) groups.set(key, []);
                groups.get(key)!.push(e);
            } else {
                const employeeRoles = e.roles || [];
                const key = employeeRoles.length > 0 ? employeeRoles[0] : 'Sonstige';
                if (!groups.has(key)) groups.set(key, []);
                groups.get(key)!.push(e);
            }
        });

        const allSkillIds = skills.map(s => s.id!);

        const sortedKeys = Array.from(groups.keys()).sort((a, b) => {
            if (!employeeSort) {
                return a.localeCompare(b, 'de');
            }

            const empsA = groups.get(a) || [];
            const empsB = groups.get(b) || [];

            if (showMaxValues === 'max') {
                const getXP = (emps: Employee[]) => {
                    let totalXP = 0;
                    emps.forEach(e => {
                        let eXP = 0;
                        allSkillIds.forEach(sId => {
                            const asm = getAssessmentFast(e.id!, sId);
                            const val = asm?.level;
                            if (val && val > 0) eXP += val;
                        });
                        totalXP += eXP;
                    });
                    return totalXP;
                };
                const valA = getXP(empsA);
                const valB = getXP(empsB);

                if (valA === -1 && valB !== -1) return 1;
                if (valB === -1 && valA !== -1) return -1;

                return employeeSort === 'asc' ? valA - valB : valB - valA;

            } else if (showMaxValues === 'fulfillment') {
                const getFul = (emps: Employee[]) => {
                    const fuls = emps.map(e => {
                        let total = 0, targets = 0;
                        allSkillIds.forEach(sId => {
                            const asm = getAssessmentFast(e.id!, sId);
                            const individualT = asm?.targetLevel || 0;
                            const roleT = getMaxRoleTargetForSkill(e.roles, sId, roles) || 0;
                            const t = Math.max(individualT, roleT);
                            if (t > 0) {
                                targets += t;
                                total += Math.max(asm?.level || 0, 0);
                            }
                        });
                        return targets > 0 ? (total / targets) * 100 : null;
                    }).filter((v): v is number => v !== null);

                    return fuls.length > 0 ? fuls.reduce((a, b) => a + b, 0) / fuls.length : -1;
                };
                const fulA = getFul(empsA);
                const fulB = getFul(empsB);

                // Push -1 (N/A) to the bottom regardless of sort direction
                if (fulA === -1 && fulB !== -1) return 1;
                if (fulB === -1 && fulA !== -1) return -1;

                return employeeSort === 'asc' ? fulA - fulB : fulB - fulA;

            } else {
                const getAvg = (emps: Employee[]) => {
                    let totalAvg = 0, countAvg = 0;
                    emps.forEach(e => {
                        const val = calculateAverage(allSkillIds, e.id!);
                        if (val !== null) {
                            totalAvg += val;
                            countAvg++;
                        }
                    });
                    return countAvg > 0 ? totalAvg / countAvg : -1;
                };
                const avgA = getAvg(empsA);
                const avgB = getAvg(empsB);

                if (avgA === -1 && avgB !== -1) return 1;
                if (avgB === -1 && avgA !== -1) return -1;

                return employeeSort === 'asc' ? avgA - avgB : avgB - avgA;
            }
        });
        const columns: MatrixColumn[] = [];

        const backgroundColors = [
            isDark ? 'rgba(34, 139, 230, 0.15)' : 'var(--mantine-color-blue-0)',
            isDark ? 'rgba(64, 192, 87, 0.15)' : 'var(--mantine-color-green-0)',
            isDark ? 'rgba(121, 80, 242, 0.15)' : 'var(--mantine-color-violet-0)',
            isDark ? 'rgba(253, 126, 20, 0.15)' : 'var(--mantine-color-orange-0)',
            isDark ? 'rgba(18, 184, 134, 0.15)' : 'var(--mantine-color-teal-0)',
            isDark ? 'rgba(224, 49, 140, 0.15)' : 'var(--mantine-color-pink-0)',
            isDark ? 'rgba(250, 204, 21, 0.15)' : 'var(--mantine-color-yellow-0)',
            isDark ? 'rgba(21, 170, 191, 0.15)' : 'var(--mantine-color-cyan-0)',
        ];

        let colorIndex = 0;
        sortedKeys.forEach(key => {
            const groupEmps = groups.get(key)!;
            const bgColor = key === 'Sonstige'
                ? (isDark ? 'rgba(255, 255, 255, 0.05)' : 'var(--mantine-color-gray-0)')
                : backgroundColors[colorIndex % backgroundColors.length];

            if (key !== 'Sonstige') colorIndex++;

            if (!hideEmployees) {
                groupEmps.forEach(e => columns.push({
                    type: 'employee',
                    id: e.id!,
                    employee: e,
                    groupId: key,
                    backgroundColor: bgColor
                }));
            }

            columns.push({
                type: 'group-summary',
                id: `summary-${key}`,
                label: key,
                employeeIds: groupEmps.map(e => e.id!),
                groupId: key,
                backgroundColor: bgColor
            });
        });

        return columns;
    }, [displayedEmployees, groupingMode, isDark, hideEmployees, employeeSort]);

    return {
        displayedEmployees,
        displayedCategories,
        displayedSubcategories,
        displayedSkills,
        matrixColumns,
        calculateAverage,
        calculateEmployeeAverage,
        getAssessment: getAssessmentFast,
    };
}
