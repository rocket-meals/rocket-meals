import { ActivityIndicator, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import React, { useCallback, useEffect, useState } from 'react';
import { useDispatch } from 'react-redux';
import { useAppSelector } from '@/redux/hooks';
import useSelectedCanteen from '@/hooks/useSelectedCanteen';
import styles from './styles';
import { useTheme } from '@/hooks/useTheme';
import { CanteenHelper } from '@/redux/actions/Canteens/Canteens';
import { BuildingsHelper, BuildingsOrganizationsHelper } from '@/redux/actions/Buildings/Buildings';
import { OrganizationsHelper } from '@/redux/actions/Organizations/Organizations';
import { SET_BUILDINGS_DICT, SET_BUILDINGS_ORGANIZATIONS, SET_CANTEENS, SET_ORGANISATIONS, SET_SELECTED_CANTEEN } from '@/redux/Types/types';
import { useFocusEffect, useNavigation, useRouter } from 'expo-router';
import { getImageUrl } from '@/constants/HelperFunctions';
import { AppScreens, DatabaseTypes } from 'repo-depkit-common';
import { Ionicons } from '@expo/vector-icons';
import { DrawerNavigationProp } from '@react-navigation/drawer';
import { TranslationKeys } from '@/locales/keys';
import { useLanguage } from '@/hooks/useLanguage';
import CanteenSelection from '@/components/CanteenSelection/CanteenSelection';

const Home = () => {
	const dispatch = useDispatch();
	const router = useRouter();
	const drawerNavigation = useNavigation<DrawerNavigationProp<Record<string, object | undefined>>>();
	const { theme } = useTheme();
	const { translate } = useLanguage();
	const canteenHelper = new CanteenHelper();
	const buildingsHelper = new BuildingsHelper();
	const buildingsOrganizationsHelper = new BuildingsOrganizationsHelper();
	const organizationsHelper = new OrganizationsHelper();
	const { serverInfo } = useAppSelector(state => state.settings);
	const { isManagement, profile } = useAppSelector(state => state.authReducer);
	const [loading, setLoading] = useState(false);
	const { canteens } = useAppSelector(state => state.canteenReducer);
	const selectedCanteen = useSelectedCanteen();
	const foodOffersRoute = ('/(app)/' + AppScreens.FOOD_OFFERS) as any;

	const checkCanteenSelection = () => {
		if (selectedCanteen) {
			router.push(foodOffersRoute);
		}
	};

	const handleSelectCanteen = (canteen: DatabaseTypes.Canteens) => {
		dispatch({ type: SET_SELECTED_CANTEEN, payload: canteen });
		router.push(foodOffersRoute);
	};

	const getProfileCanteenId = (canteen: DatabaseTypes.Profiles['canteen']): string | undefined => {
		if (typeof canteen === 'string') return canteen;
		if (canteen && typeof canteen === 'object') return (canteen as DatabaseTypes.Canteens).id;
		return undefined;
	};

	const getCanteensWithBuildings = async () => {
		try {
			setLoading(true);
			const buildingsData = (await buildingsHelper.fetchBuildings({})) as DatabaseTypes.Buildings[];
			const buildings = buildingsData || [];

			const buildingsDict = buildings.reduce((acc: Record<string, any>, building: any) => {
				acc[building.id] = building;
				return acc;
			}, {});

			dispatch({ type: SET_BUILDINGS_DICT, payload: buildingsDict });

			const buildingsOrganizationsData = (await buildingsOrganizationsHelper.fetchBuildingsOrganizations({})) as DatabaseTypes.BuildingsOrganizations[];
			dispatch({ type: SET_BUILDINGS_ORGANIZATIONS, payload: buildingsOrganizationsData || [] });

			const organisationsData = (await organizationsHelper.fetchOrganizations({})) as DatabaseTypes.Organizations[];
			dispatch({ type: SET_ORGANISATIONS, payload: organisationsData || [] });

			const canteensData = (await canteenHelper.fetchCanteens({})) as DatabaseTypes.Canteens[];

			const filteredCanteens = canteensData.filter(canteen => {
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

			const updatedCanteens = sortedCanteens.map(canteen => {
				const building = buildingsDict[canteen?.building as string];
				return {
					...canteen,
					imageAssetId: building?.image,
					thumbHash: building?.image_thumb_hash,
					image_url: building?.image_remote_url || getImageUrl(building?.image),
				};
			});

			dispatch({ type: SET_CANTEENS, payload: updatedCanteens });

			// Auto-select the canteen from the user's profile if none is selected yet
			if (!selectedCanteen) {
				const profileCanteenId = getProfileCanteenId(profile?.canteen);
				if (profileCanteenId) {
					const profileCanteen = updatedCanteens.find(c => String(c.id) === String(profileCanteenId));
					if (profileCanteen) {
						dispatch({ type: SET_SELECTED_CANTEEN, payload: profileCanteen });
						router.push(foodOffersRoute);
						return;
					}
				}
			}

			setLoading(false);
		} catch (error) {
			setLoading(false);
			console.error('Error fetching data:', error);
		} finally {
			setLoading(false);
		}
	};

	useFocusEffect(
		useCallback(() => {
			checkCanteenSelection();
			getCanteensWithBuildings();
		}, [])
	);

	// Handle case where profile is fetched after canteens are already loaded
	useEffect(() => {
		if (selectedCanteen || !canteens || canteens.length === 0) return;
		const profileCanteenId = getProfileCanteenId(profile?.canteen);
		if (!profileCanteenId) return;
		const profileCanteen = canteens.find(c => String(c.id) === String(profileCanteenId));
		if (profileCanteen) {
			dispatch({ type: SET_SELECTED_CANTEEN, payload: profileCanteen });
			router.push(foodOffersRoute);
		}
	}, [profile?.canteen, canteens, selectedCanteen, dispatch, router, foodOffersRoute]);

	if (!loading && (!canteens || canteens.length === 0)) {
		return (
			<View
				style={{
					...styles.emptyContainer,
					backgroundColor: theme.screen.background,
				}}
			>
				<Text style={{ color: theme.screen.text }}>{translate(TranslationKeys.no_canteens_found)}</Text>
				<TouchableOpacity
					style={{
						...styles.continueButton,
						backgroundColor: theme.screen.iconBg,
					}}
					onPress={() => drawerNavigation.toggleDrawer()}
				>
					<Ionicons name="menu" size={24} color={theme.screen.icon} />
					<Text style={{ ...styles.continueLabel, color: theme.screen.text }}>{translate(TranslationKeys.open_drawer)}</Text>
				</TouchableOpacity>
			</View>
		);
	}

	return (
		<View
			style={{
				...styles.mainContainer,
				backgroundColor: theme.screen.background,
			}}
		>
			<ScrollView>
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
				) : (
					<CanteenSelection onSelectCanteen={handleSelectCanteen} />
				)}
			</ScrollView>
		</View>
	);
};

export default Home;
