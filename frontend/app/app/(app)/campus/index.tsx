import {
  SafeAreaView,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  RefreshControl,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import styles from './styles';
import { useTheme } from '@/hooks/useTheme';
import { isWeb } from '@/constants/Constants';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import {
  DrawerContentComponentProps,
  DrawerNavigationProp,
} from '@react-navigation/drawer';
import { RootDrawerParamList } from './types';
import { useFocusEffect, useNavigation } from 'expo-router';
import BuildingItem from '@/components/BuildingItem/BuildingItem';
import { useDispatch, useSelector } from 'react-redux';
import { CampusHelper } from '@/redux/actions/Campus/Campus';
import { Buildings } from '@/constants/types';
import {
  SET_CAMPUSES,
  SET_CAMPUSES_DICT,
  SET_CAMPUSES_LOCAL,
  SET_UNSORTED_CAMPUSES,
} from '@/redux/Types/types';
import { BuildingsHelper } from '@/redux/actions/Buildings/Buildings';
import { calculateDistanceInMeter } from '@/helper/distanceHelper';
import BaseBottomSheet from '@/components/BaseBottomSheet';
import type BottomSheet from '@gorhom/bottom-sheet';
import BuildingSortSheet from '@/components/BuildingSortSheet/BuildingSortSheet';
import useToast from '@/hooks/useToast';
import { useLanguage } from '@/hooks/useLanguage';
import ImageManagementSheet from '@/components/ImageManagementSheet/ImageManagementSheet';
import { Tooltip, TooltipContent, TooltipText } from '@gluestack-ui/themed';
import { TranslationKeys } from '@/locales/keys';
import useSetPageTitle from '@/hooks/useSetPageTitle';
import { RootState } from '@/redux/reducer';

const index: React.FC<DrawerContentComponentProps> = ({ navigation }) => {
  useSetPageTitle(TranslationKeys.campus);
  const { theme } = useTheme();
  const toast = useToast();
  const dispatch = useDispatch();
  const { translate } = useLanguage();
  const campusHelper = new CampusHelper();
  const buildingsHelper = new BuildingsHelper();

  const [query, setQuery] = useState<string>('');
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [campusesDispatched, setCampusesDispatched] = useState(false);
  const [selectedBuilding, setSelectedBuilding] = useState<Buildings | null>();
  const [isActive, setIsActive] = useState(false);
  const [distanceAdded, setDistanceAdded] = useState(false);
  const [selectedApartmentId, setSelectedApartementId] = useState<string>('');
  const [screenWidth, setScreenWidth] = useState(
    Dimensions.get('window').width
  );
  const { drawerPosition, campusesSortBy } = useSelector(
    (state: RootState) => state.settings
  );
  const { campuses, campusesLocal, unSortedCampuses } = useSelector(
    (state: RootState) => state.campus
  );
  const { selectedCanteen } = useSelector(
    (state: RootState) => state.canteenReducer
  );
  const drawerNavigation =
    useNavigation<DrawerNavigationProp<RootDrawerParamList>>();

  const sortSheetRef = useRef<BottomSheet>(null);
  const imageManagementSheetRef = useRef<BottomSheet>(null);

  const openSortSheet = () => {
    sortSheetRef.current?.expand();
  };

  const closeSortSheet = () => {
    sortSheetRef?.current?.close();
  };

  const openImageManagementSheet = () => {
    imageManagementSheetRef?.current?.expand();
  };

  const closeImageManagementSheet = () => {
    imageManagementSheetRef?.current?.close();
  };

  useFocusEffect(
    useCallback(() => {
      setIsActive(true);
      return () => {
        setIsActive(false);
      };
    }, [])
  );

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    setCampusesDispatched(false);
    fetchAllCampuses();
    setRefreshing(false);
  }, []);

  const fetchAllCampuses = async () => {
    setLoading(true);
    const campusData = (await campusHelper.fetchCampus({})) as Buildings[];
    const campuses = campusData || [];
    if (campuses) {
      const attributesDict = campuses.reduce((acc, campus) => {
        if (campus.id) {
          acc[campus.id] = campus;
        }
        return acc;
      }, {} as Record<string, Buildings>);
      dispatch({ type: SET_CAMPUSES, payload: campuses });
      dispatch({ type: SET_CAMPUSES_DICT, payload: attributesDict });
      setCampusesDispatched(true);
    }
  };

  const updateSort = (id: string, campuses: Buildings[]) => {
    setLoading(true);
    let copiedCampuses = [...campuses];

    switch (id) {
      case 'intelligent':
        copiedCampuses = sortCampusesWithDistance(copiedCampuses) || [];
        break;
      case 'alphabetical':
        copiedCampuses = sortCampusesAlphabetically(copiedCampuses) || [];
        break;
      case 'distance':
        copiedCampuses = sortCampusesWithDistance(copiedCampuses) || [];
        break;
      default:
        copiedCampuses = unSortedCampuses || [];
        break;
    }

    dispatch({
      type: SET_CAMPUSES,
      payload: copiedCampuses,
    });
    dispatch({
      type: SET_CAMPUSES_LOCAL,
      payload: copiedCampuses,
    });
    setLoading(false);
  };

  useEffect(() => {
    if (campuses && selectedBuilding && campusesDispatched) {
      setLoading(true);
      const campusesWithDistance = addDistance(campuses);
      dispatch({
        type: SET_CAMPUSES,
        payload: campusesWithDistance,
      });
      dispatch({
        type: SET_UNSORTED_CAMPUSES,
        payload: campusesWithDistance,
      });
      setDistanceAdded(true);
      setLoading(false);
    }
  }, [selectedBuilding, campusesDispatched]);

  const addDistance = (campuses: Buildings[]) => {
    let campusWithDistance: Array<Buildings> = [];
    if (campuses) {
      campuses?.forEach((campus: any) => {
        const distance = calculateDistanceInMeter(
          selectedBuilding?.coordinates?.coordinates,
          campus?.coordinates?.coordinates
        );
        campusWithDistance.push({ ...campus, distance });
      });
      if (campusWithDistance?.length === 0) {
        return campuses;
      }
      return campusWithDistance;
    }
  };

  const sortCampusesWithDistance = (campuses: Buildings[]) => {
    if (campuses) {
      return campuses?.sort((a: any, b: any) => a.distance - b.distance);
    } else {
      return campuses;
    }
  };

  const sortCampusesAlphabetically = (campuses: Buildings[]) => {
    if (campuses) {
      return campuses?.sort((a: any, b: any) => a.alias.localeCompare(b.alias));
    } else {
      return campuses;
    }
  };

  const fetchSelectedBuilding = async () => {
    if (selectedCanteen?.building) {
      const buildingData = (await buildingsHelper.fetchBuildingById(
        String(selectedCanteen.building)
      )) as Buildings;
      const building = buildingData || [];
      if (building) {
        setSelectedBuilding(building);
      }
    } else {
      toast('Please select canteen', 'error');
    }
  };

  useEffect(() => {
    fetchSelectedBuilding();
    fetchAllCampuses();
  }, []);

  useEffect(() => {
    if (campuses && distanceAdded) {
      updateSort(campusesSortBy, campuses);
    }
  }, [campusesSortBy, distanceAdded]);

  useEffect(() => {
    const debounceTimer = setTimeout(() => {
      if (query === '') {
        dispatch({
          type: SET_CAMPUSES,
          payload: campusesLocal,
        });
      } else {
        const filteredCampuses = campuses?.filter((campus: any) =>
          campus?.alias?.toLowerCase()?.includes(query?.toLowerCase())
        );
        dispatch({
          type: SET_CAMPUSES,
          payload: filteredCampuses,
        });
      }
    }, 500);

    return () => clearTimeout(debounceTimer);
  }, [query]);

  useEffect(() => {
    const handleResize = () => {
      setScreenWidth(Dimensions.get('window').width);
    };

    const subscription = Dimensions.addEventListener('change', handleResize);

    return () => subscription?.remove();
  }, []);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.screen.background }}>
      <View style={{ ...styles.container }}>
        <View
          style={{
            ...styles.header,
            backgroundColor: theme.header.background,
            paddingHorizontal: isWeb ? 20 : 10,
          }}
        >
          <View
            style={[
              styles.row,
              {
                flexDirection:
                  drawerPosition === 'right' ? 'row-reverse' : 'row',
              },
            ]}
          >
            <View
              style={[
                styles.col1,
                {
                  flexDirection:
                    drawerPosition === 'right' ? 'row-reverse' : 'row',
                },
              ]}
            >
              <Tooltip
                placement='top'
                trigger={(triggerProps) => (
                  <TouchableOpacity
                    {...triggerProps}
                    onPress={() => drawerNavigation.toggleDrawer()}
                    style={{ padding: 10 }}
                  >
                    <Ionicons name='menu' size={24} color={theme.header.text} />
                  </TouchableOpacity>
                )}
              >
                <TooltipContent bg={theme.tooltip.background} py='$1' px='$2'>
                  <TooltipText fontSize='$sm' color={theme.tooltip.text}>
                    {`${translate(TranslationKeys.open_drawer)}`}
                  </TooltipText>
                </TooltipContent>
              </Tooltip>

              <Text style={{ ...styles.heading, color: theme.header.text }}>
                {translate(TranslationKeys.campus)}
              </Text>
            </View>
            <View style={{ ...styles.col2, gap: isWeb ? 30 : 15 }}>
              <Tooltip
                placement='top'
                trigger={(triggerProps) => (
                  <TouchableOpacity
                    {...triggerProps}
                    onPress={openSortSheet}
                    style={{ padding: 10 }}
                  >
                    <MaterialIcons
                      name='sort'
                      size={24}
                      color={theme.header.text}
                    />
                  </TouchableOpacity>
                )}
              >
                <TooltipContent bg={theme.tooltip.background} py='$1' px='$2'>
                  <TooltipText fontSize='$sm' color={theme.tooltip.text}>
                    {`${translate(TranslationKeys.sort)}: ${translate(
                      TranslationKeys.buildings
                    )}`}
                  </TooltipText>
                </TooltipContent>
              </Tooltip>
            </View>
          </View>
        </View>
        <ScrollView
          style={{
            ...styles.compusContainer,
            backgroundColor: theme.screen.background,
          }}
          contentContainerStyle={{
            ...styles.compusContentContainer,
            paddingHorizontal: isWeb ? 5 : 5,
          }}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
        >
          <View
            style={{
              ...styles.searchContainer,
              width: screenWidth > 768 ? '60%' : '100%',
            }}
          >
            <TextInput
              style={[styles.searchInput, { color: theme.screen.text }]}
              cursorColor={theme.screen.text}
              placeholderTextColor={theme.screen.placeholder}
              onChangeText={setQuery}
              value={query}
              placeholder='Search campus here...'
            />
          </View>
          <View style={{ ...styles.campusContainer, gap: isWeb ? 10 : 10 }}>
            {loading ? (
              <View
                style={{
                  height: 200,
                  width: '100%',
                  justifyContent: 'center',
                  alignItems: 'center',
                }}
              >
                <ActivityIndicator size={30} color={theme.screen.text} />
              </View>
            ) : campuses && campuses?.length > 0 ? (
              campuses?.map((campus: any) => (
                <BuildingItem
                  key={campus.id}
                  campus={campus}
                  setSelectedApartementId={setSelectedApartementId}
                  openImageManagementSheet={openImageManagementSheet}
                />
              ))
            ) : (
              <View
                style={{
                  height: 200,
                  width: '100%',
                  justifyContent: 'center',
                  alignItems: 'center',
                }}
              >
                <Text
                  style={{
                    fontSize: 16,
                    fontFamily: 'Poppins_400Regular',
                    color: theme.screen.text,
                  }}
                >
                  No Campus Found
                </Text>
              </View>
            )}
          </View>
        </ScrollView>
        {isActive && (
          <BaseBottomSheet
            ref={sortSheetRef}
            index={-1}
            backgroundStyle={{
              ...styles.sheetBackground,
              backgroundColor: theme.sheet.sheetBg,
            }}
            enablePanDownToClose
            handleComponent={null}
            onClose={closeSortSheet}
          >
            <BuildingSortSheet closeSheet={closeSortSheet} freeRooms={false} />
          </BaseBottomSheet>
        )}
        {isActive && (
          <BaseBottomSheet
            ref={imageManagementSheetRef}
            index={-1}
            backgroundStyle={{
              ...styles.sheetBackground,
              backgroundColor: theme.sheet.sheetBg,
            }}
            handleComponent={null}
            enablePanDownToClose
            enableHandlePanningGesture={false}
            enableContentPanningGesture={false}
            onClose={closeImageManagementSheet}
          >
            <ImageManagementSheet
              closeSheet={closeImageManagementSheet}
              selectedFoodId={selectedApartmentId}
              handleFetch={() => {
                setCampusesDispatched(false);
                fetchAllCampuses();
              }}
              fileName='buildings'
            />
          </BaseBottomSheet>
        )}
      </View>
    </SafeAreaView>
  );
};

export default index;
