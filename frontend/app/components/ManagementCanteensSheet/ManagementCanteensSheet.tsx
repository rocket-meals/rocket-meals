import { Dimensions, Image, Text, TouchableOpacity, View } from 'react-native';
import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { BottomSheetScrollView } from '@gorhom/bottom-sheet';
import styles from './styles';
import { useTheme } from '@/hooks/useTheme';
import { CanteenProps, ManagementCanteensSheetProps } from './types';
import { isWeb, canteensData } from '@/constants/Constants';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { excerpt, getImageUrl } from '@/constants/HelperFunctions';
import { useLanguage } from '@/hooks/useLanguage';
import { CanteenHelper } from '@/redux/actions';
import { BuildingsHelper } from '@/redux/actions/Buildings/Buildings';
import { Buildings, Canteens } from '@/constants/types';
import { SET_BUILDINGS, SET_CANTEENS } from '@/redux/Types/types';
import { TranslationKeys } from '@/locales/keys';
import { RootState } from '@/redux/reducer';

const ManagementCanteensSheet: React.FC<ManagementCanteensSheetProps> = ({
  closeSheet,
  handleSelectCanteen,
}) => {
  const { theme } = useTheme();
  const { translate } = useLanguage();
  const dispatch = useDispatch();
  const canteenHelper = new CanteenHelper();
  const buildingsHelper = new BuildingsHelper();
  const { serverInfo } = useSelector((state: RootState) => state.settings);
  const { isManagement } = useSelector((state: RootState) => state.authReducer);
  const { canteens } = useSelector((state: RootState) => state.canteenReducer);
  const defaultImage = getImageUrl(serverInfo?.info?.project?.project_logo);
  const [screenWidth, setScreenWidth] = useState(
    Dimensions.get('window').width
  );

  const getCanteensWithBuildings = async () => {
    try {
      const buildingsData = (await buildingsHelper.fetchBuildings(
        {}
      )) as Buildings[];
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
      )) as Canteens[];

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
        {canteens &&
          canteens?.map((canteen, index: number) => (
            <TouchableOpacity
              style={{
                ...styles.card,
                width: screenWidth > 800 ? 210 : 160,
                backgroundColor: theme.card.background,
                marginBottom: 10,
              }}
              key={canteen.alias}
              onPress={() => {
                handleSelectCanteen(canteen);
              }}
            >
              <View
                style={{
                  ...styles.imageContainer,
                  height: screenWidth > 800 ? 210 : 160,
                }}
              >
                <Image
                  style={styles.image}
                  source={
                    canteen?.image_url || canteensData[index]?.image
                      ? {
                          uri: canteen?.image_url || canteensData[index]?.image,
                        }
                      : { uri: defaultImage }
                  }
                />
                {canteen.status === 'archived' && (
                  <View style={styles.archiveContainer}>
                    <MaterialCommunityIcons
                      name='archive'
                      size={18}
                      color={theme.screen.text}
                    />
                  </View>
                )}
              </View>
              <Text
                style={{ ...styles.foodName, color: theme.screen.text }}
                numberOfLines={3}
                ellipsizeMode='tail'
              >
                {excerpt(String(canteen.alias), 20)}
              </Text>
            </TouchableOpacity>
          ))}
      </View>
    </BottomSheetScrollView>
  );
};

export default ManagementCanteensSheet;
