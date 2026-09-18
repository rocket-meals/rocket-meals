import { useCallback, useRef, useState } from 'react';

import { ENGINE_FILE_NAMES, MAX_RECOGNITION_IMAGE_WIDTH, MINIMUM_SHARPNESS, RECOGNITION_IMAGE_COMPRESSION, RecognitionImage, RecognitionResult, SHARPNESS_MEASUREMENT_WIDTH, TESSERACT_LANGUAGE, TextRecognitionApi, TextRecognitionOptions, buildWorkerOptions, measureImageSharpness, splitRecognizedText } from '@/helper/TextRecognitionShared';

interface TesseractWorker {
	recognize: (image: string) => Promise<{ data: { text: string } }>;
}

interface TesseractGlobal {
	createWorker: (language: string, oem: number, options: Record<string, unknown>) => Promise<TesseractWorker>;
}

const getTesseract = (): TesseractGlobal | undefined => (window as unknown as { Tesseract?: TesseractGlobal }).Tesseract;

/**
 * Where the bundled engine is served from — `public/tesseract/`, which the web
 * export copies to the root of the deployment, below whatever base path the app
 * runs under (`/rocket-meals`, `/rocket-meals/pr-4399`, …). Expo inlines that
 * base path as `EXPO_BASE_URL` at build time; the fallback covers a dev server
 * serving from the root.
 */
const getEngineDirectoryUrl = (): string => {
	const basePath = process.env.EXPO_BASE_URL ?? '';
	const normalized = basePath.endsWith('/') ? basePath.slice(0, -1) : basePath;
	return `${window.location.origin}${normalized}/tesseract`;
};

/** Loads the engine into the page once; every later call reuses the script tag. */
const loadTesseract = async (engineDirectoryUrl: string): Promise<TesseractGlobal> => {
	const loaded = getTesseract();
	if (loaded) {
		return loaded;
	}
	const source = `${engineDirectoryUrl}/${ENGINE_FILE_NAMES.library}`;
	await new Promise<void>((resolve, reject) => {
		const existing = document.querySelector<HTMLScriptElement>(`script[src="${source}"]`);
		if (existing) {
			existing.addEventListener('load', () => resolve());
			existing.addEventListener('error', () => reject(new Error('text recognition engine could not be loaded')));
			return;
		}
		const script = document.createElement('script');
		script.src = source;
		script.async = true;
		script.onload = () => resolve();
		script.onerror = () => reject(new Error('text recognition engine could not be loaded'));
		document.head.appendChild(script);
	});
	const tesseract = getTesseract();
	if (!tesseract) {
		throw new Error('text recognition engine could not be loaded');
	}
	return tesseract;
};

/** Draws an image onto a canvas of the given width and hands back its pixels. */
const drawToCanvas = (image: HTMLImageElement, width: number): { canvas: HTMLCanvasElement; context: CanvasRenderingContext2D } | null => {
	const canvas = document.createElement('canvas');
	canvas.width = width;
	canvas.height = Math.max(1, Math.round((image.height / image.width) * width));
	const context = canvas.getContext('2d');
	if (!context) {
		return null;
	}
	context.drawImage(image, 0, 0, canvas.width, canvas.height);
	return { canvas, context };
};

/**
 * Scales the frame down so one pass stays near a second instead of ten, and
 * measures how sharp it is on the way past.
 */
const prepareFrame = async (imageUri: string): Promise<{ dataUri: string; sharpness: number }> =>
	new Promise((resolve, reject) => {
		const image = new Image();
		image.crossOrigin = 'anonymous';
		image.onload = () => {
			const measured = drawToCanvas(image, Math.min(SHARPNESS_MEASUREMENT_WIDTH, image.width) || 1);
			// No canvas, no measurement: let the engine have its say rather than
			// turning the frame away on a guess.
			const sharpness = measured === null ? Number.POSITIVE_INFINITY : measureImageSharpness(measured.context.getImageData(0, 0, measured.canvas.width, measured.canvas.height).data, measured.canvas.width, measured.canvas.height);

			if (image.width <= MAX_RECOGNITION_IMAGE_WIDTH) {
				resolve({ dataUri: imageUri, sharpness });
				return;
			}
			const scaled = drawToCanvas(image, MAX_RECOGNITION_IMAGE_WIDTH);
			resolve({ dataUri: scaled === null ? imageUri : scaled.canvas.toDataURL('image/jpeg', RECOGNITION_IMAGE_COMPRESSION), sharpness });
		};
		image.onerror = () => reject(new Error('image could not be prepared for text recognition'));
		image.src = imageUri;
	});

/**
 * Text recognition (OCR) in the browser — the web counterpart of
 * `useTextRecognition.tsx`. It runs the same engine, served from the app's own
 * origin, so no request for it ever leaves for a third party. Nothing to
 * render, so `engineElement` stays null.
 */
export const useTextRecognition = (_options: TextRecognitionOptions): TextRecognitionApi => {
	const workerPromise = useRef<Promise<TesseractWorker> | null>(null);
	const [progress, setProgress] = useState<number | null>(null);
	const [errorMessage, setErrorMessage] = useState<string | null>(null);

	const getWorker = useCallback((): Promise<TesseractWorker> => {
		if (!workerPromise.current) {
			const engineDirectoryUrl = getEngineDirectoryUrl();
			workerPromise.current = loadTesseract(engineDirectoryUrl).then((tesseract) =>
				tesseract.createWorker(TESSERACT_LANGUAGE, 1, {
					...buildWorkerOptions(engineDirectoryUrl),
					logger: (entry: { progress?: number }) => {
						if (typeof entry.progress === 'number') {
							setProgress(entry.progress);
						}
					},
				}),
			);
		}
		return workerPromise.current;
	}, []);

	const recognizeImage = useCallback(
		async (image: RecognitionImage): Promise<RecognitionResult> => {
			try {
				const prepared = await prepareFrame(image.uri);
				if (prepared.sharpness < MINIMUM_SHARPNESS) {
					// Not worth a second of reading, and the user is better served by
					// being told than by a silent retry.
					setProgress(null);
					setErrorMessage(null);
					return { lines: [], sharpness: prepared.sharpness, tooBlurry: true };
				}
				const worker = await getWorker();
				const result = await worker.recognize(prepared.dataUri);
				setProgress(null);
				setErrorMessage(null);
				return { lines: splitRecognizedText(result.data.text), sharpness: prepared.sharpness, tooBlurry: false };
			} catch (error) {
				// A worker that failed to start stays broken; drop it so the next
				// attempt builds a fresh one.
				workerPromise.current = null;
				setProgress(null);
				setErrorMessage(error instanceof Error ? error.message : String(error));
				throw error;
			}
		},
		[getWorker],
	);

	// A browser runs the engine in a worker next to the video element without
	// either getting in the other's way, so frames can be sampled continuously.
	return { recognizeImage, progress, errorMessage, engineElement: null, runsAlongsideCamera: true };
};

export default useTextRecognition;
