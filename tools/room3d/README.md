# 3D-Räume (Küche & Badezimmer)

Parametrische 3D-Modelle zweier Räume, erzeugt aus einer Beschreibung in
Python. Ausgabe sind OBJ/MTL- und STL-Dateien sowie ein WebXR-Viewer, mit dem
die Räume direkt in einer VR-/MR-Brille begangen werden können.

## Erzeugen

```bash
python3 tools/room3d/build_rooms.py      # keine Abhängigkeiten, nur Standardbibliothek
```

Alle Dateien landen in `tools/room3d/out/` und sind bereits eingecheckt.

## Dateien

| Datei | Inhalt |
| --- | --- |
| `out/kitchen.obj` + `.mtl` | Küche, geschlossener Raum, mit Farben |
| `out/kitchen_open.obj` + `.mtl` | Küche ohne Decke und vordere Wand („Puppenhaus") |
| `out/kitchen.stl`, `out/kitchen_open.stl` | dieselbe Geometrie als binäres STL (ohne Farben) |
| `out/bathroom*.obj/.mtl/.stl` | dasselbe für das Badezimmer |
| `out/viewer.html` | eigenständiger WebXR-Viewer (lädt three.js vom CDN) |
| `out/viewer_artifact.html` | derselbe Viewer als Artifact-Fragment (ohne `<html>`-Gerüst) |

**Einheiten:** Meter, Y ist oben, Ursprung in einer Raumecke auf Fußbodenhöhe.
Viewer, die STL in Millimetern erwarten, brauchen den Faktor 1000
(`write_stl(room, path, scale=1000)` erzeugt eine solche Datei direkt).

Für Programme, die nur von außen auf ein Modell schauen (Blender-Import,
3D-Druck-Slicer, Windows 3D-Viewer), sind die `_open`-Varianten die
sinnvolleren: Beim geschlossenen Raum sieht man sonst nur eine weiße Kiste.

## Maße

Die Maße sind aus den Fotos geschätzt, nicht eingemessen:

| | Küche | Badezimmer |
| --- | --- | --- |
| Grundfläche | 4,40 m × 4,90 m | 2,70 m × 4,30 m |
| Raumhöhe | 2,65 m | 2,50 m |
| Arbeitsplatte / Waschtisch | 0,92 m | 0,96 m |

Alle Werte stehen als benannte Konstanten am Anfang von `build_kitchen()` bzw.
`build_bathroom()` und lassen sich dort in einer Zeile korrigieren, sobald
echte Maße vorliegen.

## Aufbau des Generators

`build_rooms.py` kennt nur zwei Grundkörper — achsenparallele Quader und
Zylinder. Daraus setzen Hilfsfunktionen die wiederkehrenden Bauteile zusammen:

- `Room.wall(...)` — Wand mit Aussparungen für Türen und Fenster
- `Room.opening(...)` — Laibung, Rahmen und Verglasung einer Aussparung
- `Room.tiles(...)` — Fliesenspiegel mit Fugen
- `Room.handle(...)`, `Room.downlights(...)` — Griffe und Einbauspots

Bauteile, die mit `TOP_SHELL` markiert sind (Decke, vordere Wand, Spots),
fehlen in den `_open`-Exporten und lassen sich im Viewer über *Decke
ausblenden* wegschalten.

## Viewer

`out/viewer.html` im Browser öffnen — auch direkt im Browser der Brille
(Meta Quest, Pico, Vision Pro). Dann *In VR ansehen* wählen.

- **Brille:** linker Stick = gehen, rechter Stick = drehen, Kopfbewegung frei.
- **Desktop:** Maus ziehen = umsehen, `W`/`A`/`S`/`D` = gehen, `Q`/`E` = Höhe,
  `Shift` = schneller.

Der Viewer lädt three.js von cdnjs, braucht also eine Internetverbindung.
WebXR verlangt HTTPS: über `file://` oder `localhost` funktioniert die
Desktop-Ansicht, der VR-Modus braucht eine mit HTTPS ausgelieferte Seite.
