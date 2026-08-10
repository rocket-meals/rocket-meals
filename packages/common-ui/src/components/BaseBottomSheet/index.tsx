import React, { forwardRef, useCallback, useMemo, useState } from 'react';
import { Platform, Pressable, StyleSheet, TouchableOpacity, View } from 'react-native';
import Animated, { Extrapolation, interpolate, runOnJS, useAnimatedReaction, useAnimatedStyle } from 'react-native-reanimated';
import BottomSheet, { type BottomSheetBackdropProps, type BottomSheetBackgroundProps, type BottomSheetProps } from '@gorhom/bottom-sheet';
import { AntDesign } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../context/ThemeContext';
import { CommonUiComponentIds } from '../../constants/ComponentIds';

interface CustomBackdropProps extends BottomSheetBackdropProps {
	onPress?: () => void;
}

const CustomBackdrop: React.FC<CustomBackdropProps> = ({ animatedIndex, style, onPress }) => {
	const containerAnimatedStyle = useAnimatedStyle(() => ({
		opacity: interpolate(animatedIndex.value, [-1, 0], [0, 1], Extrapolation.CLAMP),
	}));

	const [isPressableActive, setIsPressableActive] = useState(() => animatedIndex.value > -0.5);
	useAnimatedReaction(
		() => animatedIndex.value > -0.5,
		(isActive, prev) => {
			if (isActive !== prev) {
				runOnJS(setIsPressableActive)(isActive);
			}
		},
	);

	return (
		<Animated.View
			style={[style, containerAnimatedStyle, backdropStyles.container]}
			pointerEvents="box-none"
		>
			{isPressableActive && (
				<Pressable style={StyleSheet.absoluteFill} onPress={onPress} />
			)}
		</Animated.View>
	);
};

const backdropStyles = StyleSheet.create({
	container: {
		backgroundColor: 'rgba(0,0,0,0.5)',
	},
});

// Mirrors @gorhom/bottom-sheet's default background style, minus its hardcoded
// (and on web invalid) accessibilityRole="adjustable".
const backgroundStyles = StyleSheet.create({
	background: {
		backgroundColor: 'white',
		borderRadius: 15,
	},
});

export interface BaseBottomSheetProps extends Omit<BottomSheetProps, 'backdropComponent'> {
	/**
	 * Header close/back button only. Steps back one level of the modal stack
	 * (see ModalProvider's `close()`) - does NOT touch the sheet's open/closed
	 * state unless the stack is down to its last item. Rendered as a chevron
	 * ("back") instead of an X when `showBackChevron` is set, so the user
	 * understands this only steps back rather than dismissing everything.
	 */
	onClose?: () => void;
	/**
	 * Backdrop tap and swipe-down-to-close. Both are a "get me out of here"
	 * gesture from the user's perspective, independent of how many modals are
	 * stacked - so both dismiss the entire stack at once (ModalProvider's
	 * `closeAll()`) rather than stepping back one level like the header
	 * button does. Falls back to `onClose` when not provided, so standalone
	 * consumers of this component (outside the global modal stack, e.g.
	 * BaseBottomModal/MarkingBottomSheet - a single sheet with no "stack" to
	 * distinguish) keep their previous behaviour of a single close handler
	 * for the button, backdrop, and swipe alike.
	 */
	onDismissAll?: () => void;
	headerBackgroundColor?: string;
	/** Shows a "back" chevron instead of an X in the header button - set when more than one modal is stacked, since the button only steps back one level. */
	showBackChevron?: boolean;
}

