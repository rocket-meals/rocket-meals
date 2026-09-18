import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { CameraType, CameraView, useCameraPermissions } from 'expo-camera';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { IbanCandidate, IbanRecognitionHelper } from 'repo-depkit-common';

import { useTheme } from '@/hooks/useTheme';
import { useLanguage } from '@/hooks/useLanguage';
import { useAppSelector } from '@/redux/hooks';
import { myContrastColor } from '@/helper/ColorHelper';
import { TranslationKeys } from '@/locales/keys';
import { useMyScrollViewModal } from '@/components/GlobalModal/useMyScrollViewModal';
import { useTextRecognition } from '@/hooks/useTextRecognition';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import type { RecognitionImage } from '@/helper/TextRecognitionShared';

/** Pause between two recognition passes. One pass itself takes about a second. */
const SCAN_PAUSE_IN_MS = 300;
/** Quality of the captured frame: enough detail for OCR, small enough to stay quick. */
const SCAN_PICTURE_QUALITY = 0.8;

export interface GiroCardIbanScannerProps {
	/** Called with the IBAN as soon as it is recognized. */
	onIbanDetected: (candidate: IbanCandidate) => void;
	/**
	 * Accept an IBAN whose mod-97 checksum does not add up. Only for testing
	 * against specimen cards such as the fixture in
	 * `packages/common/src/__tests__/fixtures/girocard` — a real card always
	 * carries a checksum-valid IBAN, and demanding it filters out misreads.
	 */
	allowInvalidChecksum?: boolean;
	/** Every batch of recognized lines, for the experimental screen's debug output. */
	onRecognizedLinesChange?: (lines: string[]) => void;
}

/**
 * Camera preview that reads the IBAN off a giro card.
 *
 * Taking the picture and reading it are two separate jobs here. The picture
 * comes from the platform's own camera (`expo-camera`) and from nothing else;
 * what the engine gets handed is a finished image. Whether the two may happen
 * at once is the engine's business, not this component's, and it says so
 * through `runsAlongsideCamera`:
 *
 * - In a browser they may. The preview is then sampled continuously — capture,
 *   read, search, next one — and the shutter is there for whoever wants to hold
 *   the card still.
 * - On a device they may not: the preview and the WebView the engine runs in
 *   both want a hardware surface, and a screen holding both shows an empty
 *   preview and then takes the app down. So there the shutter is the only way
 *   in: one picture, the preview goes away, and the picture is read.
 *
 * Either way the first hit ends the scan: the caller closes the sheet and fills
 * its input field.
 */
/**
 * Says what went wrong, in words the user can act on and with the raw message
 * underneath. Without the raw message an engine that fails on a device nobody
 * here owns is undiagnosable.
 */
const ScannerFailure: React.FC<{ detail?: string }> = ({ detail }) => {
	const { theme } = useTheme();
	const { translate } = useLanguage();
	return (
		<View style={styles.failureContainer}>
			<MaterialCommunityIcons name="alert-circle-outline" size={40} color={theme.screen.icon} />
			<Text style={[styles.hintText, { color: theme.screen.text }]}>{translate(TranslationKeys.giro_card_scan_engine_failed)}</Text>
			{detail !== undefined && (
				<Text selectable style={[styles.errorText, { color: theme.screen.text }]}>
					{detail}
				</Text>
			)}
		</View>
	);
};

