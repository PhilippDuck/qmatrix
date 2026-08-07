import { describe, it, expect } from 'vitest';
import { getScoreColor, getNextLevel, getLevelByValue } from './skillCalculations';

describe('skillCalculations', () => {

    describe('getScoreColor', () => {
        it('returns gray.4 for null score', () => {
            expect(getScoreColor(null)).toBe('gray.4');
        });

        it('returns green for scores >= 75', () => {
            expect(getScoreColor(75)).toBe('green');
            expect(getScoreColor(80)).toBe('green');
            expect(getScoreColor(100)).toBe('green');
        });

        it('returns lime for scores >= 50 and < 75', () => {
            expect(getScoreColor(50)).toBe('lime');
            expect(getScoreColor(60)).toBe('lime');
            expect(getScoreColor(74)).toBe('lime');
        });

        it('returns yellow for scores >= 25 and < 50', () => {
            expect(getScoreColor(25)).toBe('yellow');
            expect(getScoreColor(35)).toBe('yellow');
            expect(getScoreColor(49)).toBe('yellow');
        });

        it('returns orange for scores > 0 and < 25', () => {
            expect(getScoreColor(1)).toBe('orange');
            expect(getScoreColor(10)).toBe('orange');
            expect(getScoreColor(24)).toBe('orange');
        });

        it('returns gray for score of 0', () => {
            expect(getScoreColor(0)).toBe('gray');
        });

        it('returns gray for negative scores (except special cases)', () => {
            expect(getScoreColor(-1)).toBe('gray');
            expect(getScoreColor(-10)).toBe('gray');
        });
    });

    describe('getNextLevel', () => {
        it('cycles through levels correctly starting from 0', () => {
            // LEVELS order: 0, -1, 25, 50, 75, 100
            expect(getNextLevel(0)).toBe(-1);  // 0 -> -1 (N/A)
        });

        it('returns next level value for 25', () => {
            expect(getNextLevel(25)).toBe(50);
        });

        it('returns next level value for 50', () => {
            expect(getNextLevel(50)).toBe(75);
        });

        it('returns next level value for 75', () => {
            expect(getNextLevel(75)).toBe(100);
        });

        it('wraps around from 100 to 0', () => {
            expect(getNextLevel(100)).toBe(0);
        });

        it('returns next level for N/A (-1)', () => {
            expect(getNextLevel(-1)).toBe(25);
        });
    });

    describe('getLevelByValue', () => {
        it('returns correct level object for value 0', () => {
            const level = getLevelByValue(0);
            expect(level).toBeDefined();
            expect(level?.value).toBe(0);
            expect(level?.label).toBe('0%');
            expect(level?.color).toBe('gray');
            expect(level?.title).toBe('Keine Kenntnisse');
        });

        it('returns correct level object for value 25', () => {
            const level = getLevelByValue(25);
            expect(level).toBeDefined();
            expect(level?.value).toBe(25);
            expect(level?.label).toBe('25%');
            expect(level?.color).toBe('orange');
            expect(level?.title).toBe('Grundkenntnisse');
        });

        it('returns correct level object for value 50', () => {
            const level = getLevelByValue(50);
            expect(level).toBeDefined();
            expect(level?.value).toBe(50);
            expect(level?.title).toBe('Anwender');
        });

        it('returns correct level object for value 75', () => {
            const level = getLevelByValue(75);
            expect(level).toBeDefined();
            expect(level?.value).toBe(75);
            expect(level?.color).toBe('lime');
            expect(level?.title).toBe('Fachkompetent');
        });

        it('returns correct level object for value 100', () => {
            const level = getLevelByValue(100);
            expect(level).toBeDefined();
            expect(level?.value).toBe(100);
            expect(level?.color).toBe('green');
            expect(level?.title).toBe('Experte / Mentor');
        });

        it('returns correct level object for N/A value (-1)', () => {
            const level = getLevelByValue(-1);
            expect(level).toBeDefined();
            expect(level?.value).toBe(-1);
            expect(level?.label).toBe('N/A');
            expect(level?.title).toBe('Nicht relevant (N/A)');
        });

        it('returns undefined for non-existent value', () => {
            const level = getLevelByValue(42);
            expect(level).toBeUndefined();
        });

        it('returns undefined for value 200', () => {
            const level = getLevelByValue(200);
            expect(level).toBeUndefined();
        });
    });
});
