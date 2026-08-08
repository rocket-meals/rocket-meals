# Store-Metadaten (App-Informationen) als Ground Truth

Apple (App Store Connect) und Google (Play Console) fragen regelmäßig Metadaten ab -
z. B. die Altersfreigabe unter "App-Informationen". Damit das nicht pro Tenant/App von
Hand gepflegt werden muss, liegt die **Ground Truth versioniert im Repo** und wird per
CLI mit den Stores abgeglichen.

## Aufbau

- **Typen + Defaults**: `packages/common/src/StoreAppMetadata.ts` (`repo-depkit-common`)
- **Ground Truth pro App** (jede App verwaltet ihre Metadaten selbst):
  - `apps/frontend/app/store-metadata.ts` (alle Rocket-Meals-Tenants: Demo, SWOSY,
    Studi|Futter - gemeinsame Werte mit wenigen Tenant-Overrides, z. B. Datenschutz-URL)
  - `apps/geonexia/frontend/store-metadata.ts`
  - `apps/score-tracker/frontend/store-metadata.ts`
- **CLI**: `apps/scripts/store-metadata.ts` (Workspace `rocket-meals-scripts`)

Es werden **nur Felder verwaltet, die in der Ground Truth gesetzt sind** - alles andere
bleibt in den Stores unangetastet. Die fachliche Begründung der Altersfreigabe-Antworten
steht in `docs/Apple Altersfreigabe.txt`.

## Automatischer Sync im Submit-Workflow

Die `ios-submit-review-*`-Workflows setzen `STORE_METADATA_MODULE`, dadurch gleicht
`apps/scripts/submit-ios-review.ts` die App-Informationen **vor jeder Review-Einreichung**
mit der Ground Truth ab - genau dann existiert garantiert eine bearbeitbare Version.
Neue Apple-Pflichtangaben also einfach in der Ground Truth ergänzen; der nächste Submit
verteilt sie. **Ein fehlgeschlagener Metadaten-Sync blockiert die Einreichung** (der
Workflow schlägt fehl): Es darf keine Version mit veralteten App-Informationen zur
Review gehen. Nur wenn `STORE_METADATA_MODULE` gar nicht gesetzt ist (z. B. lokaler
Aufruf), wird der Sync mit Log-Hinweis übersprungen.

Die Datenschutz-URL der Rocket-Meals-Tenants wird aus der `baseUrl` in `config.ts`
abgeleitet (`https://rocket-meals.de/<tenant>/wikis?custom_id=privacy-policy`,
gleiches Schema wie beim Google-SSO-Zustimmungsbildschirm, siehe
`apps/backend/SSO_GOOGLE.md`) und kann pro Tenant per Override ersetzt werden.

## Review-Submit pro Tenant deaktivieren

In `apps/frontend/app/config.ts` steuert `iosAppStoreReviewSubmitEnabled` pro Tenant, ob
der Submit-Workflow Builds zur App-Review einreicht. Die Rocket-Meals-Demo-App steht auf
`false` (reine Test-App), SWOSY und Studi|Futter auf `true`. Nicht gesetzt bedeutet
`true`. Der Workflow überspringt den Submit-Step dann komplett (mit Log-Hinweis) - auch
bei manuellen `workflow_dispatch`-Läufen.

## Kommandos

```bash
# Ist-Stand aus den Stores lesen + Abweichungen zur Ground Truth anzeigen
yarn store-metadata:pull:rocket-meals
yarn store-metadata:pull:geonexia
yarn store-metadata:pull:score-tracker

# Ground Truth in die Stores schreiben (nur abweichende Felder)
yarn store-metadata:push:rocket-meals
yarn store-metadata:push:geonexia
yarn store-metadata:push:score-tracker
```

Optionen (an das Workspace-Kommando anhängbar, z. B.
`yarn workspace rocket-meals-scripts store-metadata push --module apps/frontend/app/store-metadata.ts --dry-run`):

- `--store apple|google` - nur einen Store abgleichen
- `--app <filter>` - nur Apps, deren Name/BundleId/Package den Filter enthält
- `--dry-run` - (push) nur anzeigen, nichts schreiben

`pull` schreibt zusätzlich Snapshots nach `reports/store-metadata/<app>.<store>.json`.

### Unbeantwortete Fragen (fehlende Daten)

Altersfreigabe-Fragen, die Apple als unbeantwortet meldet (`null` im Store) und die auch
die Ground Truth nicht beantwortet, werden beim `pull` markiert (Console: `❗`, im
Snapshot-JSON als `missingFields`). Ein echter `push` - und damit auch der Sync vor dem
Review-Submit - **schlägt dann fehl** und listet die fehlenden Felder auf, damit
auffällt, dass etwas ergänzt werden muss (z. B. wenn Apple den Fragebogen erweitert).
`--dry-run` zeigt die Warnung nur an.

