import React, { forwardRef, useCallback, useMemo, useState } from 'react';
import { Pressable, StyleSheet, TouchableOpacity, View } from 'react-native';
import Animated, { Extrapolation, interpolate, runOnJS, useAnimatedReaction, useAnimatedStyle } from 'react-native-reanimated';
import BottomSheet, { type BottomSheetBackdropProps, type BottomSheetProps } from '@gorhom/bottom-sheet';
import { AntDesign } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../context/ThemeContext';

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
				<Pressable style={StyleSheet.absoluteFillObject} onPress={onPress} />
			)}
		</Animated.View>
	);
};

const backdropStyles = StyleSheet.create({
	container: {
		backgroundColor: 'rgba(0,0,0,0.5)',
	},
});

export interface BaseBottomSheetProps extends Omit<BottomSheetProps, 'backdropComponent'> {
	onClose?: () => void;
	headerBackgroundColor?: string;
	noGrip?: boolean;
}

const BaseBottomSheet = forwardRef<BottomSheet, BaseBottomSheetProps>(({ onClose, children, backgroundStyle, onChange, headerBackgroundColor, noGrip, ...props }, ref) => {
	const renderBackdrop = useCallback((backdropProps: BottomSheetBackdropProps) => <CustomBackdrop {...backdropProps} onPress={onClose} />, [onClose]);
	const { theme } = useTheme();
	const { top: topInset } = useSafeAreaInsets();
	const snapPoints = useMemo(() => ['80%'], []);

	const usedHeaderBg = headerBackgroundColor || theme.screen.background;
	const effectiveBackgroundStyle = { backgroundColor: usedHeaderBg };

	const handleColor = theme.sheet.closeBg;

	const handleChange = useCallback(
		(index: number) => {
			if (index === -1) {
				onClose?.();
			}
			(onChange as any)?.(index);
		},
		[onClose, onChange],
	);

	return (
		<BottomSheet ref={ref} snapPoints={snapPoints} backdropComponent={renderBackdrop} backgroundStyle={effectiveBackgroundStyle} handleComponent={null} onChange={handleChange} keyboardBehavior="interactive" keyboardBlurBehavior="restore" android_keyboardInputMode="adjustResize" topInset={topInset} {...props}>
			<View style={styles.header}>
				<View style={styles.placeholder} />
				{!noGrip && <View style={[styles.handle, { backgroundColor: handleColor }]} />}
				<TouchableOpacity style={[styles.closeButton, { backgroundColor: theme.sheet.closeBg }]} onPress={onClose}>
					<AntDesign name="close" size={24} color={theme.sheet.closeIcon} />
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
