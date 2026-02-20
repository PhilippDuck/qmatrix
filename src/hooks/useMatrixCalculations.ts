import { useMemo, useCallback } from "react";
import { Employee, Category, SubCategory, Skill, Assessment, Department, EmployeeRole } from "../context/DataContext";
import { getMaxRoleTargetForSkill } from "../utils/skillCalculations";
import { MatrixColumn } from "../components/SkillMatrix/types";
import { MetricMode } from "./useMatrixState";
import { useMantineColorScheme } from "@mantine/core";

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
    showMaxValues: boolean;
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
                e.roles && e.roles.some(role => selectedRoleNames.includes(role))
            );
        }

        if (employeeSort) {
            const allSkillIds = skills.map(s => s.id!);
            result = [...result].sort((a, b) => {
                if (showMaxValues) {
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
                const getSkillIds = (catId: string) => {
                    const getSubIdsRecursive = () => {
                        const ids: string[] = [];
                        const roots = subcategories.filter(s => s.categoryId === catId && !s.parentSubCategoryId);

                        const collectChildren = (parentId: string) => {
                            const children = subcategories.filter(s => s.parentSubCategoryId === parentId);
                            children.forEach(child => {
                                ids.push(child.id!);
                                collectChildren(child.id!);
                            });
                        };

                        roots.forEach(root => {
                            ids.push(root.id!);
                            collectChildren(root.id!);
                        });
                        return ids;
                    };

                    const subIds = getSubIdsRecursive();
                    return skills.filter(s => subIds.includes(s.subCategoryId)).map(s => s.id!);
                };

                if (showMaxValues) {
                    const calcMaxAvg = (catId: string) => {
                        const catSkillIds = getSkillIds(catId);
                        if (catSkillIds.length === 0) return 0;

                        const allAvgs = displayedEmployees
                            .map(emp => calculateAverage(catSkillIds, emp.id!))
                            .filter((v): v is number => v !== null);

                        return allAvgs.length > 0 ? Math.max(...allAvgs) : 0;
                    };

                    const valA = calcMaxAvg(a.id!);
                    const valB = calcMaxAvg(b.id!);
                    return skillSort === 'asc' ? valA - valB : valB - valA;
                } else {
                    const calcCatAvg = (catId: string) => {
                        const catSkillIds = getSkillIds(catId);
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
        const noGroup: Employee[] = [];

        displayedEmployees.forEach(e => {
            if (groupingMode === 'department') {
                const key = e.department;
                if (key) {
                    if (!groups.has(key)) groups.set(key, []);
                    groups.get(key)!.push(e);
                } else {
                    noGroup.push(e);
                }
            } else {
                const employeeRoles = e.roles || [];
                if (employeeRoles.length > 0) {
                    const primaryRole = employeeRoles[0];
                    if (!groups.has(primaryRole)) groups.set(primaryRole, []);
                    groups.get(primaryRole)!.push(e);
                } else {
                    noGroup.push(e);
                }
            }
        });

        const sortedKeys = Array.from(groups.keys()).sort((a, b) => {
            if (employeeSort === 'desc') return a.localeCompare(b, 'de');
            return b.localeCompare(a, 'de');
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

        if (noGroup.length > 0) {
            const key = 'Sonstige';
            const bgColor = isDark ? 'rgba(255, 255, 255, 0.05)' : 'var(--mantine-color-gray-0)';

            if (!hideEmployees) {
                noGroup.forEach(e => columns.push({
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
                employeeIds: noGroup.map(e => e.id!),
                groupId: key,
                backgroundColor: bgColor
            });
        }

        let colorIndex = 0;
        sortedKeys.forEach(key => {
            const groupEmps = groups.get(key)!;
            const bgColor = backgroundColors[colorIndex % backgroundColors.length];
            colorIndex++;

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
