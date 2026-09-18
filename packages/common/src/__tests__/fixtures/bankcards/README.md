# Photographed bank cards

Fourteen photographs of bank cards, and what Tesseract made of each of them.
Test material for reading an IBAN off a card
(`IbanRecognitionHelper`, `packages/common/src/form/IbanRecognitionHelper.ts`)
and the benchmark behind `src/__tests__/BankCardIbanRecognition.test.ts`.

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

## What the benchmark says

Not a single card is recognized by the scanner as it runs in the app, because
the app demands a valid checksum and no dummy number has one. That is the first
thing the test pins down. Everything below is the reading with
`allowInvalidChecksum: true`, the toggle the experimental screen offers so that
a specimen card can be scanned at all.

Eleven of the fourteen cards print an IBAN. Five of those are read correctly:

- `Test_1`, `Test_6`, `Test_7`, `Test_8` — the `DE00 0123 4567 8901 2345 67`
  cards, including the two whose `00` came back as `QD` and `OD`.
- `Test_14` — `DE12 3456 7890 1234 5678 90`.

Four are not read at all, and the helper says nothing rather than guessing:

- `Test_2` (sharpness 9) and `Test_11`, `Test_12` — too soft for the engine to
  return a single usable line. Below `MINIMUM_SHARPNESS` the scanner turns the
  frame away before the engine ever sees it.
- `Test_9` — sharp enough, but the card is small in the frame; after the scale
  to 1600 px the number is too few pixels tall to resolve.
- `Test_4` and `Test_13` — the engine dropped and swapped digits inside the
  number (`46787Y23475678`, `den 0123 4567 801 235 67`). What is left does not
  sit on the card the way a printed number does, so it is refused.

Two are read wrongly, and both are the engine misreading a character the
checksum would have caught:

- `Test_3` → `BE12345678901234`. `DE12` came back as `bEI2`, and `BE` is a
  country too. Belgium's IBANs are sixteen characters, so the reading stops
  after four groups.
- `Test_5` → `DE95 1235 4678 1234 5678 90`. The second `9` of `DE99` came back
  as `S`, which is a `5`.

Three cards print no IBAN at all (`Test_10`, `Test_11`, `Test_12` — a Visa and
two Mastercards). None of them produces one.

## What this folder is really for

Two of the rules in `IbanRecognitionHelper` exist because of these images, and
the test holds them in place:

- **A reading starts where the card starts printing something.** Glue
  `Volksbanken` to `Eva Oberberg eG` and slide a window through it, and you
  eventually land on `NO53VAOBERBERGE` — a Norwegian IBAN, correct length,
  nowhere on the card.
- **Without a checksum, a reading has to look printed**: groups of at most
  four, ending where a group ends. `Gültig bis` in front of the number really
  does read as `GI11 TIGB IS…`, and `girocard` plus a cardholder really does
  read as `SE16 ITOC ARD…`. Roughly one such invention in ninety-seven passes
  mod-97 by chance, and the scanner looks at several frames a second.

## Re-recording the readings

`recognizedLines` came from the bundled engine under the conditions the app
uses — the frame scaled to 1600 px, JPEG quality 0.8, `eng` traineddata. A
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
