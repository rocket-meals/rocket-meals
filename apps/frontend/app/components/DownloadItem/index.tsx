import React from 'react';
import { Text, View } from 'react-native';
import CardWithText from '../CardWithText/CardWithText';
import { DownloadItemProps } from './types';
import styles from './styles';
import { useTheme } from '@/hooks/useTheme';
import { useSelector } from 'react-redux';
import { RootState } from '@/redux/reducer';
import QrCode from '@/components/QrCode';

const DownloadItem: React.FC<DownloadItemProps> = ({
  label,
  imageSource,
  onPress,
  containerStyle,
  qrValue,
}) => {
  const { theme } = useTheme();
  const { primaryColor } = useSelector((state: RootState) => state.settings);
  return (
    <CardWithText
      onPress={onPress}
      imageSource={imageSource}
      containerStyle={[
        styles.card,
        { backgroundColor: theme.card.background },
        containerStyle,
      ]}
      imageContainerStyle={styles.imageContainer}
      borderColor={primaryColor}
      bottomContent={
        <>
          {qrValue && (
            <View style={styles.qrContainer} pointerEvents='none'>
              <QrCode value={qrValue} size={110} />
            </View>
          )}
          <Text style={[styles.label, { color: theme.screen.text }]}>{label}</Text>
        </>
      }
    />
  );
};

export default DownloadItem;