### Snapshot in Ground Truth umwandeln

```bash
yarn workspace rocket-meals-scripts store-metadata:extract reports/store-metadata/rocket-meals.apple.json
```

Extrahiert aus einem Pull-Snapshot einen fertigen TypeScript-Block (Altersfreigabe,
Kategorien, Content Rights, Datenschutz-URL) zum Einfügen in die `store-metadata.ts`.
Unbeantwortete Fragen erscheinen als auskommentierte Zeilen mit `❗`-Markierung.

### Manuell per GitHub Workflow

Der Workflow **"🏪 Store Metadata: Pull / Push"** (`.github/workflows/store-metadata.yml`)
kann per `workflow_dispatch` gestartet werden: Kommando (`pull`/`push`), App
(`rocket-meals`/`geonexia`/`score-tracker`), Store (`all`/`apple`/`google`) und für
`push` optional Dry-Run. Beim `pull` landen die Snapshots als JSON in der
Console-Ausgabe, in der Job-Summary und als Workflow-Artifact (30 Tage) - es wird
nichts ins Repo committet. Credentials kommen aus den Repo-Secrets
`EXPO_APPLE_APPSTORECONNECT_API_KEY_CONTENT` und `GOOGLE_PLAY_SERVICE_ACCOUNT_JSON`.

## Zugangsdaten

**Apple** (gleicher Key wie der iOS-Submit-Workflow, Team-weit gültig - deckt alle
Tenants ab):

```bash
export EXPO_ASC_API_KEY_PATH=/pfad/zum/AuthKey.p8
# Key-ID und Issuer-ID kommen automatisch aus repo-depkit-common (AppleAppStoreConfig)
```

**Google** (Service-Account, in der Play Console unter "Einrichtung -> API-Zugriff" mit
dem Entwicklerkonto verknüpfen, Rechte: "App-Informationen bearbeiten"):

```bash
export GOOGLE_PLAY_SERVICE_ACCOUNT_JSON_PATH=/pfad/zum/service-account.json
# oder GOOGLE_PLAY_SERVICE_ACCOUNT_JSON mit dem JSON-Inhalt (für CI-Secrets)
```

Fehlen Zugangsdaten für einen Store, wird er mit Warnung übersprungen (außer er wurde
explizit per `--store` angefordert).

## Was wird verwaltet?

| Feld | Apple | Google |
| --- | --- | --- |
| Altersfreigabe-Fragebogen (`ageRatingDeclaration`) | ✅ per API | ❌ keine öffentliche API |
| Kategorien (`primaryCategoryId`/`secondaryCategoryId`) | ✅ | ❌ keine öffentliche API |
| Content-Rights-Erklärung | ✅ | - |
| Datenschutz-URL (`privacyPolicyUrl`/`privacyChoicesUrl`) | ✅ (alle Sprachen) | ❌ keine öffentliche API |
| Kontaktdaten / Standardsprache | - | ✅ (`edits/details`) |
| Store-Eintrag (Titel, Beschreibungen) | (noch nicht) | ✅ (`edits/listings`) |

## Bekannte Einschränkungen

- **Apple**: Altersfreigabe und Kategorien sind nur änderbar, solange eine App-Store-
  Version im Entwurfsstatus existiert (legt der Submit-Workflow ohnehin an). Die
  Änderungen werden erst mit der nächsten eingereichten Version live.
- **Apple Content Rights**: Apple sperrt `contentRightsDeclaration` je nach App-Zustand
  komplett (API antwortet mit 409 `ENTITY_ERROR.ATTRIBUTE.INVALID.INVALID_STATE`, teils
  ist das Feld auch im App-Store-Connect-UI nicht editierbar). Push und Pre-Submit-Sync
  geben dann nur eine Warnung aus und machen weiter, statt die Einreichung zu blockieren -
  der Wert muss manuell unter "App-Informationen" -> "Inhaltsrechte" geändert werden
  (oder die Ground Truth wird an den Store-Wert angeglichen).
- **Apple 2025er-Fragebogen**: Apple hat den Fragebogen erweitert (neue Ratings
  4+/9+/13+/16+/18+, Fähigkeiten wie "Benutzergenerierte Inhalte"). `pull` zeigt alle
  Attribute, die Apple aktuell liefert - neue Fragen können direkt in der Ground Truth
  ergänzt werden (der Typ ist dafür offen).
- **Apple Datenschutz-Labels** ("App-Datenschutz"): keine öffentliche REST-API.
- **Google Altersfreigabe** (Inhaltseinstufungs-Fragebogen) und **Datensicherheits-
  Formular**: keine öffentliche API - bleiben manuell in der Play Console. Der Rest
  (Listings, Kontaktdaten) läuft per API.
