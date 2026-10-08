# Bundled text recognition engine

PaddleOCR (PP-OCRv6 tiny) and the WebAssembly build of onnxruntime it runs on.
Everything the scanner needs is in this folder, and **nothing is fetched from a
third party at runtime** — not in the browser, and not on a device.

| File | What it is | Size |
| --- | --- | --- |
| `PP-OCRv6_tiny_det.ort` | Text detection model — finds the lines on the card. | 1.9 MB |
| `PP-OCRv6_tiny_rec.ort` | Text recognition model — reads the characters. | 4.5 MB |
| `ppocrv6_tiny_dict.txt` | The character dictionary the recognition model indexes into. | 27 KB |
| `ort-wasm-simd-threaded.wasm` | onnxruntime's WebAssembly build. | 14.2 MB |
| `ort-wasm-simd-threaded.mjs` | The loader beside it, for the browser. | 24 KB |
| `ort.wasm.min.js` | The onnxruntime library, for the browser. | 50 KB |
| `text-recognition-page.webviewjs` | The page a device runs the engine on: onnxruntime (loader included), `ppu-paddle-ocr` and the shared helpers, bundled. **Generated** — see below. | 120 KB |

## One engine, every platform

The browser loads `ort.wasm.min.js` from this folder, which fetches the `.mjs`
loader and the `.wasm` beside it, and reads the models by URL
(`hooks/useTextRecognition.web.tsx`).

A device runs the very same WebAssembly, inside a WebView. The app requires the
`.wasm`, the three model files and `text-recognition-page.webviewjs` as Metro
assets, and at first use composes them into **one HTML document** with
everything base64-inlined (`helper/textRecognitionPage/`). The document is
about 28 MB, is written to the cache directory once per version, and needs
nothing from anywhere: a page loaded from `file://` cannot reliably fetch its
neighbours, so it has none. Frames go in and text comes out through
`react-native-webview`'s message bridge (`protocol.ts`).

There is no native engine any more. `onnxruntime-react-native` crashed the app
on Android before a single frame was read, and it was the one thing the three
platforms did not share.

## Why this is in the repository

A function that photographs a bank card should not tell a third party that
someone is photographing a bank card. The photo itself never leaves the device;
loading the engine from a CDN would leak the rest.

Three defaults have to be overridden for that to hold, and all are easy to undo
by accident:

- **`ort.env.wasm.wasmPaths`.** `onnxruntime-web` sets this to a jsDelivr URL
  when it is imported, and `ppu-paddle-ocr` does the same. The web hook
  overwrites it with this folder's URL; the page clears it and hands the
  bytes over as `wasmBinary` instead — either way unconditionally, because the
  libraries only fill in their default while the field is empty.
- **The model paths.** `ppu-paddle-ocr` falls back to a Hugging Face URL for
  each model and for the dictionary. All three are passed explicitly, as URLs
  in the browser and as bytes on the page.
- **The backend.** Left alone the library asks for WebGPU first, which makes
  onnxruntime load a different WebAssembly file that is not here. The backend
  is pinned to `wasm`.

`__tests__/textRecognitionOffline.test.ts` holds all of it in place: no `http`
URL in the files that build the engine, every file above present, every path
set. From the outside a lapse looks like nothing at all — the scanner keeps
working, it just phones home first.

## Rebuilding the page bundle

`text-recognition-page.webviewjs` is built from
`helper/textRecognitionPage/page.ts` by esbuild and committed, like the files
beside it. Run

```
yarn workspace rocket-meals-dev build:text-recognition-page
```

after changing `page.ts`, `protocol.ts`, `helper/TextRecognitionShared.ts`,
or after updating `ppu-paddle-ocr` or `onnxruntime-web`. Then run

```
yarn workspace rocket-meals-dev verify:text-recognition-page
```

which loads the composed page from a `file://` URL in a real Chromium with
every network request refused, and reads the fourteen photographed bank cards
from `packages/common/src/__tests__/fixtures/bankcards` through it — the
check a device cannot give from a development machine.

## Sizes, and what they buy

About 20 MB in the repository, of which the browser downloads roughly 10 MB
gzipped on the first scan (the WebAssembly alone compresses from 14.2 MB to
about 3.7 MB) and a device carries about 21 MB. The predecessor, Tesseract, was
5.9 MB.

What the extra megabytes buy, measured on the fourteen photographed cards in
`packages/common/src/__tests__/fixtures/bankcards`: nine of the eleven cards
that print an IBAN read correctly instead of five, **none** misread instead of
two. A frame takes about a second on the WebAssembly build.

## Where these files come from

- Models and dictionary: `https://huggingface.co/snowfluke/ppu-paddle-ocr-models`,
  the default catalogue of `ppu-paddle-ocr` (`DEFAULT_MODEL`). PaddleOCR itself
  is Apache-2.0.
- onnxruntime: the `dist/` folder of the `onnxruntime-web` package, MIT.
- The page bundle: built here, see above.

To update either, copy the new file in, rebuild the page bundle and run the
offline test and the verification. Do not point the app at a URL instead.
