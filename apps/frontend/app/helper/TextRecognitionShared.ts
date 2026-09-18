import type { ReactNode } from 'react';

/**
 * The parts of the text recognition (OCR) that web and native have in common.
 *
 * Both platforms run the same engine — Tesseract, compiled to WebAssembly. The
 * web build serves it from the app's own origin; native copies it onto the
 * device and points a hidden WebView at it (`useTextRecognition.tsx`). Two
 * things follow from that, and both are on purpose:
 *
 * - **Nothing is fetched from a CDN.** The engine ships with the app (see
 *   `public/tesseract/README.md`) and works offline. A photographed bank card
 *   is not something to hand a third party, and neither is the fact that
 *   someone is about to scan one.
 * - **No native module.** React Native has no WebAssembly, a WebView has it, so
 *   the feature needs no new binary and ships as an OTA update.
 */

/** The vendored engine version — see `public/tesseract/README.md`. */
export const TESSERACT_VERSION = '7.0.0';

/**
 * English is the right model for a bank card even in Germany: the IBAN is
 * digits and Latin letters, and English is what Tesseract is trained best on.
 */
export const TESSERACT_LANGUAGE = 'eng';

/** The engine's files, as they are named inside the engine directory. */
export const ENGINE_FILE_NAMES = {
	library: 'tesseract.min.js',
	worker: 'worker.min.js',
	core: 'tesseract-core-simd-lstm.js',
	coreWasm: 'tesseract-core-simd-lstm.wasm',
	trainedData: `${TESSERACT_LANGUAGE}.traineddata.gz`,
} as const;

/**
 * Longest edge the image is scaled to before recognition. Large enough that the
 * IBAN line stays legible, small enough to keep one pass near a second and the
 * native bridge payload small.
 */
export const MAX_RECOGNITION_IMAGE_WIDTH = 1600;

/** JPEG quality of the scaled-down frame handed to the engine. */
export const RECOGNITION_IMAGE_COMPRESSION = 0.8;

/**
 * Width the frame is scaled to before its sharpness is measured, so that the
 * number means the same thing whatever the camera delivers.
 */
export const SHARPNESS_MEASUREMENT_WIDTH = 800;

/**
 * Below this, a frame is not worth reading.
 *
 * Measured with the function below, on the images in this repository and on
 * photos of a real card taken with a front camera:
 *
 * | Frame | Sharpness | IBAN read |
 * | --- | --- | --- |
 * | the fixture card, in focus | 266…430 | yes |
 * | the same, slightly softened | 21 | no |
 * | a real card, front camera | 3…7 | no |
 *
 * A front camera has a fixed focus and cannot sharpen up at the distance
 * someone holds a card at, which is why those photos land where they do. The
 * threshold sits low on purpose: it turns away only what is hopeless, and
 * never a frame that might still be readable — a wrongly rejected frame looks
 * to the user like a broken feature, while a wrongly accepted one costs a
 * second of reading.
 */
export const MINIMUM_SHARPNESS = 12;

/**
 * How sharp an image is: the variance of its Laplacian, the standard measure.
 * Blur flattens the second derivative, so a soft image scores near zero while
 * a crisp one scores in the hundreds.
 *
 * The same computation exists twice: here for the web build, and as source text
 * in {@link SHARPNESS_FUNCTION_SOURCE} for the page that runs inside the
 * WebView on native. Handing the WebView `measureImageSharpness.toString()`
 * would be the obvious way to avoid that — but the app runs on Hermes, which
 * does not keep function bodies around, so there `toString()` yields
 * `function measureImageSharpness() { [bytecode] }` and the page would measure
 * nothing at all. `__tests__/imageSharpness.test.ts` runs both over the same
 * images and insists they agree, so the two cannot drift apart unnoticed.
 */
