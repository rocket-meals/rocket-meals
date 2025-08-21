import {
	ActivityIndicator,
	Dimensions,
	Image,
	Linking,
	Platform,
	SafeAreaView,
	ScrollView,
	Text,
	TouchableOpacity,
	View,
} from 'react-native';
import React, { useCallback, useEffect, useState } from 'react';
import { useTheme } from '@/hooks/useTheme';
import styles from './styles';
import { Foundation, MaterialCommunityIcons } from '@expo/vector-icons';
import Information from '@/components/Information';
import BuildingDescription from '@/components/BuildingDescription';
import { useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useSelector } from 'react-redux';
import { DatabaseTypes } from 'repo-depkit-common';
import { getImageUrl } from '@/constants/HelperFunctions';
import WashingMachines from '@/components/WashingMachines';
import { myContrastColor } from '@/helper/colorHelper';
import { useLanguage } from '@/hooks/useLanguage';
import { Tooltip, TooltipContent, TooltipText } from '@gluestack-ui/themed';
import { TranslationKeys } from '@/locales/keys';
import useSetPageTitle from '@/hooks/useSetPageTitle';
import { RootState } from '@/redux/reducer';

const details = () => {
	useSetPageTitle(TranslationKeys.apartment_details);
	const { theme } = useTheme();
	const { translate } = useLanguage();
	const { id } = useLocalSearchParams();
	const {
		appSettings,
		serverInfo,
		primaryColor,
		selectedTheme: mode,
	} = useSelector((state: RootState) => state.settings);
	const { apartmentsDict } = useSelector((state: RootState) => state.apartment);
	const defaultImage = getImageUrl(serverInfo?.info?.project?.project_logo);
	const housing_area_color = appSettings?.housing_area_color
		? appSettings?.housing_area_color
		: primaryColor;
	const contrastColor = myContrastColor(
		housing_area_color,
		theme,
		mode === 'dark'
	);
	const [activeTab, setActiveTab] = useState('information');
	const [loading, setLoading] = useState(false);
	const [apartmentDetails, setApartmentDetails] =
		useState<DatabaseTypes.Apartments | null>(null);
	const [screenWidth, setScreenWidth] = useState(Dimensions.get('window').width);

	const fetchApartmentById = async () => {
		setLoading(true);
		const apartmentDetails = apartmentsDict[String(id)];

		if (apartmentDetails) {
			setApartmentDetails(apartmentDetails);
		}
		setLoading(false);
	};

	useFocusEffect(
		useCallback(() => {
			if (id) {
				fetchApartmentById();
			}
			return () => {};
		}, [id])
	);

	useEffect(() => {
		const handleResize = () => {
			setScreenWidth(Dimensions.get('window').width);
		};

		const subscription = Dimensions.addEventListener('change', handleResize);

		return () => subscription?.remove();
	}, []);

	const handleOpenNavigation = () => {
		if (apartmentDetails) {
			const coordinates = apartmentDetails.coordinates?.coordinates; // [longitude, latitude]

			if (!coordinates || coordinates.length !== 2) {
				console.error('Invalid coordinates');
				return;
			}

			const [longitude, latitude] = coordinates;
			const googleMapsUrl = `https://www.google.com/maps?q=${latitude},${longitude}`;

			if (Platform.OS === 'web') {
				window.open(googleMapsUrl, '_blank');
			} else {
				const mapsUrl =
					Platform.OS === 'ios'
						? `maps://?q=${latitude},${longitude}` // Apple Maps
						: `geo:${latitude},${longitude}?q=${latitude},${longitude}`; // Google Maps for Android

				Linking.openURL(mapsUrl).catch(err => {
					console.error('Error opening navigation:', err);
					// Fallback to Google Maps URL
					Linking.openURL(googleMapsUrl);
				});
			}
		}
	};

	const renderContent = () => {
		switch (activeTab) {
			case 'information':
				return <Information campusDetails={apartmentDetails} />;
			case 'description':
				return <BuildingDescription campusDetails={apartmentDetails} />;
			case 'washing-machine':
				return <WashingMachines campusDetails={apartmentDetails} />;
			default:
				return null;
		}
	};

	const themeStyles = {
		backgroundColor: housing_area_color,
		borderColor: housing_area_color,
		color: contrastColor,
	};

	return (
		<SafeAreaView
			style={{
				...styles.safeAreaContainer,
				backgroundColor: theme.screen.background,
			}}
		>
			<ScrollView
				style={{
					...styles.container,
					backgroundColor: theme.screen.background,
				}}
				contentContainerStyle={{
					...styles.contentContainer,
					paddingHorizontal: screenWidth > 900 ? 20 : 10,
				}}
			>
				{!loading ? (
					<View
						style={{
							...styles.bulidingContainer,
							width: screenWidth > 1000 ? '80%' : screenWidth > 900 ? '100%' : '100%',
							flexDirection: 'column',
						}}
					>
						<View
							style={{
								...styles.imageContainer,
								width:
									screenWidth > 1000
										? 400
										: screenWidth > 900
											? 350
											: Dimensions.get('window').width - 20,
								height:
									screenWidth > 1000
										? 400
										: screenWidth > 900
											? 350
											: Dimensions.get('window').width - 20,
							}}
						>
							<Image
								source={
									apartmentDetails?.image || apartmentDetails?.image_remote_url
										? {
												uri:
													apartmentDetails?.image_remote_url ||
													getImageUrl(String(apartmentDetails?.image)),
											}
										: { uri: defaultImage }
								}
								style={styles.image}
							/>
						</View>
						<View
							style={{
								...styles.detailsContainer,
								width: '100%',
							}}
						>
							<Text style={{ ...styles.buildingHeading, color: theme.screen.text }}>
								{apartmentDetails?.alias}
							</Text>
							<View
								style={{
									width: '98%',
									flexDirection: 'row',
									justifyContent: screenWidth > 900 ? 'flex-start' : 'flex-end',
									gap: 10,
								}}
							>
								<Tooltip
									placement="top"
									trigger={triggerProps => (
										<TouchableOpacity
											{...triggerProps}
											style={{
												...styles.navigationButton,
												backgroundColor: theme.screen.iconBg,
											}}
											onPress={handleOpenNavigation}
										>
											<MaterialCommunityIcons
												name="navigation-variant"
												size={24}
												color={theme.screen.icon}
											/>
										</TouchableOpacity>
									)}
								>
									<TooltipContent bg={theme.tooltip.background} py="$1" px="$2">
										<TooltipText fontSize="$sm" color={theme.tooltip.text}>
											{`${translate(TranslationKeys.open_navitation_to_location)}`}
										</TooltipText>
									</TooltipContent>
								</Tooltip>
							</View>
							<View
								style={{
									...styles.tabViewContainer,
									width: '100%',
								}}
							>
								<View
									style={{
										...styles.tabs,
										width: '100%',
										gap: screenWidth > 900 ? 20 : 0,
									}}
								>
									<Tooltip
										placement="top"
										trigger={triggerProps => (
											<TouchableOpacity
												{...triggerProps}
												style={[
													styles.tab,
													activeTab === 'information'
														? themeStyles
														: { backgroundColor: theme.screen.iconBg },
												]}
												onPress={() => setActiveTab('information')}
											>
												<Foundation
													name="info"
													size={26}
													color={
														activeTab === 'information' ? contrastColor : theme.screen.icon
													}
												/>
											</TouchableOpacity>
										)}
									>
										<TooltipContent bg={theme.tooltip.background} py="$1" px="$2">
											<TooltipText fontSize="$sm" color={theme.tooltip.text}>
												{`${translate(TranslationKeys.information)}`}
											</TooltipText>
										</TooltipContent>
									</Tooltip>
									<Tooltip
										placement="top"
										trigger={triggerProps => (
											<TouchableOpacity
												{...triggerProps}
												style={[
													styles.tab,
													activeTab === 'description'
														? themeStyles
														: { backgroundColor: theme.screen.iconBg },
												]}
												onPress={() => setActiveTab('description')}
											>
												<MaterialCommunityIcons
													name="sort-variant"
													size={26}
													color={
														activeTab === 'description' ? contrastColor : theme.screen.icon
													}
												/>
											</TouchableOpacity>
										)}
									>
										<TooltipContent bg={theme.tooltip.background} py="$1" px="$2">
											<TooltipText fontSize="$sm" color={theme.tooltip.text}>
												{`${translate(TranslationKeys.description)}`}
											</TooltipText>
										</TooltipContent>
									</Tooltip>

									{apartmentDetails && apartmentDetails?.washingmachines?.length > 0 && (
										<Tooltip
											placement="top"
											trigger={triggerProps => (
												<TouchableOpacity
													{...triggerProps}
													style={[
														styles.tab,
														activeTab === 'washing-machine'
															? themeStyles
															: { backgroundColor: theme.screen.iconBg },
													]}
													onPress={() => setActiveTab('washing-machine')}
												>
													<MaterialCommunityIcons
														name="washing-machine"
														size={26}
														color={
															activeTab === 'washing-machine'
																? contrastColor
																: theme.screen.icon
														}
													/>
												</TouchableOpacity>
											)}
										>
											<TooltipContent bg={theme.tooltip.background} py="$1" px="$2">
												<TooltipText fontSize="$sm" color={theme.tooltip.text}>
													{`${translate(TranslationKeys.washing_machine)}`}
												</TooltipText>
											</TooltipContent>
										</Tooltip>
									)}
								</View>
								<View
									style={{
										...styles.pagerView,
										width: screenWidth > 900 ? '95%' : '100%',
										paddingHorizontal: screenWidth > 900 ? 20 : 0,
									}}
								>
									{renderContent()}
								</View>
							</View>
						</View>
					</View>
				) : (
					<View
						style={{
							width: '100%',
							height: 400,
							justifyContent: 'center',
							alignItems: 'center',
						}}
					>
						<ActivityIndicator size="large" color={theme.screen.text} />
					</View>
				)}
			</ScrollView>
		</SafeAreaView>
	);
};

export default details;
