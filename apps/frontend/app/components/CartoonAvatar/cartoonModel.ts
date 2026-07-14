import * as tf from '@tensorflow/tfjs';
// Side-effect import: registers the RN platform adapter (fetch, base64 helpers)
// and, on native iOS/Android, the GL-backed 'rn-webgl' backend. On web this is
// a no-op and the regular '@tensorflow/tfjs-backend-webgl' backend is used.
import '@tensorflow/tfjs-react-native';
import { decodeJpeg, fetch as rnFetch } from '@tensorflow/tfjs-react-native';
import { Asset } from 'expo-asset';
import { Buffer } from 'buffer';
import * as jpeg from 'jpeg-js';

// tfjs-react-native polyfills a `global.Buffer` on native (see its
// `setupGlobals()`), but not on web. `jpeg-js`'s encoder references the
// global `Buffer` internally, so without this it throws `ReferenceError:
// Buffer is not defined` when running in a browser.
if (typeof (globalThis as { Buffer?: unknown }).Buffer === 'undefined') {
	(globalThis as { Buffer?: unknown }).Buffer = Buffer;
}

// Bundled locally as static assets so the model loads from disk - no network
// request, no server upload. See MODEL_LICENSE.md next to these files for
// where the weights come from and important licensing caveats.
// eslint-disable-next-line @typescript-eslint/no-var-requires
const modelJson = require('../../assets/models/cartoongan-hayao/model.json');
const modelWeights = [
	require('../../assets/models/cartoongan-hayao/group1-shard1of3.bin'),
	require('../../assets/models/cartoongan-hayao/group1-shard2of3.bin'),
	require('../../assets/models/cartoongan-hayao/group1-shard3of3.bin'),
];

const WARMUP_SIZE = 8;

let modelPromise: Promise<tf.GraphModel> | null = null;

async function initBackend(): Promise<void> {
	await tf.ready();
	if (tf.getBackend() === 'rn-webgl' || tf.getBackend() === 'webgl') {
		return;
	}
	// Fall back to the pure-JS CPU backend if GL context creation failed for
	// some reason (e.g. certain simulators/emulators) - slower, but keeps the
	// feature working everywhere instead of crashing.
	try {
		await tf.setBackend('rn-webgl');
	} catch {
		await tf.setBackend('cpu');
	}
	await tf.ready();
}

/**
 * Loads the model's weight shards (bundled local assets, resolved via
 * `expo-asset`) and hands them to `tf.loadGraphModel` as an in-memory
 * `io.IOHandler`.
 *
 * We deliberately don't use `@tensorflow/tfjs-react-native`'s own
 * `bundleResourceIO` helper here: it picks between an HTTP-fetch path and a
 * `react-native-fs`-based local-file path by checking whether the resolved
 * asset URI starts with `http`. On Expo web that URI is a root-relative path
 * (no scheme), so it always falls into the `react-native-fs` branch - and
 * `react-native-fs` is only a dependency here to satisfy Metro's static
 * module resolution (tfjs-react-native references it), it's never actually
 * functional under Expo - so loading fails there. Fetching the asset bytes
 * ourselves works uniformly on web and native.
 */
async function loadGraphModelFromBundledAssets(json: typeof modelJson, weightModuleIds: number[]): Promise<tf.GraphModel> {
	const weightsAssets = weightModuleIds.map((id) => Asset.fromModule(id));
	await Promise.all(weightsAssets.map((asset) => asset.downloadAsync()));

	const weightData = await Promise.all(
		weightsAssets.map(async (asset) => {
			const uri = asset.localUri ?? asset.uri;
			const response = await rnFetch(uri, undefined, { isBinary: true });
			return response.arrayBuffer();
		})
	);

	const modelArtifacts: tf.io.ModelArtifacts = {
		modelTopology: json.modelTopology,
		weightSpecs: json.weightsManifest[0].weights,
		weightData: tf.io.concatenateArrayBuffers(weightData),
		format: json.format,
		generatedBy: json.generatedBy,
		convertedBy: json.convertedBy,
	};

	return tf.loadGraphModel({
		load: async () => modelArtifacts,
	});
}