export function measureImageSharpness(pixels: Uint8ClampedArray | number[], width: number, height: number): number {
	var pixelCount = width * height;
	var gray = new Float32Array(pixelCount);
	for (var index = 0; index < pixelCount; index++) {
		var offset = index * 4;
		gray[index] = (pixels[offset] * 299 + pixels[offset + 1] * 587 + pixels[offset + 2] * 114) / 1000;
	}
	var sum = 0;
	var sumOfSquares = 0;
	var count = 0;
	for (var y = 1; y < height - 1; y++) {
		for (var x = 1; x < width - 1; x++) {
			var position = y * width + x;
			var laplacian = gray[position - width] + gray[position + width] + gray[position - 1] + gray[position + 1] - 4 * gray[position];
			sum += laplacian;
			sumOfSquares += laplacian * laplacian;
			count++;
		}
	}
	if (count === 0) {
		return 0;
	}
	var mean = sum / count;
	return sumOfSquares / count - mean * mean;
}

/**
 * {@link measureImageSharpness} as source text, for the WebView page on native.
 * Kept in plain ES5 so that it needs no transpiling wherever it is dropped in.
 */
export const SHARPNESS_FUNCTION_SOURCE = `function measureImageSharpness(pixels, width, height) {
	var pixelCount = width * height;
	var gray = new Float32Array(pixelCount);
	for (var index = 0; index < pixelCount; index++) {
		var offset = index * 4;
		gray[index] = (pixels[offset] * 299 + pixels[offset + 1] * 587 + pixels[offset + 2] * 114) / 1000;
	}
	var sum = 0;
	var sumOfSquares = 0;
	var count = 0;
	for (var y = 1; y < height - 1; y++) {
		for (var x = 1; x < width - 1; x++) {
			var position = y * width + x;
			var laplacian = gray[position - width] + gray[position + width] + gray[position - 1] + gray[position + 1] - 4 * gray[position];
			sum += laplacian;
			sumOfSquares += laplacian * laplacian;
			count++;
		}
	}
	if (count === 0) {
		return 0;
	}
	var mean = sum / count;
	return sumOfSquares / count - mean * mean;
}`;

/** What one pass over a frame came back with. */
export interface RecognitionResult {
	/** The recognized lines, empty when the frame was not worth reading. */
	lines: string[];
	/** How sharp the frame was — see {@link MINIMUM_SHARPNESS}. */
	sharpness: number;
	/** The frame was too soft to read, and was not handed to the engine at all. */
	tooBlurry: boolean;
}

/** The frame handed to the recognizer, as `takePictureAsync` returns it. */
export interface RecognitionImage {
	uri: string;
	width?: number;
}

/** What a platform's `useTextRecognition` hook gives its caller. */
export interface TextRecognitionOptions {
	/**
	 * Whether a camera preview is on screen right now.
	 *
	 * Taking the picture and reading it are two separate jobs, and on Android
	 * they cannot be done at the same time: the camera preview and the WebView
	 * the engine runs in both want a hardware surface, and a screen holding both
	 * shows an empty preview and takes the app down with it. The engine
	 * therefore only exists while the preview does not — the caller says which
	 * of the two it is showing, and the hook does the rest.
	 */
	isCameraActive: boolean;
}

export interface TextRecognitionApi {
	/** Reads one frame: its text line by line, plus how sharp it was. */
	recognizeImage: (image: RecognitionImage) => Promise<RecognitionResult>;
	/** 0…1 while the engine loads or reads, `null` when it is idle. */
	progress: number | null;
	/** Set once the engine failed to load or a recognition failed. */
	errorMessage: string | null;
	/** Must be rendered by the caller — on native it carries the engine. */
	engineElement: ReactNode;
	/**
	 * The engine may read while the camera preview is live, so frames can be
	 * sampled continuously. False where the two cannot share a screen: there a
	 * picture is taken first and read afterwards, one deliberate still at a time.
	 */
	runsAlongsideCamera: boolean;
}

/** What the WebView page posts back to the app. */
export type TextRecognitionEngineMessage =
	| { type: 'ready'; engineLoaded: boolean }
	| { type: 'progress'; status: string; progress: number }
	| { type: 'result'; id: string; text: string; sharpness: number }
	| { type: 'error'; id?: string; message: string };

/** Splits the engine's raw output into the lines the IBAN search works on. */
export const splitRecognizedText = (text: string): string[] =>
	text
		.split('\n')
		.map((line) => line.trim())
		.filter((line) => line.length > 0);

