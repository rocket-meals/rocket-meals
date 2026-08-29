import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useLocalSearchParams } from 'expo-router';
import { SettingsList, SettingsListBoxplot, SettingsListDate, SettingsListNumberInput, SettingsListProgress, SettingsListSelectOptionSingle } from 'repo-depkit-common-ui';
import { DateHelper, NumberHelper } from 'repo-depkit-common';
import CustomStackHeader from '@/components/CustomStackHeader/CustomStackHeader';
import SettingsGroupTitle from '@/components/SettingsGroupTitle';
import { resolveSettingsGroupPosition } from '@/helper/settingsListGroupPosition';
import { useTheme } from '@/hooks/useTheme';
import { useLanguage } from '@/hooks/useLanguage';
import { TranslationKeys } from '@/locales/keys';
import { loadHousingHandoverRecords } from '@/helper/housingAnalytics/HousingAnalyticsLoader';
import { type HousingHandoverRecord } from '@/helper/housingAnalytics/HousingHandoverRecords';
import {
	buildHousingReport,
	filterHousingHandoverRecords,
	findHousingReportDefinition,
	getPeriodRange,
	HousingAnalyticsPeriod,
	HousingGrouping,
	HousingReportAggregation,
	HousingReportId,
	HousingReportUnit,
	type HousingDateRange,
	type HousingReportDefinition,
	type HousingReportRow,
} from '@/helper/housingAnalytics/HousingAnalyticsReports';

/** Cleaning cost is only ever an estimate, so the rate stays editable instead of being hard-wired. */
const DEFAULT_CLEANING_HOURLY_RATE = 25;

const PERIOD_OPTIONS: { period: HousingAnalyticsPeriod; labelKey: string }[] = [
	{ period: HousingAnalyticsPeriod.LAST_12_MONTHS, labelKey: TranslationKeys.housing_analytics_period_last_12_months },
	{ period: HousingAnalyticsPeriod.LAST_24_MONTHS, labelKey: TranslationKeys.housing_analytics_period_last_24_months },
	{ period: HousingAnalyticsPeriod.CURRENT_YEAR, labelKey: TranslationKeys.housing_analytics_period_current_year },
	{ period: HousingAnalyticsPeriod.ALL_TIME, labelKey: TranslationKeys.housing_analytics_period_all_time },
	{ period: HousingAnalyticsPeriod.CUSTOM, labelKey: TranslationKeys.housing_analytics_period_custom },
];

const GROUPING_OPTIONS: { grouping: HousingGrouping; labelKey: string }[] = [
	{ grouping: HousingGrouping.BUILDING, labelKey: TranslationKeys.housing_analytics_grouping_building },
	{ grouping: HousingGrouping.ROOM, labelKey: TranslationKeys.housing_analytics_grouping_room },
];

/** `DateHelper.parseDD_MM_YYYY` throws on anything unparseable - a half-typed date is not an error here. */
function parseCustomDate(value: string): Date | null {
	if (!value) {
		return null;
	}
	try {
		const parsed = DateHelper.parseDD_MM_YYYY(value);
		return Number.isNaN(parsed.getTime()) ? null : parsed;
	} catch {
		return null;
	}
}

