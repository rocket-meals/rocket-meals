import { ActivityIndicator, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import React, { useEffect, useState } from 'react';
import styles from './styles';
import { useTheme } from '@/hooks/useTheme';
import { useSelector } from 'react-redux';
import { getTextFromTranslation, getTitleFromTranslation } from '@/helper/resourceHelper';
import { router, useGlobalSearchParams, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { isWeb } from '@/constants/Constants';
import DeviceMock from '@/components/DeviceMock/DeviceMock';
import useSetPageTitle from '@/hooks/useSetPageTitle';
import { AppScreens, DatabaseTypes } from 'repo-depkit-common';
import CustomMarkdown from '@/components/CustomMarkdown/CustomMarkdown';
import { RootState } from '@/redux/reducer';
import { TranslationKeys } from '@/locales/keys';
import { useLanguage } from '@/hooks/useLanguage';

const Index = () => {
	const { theme } = useTheme();
	const { translate } = useLanguage();
	const [wiki, setWiki] = useState<DatabaseTypes.Wikis>();
	const [loading, setLoading] = useState(true);
	const { wikis, language, primaryColor } = useSelector((state: RootState) => state.settings);
	const { deviceMock } = useGlobalSearchParams();
	const { custom_id, id } = useLocalSearchParams();
	//Set Page Title
	const title = wiki?.translations ? getTitleFromTranslation(wiki?.translations, language) : 'Wikis';
	useSetPageTitle(title);

	const filterWiki = () => {
		const wiki_data = wikis?.filter((wiki: any) => wiki?.custom_id === custom_id);
		if (wiki_data) {
			setWiki(wiki_data[0]);
			setLoading(false);
		}
	};

	const filterWikiWithId = () => {
		const wiki_data = wikis?.filter((wiki: any) => wiki?.id === id);
		if (wiki_data) {
			setWiki(wiki_data[0]);
			setLoading(false);
		}
	};

	useEffect(() => {
		if (wikis?.length > 0 && custom_id) {
			filterWiki();
		} else if (wikis?.length > 0 && id) {
			filterWikiWithId();
		}
	}, [wikis, custom_id, id]);

	return (
		<ScrollView style={{ ...styles.container, backgroundColor: theme.screen.background }}>
			{deviceMock && deviceMock === 'iphone' && isWeb && <DeviceMock />}
			<View
				style={{
					...styles.header,
					backgroundColor: theme.header.background,
					paddingHorizontal: isWeb ? 20 : 10,
				}}
			>
				<View style={styles.row}>
					<View style={styles.col1}>
						<TouchableOpacity onPress={() => router.navigate(AppScreens.FOOD_OFFERS)} style={{ padding: 10 }}>
							<Ionicons name="arrow-back" size={24} color={theme.header.text} />
						</TouchableOpacity>
						<Text style={{ ...styles.heading, color: theme.header.text }}>{wiki?.translations && getTitleFromTranslation(wiki?.translations, language)}</Text>
					</View>
				</View>
			</View>
			<View style={styles.content}>
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
				) : wiki?.translations && getTextFromTranslation(wiki.translations, language)?.trim() ? (
					<CustomMarkdown content={getTextFromTranslation(wiki.translations, language)} backgroundColor={wiki?.color || primaryColor} imageWidth={'100%'} imageHeight={400} />
				) : (
					<Text style={{ color: theme.screen.text, padding: 16 }}>{translate(TranslationKeys.no_data_found)}</Text>
				)}
			</View>
		</ScrollView>
	);
};

export default Index;
