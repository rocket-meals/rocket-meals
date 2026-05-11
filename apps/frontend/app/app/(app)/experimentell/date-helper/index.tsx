import React, { useMemo } from 'react';
import { ScrollView, Text, View } from 'react-native';
import * as Localization from 'expo-localization';
import { DateHelper as CommonDateHelper } from 'repo-depkit-common';

import { useTheme } from '@/hooks/useTheme';
import useSetPageTitle from '@/hooks/useSetPageTitle';
import { useLanguage } from '@/hooks/useLanguage';
import { TranslationKeys } from '@/locales/keys';
import { useSmartReadableDateMethod } from '@/helper/DateHelper';
import styles from '../styles';

const DateHelperPreview = () => {
	useSetPageTitle(TranslationKeys.date_helper_preview);
	const { theme } = useTheme();
	const { translate, language } = useLanguage();
	const smartReadableDate = useSmartReadableDateMethod();
	const dateLocale = language || Localization.locale || 'en';

	const dates = useMemo(() => {
		const start = new Date();
		start.setHours(0, 0, 0, 0);
		return Array.from({ length: 15 }, (_, index) => CommonDateHelper.addDaysAndReturnNewDate(start, index));
	}, []);

	return (
		<ScrollView
			style={{ ...styles.container, backgroundColor: theme.screen.background }}
			contentContainerStyle={{
				...styles.contentContainer,
				backgroundColor: theme.screen.background,
			}}
		>
			<View style={styles.content}>
				<Text style={{ ...styles.heading, color: theme.screen.text }}>{translate(TranslationKeys.date_helper_preview)}</Text>
				<View style={styles.section}>
					{dates.map(date => {
						const dateKey = CommonDateHelper.getDirectusDateOnlyString(date);
						return (
							<View key={dateKey} style={{ ...styles.listItem, backgroundColor: theme.card.background }}>
								<View style={{ flex: 1, paddingRight: 12 }}>
									<Text style={{ ...styles.body, color: theme.screen.text }}>{date.toLocaleDateString(dateLocale)}</Text>
								</View>
								<View style={{ flex: 1, alignItems: 'flex-end' }}>
									<Text style={{ ...styles.body, color: theme.screen.text }}>{smartReadableDate(date)}</Text>
								</View>
							</View>
						);
					})}
				</View>
			</View>
		</ScrollView>
	);
};

export default DateHelperPreview;
