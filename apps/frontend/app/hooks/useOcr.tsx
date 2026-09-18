import React, { useCallback, useRef } from 'react';
import { Alert, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';

import SettingsList from '@/components/SettingsList';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { OcrCamera } from '@/components/OcrCamera';
import { useMyScrollViewModal } from '@/components/GlobalModal/useMyScrollViewModal';
import { useLanguage } from '@/hooks/useLanguage';
import { useTextRecognition } from '@/hooks/useTextRecognition';
import { TranslationKeys } from '@/locales/keys';

/**
 * Reads text off a picture, wherever the picture comes from.
 *
 * The three ways in are the point of this hook. A camera that samples its own
 * preview until it finds what the caller asked for and then gets out of the
 * way; a camera with a shutter, for holding something steady; and a photo the
 * user already has. The caller says what it is looking for, not how to get
 * there — and the automatic way is only offered when there is something to look
 * for, because a scan that cannot recognize its own success would never end.
 *
 * Taking the picture and reading it stay separate throughout: the engine is
 * handed a finished image and knows nothing about cameras.
 */

/** What one finished reading produced. */
export interface OcrReading<TMatch> {
	/** The recognized text, line by line. */
	lines: string[];
	/** What `findMatch` made of those lines, or `null` when it found nothing. */
	match: TMatch | null;
}

export interface OpenOcrOptions<TMatch> {
	/** The modal's heading, in the caller's words. */
	title: string;
	/** A line under the preview saying what to hold in front of the camera. */
	hint?: string;
	/**
	 * Draw the rectangle that says where to hold the thing. Right for a card,
	 * whose number sits in one place; wrong for "read whatever is in front of
	 * the lens", where it only gets in the way.
	 */
	showFrame?: boolean;
	/**
	 * Asked of every reading. A non-null answer ends the scan at once — which is
	 * what makes the automatic camera possible, and why that option is missing
	 * when this is.
	 */
	findMatch?: (lines: string[]) => TMatch | null;
	/** Called once, with whatever the user settled on. */
	onRecognized: (reading: OcrReading<TMatch>) => void;
	/** Every batch of recognized lines, for a caller that wants to show its work. */
	onLinesRecognized?: (lines: string[]) => void;
	/** Run when a reading was accepted, before the modal is gone. For a success chime or a buzz. */
	onMatchFound?: (reading: OcrReading<TMatch>) => void;
}

/** Quality of a picked photo. Full detail: it is read once, not sampled. */
const PICKED_PHOTO_QUALITY = 1;

export const useOcr = () => {
	const { show, close } = useMyScrollViewModal();
	const { translate } = useLanguage();
	const { recognizeImage, errorMessage } = useTextRecognition();

	/** The engine, as the sheet below should see it right now. */
	const recognizeImageRef = useRef(recognizeImage);
	recognizeImageRef.current = recognizeImage;
	const errorMessageRef = useRef(errorMessage);
	errorMessageRef.current = errorMessage;

	/**
	 * How many modals this scan currently has on the global stack.
	 *
	 * The stack pops one level per `close()`. A scan that put the source picker
	 * up and then the camera on top of it is two levels deep, so finishing with a
	 * single `close()` took the camera down and left the user looking at the
	 * source picker again — which reads as "the modal did not close". Counting
	 * what we opened closes exactly that and nothing underneath it, which
	 * `closeAll()` could not promise: this hook is also opened from screens that
	 * are themselves inside a modal.
	 */
	const openLevelsRef = useRef(0);

	const openOcr = useCallback(
		<TMatch,>(options: OpenOcrOptions<TMatch>) => {
			/** Puts one modal up and remembers that it is this scan's to close. */
			const showLevel = (content: React.ReactNode, isFullWidth: boolean) => {
				openLevelsRef.current += 1;
				show(
					{
						title: options.title,
						disableHorizontalPadding: isFullWidth,
						children: content,
					},
					{
						onClosed: () => {
							openLevelsRef.current = Math.max(0, openLevelsRef.current - 1);
						},
					},
				);
			};

			/** Takes down every modal this scan opened, the source picker included. */
			const closeOwnLevels = () => {
				const levels = openLevelsRef.current;
				for (let level = 0; level < levels; level++) {
					close();
				}
			};

			/** Ends the modal with whatever was read. */
			const finish = (lines: string[], match: TMatch | null) => {
				const reading: OcrReading<TMatch> = { lines, match };
				if (match !== null) {
					options.onMatchFound?.(reading);
				}
				closeOwnLevels();
				options.onRecognized(reading);
			};

			/** Handed every reading; says whether that was enough to stop. */
			const handleLines = (lines: string[]): boolean => {
				if (lines.length === 0) {
					return false;
				}
				options.onLinesRecognized?.(lines);
				if (!options.findMatch) {
					// Nothing to look for means the text itself was the answer, and a
					// reading that produced text has therefore produced it. Carrying on
					// would leave the user in front of a preview that has already found
					// what they came for.
					finish(lines, null);
					return true;
				}
				const match = options.findMatch(lines);
				if (match === null) {
					return false;
				}
				finish(lines, match);
				return true;
			};

			const showCamera = (isAutomatic: boolean) => {
				showLevel(
					// The camera, the file system and a native engine can all fail in
					// ways this app cannot control. None of them may take it down.
					<ErrorBoundary>
						<OcrCamera recognizeImage={(image) => recognizeImageRef.current(image)} isAutomatic={isAutomatic} onRecognized={handleLines} hint={options.hint} showFrame={options.showFrame} engineError={errorMessageRef.current} />
					</ErrorBoundary>,
					true,
				);
			};

			const pickPhoto = async () => {
				const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
				if (!permission.granted) {
					Alert.alert(translate(TranslationKeys.ocr_gallery_permission_required));
					return;
				}
				const picked = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsMultipleSelection: false, selectionLimit: 1, quality: PICKED_PHOTO_QUALITY });
				if (picked.canceled || !picked.assets[0]) {
					return;
				}
				const asset = picked.assets[0];
				try {
					const result = await recognizeImageRef.current({ uri: asset.uri, width: asset.width });
					// One picture, one answer: a photo the user chose deliberately is
					// read once, and whatever it says is the outcome — there is no next
					// frame to hope for.
					if (!handleLines(result.lines)) {
						finish(result.lines, null);
					}
				} catch {
					// The engine has already said what went wrong. Leave the sheet open
					// so the user can try another picture.
				}
			};

			const sources: { key: string; label: string; icon: React.ReactNode; onPress: () => void }[] = [];
			if (options.findMatch) {
				sources.push({
					key: 'camera-automatic',
					label: translate(TranslationKeys.ocr_source_camera_automatic),
					icon: <MaterialCommunityIcons name="camera-iris" size={24} />,
					onPress: () => showCamera(true),
				});
			}
			sources.push({
				key: 'camera',
				label: translate(TranslationKeys.ocr_source_camera),
				icon: <MaterialCommunityIcons name="camera" size={24} />,
				onPress: () => showCamera(false),
			});
			sources.push({
				key: 'photo',
				label: translate(TranslationKeys.ocr_source_photo),
				icon: <MaterialCommunityIcons name="folder-image" size={24} />,
				onPress: () => void pickPhoto(),
			});

			// A browser has no camera roll to open and its `getUserMedia` preview is
			// the same device either way, so the camera rows stay — what changes is
			// only which of them makes sense, and that is the user's call.
			showLevel(
				<View style={{ width: '100%' }}>
					{sources.map((source, index) => (
						<SettingsList key={source.key} label={source.label} leftIcon={source.icon} groupPosition={sources.length === 1 ? 'single' : index === 0 ? 'top' : index === sources.length - 1 ? 'bottom' : 'middle'} showSeparator={index !== sources.length - 1} handleFunction={source.onPress} />
					))}
				</View>,
				false,
			);
		},
		[close, show, translate],
	);

	return { openOcr, closeOcr: close, ocrErrorMessage: errorMessage };
};

export default useOcr;
