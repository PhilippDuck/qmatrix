import fs from 'fs';
import path from 'path';

// Simple helper for random levels
const getRandomLevel = () => {
    const levels = [0, 25, 50, 75, 100];
    return levels[Math.floor(Math.random() * levels.length)];
};

const generateData = () => {
    const departments = [];
    const roles = [];
    const categories = [];
    const subcategories = [];
    const skills = [];
    const employees = [];
    const assessments = [];

    // 1. Generate Departments
    for (let i = 1; i <= 10; i++) {
        departments.push({
            id: `dept-${i}`,
            name: `Abteilung ${i}`,
            updatedAt: Date.now()
        });
    }

    // 2. Generate Roles
    for (let i = 1; i <= 5; i++) {
        roles.push({
            id: `role-${i}`,
            name: `Rolle ${i}`,
            description: `Beschreibung für Rolle ${i}`,
            updatedAt: Date.now()
        });
    }

    // 3. Generate Categories & Subcategories & Skills
    for (let c = 1; c <= 10; c++) {
        const catId = `cat-${c}`;
        categories.push({
            id: catId,
            name: `Kategorie ${c}`,
            updatedAt: Date.now()
        });

        const subId = `sub-${c}`;
        subcategories.push({
            id: subId,
            categoryId: catId,
            name: `Unterkategorie ${c}`,
            updatedAt: Date.now()
        });

        for (let s = 1; s <= 10; s++) {
            const skillId = `skill-${c}-${s}`;
            skills.push({
                id: skillId,
                subCategoryId: subId,
                name: `Skill ${c}.${s}`,
                updatedAt: Date.now()
            });
        }
    }

    // 4. Generate Employees
    for (let e = 1; e <= 100; e++) {
        const empId = `emp-${e}`;
        const dept = departments[Math.floor(Math.random() * departments.length)];
        const role = roles[Math.floor(Math.random() * roles.length)];

        employees.push({
            id: empId,
            name: `Mitarbeiter ${e}`,
            department: dept.id,
            roles: [role.id],
            isActive: true,
            updatedAt: Date.now()
        });

        // 5. Generate Assessments for each employee/skill (Full Matrix coverage)
        skills.forEach(skill => {
            // 80% chance for an assessment
            if (Math.random() > 0.2) {
                assessments.push({
                    id: `${empId}-${skill.id}`,
                    employeeId: empId,
                    skillId: skill.id,
                    level: getRandomLevel(),
                    targetLevel: Math.random() > 0.5 ? getRandomLevel() : undefined,
                    updatedAt: Date.now()
                });
            }
        });
    }

    const exportData = {
        settings: {
            id: 'default',
            projectTitle: 'Stress Test Matrix (100x100)',
            updatedAt: Date.now()
        },
        departments,
        roles,
        categories,
        subcategories,
        skills,
        employees,
        assessments,
        history: [],
        qualificationPlans: [],
        qualificationMeasures: [],
        savedViews: [],
        changeHistory: []
    };

    return exportData;
};

const data = generateData();
const outputPath = path.join(process.cwd(), 'stress-test-data.json');
fs.writeFileSync(outputPath, JSON.stringify(data, null, 2));

console.log(`Successfully generated stress test data at ${outputPath}`);
console.log(`- Employees: ${data.employees.length}`);
console.log(`- Skills: ${data.skills.length}`);
console.log(`- Assessments: ${data.assessments.length}`);
