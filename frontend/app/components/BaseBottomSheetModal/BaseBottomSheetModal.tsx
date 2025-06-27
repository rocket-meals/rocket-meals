import React, { useEffect, useRef } from 'react';
import { View, Dimensions } from 'react-native';
import Modal from 'react-native-modal';
import BottomSheet from '@gorhom/bottom-sheet';
import BaseBottomSheet from '../BaseBottomSheet';
import { isWeb } from '@/constants/Constants';
import { useTheme } from '@/hooks/useTheme';

export interface BaseBottomSheetModalProps {
  isVisible: boolean;
  onClose: () => void;
  children: React.ReactNode;
}

const BaseBottomSheetModal: React.FC<BaseBottomSheetModalProps> = ({
  isVisible,
  onClose,
  children,
}) => {
  const sheetRef = useRef<BottomSheet>(null);
  const { theme } = useTheme();

  useEffect(() => {
    if (!isWeb()) {
      if (isVisible) {
        sheetRef.current?.expand();
      } else {
        sheetRef.current?.close();
      }
    }
  }, [isVisible]);

  if (isWeb()) {
    const maxHeight = Dimensions.get('window').height * 0.8;
    return (
      <Modal
        isVisible={isVisible}
        style={{ justifyContent: 'flex-end', margin: 0 }}
        onBackdropPress={onClose}
        onBackButtonPress={onClose}
      >
        <View
          style={{
            backgroundColor: theme.sheet.sheetBg,
            borderTopLeftRadius: 28,
            borderTopRightRadius: 28,
            maxHeight,
          }}
        >
          {children}
        </View>
      </Modal>
    );
  }

  return (
    <BaseBottomSheet ref={sheetRef} index={-1} enablePanDownToClose onClose={onClose}>
      {children}
    </BaseBottomSheet>
  );
};

export default BaseBottomSheetModal;
