import React, { useRef, useState, useCallback, useMemo } from 'react';
import { View } from 'react-native';
import DataAcess from '../../../components/DataAcces/DataAccess';
import DataSheet from '../../../components/DataAccesheet/DataSheet';
import styles from './styles';
import { useTheme } from '@/hooks/useTheme';
import BaseBottomSheet from '@/components/BaseBottomSheet';
import type BottomSheet from '@gorhom/bottom-sheet';
import { useFocusEffect } from 'expo-router';
import { TranslationKeys } from '@/locales/keys';
import useSetPageTitle from '@/hooks/useSetPageTitle';

const index = () => {
  useSetPageTitle(TranslationKeys.dataAccess);
  const { theme } = useTheme();
  const bottomSheetRef = useRef<BottomSheet>(null);
  const [isActive, setIsActive] = useState(false);
  const [content, setContent] = useState([]);

  const handleOpenBottomSheet = useCallback((data: any) => {
    setContent(data);
    bottomSheetRef?.current?.expand();
  }, []);

  const closeCanteenSheet = useCallback(() => {
    bottomSheetRef?.current?.close();
  }, []);

  useFocusEffect(
    useCallback(() => {
      setIsActive(true);
      return () => {
        setIsActive(false);
      };
    }, [])
  );

  return (
    <View style={styles.container}>
      <DataAcess onOpenBottomSheet={handleOpenBottomSheet} />
      {isActive && (
        <BaseBottomSheet
          ref={bottomSheetRef}
          index={-1}
          backgroundStyle={{
            ...styles.sheetBackground,
            backgroundColor: theme.sheet.sheetBg,
          }}
          enablePanDownToClose
          handleComponent={null}
          onClose={closeCanteenSheet}
        >
          <DataSheet closeSheet={closeCanteenSheet} content={content} />
        </BaseBottomSheet>
      )}
    </View>
  );
};

export default index;
