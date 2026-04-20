import { ScrollView, Text, View } from 'react-native';
import React, { useMemo } from 'react';
import styles from './styles';
import { useTheme } from '@/hooks/useTheme';
import { useAppSelector } from '@/redux/hooks';
import { Entypo, MaterialCommunityIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useLanguage } from '@/hooks/useLanguage';
import { TranslationKeys } from '@/locales/keys';
import useSetPageTitle from '@/hooks/useSetPageTitle';
import useSelectedCanteen from '@/hooks/useSelectedCanteen';
import SettingsList from '@/components/SettingsList';

const Index = () => {
	useSetPageTitle(TranslationKeys.experimentell);
	const { translate } = useLanguage();
    const { theme } = useTheme();
    const { buildingsDict } = useAppSelector((state) => state.canteenReducer);
    const { primaryColor } = useAppSelector((state) => state.settings);
	const selectedCanteen = useSelectedCanteen();

	const buildingPosition = useMemo(() => {
		if (selectedCanteen?.building) {
			const building = buildingsDict[String(selectedCanteen.building)];
			const coords = (building as any)?.coordinates?.coordinates;
			if (coords && coords.length === 2) {
				return { lat: Number(coords[1]), lng: Number(coords[0]) };
			}
		}
		return null;
	}, [selectedCanteen, buildingsDict]);

	const listItems = [
		{
			key: 'edge-speech',
			label: translate(TranslationKeys.edge_speech_test),
			leftIcon: <MaterialCommunityIcons name="text-to-speech" size={24} color={theme.screen.icon} />,
			onPress: () => router.push('/experimentell/edge-speech'),
		},
		{
			key: 'map-with-custom-images-and-buildings',
			label: 'Map – Custom Images & Buildings',
			leftIcon: <MaterialCommunityIcons name="layers" size={24} color={theme.screen.icon} />,
			onPress: () => router.push('/experimentell/map-with-custom-images-and-buildings'),
		},
		{
			key: 'expo-update-test',
			label: translate(TranslationKeys.EXPO_UPDATE_TEST),
			leftIcon: <MaterialCommunityIcons name="cloud-sync-outline" size={24} color={theme.screen.icon} />,
			onPress: () => router.push('/experimentell/expo-update-test'),
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
			label: translate(TranslationKeys.app_download_selection),
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
		{
			key: 'food-wishlist',
			label: translate(TranslationKeys.food_wishlist),
			leftIcon: <MaterialCommunityIcons name="heart" size={24} color={theme.screen.icon} />,
			onPress: () => router.push('/experimentell/food-wishlist'),
		},
		{
			key: 'feature-wishes',
			label: translate(TranslationKeys.feature_wishes),
			leftIcon: <MaterialCommunityIcons name="lightbulb-outline" size={24} color={theme.screen.icon} />,
			onPress: () => router.push('/experimentell/feature-wishes'),
		},
		{
			key: 'account-required-example',
			label: translate(TranslationKeys.account_required_example),
			leftIcon: <MaterialCommunityIcons name="account-lock" size={24} color={theme.screen.icon} />,
			onPress: () => router.push('/experimentell/account-required-example'),
		},
		{
			key: 'achievements',
			label: translate(TranslationKeys.achievements),
			leftIcon: <MaterialCommunityIcons name="trophy" size={24} color={theme.screen.icon} />,
			onPress: () => router.push('/experimentell/achievements'),
		},
		{
			key: 'eating-habits-performance',
			label: translate(TranslationKeys.eating_habits_performance),
			leftIcon: <MaterialCommunityIcons name="speedometer" size={24} color={theme.screen.icon} />,
			onPress: () => router.push('/experimentell/eating-habits-performance'),
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