export const GiroCardIbanScanner: React.FC<GiroCardIbanScannerProps> = ({ onIbanDetected, allowInvalidChecksum, onRecognizedLinesChange }) => {
	const { theme } = useTheme();
	const { translate } = useLanguage();
	const { primaryColor, selectedTheme } = useAppSelector((state) => state.settings);
	const contrastColor = myContrastColor(primaryColor, theme, selectedTheme === 'dark');

	const [permission, requestPermission] = useCameraPermissions();
	const [isCameraReady, setIsCameraReady] = useState(false);
	const [isTorchEnabled, setIsTorchEnabled] = useState(false);
	const [facing, setFacing] = useState<CameraType>('back');
	const [hasRecognizedOnce, setHasRecognizedOnce] = useState(false);
	/** The still the shutter button took, held on screen while it is read. */
	const [capturedImage, setCapturedImage] = useState<RecognitionImage | null>(null);
	const [isCapturedImageRead, setIsCapturedImageRead] = useState(false);
	/** True while the frames coming in are too soft for the engine to bother. */
	const [isTooBlurry, setIsTooBlurry] = useState(false);

	// The camera is on screen exactly while no still is: that is what the engine
	// needs to know to stay out of its way.
	const isCameraActive = capturedImage === null;
	const { recognizeImage, progress, errorMessage, engineElement, runsAlongsideCamera } = useTextRecognition({ isCameraActive });

	const cameraRef = useRef<CameraView>(null);
	/** Set once the IBAN is found, so the loop stops and no second hit is reported. */
	const isFinishedRef = useRef(false);

	const isPermissionGranted = permission?.granted === true;
	const isPermissionPending = permission === null;

	const takePicture = useCallback(async (): Promise<RecognitionImage | null> => {
		const camera = cameraRef.current;
		if (!camera) {
			return null;
		}
		// No `skipProcessing`: it hands back the frame in the sensor's own
		// orientation, and text lying on its side is text the engine cannot read.
		const picture = await camera.takePictureAsync({
			quality: SCAN_PICTURE_QUALITY,
			exif: false,
			shutterSound: false,
		});
		if (!picture?.uri) {
			return null;
		}
		return { uri: picture.uri, width: picture.width };
	}, []);

	/** Reads one image and reports the IBAN if there is one. */
	const readImage = useCallback(
		async (image: RecognitionImage): Promise<boolean> => {
			const result = await recognizeImage(image);
			setIsTooBlurry(result.tooBlurry);
			if (result.tooBlurry) {
				// Nothing was read, so there is nothing to report or search through.
				return false;
			}
			setHasRecognizedOnce(true);
			onRecognizedLinesChange?.(result.lines);
			const candidate = IbanRecognitionHelper.findIban(result.lines, { allowInvalidChecksum });
			if (!candidate) {
				return false;
			}
			isFinishedRef.current = true;
			onIbanDetected(candidate);
			return true;
		},
		[allowInvalidChecksum, onIbanDetected, onRecognizedLinesChange, recognizeImage],
	);

	/** The still this component is reading right now, so it reads it only once. */
	const stillBeingReadRef = useRef<RecognitionImage | null>(null);
	/** The latest `readImage`, so that a new one does not restart a running read. */
	const readImageRef = useRef(readImage);
	useEffect(() => {
		readImageRef.current = readImage;
	}, [readImage]);

	/**
	 * The shutter, and nothing more: it takes the picture and puts it on screen.
	 * Reading it is a separate step below, because it must not start before the
	 * camera preview is actually gone.
	 */
	const capturePicture = useCallback(async () => {
		const image = await takePicture();
		if (!image) {
			return;
		}
		setIsCapturedImageRead(false);
		setCapturedImage(image);
	}, [takePicture]);

	const discardCapturedImage = useCallback(() => {
		// The preview is mounted again by this, which is also what puts the engine
		// away where the two cannot share a screen.
		stillBeingReadRef.current = null;
		setCapturedImage(null);
		setIsCapturedImageRead(false);
		setIsCameraReady(false);
		setIsTooBlurry(false);
	}, []);

	useEffect(() => {
		// Runs one render after the shutter, which is the point: by now the camera
		// preview has been taken off the screen and the engine can have it.
		if (capturedImage === null || stillBeingReadRef.current === capturedImage) {
			return;
		}
		stillBeingReadRef.current = capturedImage;

		const readCapturedImage = async () => {
			try {
				await readImageRef.current(capturedImage);
			} catch {
				// The hook reports what went wrong; the still stays up so the user can
				// try again without hunting for the card a second time.
			}
			if (stillBeingReadRef.current === capturedImage) {
				setIsCapturedImageRead(true);
			}
		};
		void readCapturedImage();
	}, [capturedImage]);

	useEffect(() => {
		// Sampling the preview needs both of them alive at once, so this only runs
		// where they can be. While a still is on screen the loop stands down: that
		// frame is the one the user picked, and a second recognition would only
		// compete with it.
		if (!runsAlongsideCamera || !isCameraReady || !isPermissionGranted || capturedImage !== null) {
			return;
		}

		let isCancelled = false;
		let timeoutId: ReturnType<typeof setTimeout> | null = null;

		const runScanLoop = async () => {
			if (isCancelled || isFinishedRef.current) {
				return;
			}
			try {
				const image = await takePicture();
				if (image && (await readImage(image))) {
					return;
				}
			} catch {
				// A single pass can fail for harmless reasons (the preview was
				// backgrounded, the engine was still warming up). The hook reports
				// what went wrong; keep scanning.
			}
			if (!isCancelled) {
				timeoutId = setTimeout(() => {
					void runScanLoop();
				}, SCAN_PAUSE_IN_MS);
			}
		};

		void runScanLoop();

		return () => {
			isCancelled = true;
			if (timeoutId) {
				clearTimeout(timeoutId);
			}
		};
	}, [capturedImage, isCameraReady, isPermissionGranted, readImage, runsAlongsideCamera, takePicture]);

	if (!isPermissionGranted) {
		return (
			<View style={styles.container}>
				<View style={styles.hintContainer}>
					<MaterialCommunityIcons name="camera-off-outline" size={40} color={theme.screen.icon} />
					<Text style={[styles.hintText, { color: theme.screen.text }]}>{translate(TranslationKeys.giro_card_scan_permission_required)}</Text>
				</View>
				{!isPermissionPending && (
					<TouchableOpacity style={[styles.actionButton, { backgroundColor: primaryColor }]} onPress={requestPermission} accessibilityRole="button" accessibilityLabel={translate(TranslationKeys.friendships_allow_camera)}>
						<MaterialCommunityIcons name="camera" size={20} color={contrastColor} />
						<Text style={[styles.actionButtonText, { color: contrastColor }]}>{translate(TranslationKeys.friendships_allow_camera)}</Text>
					</TouchableOpacity>
				)}
			</View>
		);
	}

	// The engine is fetched on first use, which is the slow part of the first
	// pass; say so instead of leaving the user in front of a silent preview.
	// Once a pass has come back, the engine is there and every later gap between
	// passes is just the scanner working.
	let statusText = translate(TranslationKeys.giro_card_scan_searching);
	if (progress !== null) {
		statusText = `${statusText} ${Math.round(progress * 100)} %`;
	} else if (!hasRecognizedOnce) {
		statusText = translate(TranslationKeys.giro_card_scan_preparing);
	}
	const isReadingCapturedImage = capturedImage !== null && !isCapturedImageRead;
	if (isCameraActive && !runsAlongsideCamera) {
		// Nothing is happening and nothing is going to until the user takes a
		// picture, so say that instead of pretending to search.
		statusText = translate(TranslationKeys.giro_card_scan_ready_for_photo);
	}
	if (capturedImage !== null && isCapturedImageRead) {
		statusText = translate(TranslationKeys.giro_card_scan_no_iban_in_photo);
	}
	// A frame too soft to read is the common case on a front camera, which
	// cannot focus at the distance a card is held at. Say so rather than
	// searching on in silence.
	if (isTooBlurry) {
		statusText = translate(TranslationKeys.giro_card_scan_too_blurry);
	}

	return (
		<View style={styles.container}>
			{engineElement}
			<View style={[styles.cameraWrapper, { borderColor: primaryColor }]}>
				{/* One or the other, never both: the still replaces the preview
				    rather than covering it, so no camera is left running underneath
				    while the engine reads. */}
				{capturedImage === null ? <CameraView ref={cameraRef} style={styles.camera} facing={facing} animateShutter={false} enableTorch={isTorchEnabled} onCameraReady={() => setIsCameraReady(true)} /> : <Image source={{ uri: capturedImage.uri }} style={styles.capturedImage} resizeMode="cover" accessibilityLabel={translate(TranslationKeys.giro_card_scan_take_photo)} />}
				<View pointerEvents="none" style={[styles.cardFrame, { borderColor: contrastColor }]} />
			</View>

			<View style={styles.statusRow}>
				{(isReadingCapturedImage || (isCameraActive && runsAlongsideCamera)) && <ActivityIndicator size="small" color={primaryColor} />}
				<Text style={[styles.statusText, { color: theme.screen.text }]}>{statusText}</Text>
			</View>
			<Text style={[styles.hintText, { color: theme.screen.text }]}>{translate(TranslationKeys.giro_card_scan_hint)}</Text>

			{capturedImage === null ? (
				<TouchableOpacity style={[styles.actionButton, { backgroundColor: primaryColor }]} onPress={() => void capturePicture()} accessibilityRole="button" accessibilityLabel={translate(TranslationKeys.giro_card_scan_take_photo)}>
					<MaterialCommunityIcons name="camera-iris" size={20} color={contrastColor} />
					<Text style={[styles.actionButtonText, { color: contrastColor }]}>{translate(TranslationKeys.giro_card_scan_take_photo)}</Text>
				</TouchableOpacity>
			) : (
				<TouchableOpacity style={[styles.actionButton, { backgroundColor: primaryColor }]} onPress={discardCapturedImage} disabled={isReadingCapturedImage} accessibilityRole="button" accessibilityLabel={translate(TranslationKeys.giro_card_scan_retry)}>
					<MaterialCommunityIcons name="camera-retake-outline" size={20} color={contrastColor} />
					<Text style={[styles.actionButtonText, { color: contrastColor }]}>{translate(TranslationKeys.giro_card_scan_retry)}</Text>
				</TouchableOpacity>
			)}

			<View style={styles.secondaryRow}>
				<TouchableOpacity style={[styles.secondaryButton, { borderColor: theme.screen.icon }]} onPress={() => setFacing((current) => (current === 'back' ? 'front' : 'back'))} accessibilityRole="button" accessibilityLabel={translate(TranslationKeys.giro_card_scan_switch_camera)}>
					<MaterialCommunityIcons name="camera-flip-outline" size={20} color={theme.screen.icon} />
					<Text style={[styles.secondaryButtonText, { color: theme.screen.text }]}>{translate(TranslationKeys.giro_card_scan_switch_camera)}</Text>
				</TouchableOpacity>
				<TouchableOpacity style={[styles.secondaryButton, { borderColor: theme.screen.icon }]} onPress={() => setIsTorchEnabled((enabled) => !enabled)} accessibilityRole="button" accessibilityLabel={translate(TranslationKeys.giro_card_scan_toggle_torch)}>
					<MaterialCommunityIcons name={isTorchEnabled ? 'flashlight-off' : 'flashlight'} size={20} color={theme.screen.icon} />
					<Text style={[styles.secondaryButtonText, { color: theme.screen.text }]}>{translate(TranslationKeys.giro_card_scan_toggle_torch)}</Text>
				</TouchableOpacity>
			</View>

			{errorMessage !== null && <ScannerFailure detail={errorMessage} />}
		</View>
	);
};

