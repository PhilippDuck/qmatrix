# Q-Matrix

Eine moderne Skill-Matrix-Anwendung zur Verwaltung und Visualisierung von Mitarbeiter-Kompetenzen.

![Version](https://img.shields.io/badge/version-2.1.0-blue)
![React](https://img.shields.io/badge/React-19-61DAFB?logo=react)
![Mantine](https://img.shields.io/badge/Mantine-7-339AF0)
![Vite](https://img.shields.io/badge/Vite-7-646CFF?logo=vite)

## ✨ Features

### 📊 Dashboard
- Globale KPIs mit Trend-Vergleich (Quartal/Jahr)
- Skill-Verbesserungen aggregiert nach Zeitraum
- Skill-Abdeckung & Risiko-Analyse (Low Coverage)
- Skill-Level Verteilung Histogramm
- Zielerfüllung und offene Lernziele
- Abteilungs-Fortschritt
- Kategorie-Performance-Metriken

### 🛡️ Datenschutz & Privacy
- **Anonymous Mode**: Namen können per Klick verschleiert werden
- Pseudonymisierung für Präsentationen vor abteilungsfremden Personen
- Lokale Datenspeicherung (IndexedDB) - Daten verlassen nie den Browser
- Keine Cloud-Anbindung, kein Tracking

### 🎯 Skill-Matrix
- Interaktive Matrix-Ansicht aller Mitarbeiter und Skills
- Hover-Cards mit detaillierten Mitarbeiter-Informationen
- KPIs: Expertise, Vielseitigkeit, Volumen (XP), Zielerfüllung
- Lernbedarf-Anzeige für Skills unter Zielniveau
- Skill-Verlauf und Historie

### 👥 Stammdaten
- Mitarbeiter-Verwaltung mit Abteilung und Rolle
- Kategorien und Unterkategorien für Skills
- Skill-Definitionen mit Rollen-Zuordnung
- Abteilungs-Management

### 🏢 Rollen-Management
- Rollen mit anpassbaren Icons
- Vererbungs-Hierarchie zwischen Rollen
- Organigramm-Visualisierung
- Skill-Zuordnung pro Rolle
- Mitarbeiter-Übersicht pro Rolle

### 💾 Daten-Management
- Lokale IndexedDB Speicherung (keine Server erforderlich)
- Export/Import als JSON mit Zeitstempel im Dateinamen
- **Intelligente Merge-Funktion**: Vergleich von Backups mit der aktuellen Datenbank inkl. Historie
- **Daten-Fingerprint (Hash)**: Eindeutiger Code zur Überprüfung des Synchronisationsstandes
- **Vollständiger Reset**: Tiefenbereinigung der gesamten Datenbank inklusive Historie

## 🚀 Installation

```bash
# Repository klonen
git clone https://github.com/PhilippDuck/qmatrix.git

# In das Verzeichnis wechseln
cd qmatrix

# Abhängigkeiten installieren
npm install

# Entwicklungsserver starten
npm run dev

# Für Produktion bauen
npm run build
```

## 🛠️ Technologie-Stack

- **Frontend**: React 19 mit Vite
- **UI-Bibliothek**: Mantine 7
- **Icons**: Tabler Icons
- **Charts**: react-organizational-chart
- **Speicherung**: IndexedDB (browser-basiert)
- **Styling**: CSS Variablen mit Dark/Light Mode

## 📁 Projektstruktur

```
src/
├── components/
│   ├── Dashboard/          # Dashboard mit globalen KPIs
│   ├── SkillMatrix/        # Matrix-Komponenten
│   ├── organization/       # Rollen & Organigramm
│   ├── shared/             # Wiederverwendbare Komponenten
│   └── ...
├── context/
│   └── DataContext.tsx     # Globaler Datenzustand
├── services/
│   └── indexeddb.ts        # Datenbank-Service
├── utils/
│   └── skillCalculations.ts # Berechnungsfunktionen
└── App.jsx                 # Hauptanwendung
```

## 📋 Roadmap

- [ ] PDF-Export von Berichten
- [ ] Team-Ansicht
- [ ] Zertifikats-Tracking
- [ ] Skill-Empfehlungen basierend auf Rolle
- [ ] Multi-User Support

## 📄 Lizenz

MIT License - siehe [LICENSE](LICENSE) für Details.

---

<p align="center">
  Designed with ❤️ by <strong>Philipp-Marcel Duck</strong>
</p>
