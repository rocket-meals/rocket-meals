# Store-Screenshots pro Tenant

Die Screenshots für App Store und Play Store werden automatisch aus der öffentlichen
Web-App jedes Tenants gerendert, **im Repo abgelegt** und von dort in die Stores
hochgeladen. Wann sich die Bilder geändert haben, zeigt die Git-Historie von
`store-screenshots/`.

## Aufbau

| Teil | Wo |
| --- | --- |
| Ground Truth: Screens, Reihenfolge, Geräte, Tenants | `apps/frontend/app/store-screenshots.ts` |
| Generator (Puppeteer) | `apps/screenshotGenerator/src/store/index.ts` |
| Upload Apple / Google | `apps/scripts/store-screenshots*.ts` (Workspace `rocket-meals-scripts`) |
| Ergebnis im Repo | `store-screenshots/<tenant>/<gerät>/<NN>-<route>.jpg` + `manifest.json` |
| Workflow | `.github/workflows/store-screenshots.yml` |

`<tenant>` ist derselbe Wert wie `CUSTOMER` (`test`, `swosy`, `studi-futter`).

## Welche Screens ein Tenant bekommt

`STORE_SCREENSHOT_SCREENS` listet alle Kandidaten in Store-Reihenfolge (Speiseplan,
Campus, Wohnen, Stundenplan, News, Guthaben, Einstellungen). Jeder Screen nennt das
`app_settings`-Flag, an dem er hängt. Der Generator liest vor dem Rendern die
`app_settings` des Tenant-Backends und lässt jeden Screen weg, dessen Flag nicht aktiv
ist, genau wie das Menü der App. Beispiel Studi|Futter: `course_timetable_enabled`,
`housing_enabled` und `campus_enabled` sind dort aus, also gibt es keine Bilder von
Stundenplan, Wohnen und Campus. Was weggelassen wurde und warum, steht in
`manifest.json` unter `skippedScreens`.

Soll ein Screen bei einem Tenant trotz aktivem Flag nicht in den Store, kommt er in
`EXCLUDED_ROUTES` in derselben Datei.

## Geräte

| Ordner | Store | Slot | Pixel |
| --- | --- | --- | --- |
| `apple-iphone-6.7` | Apple | `APP_IPHONE_67` (6,9"/6,7") | 1290 x 2796 |
| `apple-ipad-12.9` | Apple | `APP_IPAD_PRO_3GEN_129` (13"/12,9") | 2048 x 2732 |
| `google-phone` | Google | `phoneScreenshots` | 1080 x 1920 |
| `google-tablet-10` | Google | `tenInchScreenshots` | 1080 x 1920 |

Die Bilder sind JPEG ohne Alphakanal: beide Stores akzeptieren das, und mit Fotos von
Speisen ist es ein Bruchteil der PNG-Größe.

## Wie gerendert wird

- Quelle ist die öffentliche Web-App, z. B. `https://rocket-meals.de/studi-futter/foodoffers?kioskMode=true`.
  Der Kiosk-Modus meldet einen Demo-Nutzer an und wählt die erste Mensa, ganz ohne Login.
- Jeder Screenshot läuft in einem frischen Browser-Kontext. Alle Tenants liegen unter
  derselben Domain `rocket-meals.de` und würden sich sonst über den LocalStorage die
  gewählte Mensa und gecachte News teilen.
- Die Uhr der Seite wird auf **11:30 Uhr des nächsten Werktags** (Berlin) gestellt. Am
  Wochenende sind die Mensen zu, und ein leerer Speiseplan verkauft nichts.
- Der Generator wartet, bis keine Ladeanzeige mehr sichtbar ist (höchstens 15 s), und
  danach noch 7 s, damit Fehler-Toasts der Kiosk-Sitzung verschwunden sind.
- Ein Tenant wird in einen temporären Ordner gerendert und ersetzt die Dateien im Repo
  erst, wenn alle Bilder geklappt haben.

**Wichtig:** Gerendert wird, was unter `rocket-meals.de/<tenant>` gerade live ist. Ist
das Web-Deployment noch nicht aktualisiert, zeigen die Bilder den alten Stand. Dann den
Workflow nach dem Deployment manuell mit `force` starten.

## Wann neu gerendert wird

Der Workflow läuft nach jedem erfolgreichen `🚀 CI` auf `master` (nur in
`rocket-meals/rocket-meals`, die Forks bekommen die Dateien über den Fork-Sync). Pro
Tenant wird nur neu gerendert, wenn sich gegenüber `manifest.json` etwas geändert hat:

- die Store-Version (`getVersion()` in `config.ts`, also `major.build.0`): eine neue
  App-Version bringt neue Screenshots, ein reines OTA-Patch-Update nicht,
- die Auswahl der Screens (ein Flag im Backend wurde an- oder ausgeschaltet),
- die Geräteliste.

Neue Bilder werden als `chore: update store screenshots [skip ci]` auf `master`
committet.

## Upload

**Automatisch hochgeladen wird nur für Tenants in `AUTO_UPLOAD_TENANTS`**
(`store-screenshots.ts`). Die Liste ist anfangs leer: erst die Bilder im Repo ansehen,
dann den Tenant eintragen. Ein manueller Workflow-Lauf mit `upload` lädt unabhängig
davon hoch, ebenso `yarn store-screenshots:push` ohne `--auto`.

- **Google** übernimmt die Screenshots sofort, für jede Sprache des Store-Eintrags.
- **Apple** nimmt Screenshots nur an, solange eine App-Store-Version bearbeitbar ist.
  Gibt es keine, wird Apple übersprungen. Der iOS-Submit-Workflow
  (`ios-submit-review-rocket-meals.yml`, Variable `STORE_SCREENSHOTS_MODULE`) lädt die
  Bilder dann direkt vor der nächsten Review-Einreichung hoch. Ein Fehler beim
  Screenshot-Upload blockiert die Einreichung **nicht**, er erscheint als Warnung im Log.
  Alle Lokalisierungen der Version bekommen dieselben Bilder.
- Hochgeladen wird nur, was sich unterscheidet: beide Stores liefern pro Bild einen Hash
  (Apple md5, Google sha256), der mit den Dateien im Repo verglichen wird. Ist ein Slot
  anders, werden seine alten Bilder gelöscht und die neuen in Reihenfolge hochgeladen.

## Kommandos

```bash
# Rendern (nur geänderte Tenants, --force für alle, --tenant für einen)
yarn store-screenshots:generate
yarn store-screenshots:generate --tenant swosy --force

# Hochladen (nur abweichende Slots)
yarn store-screenshots:push --dry-run
yarn store-screenshots:push --tenant studi-futter --store google
```

Lokal ohne Puppeteer-Chrome: `PUPPETEER_EXECUTABLE_PATH=/pfad/zu/chrome` setzen.
Zugangsdaten wie bei den Store-Metadaten (siehe `docs/STORE_METADATA.md`):
`EXPO_ASC_API_KEY_PATH` für Apple, `GOOGLE_PLAY_SERVICE_ACCOUNT_JSON(_PATH)` für Google.
Der Google-Service-Account braucht das Recht, den Store-Eintrag zu bearbeiten.

Manuell per GitHub: Workflow **„🖼️ Store Screenshots: Generate & Upload"** mit Tenant,
`force` (neu rendern) und `upload`.
