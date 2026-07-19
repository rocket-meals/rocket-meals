# AGENTS.md

Diese Datei enthält Arbeitsregeln für KI-Agenten in diesem Repository.

## Ziel
- Änderungen konsistent und nachvollziehbar umsetzen.
- Bestehende Projektkonventionen respektieren.

## Wichtige Referenzen
- Für visuelle Änderungen und Screenshots: `SCREENSHOTS_PLAYWRIGHT.md`

## Maestro End-to-End-Tests

- Tests liegen als TypeScript in `apps/frontend/maestro-tests/src/tests/` und werden mit `yarn maestro:generate` (aus `apps/frontend/app/`) zu YAML generiert.
- `yarn maestro` führt die Tests gegen das echte Test-Backend aus; `yarn maestro:mock` startet zusätzlich den Directus-GET-Mock (`maestro-tests/src/mock-server/mockServer.ts`) und führt nur Tests mit dem Tag `mock-backend` aus.
- Der Mock serviert die geteilten Fixtures aus `packages/common/src/testData/` — dieselben Daten, gegen die auch die Unit-Tests laufen. Neue deterministische E2E-Tests sollten diese Fixtures erweitern statt eigene Daten zu definieren.
- Für Element-Targeting immer `nativeID={ComponentIds.XXX}` verwenden (siehe `apps/frontend/app/constants/ComponentIds.ts`).

## React-Dateien (verbindliche Konvention)
Bei React-Dateien sollen **Styles, Export und Logik in derselben Datei** bleiben.

- Keine Aufteilung in separate Dateien nur für Styles/Export/Logik.
- Bevorzuge eine einzelne, gut strukturierte Datei pro Komponente, sofern fachlich sinnvoll.

## Allgemein
- Änderungen möglichst klein und gezielt halten.
- Nur notwendige Dateien anfassen.

## Pull-Request-Pflicht je nach Projekt

- **Rocket Meals** (dieses Repo insgesamt, insbesondere alles außerhalb der unten genannten Ausnahmen): Änderungen **immer zuerst als Pull Request** erstellen, niemals direkt auf `master`/`main` pushen.
- **Geonexia** und **Score Tracker** (`apps/geonexia`, `apps/score-tracker`): Änderungen dürfen **direkt auf `master`** erfolgen, kein PR nötig.
- **`packages/common` und `packages/common-ui`**: Da diese von Rocket Meals genutzt werden, gilt hier ebenfalls die PR-Pflicht — **immer zuerst ein PR**, auch wenn die Änderung von Geonexia oder Score Tracker ausgelöst wurde.
- Ausnahme: Der Nutzer kann im jeweiligen Task explizit etwas anderes anweisen (z. B. "push direkt"); dann gilt diese Anweisung für diesen Task.

## Frontend-Features: Screenshots in Pull Requests

- **Bei Pull Requests, die Features oder visuelle Änderungen in einer der Frontend-Apps betreffen, muss immer ein Screenshot oder Bild der Änderung beigefügt werden.**
- Der Screenshot soll zeigen, wie die neue oder geänderte UI im App aussieht (z. B. ein Simulator- oder Geräte-Screenshot).
- Das Bild wird direkt in den Agent-Task bzw. die PR-Beschreibung eingebettet, damit Reviewer die Änderung sofort visuell nachvollziehen können.
- Für die Erstellung von Screenshots: siehe `SCREENSHOTS_PLAYWRIGHT.md`.

## Frontend: React screens and components

- **No separate `styles.ts` files.** All styles, logic, and exports for a screen or component must stay in a single file (e.g. `index.tsx`). Use `StyleSheet.create(...)` inline inside the same file.
- **English names only** for screen folders, component files, and route paths. Do not use German words in file or folder names.
- **Prefer common-ui components.** When displaying data, always prefer reusing components from `repo-depkit-common-ui` (e.g. `SettingsList`, `SettingsListGroupTitle`, `SettingsListProgress`, `SettingsListBoolean`, etc.) over building custom implementations from scratch.

## Expo Plugins: Build number increment

- **Whenever an Expo plugin is added or updated in any frontend project** (i.e. any change inside the `plugins` array in an `app.config.ts`), the `config.ts` file of that project **must** have its build number incremented.
- Expo plugins contain native code. A changed native layer requires a new binary build, so the build number stored in `getBuildNumber()` in `config.ts` must be bumped by at least 1.
- Example: if `getBuildNumber()` currently returns `7`, change it to `8`.

## New Expo apps: Required build number setup

