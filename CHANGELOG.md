
## [2.12.1] - 2026-02-20

### UI & Layout Anpassungen
- **Dashboard**: Layout-Korrektur für die Dashboard-Kacheln, sodass diese im Grid die volle Höhe einnehmen und Lücken vermieden werden.
- **Skill-Matrix**: Änderung der Gruppen-XP-Anzeige im Spaltenkopf von einem Durchschnitt auf die Gesamtsumme (∑) zur besseren Erkennbarkeit der "Skill-Masse". Vertikale Ausrichtung des Summensymbols optimiert.
- **Skill-Matrix**: Bugfix bei der Mitarbeiterfilterung nach Rollen durch Behebung einer fehlerhaften Objekt-vs-String-Abfrage.

## [2.12.0] - 2026-02-20

### Architektur & Refactoring (Performance & Wartbarkeit)
- **State-Management Migration (Zustand)**: Ablösung des bisherigen monolithischen "God Context" (`DataContext.tsx`) durch den performanten Zustand-Store (`useStore.ts`). Komponenten abonnieren nur noch die Daten-Slices, die sie wirklich benötigen, was unnötige, app-weite Re-Renders verhindert.
- **SkillMatrix Modularisierung**:
  - Extraktion der komplexen Toolbar in eine dedizierte `MatrixToolbar`-Komponente (Bundle-Size & Lesbarkeit verbessert).
  - Auslagerung des UI-Status (Filter, Ansichten) in einen neuen Hook `useMatrixState`.
  - Auslagerung der Kernberechnungen für Sortierung, Filterung und Durchschnittsbildung in den Hook `useMatrixCalculations`.
  - Saubere Trennung von UI- und Business-Logik durch Auslagerung komplexer, rekursiver Skill-Aggregationsfunktionen aus den Matrix-Komponenten in `src/utils/hierarchyUtils.ts`.

## [2.11.3] - 2026-02-20

### Neue Funktionen & Benutzeroberfläche
- **Rollen-Manager**: Die Detailbeschreibungen ("Legende") für die einzelnen Soll-Level wurden direkt als anschauliche Hover-Tooltips an den Schiebereglern integriert, was separaten Legenden-Platz spart.
- **Rollen-Icons**: Die Auswahl an Icons für Rollen wurde deutlich ausgebaut, u.a. um technische (Roboter, Motor, Werkzeug, Anlage, Netzwerk) und geschäftliche (Finanzen, Chart) Symbole.
- **Navigation (Qualifizierungsplan)**: Der Zurück-Pfeil aus der Detailansicht springt nun korrekt auf den Tab "Übersicht" anstatt kurzfristig die Navigation zu verwirren.

## [2.11.2] - 2026-02-19

### Performance
- **Optimierte Datennutzung**:
  - Zugriff auf Assessments via O(1) Map statt O(N) Array-Suche.
  - Implementierung von Optimistic Updates für sofortige UI-Reaktion beim Setzen von Leveln.
  - Reduktion von unnötigen Re-Renders in der Matrix durch differenziertes Hover-State-Management.

## [2.11.1] - 2026-02-19

### Bugfixes
- **Prognose-Berechnung korrigiert**:
  - Die Berechnung des Erfüllungsgrades in der Prognose (Tabelle & KPIs) wurde an die Logik der Skill-Matrix angeglichen (Weighted Average).
  - Unbewertete Skills mit Soll-Vorgabe zählen nun korrekt als 0% (statt ignoriert zu werden).
  - Überqualifikation in einem Skill kann Unterqualifikation in einem anderen Skill ausgleichen.
  - Beseitigt Diskrepanzen zwischen Matrix-Header und Prognose-Startwert.

## [2.11.0] - 2026-02-19

### Neue Funktionen & Verbesserungen
- **Erweiterte Prognose-Visualisierung**:
  - **Neuer Line-Chart**: Visualisiert den Verlauf der prognostizierten Gesamt-XP und der durchschnittlichen Soll-Erfüllung über den gewählten Zeitraum.
  - **Mitarbeiter-Entwicklung**: Zeigt zusätzlich die Entwicklung der Mitarbeiterzahl (inkl. geplanter Abgänge) im Chart.
  - **Langzeit-Prognose**: Der Prognose-Zeitraum wurde um eine 2-Jahres-Option erweitert.
  - **Kapazitäts-Metrik**: Neue KPI-Karte "Gesamt-XP" zeigt den absoluten Verlust/Gewinn an Qualifikationskapazität.

- **Optimierung der Qualifizierungsplan-Übersicht**:
  - **Zusammenführung**: Der Reiter "Aktive Pläne" wurde vollständig in die "Übersicht" integriert.
  - **Erweiterte Filterung**: Die Übersicht bietet nun direkt Such- und Filter-Möglichkeiten für alle aktiven Pläne.
  - **Layout-Verbesserungen**: Optimierte Abstände und responsive Darstellung der KPI-Karten (5 Spalten auf großen Bildschirmen).

## [2.10.0] - 2026-02-19

