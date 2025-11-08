<div align="center">
  <img src="assets/icon.png" alt="Rocket Meals icon" width="120" />
</div>

[![🚀 CI](https://github.com/rocket-meals/rocket-meals/actions/workflows/ci.yml/badge.svg)](https://github.com/rocket-meals/rocket-meals/actions/workflows/ci.yml)
[![Screenshots CI](https://github.com/rocket-meals/rocket-meals/actions/workflows/frontend_screenshot.yml/badge.svg)](https://github.com/rocket-meals/rocket-meals/actions/workflows/frontend_screenshot.yml)

[![Maintainability Rating](https://sonarcloud.io/api/project_badges/measure?project=rocket-meals_rocket-meals&metric=sqale_rating)](https://sonarcloud.io/summary/new_code?id=rocket-meals_rocket-meals)
[![Security Rating](https://sonarcloud.io/api/project_badges/measure?project=rocket-meals_rocket-meals&metric=security_rating)](https://sonarcloud.io/summary/new_code?id=rocket-meals_rocket-meals)
[![Bugs](https://sonarcloud.io/api/project_badges/measure?project=rocket-meals_rocket-meals&metric=bugs)](https://sonarcloud.io/summary/new_code?id=rocket-meals_rocket-meals)
[![Code Smells](https://sonarcloud.io/api/project_badges/measure?project=rocket-meals_rocket-meals&metric=code_smells)](https://sonarcloud.io/summary/new_code?id=rocket-meals_rocket-meals)
[![Data Clumps](https://raw.githubusercontent.com/rocket-meals/rocket-meals/refs/heads/master/reports/data-clumps-doctor/badges/data-clumps.svg)](https://github.com/NilsBaumgartner1994/data-clumps-doctor)

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

## 🔁 Automatisches Neustarten des Haupt-Docker-Stacks

Für den regelmäßigen Neustart des Haupt-Docker-Compose-Stacks steht ein zusätzliches Compose-File zur Verfügung: `docker-compose.maintenance.yaml`. Dieses startet einen kleinen Cron-Container, der in dem von dir gewünschten Intervall `docker compose down` und `docker compose up -d` in deinem Projektordner ausführt. Dadurch verhält es sich genauso wie dein manuelles `cd rocket-meals && docker compose up`, sodass die `.env`-Variablen automatisch eingelesen werden. Das Skript akzeptiert dabei auch relative Pfade für `MAIN_COMPOSE_PROJECT_DIR` (ausgehend vom Repository-Verzeichnis), sodass kein absoluter Pfad benötigt wird.

### Nutzung

1. Passe bei Bedarf die Variablen in einer `.env`-Datei an (siehe Tabelle unten) oder übergib sie direkt beim Start.
2. Starte den Wartungs-Stack:
   ```bash
   docker compose -f docker-compose.maintenance.yaml up -d
   ```

### Konfigurierbare Variablen

| Variable                    | Beschreibung                                                                                 | Standardwert                                   |
|-----------------------------|----------------------------------------------------------------------------------------------|------------------------------------------------|
| `CRON_SCHEDULE_DAYS`        | Anzahl der Tage zwischen zwei Neustarts. `0` schaltet in den Minuten-Intervallmodus (siehe unten). | `0`                                            |
| `CRON_SCHEDULE_MINUTES`     | Im Tagesmodus: Minuten nach Mitternacht (0–1439), im Intervallmodus: alle X Minuten.               | `1` (Debug: jede Minute)                       |
| `MAIN_COMPOSE_PROJECT_DIR`  | Projektverzeichnis, in dem `docker compose` ausgeführt wird (entspricht deinem `cd` Schritt). | `.` (Repository-Wurzel im Container)          |
| `MAIN_COMPOSE_FILE`         | Pfad/Name des Haupt-Compose-Files relativ zum Projektverzeichnis oder absolut.                | `docker-compose.yaml`                         |
| `MAIN_COMPOSE_PROJECT_NAME` | Optionaler Projektname, der an `docker compose` weitergegeben wird (entspricht `-p <name>`). | *(leer)*                                      |

> ℹ️  Standardmäßig läuft der Cronjob jede Minute (Debug-Modus). Setze z. B. `CRON_SCHEDULE_DAYS=3` und `CRON_SCHEDULE_MINUTES=180`, um alle drei Tage um 03:00 Uhr zu starten.

> ℹ️  Damit `docker compose` funktioniert, muss der Wartungs-Container Zugriff auf den Docker-Socket (`/var/run/docker.sock`) erhalten. Dies ist bereits im Compose-File konfiguriert.

