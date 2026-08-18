# Manuelle Testliste: Manage · Team · Kombination

Kurzformat: **Was** → **Erwartung**.  
Stand: Feature-Branch monorepo Full / Manage / Team.

---

## A) SkillGrid Manage allein

### A1 Start & Shell

| # | Test | Erwartung |
|---|------|-----------|
| M1 | App frisch öffnen (leere DB) | Onboarding: Skills starten / Import; kein Team-Welcome |
| M2 | Sidebar aufgeklappt | Nav: Skills, Rollen, Versionen, System; unten „Designed with ♥…“ + **APP x.x.x** |
| M3 | Sidebar einklappen | Kurze Version + Tooltip; Layout ok |
| M4 | Klick auf **APP x.x.x** | Changelog **Manage** (nicht Full 2.x), Titel „SkillGrid Manage“ |
| M5 | Header | **Katalog v…** oder **Katalog —**; ggf. **ungesichert** |
| M6 | Dark/Light | Theme stabil, Lesbarkeit Header/Badges |

### A2 Katalog pflegen (Authoring)

| # | Test | Erwartung |
|---|------|-----------|
| M7 | Kategorie / Unterbereich / Skill anlegen | Speichern, in Liste/Baum sichtbar |
| M8 | Skill bearbeiten / löschen | Änderung + History (Undo) wo vorgesehen |
| M9 | Rolle anlegen, Skills zuordnen | Rollen-UI, Vererbung falls genutzt |
| M10 | Views: Liste, Baum, Organigramm, Tabelle, Rollen-Matrix | Navigation ok; Edit nur mit Authoring |
| M11 | Katalogname im Header ändern | SoT-Name; speichert |

### A3 Versionen & Releases

| # | Test | Erwartung |
|---|------|-----------|
| M12 | Erste **Freigabe** (SemVer) | Release erscheint; Header **Katalog vX.Y.Z**; ungesichert weg |
| M13 | Skill ändern ohne Publish | Badge **ungesichert** |
| M14 | Erneut freigeben (PATCH/MINOR) | Neue Version; Archiv wächst |
| M15 | Release **exportieren** (JSON) | Datei speicherbar; Format `skillgrid-catalog` |
| M16 | Diff / Rollback (falls UI) | Zurück auf ältere Version; Live-Stand stimmig |
| M17 | Max. Archiv (10) | Ältere Einträge fallen weg / Regel greift |

### A4 System / Backup Manage

| # | Test | Erwartung |
|---|------|-----------|
| M18 | Global-Backup export | JSON mit Katalog + Releases |
| M19 | Global-Backup import/restore | Stand wiederhergestellt |
| M20 | Demo-Katalog (falls sichtbar) | Füllt Daten; Publish-Flow noch nutzbar |
| M21 | Danger Zone Katalog-Reset | Leerzustand / Onboarding wieder möglich |

---

## B) SkillGrid Team allein

### B1 Start & Shell

| # | Test | Erwartung |
|---|------|-----------|
| T1 | Frisch öffnen (leere DB) | **Kein** Welcome-Modal; Matrix-Empty mit **Katalog laden** |
| T2 | Sidebar | Dashboard, Matrix, Quali, Stammdaten, System; Credit + **APP x.x.x** |
| T3 | **APP x.x.x** klicken | Changelog **Team** (1.x), nicht Full |
| T4 | Header | **Kein** Katalog-Badge (nur Titel + Privacy etc.) |
| T5 | Kein Bearbeiten-Modus / kein „Skill erstellen“ in Matrix-Toolbar | Nur Mitarbeiter hinzufügen |

### B2 Ohne Katalog

| # | Test | Erwartung |
|---|------|-----------|
| T6 | Nur Mitarbeiter anlegen | Matrix **bleibt**; Banner „Skill-Katalog fehlt“ + Katalog laden |
| T7 | Badge auf Matrix-Titel | **Katalog —** |
| T8 | Matrix: kein Skill erstellen (Toolbar, Kontextmenü) | Create-UI fehlt; Mitarbeiter anlegen bleibt |

### B3 Mit Katalog (Import in Team)

| # | Test | Erwartung |
|---|------|-----------|
| T9 | Manage-Release-JSON importieren (Empty / Banner / System) | Skills/Kategorien/Rollen da; **Katalog vX.Y.Z** |
| T10 | Matrix | Zeilen = Katalog-Skills; Spalten = Mitarbeiter |
| T11 | Bewertung setzen / Zielniveau | Speichert, bleibt nach Reload |
| T12 | Filter, Views, Gruppierung | Wie gewohnt |
| T13 | Stammdaten: Skills | Offizielle Einträge lesbar; **Blaupause** anlegen möglich |
| T14 | Rollen | Offizielle Rollen lesbar; **Blaupause hinzufügen** möglich |
| T14b | Blaupause anlegen | Tag „Blaupause“ + Hinweis; **nicht** in der Matrix |
| T14c | Blaupausen exportieren | JSON `skillgrid-team-blueprint-v1`; in Manage als Merge-Vorschlag importierbar |
| T14d | Katalog-Reimport nach Übernahme in Manage | Passende Blaupausen verschwinden |

