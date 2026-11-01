# AGENTS.md

Diese Datei enthält Arbeitsregeln für KI-Agenten in diesem Repository.

## Ziel
- Änderungen konsistent und nachvollziehbar umsetzen.
- Bestehende Projektkonventionen respektieren.

## Wichtige Referenzen
- Für visuelle Änderungen und Screenshots: `SCREENSHOTS_PLAYWRIGHT.md`
- Für das Abarbeiten von SonarCloud-Maintainability-Issues: `docs/SONARCLOUD_MAINTAINABILITY_WORKFLOW.md`
- Für App-Store-Screenshots pro Tenant (Rendern, Ablage im Repo, Upload): `docs/STORE_SCREENSHOTS.md`

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

## Keine hardgecodeten Texte (no hardcoded user-facing strings)

**Jeder Text, den ein Nutzer sieht, kommt aus dem Übersetzungskatalog — nie als Literal im Code.**
Das gilt für alle Apps und für `packages/common-ui`.

- **In Apps:** immer `translate(TranslationKeys.<key>)` verwenden. Neue Texte brauchen einen Key in `locales/keys.ts` **und** einen Eintrag mit **allen** unterstützten Sprachen in `locales/translations.json` (bzw. in `commonTranslations`, wenn der Text allgemein ist).
- Das betrifft auch `accessibilityLabel`, `accessibilityHint`, `placeholder`, `title`, `label`, Toast-/Modal-Texte und Fehlermeldungen, die im UI landen.
- **Ausgenommen** sind nicht-sprachliche Literale: Eigennamen/Marken (`OpenStreetMap`), technische Formathinweise (`DD.MM.YYYY`), Icon-Namen, `testID`/`nativeID`, Log- und Debug-Ausgaben, die nie im UI erscheinen.
- **In `packages/common-ui`:** Komponenten sind sprach-agnostisch. Sie bekommen ihre Texte über eine `texts`-Prop (Muster: `WeatherPreviewTexts`, `AppDownloadBannerTexts`, `LicenseInformationTexts`, `SettingsListMyMapThemeSelectionTexts`). Die App löst ihre Translation-Keys auf und reicht die fertigen Strings durch. Ein englischer `*_FALLBACK_TEXTS`-Export darf existieren, damit Playbook/Prototypen ohne `texts` funktionieren — er ist kein Ersatz für Übersetzungen.
- **Durchgesetzt durch Tests:** `packages/common-ui/src/__tests__/noHardcodedTexts.test.ts` scannt alle Komponenten. Ein neuer hardgecodeter Text lässt den Test fehlschlagen. Ausnahmen müssen mit Begründung in die dortige `ALLOWED_LITERALS`-Liste — bitte sparsam.

## Schreibregel: keine Gedankenstriche und keine Semikolons

- In nutzersichtbaren Texten (alle Sprachen) **keine Gedankenstriche (`–`, `—`, `——`) und keine Semikolons (`;`, `；`, `؛`)**. Stattdessen neuer Satz, Komma oder Doppelpunkt. Details in der `README.md` (Abschnitt „Schreibregel für Texte in der App“).

## Übersetzungen: gemeinsame Keys in `repo-depkit-common`, App-Keys erben davon

- **Allgemeines Vokabular** (Speichern, Abbrechen, Fehler, Wochentage, Monate, …) lebt **einmal** in `packages/common/src/translations/`:
  - `CommonTranslationKeys.ts` — die gemeinsamen Keys.
  - `commonTranslations.ts` — die Texte dazu, in **allen** Sprachen aus `ALL_TRANSLATION_LANGUAGES`.
  - `TranslationHelper.ts` — `createTranslator`, `mergeTranslationResources`, `resolveTranslation`, `interpolateTranslation`, `toI18nextResources`.
  - `TranslationValidationHelper.ts` — die Prüfungen, die die Tests fahren.
- **Apps erben davon.** TypeScript-`enum`s können nicht erben, deshalb sind die Keys ein const-Objekt plus gleichnamiger Typ. Eine App erweitert per Spread:
  ```ts
  export const TranslationKeys = {
  	...CommonTranslationKeys,
  	my_app_specific_key: 'my_app_specific_key',
  } as const;
  export type TranslationKeys = (typeof TranslationKeys)[keyof typeof TranslationKeys];
  ```
  Wert und Typ unter einem Namen zu deklarieren hält `TranslationKeys.save` und `key: TranslationKeys` genauso lauffähig wie vorher mit dem Enum.
