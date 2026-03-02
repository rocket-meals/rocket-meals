# Anleitung: Expo-App mit Playwright screenshotten

Diese Anleitung ist für den Ablauf in dieser Umgebung gedacht (Rocket Meals Monorepo).

## Ziel
Eine lauffähige Web-Ansicht der App öffnen und per Playwright einen Screenshot erzeugen.

## Standardablauf
1. Abhängigkeiten installieren:
   ```bash
   yarn
   ```
2. Frontend starten:
   ```bash
   yarn frontend
   ```
3. Relevante URL aus den Expo-Logs verwenden:
   - Meist `http://localhost:8081` für Web
   - Bei Base Path ggf. `/rocket-meals` anhängen
4. Mit Playwright Screenshot erstellen.

## Typische Probleme in dieser Container-Umgebung
### 1) `ENOSPC: System limit for number of file watchers reached`
Das kann beim `yarn frontend`-Start passieren, obwohl Expo initial hochfährt.

**Workaround:** statischen Web-Export nutzen statt Metro-Dev-Server.

```bash
yarn workspace rocket-meals-dev export:web
cd apps/frontend/app
mkdir -p serveDist/rocket-meals
cp -r dist/* serveDist/rocket-meals/
python3 -m http.server 4173 --directory serveDist
```

Danach ist die App unter:
- `http://127.0.0.1:4173/rocket-meals`
erreichbar.

### 2) Chromium crasht im Playwright-Container (`SIGSEGV`)
Wenn Chromium nicht startet, Firefox verwenden.

## Empfohlener Playwright-Ablauf (robust)
- Zuerst Chromium versuchen
- Bei Crash automatisch Firefox nutzen
- URL: `http://127.0.0.1:4173/rocket-meals` (im Export-Setup)

## Kurz-Checkliste für das nächste Mal
- [ ] `yarn` ausführen
- [ ] `yarn frontend` testen
- [ ] Bei `ENOSPC`: `export:web` + lokaler Static-Server
- [ ] Mit Playwright Screenshot machen
- [ ] Falls Chromium abstürzt: Firefox verwenden
- [ ] Screenshot-Pfad dokumentieren

