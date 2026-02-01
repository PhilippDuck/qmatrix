import { describe, it, expect } from 'vitest';
import {
    calculateHistoricalXP,
    getPeriodBoundaries,
    calculateAverageScore,
    calculatePercentageChange,
    calculateSkillCoverage,
    calculateGoalFulfillment,
    calculateAverageGap,
} from './dashboardCalculations';

describe('dashboardCalculations', () => {

    describe('calculateHistoricalXP', () => {
        it('returns sum of current levels when no history logs', () => {
            const currentAssessments = [
                { employeeId: 'emp1', skillId: 'skill1', level: 50 },
                { employeeId: 'emp1', skillId: 'skill2', level: 75 },
                { employeeId: 'emp2', skillId: 'skill1', level: 25 },
            ];

            const result = calculateHistoricalXP(currentAssessments, [], Date.now() - 100000);
            expect(result).toBe(150); // 50 + 75 + 25
        });

        it('applies history logs to reconstruct previous state', () => {
            const currentAssessments = [
                { employeeId: 'emp1', skillId: 'skill1', level: 75 }, // was 50
                { employeeId: 'emp2', skillId: 'skill1', level: 50 }, // was 25
            ];

            const historyLogs = [
                {
                    employeeId: 'emp1',
                    skillId: 'skill1',
                    previousLevel: 50,
                    newLevel: 75,
                    timestamp: Date.now() - 1000,
                },
                {
                    employeeId: 'emp2',
                    skillId: 'skill1',
                    previousLevel: 25,
                    newLevel: 50,
                    timestamp: Date.now() - 2000,
                },
            ];

            // Get XP from before the changes
            const result = calculateHistoricalXP(
                currentAssessments,
                historyLogs,
                Date.now() - 10000
            );

            expect(result).toBe(75); // 50 + 25 (previous levels)
        });

        it('ignores history logs before the timestamp', () => {
            const currentAssessments = [
                { employeeId: 'emp1', skillId: 'skill1', level: 75 },
            ];

            const historyLogs = [
                {
                    employeeId: 'emp1',
                    skillId: 'skill1',
                    previousLevel: 50,
                    newLevel: 75,
                    timestamp: Date.now() - 20000, // older than our threshold
                },
            ];

            // Get XP from after the change
            const result = calculateHistoricalXP(
                currentAssessments,
                historyLogs,
                Date.now() - 10000 // threshold is after the log
            );

            expect(result).toBe(75); // No rollback needed
        });

        it('returns 0 for empty assessments', () => {
            const result = calculateHistoricalXP([], [], Date.now());
            expect(result).toBe(0);
        });
    });

    describe('getPeriodBoundaries', () => {
        it('calculates quarter boundaries correctly for Q1', () => {
            const referenceDate = new Date(2024, 1, 15); // Feb 15, 2024 (Q1)
            const result = getPeriodBoundaries('quarter', referenceDate);

            expect(result.currentStart).toBe(new Date(2024, 0, 1).getTime()); // Jan 1, 2024
            expect(result.previousStart).toBe(new Date(2023, 9, 1).getTime()); // Oct 1, 2023 (Q4 prev year)
            expect(result.previousEnd).toBe(result.currentStart);
        });

        it('calculates quarter boundaries correctly for Q3', () => {
            const referenceDate = new Date(2024, 7, 15); // Aug 15, 2024 (Q3)
            const result = getPeriodBoundaries('quarter', referenceDate);

            expect(result.currentStart).toBe(new Date(2024, 6, 1).getTime()); // Jul 1, 2024
            expect(result.previousStart).toBe(new Date(2024, 3, 1).getTime()); // Apr 1, 2024 (Q2)
            expect(result.previousEnd).toBe(result.currentStart);
        });

        it('calculates year boundaries correctly', () => {
            const referenceDate = new Date(2024, 5, 15); // Jun 15, 2024
            const result = getPeriodBoundaries('year', referenceDate);

            expect(result.currentStart).toBe(new Date(2024, 0, 1).getTime()); // Jan 1, 2024
            expect(result.previousStart).toBe(new Date(2023, 0, 1).getTime()); // Jan 1, 2023
            expect(result.previousEnd).toBe(result.currentStart);
        });

        it('handles Q1 rollover to previous year Q4', () => {
            const referenceDate = new Date(2024, 0, 15); // Jan 15, 2024 (Q1)
            const result = getPeriodBoundaries('quarter', referenceDate);

            expect(result.previousStart).toBe(new Date(2023, 9, 1).getTime()); // Oct 1, 2023
        });
    });

    describe('calculateAverageScore', () => {
        it('calculates average correctly', () => {
            const assessments = [
                { level: 50 },
                { level: 75 },
                { level: 100 },
            ];

            expect(calculateAverageScore(assessments)).toBe(75);
        });

        it('ignores N/A (-1) values', () => {
            const assessments = [
                { level: 50 },
                { level: -1 }, // N/A
                { level: 100 },
            ];

            expect(calculateAverageScore(assessments)).toBe(75); // (50 + 100) / 2
        });

        it('returns null for empty array', () => {
            expect(calculateAverageScore([])).toBeNull();
        });

        it('returns null when all values are N/A', () => {
            const assessments = [
                { level: -1 },
                { level: -1 },
            ];

            expect(calculateAverageScore(assessments)).toBeNull();
        });

        it('rounds result to nearest integer', () => {
            const assessments = [
                { level: 33 },
                { level: 33 },
                { level: 34 },
            ];

            expect(calculateAverageScore(assessments)).toBe(33);
        });
    });

    describe('calculatePercentageChange', () => {
        it('calculates positive change correctly', () => {
            expect(calculatePercentageChange(100, 150)).toBe(50);
        });

        it('calculates negative change correctly', () => {
            expect(calculatePercentageChange(100, 75)).toBe(-25);
        });

        it('returns 100 when previous was 0 and current is positive', () => {
            expect(calculatePercentageChange(0, 50)).toBe(100);
        });

        it('returns 0 when both values are 0', () => {
            expect(calculatePercentageChange(0, 0)).toBe(0);
        });

        it('handles doubling correctly', () => {
            expect(calculatePercentageChange(50, 100)).toBe(100);
        });

        it('handles halving correctly', () => {
            expect(calculatePercentageChange(100, 50)).toBe(-50);
        });
    });

    describe('calculateSkillCoverage', () => {
        it('calculates coverage with default threshold (50)', () => {
            const assessments = [
                { level: 75 },
                { level: 50 },
                { level: 25 },
                { level: 0 },
            ];

            const result = calculateSkillCoverage(assessments, 4);
            expect(result.count).toBe(2); // 75 and 50
            expect(result.percentage).toBe(50);
        });

        it('uses custom threshold', () => {
            const assessments = [
                { level: 100 },
                { level: 75 },
                { level: 50 },
                { level: 25 },
            ];

            const result = calculateSkillCoverage(assessments, 4, 75);
            expect(result.count).toBe(2); // 100 and 75
            expect(result.percentage).toBe(50);
        });

        it('returns 0 for no employees', () => {
            const result = calculateSkillCoverage([], 0);
            expect(result.count).toBe(0);
            expect(result.percentage).toBe(0);
        });

        it('returns 100% when all meet threshold', () => {
            const assessments = [
                { level: 100 },
                { level: 75 },
                { level: 50 },
            ];

            const result = calculateSkillCoverage(assessments, 3, 50);
            expect(result.percentage).toBe(100);
        });
    });

    describe('calculateGoalFulfillment', () => {
        it('calculates fulfillment correctly', () => {
            const assessments = [
                { level: 75, targetLevel: 50 },  // achieved
                { level: 50, targetLevel: 75 },  // not achieved
                { level: 100, targetLevel: 100 }, // achieved
            ];

            const result = calculateGoalFulfillment(assessments);
            expect(result.achieved).toBe(2);
            expect(result.total).toBe(3);
            expect(result.percentage).toBe(67);
        });

        it('ignores assessments without targets', () => {
            const assessments = [
                { level: 75, targetLevel: 50 },
                { level: 50 }, // no target
                { level: 25, targetLevel: undefined },
            ];

            const result = calculateGoalFulfillment(assessments);
            expect(result.total).toBe(1);
            expect(result.achieved).toBe(1);
            expect(result.percentage).toBe(100);
        });

        it('ignores targets of 0', () => {
            const assessments = [
                { level: 50, targetLevel: 0 },
                { level: 75, targetLevel: 50 },
            ];

            const result = calculateGoalFulfillment(assessments);
            expect(result.total).toBe(1);
        });

        it('returns 0% when no targets defined', () => {
            const assessments = [
                { level: 50 },
                { level: 75 },
            ];

            const result = calculateGoalFulfillment(assessments);
            expect(result.percentage).toBe(0);
            expect(result.total).toBe(0);
        });
    });

    describe('calculateAverageGap', () => {
        it('calculates average gap correctly', () => {
            const assessments = [
                { level: 50, targetLevel: 75 },  // gap: 25
                { level: 25, targetLevel: 75 },  // gap: 50
                { level: 75, targetLevel: 100 }, // gap: 25
            ];

            const result = calculateAverageGap(assessments);
            expect(result).toBeCloseTo(33.33, 1); // (25 + 50 + 25) / 3
        });

        it('returns 0 when no targets', () => {
            const assessments = [
                { level: 50 },
                { level: 75 },
            ];

            expect(calculateAverageGap(assessments)).toBe(0);
        });

        it('handles negative gaps (overachievement)', () => {
            const assessments = [
                { level: 100, targetLevel: 75 }, // gap: -25
                { level: 75, targetLevel: 50 },  // gap: -25
            ];

            const result = calculateAverageGap(assessments);
            expect(result).toBe(-25);
        });

        it('ignores assessments without valid targets', () => {
            const assessments = [
                { level: 50, targetLevel: 75 },  // gap: 25
                { level: 25, targetLevel: 0 },   // ignored
                { level: 75 },                    // ignored
            ];

            const result = calculateAverageGap(assessments);
            expect(result).toBe(25);
        });
    });
});
