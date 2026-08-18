# Directus-Dashboards (Auswertungen / Insights)

Warum im Backend selbst gebaute Auswertungen nach einem Deploy verschwinden, wie man
sie wiederherstellt und wie eigene Dashboards dauerhaft überleben – auch in
Fork-Projekten.

## Kurzfassung

Die Dashboards unter **Auswertungen** (Directus „Insights") sind **Code**, kein
Inhalt. Sie liegen im Repository und werden bei **jedem Deploy** aus dem
Repository in die Datenbank zurückgeschrieben. Änderungen, die jemand im Backend
per Klick an einem mitgelieferten Dashboard vornimmt, halten deshalb nur bis zum
nächsten Deploy.

| Was im Backend gemacht wird | Was beim nächsten Deploy passiert |
| --- | --- |
| Mitgeliefertes Panel verschoben, umbenannt, umkonfiguriert | wird auf den Repo-Stand zurückgesetzt |
| Mitgeliefertes Panel gelöscht | wird wieder angelegt |
| Mitgeliefertes Dashboard umgebaut | Layout ist wieder wie im Repo |
| **Neues** eigenes Dashboard angelegt | bleibt erhalten (Ausnahmen siehe unten) |
| Eigenes Panel zu einem mitgelieferten Dashboard hinzugefügt | bleibt erhalten, das übrige Layout wird aber zurückgesetzt |

Merksatz für Kund:innen: **Nie ein mitgeliefertes Dashboard umbauen – immer ein
eigenes, neues Dashboard anlegen.**

## Wie es technisch funktioniert

* Die Wahrheit liegt im Repo:
  * `data/directus-sync-data/configuration/directus-config/collections/dashboards.json` (13 Dashboards)
  * `data/directus-sync-data/configuration/directus-config/collections/panels.json` (230 Panels)
  * Das Dashboard **„Speisen"** ist die Auswertungsseite mit „Beliebteste Speisen",
    „Unbeliebteste Speisen", „Am Häufigsten Bewertet", „Durchschnittliche
    Zufriedenheit aller Speisen" usw.
* Der Container `rocket-meals-database-sync` (`apps/backend-sync`) startet bei
  jedem Deploy und führt **sofort einen Push** aus:
  `apps/backend-sync/src/index.ts:64` → `DirectusDatabaseSync.push()`
  (`apps/backend-sync/src/DirectusDatabaseSync.ts:81`) → `directus-sync push`
  (`apps/backend-sync/src/DirectusDatabaseSync.ts:355`).
* `directus-sync` (Version 3.2.3, `--preserve-ids dashboards,operations,panels,…`,
  `apps/backend-sync/src/DirectusDatabaseSync.ts:285`) macht dabei drei Dinge:
  1. **create** – alles, was im Repo steht und im System fehlt, wird neu angelegt
     (mit identischer ID). Gelöschte Standard-Panels kommen also zurück.
  2. **update** – alles, was im Repo steht und im System abweicht, wird auf den
     Repo-Stand zurückgesetzt.
  3. **delete** – gelöscht wird **nur**, was in der Tabelle
     `directus_sync_id_map` steht und *nicht* mehr im Repo-Dump vorkommt.
* Konsequenz: Selbst angelegte Dashboards/Panels haben normalerweise **keinen**
  Eintrag in `directus_sync_id_map` und werden daher weder überschrieben noch
  gelöscht.

### Die Ausnahme, die man kennen muss

`directus-sync pull` trägt **alle** vorhandenen Dashboards und Panels in
`directus_sync_id_map` ein – auch die von Hand angelegten. Auf einem System, auf
dem jemals ein Pull gelaufen ist (das **Testsystem**; automatisiert über
`.github/workflows/backend-schema-sync-pull.yml`), werden eigene Dashboards
damit „sync-verwaltet". Landen sie danach nicht im Repo, löscht sie der nächste
Push.

→ Auf dem Testsystem gebaute Dashboards sind nur dann dauerhaft, wenn sie über
den Schema-Pull-Workflow ins Repo committet werden. Produktiv genutzte eigene
Auswertungen gehören nicht auf das Testsystem.

## Verlorene Dashboards wiederherstellen

Die Datenbank wird **stündlich** gesichert und die Dumps werden **31 Tage**
aufbewahrt (`apps/backend/docker-compose.yaml:244-251`, Ablage auf dem Server
unter `data/database_backups`). Ein verlorenes Dashboard ist also
wiederherstellbar, solange der Verlust weniger als 31 Tage zurückliegt.

Ablauf auf dem Server (im Projektverzeichnis, **vorher** einen frischen Dump
ziehen bzw. den aktuellen Stand sichern):

```bash
# 1. Passenden Dump von VOR dem Deploy suchen
ls -la data/database_backups | tail -30

# 2. Dump in eine temporäre Datenbank einspielen (die Live-DB bleibt unberührt)
docker compose exec rocket-meals-database psql -U directus -d postgres \
  -c "DROP DATABASE IF EXISTS dashboard_restore; CREATE DATABASE dashboard_restore;"
gunzip -c data/database_backups/<DUMP>.sql.gz \
  | docker compose exec -T rocket-meals-database psql -U directus -d dashboard_restore

# 3. Nachsehen, was drin ist
docker compose exec rocket-meals-database psql -U directus -d dashboard_restore \
  -c "SELECT id, name FROM directus_dashboards ORDER BY name;"

# 4. Nur Dashboards + Panels exportieren
docker compose exec rocket-meals-database pg_dump -U directus -d dashboard_restore \
  --data-only --column-inserts -t directus_dashboards -t directus_panels \
  > /tmp/dashboards_restore.sql

# 5. Vorhandene Zeilen nicht anfassen, nur fehlende zurückspielen
sed -i '/^INSERT INTO/ s/);$/) ON CONFLICT DO NOTHING;/' /tmp/dashboards_restore.sql
docker compose exec -T rocket-meals-database psql -U directus -d directus \
  < /tmp/dashboards_restore.sql

# 6. Aufräumen
docker compose exec rocket-meals-database psql -U directus -d postgres \
  -c "DROP DATABASE dashboard_restore;"
```

Danach den Directus-Cache leeren bzw. den Directus-Container neu starten.

Wichtig: Wiederhergestellt wird damit der Zustand aus dem Backup. Handelt es sich
um Änderungen an **mitgelieferten** Dashboards, setzt der nächste Deploy sie
erneut zurück – dauerhaft wird es nur über die Wege im nächsten Abschnitt.

## Änderungen dauerhaft machen

### 1. Eigene Auswertung = eigenes Dashboard (für Kund:innen)

Ein mitgeliefertes Dashboard nicht umbauen, sondern in **Auswertungen → +** ein
neues Dashboard anlegen und die gewünschten Panels dort neu anlegen (Panels
lassen sich in Directus nicht kopieren; die Konfiguration eines vorhandenen
Panels kann man aber abschreiben). Empfohlene Namenskonvention, damit für alle
sichtbar ist, was Kundendaten und was Standard ist: Präfix des Kunden, z. B.
`SWOSY – Speiseplanung`.

Diese Dashboards überleben Deploys, sind aber **nicht** im Repo versioniert – bei
einem Datenbank-Restore oder einem Systemumzug sind sie weg. Wer das nicht will,
nimmt Weg 2 oder 3.

### 2. Verbesserung soll für alle gelten (Upstream)

Änderung auf dem Testsystem bauen → Workflow
`🗄️ Backend Schema Sync Pull (Manual)` (`.github/workflows/backend-schema-sync-pull.yml`)
starten → die geänderten `dashboards.json`/`panels.json` landen als Commit im
Repo → PR → nach dem Merge bekommen alle Systeme (auch die Forks, siehe
`.github/workflows/sync-fork.yml`) die Auswertung beim nächsten Deploy.

### 3. Fork-Projekte mit eigenen Dashboards

Ausgangslage: Forks (z. B. `swosy.rocket-meals.de`, `studi-futter.rocket-meals.de`)
holen sich täglich den Upstream-Stand und deployen ihn. Eigene Dashboards, die
dauerhaft und versioniert sein sollen, gehören deshalb ins **Fork-Repo**.

**Heute möglich – `directus-config-overwrite` (vollständiges Ersetzen):**
Dateien in
`data/directus-sync-data/configuration/directus-config-overwrite/collections/`
werden vor jedem Push über die Upstream-Dateien kopiert
(`apps/backend-sync/src/DirectusDatabaseSync.ts:131`, wird bereits für
`settings.json` genutzt). Ein Fork kann dort eine eigene `dashboards.json` und
`panels.json` ablegen. Diese Dateien werden beim Fork-Sync nicht von Upstream
überschrieben – es gibt also keine Merge-Konflikte.

> ⚠️ Die Datei **ersetzt** die Upstream-Datei komplett. Upstream-Einträge, die
> darin fehlen, stehen weiterhin in `directus_sync_id_map` und werden beim Push
> **gelöscht**. Die Fork-Datei muss also immer den Upstream-Inhalt **plus** die
> eigenen Einträge enthalten und bei größeren Upstream-Änderungen nachgezogen
> werden.

**Empfohlener Ausbau – additiver Ordner:** ein Ordner
`directus-config-append/collections/`, dessen Einträge vor dem Push an die
Upstream-Dateien **angehängt** werden (Dedupe über `_syncId`), mit dem
Gegenstück beim Pull (eigene Einträge werden wieder herausgetrennt). Damit pflegt
ein Fork nur seine eigenen Dashboards, bekommt Upstream-Verbesserungen weiterhin
automatisch und hat trotzdem keine Merge-Konflikte. Der Aufwand liegt bei einer
Erweiterung von `DirectusDatabaseSync.ts`.

## Checkliste bei „mein Dashboard ist weg"

1. Wann war der letzte Deploy? (`docker compose logs rocket-meals-database-sync`
   – die Zeilen `Created … items` / `Updated … items` / `Deleted … items` zeigen,
   was der Push angefasst hat.)
2. War es ein mitgeliefertes Dashboard (siehe `dashboards.json`)? → Zurücksetzen
   ist erwartetes Verhalten, Wiederherstellung nur aus dem Backup + künftig Weg 1
   oder 3.
3. War es ein eigenes Dashboard? → Aus dem Backup wiederherstellen und prüfen, ob
   auf diesem System jemals ein `pull` gelaufen ist (Testsystem!).