- **Key-Name = Key-Wert** (`save: 'save'`). Nur so bleibt ein Key im Code grepbar; der Test prüft das.
- **Ein Key gehört nach `packages/common`, wenn er in einer zweiten, fachlich unabhängigen App genauso sinnvoll wäre.** App-spezifische Keys bleiben in der App. Ein Key, der in `CommonTranslationKeys` steht, darf **nicht** noch einmal in der `translations.json` der App stehen — der Test schlägt sonst fehl.
- **Katalog immer über `locales/translationResources.ts` lesen**, nie direkt `translations.json` importieren: der direkte Import kennt die gemeinsamen Keys nicht und rendert dann den rohen Key.
- **Jeder Key braucht in jeder unterstützten Sprache einen nicht-leeren Text.** Durchgesetzt durch `apps/frontend/app/__tests__/translations.test.ts`, `apps/geonexia/frontend/__tests__/translations.test.ts` und `packages/common/src/__tests__/commonTranslations.test.ts`.

## Übersetzungen im Backend: Texte, die der Server an Nutzer schickt

Auch das Directus-Backend schickt Texte an Nutzer — Push-Nachrichten, generierte Dokumente, Meldungen, die in der App landen. Für die gilt dieselbe Regel wie in den Apps: **kein Literal an der Aufrufstelle, sondern ein Key aus dem Katalog.**

- Der Katalog liegt in `apps/backend/Backend/directusExtensions/directus-extension-rocket-meals-bundle/src/helpers/translations/`:
  - `BackendTranslationKeys.ts` — erbt per Spread von `CommonTranslationKeys`; hier stehen nur Keys, die keine App je anzeigen würde.
  - `backendTranslations.ts` — die Texte dazu, in **allen** Sprachen aus `ALL_TRANSLATION_LANGUAGES`. Ein Key, den `commonTranslations` schon hat, darf hier **nicht** noch einmal stehen — der Test schlägt sonst fehl.
  - `BackendTranslator.ts` — löst Key + Sprache zu einem Text auf.
  - `BackendLanguageResolver.ts` — bestimmt, welche Sprache ein Nutzer überhaupt bekommt.
- **Die Sprache kommt aus `profiles.language`, gematcht gegen die `languages`-Collection.** Der Server geht dabei vor wie die App: die App nimmt die Locales des Geräts und wählt die erste, für die sie Texte hat; der Server nimmt den Profilwert und wählt die passendste Zeile aus `languages`. Reihenfolge in `BackendLanguageResolver._findBestMatchingCode`: exakter Code (case-insensitiv) → gleiche Basissprache (`de` ↔ `de-DE`) → Deutsch → Englisch → erste Zeile der Tabelle.
- **Beide Schreibweisen werden akzeptiert** — der reine Language-Key (`"de-DE"`) genau wie das aufgelöste Relations-Objekt (`{ code: "de-DE" }`), je nachdem ob der Aufrufer die Relation mitgeladen hat. Genau wie in der App.
- **Das Ergebnis hat zwei Felder, weil zwei verschiedene Lookups daran hängen:**
  - `languageCode` — der volle `languages.code`, mit dem *Inhalte aus der Datenbank* (Speisenamen, News) in den `*_translations`-Tabellen gefunden werden.
  - `translationLanguage` — der Kurzcode, auf den der *Textkatalog* geschlüsselt ist. Dazu gibt es `translate`, schon an die Sprache gebunden.
- **Default ist Deutsch** (`BACKEND_DEFAULT_TRANSLATION_LANGUAGE`), genau wie in den Apps, deren `settingsReducer` auf `'de-DE'` (`DEFAULT_LANGUAGE_CODE`) startet. Kein Profil, keine Sprache gesetzt, Sprache nicht in der Tabelle oder Tabelle nicht lesbar → Deutsch.
- Aufruf mit Datenbank (ein Resolver pro Lauf, er cacht die `languages`-Tabelle):
  ```ts
  const languageResolver = new BackendLanguageResolver(myDatabaseHelper);
  const language = await languageResolver.resolveForProfile(profile);
  language.translate(BackendTranslationKeys.tomorrow);                    // 'Morgen' / 'Tomorrow' / …
  language.translate(BackendTranslationKeys.notification_foodoffer_body, { date, food });
  ContentTranslationHelper.getTranslation(food.translations, language.languageCode ?? '', 'name');
  ```
  Für einen einzelnen Text ohne Nutzerbezug (z. B. das deutsche Formular-PDF) reicht `BackendTranslator.translate(key)`.
