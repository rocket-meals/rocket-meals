import { ActivityIndicator, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import React, { useEffect, useMemo, useState } from 'react';
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
import CustomMarkdown from '@/components/CustomMarkdown/CustomMarkdown';
import { TranslationKeys } from '@/locales/keys';
import { useLanguage } from '@/hooks/useLanguage';
import { WikisHelper } from '@/redux/actions/Wikis/Wikis';

const Index = () => {
	const { theme } = useTheme();
	const { translate, translateDynamic } = useLanguage();
	const [wiki, setWiki] = useState<DatabaseTypes.Wikis>();
	const [loading, setLoading] = useState(true);
	const { language, primaryColor } = useAppSelector((state) => state.settings);
	const { deviceMock } = useGlobalSearchParams();
	const { custom_id, id } = useLocalSearchParams();
	const wikisHelper = useMemo(() => new WikisHelper(), []);
	//Set Page Title
	const title = wiki?.translations ? translateDynamic(getTitleFromTranslation(wiki?.translations, language)) : 'Wikis';
	useSetPageTitle(title);

	// The persisted wikis list only carries titles (see WikisHelper.fetchWikis), so the
	// full page content is fetched on demand. Re-runs on language change because the
	// server only returns the translations for the current language (+ fallbacks).
	useEffect(() => {
		if (!custom_id && !id) return;
		let cancelled = false;
		const loadWiki = async () => {
			setLoading(true);
			try {
				const result = (await wikisHelper.fetchWikiWithContent({
					id: id as string | undefined,
					custom_id: custom_id as string | undefined,
				})) as DatabaseTypes.Wikis | undefined;
				if (!cancelled) {
					setWiki(result);
				}
			} catch (error) {
				console.error('Error fetching wiki content:', error);
			} finally {
				if (!cancelled) {
					setLoading(false);
				}
			}
		};
		loadWiki();
		return () => {
			cancelled = true;
		};
	}, [custom_id, id, language, wikisHelper]);

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
					<CustomMarkdown content={translateDynamic(getTextFromTranslation(wiki.translations, language))} backgroundColor={wiki?.color || primaryColor} imageWidth={'100%'} imageHeight={400} />
				) : (
					<Text style={{ color: theme.screen.text, padding: 16 }}>{translate(TranslationKeys.no_data_found)}</Text>
				)}
			</View>
		</ScrollView>
	);
};

export default Index;
