import { useMemo } from 'react';
import { Employee, Skill, Assessment, QualificationPlan, QualificationMeasure, EmployeeRole } from '../context/DataContext';
import { getMaxRoleTargetForSkill } from '../utils/skillCalculations';

interface UseEmployeeMetricsProps {
    employee: Employee;
    skills: Skill[];
    getAssessment: (empId: string, skillId: string) => Assessment | undefined;
    qualificationPlans: QualificationPlan[];
    qualificationMeasures: QualificationMeasure[];
    roles: EmployeeRole[];
}

export const useEmployeeMetrics = ({
    employee,
    skills,
    getAssessment,
    qualificationPlans,
    qualificationMeasures,
    roles,
}: UseEmployeeMetricsProps) => {
    return useMemo(() => {
        // 1. Vielseitigkeit (Active Skills > 0)
        const employeeSkills = skills
            .map((skill) => ({
                skill,
                assessment: getAssessment(employee.id!, skill.id!)
            }))
            .filter((item) => item.assessment && item.assessment.level > 0);

        const activeSkillCount = employeeSkills.length;

        // 2. XP (Wissens-Volumen)
        const totalXP = employeeSkills.reduce((sum, item) => sum + (item.assessment?.level || 0), 0);

        // 3. Soll-Erfüllungsgrad
        let totalTarget = 0;
        let totalActualForTarget = 0;

        skills.forEach(skill => {
            const assessment = getAssessment(employee.id!, skill.id!);
            const individualTarget = assessment?.targetLevel;
            const roleTarget = getMaxRoleTargetForSkill(employee.roles, skill.id!, roles);

            // Effective target is the maximum of individual and role target (if defined)
            // But we treat undefined as 0 for calculation
            const target = Math.max(individualTarget || 0, roleTarget || 0);

            if (target > 0) {
                totalTarget += target;
                totalActualForTarget += (assessment?.level || 0); // Only count active skill level if there is a target? 
                // Or usually if level > target we cap it? Let's keep it simple: sum of actuals vs sum of targets.
            }
        });

        const fulfillment = totalTarget > 0 ? Math.round((totalActualForTarget / totalTarget) * 100) : null;

        // Top Skills sorted by level
        const topSkills = [...employeeSkills]
            .sort((a, b) => (b.assessment?.level || 0) - (a.assessment?.level || 0))
            .slice(0, 3);

        // Learning Needs (Gaps) - Skills below target
        const learningNeeds = skills
            .map((skill) => {
                const assessment = getAssessment(employee.id!, skill.id!);
                const individualTarget = assessment?.targetLevel || 0;
                const roleTarget = getMaxRoleTargetForSkill(employee.roles, skill.id!, roles) || 0;
                const target = Math.max(individualTarget, roleTarget);

                const level = assessment?.level || 0;
                // If level is -1 (N/A) treat as 0 for gap calculation if there is a target
                const effectiveLevel = level === -1 ? 0 : level;

                return { skill, level: effectiveLevel, target, gap: effectiveLevel - target };
            })
            .filter(item => item.gap < 0 && item.target > 0)
            .sort((a, b) => a.gap - b.gap)
            .slice(0, 3);

        // Filter active measures for this employee
        const activeMeasures = qualificationMeasures.filter(m => {
            const plan = qualificationPlans.find(p => p.id === m.planId && p.employeeId === employee.id);
            return plan && (m.status === "in_progress" || m.status === "pending");
        });

        // Check if planning is allowed/useful
        const hasActivePlan = qualificationPlans.some(p => p.employeeId === employee.id && (p.status === 'active' || p.status === 'draft'));
        const hasDeficits = learningNeeds.length > 0;
        const isPlanEnabled = hasDeficits || hasActivePlan;

        return {
            activeSkillCount,
            totalXP,
            fulfillment,
            topSkills,
            learningNeeds,
            activeMeasures,
            hasActivePlan,
            hasDeficits,
            isPlanEnabled
        };
    }, [employee.id, employee.roles, skills, getAssessment, qualificationPlans, qualificationMeasures, roles]);
};
