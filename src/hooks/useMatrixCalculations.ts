import { useMemo, useCallback } from "react";
import { Employee, Category, SubCategory, Skill, Assessment, Department, EmployeeRole } from "../store/useStore";
import { getMaxRoleTargetForSkill } from "../utils/skillCalculations";
import { MatrixColumn } from "../components/SkillMatrix/types";
import { MetricMode } from "./useMatrixState";
import { useMantineColorScheme } from "@mantine/core";
import { getAllSkillIdsForCategory } from "../utils/hierarchyUtils";

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
    employeeSort: 'asc' | 'desc' | null;
    skillSort: 'asc' | 'desc' | null;
    metricMode: MetricMode;
    showMaxValues: MetricMode;
    groupingMode: 'none' | 'department' | 'role';
    hideEmployees: boolean;
}

export function useMatrixCalculations({
    employees, categories, subcategories, skills, departments, roles, getAssessment, assessments,
    focusEmployeeId, showInactive, filterDepartments, filterRoles, employeeSort,
    filterCategories, skillSort, metricMode, showMaxValues, groupingMode, hideEmployees
}: UseMatrixCalculationsProps) {
    const { colorScheme } = useMantineColorScheme();
    const isDark = colorScheme === 'dark';

    const displayedEmployees = useMemo(() => {
        let result = employees;

        if (focusEmployeeId) {
            result = result.filter((e) => e.id === focusEmployeeId);
        }

        if (!showInactive) {
            result = result.filter(e => e.isActive !== false);
        }

        if (filterDepartments.length > 0) {
            const selectedDeptNames = departments
                .filter(d => filterDepartments.includes(d.id!))
                .map(d => d.name);
            result = result.filter((e) => selectedDeptNames.includes(e.department || ''));
        }

        if (filterRoles.length > 0) {
            const selectedRoleNames = roles
                .filter(r => filterRoles.includes(r.id!))
                .map(r => r.name);
            result = result.filter((e) =>
                e.roles && e.roles.some((role: string) => selectedRoleNames.includes(role))
            );
        }

        if (employeeSort) {
            const allSkillIds = skills.map(s => s.id!);
            result = [...result].sort((a, b) => {
                if (showMaxValues === 'max') {
                    const calcXP = (empId: string, empRoles: string[] | undefined) => {
                        let total = 0;
                        allSkillIds.forEach(sId => {
                            const assessment = getAssessment(empId, sId);
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
                            const asm = getAssessment(empId, sId);
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
                    return employeeSort === 'asc' ? fulA - fulB : fulB - fulA;
                } else {
                    const calcAvg = (empId: string, empRoles: string[] | undefined) => {
                        let total = 0, count = 0;
                        allSkillIds.forEach(sId => {
                            const assessment = getAssessment(empId, sId);
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
        }

        return result;
    }, [employees, focusEmployeeId, showInactive, filterDepartments, filterRoles, employeeSort, skills, departments, roles, metricMode, getAssessment, showMaxValues]);

    const calculateAverage = useCallback((
        skillIds: string[],
        specificEmployeeId?: string
    ): number | null => {
        if (skillIds.length === 0) return null;
        if (employees.length === 0) return 0;
        let totalScore = 0, relevantCount = 0;

        const targetEmps = specificEmployeeId
            ? employees.filter((e) => e.id === specificEmployeeId)
            : displayedEmployees;

        skillIds.forEach((sId) => {
            targetEmps.forEach((emp) => {
                const assessment = getAssessment(emp.id!, sId);
                const roleTarget = getMaxRoleTargetForSkill(emp.roles, sId, roles);
                const rawLevel = assessment?.level ?? -1;
                const val = (rawLevel === -1 && roleTarget !== undefined) ? 0 : rawLevel;

                if (val === -1) return;

                totalScore += val;
                relevantCount++;
            });
        });

        if (relevantCount === 0) return null;
        return Math.round(totalScore / relevantCount);
    }, [employees, displayedEmployees, getAssessment, roles]);

    const calculateEmployeeAverage = useCallback((employeeId: string): number | null => {
        return calculateAverage(
            skills.map((s) => s.id!),
            employeeId
        );
    }, [skills, calculateAverage]);

    const displayedCategories = useMemo(() => {
        let result = [...categories];

        if (filterCategories.length > 0) {
            result = result.filter((c) => filterCategories.includes(c.id!));
        }

        if (skillSort) {
            result = result.sort((a, b) => {
                if (showMaxValues === 'max') {
                    const calcMaxAvg = (catId: string) => {
                        const catSkillIds = getAllSkillIdsForCategory(catId, subcategories, skills);
                        if (catSkillIds.length === 0) return 0;

                        const allAvgs = displayedEmployees
                            .map(emp => calculateAverage(catSkillIds, emp.id!))
                            .filter((v): v is number => v !== null);

                        return allAvgs.length > 0 ? Math.max(...allAvgs) : 0;
                    };

                    const valA = calcMaxAvg(a.id!);
                    const valB = calcMaxAvg(b.id!);
                    return skillSort === 'asc' ? valA - valB : valB - valA;
                } else if (showMaxValues === 'fulfillment') {
                    const calcCatFulfillment = (catId: string) => {
                        const catSkillIds = getAllSkillIdsForCategory(catId, subcategories, skills);
                        if (catSkillIds.length === 0) return 0;

                        let total = 0, targets = 0;
                        displayedEmployees.forEach(emp => {
                            catSkillIds.forEach(sId => {
                                const asm = getAssessment(emp.id!, sId);
                                const individualT = asm?.targetLevel || 0;
                                const roleT = getMaxRoleTargetForSkill(emp.roles, sId, roles) || 0;
                                const t = Math.max(individualT, roleT);
                                if (t > 0) {
                                    targets += t;
                                    total += Math.max(asm?.level || 0, 0);
                                }
                            });
                        });
                        return targets > 0 ? (total / targets) * 100 : -1;
                    };
                    const fulA = calcCatFulfillment(a.id!);
                    const fulB = calcCatFulfillment(b.id!);
                    return skillSort === 'asc' ? fulA - fulB : fulB - fulA;
                } else {
                    const calcCatAvg = (catId: string) => {
                        const catSkillIds = getAllSkillIdsForCategory(catId, subcategories, skills);
                        if (catSkillIds.length === 0) return 0;

                        const avg = calculateAverage(catSkillIds);
                        return avg !== null ? avg : 0;
                    };

                    const avgA = calcCatAvg(a.id!);
                    const avgB = calcCatAvg(b.id!);
                    return skillSort === 'asc' ? avgA - avgB : avgB - avgA;
                }
            });
        } else {
            result = result.sort((a, b) => a.name.localeCompare(b.name, 'de'));
        }

        return result;
    }, [categories, filterCategories, skillSort, subcategories, skills, displayedEmployees, calculateAverage, showMaxValues]);

    const matrixColumns = useMemo<MatrixColumn[]>(() => {
        if (groupingMode === 'none') {
            return displayedEmployees.map(e => ({ type: 'employee', id: e.id!, employee: e }));
        }

        const groups = new Map<string, Employee[]>();

        displayedEmployees.forEach(e => {
            if (groupingMode === 'department') {
                const key = e.department || 'Sonstige';
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
                            const asm = getAssessment(e.id!, sId);
                            const val = asm?.level;
                            if (val && val > 0) eXP += val;
                        });
                        totalXP += eXP;
                    });
                    return totalXP;
                };
                const valA = getXP(empsA);
                const valB = getXP(empsB);
                return employeeSort === 'asc' ? valA - valB : valB - valA;

            } else if (showMaxValues === 'fulfillment') {
                const getFul = (emps: Employee[]) => {
                    const fuls = emps.map(e => {
                        let total = 0, targets = 0;
                        allSkillIds.forEach(sId => {
                            const asm = getAssessment(e.id!, sId);
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
        matrixColumns,
        calculateAverage,
        calculateEmployeeAverage
    };
}
