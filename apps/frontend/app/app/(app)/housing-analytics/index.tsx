import React, { useMemo } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { MaterialCommunityIcons, Octicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { SettingsList } from 'repo-depkit-common-ui';
import SettingsGroupTitle from '@/components/SettingsGroupTitle';
import { resolveSettingsGroupPosition } from '@/helper/settingsListGroupPosition';
import { useTheme } from '@/hooks/useTheme';
import { useLanguage } from '@/hooks/useLanguage';
import { TranslationKeys } from '@/locales/keys';
import useSetPageTitle from '@/hooks/useSetPageTitle';
import { HOUSING_ANALYTICS_ROUTE } from '@/helper/housingAnalytics/HousingAnalyticsRoutes';
import { HOUSING_REPORT_DEFINITIONS, type HousingReportDefinition } from '@/helper/housingAnalytics/HousingAnalyticsReports';

/** Groups the catalogue in the order the definitions declare, so a new report only needs its `groupTitleKey`. */
function groupReports(definitions: HousingReportDefinition[]): { groupTitleKey: string; reports: HousingReportDefinition[] }[] {
	const groups: { groupTitleKey: string; reports: HousingReportDefinition[] }[] = [];
	for (const definition of definitions) {
		const currentGroup = groups.find((group) => group.groupTitleKey === definition.groupTitleKey);
		if (currentGroup) {
			currentGroup.reports.push(definition);
		} else {
			groups.push({ groupTitleKey: definition.groupTitleKey, reports: [definition] });
		}
	}
	return groups;
}

const Index = () => {
	useSetPageTitle(TranslationKeys.housing_analytics);
	const { theme } = useTheme();
	const { translate } = useLanguage();
	const groups = useMemo(() => groupReports(HOUSING_REPORT_DEFINITIONS), []);

	return (
		<ScrollView style={{ ...styles.container, backgroundColor: theme.screen.background }} contentContainerStyle={styles.contentContainer}>
			<View style={styles.content}>
				<Text style={{ ...styles.introduction, color: theme.screen.text }}>{translate(TranslationKeys.housing_analytics_description)}</Text>

				{groups.map((group) => (
					<View key={group.groupTitleKey}>
						<SettingsGroupTitle>{translate(group.groupTitleKey)}</SettingsGroupTitle>
						<View style={styles.groupContainer}>
							{group.reports.map((definition, index) => (
								<SettingsList
									key={definition.id}
									label={translate(definition.titleKey)}
									value={translate(definition.descriptionKey)}
									stackedValue
									leftIcon={<MaterialCommunityIcons name={definition.iconName as never} size={22} />}
									rightIcon={<Octicons name="chevron-right" size={24} color={theme.screen.icon} />}
									groupPosition={resolveSettingsGroupPosition(index, group.reports.length)}
									onPress={() => {
										router.navigate(`${HOUSING_ANALYTICS_ROUTE}/${definition.id}`);
									}}
								/>
							))}
						</View>
					</View>
				))}
			</View>
		</ScrollView>
	);
};

export default Index;

const styles = StyleSheet.create({
	container: {
		flex: 1,
		width: '100%',
	},
	contentContainer: {
		alignItems: 'center',
		paddingBottom: 40,
	},
	content: {
		width: '100%',
		maxWidth: 900,
		paddingHorizontal: 10,
	},
	introduction: {
		fontSize: 14,
		lineHeight: 20,
		marginTop: 16,
		opacity: 0.8,
	},
	groupContainer: {
		width: '100%',
	},
});