/**
 * The options both platforms hand `Tesseract.createWorker`, given the directory
 * the engine files sit in.
 *
 * Every path is spelled out rather than left to the library, because its
 * defaults point at a CDN. `workerBlobURL: false` matters for the same reason
 * it is easy to get wrong: with the default the worker is built from a blob,
 * and a blob has no address for the core loader to resolve its `.wasm`
 * neighbour against — the worker then dies with "Failed to parse URL". Loading
 * the worker straight out of the directory gives it a base to resolve against.
 */
export const buildWorkerOptions = (engineDirectoryUrl: string) => ({
	workerPath: `${engineDirectoryUrl}/${ENGINE_FILE_NAMES.worker}`,
	corePath: `${engineDirectoryUrl}/${ENGINE_FILE_NAMES.core}`,
	langPath: engineDirectoryUrl,
	workerBlobURL: false,
	gzip: true,
});

/**
 * The page that runs the engine inside the WebView on native.
 *
 * It is written into the engine directory on the device, next to the engine
 * files, so that every path in it is a plain neighbour. It exposes
 * `window.recognizeImage({ id, image })`, which the app calls through
 * `injectJavaScript`, and reports back through `ReactNativeWebView.postMessage`.
 * Kept to ES5 syntax and free of any bundler: this string is the whole program.
 */
export const buildTextRecognitionPageHtml = (): string => `<!DOCTYPE html>
<html>
	<head>
		<meta charset="utf-8" />
		<meta name="viewport" content="width=device-width, initial-scale=1" />
	</head>
	<body>
		<script src="./${ENGINE_FILE_NAMES.library}"></script>
		<script>
			${SHARPNESS_FUNCTION_SOURCE}

			(function () {
				var post = function (message) {
					if (window.ReactNativeWebView) {
						window.ReactNativeWebView.postMessage(JSON.stringify(message));
					}
				};

				var workerPromise = null;
				var getWorker = function () {
					if (!window.Tesseract) {
						return Promise.reject(new Error('text recognition engine could not be loaded'));
					}
					if (!workerPromise) {
						var options = ${JSON.stringify(buildWorkerOptions('.'))};
						options.logger = function (entry) {
							if (entry && typeof entry.progress === 'number') {
								post({ type: 'progress', status: String(entry.status || ''), progress: entry.progress });
							}
						};
						workerPromise = window.Tesseract.createWorker('${TESSERACT_LANGUAGE}', 1, options);
					}
					return workerPromise;
				};

				// How sharp the frame is, measured on a canvas at a fixed width.
				var measure = function (dataUri) {
					return new Promise(function (resolve) {
						var image = new Image();
						image.onload = function () {
							var width = Math.min(${SHARPNESS_MEASUREMENT_WIDTH}, image.width) || 1;
							var height = Math.max(1, Math.round((image.height / image.width) * width));
							var canvas = document.createElement('canvas');
							canvas.width = width;
							canvas.height = height;
							var context = canvas.getContext('2d');
							if (!context) {
								resolve(Number.POSITIVE_INFINITY);
								return;
							}
							context.drawImage(image, 0, 0, width, height);
							var pixels = context.getImageData(0, 0, width, height).data;
							resolve(measureImageSharpness(pixels, width, height));
						};
						// Unreadable for another reason: let the engine say so.
						image.onerror = function () {
							resolve(Number.POSITIVE_INFINITY);
						};
						image.src = dataUri;
					});
				};

				window.recognizeImage = function (request) {
					var sharpness = 0;
					measure(request.image)
						.then(function (measured) {
							sharpness = measured;
							if (measured < ${MINIMUM_SHARPNESS}) {
								// Not worth a second of reading, and the user is better
								// served by being told than by a silent retry.
								return null;
							}
							return getWorker().then(function (worker) {
								return worker.recognize(request.image);
							});
						})
						.then(function (result) {
							post({ type: 'result', id: request.id, sharpness: sharpness, text: String((result && result.data && result.data.text) || '') });
						})
						.catch(function (error) {
							// Build a fresh worker next time: a worker that failed to
							// start stays broken for every following frame.
							workerPromise = null;
							post({ type: 'error', id: request.id, message: String((error && error.message) || error) });
						});
				};

				post({ type: 'ready', engineLoaded: Boolean(window.Tesseract) });
			})();
		</script>
	</body>
</html>
`;
