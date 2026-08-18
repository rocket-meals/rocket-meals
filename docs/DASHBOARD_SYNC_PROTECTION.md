# Schutz der Dashboards beim Schema-Sync

## Worum geht es?

Beim Start des Backends (und damit bei jedem Update/Deploy, auch beim wöchentlichen Cronjob
`scripts/update-and-generate-env.sh`) läuft der Container `rocket-meals-database-sync`. Er führt
`directus-sync push` aus und bringt die Directus-Konfiguration der Instanz auf den Stand, der im
Repository unter `data/directus-sync-data/configuration/directus-config/collections/` liegt.

`directus-sync push` gleicht **vollständig** ab: Einträge, die das Repository nicht kennt, werden
gelöscht; Einträge, die es kennt, werden überschrieben. Für Berechtigungen, Flows und Schema ist das
genau richtig — für die **Insights-Dashboards und ihre Panels** war es fatal: Wer im Backend eine
Auswertungsseite gebaut hat, hat sie beim nächsten Backend-Update verloren.

## Was passiert jetzt

Vor jedem Push werden die geschützten Kollektionen (Standard: `dashboards`, `panels`) aus der
laufenden Instanz in einen temporären Ordner gepullt und mit dem Stand im Repository verglichen
(`apps/backend-sync/src/ProtectedCollectionsGuard.ts`).

Gefunden werden zwei Arten von Abweichungen:

- **nur im Backend vorhanden** — der Push würde den Eintrag löschen (z. B. ein neu angelegtes Panel),
- **im Backend geändert** — der Push würde den Eintrag überschreiben.

Wird eine Abweichung gefunden, dann

1. wird ein **Backup** geschrieben: `data/directus-sync-backups/<Zeitstempel>/` enthält den kompletten
   Stand der Instanz (`dashboards.json`, `panels.json`), eine Übersicht der Abweichungen
   (`*.drift.json`) und einen lesbaren Report (`report.txt`),
2. wird eine **Benachrichtigung** in Directus erzeugt (Admin-Konto des Syncs und optional weitere
   Adressen). Directus verschickt diese Benachrichtigungen per E-Mail,
3. **überspringt der Push die geschützten Kollektionen**. Alle anderen Schema-Änderungen
   (Berechtigungen, Flows, Felder, Collections) werden ganz normal übernommen.

Die Kollektionen werden dabei immer gemeinsam übersprungen: Panels hängen an Dashboards, ein halber
Push würde das Elternobjekt eines neuen Panels löschen.

Schlägt der Vergleichs-Pull fehl, wird ebenfalls übersprungen ("fail closed") — ohne Vergleich lässt
sich nicht feststellen, ob im Backend etwas verloren ginge.

## Änderungen dauerhaft sichern

Übersprungen heißt: Die Änderung lebt weiter in **dieser einen** Instanz, aber nicht im Repository.
Damit sie dauerhaft erhalten bleibt und auf alle Instanzen kommt, muss sie ins Repository:

1. Workflow **"🗄️ Backend Schema Sync Pull (Manual)"** auf dem Testsystem ausführen (zieht den
   aktuellen Stand inkl. Dashboards ins Repository) oder lokal
   `yarn workspace backend-sync sync:pull-from-test-system`,
2. die Änderungen als PR mergen.

Danach sind Repository und Instanz wieder identisch, der Guard meldet nichts mehr und die Dashboards
werden wieder überall ausgerollt.

Alternativ kann der Inhalt aus einem Backup-Ordner (`data/directus-sync-backups/<Zeitstempel>/`)
direkt nach `data/directus-sync-data/configuration/directus-config/collections/` übernommen werden.

## Bereits verlorene Dashboards wiederherstellen

Der Container `rocket-meals-database-backup` legt stündlich einen `pg_dump` unter
`data/database_backups/` ab und hält ihn 31 Tage vor. Ein Dashboard, das ein Update überschrieben
hat, lässt sich daraus zurückholen:

```bash
# 1) Passenden Stand vor dem Update suchen
ls -lt data/database_backups/ | head

# 2) Backup in eine temporäre Datenbank einspielen
docker compose exec -T rocket-meals-database createdb -U directus dashboard_restore
zcat data/database_backups/dump-<Zeitstempel>.sql.gz \
  | docker compose exec -T rocket-meals-database psql -U directus -d dashboard_restore

# 3) Nur Dashboards und Panels exportieren
docker compose exec -T rocket-meals-database \
  pg_dump -U directus -d dashboard_restore --data-only \
  -t directus_dashboards -t directus_panels > dashboards_restore.sql
```

Der Export kann anschließend in die Live-Datenbank eingespielt werden. Reihenfolge beachten:
Panels verweisen auf Dashboards, das Dashboard muss also zuerst existieren. Sind die alten Einträge
noch vorhanden, vorher entfernen bzw. mit `ON CONFLICT` arbeiten, sonst schlägt der Import an den
Primärschlüsseln fehl. Danach die wiederhergestellten Dashboards über den Workflow
"🗄️ Backend Schema Sync Pull (Manual)" ins Repository holen, damit sie dauerhaft gesichert sind.

## Konfiguration

Alle Werte werden an den Container `rocket-meals-database-sync` durchgereicht
(`apps/backend/docker-compose.yaml`) und können in der `.env` der Instanz gesetzt werden.

| Variable | Standard | Bedeutung |
| --- | --- | --- |
| `DIRECTUS_SYNC_PROTECTED_COLLECTIONS` | `dashboards,panels` | Geschützte Kollektionen. Leer = Prüfung aus. Erlaubt sind die directus-sync-Kollektionen (`presets`, `flows`, … ). |
| `DIRECTUS_SYNC_PROTECTION_MODE` | `skip` | `skip`: Abweichungen werden nicht überschrieben. `report`: Abweichungen werden gemeldet und gesichert, der Push läuft aber durch (Updates rollen weiter, Backup + E-Mail bleiben). `off`: keine Prüfung. |
| `DIRECTUS_SYNC_FORCE_OVERWRITE_PROTECTED_COLLECTIONS` | `false` | Einmaliger Force-Override für genau diesen Deploy-Lauf. |
| `DIRECTUS_SYNC_DRIFT_NOTIFY_EMAILS` | leer | Zusätzliche E-Mail-Adressen (Kommaliste). Sie müssen als Directus-Benutzer existieren, damit die Benachrichtigung zugestellt werden kann. |
| `DIRECTUS_SYNC_DRIFT_BACKUP_PATH` | `data/directus-sync-backups` | Zielordner der Backups. |

## Bewusst überschreiben (Force-Override)

Wenn der Repository-Stand gewinnen soll (z. B. nachdem die Änderungen ins Repository übernommen
wurden oder jemand ein Dashboard kaputt konfiguriert hat):

- **Über GitHub:** Workflow **"🚀 Deploy Backend (Manual)"** starten und
  `force_dashboard_overwrite` auf `true` setzen. Der Wert gilt nur für diesen einen Deploy.
- **Auf dem Server:**

  ```bash
  DIRECTUS_SYNC_FORCE_OVERWRITE_PROTECTED_COLLECTIONS=true ./scripts/update-and-generate-env.sh
  ```

- **Lokal / manuell:**

  ```bash
  yarn workspace backend-sync sync --push --force-overwrite-protected-collections
  ```

Auch beim Force-Override wird vorher ein Backup geschrieben und eine Benachrichtigung verschickt.
