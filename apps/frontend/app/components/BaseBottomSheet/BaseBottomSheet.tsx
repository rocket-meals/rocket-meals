import React, { forwardRef, useCallback, useMemo } from 'react';
import { Platform, Pressable, StyleSheet as RNStyleSheet, TouchableOpacity, View } from 'react-native';
import Animated, { Extrapolation, interpolate, useAnimatedStyle } from 'react-native-reanimated';
import BottomSheet, { type BottomSheetBackdropProps, type BottomSheetProps } from '@gorhom/bottom-sheet';
import { AntDesign } from '@expo/vector-icons';
import { useTheme } from '@/hooks/useTheme';
import { useAppSelector } from '@/redux/hooks';
import styles from './styles';

// Custom backdrop that calls onClose directly (like the close button) without
// triggering the sheet's own close animation. This prevents the sheet from
// physically collapsing and re-expanding when the backdrop is pressed while a
// nested modal is visible, which could otherwise close all stacked modals.
interface CustomBackdropProps extends BottomSheetBackdropProps {
        onPress?: () => void;
}

const CustomBackdrop: React.FC<CustomBackdropProps> = ({ animatedIndex, style, onPress }) => {
        const containerAnimatedStyle = useAnimatedStyle(() => ({
                opacity: interpolate(animatedIndex.value, [-1, 0], [0, 1], Extrapolation.CLAMP),
        }));

        return (
                <Animated.View
                        style={[style, containerAnimatedStyle, backdropStyles.container]}
                        pointerEvents="box-none"
                >
                        <Pressable style={RNStyleSheet.absoluteFillObject} onPress={onPress} />
                </Animated.View>
        );
};

const backdropStyles = RNStyleSheet.create({
        container: {
                backgroundColor: 'rgba(0,0,0,0.5)',
        },
});

export interface BaseBottomSheetProps extends Omit<BottomSheetProps, 'backdropComponent'> {
        onClose?: () => void;
        headerBackgroundColor?: string;
}

const BaseBottomSheet = forwardRef<BottomSheet, BaseBottomSheetProps>(({ onClose, children, backgroundStyle, onChange, headerBackgroundColor, ...props }, ref) => {
        const renderBackdrop = useCallback((backdropProps: BottomSheetBackdropProps) => <CustomBackdrop {...backdropProps} onPress={onClose} />, [onClose]);
        const { theme } = useTheme();
        useAppSelector((state) => state.settings); // ensure theme subscription
        const snapPoints = useMemo(() => ['80%'], []);

        //const effectiveBackgroundStyle = useMemo(() => ({ backgroundColor: theme.sheet.sheetBg, ...backgroundStyle }), [backgroundStyle, theme.sheet.sheetBg]);

		const usedHeaderBg = headerBackgroundColor || theme.screen.background;

		const effectiveBackgroundStyle = {backgroundColor: usedHeaderBg};
        //const headerBg = headerBackgroundColor || (effectiveBackgroundStyle as any).backgroundColor || theme.sheet.sheetBg;

        const handleColor = theme.sheet.closeBg;

	const handleChange = useCallback(
		(index: number) => {
			if (index === -1) {
				onClose?.();
			}
			// @gorhom/bottom-sheet expects (index, position, type)
			(onChange as any)?.(index);
		},
		[onClose, onChange]
	);

        // On web, the Animated.View used by CustomBackdrop applies pointerEvents="box-none",
        // which is not a valid CSS value — browsers default it to "auto", causing the full-screen
        // backdrop container to intercept ALL click events. Disabling the backdrop component on web
        // avoids this; the ModalProvider overlay handles dimming and press-to-close instead.
        const effectiveBackdropComponent = Platform.OS === 'web' ? null : renderBackdrop;

        return (
                <BottomSheet ref={ref} snapPoints={snapPoints} backdropComponent={effectiveBackdropComponent} backgroundStyle={effectiveBackgroundStyle} handleComponent={null} onChange={handleChange} {...props}>
			<View style={[styles.header]}>
				<View style={styles.placeholder} />
				<View style={[styles.handle, { backgroundColor: handleColor }]} />
				<TouchableOpacity style={[styles.closeButton, { backgroundColor: theme.sheet.closeBg }]} onPress={onClose}>
					<AntDesign name="close" size={24} color={theme.sheet.closeIcon} />
				</TouchableOpacity>
			</View>
			{children}
		</BottomSheet>
	);
});

export default BaseBottomSheet;
