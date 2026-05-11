<div align="center">
  <img src="assets/icon.png" alt="Rocket Meals icon" width="120" />
</div>

[![🚀 CI](https://github.com/rocket-meals/rocket-meals/actions/workflows/ci.yml/badge.svg)](https://github.com/rocket-meals/rocket-meals/actions/workflows/ci.yml)
[![Screenshots CI](https://github.com/rocket-meals/rocket-meals/actions/workflows/frontend_screenshot.yml/badge.svg)](https://github.com/rocket-meals/rocket-meals/actions/workflows/frontend_screenshot.yml)

[![Maintainability Rating](https://sonarcloud.io/api/project_badges/measure?project=rocket-meals_rocket-meals&metric=sqale_rating)](https://sonarcloud.io/summary/new_code?id=rocket-meals_rocket-meals)
[![Technical Debt](https://sonarcloud.io/api/project_badges/measure?project=rocket-meals_rocket-meals&metric=sqale_index)](https://sonarcloud.io/summary/new_code?id=rocket-meals_rocket-meals)
[![Security Rating](https://sonarcloud.io/api/project_badges/measure?project=rocket-meals_rocket-meals&metric=security_rating)](https://sonarcloud.io/summary/new_code?id=rocket-meals_rocket-meals)
[![Bugs](https://sonarcloud.io/api/project_badges/measure?project=rocket-meals_rocket-meals&metric=bugs)](https://sonarcloud.io/summary/new_code?id=rocket-meals_rocket-meals)
[![Code Smells](https://sonarcloud.io/api/project_badges/measure?project=rocket-meals_rocket-meals&metric=code_smells)](https://sonarcloud.io/summary/new_code?id=rocket-meals_rocket-meals)
[![Data Clumps](https://raw.githubusercontent.com/rocket-meals/rocket-meals/refs/heads/master/reports/data-clumps-doctor/badges/data-clumps.svg)](https://github.com/NilsBaumgartner1994/data-clumps-doctor)

https://github.com/rocket-meals/rocket-meals

https://github.com/rocket-meals/swosy

https://github.com/rocket-meals/studi-futter

# 🚀 Rocket Meals

**Rocket Meals** ist eine innovative Lösung zur digitalen Verwaltung und Präsentation von
Speiseplänen für Mensen, Kantinen und gastronomische Einrichtungen.  
Mit einem modernen Technologie-Stack ermöglicht Rocket Meals eine effiziente und benutzerfreundliche
Darstellung von Menüs, die sowohl für Betreiber als auch für Gäste von Vorteil ist.

## 📖 API-Dokumentation

Eine vollständige Dokumentation der Directus REST-API-Endpunkte für den Speiseplan (Mensen, Speiseangebote, Allergene, Übersetzungen) ist hier verfügbar:

👉 [Speiseplan API-Dokumentation](apps/frontend/app/redux/actions/FoodOffers/API_DOCUMENTATION.md)

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

- Node.js (Version 18 oder höher) und Yarn
- npm oder yarn
- Expo CLI
- Docker

### Installation

```bash
git clone https://github.com/dein-benutzername/rocket-meals.git
cd rocket-meals
yarn install
```

## ⏰ Update und Env-Generierung

Das Skript `scripts/update-and-generate-env.sh` führt folgende Schritte aus:

1. `docker compose down`
2. `git fetch` + `git reset --hard`
3. `git pull` im `rocket-meals-envs`-Repository (holt den aktuellsten Stand)
4. `.env` aus dem `rocket-meals-envs`-Repository generieren
5. `docker compose build`
6. `docker compose up -d`

### Voraussetzung

Das Repository `rocket-meals-envs` muss im übergeordneten Ordner liegen (`../rocket-meals-envs`).

### Verfügbare Umgebungen

- `studi-futter`
- `swosy`
- `test`

### 1) Skript manuell ausführen

```bash
./scripts/update-and-generate-env.sh swosy
```

### 2) Cronjob automatisch erstellen/aktualisieren

Nutze dafür das zusätzliche Skript:

```bash
./scripts/setup-weekly-update-cron.sh
```

Das Skript:

- legt den Cronjob an, falls er noch nicht existiert,
- ersetzt den vorhandenen Rocket-Meals-Job, falls er schon existiert,
- erstellt automatisch den Log-Ordner für die Logdatei.

Standardmäßig wird folgender Zeitplan gesetzt (Samstag 20:00 Uhr):

```cron
0 20 * * 6
```

Optional kannst du Zeitplan/Logpfad überschreiben:

```bash
CRON_SCHEDULE="30 21 * * 6" CRON_LOG_FILE="/workspace/rocket-meals/logs/update-and-generate-env.log" ./scripts/setup-weekly-update-cron.sh
```
