# 🧐 Dashboard-Prüfung vor dem Backend-Deploy

## Warum es diese Prüfung gibt

Bei jedem Start des Backends pusht der `backend-sync`-Container die Directus-Konfiguration aus
**diesem Repository** in die Directus-Instanz (`data/directus-sync-data`, siehe
`apps/backend-sync/src/index.ts` → `syncDatabase(SyncDataBaseOptionDockerPush)`).

Damit ist das Repository die Wahrheit — nicht der Server. Alles, was direkt im Directus-Admin gebaut
und **nicht** ins Repository zurückgeholt wurde, verschwindet beim nächsten Deploy: Dashboards,
Panels (Kacheln mit Auswertungen), Flows usw.

Genau das ist passiert: eine aufwendig gebaute Auswertungs-Seite war nach einem Deploy weg.

## Was der Workflow jetzt macht

`.github/workflows/deploy-backend-manual.yml` hat vor dem eigentlichen Deploy den Job **🧐 Check
Dashboards on all Backends**:

1. Er fragt **alle** bekannten Backends ab (`test`, `swosy`, `studi-futter`, `muenster`) — nicht nur
   das Ziel des Deploys, denn deployt wird nacheinander überall hin.
2. Er vergleicht die Dashboards und Panels der Server mit dem Stand im Repository.
3. **Gibt es Unterschiede, bricht der Workflow ab** und der Deploy startet nicht. Im Log und in der
   Run-Summary steht, welches Backend welche Änderung hat.
4. **Server, die nicht laufen, werden übersprungen** (Ping schlägt fehl) — dort kann nichts verloren
   gehen, der Workflow läuft normal weiter.
5. Backends, die zwar antworten, aber nicht geprüft werden können (z. B. Login schlägt fehl), gelten
   als Fehler: ohne Prüfung wird nicht deployt.

### Trotzdem deployen: `force_push`

Der Workflow hat den Eingabe-Parameter **`force_push`**. Ist er gesetzt, wird die Prüfung komplett
übersprungen und direkt deployt.

> ⚠️ `force_push` überschreibt bewusst alles, was auf den Servern im Directus-Admin gebaut wurde.
> Nur benutzen, wenn die Änderungen auf den Servern nicht gebraucht werden.

## Was tun, wenn die Prüfung anschlägt?

Die Änderungen vom Server ins Repository holen — dann sind sie dauerhaft gesichert und werden bei
jedem Deploy wieder mit ausgerollt:

- **Testsystem:** Workflow **🗄️ Backend Schema Sync Pull** starten (bzw. lokal
  `yarn workspace backend-sync sync:pull-from-test-system`).
- **Anderes Backend:** lokal gegen den jeweiligen Server pullen und committen:

  ```bash
  yarn workspace backend-sync sync --pull \
    --directus-url https://swosy.rocket-meals.de/rocket-meals/api \
    --path-to-data-directus-sync data/directus-sync-data \
    --admin-email "$ADMIN_EMAIL" --admin-password "$ADMIN_PASSWORD"
  ```

Danach den Deploy erneut starten — die Prüfung ist grün, weil Server und Repository übereinstimmen.

## Prüfung lokal ausführen

```bash
# alle Backends prüfen
yarn workspace backend-sync sync:check-dashboards

# nur einzelne Backends, weniger Ping-Versuche
yarn workspace backend-sync sync:check-dashboards --servers swosy,test --ping-retries 1

# zusätzlich andere directus-sync Sammlungen prüfen
yarn workspace backend-sync sync:check-dashboards --collections dashboards,panels,flows
```

Exit-Code `0` = keine Änderungen (Deploy unbedenklich), `1` = Änderungen gefunden oder ein Backend
konnte nicht geprüft werden.

### Zugangsdaten

Die Prüfung meldet sich als Admin an jedem Backend an:

- `ADMIN_EMAIL` / `ADMIN_PASSWORD` gelten für alle Backends.
- Hat eine Instanz einen eigenen Admin-Zugang, gehen server-spezifische Variablen vor:
  `ADMIN_EMAIL_SWOSY` / `ADMIN_PASSWORD_SWOSY`, `ADMIN_EMAIL_STUDI_FUTTER` / … (Schlüssel des
  Servers in Großbuchstaben, `-` wird zu `_`).

Als GitHub-Secrets hinterlegt, werden sie im Workflow automatisch gesetzt.

## Hinweis für Admins

Dashboards und Auswertungen dürfen weiterhin im Directus-Admin gebaut werden — sie sind aber erst
dann dauerhaft gesichert, wenn sie ins Repository gepullt wurden. Der Deploy bricht ab und erinnert
daran, statt die Arbeit stillschweigend zu löschen.
