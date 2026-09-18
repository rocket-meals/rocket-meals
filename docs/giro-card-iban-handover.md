# Girocard-IBAN-Scanner — Handover

Stand: 2026-09-18. Branch `claude/giro-card-iban-camera-blws22` (PR #4399),
Diagnose-Ableger `claude/text-recognition-native-diagnose` (PR #4400).

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

## Die Architektur in einem Satz

**Bildaufnahme und Texterkennung sind getrennt.** Die App nimmt mit der
plattformeigenen Kamera (`expo-camera`) ein Bild auf und reicht dieses Bild an
Tesseract weiter. Mehr macht das Modal nicht.

### Warum Tesseract und keine native Texterkennung

Erster Versuch war `expo-text-extractor` (ML Kit / Apple Vision). Das scheiterte
im Web — iOS Safari hat kein `TextDetector` — und hätte für native einen neuen
Binary-Build gebraucht. Tesseract läuft auf beiden Seiten und geht als
OTA-Update raus. Kein neues natives Modul, keine neue Buildnummer.

### Warum auf native eine WebView im Spiel ist

Tesseract ist WebAssembly. **Hermes hat kein WebAssembly**, also kann die Engine
nicht im JS-Kontext der App laufen. Was jedes Gerät aber hat, ist eine WebView,
und darin läuft sie. Die WebView ist dabei *nur* die Engine — ein Pixel groß,
unsichtbar, ohne UI. Die Kamera hat mit ihr nichts zu tun.

### Warum Kamera und WebView sich nie gleichzeitig auf dem Schirm befinden

Genau das war der Absturz. Kamera-Vorschau und WebView wollen beide eine
Hardware-Surface; ein Screen, der beides hält, zeigt eine leere Vorschau und
nimmt die App mit. Deshalb:

- `useTextRecognition({ isCameraActive })` — der Aufrufer sagt, was gerade auf
  dem Schirm ist. Die WebView wird nur gemountet, wenn die Vorschau weg ist,
  und auch dann erst `SURFACE_SETTLE_IN_MS` (250 ms) später: React nimmt die
  Vorschau in einem Rutsch aus dem Baum, die Kamera gibt ihre Surface aber in
  ihrem eigenen Tempo zurück.
- `runsAlongsideCamera` — die Engine sagt, ob sie neben einer laufenden Vorschau
  arbeiten darf. Im Browser ja (Dauer-Sampling der Vorschau), auf dem Gerät
  nein (Auslöser → Vorschau verschwindet → Standbild wird gelesen).
- Der Scanner rendert `CameraView` **oder** das Standbild, nie beides.

### Datenschutz: nichts vom CDN

Die komplette Engine liegt im Repo unter `apps/frontend/app/public/tesseract/`
(5,9 MB): `tesseract.min.js`, `worker.min.js`, `tesseract-core-simd-lstm.js`
und `.wasm`, `eng.traineddata.gz`. Zur Laufzeit geht **keine einzige Anfrage**
nach außen; im gebauten Web-Export nachgemessen.

Zwei Fallstricke, die dabei Blut gekostet haben und nicht wieder eingebaut
werden dürfen:

- `workerBlobURL: false` ist Pflicht. Ein Blob-Worker hat keine Basis-URL,
  über die der Core-Loader sein `.wasm` daneben findet → „Failed to parse URL".
- Metro bündelt `.js` **als Quelltext, nie als Asset**. Die drei Skripte liegen
  deshalb zusätzlich als `.txt`-Kopien unter `assets/tesseract/` (263 KB), und
  `metro.config.js` führt `txt`, `gz`, `wasm` in `assetExts`. Beim Start werden
  sie als echte Nachbardateien ins Cache-Verzeichnis entpackt
  (`unpackEngine`), weil Loader und Worker ihre Nachbarn über relative Namen
  suchen.

## Die Dateien

| Datei | Wofür |
| --- | --- |
| `packages/common/src/form/IbanRecognitionHelper.ts` | Die IBAN aus erkannten Zeilen. Prüfsumme (mod-97), Längenregister, OCR-Verwechslungen, die beiden Formregeln unten. Ohne Kamera- oder OCR-Abhängigkeit, damit sie testbar bleibt. |
| `apps/frontend/app/helper/TextRecognitionShared.ts` | Was sich Web und Native teilen: Engine-Dateinamen, Schärfemaß, die HTML-Seite der Engine, `TextRecognitionApi`. |
| `apps/frontend/app/hooks/useTextRecognition.tsx` | Native: Entpacken, die versteckte WebView, `isCameraActive`. |
| `apps/frontend/app/hooks/useTextRecognition.web.tsx` | Web: tesseract.js im Worker, aus eigener Origin. |
| `apps/frontend/app/components/GiroCardIbanScanner/index.tsx` | Kamera-Vorschau, Auslöser, Kamerawechsel, Licht, Unschärfe-Hinweis. |
| `apps/frontend/app/components/IBANInput/IBANInput.tsx` | Der Kamera-Button neben dem Feld. |
| `apps/frontend/app/app/(app)/experimentell/giro-card-iban/` | Der Testscreen. |

## Was nachweislich funktioniert

- **Web, gebauter Export, echte Kamera** (Playwright mit Fake-Kamera): alle fünf
  Engine-Dateien kommen von `/rocket-meals/tesseract/`, **null** Anfragen
  verlassen die Origin, IBAN nach ~5,5 s erkannt, Feld gefüllt, Modal zu.
  Unschärfe-Hinweis nach ~4,5 s.
- **Die 14 Kartenfotos** unter `packages/common/src/__tests__/fixtures/bankcards/`
  werden nicht mitkompiliert: das Asset-Manifest eines Android-Exports listet
  102 Assets und keinen Verweis darauf.
- 374 Tests in `packages/common`, 98 im Frontend.

## Was nachweislich nicht funktioniert

- **Frontkamera-Fotos sind unlesbar.** Gemessen: Schärfe 3–7 gegenüber 266–430
  bei der Rückkamera. Über 30 Vorverarbeitungs-Kombinationen probiert, keine
  rettet das. Eine Frontkamera hat Fixfokus und kann auf Kartenabstand nicht
  scharfstellen. Deshalb der Unschärfe-Hinweis statt stiller Weitersuche
  (`MINIMUM_SHARPNESS = 12`, Laplace-Varianz).
- **Der native Absturz** war bis zuletzt offen. Die Trennung oben ist die
  Reparatur dafür, aber **auf einem echten Gerät noch nicht bestätigt** — hier
  steht keines zur Verfügung. Das ist der wichtigste offene Punkt.

## Die zwei Formregeln, und warum es sie gibt

An den 14 Kartenfotos gemessen hat die Erkennung IBANs *erfunden*: aus
„Volksbanken / Eva Oberberg eG" wurde `NO53VAOBERBERGE`, aus dem „Gültig bis"
über der Nummer `GI11TIGBIS…`, aus „girocard Robert Schumann"
`SE16ITOCARDROBERTSCHUMAN` — jedes in der richtigen Länge für sein Land, keines
auf der Karte. Etwa eine von 97 solchen Erfindungen besteht die Prüfsumme
zufällig, und der Scanner sieht mehrere Bilder pro Sekunde an.

1. **Eine Lesung beginnt dort, wo die Karte anfängt etwas zu drucken** — nie
   mitten in einem Wort.
2. **Ohne Prüfsumme muss eine Lesung aussehen wie etwas Gedrucktes**: Gruppen
   von höchstens vier, endend dort wo eine Gruppe endet
   (`IbanCandidate.looksPrinted`).

Ergebnis an den 14 Bildern: vorher 2 von 11 IBAN-Karten richtig und 5
Erfindungen, jetzt 5 richtig, 2 falsch (beides verlesene Zeichen, die eine echte
Prüfsumme abfinge), 0 Erfindungen. Details und die Einzelbefunde stehen in
`packages/common/src/__tests__/fixtures/bankcards/README.md`.

## Was als Nächstes zu tun wäre

1. **Auf einem Gerät prüfen, ob der Absturz weg ist.** Falls nicht: PR #4400 hat
   einen Diagnosescreen (Experimentell → Texterkennung-Diagnose), der die Kette
   in drei einzeln startbaren Stufen durchgeht (Entpacken → nackte WebView →
   Engine-Seite). Welche Stufe zuletzt zu sehen war, bevor die App weg ist,
   benennt den Schuldigen.
2. **Falls die WebView auf dem Gerät grundsätzlich nicht tragfähig ist**, bleibt
   nur ein natives OCR-Modul (ML Kit auf Android, Vision auf iOS, z. B. über
   `expo-text-extractor`) — mit neuer Buildnummer, und Web weiter über
   Tesseract. Die Trennung von Aufnahme und Erkennung ist genau die Fuge, an der
   das ausgetauscht werden kann: `TextRecognitionApi` bliebe wie sie ist.
3. **`Test_3` und `Test_5`** werden falsch gelesen, weil Tesseract `DE12` als
   `bEI2` und `DE99` als `DE9S` zurückgibt. Eine Buchstabenverwechslungs-Tabelle
   für die Länderkennung würde das auffangen, bringt aber Mehrdeutigkeit
   (DE/BE/SE) — bewusst nicht gemacht.
4. **Nie committen:** die zwei Frontkamera-Fotos einer echten Karte aus dem
   Gesprächsverlauf. Die IBAN darauf ist prüfsummengültig und das Repo ist
   öffentlich.
