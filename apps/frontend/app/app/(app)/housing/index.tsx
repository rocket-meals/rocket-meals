import { ActivityIndicator, Dimensions, RefreshControl, SafeAreaView, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ApartmentSortOption, CollectibleAt, CollectionNames, DatabaseTypes } from 'repo-depkit-common';
import styles from './styles';
import { useTheme } from '@/hooks/useTheme';
import { isWeb } from '@/constants/Constants';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import { DrawerContentComponentProps, DrawerNavigationProp } from '@react-navigation/drawer';
import { RootDrawerParamList } from './types';
import { useFocusEffect, useNavigation } from 'expo-router';
import { useDispatch, useSelector } from 'react-redux';
import useSelectedCanteen from '@/hooks/useSelectedCanteen';
import { SET_APARTMENTS, SET_APARTMENTS_DICT, SET_APARTMENTS_LOCAL, SET_UNSORTED_APARTMENTS } from '@/redux/Types/types';
import { BuildingsHelper } from '@/redux/actions/Buildings/Buildings';
import { calculateDistanceInMeter } from '@/helper/distanceHelper';
import { ApartmentsHelper } from '@/redux/actions/Apartments/Apartments';
import ApartmentItem from '@/components/ApartmentItem/ApartmentItem';
import useToast from '@/hooks/useToast';
import { useLanguage } from '@/hooks/useLanguage';
import DistanceModal from '@/components/DistanceModal';
import * as Location from 'expo-location';
import { Tooltip, TooltipContent, TooltipText } from '@gluestack-ui/themed';
import { getTextFromTranslation } from '@/helper/resourceHelper';
import { TranslationKeys } from '@/locales/keys';
import useSetPageTitle from '@/hooks/useSetPageTitle';
import CustomMarkdown from '@/components/CustomMarkdown/CustomMarkdown';
import { RootState } from '@/redux/reducer';
import { FlashList } from '@shopify/flash-list';
import CollectibleSpot from '@/components/CollectibleItem/CollectibleSpot';
import useHousingSortingModal from '@/hooks/useHousingSortingModal';
import useMyScrollviewDirectusImageEditModal from '@/hooks/useMyScrollviewDirectusImageEditModal';

const MIN_CARD_WIDTH = 280;

