# SkillGrid Manage — Changelog

## [1.4.0] - 2026-08-18

### Behobene Fehler
- **Rückgängig nach Merge**: Katalog-Merge in der Timeline setzte den Eintrag nur auf „Rückgängig“, ohne Inhalte zurückzunehmen. Undo stellt den gespeicherten Katalog-Stand wieder her.
- **Rollback ohne Version**: Im Ungesichert-Hover gibt es Rollback auch ohne freigegebene Version — der Katalog wird geleert.
- **Version freigeben**: Aus dem Ungesichert-Hover öffnet sich das Freigabe-Popup auf jeder Seite.
- **Schnellbackup-Punkt**: Nach dem Disketten-Backup verschwindet der rote Indikator wieder (ungesicherte Katalog-Version bleibt über die orange Badge sichtbar).
- **Tags für ungesicherte Einträge**: Neu (grün) und Geändert (blau) an Kategorien, Bereichen, Skills und Rollen.
- **Notizen an Änderungen**: Direkt am Tag kurze Release-Notizen sammeln; beim Freigeben werden sie in den Releasetext übernommen.
- **Zentrale Notizen + Aufräumen**: Nach Release/Rollback keine hängenden Neu-Tags mehr. Notizen werden beim Rollback gelöscht und sind unter Versionen zentral editierbar.

### Neue Funktionen
- **Import in Skills & Rollen**: Direkt in Kategorien/Skills und in Rollen können externe Dateien oder eingefügter Text als Merge bzw. Vorschläge übernommen werden (Auswahl, keine stillen Überschreibungen).
- **Rollen exportieren**: Markdown, Textbaum und vollständiges JSON analog zum Skills-Export.

## [1.2.0] - 2026-08-07

### Neue Funktionen
- **SkillGrid Manage** als eigenständige Katalog-App im Monorepo (Source of Truth für Skills, Kategorien, Rollen).
- **SemVer-Releases**: Katalog freigeben, Archiv (max. 10), Diff und Rollback.
- **Ungesichert-Badge** im Header bei Abweichungen vom letzten freigegebenen Stand; Publish-Hinweis.
- **Skills-Übersichten**: Liste, Baum, Organigramm, Tabelle, Rollen-Matrix.
- **Global-Backup** der Manage-Datenbank (export/import) auf der System-Seite.
- **Leer-Onboarding** für neuen Katalog (Skills starten oder Import).
- **Demo-Katalog** optional generierbar (Entwicklung/Demo).

### Hinweise
- App-Version (`APP x.x.x`) ≠ Katalog-Release-Version (`Katalog v…`).
- Team und Full importieren freigegebene Katalog-Pakete aus Manage.
- Changelog dieser Datei gilt nur für die Manage-App (`apps/manage/package.json`).
