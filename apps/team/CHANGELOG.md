# SkillGrid Team — Changelog

## [1.0.0] - 2026-08-07

### Neue Funktionen
- **SkillGrid Team** als eigenständige Ops-App im Monorepo (getrennt von Full und Manage).
- **Katalog-Import** aus SkillGrid Manage (Release-JSON): Skills, Kategorien und Rollen laden, ohne Katalog-Authoring.
- **Skill-Matrix** für Bewertungen und Zielniveaus auf Basis des importierten Katalogs.
- **Mitarbeiter, Abteilungen, Qualifizierungspläne** und Dashboard für den operativen Alltag.
- **Vollbackup** exportieren und wiederherstellen/mergen (Disaster Recovery der Team-Datenbank).
- **Leere Matrix**: Hinweis und CTA zum Katalog laden; Matrix bleibt nutzbar, solange Mitarbeiter angelegt werden.

### Hinweise
- Skills und Kategorien werden **nicht** in Team erstellt oder bearbeitet — Source of Truth ist SkillGrid Manage.
- App-Version siehe `apps/team/package.json` (Badge in der Sidebar: `APP x.x.x`).
