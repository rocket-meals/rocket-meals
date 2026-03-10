import React, { forwardRef, useCallback, useMemo } from 'react';
import { TouchableOpacity, View } from 'react-native';
import BottomSheet, { BottomSheetBackdrop, type BottomSheetBackdropProps, type BottomSheetProps } from '@gorhom/bottom-sheet';
import { AntDesign } from '@expo/vector-icons';
import { useTheme } from '@/hooks/useTheme';
import { useAppSelector } from '@/redux/hooks';
import styles from './styles';

export interface BaseBottomSheetProps extends BottomSheetProps {
        onClose?: () => void;
        headerBackgroundColor?: string;
        backdropPressBehavior?: 'close' | 'none' | 'collapse' | number;
}

const BaseBottomSheet = forwardRef<BottomSheet, BaseBottomSheetProps>(({ onClose, children, backgroundStyle, onChange, headerBackgroundColor, backdropPressBehavior, ...props }, ref) => {
        const renderBackdrop = useCallback((backdropProps: BottomSheetBackdropProps) => <BottomSheetBackdrop {...backdropProps} appearsOnIndex={0} disappearsOnIndex={-1} onPress={onClose} pressBehavior={backdropPressBehavior ?? 'close'} />, [onClose, backdropPressBehavior]);
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

        return (
                <BottomSheet ref={ref} snapPoints={snapPoints} backdropComponent={renderBackdrop} backgroundStyle={effectiveBackgroundStyle} handleComponent={null} onChange={handleChange} {...props}>
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
