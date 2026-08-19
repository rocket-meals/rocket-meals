# AGENTS.md

Diese Datei enthält Arbeitsregeln für KI-Agenten in diesem Repository.

## Ziel
- Änderungen konsistent und nachvollziehbar umsetzen.
- Bestehende Projektkonventionen respektieren.

## Wichtige Referenzen
- Für visuelle Änderungen und Screenshots: `SCREENSHOTS_PLAYWRIGHT.md`
- Für das Abarbeiten von SonarCloud-Maintainability-Issues: `docs/SONARCLOUD_MAINTAINABILITY_WORKFLOW.md`

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

## Patch version increment on every change

- **Every push, merge or code change must increment the patch version** (`getVersionPatch()` in the affected app's `config.ts`) by at least 1.
- When shared code changes (e.g. anything under `packages/`), increment the patch version of **every app that consumes that code** (`apps/frontend/app`, `apps/score-tracker/frontend`, `apps/geonexia/frontend`, ...).
- The patch version is shown in the app settings screen (`getVersionInternalForAppsettingsScreen()`), so users can verify they are running the latest OTA update.

## Expo Plugins: Build number increment

- **Whenever an Expo plugin is added or updated in any frontend project** (i.e. any change inside the `plugins` array in an `app.config.ts`), the `config.ts` file of that project **must** have its build number incremented.
- Expo plugins contain native code. A changed native layer requires a new binary build, so the build number stored in `getBuildNumber()` in `config.ts` must be bumped by at least 1.
- Example: if `getBuildNumber()` currently returns `7`, change it to `8`.

## Expo app config: shared settings live in `repo-depkit-common/appconfig`

- Settings that must be **identical in every app** — the iOS deployment target, the Android SDK levels, the OTA/`expo-updates` setup, the `runtimeVersion` policy, the Apple privacy manifest boilerplate — belong in `packages/common/appconfig/expoAppConfig.ts` and are consumed from each `app.config.ts` (and from `apps/frontend/app/config.ts`).
- **Never inline one of these values into a single app.** Raising the iOS deployment target after an Expo SDK upgrade, for example, is one edit in `IOS_DEPLOYMENT_TARGET` — not four.
- The module must stay free of Node built-ins (`fs`, `path`): it is also bundled into the app through `apps/frontend/app/config.ts`. Node-only config code belongs next to `packages/common/licenses/collectLicenses.ts`.
- It lives in `repo-depkit-common` rather than `repo-depkit-common-ui` on purpose: every app already depends on `repo-depkit-common`, while depending on the UI package would autolink its native modules (e.g. `expo-location`) into apps that do not use them.

## New Expo apps: Required build number setup

- **Every new Expo app** (e.g. a new folder under `apps/`) **must** have a `config.ts` file with a `getBuildNumber()` function that returns an integer (start at `1`).
- The `app.config.ts` must import `getBuildNumber` from `./config.ts` and use the result for `ios.buildNumber`, `android.versionCode`, and `version`.
- The CI workflow (`.github/workflows/ci.yml`) **must** be extended with three new jobs for the new app, following the pattern of existing apps (e.g. `score-tracker-check-build`, `score-tracker-build-ios`, `score-tracker-expo-update`):
  1. A `<app>-check-build` job using `./.github/actions/check-build-number` with the app's `working-directory`.
  2. A `<app>-build-ios` job (and optionally `<app>-build-android`) that only runs when the build number changed.
  3. A `<app>-expo-update` job for OTA updates.
- **Whenever any native change is made to an existing app** (not just plugin changes), increment `getBuildNumber()` in that app's `config.ts` by at least 1 to trigger a new native build in CI.

## New Expo apps: EAS project initialization

- `.github/workflows/ci.yml` only runs on pushes to `main`/`master`/`dev`. A brand-new app whose `app.config.ts` has no `extra.eas.projectId` therefore has **no** EAS project while its pull request is open, and every `eas` command in a PR workflow fails with "EAS project not configured. This command cannot configure it in non-interactive mode."
- Any workflow that runs `eas` on pull requests (e.g. `<app>-dev-client.yml`) must therefore run `./.github/actions/eas-init-project` for that app before the first `eas` command. The action is idempotent - once the projectId is in `app.config.ts` it does nothing.

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

## New Expo apps: App Store Connect app + Apple-ID

- The numeric Apple-ID of an app (`appleAppId` in the app's `config.ts`, injected as `submit.production.ios.ascAppId` into `eas.json`) is **not** filled in by hand: run `yarn appstore:create-app apps/<app>/frontend`.
- The script (`scripts/appstore-create-app.js`) reads name and bundle identifier from the app's Expo config, registers the bundle id, creates the App Store Connect app, writes `appleAppId` into `config.ts` and re-runs the app's `generate:eas`.
- **Creating** an app requires an Apple-ID session (`EXPO_APPLE_ID`, 2FA prompt or `FASTLANE_SESSION`): Apple's public App Store Connect API has no endpoint for creating apps, which is why `eas submit` uses the private iris API for exactly this step. With only the App Store Connect API key (`EXPO_ASC_*`) the script can look an existing app's Apple-ID up (`--lookup-only`), not create one.
- Filling `appleAppId` in is **not** a manual step: the `.github/actions/appstore-app-id` action (used by the `<app>-appstore-app-id` CI job) runs the script with `--allow-missing` on every push and stages `config.ts`/`eas.json` as soon as the app exists. Add such a job for every new app instead of pasting the Apple-ID by hand.

## Geonexia: Dialogs and alerts

- **Never use React Native's `Alert` in Geonexia.** Use `useMyScrollviewModal` instead for all user-facing dialogs, confirmations, and notifications.

## Bottom-Sheet-Modals: Texteingaben müssen `BottomSheetTextInput` verwenden

Gilt für **alle Apps** (`apps/frontend`, `apps/geonexia`, `apps/score-tracker`) und `packages/common-ui`.

- **Niemals ein plain `TextInput` aus `react-native` innerhalb von Bottom-Sheet-Modal-Inhalten rendern.** Das betrifft alles, was über `useMyScrollViewModal().show({ children })` bzw. `useModal` angezeigt wird oder sonst innerhalb von `BaseBottomSheet` / `MyScrollViewModal` (aus `repo-depkit-common-ui`) landet — auch Sheet-Komponenten wie `*Sheet.tsx`.
- **Grund:** Das Keyboard-Tracking von `@gorhom/bottom-sheet` erkennt nur `BottomSheetTextInput`. Ein plain `TextInput` ist dafür unsichtbar, das Sheet schiebt sich beim Öffnen der Tastatur **nicht** nach oben und die Tastatur verdeckt das Eingabefeld (besonders auf Android mit Edge-to-Edge; siehe Fix in `packages/common-ui/src/components/BaseBottomSheet/index.tsx`, `android_keyboardInputMode="adjustPan"`).
- **Muster** (Web kennt kein Sheet-Keyboard-Handling, daher Fallback):
  ```tsx
  import { Platform, TextInput } from 'react-native';
  import { BottomSheetTextInput } from '@gorhom/bottom-sheet';

  const ResolvedTextInput = Platform.OS === 'web' ? TextInput : BottomSheetTextInput;
  ```
- **Vorhandene Helper wiederverwenden statt neu bauen:**
  - Geonexia: `apps/geonexia/frontend/components/ModalTextInput.tsx`
  - Frontend-App: `apps/frontend/app/components/ModalTextInput.tsx`
  - common-ui: `SettingsListTextInput`, `SettingsListNumberInput`, `SettingsListDate` folgen dem Muster bereits.
- `TextInput` auf normalen Screens (außerhalb von Sheets) ist in Ordnung. **Achtung umgekehrt:** `BottomSheetTextInput` wirft auf Native außerhalb eines BottomSheet — Komponenten, die sowohl auf Screens als auch in Sheets verwendet werden, brauchen einen Opt-in-Prop (siehe `insideBottomSheet` in `apps/frontend/app/components/SingleLineInput/SingleLineInput.tsx`).

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
