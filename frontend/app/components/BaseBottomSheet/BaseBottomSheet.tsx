import React, { forwardRef, useCallback } from 'react';
import { Dimensions } from 'react-native';
import BottomSheet, {
  BottomSheetBackdrop,
  type BottomSheetProps,
  type BottomSheetBackdropProps,
} from '@gorhom/bottom-sheet';

export interface BaseBottomSheetProps extends Omit<BottomSheetProps, 'backdropComponent'> {
  onBackdropPress?: () => void;
}

const MAX_HEIGHT = Dimensions.get('window').height * 0.8;

const BaseBottomSheet = forwardRef<BottomSheet, BaseBottomSheetProps>(
  ({ onBackdropPress, ...props }, ref) => {
    const renderBackdrop = useCallback(
      (backdropProps: BottomSheetBackdropProps) => (
        <BottomSheetBackdrop
          {...backdropProps}
          appearsOnIndex={0}
          disappearsOnIndex={-1}
          onPress={onBackdropPress}
        />
      ),
      [onBackdropPress]
    );

    return (
      <BottomSheet
        ref={ref}
        enableDynamicSizing
        maxDynamicContentSize={MAX_HEIGHT}
        backdropComponent={renderBackdrop}
        {...props}
      />
    );
  }
);

export default BaseBottomSheet;