const ReportScreen = () => {
	const { report } = useLocalSearchParams<{ report?: string }>();
	const { theme } = useTheme();
	const { translate } = useLanguage();

	const definition = useMemo(() => findHousingReportDefinition(report), [report]);

	const [records, setRecords] = useState<HousingHandoverRecord[] | null>(null);
	const [loading, setLoading] = useState(true);
	const [loadFailed, setLoadFailed] = useState(false);

	const [period, setPeriod] = useState<HousingAnalyticsPeriod>(HousingAnalyticsPeriod.LAST_12_MONTHS);
	const [periodExpanded, setPeriodExpanded] = useState(false);
	const [customFrom, setCustomFrom] = useState('');
	const [customTo, setCustomTo] = useState('');

	const [grouping, setGrouping] = useState<HousingGrouping>(definition?.defaultGrouping ?? HousingGrouping.BUILDING);
	const [groupingExpanded, setGroupingExpanded] = useState(false);

	const [buildingQuery, setBuildingQuery] = useState('');
	const [roomQuery, setRoomQuery] = useState('');
	const [hourlyRate, setHourlyRate] = useState(DEFAULT_CLEANING_HOURLY_RATE);

	useEffect(() => {
		let cancelled = false;
		const load = async () => {
			setLoading(true);
			setLoadFailed(false);
			try {
				const loaded = await loadHousingHandoverRecords();
				if (!cancelled) {
					setRecords(loaded);
				}
			} catch (error) {
				console.error('Could not load housing handover records', error);
				if (!cancelled) {
					setLoadFailed(true);
				}
			} finally {
				if (!cancelled) {
					setLoading(false);
				}
			}
		};
		load();
		return () => {
			cancelled = true;
		};
	}, []);

	const range: HousingDateRange = useMemo(() => {
		if (period === HousingAnalyticsPeriod.CUSTOM) {
			return { from: parseCustomDate(customFrom), to: parseCustomDate(customTo) };
		}
		return getPeriodRange(period);
	}, [period, customFrom, customTo]);

	const result = useMemo(() => {
		if (!definition || !records) {
			return null;
		}
		const filtered = filterHousingHandoverRecords(records, { ...range, buildingQuery, roomQuery });
		return buildHousingReport(definition, filtered, grouping);
	}, [definition, records, range, buildingQuery, roomQuery, grouping]);

	const formatMetric = useCallback(
		(value: number, unit: HousingReportUnit): string => {
			switch (unit) {
				case HousingReportUnit.SHARE:
					return NumberHelper.formatNumber(value * 100, '%', true, ',', null, 0);
				case HousingReportUnit.HOURS:
					return NumberHelper.formatNumber(value, translate(TranslationKeys.housing_analytics_unit_hours), true, ',', null, 1);
				case HousingReportUnit.DAYS:
					return NumberHelper.formatNumber(value, translate(TranslationKeys.housing_analytics_unit_days), true, ',', null, 0);
				case HousingReportUnit.COUNT:
				default:
					return NumberHelper.formatNumber(value, null, true, ',', null, 1);
			}
		},
		[translate]
	);

	const formatCurrency = useCallback((value: number): string => NumberHelper.formatNumber(value, '€', true, ',', '.', 0), []);

	const basisLabel = useCallback(
		(amount: number): string => {
			const unitKey = definition?.id === HousingReportId.VACANCY_DAYS ? TranslationKeys.housing_analytics_vacancies : TranslationKeys.housing_analytics_handovers;
			return `${amount} ${translate(unitKey)}`;
		},
		[definition, translate]
	);

	/** How many handovers a row stands on - the number that decides whether its rank means anything. */
	const buildRowBasis = useCallback(
		(currentDefinition: HousingReportDefinition, row: HousingReportRow): string => {
			if (currentDefinition.unit === HousingReportUnit.SHARE) {
				return `${row.matchingCount} / ${basisLabel(row.sampleCount)}`;
			}
			return basisLabel(row.sampleCount);
		},
		[basisLabel]
	);

	/** What a single report adds on top of its primary number: cost, second share, median. */
	const buildRowExtras = useCallback(
		(currentDefinition: HousingReportDefinition, row: HousingReportRow): string => {
			const parts: string[] = [];
			if (currentDefinition.id === HousingReportId.CLEANING_EFFORT) {
				parts.push(`${translate(TranslationKeys.housing_analytics_average)} ${formatMetric(row.mean, HousingReportUnit.HOURS)}`);
				parts.push(formatCurrency(row.sum * hourlyRate));
			}
			if (currentDefinition.hasSecondaryShare && row.secondaryRatio !== null) {
				parts.push(`${translate(TranslationKeys.housing_analytics_short_term_share)}: ${formatMetric(row.secondaryRatio, HousingReportUnit.SHARE)}`);
			}
			// Only worth showing where the primary number is a sum - for a median report it would
			// just repeat the value that is already on the row.
			if (currentDefinition.aggregation === HousingReportAggregation.SUM && row.samples.length > 1) {
				parts.push(`${translate(TranslationKeys.housing_analytics_median)} ${formatMetric(row.median, currentDefinition.unit)}`);
			}
			return parts.join(' · ');
		},
		[formatCurrency, formatMetric, hourlyRate, translate]
	);

	const renderRow = useCallback(
		(currentDefinition: HousingReportDefinition, row: HousingReportRow, index: number, amount: number, keyPrefix: string) => {
			const groupPosition = resolveSettingsGroupPosition(index, amount);
			const valueText = formatMetric(row.value, currentDefinition.unit);
			const basisText = buildRowBasis(currentDefinition, row);
			const extrasText = buildRowExtras(currentDefinition, row);

			// A boxplot needs a spread to show; a single sample would render a flat line
			// that suggests far more certainty than one handover carries.
			if (currentDefinition.showsDistribution && row.stats && row.samples.length > 1) {
				return (
					<SettingsListBoxplot
						key={`${keyPrefix}-${row.key}`}
						// The boxplot row has no second text line, so name, number and basis share the title.
						label={`${row.label} · ${valueText} · ${basisText}`}
						leftIcon={<MaterialCommunityIcons name="chart-box-outline" size={22} />}
						stats={row.stats}
						// Without extras the component keeps its own "how to read a boxplot" text.
						description={extrasText.length > 0 ? extrasText : undefined}
						formatValue={(sample: number) => formatMetric(sample, currentDefinition.unit)}
						groupPosition={groupPosition}
					/>
				);
			}

			const detailText = extrasText.length > 0 ? `${basisText} · ${extrasText}` : basisText;

			if (currentDefinition.unit === HousingReportUnit.SHARE) {
				return (
					<SettingsListProgress
						key={`${keyPrefix}-${row.key}`}
						label={row.label}
						progress={row.ratio ?? 0}
						progressText={valueText}
						description={detailText}
						leftIcon={<MaterialCommunityIcons name={currentDefinition.iconName as never} size={22} />}
						groupPosition={groupPosition}
					/>
				);
			}

			return (
				<SettingsList
					key={`${keyPrefix}-${row.key}`}
					label={row.label}
					value={`${valueText} · ${detailText}`}
					stackedValue
					leftIcon={<MaterialCommunityIcons name={currentDefinition.iconName as never} size={22} />}
					groupPosition={groupPosition}
				/>
			);
		},
		[buildRowBasis, buildRowExtras, formatMetric]
	);

	if (!definition) {
		return (
			<View style={{ ...styles.container, backgroundColor: theme.screen.background }}>
				<CustomStackHeader label={translate(TranslationKeys.housing_analytics)} />
				<Text style={{ ...styles.emptyText, color: theme.screen.text }}>{translate(TranslationKeys.no_data_found)}</Text>
			</View>
		);
	}

	const selectedPeriodLabel = translate(PERIOD_OPTIONS.find((option) => option.period === period)?.labelKey ?? TranslationKeys.housing_analytics_period_last_12_months);
	const selectedGroupingLabel = translate(GROUPING_OPTIONS.find((option) => option.grouping === grouping)?.labelKey ?? TranslationKeys.housing_analytics_grouping_building);

	return (
		<View style={{ ...styles.container, backgroundColor: theme.screen.background }}>
			<CustomStackHeader label={translate(definition.titleKey)} />
			<ScrollView style={styles.scrollView} contentContainerStyle={styles.contentContainer}>
				<View style={styles.content}>
					<Text style={{ ...styles.introduction, color: theme.screen.text }}>{translate(definition.descriptionKey)}</Text>

					<SettingsGroupTitle>{translate(TranslationKeys.filter)}</SettingsGroupTitle>
					<SettingsList
						label={translate(TranslationKeys.housing_analytics_period)}
						value={selectedPeriodLabel}
						leftIcon={<MaterialCommunityIcons name="calendar-clock" size={22} />}
						rightIcon={<MaterialCommunityIcons name={periodExpanded ? 'chevron-up' : 'chevron-down'} size={22} color={theme.screen.icon} />}
						onPress={() => setPeriodExpanded((expanded) => !expanded)}
						groupPosition="top"
					/>
					{periodExpanded
						? PERIOD_OPTIONS.map((option) => (
								<SettingsListSelectOptionSingle
									key={option.period}
									label={translate(option.labelKey)}
									isSelected={option.period === period}
									onPress={() => setPeriod(option.period)}
									groupPosition="middle"
								/>
							))
						: null}
					{period === HousingAnalyticsPeriod.CUSTOM ? (
						<>
							<SettingsListDate
								id="housing-analytics-from"
								label={translate(TranslationKeys.housing_analytics_date_from)}
								value={customFrom}
								onChange={(_id: string, value: string) => setCustomFrom(value)}
								onError={() => undefined}
								groupPosition="middle"
							/>
							<SettingsListDate
								id="housing-analytics-to"
								label={translate(TranslationKeys.housing_analytics_date_to)}
								value={customTo}
								onChange={(_id: string, value: string) => setCustomTo(value)}
								onError={() => undefined}
								groupPosition="middle"
							/>
						</>
					) : null}
					<SettingsList
						label={translate(TranslationKeys.housing_analytics_grouping)}
						value={selectedGroupingLabel}
						leftIcon={<MaterialCommunityIcons name="format-list-group" size={22} />}
						rightIcon={<MaterialCommunityIcons name={groupingExpanded ? 'chevron-up' : 'chevron-down'} size={22} color={theme.screen.icon} />}
						onPress={() => setGroupingExpanded((expanded) => !expanded)}
						groupPosition="middle"
					/>
					{groupingExpanded
						? GROUPING_OPTIONS.map((option) => (
								<SettingsListSelectOptionSingle
									key={option.grouping}
									label={translate(option.labelKey)}
									isSelected={option.grouping === grouping}
									onPress={() => setGrouping(option.grouping)}
									groupPosition="middle"
								/>
							))
						: null}
					{definition.id === HousingReportId.CLEANING_EFFORT ? (
						<SettingsListNumberInput
							label={translate(TranslationKeys.housing_analytics_hourly_rate)}
							value={formatCurrency(hourlyRate)}
							initialValue={hourlyRate}
							min={0}
							allowDecimal
							suffix="€"
							onSave={(value: number) => setHourlyRate(value)}
							leftIcon={<MaterialCommunityIcons name="cash" size={22} />}
							groupPosition="middle"
						/>
					) : null}

					<View style={styles.searchRow}>
						<TextInput
							style={{ ...styles.searchInput, color: theme.screen.text, borderColor: theme.screen.iconBg, backgroundColor: theme.screen.iconBg }}
							value={buildingQuery}
							onChangeText={setBuildingQuery}
							placeholder={translate(TranslationKeys.housing_analytics_search_building)}
							placeholderTextColor={theme.screen.placeholder}
							cursorColor={theme.screen.text}
						/>
						<TextInput
							style={{ ...styles.searchInput, color: theme.screen.text, borderColor: theme.screen.iconBg, backgroundColor: theme.screen.iconBg }}
							value={roomQuery}
							onChangeText={setRoomQuery}
							placeholder={translate(TranslationKeys.housing_analytics_search_room)}
							placeholderTextColor={theme.screen.placeholder}
							cursorColor={theme.screen.text}
						/>
					</View>

					{loading ? (
						<View style={styles.loadingContainer}>
							<ActivityIndicator size={30} color={theme.screen.text} />
						</View>
					) : null}

					{!loading && loadFailed ? <Text style={{ ...styles.emptyText, color: theme.screen.text }}>{translate(TranslationKeys.housing_analytics_load_error)}</Text> : null}

					{!loading && !loadFailed && result ? (
						<>
							<SettingsGroupTitle>{translate(TranslationKeys.housing_analytics_result)}</SettingsGroupTitle>
							<SettingsList
								label={translate(TranslationKeys.housing_analytics_data_basis)}
								value={result.skippedCount > 0 ? `${basisLabel(result.recordCount)} · ${result.skippedCount} ${translate(TranslationKeys.housing_analytics_without_answer)}` : basisLabel(result.recordCount)}
								stackedValue
								leftIcon={<MaterialCommunityIcons name="database-outline" size={22} />}
								groupPosition={result.total ? 'top' : 'single'}
							/>
							{result.total ? renderRow(definition, { ...result.total, label: translate(TranslationKeys.housing_analytics_overall) }, 1, 2, 'total') : null}

							{result.rows.length > 0 ? (
								<>
									<SettingsGroupTitle>{selectedGroupingLabel}</SettingsGroupTitle>
									{result.rows.map((row, index) => renderRow(definition, row, index, result.rows.length, 'row'))}
								</>
							) : (
								<Text style={{ ...styles.emptyText, color: theme.screen.text }}>{translate(TranslationKeys.no_data_found)}</Text>
							)}
						</>
					) : null}
				</View>
			</ScrollView>
		</View>
	);
};

export default ReportScreen;

const styles = StyleSheet.create({
	container: {
		flex: 1,
		width: '100%',
	},
	scrollView: {
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
	searchRow: {
		flexDirection: 'row',
		flexWrap: 'wrap',
		gap: 10,
		marginTop: 14,
	},
	searchInput: {
		flexGrow: 1,
		flexBasis: 200,
		height: 44,
		borderRadius: 22,
		borderWidth: 1,
		paddingHorizontal: 16,
		fontFamily: 'Poppins_400Regular',
		fontSize: 14,
		outlineWidth: 0,
	},
	loadingContainer: {
		width: '100%',
		height: 160,
		justifyContent: 'center',
		alignItems: 'center',
	},
	emptyText: {
		fontSize: 15,
		textAlign: 'center',
		paddingVertical: 30,
	},
});
