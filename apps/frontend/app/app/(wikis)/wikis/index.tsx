import { ActivityIndicator, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import React, { useEffect, useMemo, useState } from 'react';
import styles from './styles';
import AppButton from '@/components/AppButton';
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
import useIsLtrLanguage from '@/hooks/useIsLtrLanguage';
import AppEmptyState from '@/components/AppEmptyState';
import AppLoadingView from '@/components/AppLoadingView';

const Index = () => {
	const { theme } = useTheme();
	const { translate, translateDynamic } = useLanguage();
	const isLtrLanguage = useIsLtrLanguage();
	const [wiki, setWiki] = useState<DatabaseTypes.Wikis>();
	const [loading, setLoading] = useState(true);
	const { wikisDict, language, primaryColor, drawerPosition } = useAppSelector((state) => state.settings);
	const wikis = useMemo(() => Object.values(wikisDict || {}) as DatabaseTypes.Wikis[], [wikisDict]);
	const { deviceMock } = useGlobalSearchParams();
	const { custom_id, id } = useLocalSearchParams();
	const resolvedDrawerPosition = drawerPosition === 'system' ? (isLtrLanguage ? 'left' : 'right') : drawerPosition;
	const isArabicRight = !isLtrLanguage && resolvedDrawerPosition === 'right';
	//Set Page Title
	const title = wiki?.translations ? translateDynamic(getTitleFromTranslation(wiki?.translations, language)) : 'Wikis';
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
				<View style={[styles.row, isArabicRight ? { justifyContent: 'flex-end' } : undefined]}>
					<View style={[styles.col1, isArabicRight ? { flexDirection: 'row-reverse' } : undefined]}>
						<AppButton
							variant="ghost"
							usePlainText
							onPress={() => router.navigate(('/(app)/' + AppScreens.FOOD_OFFERS) as any)}
							style={{ padding: 10, minWidth: 0, minHeight: 0, marginVertical: 0 }}
						>
							<Ionicons name={isArabicRight ? 'arrow-forward' : 'arrow-back'} size={24} color={theme.header.text} />
						</AppButton>
						<Text style={{ ...styles.heading, color: theme.header.text, ...(isArabicRight ? { textAlign: 'right' } : {}) }}>{wiki?.translations && translateDynamic(getTitleFromTranslation(wiki?.translations, language))}</Text>
					</View>
				</View>
			</View>
			<View style={styles.content}>
				{loading ? (
					<AppLoadingView />
				) : wiki?.translations && getTextFromTranslation(wiki.translations, language)?.trim() ? (
					<CustomMarkdown content={translateDynamic(getTextFromTranslation(wiki.translations, language))} backgroundColor={wiki?.color || primaryColor} imageWidth={'100%'} imageHeight={400} />
				) : (
					<AppEmptyState message={translate(TranslationKeys.no_data_found)} />
				)}
			</View>
		</ScrollView>
	);
};

export default Index;
