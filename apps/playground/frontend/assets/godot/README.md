# Godot-Spiel

Hier liegt das Spiel, das die Godot-Engine in der App lädt – in zwei Formaten, weil iOS und Android
unterschiedlich schnell darauf zugreifen (siehe `../../plugin/withGodotAssets.js`):

- `main.pck` – Godot-Export als Pack-Datei, wird beim Prebuild nach `ios/main.pck` kopiert und als
  Xcode-Resource eingetragen (`--main-pack`).
- `godot-files/main/` – derselbe Export als entpacktes Projektverzeichnis, wird beim Prebuild nach
  `android/app/src/main/assets/main/` kopiert (`--path /main`).

Ein eigenes Spiel ersetzt einfach beide Stände (Godot-Export einmal als `.pck`, einmal als
Verzeichnis). Fehlt eines davon, warnt das Plugin nur und die App startet ohne Spiel.

## Herkunft und Lizenz

Der enthaltene Platformer stammt aus dem Godot-Anfänger-Tutorial von **Brackeys** und wurde aus der
Expo-Demo [akshayjadhav4/react-native-godot-demo](https://github.com/akshayjadhav4/react-native-godot-demo)
übernommen. Alle Assets stehen unter **CC0 (Creative Commons Zero)**.

Credits: Sprites von analogStudios_ und RottingPixels, Sounds und Musik von Brackeys,
Asbjørn Thirslund und Sofia Thirslund, Font „Pixel Operator" von Jayvee Enaguas (HarvettFox96) –
die vollständige Liste steht in [`../../../README.md`](../../../README.md).
