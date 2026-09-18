import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Image, StyleSheet, Text, TouchableOpacity, useWindowDimensions, View } from 'react-native';
import { CameraType, CameraView, useCameraPermissions } from 'expo-camera';
import { MaterialCommunityIcons } from '@expo/vector-icons';

import { useTheme } from '@/hooks/useTheme';
import { useLanguage } from '@/hooks/useLanguage';
import { useAppSelector } from '@/redux/hooks';
import { myContrastColor } from '@/helper/ColorHelper';
import { TranslationKeys } from '@/locales/keys';
import type { RecognitionImage, RecognitionResult } from '@/helper/TextRecognitionShared';

/** Pause between two passes over the live preview. */
const SCAN_PAUSE_IN_MS = 300;
/** Quality of the captured frame: enough detail to read, small enough to stay quick. */
const CAPTURE_QUALITY = 0.8;
/**
 * The shape a phone camera fills, and the shape this preview keeps. Width over
 * height, the way the layout engine reads it: taller than it is wide.
 */
const PREVIEW_ASPECT_RATIO = 3 / 4;
/** How much of the window the preview may take, so the controls stay in view. */
const MAX_PREVIEW_HEIGHT_RATIO = 0.55;

/** What the controls are drawn on, whatever is behind them. Deliberately not themed: a camera is black. */
const CONTROL_BACKGROUND_COLOR = '#000000';
const CONTROL_FOREGROUND_COLOR = '#FFFFFF';
const ROUND_BUTTON_BACKGROUND_COLOR = 'rgba(0,0,0,0.45)';
const STATUS_BACKGROUND_COLOR = 'rgba(0,0,0,0.55)';

export interface OcrCameraProps {
	/** Reads one frame. Comes from the engine the caller already holds. */
	recognizeImage: (image: RecognitionImage) => Promise<RecognitionResult>;
	/**
	 * Sampling the live preview until something is found, rather than waiting for
	 * the shutter. Only offered when the caller gave something to look for.
	 */
	isAutomatic: boolean;
	/** Handed every reading. Returning true ends the scan. */
	onRecognized: (lines: string[]) => boolean;
	/** What to hold in front of the camera, in the caller's words. */
	hint?: string;
	/**
	 * Draw the rectangle that says where to hold the card. Only worth it when
	 * the caller is after one specific thing in one specific place — reading
	 * whatever is in front of the lens is only hindered by a frame.
	 */
	showFrame?: boolean;
	/** Whatever the engine has to say about itself, shown under the preview. */
	engineError?: string | null;
}

/**
 * A camera preview that hands every frame to an OCR engine.
 *
 * Taking the picture and reading it are separate jobs. The picture comes from
 * the platform's own camera (`expo-camera`) and from nothing else; the engine
 * gets a finished image and has no idea where it came from.
 *
 * Two ways in. With `isAutomatic` the preview is sampled continuously — capture,
 * read, ask the caller, next one — and the first hit ends it without the user
 * doing anything. Otherwise the shutter leads: one deliberate still, read on its
 * own, which is the better way to hold something steady because the frame stays
 * put while the engine works on it. While a still is up the preview is gone, not
 * merely covered: one picture is being looked at, and that is the one.
 *
 * The controls are laid out the way a phone's own camera lays them out, because
 * that is what a hand reaches for without looking: the shutter in the middle
 * underneath, the lens switch in the corner beside it, the light in the corner
 * of the picture itself. None of them carries a caption — a shutter that has to
 * explain itself is in the wrong place.
 */
