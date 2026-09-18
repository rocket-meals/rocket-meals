import React, { useCallback, useEffect, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { WebView, WebViewMessageEvent } from 'react-native-webview';
import { Asset } from 'expo-asset';
import * as FileSystem from 'expo-file-system/legacy';
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';

import { ErrorBoundary } from '@/components/ErrorBoundary';

import { ENGINE_FILE_NAMES, MAX_RECOGNITION_IMAGE_WIDTH, MINIMUM_SHARPNESS, RECOGNITION_IMAGE_COMPRESSION, RecognitionImage, RecognitionResult, TextRecognitionApi, TextRecognitionEngineMessage, TextRecognitionOptions, buildTextRecognitionPageHtml, splitRecognizedText } from '@/helper/TextRecognitionShared';

/** How long one recognition may take before it is given up on. */
const RECOGNITION_TIMEOUT_IN_MS = 60_000;

/** How long the engine page may take to load before it is given up on. */
const ENGINE_START_TIMEOUT_IN_MS = 30_000;

/**
 * How long to leave the screen alone after the camera preview has gone before
 * putting the WebView on it.
 *
 * React takes the preview out of the tree in one go, but the camera hands its
 * hardware surface back to the system in its own time. Mounting the WebView
 * into that gap is how the app goes down, so the gap is waited out.
 */
const SURFACE_SETTLE_IN_MS = 250;

/** Where the engine is unpacked on the device. */
const ENGINE_DIRECTORY_NAME = 'text-recognition-engine';
const ENGINE_PAGE_NAME = 'index.html';

/**
 * The bundled engine, as Metro assets.
 *
 * Three of these are `.txt` copies of `.js` files. Metro bundles a `.js` file
 * as source code, never as an asset, so the engine's own scripts have to arrive
 * under a name Metro leaves alone — see `public/tesseract/README.md`. The two
 * large files carry extensions Metro already treats as assets and are taken
 * straight from the directory the web build serves.
 *
 * Resolved when first needed rather than at import time: a `require` that fails
 * at module level takes the whole screen down with it, and an engine that
 * cannot be found should show a message in the sheet instead.
 */
const loadEngineAssetList = (): { module: number; fileName: string }[] => [
	{ module: require('@/assets/tesseract/tesseract.min.js.txt'), fileName: ENGINE_FILE_NAMES.library },
	{ module: require('@/assets/tesseract/worker.min.js.txt'), fileName: ENGINE_FILE_NAMES.worker },
	{ module: require('@/assets/tesseract/tesseract-core-simd-lstm.js.txt'), fileName: ENGINE_FILE_NAMES.core },
	{ module: require('@/public/tesseract/tesseract-core-simd-lstm.wasm'), fileName: ENGINE_FILE_NAMES.coreWasm },
	{ module: require('@/public/tesseract/eng.traineddata.gz'), fileName: ENGINE_FILE_NAMES.trainedData },
];

/** The message of whatever was thrown, prefixed with the step that threw it. */
const describeFailure = (step: string, error: unknown): string => `${step}: ${error instanceof Error ? error.message : String(error)}`;

/**
 * Unpacks the engine into the cache directory, once per install, and returns
 * the directory it landed in.
 *
 * The engine has to end up as real neighbouring files: its core loader looks
 * for its `.wasm` next to itself and the worker looks for the language data
 * next to itself, both by relative name. Scattering them is what makes the
 * library fall back to its CDN defaults, which is the one thing this must not
 * do.
 */
export const unpackEngine = async (): Promise<string> => {
	const cacheDirectory = FileSystem.cacheDirectory;
	if (!cacheDirectory) {
		throw new Error('this device has no cache directory to unpack the text recognition engine into');
	}
	const directory = `${cacheDirectory}${ENGINE_DIRECTORY_NAME}`;

	let engineAssets: { module: number; fileName: string }[];
	try {
		engineAssets = loadEngineAssetList();
	} catch (error) {
		throw new Error(describeFailure('the text recognition engine is not bundled with this app version', error));
	}

	try {
		const directoryInfo = await FileSystem.getInfoAsync(directory);
		if (!directoryInfo.exists) {
			await FileSystem.makeDirectoryAsync(directory, { intermediates: true });
		}
	} catch (error) {
		throw new Error(describeFailure('the engine directory could not be created', error));
	}

	for (const engineAsset of engineAssets) {
		const target = `${directory}/${engineAsset.fileName}`;
		try {
			const targetInfo = await FileSystem.getInfoAsync(target);
			if (targetInfo.exists) {
				continue;
			}
			const asset = Asset.fromModule(engineAsset.module);
			await asset.downloadAsync();
			if (!asset.localUri) {
				throw new Error('it has no local copy on this device');
			}
			await FileSystem.copyAsync({ from: asset.localUri, to: target });
		} catch (error) {
			throw new Error(describeFailure(`engine file "${engineAsset.fileName}" could not be unpacked`, error));
		}
	}

	try {
		// Always rewritten: the page is ours, it is small, and it changes with the app.
		await FileSystem.writeAsStringAsync(`${directory}/${ENGINE_PAGE_NAME}`, buildTextRecognitionPageHtml());
	} catch (error) {
		throw new Error(describeFailure('the engine page could not be written', error));
	}
	return directory;
};

/**
 * Text recognition (OCR) on native, running Tesseract inside a hidden WebView.
 *
 * React Native has no WebAssembly, so Tesseract cannot run in the app's own JS
 * context — but it runs in a WebView, which every platform already has. That is
 * what buys this feature its independence from a native build: no new module,
 * no new binary, ships as an OTA update. The engine itself is unpacked out of
 * the app onto the device, so it works offline and tells no one about it.
 *
 * Taking a picture and reading it are kept strictly apart. The camera is the
 * platform's own (`expo-camera`) and has nothing to do with this file; what
 * arrives here is a finished image. And the WebView only ever exists while the
 * camera preview does not: on Android both want a hardware surface, and a
 * screen holding both shows an empty preview and then takes the app down. The
 * caller says which of the two it is showing through `isCameraActive`.
 *
 * The caller must render `engineElement`; without it there is no WebView and
 * `recognizeImage` never resolves.
 */
export const useTextRecognition = ({ isCameraActive }: TextRecognitionOptions): TextRecognitionApi => {
	const webViewRef = useRef<WebView>(null);
	const [engineDirectory, setEngineDirectory] = useState<string | null>(null);
	/** True once the camera has been gone long enough to hand the screen over. */
	const [isSurfaceFree, setIsSurfaceFree] = useState(false);
	const [progress, setProgress] = useState<number | null>(null);
	const [errorMessage, setErrorMessage] = useState<string | null>(null);

	/** Requests waiting for their answer from the page, by request id. */
	const pendingRequests = useRef(new Map<string, { resolve: (result: RecognitionResult) => void; reject: (error: Error) => void }>());
	const nextRequestId = useRef(0);
	/** Resolves once the page has reported that the engine is up. */
	const engineStart = useRef<{ promise: Promise<void>; resolve: () => void; reject: (error: Error) => void } | null>(null);

	useEffect(() => {
		// Unpacking is nothing but file copies — no WebView, no surface, nothing
		// that could fight with the camera — so it happens right away and the
		// first reading does not have to wait for it.
		let isMounted = true;
		unpackEngine()
			.then((directory) => {
				if (isMounted) {
					setEngineDirectory(directory);
				}
			})
			.catch((error: unknown) => {
				if (isMounted) {
					setErrorMessage(error instanceof Error ? error.message : String(error));
				}
			});
		return () => {
			isMounted = false;
		};
	}, []);

	useEffect(() => {
		if (isCameraActive) {
			setIsSurfaceFree(false);
			// The page goes with the WebView, so whatever was waiting on it has to
			// wait on the next one instead.
			engineStart.current?.reject(new Error('the text recognition engine was put away while the camera is in use'));
			engineStart.current = null;
			return;
		}
		const timeoutId = setTimeout(() => setIsSurfaceFree(true), SURFACE_SETTLE_IN_MS);
		return () => clearTimeout(timeoutId);
	}, [isCameraActive]);

	const handleMessage = useCallback((event: WebViewMessageEvent) => {
		let message: TextRecognitionEngineMessage;
		try {
			message = JSON.parse(event.nativeEvent.data) as TextRecognitionEngineMessage;
		} catch {
			return;
		}

		if (message.type === 'ready') {
			if (message.engineLoaded) {
				engineStart.current?.resolve();
			} else {
				setErrorMessage('text recognition engine could not be loaded');
				engineStart.current?.reject(new Error('text recognition engine could not be loaded'));
			}
			return;
		}
		if (message.type === 'progress') {
			setProgress(message.progress);
			return;
		}
		if (message.type === 'result') {
			pendingRequests.current.get(message.id)?.resolve({
				lines: splitRecognizedText(message.text),
				sharpness: message.sharpness,
				tooBlurry: message.sharpness < MINIMUM_SHARPNESS,
			});
			pendingRequests.current.delete(message.id);
			setProgress(null);
			return;
		}
		// An error either belongs to one request or to the engine as a whole.
		setErrorMessage(message.message);
		setProgress(null);
		if (message.id) {
			pendingRequests.current.get(message.id)?.reject(new Error(message.message));
			pendingRequests.current.delete(message.id);
			return;
		}
		engineStart.current?.reject(new Error(message.message));
	}, []);

	/** Whatever went wrong while the page was coming up is reported here too. */
	const failEngineStart = useCallback((detail: string) => {
		setErrorMessage(detail);
		engineStart.current?.reject(new Error(detail));
	}, []);

	/**
	 * Waits until the page is up. It is mounted as soon as the camera preview is
	 * gone, so the wait is for the page to load, not for the user to do anything.
	 */
	const waitForEngine = useCallback((): Promise<void> => {
		if (isCameraActive) {
			return Promise.reject(new Error('the text recognition engine cannot run while the camera preview is on screen'));
		}
		if (engineStart.current !== null) {
			return engineStart.current.promise;
		}
		let resolve: () => void = () => undefined;
		let reject: (error: Error) => void = () => undefined;
		const promise = new Promise<void>((resolvePromise, rejectPromise) => {
			const timeoutId = setTimeout(() => rejectPromise(new Error('the text recognition engine did not start up')), ENGINE_START_TIMEOUT_IN_MS);
			resolve = () => {
				clearTimeout(timeoutId);
				resolvePromise();
			};
			reject = (error: Error) => {
				clearTimeout(timeoutId);
				rejectPromise(error);
			};
		});
		engineStart.current = { promise, resolve, reject };
		return promise;
	}, [isCameraActive]);

	/**
	 * Scales the frame down before it crosses the bridge: a full-resolution photo
	 * would be megabytes of base64 and would take the engine far longer to read.
	 */
	const toDataUri = useCallback(async (image: RecognitionImage): Promise<string> => {
		const context = ImageManipulator.manipulate(image.uri);
		if (image.width === undefined || image.width > MAX_RECOGNITION_IMAGE_WIDTH) {
			context.resize({ width: MAX_RECOGNITION_IMAGE_WIDTH });
		}
		const rendered = await context.renderAsync();
		const saved = await rendered.saveAsync({ base64: true, compress: RECOGNITION_IMAGE_COMPRESSION, format: SaveFormat.JPEG });
		if (!saved.base64) {
			throw new Error('image could not be prepared for text recognition');
		}
		return `data:image/jpeg;base64,${saved.base64}`;
	}, []);

	const recognizeImage = useCallback(
		async (image: RecognitionImage): Promise<RecognitionResult> => {
			let dataUri: string;
			try {
				dataUri = await toDataUri(image);
			} catch (error) {
				throw new Error(describeFailure('the photo could not be prepared for reading', error));
			}

			await waitForEngine();
			const webView = webViewRef.current;
			if (!webView) {
				throw new Error(engineDirectory === null ? 'the text recognition engine is still being unpacked' : 'the text recognition engine is not mounted');
			}
			const requestId = `request-${nextRequestId.current++}`;

			return new Promise<RecognitionResult>((resolve, reject) => {
				const timeoutId = setTimeout(() => {
					pendingRequests.current.delete(requestId);
					reject(new Error('text recognition timed out'));
				}, RECOGNITION_TIMEOUT_IN_MS);

				pendingRequests.current.set(requestId, {
					resolve: (result) => {
						clearTimeout(timeoutId);
						resolve(result);
					},
					reject: (error) => {
						clearTimeout(timeoutId);
						reject(error);
					},
				});

				const request = JSON.stringify({ id: requestId, image: dataUri });
				webView.injectJavaScript(`window.recognizeImage(${request}); true;`);
			});
		},
		[engineDirectory, toDataUri, waitForEngine],
	);

	// The page is loaded out of the engine directory rather than handed over as
	// a string, so that the engine's own relative lookups land on its
	// neighbours. That needs the WebView to be allowed to read that directory,
	// which is what the file-access props below are for.
	const engineElement =
		!isSurfaceFree || engineDirectory === null ? null : (
			<ErrorBoundary onError={(error) => failEngineStart(describeFailure('the engine view could not be started', error))}>
				<View style={styles.engineContainer} pointerEvents="none">
					<WebView
						ref={webViewRef}
						source={{ uri: `${engineDirectory}/${ENGINE_PAGE_NAME}` }}
						originWhitelist={['*']}
						allowFileAccess
						allowFileAccessFromFileURLs
						allowUniversalAccessFromFileURLs
						allowingReadAccessToURL={engineDirectory}
						javaScriptEnabled
						domStorageEnabled
						onMessage={handleMessage}
						onError={(event) => failEngineStart(describeFailure('the engine view could not be loaded', event.nativeEvent.description))}
						onHttpError={(event) => failEngineStart(describeFailure('the engine view could not be loaded', `HTTP ${event.nativeEvent.statusCode}`))}
						onRenderProcessGone={() => failEngineStart('the engine view was shut down by the system, most likely out of memory')}
						onContentProcessDidTerminate={() => failEngineStart('the engine view was shut down by the system, most likely out of memory')}
					/>
				</View>
			</ErrorBoundary>
		);

	// A camera preview and this WebView cannot be on screen together, so frames
	// cannot be sampled while the preview runs: a picture is taken first and
	// read afterwards.
	return { recognizeImage, progress, errorMessage, engineElement, runsAlongsideCamera: false };
};

const styles = StyleSheet.create({
	// The engine has no UI: it is kept at one pixel rather than at zero, because
	// a WebView with no size is not guaranteed to run its scripts.
	engineContainer: {
		position: 'absolute',
		width: 1,
		height: 1,
		opacity: 0,
	},
});

export default useTextRecognition;
