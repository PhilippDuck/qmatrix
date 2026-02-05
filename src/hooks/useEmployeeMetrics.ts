import { useMemo } from 'react';
import { Employee, Skill, Assessment, QualificationPlan, QualificationMeasure } from '../context/DataContext';

interface UseEmployeeMetricsProps {
    employee: Employee;
    skills: Skill[];
    getAssessment: (empId: string, skillId: string) => Assessment | undefined;
    qualificationPlans: QualificationPlan[];
    qualificationMeasures: QualificationMeasure[];
}

export const useEmployeeMetrics = ({
    employee,
    skills,
    getAssessment,
    qualificationPlans,
    qualificationMeasures,
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
            const target = assessment?.targetLevel;
            if (target !== undefined && target > 0) {
                totalTarget += target;
                totalActualForTarget += (assessment?.level || 0);
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
                const target = assessment?.targetLevel || 0;
                const level = assessment?.level || 0;
                return { skill, level, target, gap: level - target };
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
    }, [employee.id, skills, getAssessment, qualificationPlans, qualificationMeasures]);
};
