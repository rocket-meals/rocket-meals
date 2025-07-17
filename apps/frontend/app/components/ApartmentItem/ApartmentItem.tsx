import { Dimensions, Image, Text, TouchableOpacity, View } from 'react-native';
import React, { memo, useEffect, useState } from 'react';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { isWeb } from '@/constants/Constants';
import { excerpt, getImageUrl } from '@/constants/HelperFunctions';
import { useTheme } from '@/hooks/useTheme';
import { useSelector } from 'react-redux';
import { router } from 'expo-router';
import { BuildingItemProps } from './types';
import styles from './styles';
import { myContrastColor } from '@/helper/colorHelper';
import { Tooltip, TooltipContent, TooltipText } from '@gluestack-ui/themed';
import { useLanguage } from '@/hooks/useLanguage';
import { TranslationKeys } from '@/locales/keys';
import { RootState } from '@/redux/reducer';
import CardWithText from '../CardWithText/CardWithText';

const ApartmentItem: React.FC<BuildingItemProps> = ({
  apartment,
  setSelectedApartementId,
  openImageManagementSheet,
}) => {
  const { theme } = useTheme();
  const { translate } = useLanguage();
  const {
    primaryColor: projectColor,
    appSettings,
    serverInfo,
    selectedTheme: mode,
    amountColumnsForcard,
  } = useSelector((state: RootState) => state.settings);
  const defaultImage = getImageUrl(serverInfo?.info?.project?.project_logo);
  const { isManagement } = useSelector((state: RootState) => state.authReducer);
  const [screenWidth, setScreenWidth] = useState(
    Dimensions.get('window').width
  );
  const housing_area_color = appSettings?.housing_area_color
    ? appSettings?.housing_area_color
    : projectColor;
  const contrastColor = myContrastColor(
    housing_area_color,
    theme,
    mode === 'dark'
  );

  const handleNavigation = (id: string) => {
    router.push({
      pathname: '/(app)/housing/details',
      params: { id },
    });
  };

  useEffect(() => {
    const handleResize = () => {
      setScreenWidth(Dimensions.get('window').width);
    };

    const subscription = Dimensions.addEventListener('change', handleResize);

    return () => subscription?.remove();
  }, []);

  const getCardDimension = () => {
    if (screenWidth < 1110 && screenWidth > 960) return 300;
    else if (screenWidth < 840 && screenWidth > 750) return 350;
    else if (screenWidth < 750 && screenWidth > 710) return 330;
    else if (screenWidth < 709 && screenWidth > 650) return 300;
    else if (screenWidth > 570) return 260;
    else if (screenWidth > 530) return 240;
    else if (screenWidth > 500) return 220;
    else if (screenWidth > 450) return 210;
    else if (screenWidth > 380) return 180;
    else if (screenWidth > 360) return 170;
    else if (screenWidth > 340) return 160;
    else if (screenWidth > 320) return 150;
    else if (screenWidth > 300) return 140;
    else if (screenWidth > 280) return 130;
    else return 120;
  };

  const getCardWidth = () => {
    if (screenWidth < 500) {
      const width = screenWidth / amountColumnsForcard - 10;
      return width;
    } else if (screenWidth < 900) {
      const width = screenWidth / amountColumnsForcard - 25;
      return width;
    } else {
      const width = screenWidth / amountColumnsForcard - 35; // Adjust as needed for larger screens
      return width;
    }
  };

  useEffect(() => {
    const cardWidth = getCardWidth();
  }, [amountColumnsForcard, screenWidth]);

  return (
    <Tooltip
      placement='top'
      trigger={(triggerProps) => (
        <CardWithText
          {...triggerProps}
          onPress={() => handleNavigation(apartment?.id)}
          imageSource={
            apartment?.image || apartment?.image_remote_url
              ? {
                  uri:
                    apartment?.image_remote_url ||
                    getImageUrl(apartment?.image),
                }
              : { uri: defaultImage }
          }
          containerStyle={{
            ...styles.card,
            width:
              amountColumnsForcard === 0 ? getCardDimension() : getCardWidth(),
            backgroundColor: theme.card.background,
          }}
          imageContainerStyle={{
            ...styles.imageContainer,
            height:
              amountColumnsForcard === 0
                ? getCardDimension()
                : getCardWidth(),
          }}
          contentStyle={{
            ...styles.cardContent,
            paddingHorizontal: 5,
          }}
          borderColor={housing_area_color}
          imageChildren={
            <View style={styles.imageActionContainer}>
              {isManagement ? (
                <Tooltip
                  placement='top'
                  trigger={(triggerProps) => (
                    <TouchableOpacity
                      {...triggerProps}
                      style={styles.editImageButton}
                      onPress={() => {
                        setSelectedApartementId(apartment.id);
                        openImageManagementSheet();
                      }}
                    >
                      <MaterialCommunityIcons
                        name='image-edit'
                        size={20}
                        color={'white'}
                      />
                    </TouchableOpacity>
                  )}
                >
                  <TooltipContent bg={theme.tooltip.background} py='$1' px='$2'>
                    <TooltipText fontSize='$sm' color={theme.tooltip.text}>
                      {`${translate(TranslationKeys.edit)}: ${translate(
                        TranslationKeys.image
                      )}`}
                    </TooltipText>
                  </TooltipContent>
                </Tooltip>
              ) : (
                <View />
              )}
              {/* Distance modal removed */}
            </View>
          }
        >
          <Text style={{ ...styles.campusName, color: theme.screen.text }}>
            {isWeb
              ? excerpt(apartment?.alias, 70)
              : excerpt(apartment?.alias, 40)}
          </Text>
        </CardWithText>
      )}
    >
      <TooltipContent bg={theme.tooltip.background} py='$1' px='$2'>
        <TooltipText fontSize='$sm' color={theme.tooltip.text}>
          {apartment?.alias}
        </TooltipText>
      </TooltipContent>
    </Tooltip>
  );
};

export default memo(ApartmentItem);