### B4 Ops-Daten

| # | Test | Erwartung |
|---|------|-----------|
| T15 | Abteilungen, Mitarbeiter, Rollen-Zuordnung MA | CRUD Mitarbeiter/Abteilungen ok |
| T16 | Qualifizierungspläne | Anlegen/bearbeiten auf Basis Skills |
| T17 | Dashboard | Kennzahlen; **Katalog v…** am Titel |
| T18 | System: Full-Backup export | Team-DB (MA, Assessments, Katalog-Stand) |
| T19 | Full-Backup restore/merge | Daten wieder da; Katalog-Version plausibel |
| T20 | Katalog erneut importieren (neuere Manage-Version) | Update Soft-Deprecate; Version-Badge aktualisiert; MA/Assessments möglichst erhalten |

---

## C) Kombination Manage ↔ Team (Kern)

### C1 Happy Path

| # | Test | Schritte | Erwartung |
|---|------|----------|-----------|
| C1 | End-to-End | Manage: Katalog bauen → freigeben → JSON export → Team: import | Team zeigt gleiche Skills/Rollen; **Katalog v = Manage-Release** |
| C2 | Zweite Version | Manage: Skill ändern → freigeben v+1 → Team re-import | Neue Skills/Texte in Team; alte Bewertungen wo IDs gleich bleiben |
| C3 | Nur Inhalt Team | Team: MA + Assessments; Manage: unrelated | Getrennte DBs; kein Überschreiben der jeweils anderen App |

### C2 Versions-Konsistenz

| # | Test | Erwartung |
|---|------|-----------|
| C4 | Team-Badge vs. Manage-Header nach Import | Team **Katalog v1.2.0** = Manage freigegebene v1.2.0 |
| C5 | Manage ungesichert, Team noch alt | Team behält alte Version bis Re-Import |
| C6 | Export aus Manage „ungesichert“ vs. Release | Team nur freigegebenes Package nutzen; Content-only Export kennzeichnen |

### C3 Negativ / Kanten

| # | Test | Erwartung |
|---|------|-----------|
| C7 | Kaputte/fremde JSON in Team | Fehlerhinweis, kein Partial-Schrott |
| C8 | Ältere Katalog-Version auf neuere (Downgrade) | Policy: erlaubt wie konfiguriert (`allowDowngrade`) oder klare Ablehnung |
| C9 | Team-Backup mit Katalog A, dann Katalog B import | Letzter Import gewinnt; MA bleiben wenn soft |
| C10 | Manage Rollback, Team nicht re-import | Team absichtlich „hinten“; Badge zeigt alte v |

### C4 Rollen & Matrix

| # | Test | Erwartung |
|---|------|-----------|
| C11 | Rolle + required skills in Manage → Team Import | Soll-Werte/Matrix-Targets stimmig |
| C12 | Rolle in Manage umbenannt → Re-Import | Name in Team aktualisiert; Verknüpfungen ok |

---

## D) Kurz-Smoke (15 Min)

1. **Manage:** 2 Kategorien, 3 Skills, 1 Rolle → Publish **v1.0.0** → Export  
2. **Team:** Import v1.0.0 → 2 MA → 3 Bewertungen → Badge **Katalog v1.0.0**  
3. **Manage:** Skill +1 → Publish **v1.1.0** → Export  
4. **Team:** Re-Import → neuer Skill sichtbar, alte Bewertungen da, Badge **v1.1.0**  
5. **Team:** Backup export → clear/restore → Stand + Version ok  
6. Changelogs: Manage / Team / Full jeweils **eigene** Historie  

---

## E) Was ihr bewusst *nicht* erwarten solltet

| Thema | Manage | Team |
|--------|--------|------|
| Skills anlegen | ja | nein |
| SemVer freigeben | ja | nein |
| MA / Assessments | nein (typisch) | ja |
| App-Version Badge | `APP` Manage-pkg | `APP` Team-pkg |
| Katalog-Version Header | ja (Live) | **nein** (nur Seiteninhalte: Matrix, Dashboard, …) |

---

## F) Optional Full

| # | Test | Erwartung |
|---|------|-----------|
| F1 | Alles-in-einem: Authoring + Matrix | wie Legacy |
| F2 | Manage-Katalog import in Full | Version-Badge wo eingebaut; MA bleiben |
| F3 | Changelog Full = Repo 2.x | nicht Team/Manage-1.x |

---

## G) Abhaken (optional)

```
Manage:  M1  M2  M3  M4  M5  M6  M7  M8  M9  M10 M11
         M12 M13 M14 M15 M16 M17 M18 M19 M20 M21

Team:    T1  T2  T3  T4  T5  T6  T7  T8  T9  T10
         T11 T12 T13 T14 T15 T16 T17 T18 T19 T20

Combo:   C1  C2  C3  C4  C5  C6  C7  C8  C9  C10 C11 C12

Smoke:   D1–D6
Full:    F1  F2  F3
```
