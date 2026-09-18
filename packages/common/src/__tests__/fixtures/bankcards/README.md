# Photographed bank cards

Fourteen photographs of bank cards, and what two OCR engines made of each of them.
Test material for reading an IBAN off a card
(`IbanRecognitionHelper`, `packages/common/src/form/IbanRecognitionHelper.ts`)
and the benchmarks behind `src/__tests__/BankCardIbanRecognition.test.ts` and
`src/__tests__/BankCardEngineComparison.test.ts`.

All of them are public specimen cards or marketing renders. Every cardholder is
a `Mustermann`, a `Toni Raiffeisen` or an `A N Other`, every expiry date is
`00/00` or long past, and **every printed IBAN is a dummy**: it has the shape
and the length of a real one but check digits that can never validate. Nothing
here belongs to anybody.

## What is in here

| File | What it is |
| --- | --- |
| `Test_<number>_<printed number>.png` | The photo. The name carries what the card prints, as it was delivered. |
| `bank-cards.ocr.json` | What Tesseract returned for each photo, plus the number actually printed on it and the reading the helper gets out of it. |
| `bank-cards.paddleocr.json` | The same for PaddleOCR, recorded through `ppu-paddle-ocr` on onnxruntime. |

The images are **not** compiled into any app. Nothing imports this folder;
Metro only bundles what is `require`d, and the `expo export` asset manifest
lists none of them (see the check at the bottom of this file). They are test
material and stay test material — eleven megabytes of them.

### The filenames of Test_3, Test_4 and Test_13 are off

Three names carry a digit too many or too few next to the card. The images were
delivered under those names and keep them; what the card prints is recorded in
`printedIban`, read off the photo by eye, and that is what the test measures
against.

| File | Name says | Card prints |
| --- | --- | --- |
| `Test_3_DE123456678901234567890.png` | `DE12 3456 6789 0123 4567 890` | `DE12 3456 7890 1234 5678 90` |
| `Test_4_DE9912354678123456780.png` | `DE99 1235 4678 1234 5678 0` | `DE99 1235 4678 1234 5678 90` |
| `Test_13_DE000123456778901234567.png` | `DE00 0123 4567 7890 1234 567` | `DE00 0123 4567 8901 2345 67` |

## Zwei Engines, dieselben Bilder

`bank-cards.ocr.json` hält fest, was **Tesseract** aus diesen Fotos macht,
`bank-cards.paddleocr.json`, was **PaddleOCR** (PP-OCRv6 tiny, über
`ppu-paddle-ocr` auf onnxruntime) daraus macht. Gleiche Bilder, gleicher
`IbanRecognitionHelper` — nur die Engine ist anders, und nur so lässt sich ein
Engine-Problem von einem Lese-Problem unterscheiden.

Vorweg das, was für beide gilt: **keine einzige dieser Karten wird vom Scanner
erkannt, wie er in der App läuft.** Die App verlangt eine gültige Prüfsumme, und
keine Dummy-Nummer hat eine. Alles Folgende ist die Lesung mit
`allowInvalidChecksum: true`, dem Schalter, den der experimentelle Screen für
genau diesen Zweck anbietet.

Elf der vierzehn Karten drucken eine IBAN.

| | Tesseract | PaddleOCR |
| --- | --- | --- |
| richtig gelesen | 5 von 11 | **9 von 11** |
| falsch gelesen | 2 | **0** |
| nichts gelesen | 4 | 2 |
| Karten ohne IBAN, korrekt abgelehnt | 3 von 3 | 3 von 3 |
| Zeit pro Bild | rund 1 s | rund 0,2 s |

Was Tesseract falsch liest, liest es **plausibel** falsch: `Test_3` wird zu
`BE12345678901234`, weil `DE12` als `bEI2` zurückkommt und Belgien auch ein Land
ist; `Test_5` wird zu `DE95 …`, weil die zweite `9` als `S` gelesen wird. Beides
fiele über die Prüfsumme auf — aber es zeigt, wie wenig Spielraum zwischen
„richtig" und „falsch" liegt.

Die zwei Karten, an denen auch PaddleOCR scheitert, sind ehrliche Grenzen:

- `Test_1` — die Zeile mit der Nummer wird gar nicht erst als Textbereich
  gefunden.
- `Test_4` — sie wird gefunden, aber die Engine verliert Ziffern mitten in der
  Nummer (`DE99 1235 467 8`). Da ist nichts mehr zu lesen, und der Helper sagt
  das, statt zu raten.

Bemerkenswert ist `Test_2`: Schärfe 9, deutlich unter `MINIMUM_SHARPNESS`, und
Tesseract bringt daraus eine einzige Zeile `La` zustande. PaddleOCR liest die
IBAN korrekt. Der Schärfe-Schwellwert ist auf Tesseract kalibriert und müsste
mit einer anderen Engine neu vermessen werden.

## Die drei Karten ohne IBAN

`Test_10`, `Test_11` und `Test_12` sind eine Visa- und zwei Mastercard-Muster
ohne IBAN; der Dateiname trägt dort die Kartennummer. Keine der beiden Engines
verleitet den Helper dazu, daraus eine IBAN zu machen.

## What this folder is really for

Two of the rules in `IbanRecognitionHelper` exist because of these images, and
the test holds them in place:

- **A reading starts where the card starts printing something.** Glue
  `Volksbanken` to `Eva Oberberg eG` and slide a window through it, and you
  eventually land on `NO53VAOBERBERGE` — a Norwegian IBAN, correct length,
  nowhere on the card.
- **Every reading has to be shaped like an IBAN of its country.** ISO 13616
  fixes not only a length per country but a character pattern: Sweden's account
  part is twenty digits and no letters, so `girocard` plus a cardholder, which
  really does read as `SE16 ITOC ARDR OBER TSCH UMAN`, is not a candidate at
  all. That table comes from the `iban` package — see `IbanValidationHelper`.
- **Without a checksum, a reading has to look printed**: it stops where a group
  stops (or inside a group of digits an engine welded to the date behind it),
  and it carries letters only where every IBAN does, in its first four
  characters. `Gültig bis` in front of the number really does weld into
  `LT16BISDE00012345678`, and Gibraltar's account part does allow the letters
  in it. Roughly one such invention in ninety-seven passes mod-97 by chance,
  and the scanner looks at several frames a second.

  The price is that a country whose account part legitimately carries letters
  (GB, NL, GI and others) is not read without a valid checksum. A real card
  always has one; only a specimen card with dummy check digits does not, and
  inventing a number for one of those is the worse outcome.

## Re-recording the readings

`recognizedLines` in `bank-cards.ocr.json` came from the bundled Tesseract under
the conditions the app uses — the frame scaled to 1600 px, JPEG quality 0.8,
`eng` traineddata. Those in `bank-cards.paddleocr.json` came from
`ppu-paddle-ocr` 6.6.0 on `onnxruntime-node`, PP-OCRv6 tiny, against the full
image. A
different engine version or a different scale splits a card differently, which
is the point of keeping a recorded sample rather than running the engine in the
test: this suite is `ts-jest` in Node, the engine is WebAssembly in a browser
or a WebView.

`recognized` is the outcome the helper produces for those lines. It lives in
the fixture on purpose: a change to the helper that moves a card shows up as a
diff on that file.

## Checking that the images stay out of the app

```
cd apps/frontend/app
npx expo export --platform android --output-dir /tmp/native-export
grep -c 'bankcards' /tmp/native-export/metadata.json   # must print 0
```
