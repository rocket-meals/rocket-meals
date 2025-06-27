import React, { forwardRef, useCallback, useMemo } from 'react';
import { Dimensions, View, TouchableOpacity } from 'react-native';
import BottomSheet, {
  BottomSheetBackdrop,
  type BottomSheetProps,
  type BottomSheetBackdropProps,
} from '@gorhom/bottom-sheet';
import { AntDesign } from '@expo/vector-icons';
import { useTheme } from '@/hooks/useTheme';
import { myContrastColor } from '@/helper/colorHelper';
import { useSelector } from 'react-redux';
import type { RootState } from '@/redux/reducer';
import styles from './styles';

export interface BaseBottomSheetProps
  extends Omit<BottomSheetProps, 'backdropComponent'> {
  onClose?: () => void;
}

const MAX_HEIGHT = Dimensions.get('window').height * 0.8;

const BaseBottomSheet = forwardRef<BottomSheet, BaseBottomSheetProps>(
  ({ onClose, children, backgroundStyle, onChange, ...props }, ref) => {
    const renderBackdrop = useCallback(
      (backdropProps: BottomSheetBackdropProps) => (
        <BottomSheetBackdrop
          {...backdropProps}
          appearsOnIndex={0}
          disappearsOnIndex={-1}
          onPress={onClose}
        />
      ),
      [onClose]
    );
    const { theme } = useTheme();
    const { selectedTheme: mode, drawerPosition } = useSelector(
      (state: RootState) => state.settings
    );
    const snapPoints = useMemo(() => ['80%'], []);

    const headerBg = backgroundStyle?.backgroundColor || theme.sheet.sheetBg;
    const handleColor = myContrastColor(headerBg, theme, mode === 'dark');

    const handleChange = useCallback(
      (index: number) => {
        if (index === -1) {
          onClose?.();
        }
        onChange?.(index);
      },
      [onClose, onChange]
    );

    return (
      <BottomSheet
        ref={ref}
        snapPoints={snapPoints}
        enableDynamicSizing
        maxDynamicContentSize={MAX_HEIGHT}
        backdropComponent={renderBackdrop}
        backgroundStyle={backgroundStyle}
        handleComponent={null}
        onChange={handleChange}
        {...props}
      >
        <View style={[styles.header, { backgroundColor: headerBg }]}>
          {drawerPosition === 'left' ? (
            <>
              <TouchableOpacity
                style={[styles.closeButton, { backgroundColor: theme.sheet.closeBg }]}
                onPress={onClose}
              >
                <AntDesign name='close' size={24} color={theme.sheet.closeIcon} />
              </TouchableOpacity>
              <View style={[styles.handle, { backgroundColor: handleColor }]} />
              <View style={styles.placeholder} />
            </>
          ) : (
            <>
              <View style={styles.placeholder} />
              <View style={[styles.handle, { backgroundColor: handleColor }]} />
              <TouchableOpacity
                style={[styles.closeButton, { backgroundColor: theme.sheet.closeBg }]}
                onPress={onClose}
              >
                <AntDesign name='close' size={24} color={theme.sheet.closeIcon} />
              </TouchableOpacity>
            </>
          )}
        </View>
        {children}
      </BottomSheet>
    );
  }
);

export default BaseBottomSheet;
