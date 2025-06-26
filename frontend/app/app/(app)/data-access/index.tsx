import React, { useRef, useState, useCallback, useMemo } from 'react';
import { View } from 'react-native';
import DataAcess from '../../../components/DataAcces/DataAccess';
import DataSheet from '../../../components/DataAccesheet/DataSheet';
import styles from './styles';
import { useTheme } from '@/hooks/useTheme';
import BottomSheet, { BottomSheetBackdrop } from '@gorhom/bottom-sheet';
import { useFocusEffect } from 'expo-router';
import { TranslationKeys } from '@/locales/keys';
import useSetPageTitle from '@/hooks/useSetPageTitle';

const index = () => {
  useSetPageTitle(TranslationKeys.dataAccess);
  const { theme } = useTheme();
  const bottomSheetRef = useRef<BottomSheet>(null);
  const snapPoints = useMemo(() => ['90%'], []);
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
        <BottomSheet
          ref={bottomSheetRef}
          index={-1}
          snapPoints={snapPoints}
          backgroundStyle={{
            ...styles.sheetBackground,
            backgroundColor: theme.sheet.sheetBg,
          }}
          enablePanDownToClose
          handleComponent={null}
          backdropComponent={(props) => (
            <BottomSheetBackdrop
              {...props}
              appearsOnIndex={0}
              disappearsOnIndex={-1}
              onPress={closeCanteenSheet}
            />
          )}
        >
          <DataSheet closeSheet={closeCanteenSheet} content={content} />
        </BottomSheet>
      )}
    </View>
  );
};

export default index;
