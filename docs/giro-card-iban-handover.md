# Girocard-IBAN-Scanner — Handover

Stand: 2026-09-18. Branch `claude/giro-card-iban-paddleocr`.
Die Vorgänger-PRs #4399 und #4400 sind geschlossen; alles steckt im neuen PR.

Dieses Dokument ist der Übergabepunkt: was gebaut ist, warum es so gebaut ist,
was nachweislich funktioniert, was nachweislich nicht, und woran als Nächstes zu
arbeiten wäre. Es ersetzt den Gesprächsverlauf.

## Was das Feature tut

Rechts neben dem IBAN-Formularfeld sitzt ein Kamera-Button. Er öffnet ein
`useMyScrollViewModal` mit Kamera-Vorschau, liest die IBAN von einer Girocard
und füllt das Feld. Sobald eine IBAN erkannt ist, schließt das Modal von selbst.

Zum Testen ohne Formular: **Experimentell → Girocard-IBAN**
(`app/(app)/experimentell/giro-card-iban`). Dort gibt es zusätzlich einen
Schalter „Prüfsumme ignorieren", die erkannten Zeilen im Klartext und das
letzte Ergebnis — Musterkarten tragen Dummy-Prüfziffern und werden sonst
zu Recht abgelehnt.

### Wo im Formular das passiert

`form-submission` zerlegt den `field_type` eines Feldes am ersten `-`: aus
`value_string-bank_account_number` wird `custom_type` `value_string` und
`custom_id` `bank_account_number`. Genau auf dieses `custom_id` hin rendert der
Screen `IBANInput` — das Feld **mit** dem Kamera-Button. Jedes andere
Stringfeld bekommt `SingleLineInput` und damit keinen.

Der Scan landet über denselben Weg im Formular wie eine Tastatureingabe:
`onIbanDetected` ruft `applyIban`, das ruft das `onChange` des Screens
(`handleChange`), und das schreibt den Wert nach `formData[fieldId].value`.
Eine eigene Sonderbehandlung für gescannte Werte gibt es nicht — und soll es
nicht geben.

Nicht gerendert werden derzeit `value_string-bic` und `value_string-address`:
für diese beiden `custom_id`s hat der Screen keinen Zweig, das Feld bleibt leer.
Das ist unabhängig von der IBAN und hier nicht angefasst.

### Die Leerzeichen im Feld

Der Wert trägt die gedruckte Gruppierung (`DE89 3704 0044 …`) — im Feld, im
`formData` und in `value_string`. Das ist Absicht: so liest man eine IBAN zur
Kontrolle ab. Nachgelagert stört es niemanden, der Server räumt es selbst weg:
`FormHelper.generateBankAccountBoxesHtml` entfernt für die PDF-Kästchen jeden
Whitespace, und der Markdown-Zweig ruft `FormHelperCommon.formatIban` auf den
gespeicherten Wert — auf einen schon gruppierten Wert angewandt ändert das
nichts, die Funktion ist idempotent.

**Zwei Messungen waren aber am falschen String genommen**, und beide fielen erst
mit den Leerzeichen auf:

- `maxLength={34}` zählte die Leerzeichen mit. 34 ist die Länge der *Nummer*;
  mit Gruppierung wird die längste IBAN 42 Zeichen lang. Von den Ländern im
  Register sind zwölf lang genug, dass ihnen die letzte Gruppe abgeschnitten
  wurde (BR, EG, JO, KW, LC, MT, MU, PS, QA, RU, SC, UA). Jetzt
  `FormHelperCommon.IBAN_MAX_FORMATTED_LENGTH`.
- Die Prüfung „kürzer als 15?" lief ebenfalls auf dem angezeigten String. Mit
  Gruppierung ist ein 13-Zeichen-Fragment 16 Zeichen lang und rutschte durch;
  effektiv prüfte die Regel „mindestens 12". Jetzt fragt das Feld
  `IbanRecognitionHelper.getIbanFieldProblem`, und das normalisiert zuerst.

Dabei ist auch ein zweiter Fehlerfall dazugekommen: eine IBAN mit richtiger
Länge, aber falschen Prüfziffern, blieb vorher stumm — jetzt sagt das Feld
`iban_invalid_checksum`.