### Neue Funktionen

- **Prognose-Tab im Qualifizierungsplan**: Neuer „Prognose"-Tab zeigt eine Vorschau, wie sich die Team-Qualifikation entwickelt, wenn alle geplanten Maßnahmen umgesetzt werden.
  - **KPI-Karten**: Vergleich von Ist- und Prognose-Werten für Ø Soll-Erfüllung, Defizite und abgedeckte Skills.
  - **Mitarbeiter-Tabelle**: Zeigt je Mitarbeiter den aktuellen und prognostizierten Erfüllungsgrad mit farbcodierter Veränderung (grün = Verbesserung, rot = Verschlechterung).
  - **Kategorie-Balken**: Horizontale Fortschrittsbalken pro Kategorie mit Ist- und Prognose-Overlay.
  - **Skill-Breakdown-Tooltips**: Hover über eine Zelle zeigt die Einzelbewertung jedes Skills (Ist-Level, Soll, Erfüllungsgrad).
  - **Soll-basierte Durchschnitte**: Nur Skills mit definiertem Soll-Wert fließen in die Durchschnittsberechnung ein – Skills ohne Ziel verfälschen das Ergebnis nicht.
  - **Abgangs-Erkennung**: Mitarbeiter mit zukünftigem Deaktivierungsdatum oder inaktivem Status werden in der Prognose ausgeschlossen.
  - **Visuelle Unterscheidung**: In Tooltips werden Skills ohne Soll-Wert kursiv/gedimmt dargestellt.

- **Drei-Wege-Metrik-Toggle in der Skill Matrix**: Der bisherige Umschalter zwischen Durchschnitt und Maximum wurde zu einem dreistufigen Toggle erweitert:
  - **Durchschnitt (%)**: Zeigt den arithmetischen Mittelwert der Skill-Level (bisheriges Verhalten).
  - **Maximum (XP)**: Zeigt den höchsten Wert bzw. Gesamt-XP (bisheriges Verhalten).
  - **Erfüllungsgrad (Ist/Soll)**: Neuer Modus – zeigt den durchschnittlichen Erfüllungsgrad (min(100%, Ist/Soll × 100%)) für alle Assessments mit definiertem Soll-Wert.
  - Farbcodierung: Teal (≥ 100%), Orange (< 100%), Grau (kein Soll definiert).
  - Durchgängig implementiert: Header, Kategorie-, Unterkategorie-, Skill-Zeilen und Gruppen-Zusammenfassungen.

### Technische Details
- Neue Datei `forecastCalculations.ts` mit dem Berechnungs-Engine für die Prognose (fulfillmentScore, avgFulfillment, generateForecastWithPlans).
- Neue Komponente `ForecastView.tsx` für die Prognose-Ansicht.
- `showMaxValues: boolean` → `metricMode: 'avg' | 'max' | 'fulfillment'` in der Skill-Matrix und gespeicherten Ansichten (abwärtskompatibel).

## [2.9.13] - 2026-02-19

### Behobene Fehler & Fixes
- **Dark Mode Timeline**: Leerer Zustand der Timeline-Komponente im Qualifizierungsplan war im Dark Mode hell statt dunkel – hartcodierte `gray-0` Hintergrundfarbe entfernt, nutzt nun theme-aware Standardfarbe.
- **Standard-View Aufklapp-Zustand**: Beim Wechsel von einer individuellen Ansicht zurück zur Standard-Ansicht wurden die Aufklapp-/Zuklapp-Einstellungen der zuletzt gewählten individuellen Ansicht übernommen. Die Standard-Ansicht merkt sich nun ihren eigenen unabhängigen Aufklapp-Zustand.

## [2.9.12] - 2026-02-18

