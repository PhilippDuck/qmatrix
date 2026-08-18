# SkillGrid Team — Changelog

## [1.1.0] - 2026-08-18

### Neue Funktionen
- **Blaupausen**: In Kategorien & Skills sowie Rollen können Vorschläge angelegt werden. Sie sind mit „Blaupause“ markiert und erscheinen nicht in der Matrix, im Dashboard oder in Qualifizierungsplänen.
- **Export nach Manage**: Sobald Blaupausen existieren, können sie als JSON exportiert und in SkillGrid Manage als Merge-Vorschläge importiert werden.
- **Aufräumen nach Katalog-Import**: Wurde ein Vorschlag in Manage übernommen und der Katalog erneut geladen, verschwinden die passenden Blaupausen automatisch.

### Hinweise
- Offizielle Katalog-Einträge aus Manage bleiben schreibgeschützt. Nur Blaupausen lassen sich in Team bearbeiten oder löschen.

## [1.0.0] - 2026-08-07

### Neue Funktionen
- **SkillGrid Team** als eigenständige Ops-App im Monorepo (getrennt von Full und Manage).
- **Katalog-Import** aus SkillGrid Manage (Release-JSON): Skills, Kategorien und Rollen laden, ohne Katalog-Authoring.
- **Skill-Matrix** für Bewertungen und Zielniveaus auf Basis des importierten Katalogs.
- **Mitarbeiter, Abteilungen, Qualifizierungspläne** und Dashboard für den operativen Alltag.
- **Vollbackup** exportieren und wiederherstellen/mergen (Disaster Recovery der Team-Datenbank).
- **Leere Matrix**: Hinweis und CTA zum Katalog laden; Matrix bleibt nutzbar, solange Mitarbeiter angelegt werden.

### Hinweise
- Offizielle Skills und Kategorien aus Manage werden in Team nicht bearbeitet — Source of Truth bleibt SkillGrid Manage. Eigene Vorschläge gehen über Blaupausen (ab 1.1.0).
- App-Version siehe `apps/team/package.json` (Badge in der Sidebar: `APP x.x.x`).
