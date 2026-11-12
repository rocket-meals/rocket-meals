# Offsite-Backup auf Google Drive

Der Server lädt einmal am Tag den neuesten Datenbank-Dump und alle neuen Bilder auf Google Drive hoch.
Wird der Server angegriffen, liegen Datenbank und Bilder noch woanders. Der Server kann diese Kopien
nicht löschen.

## Wie es funktioniert

```
Server                         Geteilte Ablage                 Geteilte Ablage
rocket-meals-offsite-backup -> "Rocket Meals Backup Eingang" -> "Rocket Meals Backup Archiv"
(darf nur hochladen)           Service Account: Mitbearbeiter   Service Account: kein Zugriff
                                           \                      /
                                            Apps Script in deinem Konto
                                            (verschiebt, räumt auf, warnt)
```

1. Der Container `rocket-meals-offsite-backup` lädt täglich um `OFFSITE_BACKUP_TIME` hoch:
   * den neuesten fertigen Dump aus `data/database_backups` nach `Eingang/<Name>/db/`
   * alle Bilder aus `data/database_file_uploads`, die noch nicht hochgeladen wurden, nach `Eingang/<Name>/uploads/`.
     Von Directus erzeugte Vorschaubilder (`<id>__<hash>.<ext>`) werden ausgelassen.
   * zuletzt `Eingang/<Name>/manifest.txt` mit der Liste aller Bilder, die es auf dem Server gerade gibt.
2. Das Apps Script läuft stündlich in deinem Google-Konto:
   * Es verschiebt alles aus dem Eingang ins Archiv.
   * Bilder, die laut Manifest auf dem Server gelöscht wurden, legt es im Archiv in den Papierkorb.
     Google behält sie dort 30 Tage.
   * Dumps, die älter als 7 Tage sind, kommen in den Papierkorb. Die drei neuesten bleiben immer.
   * Es schickt dir eine Mail, wenn auf einmal mehr als 5 % der Bilder fehlen würden (dann löscht es nichts)
     oder wenn seit 48 Stunden kein neuer Dump angekommen ist.

## Warum der Server nichts löschen kann

* Der Service Account ist in der Ablage „Eingang“ nur **Mitbearbeiter** (Contributor). Mit dieser Rolle
  lässt Google weder Papierkorb noch Löschen zu.
* Das Archiv kennt der Service Account gar nicht. Auch Überschreiben ist dort also nicht möglich.
* Der Papierkorb kann nur von Administratoren der Ablage geleert werden, also von dir.
* Wer den Server übernimmt, kann höchstens Unsinn in den Eingang legen oder ein leeres Manifest
  hochladen. Das Apps Script löst dann nur eine Warnmail aus.

## Kosten

Keine zusätzlichen. Service Account, Google-Cloud-Projekt (ohne Rechnungskonto), Drive API und
Apps Script sind kostenlos. Der Speicher zählt gegen den vorhandenen Workspace-Speicher.

## Einrichtung (einmalig)

### 1. Google Cloud: Service Account