export interface OpenGiroCardIbanScannerOptions {
	/** Receives the IBAN grouped in blocks of four, ready for the input field. */
	onIbanDetected: (formattedIban: string, candidate: IbanCandidate) => void;
	allowInvalidChecksum?: boolean;
	onRecognizedLinesChange?: (lines: string[]) => void;
}

/**
 * Opens the scanner in a scroll-view modal and closes it again the moment an
 * IBAN is recognized, so the caller's input field is already filled when the
 * sheet is gone.
 */
export const useGiroCardIbanScannerModal = () => {
	const { show, close } = useMyScrollViewModal();
	const { translate } = useLanguage();

	const openGiroCardIbanScanner = useCallback(
		(options: OpenGiroCardIbanScannerOptions) => {
			show({
				title: translate(TranslationKeys.giro_card_scan_title),
				onClose: close,
				children: (
					// The scanner leans on the camera, the file system and a WebView,
					// three things that can fail in ways this app cannot control. None
					// of them may take the app down with them.
					<ErrorBoundary fallback={<ScannerFailure />}>
						<GiroCardIbanScanner
							allowInvalidChecksum={options.allowInvalidChecksum}
							onRecognizedLinesChange={options.onRecognizedLinesChange}
							onIbanDetected={(candidate) => {
								close();
								options.onIbanDetected(candidate.formatted, candidate);
							}}
						/>
					</ErrorBoundary>
				),
			});
		},
		[close, show, translate],
	);

	return { openGiroCardIbanScanner, closeGiroCardIbanScanner: close };
};

