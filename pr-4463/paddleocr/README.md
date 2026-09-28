# Bundled text recognition engine

PaddleOCR (PP-OCRv6 tiny) and the WebAssembly build of onnxruntime it runs on in
the browser. Everything the scanner needs is in this folder, and **nothing is
fetched from a third party at runtime**.

| File | What it is | Size |
| --- | --- | --- |
| `PP-OCRv6_tiny_det.ort` | Text detection model — finds the lines on the card. | 1.9 MB |
| `PP-OCRv6_tiny_rec.ort` | Text recognition model — reads the characters. | 4.5 MB |
| `ppocrv6_tiny_dict.txt` | The character dictionary the recognition model indexes into. | 27 KB |
| `ort-wasm-simd-threaded.wasm` | onnxruntime's WebAssembly build, for the browser. | 14.2 MB |
| `ort-wasm-simd-threaded.mjs` | The loader beside it. | 24 KB |

The two `.wasm`/`.mjs` files are for the browser only. On a device
`onnxruntime-react-native` runs the models natively and neither file is
bundled — Metro only ships what is `require`d, and the native hook requires the
two models and the dictionary.

## Why this is in the repository

A function that photographs a bank card should not tell a third party that
someone is photographing a bank card. The photo itself never leaves the device;
loading the engine from a CDN would leak the rest.

Two defaults have to be overridden for that to hold, and both are easy to
undo by accident:

- **`ort.env.wasm.wasmPaths`.** `onnxruntime-web` sets this to a jsDelivr URL
  when it is imported. The web hook overwrites it with this folder's URL,
  unconditionally — the library only fills in its default when the field is
  empty, so leaving it alone is not enough.
- **The model paths.** `ppu-paddle-ocr` falls back to a Hugging Face URL for
  each model and for the dictionary. All three are passed explicitly.

`__tests__/textRecognitionOffline.test.ts` holds both in place: no `http` URL in
the files that build the engine, every file above present, every path set. From
the outside a lapse looks like nothing at all — the scanner keeps working, it
just phones home first.

## Sizes, and what they buy

About 20 MB in the repository, of which the browser downloads roughly 10 MB
gzipped on the first scan (the WebAssembly alone compresses from 14.2 MB to
about 3.7 MB) and a device carries 6.4 MB. The predecessor, Tesseract, was
5.9 MB.

What the extra megabytes buy, measured on the fourteen photographed cards in
`packages/common/src/__tests__/fixtures/bankcards`: nine of the eleven cards
that print an IBAN read correctly instead of five, **none** misread instead of
two, and about 0.2 s per frame instead of about 1 s.

## Where these files come from

- Models and dictionary: `https://huggingface.co/snowfluke/ppu-paddle-ocr-models`,
  the default catalogue of `ppu-paddle-ocr` (`DEFAULT_MODEL`). PaddleOCR itself
  is Apache-2.0.
- onnxruntime: the `dist/` folder of the `onnxruntime-web` package, MIT.

To update either, copy the new file in and run the offline test. Do not point
the app at a URL instead.
