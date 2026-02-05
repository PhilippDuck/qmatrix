import { describe, it, expect } from 'vitest';

/**
 * Utility function that replicates the filter logic from SkillMatrix
 * for testing purposes.
 */
export const filterEmployeesByDepartment = <T extends { id: string; name: string; department?: string }>(
    employees: T[],
    departments: { id: string; name: string }[],
    filterDepartmentIds: string[]
): T[] => {
    if (filterDepartmentIds.length === 0) return employees;

    const selectedDeptNames = departments
        .filter(d => filterDepartmentIds.includes(d.id))
        .map(d => d.name);

    return employees.filter(e => selectedDeptNames.includes(e.department || ''));
};

export const filterEmployeesByRole = <T extends { id: string; name: string; roles?: string[] }>(
    employees: T[],
    roles: { id: string; name: string }[],
    filterRoleIds: string[]
): T[] => {
    if (filterRoleIds.length === 0) return employees;

    const selectedRoleNames = roles
        .filter(r => filterRoleIds.includes(r.id))
        .map(r => r.name);

    return employees.filter(e =>
        e.roles && e.roles.some(role => selectedRoleNames.includes(role))
    );
};

describe('Employee Filter Functions', () => {
    const mockEmployees = [
        { id: 'emp1', name: 'Max Mustermann', department: 'Produktion', roles: ['Entwickler'] },
        { id: 'emp2', name: 'Erika Musterfrau', department: 'Entwicklung', roles: ['Teamleiter'] },
        { id: 'emp3', name: 'Hans Schmidt', department: 'Produktion', roles: ['Entwickler'] },
        { id: 'emp4', name: 'Anna Müller', department: 'Vertrieb', roles: ['Manager'] },
    ];

    const mockDepartments = [
        { id: 'dept-1', name: 'Produktion' },
        { id: 'dept-2', name: 'Entwicklung' },
        { id: 'dept-3', name: 'Vertrieb' },
    ];

    const mockRoles = [
        { id: 'role-1', name: 'Entwickler' },
        { id: 'role-2', name: 'Teamleiter' },
        { id: 'role-3', name: 'Manager' },
    ];

    describe('filterEmployeesByDepartment', () => {
        it('returns all employees when no filter is applied', () => {
            const result = filterEmployeesByDepartment(mockEmployees, mockDepartments, []);
            expect(result).toHaveLength(4);
        });

        it('filters by single department ID correctly', () => {
            const result = filterEmployeesByDepartment(mockEmployees, mockDepartments, ['dept-1']);
            expect(result).toHaveLength(2);
            expect(result.every(e => e.department === 'Produktion')).toBe(true);
        });

        it('filters by multiple department IDs correctly', () => {
            const result = filterEmployeesByDepartment(
                mockEmployees,
                mockDepartments,
                ['dept-1', 'dept-2']
            );
            expect(result).toHaveLength(3);
            expect(result.some(e => e.department === 'Produktion')).toBe(true);
            expect(result.some(e => e.department === 'Entwicklung')).toBe(true);
        });

        it('returns empty array when no employees match', () => {
            const result = filterEmployeesByDepartment(
                mockEmployees,
                mockDepartments,
                ['nonexistent-dept']
            );
            expect(result).toHaveLength(0);
        });

        it('handles employees without department', () => {
            const employeesWithMissing = [
                ...mockEmployees,
                { id: 'emp5', name: 'No Dept', department: undefined },
            ];
            const result = filterEmployeesByDepartment(
                employeesWithMissing,
                mockDepartments,
                ['dept-1']
            );
            expect(result).toHaveLength(2);
            expect(result.find(e => e.id === 'emp5')).toBeUndefined();
        });

        it('correctly maps department IDs to names (regression test for ID/name mismatch bug)', () => {
            // This test ensures we're filtering by name after looking up from ID
            // Previously the bug was: filterDepartments.includes(e.department) which compared IDs to names
            const result = filterEmployeesByDepartment(
                mockEmployees,
                mockDepartments,
                ['dept-1'] // ID, not name!
            );

            // Should find employees with department NAME 'Produktion', not with department 'dept-1'
            expect(result).toHaveLength(2);
            expect(result[0].department).toBe('Produktion');
            expect(result[1].department).toBe('Produktion');
        });
    });

    describe('filterEmployeesByRole', () => {
        it('returns all employees when no filter is applied', () => {
            const result = filterEmployeesByRole(mockEmployees, mockRoles, []);
            expect(result).toHaveLength(4);
        });

        it('filters by single role ID correctly', () => {
            const result = filterEmployeesByRole(mockEmployees, mockRoles, ['role-1']);
            expect(result).toHaveLength(2);
            expect(result.every(e => e.roles?.includes('Entwickler'))).toBe(true);
        });

        it('filters by multiple role IDs correctly', () => {
            const result = filterEmployeesByRole(mockEmployees, mockRoles, ['role-2', 'role-3']);
            expect(result).toHaveLength(2);
            expect(result.some(e => e.roles?.includes('Teamleiter'))).toBe(true);
            expect(result.some(e => e.roles?.includes('Manager'))).toBe(true);
        });

        it('correctly maps role IDs to names (regression test)', () => {
            const result = filterEmployeesByRole(mockEmployees, mockRoles, ['role-1']);
            expect(result).toHaveLength(2);
            expect(result[0].roles).toContain('Entwickler');
        });

        it('finds employees with multiple roles', () => {
            const employeesWithMultipleRoles = [
                ...mockEmployees,
                { id: 'emp5', name: 'Multi Role User', department: 'Entwicklung', roles: ['Entwickler', 'Teamleiter'] },
            ];
            const result = filterEmployeesByRole(employeesWithMultipleRoles, mockRoles, ['role-1']);
            expect(result).toHaveLength(3); // emp1, emp3, and emp5
            expect(result.find(e => e.id === 'emp5')).toBeDefined();
        });
    });

    describe('combined filtering', () => {
        it('can apply both department and role filters', () => {
            let result = filterEmployeesByDepartment(mockEmployees, mockDepartments, ['dept-1']);
            result = filterEmployeesByRole(result, mockRoles, ['role-1']);

            expect(result).toHaveLength(2);
            expect(result.every(e => e.department === 'Produktion' && e.roles?.includes('Entwickler'))).toBe(true);
        });

        it('returns empty when filters have no overlap', () => {
            let result = filterEmployeesByDepartment(mockEmployees, mockDepartments, ['dept-3']); // Vertrieb
            result = filterEmployeesByRole(result, mockRoles, ['role-1']); // Entwickler

            expect(result).toHaveLength(0);
        });
    });
});
