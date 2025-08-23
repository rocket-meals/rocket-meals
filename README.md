<div align="center">
  <img src="assets/icon.png" alt="Rocket Meals icon" width="120" />
</div>

[![CI](https://github.com/rocket-meals/rocket-meals/actions/workflows/combined-ci.yml/badge.svg)](https://github.com/rocket-meals/rocket-meals/actions/workflows/combined-ci.yml)
[![Screenshots CI](https://github.com/rocket-meals/rocket-meals/actions/workflows/frontend_screenshot.yml/badge.svg)](https://github.com/rocket-meals/rocket-meals/actions/workflows/frontend_screenshot.yml)

# 🚀 Rocket Meals

**Rocket Meals** ist eine innovative Lösung zur digitalen Verwaltung und Präsentation von
Speiseplänen für Mensen, Kantinen und gastronomische Einrichtungen.  
Mit einem modernen Technologie-Stack ermöglicht Rocket Meals eine effiziente und benutzerfreundliche
Darstellung von Menüs, die sowohl für Betreiber als auch für Gäste von Vorteil ist.

## 🧩 Features

- **Digitale Speiseplanverwaltung**: Erfasse und verwalte Menüs zentralisiert.
- **Benutzerfreundliche Oberfläche**: Intuitive UI für einfache Navigation.
- **Mobile App**: Zugriff auf Speisepläne von unterwegs.
- **Anpassbares Design**: Passe das Erscheinungsbild an dein Branding an.
- **Mehrsprachigkeit**: Unterstützung für mehrere Sprachen zur besseren Zugänglichkeit.

## 🛠️ Technologie-Stack

- **Frontend**: React Native mit Expo für plattformübergreifende mobile Anwendungen
- **Backend**: Directus als Headless CMS für flexible Datenverwaltung
- **Datenbank**: PostgreSQL für zuverlässige Datenhaltung
- **Hosting**: Deployment auf Vercel für schnelle und sichere Bereitstellung

## 🚀 Schnellstart

### Voraussetzungen

- Node.js (Version 14 oder höher)
- npm oder yarn
- Expo CLI
- Zugang zu einer PostgreSQL-Datenbank

### Installation

```bash
git clone https://github.com/dein-benutzername/rocket-meals.git
cd rocket-meals
npm install
# oder
yarn install
```

### Backend Auto-Sync Konfiguration

Das Backend unterstützt automatische Collection-Synchronisation während des Starts. Diese Funktion ermöglicht nahtlose Deployments ohne manuelle Schema-Synchronisation.

#### Setup-Modi konfigurieren

```bash
# Automatisches Setup verwenden
./setup-auto-sync.sh
```

**Verfügbare Modi:**
- `disabled` - Keine automatische Synchronisation (Standard)
- `test` - Test-Umgebung mit begrenzter Synchronisation  
- `full` - Vollständige Synchronisation für Produktionsumgebungen

#### Manuelle Konfiguration

In der `.env` Datei:
```bash
BACKEND_AUTO_SYNC_MODE="full"  # oder "test" oder "disabled"
```

**Weitere Informationen:** Siehe [`apps/backend/BACKEND_AUTO_SYNC_SETUP.md`](apps/backend/BACKEND_AUTO_SYNC_SETUP.md)
