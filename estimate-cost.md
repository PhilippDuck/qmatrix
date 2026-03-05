# Kostenabschätzung: skillgrid / qmatrix

**Erstellt:** 2026-03-05
**Projektversion zum Zeitpunkt der Schätzung:** 2.20.0

---

## Projektumfang

**Stack:** React 19 + TypeScript, Vite, Mantine UI, Zustand, IndexedDB (kein Backend), Recharts, jsPDF, PWA, Playwright E2E-Tests

**Quelldateien:** ~70+ Source-Dateien, davon ~50 Komponenten
**Store-Groesse:** ~58 KB (~1.500 Zeilen reine Zustandslogik)

---

## Feature-Bereiche & Komplexitaet

| Bereich | Komplexitaet |
|---|---|
| Skill-Matrix (Grid, Collapse, Sortierung, Virtualisierung, Bulk, Saved Views) | sehr hoch |
| Zustand + IndexedDB-Datenschicht + Merge-Logik | sehr hoch |
| Qualifizierungsplaene (Gantt, Forecast, Skill-Gap, Mentor) | hoch |
| Import/Export + Diff-Merge | hoch |
| Dashboard (Charts, KPIs, Metriken) | mittel |
| Kategorie-Manager (3-stufige Hierarchie) | mittel |
| Organisations-Management + Organigramme | mittel |
| Mitarbeiter-Verwaltung + History/Audit-Trail | mittel |
| PDF-Reports | mittel |
| Tests (Unit + E2E) | mittel |
| PWA (vite-plugin-pwa, Icon-Generierung) | mittel |
| Privacy-Modal, UI-Polish, Bugfixes | gering–mittel |

---

## Entwicklungsaufwand

**Geschaetzte Stunden:** 600–800 h (inkl. Konzeption, Iteration, Testing, Bugfixes)
**Entspricht:** ca. 15–20 Personenwochen (1 Senior-Entwickler Vollzeit)

---

## Kostenabschaetzung Deutschland

### Freiberuflicher Senior Frontend-Entwickler

| Stundensatz | Kosten |
|---|---|
| 75 EUR/h (guenstiger Freelancer) | 45.000 – 60.000 EUR |
| 100 EUR/h (marktueblich) | 60.000 – 80.000 EUR |
| 130 EUR/h (Spezialist / Berlin / Muenchen) | 78.000 – 104.000 EUR |

### Agentur (30–50 % Overhead)

> **80.000 – 130.000 EUR**

### Festangestellter Entwickler (All-in ~95.000 EUR/Jahr)

> Bei 20 Wochen Vollzeit anteilig: **35.000 – 45.000 EUR**

---

## Fazit

> **60.000 – 100.000 EUR** ist die marktuebliche Spanne in Deutschland fuer diesen Entwicklungsstand — je nach Erfahrungsniveau, Region und ob Freelancer oder Agentur.

Mit KI-Unterstuetzung (Claude Code) wurde der reine Implementierungsaufwand erheblich reduziert. Die Architekturentscheidungen, das Domainwissen und das Produktdesign kamen vom Auftraggeber — das ist der eigentliche Wert, der sich nicht automatisieren laesst.