### Neue Funktionen & Verbesserungen
- **Gantt-Timeline für Qualifizierungsmaßnahmen**: Neue kalenderartige Timeline-Ansicht mit Wochen-Grid, farbcodierten Balken nach Status, Heute-Markierung und Navigation.
  - **Übersichts-Tab**: Neuer „Timeline"-Tab in der Qualifizierungsplan-Übersicht zeigt alle Maßnahmen gruppiert nach Mitarbeiter.
  - **Plan-Detail**: Die alte vertikale Timeline im Plan-Detail wurde durch die Gantt-Ansicht ersetzt (nur Maßnahmen des jeweiligen Plans).
  - **Dynamische Breite**: Die Timeline füllt den gesamten verfügbaren Platz aus (responsive via ResizeObserver).
  - **Kategorie-Pfad**: Tooltip auf Balken und Skill-Labels zeigt den vollständigen Kategorie-Baum (z.B. „IBV › Sicherheitstechnik › Skill").
  - **Status-Balken**: Verbesserte Farben für „Geplant"-Balken (`gray-6` statt `gray-3`) für besseren Kontrast in Dark & Light Mode.
  - **Tooltip-Badges**: Status-Badges im Tooltip verwenden `variant="filled"` für optimale Lesbarkeit.

## [2.9.11] - 2026-02-18

### Neue Funktionen & Verbesserungen
- **Legende in Header-Zelle integriert**: Die Matrix-Legende ist nun direkt in der „Struktur / Team"-Zelle als klickbarer „Legende"-Link verfügbar (statt als separater Button in der Toolbar).
- **Sortierung in Header-Zelle integriert**: Die Sortier-Buttons für Mitarbeiter (MA ↑↓) und Skills (Skills ↑↓) wurden aus der Toolbar entfernt und als kompakte, klickbare Sortier-Indikatoren direkt in die Header-Zelle verschoben.
  - Visuelles Feedback: Aktive Sortierung zeigt farbige Hinterlegung (blau für MA, violett für Skills).
  - Dreistufiger Toggle: Klick wechselt zwischen aufsteigend → absteigend → keine Sortierung.
- **Toolbar-Reorganisation**: Die verbleibenden Icon-Buttons wurden logisch neu gruppiert:
  - **Ansicht**: Gruppierung, MA ein/ausblenden, Werte-Modus, Auf-/Zuklappen, Leere Spalten, Filter.
  - **Aktionen**: Bearbeitungsmodus, Skill hinzufügen, Mitarbeiter hinzufügen.
  - Überflüssige Gruppen-Wrapper und leere Kommentare entfernt.
- **Änderungshistorie für Ansichten**: Erstellen, Ändern und Löschen von gespeicherten Ansichten wird nun in der Änderungshistorie protokolliert und kann rückgängig gemacht werden.
  - Neuer Entity-Typ `savedView` mit Icon (Auge) und Beschreibungen im History-Drawer.
- **Tooltips im Qualifizierungsplan**: Skill-Namen und Maßnahmen-Level-Buttons zeigen nun Beschreibungen als Tooltip beim Hover an.

### Behobene Fehler & Fixes
- **Dark Mode**: N/A-Badge in der Legenden-HoverCard war zu hell – Farbe von `gray.3` auf `gray.6` angepasst.
- **MatrixLegend-Trigger**: Die Legende unterstützt nun ein individuelles `trigger`-Prop für flexible Einbindung an verschiedenen Stellen.

## [2.9.10] - 2026-02-18

### Behobene Fehler & Fixes
- **Skill-Matrix Sortierung**: Ein Fehler bei der Sortierung nach "Maximaler Abdeckung" wurde behoben.
  - Die Sortierlogik berücksichtigt nun korrekt auch tief verschachtelte Unterkategorien (rekursiv).
  - Die Sortierung aktualisiert sich nun automatisch bei Änderungen an Bewertungen oder Rollenanforderungen (Behebung von "stale data" Problemen).
  - Die Berechnungslogik für Anzeige und Sortierung wurde vereinheitlicht, um Diskrepanzen auszuschließen.
- **Dashboard KPIs**:
  - **Zielerfüllung**: Berücksichtigt nun korrekt sowohl individuelle Ziele als auch Rollen-Anforderungen.
  - **Skill Gaps**: Berechnungsgrundlage vereinheitlicht mit der Zielerfüllung.
  - **Aktivitäts-Übersicht**: Die Karte hat nun eine feste Mindesthöhe, um Layout-Sprünge zu vermeiden.
- **Datenkonsistenz**: Diverse Berechnungen im Dashboard wurden gehärtet, um fehlende Ziele korrekt zu handhaben.

## [2.9.9] - 2026-02-18

### Neue Funktionen & Verbesserungen
- **PDF-Export für Qualifizierungspläne**:
  - Im Header jedes Qualifizierungsplans kann nun ein PDF-Report generiert und heruntergeladen werden.
  - Der Report enthält Mitarbeiter- und Plan-Daten, eine Übersicht der aktuellen Skill-Defizite sowie eine Tabelle aller geplanten Maßnahmen.
  - Unterschriftenfelder für Mitarbeiter und Führungskraft ermöglichen die direkte Nutzung als offizielles Dokument.
  - Maßennamen werden im PDF automatisch generiert (z.B. "Internes Training: [Skill Name]"), falls kein expliziter Titel vorhanden ist.

### Behobene Fehler & Fixes
- **UI-Stabilität**: Ein Fehler im Aktions-Menü ("Menu.Target component children...") wurde behoben, indem der PDF-Download-Button als eigenständige Aktion platziert wurde.
- **Defizit-Visualisierung**: Die Indikatoren für "adressierte Defizite" wurden verfeinert:
  - < 50% abgedeckt: Rotes Kreuz
  - 50-99% abgedeckt: Orangenes Ausrufezeichen
  - 100% abgedeckt: Grüner Haken


## [2.9.8] - 2026-02-13

### Verbesserungen & UI
- **Dark Mode Anpassung**: Das Farbschema im Dark Mode wurde von Standard-Grau auf ein tiefes "Marienblau" (Navy/Anthrazit) umgestellt, um die Ästhetik zu verbessern.

## [2.9.7] - 2026-02-13

### Verbesserungen & UI
- **Organigramm-Kacheln**: Die Breite der Kacheln (Skills, Kategorien, Unterkategorien) passt sich nun dynamisch an die Länge des Titels an.
  - Verhindert abgeschnittene Texte bei langen Bezeichnungen.
  - Definiert sinnvolle Mindest- und Maximalbreiten für ein harmonisches Gesamtbild.

### Behobene Fehler
- **Historie bei Copy & Paste**: Kopiervorgänge im Organigramm (Skills, Unterkategorien) werden nun korrekt in der Änderungshistorie erfasst und können somit auch rückgängig gemacht werden.


## [2.9.6] - 2026-02-11

### Verbesserungen
- **Sticky Header in der Skill-Matrix**: Toolbar und Mitarbeiter-Spaltenköpfe bleiben beim vertikalen Scrollen sichtbar.
  - AppShell-Höhenkette korrigiert: `height: 100dvh` und `minHeight: 0` überschreiben Mantines Standard `min-height: 100dvh`.
  - Card-Container nutzt `flex: 0 1 auto` statt `flex: 1` - kein leerer Bereich mehr bei eingeklappten Kategorien.
- **Legende als HoverCard**: Legende wurde von Inline-Collapse zu einem kompakten Info-Icon mit HoverCard umgestaltet.
  - Zeigt Kompetenzstufen, Status-Werte und Zell-Indikatoren (Individuelles Soll, Rollen-Soll, Schulungsmaßnahmen).
  - Kein Klick nötig - Hover reicht aus.
- **Z-Index-Korrekturen für horizontales Scrollen**: Sticky Labels (Kategorien, Unterkategorien, Skills) haben nun einheitlich höheren z-Index (30+), sodass scrollende Zellen korrekt dahinter verschwinden.
- **Opaque Hintergründe für Sticky-Spalten**: Behebt Problem in Dark Mode, bei dem semi-transparente Mantine-Farben (`--mantine-color-gray-light`) Zellinhalte durchscheinen ließen. CSS-Layering-Trick mit `linear-gradient` sorgt für blickdichte Hintergründe.

## [2.9.5] - 2026-02-10

### Behobene Fehler
- **Undo für Assessment-Erstellung**: Behebt kritischen Bug beim Rückgängigmachen von neu erstellten Skill-Bewertungen.
  - Problem: UUID-Split war fehlerhaft - `split('-')` zerstörte die UUIDs, da sowohl employeeId als auch skillId selbst Bindestriche enthalten.
  - Lösung: Korrektes Splitten in UUID-Komponenten (erste 5 Teile = employeeId, letzte 5 Teile = skillId).
  - Betroffen: Undo von Änderungen wie "leer/N/A → 25%" funktionierte nicht - Assessment wurde nicht gelöscht.
  - Zusätzlicher Fix: Sicherstellung dass previousData immer vollständiges Assessment-Objekt mit ID enthält.

## [2.9.4] - 2026-02-10

### Behobene Fehler
- **Fingerprint-Stabilität**: Behebt Problem mit inkonsistenten Daten-Fingerprints nach Import.
  - Import/Merge-Operationen erzeugen nun stabile, reproduzierbare Fingerprints.
  - `updatedAt` und `timestamp` Felder werden beim Hash-Berechnen ignoriert (nicht relevant für Datenintegrität).
  - Import speichert Daten exakt wie im Backup, ohne neue Timestamps zu generieren.
  - Gleiche Backup-Datei erzeugt nun immer denselben Fingerprint - wichtig für Verifizierung und Multi-Instanz-Synchronisation.

## [2.9.3] - 2026-02-10

### Behobene Fehler
- **🚨 KRITISCH: Export/Import/Backup**: Behebt schwerwiegenden Datenverlust-Bug bei Backups.
  - **changeHistory** (Änderungshistorie mit Undo-Daten) wurde nicht exportiert/importiert - nun vollständig enthalten in allen Backup-/Merge-Operationen.
  - Betroffen waren: `exportData()`, `importData()`, `mergeData()`, `diffData()`, `clearAllData()`.
  - **WICHTIG**: Alte Backups (vor 2.9.3) enthalten keine Änderungshistorie. Neue Backups ab dieser Version sind vollständig.

## [2.9.2] - 2026-02-10

### Behobene Fehler
- **Mitarbeiter-Deaktivierung**: Behebt mehrere Fehler beim Setzen von Deaktivierungsdaten.
  - Mitarbeiter mit zukünftigem Deaktivierungsdatum bleiben nun korrekt aktiv bis zum eingestellten Datum.
  - Deaktivierungsdatum-Feld wird angezeigt, auch wenn ein zukünftiges Datum gesetzt ist.
  - Beim Setzen eines zukünftigen Deaktivierungsdatums wird der Status automatisch auf "Aktiv" gesetzt.
  - Deaktivierungsdatum wird korrekt gelöscht, wenn Mitarbeiter wieder auf "Aktiv" gesetzt wird.
  - Korrekte Übergabe von isActive, deactivationDate und reactivationDate in allen Komponenten (EmployeeList, SkillMatrix).
  - Verbessertes Datum-Handling (String/Date Konvertierung).

## [2.9.1] - 2026-02-10

### Behobene Fehler
- **Undo-Funktionalität für Skill-Bewertungen**: Behebt kritische Fehler in der Rückgängig-Funktion (Strg+Z).
  - Undo für neu erstellte Assessments (z.B. erste Bewertung 0 → 25%) funktionierte nicht - fehlender `case 'assessment'` im create-Block ergänzt.
  - Undo für gelöschte Assessments fehlte ebenfalls - `case 'assessment'` im delete-Block ergänzt.
  - Undo für Soll-Level-Änderungen warf Fehler "keine vorherigen Daten gefunden" - Standard-previousData wird nun erstellt, wenn kein Assessment existiert.
  - Undo für Soll-Level stellte `undefined`-Werte nicht wieder her - vollständige Assessment-Wiederherstellung implementiert, um alle Felder korrekt zurückzusetzen.

## [2.9.0] - 2026-02-10

### Neue Funktionen
- **Änderungshistorie mit Undo**: Vollständiges Tracking aller Änderungen an Stammdaten mit Rückgängig-Funktion.
  - Neuer History-Button in der Navbar (Uhr-Symbol) öffnet einen Drawer mit den letzten 20 Änderungen.
  - Jeder Eintrag zeigt Entity-Typ, Name, Aktion (Erstellt/Geändert/Gelöscht) und Zeitstempel.
  - Detaillierte Beschreibungen: Level-Änderungen (50% → 75%), Namensänderungen, Status-Wechsel, etc.
  - Trend-Icons für Bewertungsänderungen (↗️ erhöht, ↘️ gesenkt).
  - Undo-Button pro Eintrag stellt den vorherigen Zustand wieder her.
- **Tastenkürzel Strg+Z**: Macht die letzte Änderung rückgängig (funktioniert nur außerhalb von Textfeldern, um Browser-Undo nicht zu blockieren).
- **Kaskaden-Undo**: Beim Löschen von Kategorien, Unterkategorien, Skills oder Mitarbeitern werden alle Unterelemente (Skills, Bewertungen, Pläne, Maßnahmen) gespeichert und beim Undo vollständig wiederhergestellt.
  - Anzeige im History-Drawer: "inkl. 3 Unterkategorien, 12 Skills" etc.

### Technische Details
- Neue IndexedDB-Store `changeHistory` (DB Version 12) für persistente Speicherung.
- Unterstützte Entity-Typen: Employee, Skill, Category, SubCategory, Department, Role, QualificationPlan, QualificationMeasure, Assessment.

## [2.8.1] - 2026-02-09

### Neue Funktionen & Verbesserungen
- **Mitarbeiter-Deaktivierung (Wissensverlust-Prävention)**: Mitarbeiter können nun als "Inaktiv" markiert werden (z.B. bei Austritt, Ruhestand oder Sabbatical).
  - Inaktive Mitarbeiter werden standardmäßig in der Matrix ausgeblendet, können aber über einen neuen Toggle-Button ("Wissensverlust anzeigen") wieder eingeblendet werden.
  - Deaktivierte Profile werden in KPI-Berechnungen (Durchschnitte, XP) ignoriert, um den aktuellen Status nicht zu verfälschen.
  - Im "Mitarbeiter bearbeiten"-Drawer gibt es nun einen eigenen Bereich für "Status & Deaktivierung" mit Datumsfeldern für Deaktivierung und optionale Reaktivierung.
- **Konsistentes Layout**: Alle Drawer (Mitarbeiter, Abteilungen, Rollen, Maßnahmen, etc.) haben nun einheitlich positionierte Aktions-Buttons ("Abbrechen", "Speichern") am unteren Rand des Fensters. Dies verbessert die Bedienbarkeit, da Buttons immer an festen Positionen erreichbar sind, unabhängig von der Scrollposition.

### Wartung
- **Code-Qualität**: Behebung von Linting-Fehlern im `EmployeeDrawer` und allgemeine Code-Bereinigung.

## [2.8.0] - 2026-02-08

### Neue Funktionen & Verbesserungen
- **Organigramm-Priorisierung**: Im Manager ist nun standardmäßig die Organigramm-Ansicht aktiv, um die Struktur besser zu visualisieren.
- **Erweitertes Copy & Paste**: Im Organigramm können nun Unterkategorien in andere Unterkategorien kopiert oder verschoben werden (Verschachtelung).
- **Navigation**: Verbesserte Integration zwischen Skill Matrix und Qualifizierungsplan. Die Mitarbeiterauswahl bleibt nun auch beim Wechsel zwischen den Ansichten oder beim Neuladen der Parameter stabil erhalten.

### Behobene Fehler
- **Auswahl-Verlust**: Ein Fehler wurde behoben, bei dem die Vorselektion eines Mitarbeiters im Qualifizierungsplan verloren ging, wenn die Navigation durch interne Updates bereinigt wurde.

## [2.7.2] - 2026-02-07

### Behobene Fehler
- **Kategorie-Aggregation**: Hauptkategorien (z.B. IBV) zeigten "N/A" an, obwohl verschachtelte Unterkategorien (z.B. Cognex → 3D Scanner) gültige Werte hatten. Die Berechnung berücksichtigt nun rekursiv alle Skills aus beliebig tief verschachtelten Unterkategorien.
  - Betrifft: Kategorie-Prozentanzeige, Masseneinstellung von Skill-Levels auf Kategorieebene.

## [2.7.1] - 2026-02-07

### Verbesserungen & UI
- **Modern UI Dialogs**: Alle nativen Browser-Dialoge (`alert`, `confirm`) wurden durch integrierte Mantine Modals und Notifications ersetzt. Dies sorgt für ein einheitliches und modernes Design in der gesamten Anwendung.
  - Betrifft: Mitarbeiter löschen/erstellen, Daten-Import/Export/Reset, Kategorien-Verwaltung, Qualifizierungspläne.

### Wartung
- **Dependencies**: Aktualisierung aller Mantine-Pakete auf die neueste Version zur Behebung von Konflikten bei Peer-Dependencies.

## [2.7.0] - 2026-02-07

### Neue Funktionen
- **Ungespeicherte Änderungen**: Sicherheitsmechanismus implementiert, der vor Datenverlust warnt, wenn Drawer (Mitarbeiter, Pläne, Maßnahmen, etc.) mit ungespeicherten Änderungen geschlossen werden.
- **Leere Spalten ausblenden (Skill Matrix)**: Neuer Toggle-Button in der Toolbar erlaubt das Ausblenden von Skills, die für die aktuell angezeigten Mitarbeiter keine Daten (N/A) enthalten.
  - Dies wirkt rekursiv auf Kategorien und Unterkategorien.
  - Die Einstellung wird in Gespeicherten Ansichten persistiert.

### Verbesserungen & UI
- **Optimierte Spaltenbreite**: Die "Kategorie / Skill" Spalte wurde überarbeitet, um weniger Leerraum zu verschwenden und sich kompakter darzustellen.
- **Rollen-Icons**: Die Ausrichtung der Rollen-Icons im Matrix-Header wurde korrigiert (waren zuvor um 180° verdreht).

### Behobene Fehler
- **Datenbank-Initialisierung**: Ein Fehler ("Database not initialized") beim Speichern von Ansichten wurde behoben, indem eine robustere Verbindungslogik (Lazy Initialization) implementiert wurde.

## [2.6.7] - 2026-02-07

### Verbesserungen & UI
- **Dynamische Spaltenbreite**: Die erste Spalte ("Struktur / Team") passt sich nun automatisch an die Länge der Inhalte (Kategorien, Unterkategorien, Skills) sowie deren Einrückung an.
  - Minimale Breite: 260px
  - Maximale Breite: 600px
  - Die Breite reagiert dynamisch auf das Ein- und Ausklappen von Kategorien.
- **Unendliche Verschachtelung**: Es sind nun beliebig tiefe Unterkategorien möglich (Unterkategorie in Unterkategorie, etc.), die in der Matrix und im Manager korrekt dargestellt werden.
- **Rekursives Einklappen**: Beim Einklappen einer Unterkategorie werden nun auch alle darin enthaltenen (rekursiven) Unterkategorien visuell ausgeblendet.

## [2.6.6] - 2026-02-05

### Verbesserungen & UI
- **Gruppen-Sortierung**: Die Sortierrichtung der Gruppen (Abteilungen/Rollen) folgt nun der gewählten Mitarbeiter-Sortierung (A-Z / Z-A).
- **Gruppen-Header**:
  - Der Gruppenname steht nun alleinstehend (ohne "Ø").
  - Aggregierte Metriken (Durchschnitt % oder Max XP) werden als separater Badge dargestellt.
  - Respektiert nun den globalen Toggle für Durchschnitt/Maximum.
- **Dark Mode**: Optimierte Darstellung von "N/A"-Badges in Kategoriereihen (Outline-Stil) für bessere Lesbarkeit.

### Behobene Fehler
- **N/A Logik**: Explizit gesetzte "N/A"-Werte (Level -1) werden nun korrekt von Rollenanforderungen überschrieben (erscheinen als 0% Gap).
- **Max-Werte**: Bei der Anzeige von Maximalwerten in Kategorien wird nun korrekt "N/A" statt "0%" angezeigt, wenn keine Daten vorliegen.

---

## [2.6.5] - 2026-02-05

### Neue Funktionen
- **Organigramm-Editor**: Einführung einer Clipboard-Funktion (Ausschneiden, Kopieren, Einfügen) im Skill-Organigramm.
  - **Kontextmenü**: Über das 3-Punkte-Menü an jeder Karte erreichbar.
  - **Ausschneiden & Verschieben**: Skills können nun einfach zwischen Unterkategorien verschoben werden.
  - **Kopieren**: Skills und ganze Unterkategorien können dupliziert werden.
  - **Deep Copy**: Beim Kopieren einer Unterkategorie werden alle enthaltenen Skills automatisch mitkopiert.
  - **Visuelles Feedback**: Farbliche Indikatoren zeigen den aktuellen Clipboard-Status an (Ausschneiden vs. Kopieren).

---

## [2.6.4] - 2026-02-05

### Refactoring & Code Quality
- **Performance**: Optimierung der Qualifizierungsplan-Ansicht durch Memoization und Component Splitting.
- **Wartbarkeit**:
  - `PlanCard`: Extrahiert in eigenständige Komponente.
  - `MatrixHeader`: Berechnung von Mitarbeiter-Metriken (XP, Defizite) in `useEmployeeMetrics` Hook zentralisiert.
  - `PlanDetail`: Statistiken und Maßnahmen-Gruppierung in separate Komponenten (`PlanProgressStats`, `SkillMeasureGroup`) ausgelagert.
- **Stabilität**: Allgemeine Code-Bereinigung und Typisierungs-Verbesserungen.

---

## [2.6.3] - 2026-02-05

### Neue Funktionen
- **Startseite**: Die "Skill Matrix" ist nun die Standard-Startseite der Anwendung.
- **Kontextmenü in der Matrix**: Das "Bearbeiten"-Icon im Mitarbeiter-Hover wurde durch ein erweitertes Drei-Punkte-Menü ersetzt.
  - Zugriff auf "Mitarbeiter bearbeiten" und "Qualifizierungsplan".
  - Der Eintrag "Qualifizierungsplan" ist intelligent deaktiviert, wenn keine Defizite oder aktiven Pläne vorliegen.
- **Qualifizierungs-Ketten**: Maßnahmen können nun als Ketten angelegt werden (z.B. 0-50% -> 50-80%).
  - Neuer Range-Slider im Formular erlaubt Definition von Start- und Ziel-Level.
  - Automatische Vorschläge für den Start-Level basierend auf bestehenden Maßnahmen.
- **Plan-Visualisierung**: Maßnahmen im Qualifizierungsplan sind nun übersichtlich nach Skills gruppiert und sortiert.
- **Schnell-Aktionen**: Neuer "+" Button in den Skill-Gruppen erlaubt das direkte Hinzufügen von Folgemaßnahmen.

### Verbesserungen & Fixes
- **Navigation**: Nahtloser Wechsel von der Skill Matrix zum Qualifizierungsplan (öffnet automatisch den passenden Plan oder das Erstellungs-Fenster).
- **Bereinigung**: Fehler behoben, bei dem sich der Plan-Drawer nach Navigation beim Tab-Wechsel ungewollt wieder öffnete.
- **Filterung**: Im "Neue Maßnahme"-Dialog werden Skills ausgeblendet, die bereits vollständig verplant sind.

---

## [2.6.2] - 2026-02-05

### Neue Funktionen
- **Verbesserter Zeitplanungs-Picker**: Überarbeitete Datumsauswahl mit visuellem Range-Picker für Start- und Zieldatum.
- **Belegungsanzeige**: Bereits belegte Zeiträume anderer Maßnahmen werden im Kalender rot markiert zur besseren Planung.
- **Zeitraum-Badge**: Anzeige des gewählten Zeitraums als Badge über dem Datumsbereich.

### Geändert
- **Datepicker-Komponente**: Migration von einzelnen DateInput-Feldern zu DatePicker mit Range-Auswahl für intuitivere Bedienung.
- **Datenkontext**: Verwendung von `qualificationMeasures` und `qualificationPlans` statt `getQualificationMeasuresForPlan` für bessere Datenfluss-Kontrolle.

---

## [2.6.1] - 2026-02-05

### Neue Funktionen
- **Mehrfachrollen**: Mitarbeiter können nun mehrere Rollen gleichzeitig innehaben. Die höchste Skill-Anforderung aller Rollen wird als Soll-Wert verwendet.
- **Rollen-Icons**: In der Matrix werden hinter den Mitarbeiternamen kleine Icons der zugewiesenen Rollen angezeigt (max. 3, mit Tooltip).
- **Verbesserte Sortierung**: Kategorien, Unterkategorien und Skills werden standardmäßig alphabetisch sortiert. Bei aktiver Wert-Sortierung werden auch Skills innerhalb ihrer Gruppen sortiert.
- **Speichern mit Enter**: Im Drawer für Kategorien/Unterkategorien/Skills kann nun mit Enter gespeichert werden.

### Geändert
- **Toolbar-Styling**: Die Farben der Icon-Buttons in der Matrix-Toolbar sind nun dezenter (light statt filled).

### Behobene Fehler
- **Ansicht löschen**: Beim Löschen der aktiven Ansicht wird nun automatisch zur Standardansicht gewechselt.
- **Aggregation ohne Skills**: Kategorien und Unterkategorien ohne Skills zeigen nun "N/A" statt "0%" an.

---

## [2.6.0] - 2026-02-04

### Neue Funktionen
- **Gespeicherte Ansichten**: Neue Funktion zum Speichern und Wiederherstellen von Matrix-Konfigurationen (Filter, Gruppierung, Sortierung, eingeklappte Kategorien).
  - Ansichten werden als Tabs über der Matrix angezeigt
  - "Neue Ansicht +" Button zum Erstellen neuer Ansichten
  - Kontextmenü zum Umbenennen, Löschen und Speichern von Änderungen
  - Änderungsindikator (*) zeigt ungespeicherte Änderungen an
  - Aktive Ansicht bleibt nach Seitenwechsel erhalten (LocalStorage)

### Geändert
- **Toolbar**: Separates Speicher-Icon entfernt, da "Neue Ansicht +" Button diese Funktion übernimmt.

### Behobene Fehler
- **Daten-Management**: Fehler behoben, bei dem gespeicherte Ansichten nicht exportiert, importiert oder beim Merge berücksichtigt wurden.

---

## [2.5.0] - 2026-02-04

### Neue Funktionen
- **Toolbar-Reorganisation:** Toolbar-Icons wurden in logische Gruppen unterteilt (Ansicht, Sortierung/Filter, Aktionen) für bessere Übersichtlichkeit.
- **Mitarbeiter-Sichtbarkeit:** Neues "Auge"-Icon zum Ein-/Ausblenden einzelner Mitarbeiterspalten bei Gruppierung nach Abteilung oder Rolle.
- **Maximalwerte-Ansicht:** Bei aktivierter "Maximalwerte anzeigen"-Option zeigen Gruppenspalten nun den höchsten Wert (Skill-Level oder Kategorie-Durchschnitt) der Gruppe statt des Durchschnitts.

### Geändert
- **Styling:** Gruppierungs-Button an das Styling der anderen Toolbar-Icons angepasst (Text-Label entfernt, Standard-Icon-Größe verwendet).
- **Aggregationslogik:** 
    - "Durchschnitt"-Ansicht zeigt weiterhin den arithmetischen Mittelwert der Gruppe.
    - "Maximum"-Ansicht zeigt nun konsistent die Spitzenwerte zur Identifikation von Top-Performern oder maximaler Kapazität.
- **Persistenz:** Ansichtseinstellungen (wie ausgeblendete Mitarbeiter) werden nun im LocalStorage gespeichert.

### Behoben
- Wiederherstellung der "Sortieren"- und "Bearbeiten"-Buttons, die während der Refaktorisierung temporär fehlten.

## [2.4.2] - 2026-02-03

### Neue Funktionen & Verbesserungen
- **Changelog**: Neues Changelog-Fenster hinzugefügt, das durch Klick auf die Versionsnummer oben links geöffnet werden kann. Die Version wird nun automatisch synchronisiert.
- **Skill-Erstellung**: Beim Anlegen eines neuen Skills ist es nun möglich, diesen direkt in weitere Unterkategorien zu kopieren ("Multi-Select").
- **Mitarbeiter-Verwaltung**: Es wurde eine Prüfung eingeführt, die verhindert, dass Mitarbeiter mit identischen Namen angelegt werden können.
- **Qualifizierungsplan**: 
    - Neuer Maßnahmentyp "Selbststudium / Erfahrung" hinzugefügt.
    - Ziel-Level für Maßnahmen kann nun individuell per Schieberegler eingestellt werden (nicht nur strikt nach Skill-Gap).
    - Es können nun mehrere Maßnahmen pro Skill angelegt werden, um einen stufenweisen Aufbau abzubilden.
    - Logik für Standard-Skill-Level verbessert (neue Mitarbeiter starten bei Bedarf mit n/a oder 0%).

### Behobene Fehler (Bugfixes)
- **Dashboard**: Die Berechnung der "Globalen Expertise" wurde korrigiert (Level 0 wird nun korrekt in den Durchschnitt einbezogen).
- **Skill-Matrix**: Der blaue "Leucht"-Effekt beim Indikator für aktive Maßnahmen wurde entfernt (jetzt ein schlichter Punkt).
- **Absturz behoben**: Ein Fehler beim Mehrfachauswahl-Feld (MultiSelect) für Kategorien wurde behoben, der zum Absturz der Anwendung führen konnte.

## [2.4.1] - 2026-02-03

### Behobene Fehler
- **Vererbte Ziele**: Anforderungen an Rollen, die von anderen Rollen erben (z.B. Senior erbt von Junior), werden nun korrekt in der Skill-Matrix angezeigt. Auch ein Fehler bei der Suche nach Rollennamen wurde behoben.
- **Doppelter Download**: Ein Fehler wurde behoben, bei dem der Datenexport den Download zweimal startete.
- **Export-Dateiname**: Der Dateiname beim Export enthält nun den Projekttitel und das Datum (z.B. `Projektname_Backup_DATUM.json`).
- **Tooltips**: In der Skill-Matrix wurden Tooltips zu den Ziel-Indikatoren hinzugefügt, um die Bedeutung (individuelles vs. Rollenziel) besser zu erklären.