const BaseBottomSheet = forwardRef<BottomSheet, BaseBottomSheetProps>(({ onClose, onDismissAll, children, backgroundStyle, onChange, headerBackgroundColor, showBackChevron, ...props }, ref) => {
	// See onDismissAll doc: falls back to onClose for standalone (non-stacked) consumers.
	const dismissAll = onDismissAll ?? onClose;
	const renderBackdrop = useCallback((backdropProps: BottomSheetBackdropProps) => <CustomBackdrop {...backdropProps} onPress={dismissAll} />, [dismissAll]);
	const { theme } = useTheme();
	const { top: topInset } = useSafeAreaInsets();
	const snapPoints = useMemo(() => ['80%'], []);

	const usedHeaderBg = headerBackgroundColor || theme.screen.background;
	const effectiveBackgroundStyle = { backgroundColor: usedHeaderBg };

	const handleColor = theme.sheet.closeBg;

	// Swipe-down-to-close animates the sheet to index -1 - same "dismiss
	// everything" intent as a backdrop tap (see onDismissAll doc above), so it
	// goes through the same handler rather than the header button's onClose.
	const handleChange = useCallback(
		(index: number) => {
			if (index === -1) {
				dismissAll?.();
			}
			(onChange as any)?.(index);
		},
		[dismissAll, onChange],
	);

	// On web, @gorhom/bottom-sheet defaults to accessibilityRole "adjustable",
	// which becomes role="slider" without the required aria-valuenow (a critical
	// axe-core violation). The sheet isn't slider-adjustable here anyway (the
	// drag handle is hidden), so drop the role/label on web. Passing null (not
	// undefined) prevents the library's defaults from kicking back in. The
	// library's default background component hardcodes the same broken role, so
	// it's replaced with a plain view (same default style: rounded corners, the
	// backgroundStyle prop still applies on top).
	const webAccessibilityOverrides = Platform.OS === 'web' ? { accessibilityRole: null as any, accessibilityLabel: null as any } : {};
	const renderBackground = useCallback((backgroundProps: BottomSheetBackgroundProps) => <View pointerEvents={backgroundProps.pointerEvents} style={[backgroundStyles.background, backgroundProps.style]} />, []);

	// Android now enforces edge-to-edge (Expo SDK 54 / targetSdk 35+), so the
	// window never actually resizes when the keyboard opens regardless of the
	// declared windowSoftInputMode. Telling @gorhom/bottom-sheet
	// android_keyboardInputMode="adjustResize" makes it assume the OS already
	// shrank the container and skip its own keyboard-avoidance math entirely
	// (it force-sets heightWithinContainer to 0 - see their BottomSheet.tsx),
	// so the sheet no longer lifts above the keyboard on Android. Declaring
	// "adjustPan" matches what actually happens under edge-to-edge and lets
	// the library shift the sheet up by the tracked keyboard height itself.
	return (
		<BottomSheet ref={ref} snapPoints={snapPoints} backdropComponent={renderBackdrop} backgroundComponent={Platform.OS === 'web' ? renderBackground : undefined} backgroundStyle={effectiveBackgroundStyle} handleComponent={null} onChange={handleChange} keyboardBehavior="interactive" keyboardBlurBehavior="restore" android_keyboardInputMode="adjustPan" topInset={topInset} {...webAccessibilityOverrides} {...props}>
			<View style={styles.header}>
				<View style={styles.placeholder} />
				<View style={[styles.handle, { backgroundColor: handleColor }]} />
				<TouchableOpacity style={[styles.closeButton, { backgroundColor: theme.sheet.closeBg }]} onPress={onClose} nativeID={CommonUiComponentIds.MODAL_CLOSE_BUTTON}>
					<AntDesign name={showBackChevron ? 'left' : 'close'} size={24} color={theme.sheet.closeIcon} />
				</TouchableOpacity>
			</View>
			{children}
		</BottomSheet>
	);
});

export default BaseBottomSheet;

const styles = StyleSheet.create({
	header: {
		width: '100%',
		flexDirection: 'row',
		justifyContent: 'space-between',
		alignItems: 'center',
		padding: 10,
	},
	closeButton: {
		width: 45,
		height: 45,
		borderRadius: 50,
		justifyContent: 'center',
		alignItems: 'center',
	},
	handle: {
		width: '30%',
		height: 6,
		borderRadius: 3,
		marginHorizontal: 10,
		alignSelf: 'center',
	},
	placeholder: {
		width: 45,
		height: 45,
	},
});
