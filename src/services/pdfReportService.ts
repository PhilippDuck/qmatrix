import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { ExportData, AssessmentLogEntry } from "./indexeddb";

interface CategoryPerformance {
    id: string;
    name: string;
    avgStart: number;
    avgEnd: number;
    totalSkills: number;
}

interface ReportKPIs {
    totalEmployees: number;
    totalSkills: number;
    overallScoreStart: number;
    overallScoreEnd: number;
    qualificationGrowth: number;
    skillCoverageStart: number;
    skillCoverageEnd: number; // % of skills > 0
}

export const generateQuarterlyReport = (
    data: ExportData,
    year: number,
    quarter: number
) => {
    // 1. Calculate Date Range
    const startDate = new Date(year, (quarter - 1) * 3, 1).getTime();
    const endDate = new Date(year, quarter * 3, 0, 23, 59, 59).getTime();

    // 2. Data Preparation
    const employees = data.employees;
    const skills = data.skills;
    const categories = data.categories;

    // Helper to get level at a specific time
    // Cache logs for performance?
    const logsByEmployeeSkill = new Map<string, AssessmentLogEntry[]>();
    data.history.forEach(log => {
        const key = `${log.employeeId}-${log.skillId}`;
        if (!logsByEmployeeSkill.has(key)) logsByEmployeeSkill.set(key, []);
        logsByEmployeeSkill.get(key)!.push(log);
    });

    // Sort all logs once
    logsByEmployeeSkill.forEach(logs => logs.sort((a, b) => a.timestamp - b.timestamp));

    const getLevelAt = (employeeId: string, skillId: string, timestamp: number): number => {
        const logs = logsByEmployeeSkill.get(`${employeeId}-${skillId}`);
        if (!logs) return 0;

        // Find last log before or at timestamp
        // Since sorted, we can iterate forward or findLast
        let level = 0;
        for (const log of logs) {
            if (log.timestamp <= timestamp) {
                level = log.newLevel;
            } else {
                break;
            }
        }
        return level;
    };

    // 3. Calculation
    let sumLevelStart = 0;
    let sumLevelEnd = 0;
    let nonZeroStart = 0;
    let nonZeroEnd = 0;
    const totalPotential = employees.length * skills.length;

    // Category aggregators
    const categoryStats = new Map<string, { sumStart: number; sumEnd: number; count: number }>();
    categories.forEach(c => categoryStats.set(c.id!, { sumStart: 0, sumEnd: 0, count: 0 }));

    // Map skill to category for fast lookup
    const skillToCategory = new Map<string, string>(); // skillId -> categoryId
    skills.forEach(s => {
        const sub = data.subcategories.find(sub => sub.id === s.subCategoryId);
        if (sub) skillToCategory.set(s.id!, sub.categoryId);
    });

    if (totalPotential > 0) {
        employees.forEach(emp => {
            skills.forEach(skill => {
                const startStr = getLevelAt(emp.id!, skill.id!, startDate);
                const endStr = getLevelAt(emp.id!, skill.id!, endDate);

                const startVal = startStr || 0;
                const endVal = endStr || 0;

                sumLevelStart += startVal;
                sumLevelEnd += endVal;

                if (startVal > 0) nonZeroStart++;
                if (endVal > 0) nonZeroEnd++;

                // Category stats
                const catId = skillToCategory.get(skill.id!);
                if (catId && categoryStats.has(catId)) {
                    const stats = categoryStats.get(catId)!;
                    stats.sumStart += startVal;
                    stats.sumEnd += endVal;
                    stats.count++;
                }
            });
        });
    }

    const kpis: ReportKPIs = {
        totalEmployees: employees.length,
        totalSkills: skills.length,
        overallScoreStart: totalPotential ? Math.round((sumLevelStart / totalPotential) * 10) / 10 : 0, // 0-100 scale ideally, but sum is sum of levels (0-100). So avg is 0-100.
        overallScoreEnd: totalPotential ? Math.round((sumLevelEnd / totalPotential) * 10) / 10 : 0,
        qualificationGrowth: 0,
        skillCoverageStart: totalPotential ? Math.round((nonZeroStart / totalPotential) * 1000) / 10 : 0, // %
        skillCoverageEnd: totalPotential ? Math.round((nonZeroEnd / totalPotential) * 1000) / 10 : 0,
    };

    kpis.qualificationGrowth = Math.round((kpis.overallScoreEnd - kpis.overallScoreStart) * 10) / 10;

    const categoryPerf: CategoryPerformance[] = [];
    categories.forEach(c => {
        const stats = categoryStats.get(c.id!);
        if (stats && stats.count > 0) {
            categoryPerf.push({
                id: c.id!,
                name: c.name,
                avgStart: Math.round((stats.sumStart / stats.count) * 10) / 10,
                avgEnd: Math.round((stats.sumEnd / stats.count) * 10) / 10,
                totalSkills: stats.count // actually this is (skills in cat * employees)
            });
        }
    });

    // Sort by growth
    categoryPerf.sort((a, b) => (b.avgEnd - b.avgStart) - (a.avgEnd - a.avgStart));


    // 4. PDF Generation
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.width;

    // -- Header --
    doc.setFillColor(41, 128, 185); // Blue header
    doc.rect(0, 0, pageWidth, 40, "F");

    doc.setTextColor(255, 255, 255);
    doc.setFontSize(22);
    doc.text("Management Summary", 14, 20);
    doc.setFontSize(12);
    doc.text(`Qualifizierungsbericht Q${quarter} ${year}`, 14, 30);

    doc.setFontSize(10);
    doc.text(`Erstellt: ${new Date().toLocaleDateString("de-DE")}`, pageWidth - 40, 30);

    // -- KPIs Section --
    const kpiY = 55;
    doc.setTextColor(50, 50, 50);

    // Helper for KPI Card
    const drawKpiCard = (x: number, y: number, title: string, value: string, subtext: string, color: string = "#000") => {
        doc.setDrawColor(200, 200, 200);
        doc.setFillColor(250, 250, 250);
        doc.roundedRect(x, y, 40, 35, 3, 3, "FD");

        doc.setFontSize(9);
        doc.setTextColor(100);
        doc.text(title, x + 4, y + 10);

        doc.setFontSize(16);
        doc.setTextColor(color);
        doc.text(value, x + 4, y + 22);

        doc.setFontSize(8);
        doc.setTextColor(150);
        doc.text(subtext, x + 4, y + 30);
    };

    drawKpiCard(14, kpiY, "Mitarbeiter", kpis.totalEmployees.toString(), "Aktiv im System");
    drawKpiCard(62, kpiY, "Skills", kpis.totalSkills.toString(), "Definierte Qualifikationen");

    const growthColor = kpis.qualificationGrowth >= 0 ? "#27ae60" : "#c0392b";
    const growthPrefix = kpis.qualificationGrowth > 0 ? "+" : "";
    drawKpiCard(110, kpiY, "Qualifikations-Score", `${kpis.overallScoreEnd}%`, `Ø Level (Gesamt)`);
    drawKpiCard(158, kpiY, "Wachstum", `${growthPrefix}${kpis.qualificationGrowth}%`, "Veränderung", growthColor);

    // -- Detail Stats Text --
    doc.setTextColor(50);
    doc.setFontSize(11);
    doc.text("Zusammenfassung der Entwicklung", 14, 110);
    doc.setFontSize(10);
    doc.setTextColor(100);
    const textLines = doc.splitTextToSize(
        `Im Zeitraum Q${quarter}/${year} lag der durchschnittliche Qualifikationsgrad der Belegschaft zu Beginn bei ` +
        `${kpis.overallScoreStart}%. Zum Ende des Quartals beträgt dieser ${kpis.overallScoreEnd}%. ` +
        `Die Skill-Abdeckung (Anteil Skills > 0%) entwickelte sich von ${kpis.skillCoverageStart}% auf ${kpis.skillCoverageEnd}%.`,
        pageWidth - 28
    );
    doc.text(textLines, 14, 120);

    // -- Category Table --
    doc.setTextColor(50);
    doc.setFontSize(11);
    doc.text("Performance nach Kategorien", 14, 150);

    const tableData = categoryPerf.map(c => [
        c.name,
        `${c.avgStart}%`,
        `${c.avgEnd}%`,
        `${(c.avgEnd - c.avgStart) > 0 ? "+" : ""}${(c.avgEnd - c.avgStart).toFixed(1)}%`
    ]);

    autoTable(doc, {
        startY: 160,
        head: [["Kategorie", "Starts-Score", "End-Score", "Wachstum"]],
        body: tableData,
        theme: 'striped',
        headStyles: { fillColor: [52, 73, 94] },
        alternateRowStyles: { fillColor: [245, 245, 245] },
        styles: { fontSize: 10 },
    });

    // Footer
    const pageCount = (doc as any).internal.getNumberOfPages();
    doc.setFontSize(8);
    doc.setTextColor(150);
    doc.text(`Q-Track System Report - Seite 1 von ${pageCount}`, pageWidth / 2, doc.internal.pageSize.height - 10, { align: 'center' });

    doc.save(`Management_Summary_Q${quarter}_${year}.pdf`);
};