const styles = StyleSheet.create({
	container: {
		width: '100%',
		alignItems: 'center',
		gap: 12,
		paddingVertical: 8,
	},
	cameraWrapper: {
		width: '100%',
		aspectRatio: 16 / 10,
		borderRadius: 12,
		borderWidth: 2,
		overflow: 'hidden',
	},
	camera: {
		width: '100%',
		height: '100%',
	},
	capturedImage: {
		position: 'absolute',
		top: 0,
		right: 0,
		bottom: 0,
		left: 0,
	},
	cardFrame: {
		position: 'absolute',
		top: '18%',
		left: '8%',
		right: '8%',
		bottom: '18%',
		borderWidth: 2,
		borderRadius: 10,
		opacity: 0.7,
	},
	statusRow: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 8,
	},
	statusText: {
		fontSize: 16,
		fontFamily: 'Poppins_400Regular',
	},
	hintContainer: {
		alignItems: 'center',
		gap: 12,
		paddingVertical: 16,
	},
	failureContainer: {
		width: '100%',
		alignItems: 'center',
		gap: 10,
		paddingVertical: 16,
	},
	hintText: {
		fontSize: 14,
		fontFamily: 'Poppins_400Regular',
		textAlign: 'center',
	},
	actionButton: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'center',
		gap: 10,
		borderRadius: 10,
		paddingHorizontal: 18,
		height: 43,
	},
	actionButtonText: {
		fontSize: 16,
		fontFamily: 'Poppins_400Regular',
	},
	secondaryRow: {
		flexDirection: 'row',
		flexWrap: 'wrap',
		justifyContent: 'center',
		gap: 10,
	},
	secondaryButton: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'center',
		gap: 8,
		borderRadius: 10,
		borderWidth: 1,
		paddingHorizontal: 14,
		height: 40,
	},
	secondaryButtonText: {
		fontSize: 14,
		fontFamily: 'Poppins_400Regular',
	},
	errorText: {
		fontSize: 12,
		fontFamily: 'Poppins_400Regular',
		textAlign: 'center',
		opacity: 0.7,
	},
});

export default GiroCardIbanScanner;
