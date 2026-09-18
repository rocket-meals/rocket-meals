# Bundled text recognition engine

Tesseract, vendored into the app on purpose: the scanner reads a photographed
bank card, and neither that photo nor the request for the engine should reach a
third party. Nothing here is fetched from a CDN at runtime — the whole engine
ships with the app and works offline.

| File | What it is | Upstream |
| --- | --- | --- |
| `tesseract.min.js` | The library that drives the engine | `tesseract.js@7.0.0/dist/tesseract.min.js` |
| `worker.min.js` | Its worker, which does the actual reading | `tesseract.js@7.0.0/dist/worker.min.js` |
| `tesseract-core-simd-lstm.js` | Loader for the WebAssembly core (LSTM only, SIMD) | `tesseract.js-core@7.0.0` |
| `tesseract-core-simd-lstm.wasm` | That core. The loader fetches it as its neighbour, so the two belong in one directory | `tesseract.js-core@7.0.0` |
| `eng.traineddata.gz` | The English model. English is right for a bank card even in Germany: an IBAN is digits and Latin letters | `@tesseract.js-data/eng@1.0.0/4.0.0_best_int` |

Both packages are Apache-2.0; the license texts are next to the files.

**SIMD** is safe to require here: the app's iOS deployment target is 16.4, the
version in which WebKit shipped WebAssembly SIMD, and every Android WebView the
app supports has had it far longer.

## Who reads what

- **Web** serves this directory as-is, from the app's own origin, at
  `<base>/tesseract/`.
- **Native** cannot serve a directory, so it copies the same files into the app's
  cache directory and points a hidden WebView at them. Three of them are also
  kept under `assets/tesseract/` with a `.txt` suffix, because Metro bundles a
  `.js` file as source code rather than as an asset — the `.txt` copies are the
  only duplication, 263 KB in total.

## Updating

Replace the files, adjust `TESSERACT_VERSION` in
`helper/TextRecognitionShared.ts`, re-copy the three `.txt` duplicates, and scan
the fixture card again — `packages/common/src/__tests__/fixtures/girocard`
records what the engine reads, and a new version may read it differently.
