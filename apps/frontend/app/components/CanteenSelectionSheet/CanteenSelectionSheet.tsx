import { Dimensions, Image, Text, TouchableOpacity, View } from 'react-native';
import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { BottomSheetScrollView } from '@gorhom/bottom-sheet';
import styles from './styles';
import { useTheme } from '@/hooks/useTheme';
import { CanteenProps, CanteenSelectionSheetProps } from './types';
import { isWeb, canteensData } from '@/constants/Constants';
import {
  SET_BUILDINGS,
  SET_CANTEENS,
  SET_SELECTED_CANTEEN,
} from '@/redux/Types/types';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { excerpt, getImageUrl } from '@/constants/HelperFunctions';
import { useLanguage } from '@/hooks/useLanguage';
import { DatabaseTypes } from 'repo-depkit-common';
import { CanteenHelper } from '@/redux/actions';
import { BuildingsHelper } from '@/redux/actions/Buildings/Buildings';
import { TranslationKeys } from '@/locales/keys';
import { RootState } from '@/redux/reducer';
import CardWithText from '../CardWithText/CardWithText';

const CanteenSelectionSheet: React.FC<CanteenSelectionSheetProps> = ({
  closeSheet,
}) => {
  const { theme } = useTheme();
  const { translate } = useLanguage();
  const dispatch = useDispatch();
  const canteenHelper = new CanteenHelper();
  const buildingsHelper = new BuildingsHelper();
  const { serverInfo, appSettings, primaryColor } = useSelector(
    (state: RootState) => state.settings,
  );
  const { canteens, selectedCanteen } = useSelector(
    (state: RootState) => state.canteenReducer,
  );
  const { isManagement } = useSelector((state: RootState) => state.authReducer);
  const [screenWidth, setScreenWidth] = useState(
    Dimensions.get('window').width
  );
  const defaultImage = getImageUrl(serverInfo?.info?.project?.project_logo);
  const foods_area_color = appSettings?.foods_area_color
    ? appSettings?.foods_area_color
    : primaryColor;

  const handleSelectCanteen = (canteen: DatabaseTypes.Canteens) => {
    dispatch({ type: SET_SELECTED_CANTEEN, payload: canteen });
    closeSheet();
  };

  const getCanteensWithBuildings = async () => {
    try {
      const buildingsData = (await buildingsHelper.fetchBuildings(
        {}
      )) as DatabaseTypes.Buildings[];
      const buildings = buildingsData || [];

      const buildingsDict = buildings.reduce(
        (acc: Record<string, any>, building: any) => {
          acc[building.id] = building;
          return acc;
        },
        {}
      );

      dispatch({ type: SET_BUILDINGS, payload: buildings });

      const canteensData = (await canteenHelper.fetchCanteens(
        {}
      )) as DatabaseTypes.Canteens[];

      const filteredCanteens = canteensData.filter((canteen) => {
        const status = canteen.status || '';

        // Normal users: only show published
        if (!isManagement) {
          return status === 'published';
        }

        // Management: show all, but only handle published + archived
        return status === 'published' || status === 'archived';
      });

      const sortedCanteens = filteredCanteens.sort((a, b) => {
        const aPublished = a.status === 'published';
        const bPublished = b.status === 'published';

        // Move unpublished (archived) to the end
        if (aPublished !== bPublished) {
          return aPublished ? -1 : 1;
        }

        // If both are same status, sort by sort value
        return (a.sort || 0) - (b.sort || 0);
      });

      const updatedCanteens = sortedCanteens.map((canteen) => {
        const building = buildingsDict[canteen?.building as string];
        return {
          ...canteen,
          imageAssetId: building?.image,
          thumbHash: building?.image_thumb_hash,
          image_url: building?.image_remote_url || getImageUrl(building?.image),
        };
      });

      dispatch({ type: SET_CANTEENS, payload: updatedCanteens });
    } catch (error) {
      console.error('Error fetching data:', error);
    }
  };

  useEffect(() => {
    getCanteensWithBuildings();
  }, [isManagement]);

  useEffect(() => {
    const handleResize = () => {
      setScreenWidth(Dimensions.get('window').width);
    };

    const subscription = Dimensions.addEventListener('change', handleResize);

    return () => subscription?.remove();
  }, []);

  return (
    <BottomSheetScrollView
      style={{ ...styles.sheetView, backgroundColor: theme.sheet.sheetBg }}
      contentContainerStyle={styles.contentContainer}
    >
      <View
        style={{
          ...styles.sheetHeader,
          paddingRight: isWeb ? 10 : 0,
          paddingTop: isWeb ? 10 : 0,
        }}
      >
      </View>
      <Text
        style={{
          ...styles.sheetHeading,
          fontSize: isWeb ? 40 : 32,
          color: theme.sheet.text,
        }}
      >
        {translate(TranslationKeys.canteen)}
      </Text>
      <View
        style={{
          ...styles.canteensContainer,
          width: isWeb ? '100%' : '100%',
          gap: isWeb ? (screenWidth < 500 ? 10 : 20) : 5,
          marginTop: isWeb ? 40 : 20,
        }}
      >
        {canteens.map((canteen, index: number) => {
          const isSelected =
            selectedCanteen &&
            String(selectedCanteen.id) === String(canteen.id);
          return (
            <CardWithText
              key={canteen.id + canteen.alias}
              onPress={() => {
                handleSelectCanteen(canteen);
              }}
              imageSource={
                canteen?.image_url || canteensData[index]?.image
                  ? {
                      uri: canteen?.image_url || canteensData[index]?.image,
                    }
                  : { uri: defaultImage }
              }
              containerStyle={{
                ...styles.card,
                width: screenWidth > 800 ? 210 : 160,
                backgroundColor: theme.card.background,
                marginBottom: 10,
                borderColor: isSelected ? foods_area_color : 'transparent',
                borderWidth: isSelected ? 3 : 0,
              }}
              imageContainerStyle={{
                ...styles.imageContainer,
                height: screenWidth > 800 ? 210 : 160,
              }}
            >
              {canteen.status === 'archived' && (
                <View style={styles.archiveContainer}>
                  <MaterialCommunityIcons
                    name='archive'
                    size={18}
                    color={theme.screen.text}
                  />
                </View>
              )}
              <Text
                style={{ ...styles.foodName, color: theme.screen.text }}
                numberOfLines={3}
                ellipsizeMode='tail'
              >
                {excerpt(String(canteen.alias), 20)}
              </Text>
            </CardWithText>
          );
        })}
      </View>
    </BottomSheetScrollView>
  );
};

export default CanteenSelectionSheet;