1. In der [Google Cloud Console](https://console.cloud.google.com/) ein Projekt anlegen, z.B. `rocket-meals-backup`.
2. Unter „APIs & Dienste“ die **Google Drive API** aktivieren.
3. Unter „IAM & Verwaltung > Dienstkonten“ ein Dienstkonto `rocket-meals-offsite-backup` anlegen.
   Es braucht keine Rollen im Projekt.
4. Beim Dienstkonto unter „Schlüssel“ einen **JSON-Schlüssel** erstellen und herunterladen.
   Falls das gesperrt ist, steht die Organisationsrichtlinie `iam.disableServiceAccountKeyCreation` im Weg.

Empfehlung: Für jeden Server ein eigenes Dienstkonto. Dann kann ein übernommener Server nicht einmal
in den Eingang der anderen Server schreiben.

### 2. Zwei geteilte Ablagen

1. In Google Drive die geteilte Ablage **„Rocket Meals Backup Eingang“** anlegen.
   Das Dienstkonto (`...@...iam.gserviceaccount.com`) als **Mitbearbeiter** hinzufügen.
2. Die geteilte Ablage **„Rocket Meals Backup Archiv“** anlegen. Hier kommt **niemand** sonst hinzu.
3. Die IDs beider Ablagen notieren. Das ist der letzte Teil der URL, wenn man die Ablage öffnet
   (`https://drive.google.com/drive/folders/<ID>`).

Falls sich das Dienstkonto nicht hinzufügen lässt: In der Admin-Konsole unter
„Apps > Google Workspace > Drive und Docs > Freigabeeinstellungen“ müssen bei geteilten Ablagen
Mitglieder außerhalb der Organisation erlaubt sein.

### 3. Apps Script

1. Auf [script.google.com](https://script.google.com/) ein neues Projekt „Rocket Meals Backup Archivar“ anlegen.
2. In den Projekteinstellungen „appsscript.json im Editor anzeigen“ aktivieren und den Inhalt von
   [`dockerOffsiteBackup/apps-script/appsscript.json`](dockerOffsiteBackup/apps-script/appsscript.json) einfügen.
   Damit ist der erweiterte Dienst „Drive API v3“ eingeschaltet.
3. `Code.gs` durch [`dockerOffsiteBackup/apps-script/Code.gs`](dockerOffsiteBackup/apps-script/Code.gs) ersetzen
   und oben in `CONFIG` die beiden IDs eintragen.
4. Die Funktion `setup` einmal ausführen und die Berechtigungen bestätigen. Sie legt den stündlichen
   Trigger an und macht gleich einen ersten Lauf.

### 4. Server

1. In der `.env` ergänzen (bei uns schreibt `yarn generate` aus `rocket-meals-envs` das automatisch):
   ```
   OFFSITE_BACKUP_SHARED_DRIVE_ID=<ID der Ablage „Eingang“>
   OFFSITE_BACKUP_NAME=swosy           # Ordnername dieses Servers, z.B. swosy, studi-futter, test
   OFFSITE_BACKUP_SERVICE_ACCOUNT_JSON_BASE64=<base64 des JSON-Schlüssels, z.B. base64 -w0 service-account.json>
   OFFSITE_BACKUP_TIME=03:30           # optional, Standard 03:30
   ```
   Der Schlüssel wird im Container nur im Speicher entschlüsselt. Alternativ kann er als Datei unter
   `data/offsite_backup/service-account.json` liegen (`chmod 600`), dann bleibt die Variable leer.
   Nur dieser Container bekommt die Variable, die anderen Dienste nicht.
2. `docker compose up -d --build rocket-meals-offsite-backup`
3. Einmal sofort testen: `docker compose run --rm rocket-meals-offsite-backup once`

Fehlt eine der Angaben, bleibt der Container einfach untätig und schreibt den Grund ins Log
(`docker compose logs rocket-meals-offsite-backup`). Bestehende Installationen laufen also ohne
Einrichtung unverändert weiter.

Der erste Lauf lädt alle Bilder hoch und kann dauern. Das Apps Script verschiebt pro Lauf so viele
Dateien, wie in gut vier Minuten gehen, und macht in der nächsten Stunde weiter. Das Manifest wird
erst ausgewertet, wenn der Eingang des Servers leer ist.

## Wiederherstellen

* **Bilder:** Aus `Archiv/<Name>/uploads/` herunterladen (oder aus dem Papierkorb der Ablage
  wiederherstellen) und nach `data/database_file_uploads/` legen.
* **Datenbank:** Den Dump aus `Archiv/<Name>/db/` nach `data/database_backups/` legen und wie gewohnt
  einspielen, z.B. mit `apps/backend/backupRestore.sh`.

## Gut zu wissen

* `data/offsite_backup/uploaded_images.txt` merkt sich, welche Bilder schon hochgeladen wurden.
  Geht die Datei verloren, lädt der Server alles noch einmal hoch. Das Apps Script erkennt die Doppelten
  und wirft sie aus dem Eingang.
* `data/offsite_backup/last_success.txt` enthält den Zeitpunkt des letzten erfolgreichen Laufs.
* Die Dumps werden unverschlüsselt hochgeladen.
