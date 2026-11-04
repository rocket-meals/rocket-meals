import { ScrollView, Text, TouchableOpacity, View } from 'react-native';
import LoadingIndicator from '@/components/LoadingIndicator/LoadingIndicator';
import React, { useEffect, useState } from 'react';
import styles from './styles';
import { useTheme } from '@/hooks/useTheme';
import { useAppSelector } from '@/redux/hooks';
import { getTextFromTranslation, getTitleFromTranslation } from '@/helper/resourceHelper';
import { router, useGlobalSearchParams, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { isWeb } from '@/constants/Constants';
import DeviceMock from '@/components/DeviceMock/DeviceMock';
import useSetPageTitle from '@/hooks/useSetPageTitle';
import { AppScreens, DatabaseTypes } from 'repo-depkit-common';
import MyMarkdownProjectColored from '@/components/MyMarkdownProjectColored';
import { TranslationKeys } from '@/locales/keys';
import { useLanguage } from '@/hooks/useLanguage';
import { WikisHelper } from '@/redux/actions/Wikis/Wikis';

const Index = () => {
	const { theme } = useTheme();
	const { translate, translateDynamic } = useLanguage();
	// Title-only wiki (no content) coming from redux, used for an instant header while the
	// full page loads. The full content is fetched directly below and kept in local state
	// only - it is never dispatched to redux/persisted.
	const [wiki, setWiki] = useState<DatabaseTypes.Wikis>();
	const [loading, setLoading] = useState(true);
	const { wikis, language, primaryColor } = useAppSelector((state) => state.settings);
	const { deviceMock } = useGlobalSearchParams();
	const { custom_id, id } = useLocalSearchParams();
	//Set Page Title
	const title = wiki?.translations ? translateDynamic(getTitleFromTranslation(wiki?.translations, language)) : 'Wikis';
	useSetPageTitle(title);

	useEffect(() => {
		const wikiTitleOnly = wikis?.find((wiki: any) => (custom_id ? wiki?.custom_id === custom_id : wiki?.id === id));
		if (wikiTitleOnly) {
			setWiki(wikiTitleOnly as DatabaseTypes.Wikis);
		}

		if (!custom_id && !id) {
			setLoading(false);
			return;
		}

		setLoading(true);
		const wikisHelper = new WikisHelper();
		wikisHelper
			.fetchWikiWithContent({ id: id as string | undefined, custom_id: custom_id as string | undefined })
			.then((wikiWithContent) => {
				if (wikiWithContent) {
					setWiki(wikiWithContent as DatabaseTypes.Wikis);
				}
			})
			.catch((error) => console.error('Error fetching wiki content:', error))
			.finally(() => setLoading(false));
	}, [wikis, custom_id, id]);

	const hasWikiContent = Boolean(wiki?.translations && getTextFromTranslation(wiki.translations, language)?.trim());

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
						<TouchableOpacity onPress={() => router.navigate(('/(app)/' + AppScreens.FOOD_OFFERS) as any)} style={{ padding: 10 }}>
							<Ionicons name="arrow-back" size={24} color={theme.header.text} />
						</TouchableOpacity>
						<Text style={{ ...styles.heading, color: theme.header.text }}>{wiki?.translations && translateDynamic(getTitleFromTranslation(wiki?.translations, language))}</Text>
					</View>
				</View>
			</View>
			<View style={styles.content}>
				{loading && (
					<View
						style={{
							height: 200,
							width: '100%',
							justifyContent: 'center',
							alignItems: 'center',
						}}
					>
						<LoadingIndicator size={30} color={theme.screen.text} />
					</View>
				)}
				{!loading && hasWikiContent && wiki?.translations && (
					<MyMarkdownProjectColored content={translateDynamic(getTextFromTranslation(wiki.translations, language))} accentColor={wiki?.color || primaryColor} imageWidth={'100%'} imageHeight={400} collapsibleSections />
				)}
				{!loading && !hasWikiContent && (
					<Text style={{ color: theme.screen.text, padding: 16 }}>{translate(TranslationKeys.no_data_found)}</Text>
				)}
			</View>
		</ScrollView>
	);
};

export default Index;