**Offen:** ein Feldfehler blockiert das Absenden nicht.
`validateRequiredFormAnswers` prüft nur, ob Pflichtfelder überhaupt gefüllt
sind; `formData[...].error` wird beim Absenden nicht angesehen. Eine IBAN mit
falscher Prüfsumme lässt sich also weiterhin abschicken. Das betrifft alle
Feldtypen gleichermaßen und ist bewusst nicht in diesem Zug geändert.

## Die Architektur in einem Satz

**Bildaufnahme und Texterkennung sind getrennt.** Die App besorgt ein Bild —
von der Kamera oder aus den Fotos — und reicht es an die Erkennung weiter. Die
Erkennung weiß nicht, woher es kommt.

## `useOcr`: Text lesen, egal woher das Bild kommt

`hooks/useOcr.tsx` ist die Schicht, die alles über Kameras, Fotorollen und
Engines weiß. Wer sie benutzt, sagt nur, **wonach** gesucht wird — nicht, wie
man dahin kommt:

```ts
openOcr<IbanCandidate>({
  title, hint,
  findMatch: (lines) => IbanRecognitionHelper.findIban(lines, { … }),
  onRecognized: ({ match }) => …,
});
```

Beim Öffnen fragt sie, woher das Bild kommen soll:

| | |
| --- | --- |
| **Kamera (automatisch)** | Tastet die laufende Vorschau ab und schließt sich selbst, sobald `findMatch` etwas findet. Ohne Auslöser, ohne Zutun. |
| **Kamera** | Vorschau mit Auslöser: ein bewusstes Standbild, das für sich gelesen wird. Besser, um etwas ruhig zu halten. |
| **Foto auswählen** | Ein Bild, das schon auf dem Gerät liegt. Wird einmal gelesen; was dabei herauskommt, ist das Ergebnis. |

**Die automatische Kamera erscheint nur, wenn `findMatch` übergeben wurde.** Ein
Scan, der seinen eigenen Erfolg nicht erkennen kann, würde nie von selbst enden
— deshalb ist die Option dort schlicht nicht da.

`components/GiroCardIbanScanner` ist damit auf das eine geschrumpft, was
wirklich mit IBANs zu tun hat: was als Fund zählt. Der Screen
**Experimentell → Texterkennung testen** benutzt dieselbe Schicht ohne
`findMatch` und zeigt einfach jede erkannte Zeile.

### Die Vorschau ist auf 420 px gedeckelt

Ein Modal im Desktop-Browser ist so breit wie das Fenster. Eine ungedeckelte
Vorschau drückt Statuszeile und Knöpfe unter den Rand — und die Lesung, die
niemand sieht, ist die Lesung, die niemand bekommt.

### Die Engine: PaddleOCR auf onnxruntime

Erster Versuch war `expo-text-extractor` (ML Kit / Apple Vision). Das scheiterte
im Web — iOS Safari hat kein `TextDetector`. Zweiter Versuch war Tesseract, das
auf beiden Seiten läuft und ohne nativen Build auskommt. An vierzehn
fotografierten Karten gemessen war es aber deutlich schlechter als PaddleOCR
(5 von 11 richtig und 2 falsch gegenüber 9 von 11 und 0 falsch, bei rund 1 s
statt rund 0,2 s pro Bild), und deshalb liegt jetzt PaddleOCR darunter:
`ppu-paddle-ocr` mit den Modellen PP-OCRv6 tiny.

- **Web:** onnxruntime-web, also WebAssembly.
- **Native:** `onnxruntime-react-native` und `@shopify/react-native-skia` —
  beides native Module. Das kostet einen echten Build (Buildnummer 207) statt
  eines OTA-Updates. Dafür gibt es **keine WebView mehr**, und damit ist auch
  der Absturz weg, den die WebView neben der Kamera verursacht hat.

### Zwei Fallstricke, die hier Blut gekostet haben

Beide sehen von außen aus wie nichts: der Scanner funktioniert weiter, er lädt
nur vorher bei einem Dritten nach.

- **`ort.env.wasm.wasmPaths`.** onnxruntime-web trägt hier beim Import eine
  jsDelivr-URL ein. Der Web-Hook überschreibt sie bedingungslos mit dem eigenen
  Verzeichnis — die Bibliothek setzt ihren Default nur, wenn das Feld leer ist,
  „nichts tun" genügt also nicht.