const Index: React.FC<DrawerContentComponentProps> = ({ navigation }) => {
	useSetPageTitle(TranslationKeys.housing);
	const toast = useToast();
	const { translate } = useLanguage();
	const { theme } = useTheme();
	const dispatch = useDispatch();
	const apartmentsHelper = new ApartmentsHelper();
	const buildingsHelper = new BuildingsHelper();
	const [query, setQuery] = useState<string>('');
	const [loading, setLoading] = useState(true);
	const [isActive, setIsActive] = useState(false);
	const [distanceModalVisible, setDistanceModalVisible] = useState(false);
	const [apartmentsDispatched, setApartmentsDispatched] = useState(false);
	const [distanceAdded, setDistanceAdded] = useState(false);
	const [hasLoaded, setHasLoaded] = useState(false);

	const [refreshing, setRefreshing] = useState(false);
	const [selectedBuilding, setSelectedBuilding] = useState<DatabaseTypes.Buildings | null>();
	const [screenWidth, setScreenWidth] = useState(Dimensions.get('window').width);
	const [listWidth, setListWidth] = useState<number | null>(null);

	const selectedCanteen = useSelectedCanteen();
	const { drawerPosition, apartmentsSortBy, primaryColor: projectColor, appSettings, language, amountColumnsForcard } = useSelector((state: RootState) => state.settings);
	const { apartments, apartmentsLocal, unSortedApartments } = useSelector((state: RootState) => state.apartment);

	const housing_area_color = appSettings?.housing_area_color ? appSettings?.housing_area_color : projectColor;
	const { openHousingSortingModal } = useHousingSortingModal();
	const { openDirectusImageEditModal } = useMyScrollviewDirectusImageEditModal();

	const drawerNavigation = useNavigation<DrawerNavigationProp<RootDrawerParamList>>();

	const openDistanceSheet = () => {
		setDistanceModalVisible(true);
	};

	const closeDistanceSheet = () => {
		setDistanceModalVisible(false);
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
		setApartmentsDispatched(false);
		fetchAllApartments().finally(() => {
			setRefreshing(false);
		});
	}, []);

	const fetchAllApartments = async () => {
		setLoading(true);
		try {
			const apartmentData = (await apartmentsHelper.fetchApartments({})) as DatabaseTypes.Apartments[];
			const list = apartmentData || [];

			const apartmentWithBuilding = await Promise.all(
				list.map(async apartment => {
					const buildingData = (await buildingsHelper.fetchBuildingById(String(apartment?.building))) as DatabaseTypes.Buildings;

					return {
						...apartment,
						...buildingData,
					};
				})
			);

			const apartmentsDict = apartmentWithBuilding.reduce(
				(acc, apt: any) => {
					if (apt.id) {
						acc[apt.id] = apt;
					}
					return acc;
				},
				{} as Record<string, any>
			);

			dispatch({ type: SET_APARTMENTS, payload: apartmentWithBuilding });
			dispatch({ type: SET_UNSORTED_APARTMENTS, payload: apartmentWithBuilding });
			dispatch({ type: SET_APARTMENTS_LOCAL, payload: apartmentWithBuilding });
			dispatch({ type: SET_APARTMENTS_DICT, payload: apartmentsDict });

			setApartmentsDispatched(true);
			setHasLoaded(true);
		} catch (error) {
			console.error('Error fetching apartments or buildings:', error);
			toast('Failed to load apartments', 'error');
		} finally {
			setLoading(false);
		}
	};

	const addDistance = (apartments: DatabaseTypes.Apartments[]) => {
		let campusWithDistance: Array<DatabaseTypes.Buildings> = [];
		if (apartments) {
			apartments?.forEach((apartment: any) => {
				const distance = Number(calculateDistanceInMeter(selectedBuilding?.coordinates?.coordinates, apartment?.coordinates?.coordinates));
				campusWithDistance.push({ ...apartment, distance });
			});
			if (campusWithDistance?.length === 0) {
				return apartments;
			}
			return campusWithDistance;
		}
	};

	useEffect(() => {
		if (!apartmentsDispatched) return;

		if (apartments && apartments.length > 0) {
			let next = apartments;

			if (selectedBuilding) {
				const apartmentsWithDistance = addDistance(apartments);
				if (apartmentsWithDistance && apartmentsWithDistance.length > 0) {
					next = apartmentsWithDistance;
				}
			}

			const apartmentsDict = next.reduce(
				(acc, apartment: any) => {
					if (apartment.id) {
						acc[apartment.id] = apartment;
					}
					return acc;
				},
				{} as Record<string, any>
			);

			dispatch({ type: SET_APARTMENTS, payload: next });
			dispatch({ type: SET_UNSORTED_APARTMENTS, payload: next });
			dispatch({ type: SET_APARTMENTS_DICT, payload: apartmentsDict });

			if (!distanceAdded && selectedBuilding) {
				setDistanceAdded(true);
			}
		}

		setLoading(false);
	}, [apartmentsDispatched, selectedBuilding]);

	const fetchSelectedBuilding = async () => {
		if (selectedCanteen?.building) {
			const buildingData = (await buildingsHelper.fetchBuildingById(String(selectedCanteen.building))) as DatabaseTypes.Buildings;
			const building = buildingData || [];
			if (building) {
				setSelectedBuilding(building);
			}
		} else {
			toast('Please select canteen', 'error');
		}
	};

	const useCurrentLocationForDistance = async () => {
		try {
			const { status } = await Location.requestForegroundPermissionsAsync();
			if (status !== 'granted') {
				toast('Permission denied', 'error');
				return;
			}
			const loc = await Location.getCurrentPositionAsync({});
			setSelectedBuilding({
				coordinates: { coordinates: [loc.coords.longitude, loc.coords.latitude] },
			} as any);
			closeDistanceSheet();
		} catch (error) {
			console.error('Error getting location:', error);
		}
	};

	useEffect(() => {
		fetchSelectedBuilding();
		fetchAllApartments();
	}, []);

	const openImageManagementModal = useCallback(
		(apartment: DatabaseTypes.Apartments) => {
			if (!apartment?.id) return;
			const buildingId = typeof apartment.building === 'object' ? apartment.building?.id : apartment.building;
			if (!buildingId) return;
			openDirectusImageEditModal({
				itemId: buildingId,
				field: 'image',
				collection: CollectionNames.BUILDINGS,
				onUpdated: () => {
					setApartmentsDispatched(false);
					fetchAllApartments();
				},
			});
		},
		[fetchAllApartments, openDirectusImageEditModal]
	);

	const sortApartmentsIntelligently = (apartments: any[]) => {
		if (!apartments) return apartments;

		return apartments.sort((a, b) => {
			const isFreeA = !a.available_from;
			const isFreeB = !b.available_from;

			if (isFreeA && !isFreeB) return -1;
			if (!isFreeA && isFreeB) return 1;

			return a.distance - b.distance;
		});
	};

	const sortApartmentsWithDistance = (apartments: DatabaseTypes.Apartments[]) => {
		if (apartments) {
			return apartments?.sort((a: any, b: any) => a.distance - b.distance);
		} else {
			return apartments;
		}
	};

	const sortApartmentsAlphabetically = (apartments: DatabaseTypes.Apartments[]) => {
		if (apartments) {
			return apartments?.sort((a: any, b: any) => a.alias.localeCompare(b.alias));
		} else {
			return apartments;
		}
	};

	const sortApartmentsByAvailableDate = (apartments: DatabaseTypes.Apartments[]) => {
		if (!apartments) return apartments;

		return apartments.sort((a, b) => {
			const availableFromA = a.available_from ? new Date(a.available_from) : null;
			const availableFromB = b.available_from ? new Date(b.available_from) : null;

			if (availableFromA && availableFromB) {
				return availableFromA.getTime() - availableFromB.getTime();
			} else if (availableFromA) {
				return -1;
			} else if (availableFromB) {
				return 1;
			}
			return 0;
		});
	};

	const updateSort = (id: ApartmentSortOption, apartments: DatabaseTypes.Apartments[]) => {
		setLoading(true);
		let copiedApartments = [...apartments];

		switch (id) {
			case ApartmentSortOption.INTELLIGENT:
				copiedApartments = sortApartmentsIntelligently(copiedApartments) || [];
				break;
			case ApartmentSortOption.ALPHABETICAL:
				copiedApartments = sortApartmentsAlphabetically(copiedApartments) || [];
				break;
			case ApartmentSortOption.DISTANCE:
				copiedApartments = sortApartmentsWithDistance(copiedApartments) || [];
				break;
			case ApartmentSortOption.FREE_ROOMS:
				copiedApartments = sortApartmentsByAvailableDate(copiedApartments) || [];
				break;
			default:
				copiedApartments = unSortedApartments || [];
				break;
		}

		dispatch({
			type: SET_APARTMENTS,
			payload: copiedApartments,
		});
		dispatch({
			type: SET_APARTMENTS_LOCAL,
			payload: copiedApartments,
		});
		setLoading(false);
	};

	useEffect(() => {
		if (apartments && distanceAdded) {
			updateSort(apartmentsSortBy as ApartmentSortOption, apartments);
		}
	}, [apartmentsSortBy, distanceAdded]);

	const visibleApartments = useMemo(() => {
		const src = apartmentsLocal ?? apartments ?? [];
		if (!query || query.trim() === '') return src;

		const q = query.toLowerCase().trim();
		return src.filter((apartment: any) =>
			(apartment?.alias ?? '').toLowerCase().includes(q)
		);
	}, [apartmentsLocal, apartments, query]);

	useEffect(() => {
		const handleResize = () => {
			const w = Dimensions.get('window').width;
			setScreenWidth(Number.isFinite(w) && w > 0 ? w : 360);
		};

		handleResize();
		const subscription = Dimensions.addEventListener('change', handleResize);

		return () => subscription?.remove();
	}, []);

	const MIN_CARD_WIDTH = 280;
	const numColumns = useMemo(() => {
		if (amountColumnsForcard && amountColumnsForcard > 0) {
			return amountColumnsForcard;
		}

		if (!listWidth) return 2;

		const cols = Math.floor(listWidth / MIN_CARD_WIDTH);
		return Math.max(2, cols);
	}, [amountColumnsForcard, listWidth]);

	const renderItem = useCallback(
		({ item }: { item: any }) => (
			<View
				style={{
					flex: 1,
					marginHorizontal: 10,
					marginVertical: 10,
					alignItems: 'center',
				}}
			>
					<ApartmentItem
						apartment={item}
						onEditImage={openImageManagementModal}
						openDistanceSheet={openDistanceSheet}
					/>
			</View>
		),
		[openImageManagementModal, openDistanceSheet]
	);

	const keyExtractor = useCallback(
		(item: any, index: number) => (item.id ? String(item.id) : `apartment-${index}`),
		[]
	);

	const ListHeaderComponent = useMemo(() => {
		return (
			<View style={{ width: '100%', alignItems: 'center' }}>
				<View style={{ width: '100%', padding: screenWidth > 600 ? 20 : 5 }}>
					{appSettings && appSettings?.housing_translations && (
						<CustomMarkdown
							content={getTextFromTranslation(appSettings?.housing_translations, language) || ''}
							backgroundColor={housing_area_color}
							imageWidth={'100%'}
							imageHeight={400}
						/>
					)}
				</View>

				<CollectibleSpot collectibleKey={CollectibleAt.collectible_at_housing} />

				<View
					style={[
						styles.searchContainer,
						{ paddingHorizontal: screenWidth > 600 ? 20 : 5, marginTop: 10, marginBottom: 10, width: '100%' },
					]}
				>
					<TextInput
						style={[styles.searchInput, { color: theme.screen.text }]}
						cursorColor={theme.screen.text}
						placeholderTextColor={theme.screen.placeholder}
						onChangeText={setQuery}
						value={query}
						placeholder={translate(TranslationKeys.search_apartment_here)}
					/>
				</View>
			</View>
		);
	}, [screenWidth, appSettings, language, housing_area_color, theme.screen.text, theme.screen.placeholder, query, translate]);

	const ListEmptyComponent = useMemo(() => {
		if (loading) {
			return (
				<View style={emptyStyles.container}>
					<ActivityIndicator size={30} color={theme.screen.text} />
				</View>
			);
		}

		return (
			<View style={emptyStyles.container}>
				<Text
					style={{
						fontSize: 16,
						fontFamily: 'Poppins_400Regular',
						color: theme.screen.text,
					}}
				>
					No Apartment Found
				</Text>
			</View>
		);
	}, [loading, theme.screen.text]);

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
								flexDirection: drawerPosition === 'right' ? 'row-reverse' : 'row',
							},
						]}
					>
						<View
							style={[
								styles.col1,
								{
									flexDirection: drawerPosition === 'right' ? 'row-reverse' : 'row',
								},
							]}
						>
							<Tooltip
								placement="top"
								trigger={triggerProps => (
									<TouchableOpacity {...triggerProps} onPress={() => drawerNavigation.toggleDrawer()} style={{ padding: 10 }}>
										<Ionicons name="menu" size={24} color={theme.header.text} />
									</TouchableOpacity>
								)}
							>
								<TooltipContent bg={theme.tooltip.background} py="$1" px="$2">
									<TooltipText fontSize="$sm" color={theme.tooltip.text}>
										{`${translate(TranslationKeys.open_drawer)}`}
									</TooltipText>
								</TooltipContent>
							</Tooltip>

							<Text style={{ ...styles.heading, color: theme.header.text }}>{translate(TranslationKeys.housing)}</Text>
						</View>
						<View style={{ ...styles.col2, gap: isWeb ? 30 : 15 }}>
							<Tooltip
								placement="top"
								trigger={triggerProps => (
									<TouchableOpacity {...triggerProps} onPress={openHousingSortingModal} style={{ padding: 10 }}>
										<MaterialIcons name="sort" size={24} color={theme.header.text} />
									</TouchableOpacity>
								)}
							>
								<TooltipContent bg={theme.tooltip.background} py="$1" px="$2">
									<TooltipText fontSize="$sm" color={theme.tooltip.text}>
										{`${translate(TranslationKeys.sort)}: ${translate(TranslationKeys.apartments)}`}
									</TooltipText>
								</TooltipContent>
							</Tooltip>
						</View>
					</View>
				</View>
				<View style={{ flex: 1, alignItems: 'center' }}>
					<View
						style={{
							width: '100%',
							maxWidth: 1420,
							flex: 1,
						}}
						onLayout={e => {
							const w = e.nativeEvent.layout.width;
							if (w && w !== listWidth) {
								setListWidth(w);
							}
						}}
					>
						<FlashList
							key={numColumns}
							data={visibleApartments}
							renderItem={renderItem}
							keyExtractor={keyExtractor}
							numColumns={numColumns}
                                                        contentContainerStyle={{
                                                                paddingHorizontal: 5,
                                                                paddingBottom: 20,
                                                        }}
                                                        ListHeaderComponent={ListHeaderComponent}
                                                        ListEmptyComponent={ListEmptyComponent}
                                                        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
							removeClippedSubviews={false}
							showsVerticalScrollIndicator={false}
							onEndReachedThreshold={0.4}
						/>
					</View>
				</View>
				{isActive && <DistanceModal visible={distanceModalVisible} onClose={closeDistanceSheet} onUseCurrentPosition={useCurrentLocationForDistance} />}
			</View>
		</SafeAreaView>
	);
};

export default Index;

const emptyStyles = StyleSheet.create({
	container: {
		height: 200,
		width: '100%',
		justifyContent: 'center',
		alignItems: 'center',
	},
});
