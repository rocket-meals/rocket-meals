# Playground – Experimentier-App

Eine Expo-App als Spielwiese: hier landen Technik-Experimente, die (noch) in keine der anderen Apps dieses Monorepos gehören. Aufbau, Versionierung und CI folgen exakt den anderen Apps (`apps/geonexia`, `apps/score-tracker`, `apps/tag-und-jahr`), damit ein Experiment ohne Umbau in eine echte App wandern kann.

Der Startbildschirm listet die Experimente auf; jedes Experiment ist eine eigene Route unter [`frontend/app/`](frontend/app).

## Aktuelles Experiment: Godot in React Native

[React Native Godot](https://github.com/borndotcom/react-native-godot) (von Born & Migeran) bettet die **Godot-Engine 4.5** als native View in eine React-Native-App ein. Die Umsetzung hier orientiert sich an der Expo-Demo von [akshayjadhav4/react-native-godot-demo](https://github.com/akshayjadhav4/react-native-godot-demo) – Plugin und Screen sind für dieses Monorepo neu geschrieben.

Was drin steckt:

- **Godot-View**: `<RTNGodotView />` füllt den Bildschirm ([`frontend/app/godot/index.tsx`](frontend/app/godot/index.tsx)).
- **Touch-Steuerung**: Links/Rechts/Springen schicken `ui_left`, `ui_right` und `ui_accept` über Godots `Input`-Singleton in das Spiel. Alle Godot-Aufrufe laufen als Worklet auf dem Godot-Thread (`runOnGodotThread`).
- **Pause/Play und Zurück** als Overlay über der Engine.
- **Eigenes Expo-Config-Plugin** ([`frontend/plugin/withGodotAssets.js`](frontend/plugin/withGodotAssets.js)), das das Spiel beim `expo prebuild` in die nativen Projekte kopiert.

### Warum zwei Formate für dasselbe Spiel?

| Plattform | Quelle im Repo | Ziel im nativen Projekt | Godot-Argument |
| --- | --- | --- | --- |
| iOS | `frontend/assets/godot/main.pck` | `ios/main.pck` (Xcode-Resource) | `--main-pack <bundle>/main.pck` |
| Android | `frontend/assets/godot/godot-files/main/` | `android/app/src/main/assets/main/` | `--path /main` |

Auf iOS ist der Zugriff auf eine `.pck` im App-Bundle nicht langsamer als auf Einzeldateien, also reicht die kompakte Pack-Datei. Auf Android ist das Lesen von Pack-Inhalten aus dem APK deutlich langsamer, deshalb liegt das Projekt dort als Einzeldateien im Asset-Ordner.

Ein eigenes Spiel kommt an genau diese beiden Stellen (Godot-Export als `.pck` bzw. als entpacktes Projektverzeichnis). Fehlt eine der beiden Quellen, warnt das Plugin nur – die App baut trotzdem, zeigt dann aber kein Spiel.

### LibGodot-Bibliotheken (Pflicht vor jedem nativen Build)

`@borndotcom/react-native-godot` liefert die eigentliche Engine **nicht** im npm-Paket mit, sondern lädt sie separat (so lassen sich Engine und Wrapper unabhängig aktualisieren):

```bash
yarn workspace playground download-prebuilt
```

Das entpackt die xcframeworks (iOS) bzw. das lokale Maven-Repository (Android) nach `node_modules/@borndotcom/react-native-godot/{ios,android}/libs`. In EAS-Builds passiert das automatisch über den `eas-build-post-install`-Hook in [`frontend/package.json`](frontend/package.json).

Die Android-Seite braucht zusätzlich `minSdkVersion 29` und den Pfad zu diesem Maven-Repository. Beides ergänzt [`frontend/app.config.ts`](frontend/app.config.ts) im gemeinsamen `expo-build-properties`-Eintrag aus `repo-depkit-common` – die Versionsnummer des Prebuilts wird dabei aus der `package.json` der Bibliothek gelesen ([`frontend/plugin/godotPrebuilt.js`](frontend/plugin/godotPrebuilt.js)), damit ein Upgrade nicht auf einen alten Ordner zeigt.

### Android-Patch

`@borndotcom/react-native-godot@1.0.1` stürzt auf Android mit der New Architecture beim Start ab, weil LibGodot der `JavaVM`-Pointer fehlt, bevor der Godot-Thread erzeugt wird. Der Patch [`frontend/patches/@borndotcom__react-native-godot.patch`](frontend/patches) (aus der oben genannten Demo übernommen, betrifft ausschließlich den MIT-lizenzierten Android-Teil der Bibliothek) setzt ihn in `JNI_OnLoad`. Eingebunden ist er über das `patch:`-Protokoll von Yarn in den `resolutions` der Root-`package.json`, wird also bei jedem `yarn install` automatisch angewendet.

### Entwicklung

Die Engine ist ein natives Modul: **Expo Go reicht nicht**, es braucht einen Development Build.

```bash
yarn workspace playground download-prebuilt   # einmalig bzw. nach Library-Updates
yarn workspace playground start               # Metro/Expo Dev Server
yarn workspace playground ios                 # lokaler iOS-Build (Mac mit Xcode)
yarn workspace playground android             # lokaler Android-Build
```

Ohne natives Modul (Web, Expo Go) zeigt der Godot-Screen einen entsprechenden Hinweis statt eines Absturzes.

### Warum diese App auf Expo SDK 54 festgenagelt ist

Alle anderen Apps des Monorepos laufen auf **Expo 57 / React Native 0.86**, der Playground bewusst auf **Expo 54 / React Native 0.81** – möglich, weil `installConfig.hoistingLimits: workspaces` jeder App ihren eigenen Dependency-Baum gibt.

Grund ist die native Kette hinter Godot: `react-native-godot` hängt an `react-native-worklets-core`, und dessen CMake-Datei linkt gegen das Prefab-Ziel `hermes-engine::libhermes`. Der Android-Build auf RN 0.86 stirbt deshalb mit

```
Target "rnworklets" links to target "hermes-engine::libhermes" but the target was not found.
```

RN 0.81 liefert dieses Prefab noch (`node_modules/react-native/ReactAndroid/hermes-engine/`), ab RN 0.86 gibt es das Verzeichnis nicht mehr – `ReactAndroid` exportiert nur noch `jsi`, `reactnative` und `hermestooling`. Auch `react-native-worklets-core@2.0.0-beta.4` linkt noch das alte Ziel, es gibt also derzeit keine Version, die RN 0.86 unterstützt.

Der Pin ist damit die Bedingung dafür, dass die Godot-Engine überhaupt baut, und gilt nur für diese App. Sobald `react-native-worklets-core` (bzw. `react-native-godot`) RN 0.86 unterstützt, kann der Playground einfach wieder auf den SDK-Stand der anderen Apps gehoben werden – die gemeinsamen Einstellungen kommen ohnehin aus `repo-depkit-common/appconfig`.

## Version und Build-Nummer

Wie in den anderen Apps:

- [`frontend/config.ts`](frontend/config.ts) enthält `getBuildNumber()` (native Builds), `getMajorVersion()` und `getVersionPatch()` (OTA).
- Die Major-Version bleibt bei `0`: der Playground ist eine Entwickler-App und wird von der `ios-submit-review`-Automatik nie an App Review geschickt.
- Jede Änderung erhöht `getVersionPatch()`, jede native Änderung (Plugin, neue Library) zusätzlich `getBuildNumber()`.
- Die vollständige Version steht unten auf dem Startbildschirm.

## CI

`.github/workflows/ci.yml` enthält – wie für jede App dieses Repos – drei Jobs: `playground-check-build` (vergleicht die Build-Nummer mit EAS), `playground-build-ios` (nur wenn die Build-Nummer gestiegen ist) und `playground-expo-update` (OTA).

Beim ersten Lauf legt `playground-expo-update` das EAS-Projekt an (`eas init`) und schreibt Projekt-ID und `updates`-Block in `app.config.ts` zurück.

**Wichtig für ganz neue Apps:** `ci.yml` läuft nur bei Pushes auf `master`, nicht auf Pull-Request-Branches. Solange das EAS-Projekt noch nicht existiert, scheitert dort jedes `eas`-Kommando mit „EAS project not configured. This command cannot configure it in non-interactive mode." – deshalb macht [`playground-dev-client.yml`](../../.github/workflows/playground-dev-client.yml) den `eas init`-Schritt selbst, bevor es baut (idempotent, sobald die Projekt-ID in `app.config.ts` steht).

Der iOS-Build-Job bleibt so lange rot, bis die App in App Store Connect existiert und ihre Apple-ID in [`frontend/config.ts`](frontend/config.ts) (`appleAppId`) steht. Beides erledigt ein Skript:

```bash
EXPO_APPLE_ID=nils@baumgartner-software.de yarn appstore:create-app apps/playground/frontend
```

Der Job `playground-appstore-app-id` trägt die Apple-ID danach von selbst nach (er fragt sie mit dem App-Store-Connect-API-Key ab und committet `config.ts`/`eas.json`) – das Skript ist also nur für das einmalige Anlegen nötig, weil Apples öffentliche API keine Apps erzeugen kann.

Details siehe [App-Store-Connect-App anlegen](../../README.md#app-store-connect-app-anlegen) – kurz: Das Skript legt Bundle-ID und App an (oder findet eine bestehende), schreibt die Apple-ID in `config.ts` und erzeugt `eas.json` neu. `eas.json` wird **nie** von Hand bearbeitet, es entsteht ausschließlich aus [`frontend/eas.template.json`](frontend/eas.template.json).

## Spiel-Assets & Credits

Das mitgelieferte Demo-Spiel ist der Platformer aus dem Godot-Tutorial von **Brackeys**, übernommen aus [akshayjadhav4/react-native-godot-demo](https://github.com/akshayjadhav4/react-native-godot-demo).

**Lizenz: Creative Commons Zero (CC0)** – frei für jeden Zweck verwendbar.

- Sprites von **analogStudios_**: [Camelot Pack](https://analogstudios.itch.io/camelot) (Ritter), [Dungeon Sprites](https://analogstudios.itch.io/dungeonsprites) (Slime), [Four Seasons Platformer Sprites](https://analogstudios.itch.io/four-seasons-platformer-sprites) (Plattformen, Münze)
- Tileset und Früchte von **RottingPixels**: [Four Seasons Platformer Tileset](https://rottingpixels.itch.io/four-seasons-platformer-tileset-16x16free)
- Sounds: Brackeys, Asbjørn Thirslund · Musik: Brackeys, Sofia Thirslund
- Font: [Pixel Operator](https://www.dafont.com/pixel-operator.font) von Jayvee Enaguas (HarvettFox96)
