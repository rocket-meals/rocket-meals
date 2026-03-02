import React, { useEffect, useState } from 'react';
import { Dimensions, Image, ScrollView, Text, View } from 'react-native';
import styles from './styles';
import { useTheme } from '@/hooks/useTheme';
import { isWeb } from '@/constants/Constants';
import { useSelector } from 'react-redux';
import { Entypo, MaterialCommunityIcons } from '@expo/vector-icons';
import SettingsList from '@/components/SettingsList';
import { useLanguage } from '@/hooks/useLanguage';
import { TranslationKeys } from '@/locales/keys';
import { RootState } from '@/redux/reducer';
import SettingsGroupTitle from '@/components/SettingsGroupTitle';
import CollectibleSpot from '@/components/CollectibleItem/CollectibleSpot';
import { CollectibleAt } from 'repo-depkit-common';

const parseMarkdown = (text: string, theme: any) => {
	return text.split('\n').map((line, index) => {
		if (line.startsWith('## ')) {
			return (
				<Text key={index} style={[styles.value, { color: theme.header.text }]}>
					{line.replace('## ', '')}
				</Text>
			);
		} else if (line.startsWith('### ')) {
			return (
				<Text key={index} style={[styles.labelParagraph, { color: theme.header.text }]}>
					{line.replace('### ', '')}
				</Text>
			);
		} else {
			return (
				<Text key={index} style={[styles.titleHeading, { color: theme.header.text }]}>
					{line}
				</Text>
			);
		}
	});
};

const DataAccess = ({ onOpenBottomSheet }: any) => {
	const { theme } = useTheme();
	const { translate } = useLanguage();
        const { user, profile } = useSelector((state: RootState) => state.authReducer);
        const { primaryColor } = useSelector((state: RootState) => state.settings);
        const { collectibleEvents } = useSelector((state: RootState) => state.collectibleEvents ?? {});
        const { canteens, buildings, selectedCanteenFoodOffers, canteenFoodOffers, businessHours, canteenFeedbackLabels, ownCanteenFeedBackLabelEntries } = useSelector((state: RootState) => state.canteenReducer);

        const { foodFeedbackLabels, ownFoodFeedbacks, ownfoodFeedbackLabelEntries, markings, selectedFoodMarkings, foodCategories, foodOfferCategories, markingDetails } = useSelector((state: RootState) => state.food);

	const [windowWidth, setWindowWidth] = useState(Dimensions.get('window').width);

	useEffect(() => {
		const onChange = ({ window }: { window: any }) => {
			setWindowWidth(window.width);
		};

		const subscription = Dimensions.addEventListener('change', onChange);
		return () => {
			subscription.remove();
		};
	}, []);

	const dataAccessText = translate(TranslationKeys.data_access_introduction);

	const infoItems = [
		{ label: 'account', value: user },
		{ label: 'profile', value: profile },
		{ label: 'food_feedbacks', value: ownFoodFeedbacks },
	];

	const dataDevice = [
		{ label: 'canteens', value: canteens },
		{ label: 'buildings', value: buildings },
		{ label: 'Selected Canteen FoodOffers', value: selectedCanteenFoodOffers },
		{ label: 'Canteen FoodOffers', value: canteenFoodOffers },
		{ label: 'Business Hours', value: businessHours },
		{ label: 'Canteen FeedbackLabels', value: canteenFeedbackLabels },
		{
			label: 'Own Canteen FeedBack Label Entries',
			value: ownCanteenFeedBackLabelEntries,
		},
		{ label: 'Food FeedbackLabels', value: foodFeedbackLabels },
		{ label: 'Own FoodFeedbacks', value: ownFoodFeedbacks },
		{
			label: 'Own Food Feedback Label Entries',
			value: ownfoodFeedbackLabelEntries,
		},
		{ label: 'Markings', value: markings },
		{ label: 'Selected Food Markings', value: selectedFoodMarkings },
                { label: 'Food Categories', value: foodCategories },
                { label: 'FoodOffer Categories', value: foodOfferCategories },
                { label: 'MarkingDetails', value: markingDetails },
                { label: 'Collectible Events', value: collectibleEvents },
        ];

	return (
		<View style={{ ...styles.container, backgroundColor: theme.screen.background }}>
			<ScrollView
				contentContainerStyle={{
					...styles.contentContainer,
					backgroundColor: theme.screen.background,
				}}
			>
				<View style={{ alignItems: 'center' }}>
					<View style={styles.imageContainer}>
						<Image source={require('../../assets/images/dataAccess.png')} style={styles.image} />
					</View>
					<View>{parseMarkdown(dataAccessText, theme)}</View>
				</View>
				<SettingsGroupTitle>{translate(TranslationKeys.your_data_which_we_know_if_you_have_a_profile)}</SettingsGroupTitle>
				{/* Info Items List */}
				<CollectibleSpot collectibleKey={CollectibleAt.collectible_at_data_access} />
				<View
					style={{
						width: windowWidth < 500 ? '100%' : isWeb ? '80%' : '100%',
					}}
				>
					{infoItems.map((item, index) => {
						const last = index === infoItems.length - 1;
						const first = index === 0;
						const groupPosition = infoItems.length === 1 ? 'single' : first ? 'top' : last ? 'bottom' : 'middle';
						return <SettingsList key={index} iconBgColor={primaryColor} leftIcon={<MaterialCommunityIcons name="database-eye" size={24} color={theme.screen.icon} />} label={item.label} rightIcon={<Entypo name="chevron-small-right" size={24} color={theme.screen.icon} />} handleFunction={() => onOpenBottomSheet(item)} groupPosition={groupPosition as any} />;
					})}

					{/* Device Data List */}
					<SettingsGroupTitle>{translate(TranslationKeys.translation_all_on_device_saved_data)}</SettingsGroupTitle>
                                        {dataDevice.map((data, index) => {
                                                if (!data?.value) return null;
                                                const last = index === dataDevice.length - 1;
                                                const first = index === 0;
                                                const groupPosition = dataDevice.length === 1 ? 'single' : first ? 'top' : last ? 'bottom' : 'middle';
                                                return <SettingsList key={index} iconBgColor={primaryColor} leftIcon={<MaterialCommunityIcons name="database-eye" size={24} color={theme.screen.icon} />} label={data.label} rightIcon={<Entypo name="chevron-small-right" size={24} color={theme.screen.icon} />} handleFunction={() => onOpenBottomSheet(data)} groupPosition={groupPosition as any} />;
                                        })}
                                </View>
                        </ScrollView>
                </View>
        );
};

export default DataAccess;
