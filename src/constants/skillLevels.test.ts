import { describe, it, expect } from 'vitest';
import { LEVELS, MATRIX_LAYOUT, SkillLevel } from './skillLevels';

describe('skillLevels constants', () => {

    describe('LEVELS', () => {
        it('contains 6 skill levels', () => {
            expect(LEVELS).toHaveLength(6);
        });

        it('includes all expected values: 0, -1, 25, 50, 75, 100', () => {
            const values = LEVELS.map(l => l.value);
            expect(values).toContain(0);
            expect(values).toContain(-1);
            expect(values).toContain(25);
            expect(values).toContain(50);
            expect(values).toContain(75);
            expect(values).toContain(100);
        });

        it('each level has required properties', () => {
            LEVELS.forEach((level: SkillLevel) => {
                expect(level).toHaveProperty('value');
                expect(level).toHaveProperty('label');
                expect(level).toHaveProperty('color');
                expect(level).toHaveProperty('title');
                expect(level).toHaveProperty('description');

                expect(typeof level.value).toBe('number');
                expect(typeof level.label).toBe('string');
                expect(typeof level.color).toBe('string');
                expect(typeof level.title).toBe('string');
                expect(typeof level.description).toBe('string');
            });
        });

        it('labels are properly formatted with percentage or N/A', () => {
            const labels = LEVELS.map(l => l.label);
            expect(labels).toContain('0%');
            expect(labels).toContain('25%');
            expect(labels).toContain('50%');
            expect(labels).toContain('75%');
            expect(labels).toContain('100%');
            expect(labels).toContain('N/A');
        });

        it('100% level is marked as Experte / Mentor', () => {
            const expertLevel = LEVELS.find(l => l.value === 100);
            expect(expertLevel?.title).toBe('Experte / Mentor');
            expect(expertLevel?.color).toBe('green');
        });

        it('N/A level has value -1 and is ignored in calculations', () => {
            const naLevel = LEVELS.find(l => l.value === -1);
            expect(naLevel).toBeDefined();
            expect(naLevel?.label).toBe('N/A');
            expect(naLevel?.description).toContain('ignoriert');
        });
    });

    describe('MATRIX_LAYOUT', () => {
        it('has cellSize property', () => {
            expect(MATRIX_LAYOUT.cellSize).toBeDefined();
            expect(typeof MATRIX_LAYOUT.cellSize).toBe('number');
            expect(MATRIX_LAYOUT.cellSize).toBeGreaterThan(0);
        });

        it('has labelWidth property', () => {
            expect(MATRIX_LAYOUT.labelWidth).toBeDefined();
            expect(typeof MATRIX_LAYOUT.labelWidth).toBe('number');
            expect(MATRIX_LAYOUT.labelWidth).toBeGreaterThan(0);
        });

        it('has headerHeight property', () => {
            expect(MATRIX_LAYOUT.headerHeight).toBeDefined();
            expect(typeof MATRIX_LAYOUT.headerHeight).toBe('number');
            expect(MATRIX_LAYOUT.headerHeight).toBeGreaterThan(0);
        });

        it('has reasonable default values', () => {
            expect(MATRIX_LAYOUT.cellSize).toBe(85);
            expect(MATRIX_LAYOUT.labelWidth).toBe(260);
            expect(MATRIX_LAYOUT.headerHeight).toBe(140);
        });
    });
});