- **Die Execution Provider müssen auf `wasm` festgenagelt sein.** Sonst fragt
  die Bibliothek zuerst WebGPU an, onnxruntime lädt dann eine *andere*,
  WebGPU-fähige WebAssembly-Datei — die hier nicht liegt. Im Browser gemessen:
  404 auf `ort-wasm-simd-threaded.jsep.mjs`, und direkt dahinter das CDN.

### Ein dritter: Metro kann onnxruntime-web nicht bündeln

Die veröffentlichten Bundles rufen `import(irgendeineVariable)` auf, um ihren
WebAssembly-Loader zu holen, und Metro bricht den ganzen Web-Build daran ab.
Deshalb wird die Runtime **nicht gebündelt**, sondern wie die Modelle als
gewöhnliches Skript aus `public/paddleocr/` geladen; `metro.config.js` löst
`onnxruntime-web` auf `helper/onnxruntimeFromPage.js` auf, und der Web-Hook
importiert `ppu-paddle-ocr/web` erst, nachdem das Skript geladen ist.

### Datenschutz: nichts vom CDN

Alles liegt im Repo unter `apps/frontend/app/public/paddleocr/` (rund 20 MB:
Modelle 6,4 MB, onnxruntimes WebAssembly 14,2 MB, das sich auf etwa 3,7 MB
komprimiert). Am gebauten Web-Export nachgemessen: **genau sechs Anfragen, alle
vom eigenen Origin.** (Die App lädt an anderer Stelle einen Lottie-Player von
jsDelivr — das ist nicht die Texterkennung und ein eigener Punkt.)

Auf dem Gerät werden die Modelle als Metro-Assets mitgeliefert und über
`File.arrayBuffer()` eingelesen: `fetch` kann in React Native kein `file://`
lesen, ein Pfad würde die Engine also ins Netz schicken.

## Die Dateien

| Datei | Wofür |
| --- | --- |
| `packages/common/src/form/IbanRecognitionHelper.ts` | Die IBAN aus erkannten Zeilen. Prüfsumme (mod-97), Längenregister, OCR-Verwechslungen, die beiden Formregeln unten. Ohne Kamera- oder OCR-Abhängigkeit, damit sie testbar bleibt. |
| `apps/frontend/app/helper/TextRecognitionShared.ts` | Was sich Web und Native teilen: Modellnamen, Schärfemaß, `TextRecognitionApi`. |
| `apps/frontend/app/hooks/useTextRecognition.tsx` | Native: Modelle aus dem Bundle lesen, onnxruntime-react-native, Schärfe über Skia. |
| `apps/frontend/app/hooks/useTextRecognition.web.tsx` | Web: onnxruntime-web als Skript, dann `ppu-paddle-ocr/web`. |
| `apps/frontend/app/helper/onnxruntimeFromPage.js` | Der Platzhalter, auf den Metro `onnxruntime-web` auflöst. |
| `apps/frontend/app/public/paddleocr/` | Modelle und Runtime, mit README zu Herkunft und Größen. |
| `apps/frontend/app/components/GiroCardIbanScanner/index.tsx` | Kamera-Vorschau, Auslöser, Kamerawechsel, Licht, Unschärfe-Hinweis. |
| `apps/frontend/app/components/IBANInput/IBANInput.tsx` | Der Kamera-Button neben dem Feld. |
| `apps/frontend/app/app/(app)/experimentell/giro-card-iban/` | Der Testscreen. |

## Was nachweislich funktioniert

- **Web, gebauter Export, echte Kamera** (Playwright mit Fake-Kamera): die IBAN
  steht nach 5,5 s im Feld, der Auslöser liest sein Standbild, meldet die
  Unschärfe, und „Neues Foto" bringt die Vorschau zurück. **Sechs Anfragen für
  die Engine, alle vom eigenen Origin.**
- **Nativer Export gebaut:** 100 Assets, darin die beiden `.ort`-Modelle und das
  Wörterbuch. Keine Tesseract-Reste, keine Testbilder.
- 384 Tests in `packages/common`, 103 im Frontend.

## Was nachweislich nicht funktioniert

- **Der Scanner auf einem echten Gerät ist ungetestet.** Hier steht keines zur
  Verfügung. Der Absturz sollte weg sein, weil die WebView weg ist — bestätigen
  kann das nur ein Gerät.