export const OcrCamera: React.FC<OcrCameraProps> = ({ recognizeImage, isAutomatic, onRecognized, hint, showFrame = false, engineError }) => {
	const { theme } = useTheme();
	const { translate } = useLanguage();
	const { primaryColor, selectedTheme } = useAppSelector((state) => state.settings);
	const contrastColor = myContrastColor(primaryColor, theme, selectedTheme === 'dark');
	const { height: windowHeight } = useWindowDimensions();

	const [permission, requestPermission] = useCameraPermissions();
	const [isCameraReady, setIsCameraReady] = useState(false);
	const [isTorchEnabled, setIsTorchEnabled] = useState(false);
	const [facing, setFacing] = useState<CameraType>('back');
	/** True once the engine has answered at all, however empty that answer was. */
	const [hasEngineAnswered, setHasEngineAnswered] = useState(false);
	/** The still the shutter took, held on screen while it is read. */
	const [capturedImage, setCapturedImage] = useState<RecognitionImage | null>(null);
	const [isCapturedImageRead, setIsCapturedImageRead] = useState(false);
	/** How many lines the last reading gave up, so "nothing there" and "not what you wanted" stay apart. */
	const [lastReadingLineCount, setLastReadingLineCount] = useState(0);
	/** True when the last frame was too soft for the engine to make anything of. */
	const [isTooBlurry, setIsTooBlurry] = useState(false);

	const cameraRef = useRef<CameraView>(null);
	/** Set once the caller is satisfied, so the loop stops and nothing is reported twice. */
	const isFinishedRef = useRef(false);

	const isPermissionGranted = permission?.granted === true;
	const isPermissionPending = permission === null;
	const isCameraActive = capturedImage === null;

	const takePicture = useCallback(async (): Promise<RecognitionImage | null> => {
		const camera = cameraRef.current;
		if (!camera) {
			return null;
		}
		// No `skipProcessing`: it hands back the frame in the sensor's own
		// orientation, and text lying on its side is text no engine can read.
		const picture = await camera.takePictureAsync({ quality: CAPTURE_QUALITY, exif: false, shutterSound: false });
		if (!picture?.uri) {
			return null;
		}
		return { uri: picture.uri, width: picture.width };
	}, []);

	/** Reads one image and asks the caller whether that was it. */
	const readImage = useCallback(
		async (image: RecognitionImage): Promise<boolean> => {
			const result = await recognizeImage(image);
			setHasEngineAnswered(true);
			setIsTooBlurry(result.tooBlurry);
			setLastReadingLineCount(result.lines.length);
			if (result.lines.length === 0) {
				return false;
			}
			if (!onRecognized(result.lines)) {
				return false;
			}
			isFinishedRef.current = true;
			return true;
		},
		[onRecognized, recognizeImage],
	);

	/** The still this component is reading right now, so it reads it only once. */
	const stillBeingReadRef = useRef<RecognitionImage | null>(null);
	/** The latest `readImage`, so a new one does not restart a running read. */
	const readImageRef = useRef(readImage);
	useEffect(() => {
		readImageRef.current = readImage;
	}, [readImage]);

	/**
	 * The shutter, and nothing more: it takes the picture and puts it on screen.
	 * Reading it is a separate step below.
	 */
	const capturePicture = useCallback(async () => {
		const image = await takePicture();
		if (!image) {
			return;
		}
		setIsCapturedImageRead(false);
		setLastReadingLineCount(0);
		setCapturedImage(image);
	}, [takePicture]);

	const discardCapturedImage = useCallback(() => {
		stillBeingReadRef.current = null;
		setCapturedImage(null);
		setIsCapturedImageRead(false);
		setLastReadingLineCount(0);
		setIsCameraReady(false);
		setIsTooBlurry(false);
	}, []);

	useEffect(() => {
		if (capturedImage === null || stillBeingReadRef.current === capturedImage) {
			return;
		}
		stillBeingReadRef.current = capturedImage;

		const readCapturedImage = async () => {
			try {
				await readImageRef.current(capturedImage);
			} catch {
				// The engine reports what went wrong; the still stays up so the user
				// can try again without hunting for the subject a second time.
			}
			if (stillBeingReadRef.current === capturedImage) {
				setIsCapturedImageRead(true);
			}
		};
		void readCapturedImage();
	}, [capturedImage]);

	useEffect(() => {
		// While a still is on screen the loop stands down: that frame is the one
		// the user picked, and a second reading would only compete with it.
		if (!isAutomatic || !isCameraReady || !isPermissionGranted || capturedImage !== null) {
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
				// backgrounded, the engine was still warming up). Keep scanning.
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
	}, [capturedImage, isAutomatic, isCameraReady, isPermissionGranted, readImage, takePicture]);

	if (!isPermissionGranted) {
		return (
			<View style={styles.permissionContainer}>
				<MaterialCommunityIcons name="camera-off-outline" size={40} color={theme.screen.icon} />
				<Text style={[styles.hintText, { color: theme.screen.text }]}>{translate(TranslationKeys.ocr_camera_permission_required)}</Text>
				{!isPermissionPending && (
					<TouchableOpacity style={[styles.permissionButton, { backgroundColor: primaryColor }]} onPress={requestPermission} accessibilityRole="button" accessibilityLabel={translate(TranslationKeys.friendships_allow_camera)}>
						<MaterialCommunityIcons name="camera" size={20} color={contrastColor} />
						<Text style={[styles.permissionButtonText, { color: contrastColor }]}>{translate(TranslationKeys.friendships_allow_camera)}</Text>
					</TouchableOpacity>
				)}
			</View>
		);
	}

	const isReadingCapturedImage = capturedImage !== null && !isCapturedImageRead;
	const isBusy = isReadingCapturedImage || (isCameraActive && isAutomatic);

	/** Loading the engine is the slow part of the first pass; say so instead of leaving the user in front of a silent preview. */
	const busyText = hasEngineAnswered ? translate(TranslationKeys.ocr_searching) : translate(TranslationKeys.ocr_preparing);
	let statusText = busyText;
	if (capturedImage !== null && isCapturedImageRead) {
		// Three different outcomes, and telling them apart is the whole point: the
		// picture was too soft to read, or the engine read nothing at all, or it
		// read plenty and none of it was what the caller is after. Saying "no text"
		// to someone looking at their own recognized text is how this looked broken.
		if (lastReadingLineCount > 0) {
			statusText = translate(TranslationKeys.ocr_no_match_in_photo);
		} else if (isTooBlurry) {
			// A frame too soft to read is the common case on a front camera, which
			// cannot focus at the distance something is held at.
			statusText = translate(TranslationKeys.ocr_too_blurry);
		} else {
			statusText = translate(TranslationKeys.ocr_nothing_in_photo);
		}
	} else if (isCameraActive && !isAutomatic) {
		// Nothing is being read until the shutter says so.
		statusText = translate(TranslationKeys.ocr_ready_for_photo);
	} else if (isCameraActive && isTooBlurry && lastReadingLineCount === 0) {
		statusText = translate(TranslationKeys.ocr_too_blurry);
	}

	// The height follows from the width through the aspect ratio, and is capped
	// against the window: the modal is as wide as the window on a desktop browser,
	// and an uncapped preview pushes the shutter below the fold - the reading
	// nobody can see is the reading nobody gets. Measuring the width instead (an
	// `onLayout` on this container) looked equivalent and was not: inside the
	// bottom sheet the callback never arrived, and the preview stayed at zero
	// height with only the controls under it showing.
	const maxPreviewHeight = windowHeight * MAX_PREVIEW_HEIGHT_RATIO;

	return (
		<View style={styles.container}>
			<View style={[styles.preview, { maxHeight: maxPreviewHeight }]}>
				{/* One or the other, never both: the still replaces the preview
				    rather than covering it, so no camera is left running underneath
				    while the engine reads. */}
				{isCameraActive ? <CameraView ref={cameraRef} style={styles.fill} facing={facing} animateShutter={false} enableTorch={isTorchEnabled} onCameraReady={() => setIsCameraReady(true)} /> : <Image source={{ uri: capturedImage.uri }} style={styles.fill} resizeMode="cover" accessibilityLabel={translate(TranslationKeys.ocr_take_photo)} />}

				{showFrame && <View pointerEvents="none" style={[styles.frame, { borderColor: contrastColor }]} />}

				<View pointerEvents="none" style={styles.statusPill}>
					{isBusy && <ActivityIndicator size="small" color={CONTROL_FOREGROUND_COLOR} />}
					<Text style={styles.statusText}>{statusText}</Text>
				</View>

				{isCameraActive && (
					<TouchableOpacity style={[styles.roundButton, styles.torchButton]} onPress={() => setIsTorchEnabled((enabled) => !enabled)} accessibilityRole="button" accessibilityLabel={translate(TranslationKeys.ocr_toggle_torch)} accessibilityState={{ selected: isTorchEnabled }}>
						<MaterialCommunityIcons name={isTorchEnabled ? 'flashlight' : 'flashlight-off'} size={24} color={isTorchEnabled ? primaryColor : CONTROL_FOREGROUND_COLOR} />
					</TouchableOpacity>
				)}
			</View>

			<View style={styles.controlBar}>
				{/* An empty corner opposite the lens switch, so the shutter stays in
				    the middle of the bar rather than in the middle of what is left. */}
				<View style={styles.controlSlot} />

				<View style={styles.controlSlot}>
					{isCameraActive ? (
						// Nothing to press while the preview reads itself: an automatic
						// scan ends when it finds something, not when a finger says so.
						!isAutomatic && (
							<TouchableOpacity style={styles.shutterButton} onPress={() => void capturePicture()} accessibilityRole="button" accessibilityLabel={translate(TranslationKeys.ocr_take_photo)}>
								<View style={styles.shutterButtonCore} />
							</TouchableOpacity>
						)
					) : (
						<TouchableOpacity style={[styles.roundButton, styles.retryButton]} onPress={discardCapturedImage} disabled={isReadingCapturedImage} accessibilityRole="button" accessibilityLabel={translate(TranslationKeys.ocr_retry)}>
							<MaterialCommunityIcons name="camera-retake-outline" size={26} color={CONTROL_FOREGROUND_COLOR} />
						</TouchableOpacity>
					)}
				</View>

				<View style={styles.controlSlot}>
					{isCameraActive && (
						<TouchableOpacity style={[styles.roundButton, styles.flipButton]} onPress={() => setFacing((current) => (current === 'back' ? 'front' : 'back'))} accessibilityRole="button" accessibilityLabel={translate(TranslationKeys.ocr_switch_camera)}>
							<MaterialCommunityIcons name="camera-flip-outline" size={24} color={CONTROL_FOREGROUND_COLOR} />
						</TouchableOpacity>
					)}
				</View>
			</View>

			{hint !== undefined && <Text style={[styles.hintText, styles.belowCamera, { color: theme.screen.text }]}>{hint}</Text>}

			{engineError !== null && engineError !== undefined && (
				<View style={[styles.failureContainer, styles.belowCamera]}>
					<MaterialCommunityIcons name="alert-circle-outline" size={40} color={theme.screen.icon} />
					<Text style={[styles.hintText, { color: theme.screen.text }]}>{translate(TranslationKeys.ocr_engine_failed)}</Text>
					<Text selectable style={[styles.errorText, { color: theme.screen.text }]}>
						{engineError}
					</Text>
				</View>
			)}
		</View>
	);
};

/** The lens switch and the light: same circle, different corner. */
const ROUND_BUTTON_SIZE = 48;
/** The shutter, as big as a thumb expects it to be. */
const SHUTTER_SIZE = 68;
const SHUTTER_RING_WIDTH = 4;
/** The bar the shutter sits in, tall enough to give it air on both sides. */
const CONTROL_BAR_HEIGHT = 96;

const styles = StyleSheet.create({
	container: {
		width: '100%',
	},
	preview: {
		width: '100%',
		aspectRatio: PREVIEW_ASPECT_RATIO,
		backgroundColor: CONTROL_BACKGROUND_COLOR,
		overflow: 'hidden',
	},
	fill: {
		position: 'absolute',
		top: 0,
		right: 0,
		bottom: 0,
		left: 0,
	},
	frame: {
		position: 'absolute',
		top: '18%',
		left: '8%',
		right: '8%',
		bottom: '18%',
		borderWidth: 2,
		borderRadius: 10,
		opacity: 0.7,
	},
	statusPill: {
		position: 'absolute',
		top: 12,
		left: 12,
		// Stops short of the light in the opposite corner.
		right: 12 + ROUND_BUTTON_SIZE + 12,
		flexDirection: 'row',
		alignItems: 'center',
		gap: 8,
		paddingHorizontal: 12,
		paddingVertical: 8,
		borderRadius: 999,
		backgroundColor: STATUS_BACKGROUND_COLOR,
	},
	statusText: {
		flexShrink: 1,
		fontSize: 14,
		fontFamily: 'Poppins_400Regular',
		color: CONTROL_FOREGROUND_COLOR,
	},
	controlBar: {
		width: '100%',
		height: CONTROL_BAR_HEIGHT,
		flexDirection: 'row',
		alignItems: 'center',
		backgroundColor: CONTROL_BACKGROUND_COLOR,
	},
	controlSlot: {
		flex: 1,
		alignItems: 'center',
		justifyContent: 'center',
	},
	roundButton: {
		width: ROUND_BUTTON_SIZE,
		height: ROUND_BUTTON_SIZE,
		borderRadius: ROUND_BUTTON_SIZE / 2,
		alignItems: 'center',
		justifyContent: 'center',
		backgroundColor: ROUND_BUTTON_BACKGROUND_COLOR,
	},
	torchButton: {
		position: 'absolute',
		top: 12,
		right: 12,
	},
	flipButton: {
		backgroundColor: 'rgba(255,255,255,0.18)',
	},
	retryButton: {
		backgroundColor: 'rgba(255,255,255,0.18)',
	},
	shutterButton: {
		width: SHUTTER_SIZE,
		height: SHUTTER_SIZE,
		borderRadius: SHUTTER_SIZE / 2,
		borderWidth: SHUTTER_RING_WIDTH,
		borderColor: CONTROL_FOREGROUND_COLOR,
		alignItems: 'center',
		justifyContent: 'center',
	},
	shutterButtonCore: {
		width: SHUTTER_SIZE - 2 * SHUTTER_RING_WIDTH - 6,
		height: SHUTTER_SIZE - 2 * SHUTTER_RING_WIDTH - 6,
		borderRadius: SHUTTER_SIZE,
		backgroundColor: CONTROL_FOREGROUND_COLOR,
	},
	belowCamera: {
		paddingHorizontal: 20,
		paddingTop: 12,
	},
	permissionContainer: {
		width: '100%',
		alignItems: 'center',
		gap: 12,
		paddingVertical: 24,
		paddingHorizontal: 20,
	},
	permissionButton: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 8,
		borderRadius: 10,
		paddingHorizontal: 18,
		height: 44,
	},
	permissionButtonText: {
		fontSize: 16,
		fontFamily: 'Poppins_400Regular',
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
	errorText: {
		fontSize: 12,
		fontFamily: 'Poppins_400Regular',
		textAlign: 'center',
		opacity: 0.8,
	},
});

export default OcrCamera;
