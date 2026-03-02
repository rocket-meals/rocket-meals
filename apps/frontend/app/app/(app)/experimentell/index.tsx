import { ScrollView, Text, View } from 'react-native';
import React, { useMemo } from 'react';
import styles from './styles';
import { useTheme } from '@/hooks/useTheme';
import { Entypo, MaterialCommunityIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useLanguage } from '@/hooks/useLanguage';
import { TranslationKeys } from '@/locales/keys';
import useSetPageTitle from '@/hooks/useSetPageTitle';
import { useSelector } from 'react-redux';
import useSelectedCanteen from '@/hooks/useSelectedCanteen';
import { RootState } from '@/redux/reducer';
import SettingsList from '@/components/SettingsList';

const Index = () => {
	useSetPageTitle(TranslationKeys.experimentell);
	const { translate } = useLanguage();
	const { theme } = useTheme();
	const { buildings } = useSelector((state: RootState) => state.canteenReducer);
	const { primaryColor } = useSelector((state: RootState) => state.settings);
	const selectedCanteen = useSelectedCanteen();

	const buildingPosition = useMemo(() => {
		if (selectedCanteen?.building) {
			const building = buildings.find(b => b.id === selectedCanteen.building);
			const coords = (building as any)?.coordinates?.coordinates;
			if (coords && coords.length === 2) {
				return { lat: Number(coords[1]), lng: Number(coords[0]) };
			}
		}
		return null;
	}, [selectedCanteen, buildings]);

	const listItems = [
		{
			key: 'expo-update-test',
			label: translate(TranslationKeys.EXPO_UPDATE_TEST),
			leftIcon: <MaterialCommunityIcons name="cloud-sync-outline" size={24} color={theme.screen.icon} />,
			onPress: () => router.push('/experimentell/expo-update-test'),
		},
		{
			key: 'leaflet-map',
			label: translate(TranslationKeys.leaflet_map),
			leftIcon: <MaterialCommunityIcons name="map" size={24} color={theme.screen.icon} />,
			onPress: () =>
				router.push({
					pathname: '/leaflet-map',
					params: {
						lat: String(buildingPosition?.lat ?? '52.275'),
						lng: String(buildingPosition?.lng ?? '7.4584'),
						zoom: '16',
					},
				}),
		},
		{
			key: 'vertical-image-scroll',
			label: translate(TranslationKeys.vertical_image_scroll),
			leftIcon: <MaterialCommunityIcons name="image-multiple" size={24} color={theme.screen.icon} />,
			onPress: () => router.push('/vertical-image-scroll'),
		},
		{
			key: 'foodoffers-scroll',
			label: translate(TranslationKeys.foodoffers_scroll),
			leftIcon: <MaterialCommunityIcons name="food" size={24} color={theme.screen.icon} />,
			onPress: () => router.push('/foodoffers-scroll'),
		},
		{
			key: 'date-helper-preview',
			label: translate(TranslationKeys.date_helper_preview),
			leftIcon: <MaterialCommunityIcons name="calendar-week" size={24} color={theme.screen.icon} />,
			onPress: () => router.push('/experimentell/date-helper'),
		},
		{
			key: 'haptics-test',
			label: translate(TranslationKeys.haptics_test),
			leftIcon: <MaterialCommunityIcons name="vibrate" size={24} color={theme.screen.icon} />,
			onPress: () => router.push('/experimentell/haptics'),
		},
		{
			key: 'chats',
			label: translate(TranslationKeys.chats),
			leftIcon: <MaterialCommunityIcons name="chat" size={24} color={theme.screen.icon} />,
			onPress: () => router.push('/chats'),
		},
		{
			key: 'debug-logout',
			label: translate(TranslationKeys.debug_logout),
			leftIcon: <MaterialCommunityIcons name="bug" size={24} color={theme.screen.icon} />,
			onPress: () => router.push('/experimentell/debug-logout'),
		},
		{
			key: 'rate-app',
			label: translate(TranslationKeys.rate_app),
			leftIcon: <MaterialCommunityIcons name="star" size={24} color={theme.screen.icon} />,
			onPress: () => router.push('/experimentell/rate-app'),
		},
		{
			key: 'app-download',
			label: translate(TranslationKeys.app_download),
			leftIcon: <MaterialCommunityIcons name="download" size={24} color={theme.screen.icon} />,
			onPress: () => router.push('/experimentell/app-download'),
		},
		{
			key: 'react-native-qrcode-svg',
			label: translate(TranslationKeys.react_native_qrcode_svg),
			leftIcon: <MaterialCommunityIcons name="qrcode" size={24} color={theme.screen.icon} />,
			onPress: () => router.push('/experimentell/react-native-qrcode-svg'),
		},
		{
			key: 'markdown-test',
			label: translate(TranslationKeys.markdown_test),
			leftIcon: <MaterialCommunityIcons name="language-markdown-outline" size={24} color={theme.screen.icon} />,
			onPress: () => router.push('/experimentell/markdown-test'),
		},

		{
			key: 'settings-list-components',
			label: 'SettingsList Komponenten',
			leftIcon: <MaterialCommunityIcons name="format-list-bulleted" size={24} color={theme.screen.icon} />,
			onPress: () => router.push('/experimentell/settings-list-components'),
		},
		{
			key: 'test-use-modal',
			label: translate(TranslationKeys.test_use_modal),
			leftIcon: <MaterialCommunityIcons name="test-tube" size={24} color={theme.screen.icon} />,
			onPress: () => router.push('/experimentell/test-use-modal'),
		},
		{
			key: 'game-ideas',
			label: translate(TranslationKeys.game_ideas),
			leftIcon: <MaterialCommunityIcons name="gamepad-variant" size={24} color={theme.screen.icon} />,
			onPress: () => router.push('/experimentell/game-ideas'),
		},
	];

	return (
		<ScrollView
			style={{ ...styles.container, backgroundColor: theme.screen.background }}
			contentContainerStyle={{
				...styles.contentContainer,
				backgroundColor: theme.screen.background,
			}}
		>
			<View style={{ ...styles.content }}>
				<Text style={{ ...styles.heading, color: theme.screen.text }}>{translate(TranslationKeys.experimentell)}</Text>
				{buildingPosition && (
					<Text style={{ ...styles.body, color: theme.screen.text }}>
						{translate(TranslationKeys.coordinates)}: {buildingPosition.lat}, {buildingPosition.lng}
					</Text>
				)}
				{listItems.map((item, index) => {
					const totalItems = listItems.length;
					const groupPosition = totalItems === 1 ? 'single' : index === 0 ? 'top' : index === totalItems - 1 ? 'bottom' : 'middle';

					return <SettingsList key={item.key} iconBgColor={primaryColor} leftIcon={item.leftIcon} label={item.label} rightIcon={<Entypo name="chevron-small-right" color={theme.screen.icon} size={24} />} handleFunction={item.onPress} groupPosition={groupPosition} />;
				})}
			</View>
		</ScrollView>
	);
};

export default Index;
