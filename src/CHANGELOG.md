# Changelog

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