- **Die App speichert und sendet den vollen Code** (`"de-DE"`), denselben Wert wie `profiles.language` und `languages.code`. Der Kurzcode (`"de"`) ist nur der Schlüssel des Textkatalogs: `useLanguage().translationLanguage` bzw. `getTranslationLanguage(language)`. Helfer in `repo-depkit-common` (`translations/LanguageCodeHelper.ts`): `toFullLanguageCode` (`"de"` → `"de-DE"`), `findMatchingLanguageCode` / `findBestMatchingLanguageCode` (dieselbe Auswahl wie `BackendLanguageResolver`). `profiles.language` schreibt nur `useLanguageProfileSync` (beim Start und nach jedem Sprachwechsel, App-Wert gewinnt), `ProfileHelper.updateProfile` schickt das Feld nie mit.
- **Sprachcodes immer über die geteilten Matcher vergleichen**, nie mit `===`: `isSameLanguageCode(a, b)` (case-insensitiv, Region zählt) und `isSameBaseLanguage(a, b)` (case-insensitiv, Region egal) aus `repo-depkit-common`. `languages.code` wird pro Kunde von Hand gepflegt — `de-DE`, `DE-de` und `de` meinen dasselbe, ein strikter String-Vergleich lässt Nutzer still in die Fallback-Sprache rutschen. Gilt genauso in der App (`helper/resourceHelper.tsx`).
- **Drei Dinge heißen „Übersetzung", verwechsle sie nicht** (Details unten in „Drei Sorten Übersetzung"): `helpers/translations/` (statischer Katalog, arbeitet mit `translationLanguage`), `helpers/ContentTranslationHelper.ts` (DB-Inhalte, arbeitet mit `languageCode`; `getTranslation` matcht erst den exakten Code, dann dieselbe Sprache in einer anderen Region) und `auto-translation-hook/` (KI-Anbieter aus Directus „Einstellungen → KI“ oder DeepL).
- Datum und Uhrzeit in einer Nutzersprache: `BackendTranslator.formatDate(date, language.translationLanguage)`. Die `DateHelper.getHumanReadable*`-Funktionen sind fest auf `de-DE` und damit nur für interne Reports gedacht.
- Durchgesetzt durch `src/helpers/translations/__tests__/BackendTranslations.test.ts` (jeder Key in jeder Sprache), `BackendLanguageResolver.test.ts` (das Matching) und `src/food-notify-schedule-hook/__tests__/NotifyScheduleTranslations.test.ts`.

## Drei Sorten Übersetzung im Backend — nicht vermischen

Im Backend heißen drei verschiedene Dinge „Übersetzung". Sie unterscheiden sich danach, **woher der Text kommt**, und tragen das im Namen:

| Ebene | Wo | Woher der Text kommt |
| --- | --- | --- |
| **Statischer Katalog** | `helpers/translations/` — `BackendTranslator`, `BackendTranslationKeys` | Von Entwicklern geschrieben, mit dem Code ausgeliefert, per Key nachgeschlagen. Übersetzt zur Laufzeit nichts. |
| **Inhalte** | `helpers/ContentTranslationHelper.ts` | Von Redaktion oder Import-Parser, liegt als `*_translations`-Zeilen am Item (Speisenamen, News). Der Helper liest und schreibt diese Zeilen. |
| **Maschinell** | `auto-translation-hook/` — `AutoTranslator`, `CollectionAutoTranslator`, `OpenAiCompatibleTranslator`, `DeepLTranslator` | Vom KI-Anbieter aus den Directus-Einstellungen oder von DeepL erzeugt (Umschalter `AUTO_TRANSLATE_PROVIDER`: `ai` Standard, `deepl`). Befüllt genau die Zeilen, die `ContentTranslationHelper` verwaltet. Kostet API-Kontingent pro Aufruf. |