- **Every new Expo app** (e.g. a new folder under `apps/`) **must** have a `config.ts` file with a `getBuildNumber()` function that returns an integer (start at `1`).
- The `app.config.ts` must import `getBuildNumber` from `./config.ts` and use the result for `ios.buildNumber`, `android.versionCode`, and `version`.
- The CI workflow (`.github/workflows/ci.yml`) **must** be extended with three new jobs for the new app, following the pattern of existing apps (e.g. `score-tracker-check-build`, `score-tracker-build-ios`, `score-tracker-expo-update`):
  1. A `<app>-check-build` job using `./.github/actions/check-build-number` with the app's `working-directory`.
  2. A `<app>-build-ios` job (and optionally `<app>-build-android`) that only runs when the build number changed.
  3. A `<app>-expo-update` job for OTA updates.
- **Whenever any native change is made to an existing app** (not just plugin changes), increment `getBuildNumber()` in that app's `config.ts` by at least 1 to trigger a new native build in CI.

## New Expo apps: EAS config generation

- **Every new Expo app must have a `generate-eas-config.ts` script** set up under `apps/<app>/scripts/generate-eas-config.ts`, following the pattern of existing apps (e.g. `apps/score-tracker/scripts/generate-eas-config.ts`).
- The script reads `apps/<app>/frontend/eas.template.json` (which contains static submit config such as `appleId` and `appleTeamId`) and writes the final `apps/<app>/frontend/eas.json`, optionally injecting `ascAppId` from `getCustomerConfig().appleAppId`.
- **After creating or updating the template**, run the script to (re-)generate `eas.json`:
  ```
  yarn workspace <app-workspace-name> generate:eas
  ```
- Add a `"generate:eas"` entry to the app's `package.json` scripts pointing to the script:
  ```json
  "generate:eas": "ts-node --project ../scripts/tsconfig.json ../scripts/generate-eas-config.ts"
  ```
- **Never edit `eas.json` manually** — always update `eas.template.json` and re-run the script.

## Geonexia: Dialogs and alerts

- **Never use React Native's `Alert` in Geonexia.** Use `useMyScrollviewModal` instead for all user-facing dialogs, confirmations, and notifications.

## String replacement

- **Never use `String.prototype.replaceAll()` or `String.prototype.replace()` for simple substitutions.** Use `StringHelper` from `repo-depkit-common` instead:
  - For literal (non-regex) replacements: `StringHelper.replaceAllLiteralWithOptions({ str, find, replace })`
  - For regex-based replacements: `StringHelper.replaceAllWithOptions({ str, find, replace, flags? })`
- **Exception**: `.replace()` with a regex callback function (e.g. `text.replace(/pattern/g, word => ...)`) is acceptable when the replacement logic cannot be expressed as a simple string substitution.

## Number parsing and NaN/Infinity checks

- **Never use the bare globals `parseInt`, `parseFloat`, `isNaN`, `isFinite`.** Use the `Number` namespace equivalents instead: `Number.parseInt`, `Number.parseFloat`, `Number.isNaN`, `Number.isFinite`.
- `Number.parseInt`/`Number.parseFloat` are the exact same functions as their global counterparts (no behavior change), so this is a pure rename.
- `Number.isNaN`/`Number.isFinite` do **not** coerce their argument first, unlike the global versions. Only apply this rule where the value is already a `number` (e.g. a function parameter typed `number`, or the result of `parseInt`/`parseFloat`, which is always `number`-typed even when `NaN`). If a value might still be a non-number type (string, `unknown`, etc.) at the check site, coerce/validate it explicitly before switching to `Number.isNaN`/`Number.isFinite`, since the two are not drop-in equivalent for non-number inputs.

## `packages/common`: array indexing must satisfy `noUncheckedIndexedAccess`

- **`packages/common` has no build/typecheck step of its own** — it's plain TS source re-exported via each workspace's `main: index.ts`, so it is type-checked with whichever *consumer's* tsconfig strictness applies. The backend (`apps/backend/Backend/directusExtensions/directus-extension-rocket-meals-bundle/tsconfig.json`) enables `"noUncheckedIndexedAccess": true`, so **every array index access in `packages/common` (`arr[i]`, `arr[arr.length - 1]`, `arr[0]`, …) is typed as `T | undefined`**, even where the index is provably in range. Code that compiles fine under `packages/common`'s own `yarn test` (ts-jest, no such flag) or a frontend app's tsconfig can still fail the backend build with `Type 'number | undefined' is not assignable to type 'number'` / `Object is possibly 'undefined'`.
- Always give indexed values an explicit type, don't assume the element exists:
  - If the index could genuinely be out of range (e.g. validating external/user input), guard first and handle the missing case, e.g. `if (arr[i] === undefined) { throw new Error(...); }` — see `DateHelper.parseDD_MM_YYYY`. TS narrows repeated identical index expressions after such a guard.
  - If the index is provably in bounds but TS can't prove it (e.g. right after an early-return on `.length === 0`), use a non-null assertion (`arr[i]!`) rather than leaving it as `T | undefined`.
- Before considering a `packages/common` change done, run `cd apps/backend/Backend/directusExtensions/directus-extension-rocket-meals-bundle && yarn typecheck` — that's the actual strictness gate CI enforces for this package; the package's own local tests don't catch it.
