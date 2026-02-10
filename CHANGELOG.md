# Changelog


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