- **Präfix-Regel:** `Auto*` heißt maschinell erzeugt, `Content*` heißt aus der Datenbank. Ohne Präfix ist der statische Katalog gemeint — der ist der Normalfall und teilt sich Keys und `translate()` mit den Apps und `repo-depkit-common`.
- **`Translator` ohne Präfix nicht neu einführen.** Der Name ist dreifach belegt: die DeepL-SDK-Klasse (`deepl-node`), der Typ der `translate`-Funktion aus `repo-depkit-common`, und früher die eigene Klasse — die heißt deshalb jetzt `AutoTranslator`.
- `BackendLanguageResolver` gehört zu keiner der drei Ebenen, sondern wählt nur die Sprache und liefert beide Formen (`languageCode` für Inhalte, `translationLanguage` für den Katalog).

## Tests für `packages/common` und `packages/common-ui`

- Beide Pakete haben eine eigene Jest-Suite: `yarn workspace repo-depkit-common test` bzw. `yarn workspace repo-depkit-common-ui test`. Beide laufen in CI (`🧪 Package & App Tests`).
- **Neue Helper in `packages/common` brauchen einen Test** unter `packages/common/src/__tests__/`.
- `packages/common-ui` testet mit `ts-jest` in Node — also **keine** Renderer-Tests, sondern die reine Logik (Helper, Playbook-Registry, Quellcode-Scans). Module, die `react-native` importieren, gehören nicht in diese Suite.

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

## Backend-`dist` nicht in Pull Requests committen

- **Niemals `apps/backend/Backend/directusExtensions/directus-extension-rocket-meals-bundle/dist/` in einem PR mitschicken.** Lokal `yarn app-backend-build` laufen lassen ist zum Prüfen okay, die geänderten `dist`-Dateien danach aber verwerfen (`git checkout -- <pfad>/dist`).
- **Grund:** Die `dist` ist minifiziert (`api.js`/`app.js` sind praktisch eine einzige Zeile). Jede Änderung daran kollidiert mit jeder anderen, egal ob aus einem anderen PR oder aus CI. Die CI baut die `dist` nach jedem Merge auf `master` selbst (`.github/actions/backend-build`) und veröffentlicht sie im Job `📤 Publish Staged Changes`. Bringt ein PR eine eigene `dist` mit, wird der von CI gestagte Patch nicht mehr sauber angewendet und der Publish-Job schlägt mit `staged patches were dropped because they conflicted: backend-dist` fehl.
- Wurde der Patch doch einmal verworfen: `master` auschecken, `yarn install`, `yarn app-backend-build`, und nur die `dist` in einem eigenen PR committen.

## Verbotene Pakete im Backend

- **Niemals `node:crypto` (bzw. `crypto`) importieren.** Für zufällige IDs und Tokens unseren `NanoidHelper` (`apps/backend/Backend/directusExtensions/directus-extension-rocket-meals-bundle/src/helpers/NanoidHelper.ts`) oder den Directus-Endpoint `GET <PUBLIC_URL>/utils/random/string` verwenden.
- Die vollständige Liste steht in `apps/backend/Backend/directusExtensions/directus-extension-rocket-meals-bundle/README.md` unter „Verbotene Pakete“.

## Keine `let`-Variablen

- **Niemals `let` verwenden**, sondern immer `const`. Ausgenommen sind nur Vendor-Dateien (fremder, eingebundener Code wie `node_modules`, generierte oder kopierte Bibliotheken).
- Veränderlicher Zustand auf Modulebene (Cache, laufender Request, Zähler) gehört in eine **Klasse mit `static`-Feldern**, z. B. `OnboardingUserCountCache` in `apps/frontend/app/helper/OnboardingUserCountCache.ts`.
- In React-Komponenten: `useState` bzw. `useRef`. Innerhalb einer Funktion: ein `const`-Objekt mit Feldern (`const state = { done: false }`) statt einer neu zugewiesenen Variablen.
- Statt Neuzuweisung: Ausdrücke (`const x = cond ? a : b`), Hilfsfunktionen mit frühem `return`, `for...of` oder Array-Methoden (`map`, `filter`, `reduce`, `find`).

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