- **Frontkamera-Fotos waren für Tesseract unlesbar** (Schärfe 3–7 gegenüber
  266–430). Ob PaddleOCR damit besser umgeht, ist nicht gemessen; die
  Schärfemessung ist deshalb **kein Tor mehr**, sondern nur noch die Begründung,
  wenn nichts gelesen wurde. Der alte Schwellwert hätte `Test_2` (Schärfe 9)
  abgewiesen, das PaddleOCR korrekt liest.

## Die zwei Formregeln, und warum es sie gibt

An den 14 Kartenfotos gemessen hat die Erkennung IBANs *erfunden*: aus
„Volksbanken / Eva Oberberg eG" wurde `NO53VAOBERBERGE`, aus dem „Gültig bis"
über der Nummer `GI11TIGBIS…`, aus „girocard Robert Schumann"
`SE16ITOCARDROBERTSCHUMAN` — jedes in der richtigen Länge für sein Land, keines
auf der Karte. Etwa eine von 97 solchen Erfindungen besteht die Prüfsumme
zufällig, und der Scanner sieht mehrere Bilder pro Sekunde an.

1. **Eine Lesung beginnt dort, wo die Karte anfängt etwas zu drucken** — nie
   mitten in einem Wort.
2. **Ohne Prüfsumme muss eine Lesung aussehen wie etwas Gedrucktes**
   (`IbanCandidate.looksPrinted`): sie endet, wo eine Gruppe endet — oder
   mitten in einer Gruppe, die nur aus Ziffern besteht, weil Engines die letzte
   Gruppe regelmäßig mit dem Datum dahinter verschweißen. Und sie trägt
   Buchstaben nur in ihren ersten vier Zeichen, dort wo jede IBAN welche hat.
   Geprüft an dem, was die Engine gelesen hat, nicht an der daraus gebauten
   Lesung: für Länder mit rein numerischer BBAN sind die Buchstaben dort längst
   zu Ziffern gemacht, und das verräterische `BIS` mitten in
   `LT16BISDE00012345678` wäre verschwunden.

   Preis: ein Land, dessen Kontoteil legitim Buchstaben trägt (GB, NL, GI),
   wird ohne gültige Prüfsumme nicht gelesen. Eine echte Karte hat immer eine.

Ergebnis an den 14 Bildern, mit Tesseract: vorher 2 von 11 IBAN-Karten richtig
und 5 Erfindungen, jetzt 5 richtig, 2 falsch (beides verlesene Zeichen, die eine
echte Prüfsumme abfinge), 0 Erfindungen. Mit PaddleOCR 9 richtig, 0 falsch, 0
Erfindungen. Details und die Einzelbefunde stehen in
`packages/common/src/__tests__/fixtures/bankcards/README.md`.

## Was als Nächstes zu tun wäre

1. **Auf einem Gerät prüfen.** Das ist der einzige offene Punkt, der zählt: ob
   der Scanner dort läuft und ob der Absturz mit der WebView verschwunden ist.
   Dafür braucht es einen neuen Dev-Client-Build (Buildnummer 207) — ein
   OTA-Update reicht nicht mehr, die beiden neuen Module sind nativ.
2. **`MINIMUM_SHARPNESS` neu vermessen.** Der Wert 12 stammt von Tesseract. Er
   ist jetzt nur noch die Begründung für eine leere Lesung, kein Tor mehr, aber
   er sollte an Aufnahmen der neuen Engine kalibriert werden.
3. **`Test_1` und `Test_4`** bleiben ungelesen: einmal findet die Engine die
   Zeile mit der Nummer gar nicht, einmal verliert sie Ziffern mitten darin. Ein
   größeres Modell (`v6-small`, `v6-medium`) könnte das lösen und kostet
   Bundle-Größe — nicht gemessen.
4. **Der Lottie-Player lädt von jsDelivr.** Beim Nachmessen der Engine-Requests
   aufgefallen, hat mit der Texterkennung nichts zu tun, ist aber dasselbe
   Datenschutzthema.
5. **PR #4400** (Diagnosescreen für die WebView-Kette) ist gegenstandslos,
   seit es keine WebView mehr gibt.
6. **Nie committen:** die zwei Frontkamera-Fotos einer echten Karte aus dem
   Gesprächsverlauf. Die IBAN darauf ist prüfsummengültig und das Repo ist
   öffentlich.
