# Changelog


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
