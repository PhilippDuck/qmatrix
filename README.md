# SkillGrid - Qualifikationsmatrix & Skill-Management

**SkillGrid** (ehemals Q-Track) ist eine lokale Webanwendung zur Verwaltung von Mitarbeiter-Skills, Qualifizierungsniveaus und Abteilungsstrukturen. Die Anwendung läuft vollständig im Browser (Offline-First) und speichert alle Daten lokal via IndexedDB.

![SkillGrid Screenshot](./screenshot.png)

## Funktionen

*   **Mitarbeiter-Verwaltung**: Anlegen, Bearbeiten und Löschen von Mitarbeitern.
*   **Skill-Matrix**: Übersichtliche Matrix-Darstellung von Kompetenzen (Soll/Ist-Vergleich).
*   **Hierarchische Struktur**: Organisation von Skills in Kategorien und Unterkategorien.
*   **Rollen & Abteilungen**: Zuweisung von Mitarbeitern zu Rollen und Abteilungen.
*   **Qualifizierungspläne**:
    *   Automatische Defizit-Erkennung basierend auf Rollen-Anforderungen.
    *   Maßnahmenplanung (intern mit Mentor oder externe Schulungen).
    *   Timeline-Visualisierung mit Meilensteinen.
    *   Automatische Synchronisation mit der Skill-Matrix.
*   **Historie**: Automatische Protokollierung von Skill-Veränderungen (Wer, Wann, Was).
*   **Dashboard**: Visualisierung wichtiger KPIs (Qualifizierungsgrad, Skill-Gaps, Entwicklung).
*   **Einstellungen**:
    *   **Projekttitel**: Individueller Titel (z.B. Abteilungsname) im Header, der auch auf Reports erscheint.
    *   **Dark Mode**: Augenschonendes Design für jede Umgebung.
    *   **Anonymisierung**: "Präsentationsmodus" zum Ausblenden von Klarnamen.
*   **Import/Export**:
    *   Vollständiges Backup als JSON.
    *   Intelligenter Datenabgleich (Merge) zum Zusammenführen von Datenständen.
    *   PDF-Export für Management-Reports.

## Installation & Start

Voraussetzung: [Node.js](https://nodejs.org/) ist installiert.

1.  Repository klonen oder entpacken.
2.  Abhängigkeiten installieren:
    ```bash
    npm install
    ```
3.  Entwicklungsserver starten:
    ```bash
    npm run dev
    ```
4.  Browser öffnen auf `http://localhost:5173`.

## Nutzungshinweise

### Datenhaltung
Alle Daten werden ausschließlich im **Local Storage / IndexedDB** Ihres Browsers gespeichert. Es werden keine Daten an einen Server gesendet.
*   **Backup**: Nutzen Sie regelmäßig die "Backup"-Funktion im Bereich "System", um Ihre Daten als JSON-Datei zu sichern.
*   **Reset**: Im Bereich "System" (Gefahrenzone) können Sie die Datenbank vollständig zurücksetzen.

### Projekttitel anpassen
Klicken Sie einfach auf den Titel "SkillGrid" (oder "Projektname eingeben") in der oberen Navigationsleiste, um einen individuellen Namen für Ihr Projekt festzulegen (z.B. "Team Frontend"). Dieser Titel wird gespeichert und erscheint auf allen PDF-Exporten.

## Technologie-Stack

*   **Frontend**: React, TypeScript, Vite
*   **UI-Framework**: Mantine UI, Tabler Icons
*   **Datenbank**: IndexedDB (via Wrapper)
*   **PDF-Generierung**: jsPDF
*   **Charts**: Recharts

## Lizenz
Private Nutzung.

---
*Version 2.4.0*