/**
 * Loads the bundled CartoonGAN ("hayao" style) graph model once and caches
 * the promise so repeated calls (e.g. re-rendering the screen) don't reload
 * or re-warm the model.
 */
export function loadCartoonModel(): Promise<tf.GraphModel> {
	if (!modelPromise) {
		modelPromise = (async () => {
			await initBackend();
			const model = await loadGraphModelFromBundledAssets(modelJson, modelWeights);
			// The first inference call triggers shader/kernel compilation and is
			// much slower than the rest - warm it up with a tiny tensor now so the
			// call the user is actually waiting for is fast.
			const warmupInput = tf.zeros([1, WARMUP_SIZE, WARMUP_SIZE, 3]);
			const warmupResult = model.predict(warmupInput) as tf.Tensor;
			tf.dispose([warmupInput, warmupResult]);
			return model;
		})().catch((err) => {
			modelPromise = null; // allow retrying after a failed load
			throw err;
		});
	}
	return modelPromise;
}

async function readImageAsTensor(imageUri: string): Promise<tf.Tensor3D> {
	// `fetch` (from tfjs-react-native, XHR-based) reads `file://`/`content://`
	// URIs on native and `blob:`/`data:`/`http(s):` URIs on web uniformly -
	// unlike `expo-file-system`, which doesn't support reading arbitrary URIs
	// on web at all.
	const response = await rnFetch(imageUri, undefined, { isBinary: true });
	const buffer = await response.arrayBuffer();
	// decodeJpeg only understands JPEG - callers must make sure `imageUri`
	// points to a JPEG file (expo-image-manipulator defaults to JPEG output).
	return decodeJpeg(new Uint8Array(buffer)) as tf.Tensor3D;
}

function tensorToJpegDataUri(tensor: tf.Tensor3D, quality = 90): string {
	const [height, width] = tensor.shape;
	const pixels = tensor.dataSync() as Int32Array;

	const rgba = new Uint8Array(width * height * 4);
	for (let i = 0, j = 0; i < pixels.length; i += 3, j += 4) {
		rgba[j] = pixels[i];
		rgba[j + 1] = pixels[i + 1];
		rgba[j + 2] = pixels[i + 2];
		rgba[j + 3] = 255;
	}

	const encoded = jpeg.encode({ data: rgba, width, height }, quality);
	const base64 = Buffer.from(encoded.data).toString('base64');
	return `data:image/jpeg;base64,${base64}`;
}

/**
 * Runs an already-resized photo through the CartoonGAN model and returns a
 * `data:image/jpeg;base64,...` URI with the stylized result, ready to hand
 * to an <Image> component. Everything happens on-device; the photo never
 * leaves the phone.
 */
export async function cartoonifyImage(imageUri: string): Promise<string> {
	const model = await loadCartoonModel();
	const inputImage = await readImageAsTensor(imageUri);

	const outputImage = tf.tidy(() => {
		// CartoonGAN (Chen et al., CVPR 2018; TF2 port & weights via
		// mnicnc404/CartoonGan-tensorflow) expects float BGR input in the same
		// [0, 255] range used during training, and produces output normalized
		// to [-1, 1] that needs rescaling back to a displayable [0, 1] range.
		let input = inputImage.toFloat();
		input = input.reverse(2) as tf.Tensor3D; // RGB -> BGR
		const batched = input.expandDims(0);

		const output = model.predict(batched) as tf.Tensor4D;
		let result = output.squeeze([0]) as tf.Tensor3D;
		result = result.reverse(2) as tf.Tensor3D; // BGR -> RGB
		result = result.mul(0.5).add(0.5) as tf.Tensor3D; // [-1, 1] -> [0, 1]
		result = tf.clipByValue(result, 0, 1);
		return result.mul(255) as tf.Tensor3D;
	});
	inputImage.dispose();

	const outputInt = outputImage.toInt() as tf.Tensor3D;
	outputImage.dispose();

	const dataUri = tensorToJpegDataUri(outputInt);
	outputInt.dispose();
	return dataUri;
}
