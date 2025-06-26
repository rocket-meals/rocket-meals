import React, { forwardRef, useCallback } from 'react';
import { Dimensions, View, TouchableOpacity } from 'react-native';
import BottomSheet, {
  BottomSheetBackdrop,
  type BottomSheetProps,
  type BottomSheetBackdropProps,
} from '@gorhom/bottom-sheet';
import { AntDesign } from '@expo/vector-icons';
import { useTheme } from '@/hooks/useTheme';
import styles from './styles';

export interface BaseBottomSheetProps extends Omit<BottomSheetProps, 'backdropComponent'> {
  onClose?: () => void;
}

const MAX_HEIGHT = Dimensions.get('window').height * 0.8;

const BaseBottomSheet = forwardRef<BottomSheet, BaseBottomSheetProps>(
  ({ onClose, children, backgroundStyle, ...props }, ref) => {
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

    const headerBg = backgroundStyle?.backgroundColor || theme.sheet.sheetBg;

    return (
      <BottomSheet
        ref={ref}
        enableDynamicSizing
        maxDynamicContentSize={MAX_HEIGHT}
        backdropComponent={renderBackdrop}
        backgroundStyle={backgroundStyle}
        handleComponent={null}
        {...props}
      >
        <View style={[styles.header, { backgroundColor: headerBg }]}>
          <TouchableOpacity
            style={[styles.closeButton, { backgroundColor: theme.sheet.closeBg }]}
            onPress={onClose}
          >
            <AntDesign name='close' size={24} color={theme.sheet.closeIcon} />
          </TouchableOpacity>
        </View>
        {children}
      </BottomSheet>
    );
  }
);

export default BaseBottomSheet;
