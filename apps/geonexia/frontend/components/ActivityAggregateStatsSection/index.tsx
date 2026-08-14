import React, { useCallback } from 'react';
import { Text, View } from 'react-native';
import {
	MaterialIcons,
	MaterialCommunityIcons,
	Ionicons,
	FontAwesome5,
} from '@expo/vector-icons';
import { SettingsList, SettingsListGroupTitle, useMyScrollViewModal, useTheme } from 'repo-depkit-common-ui';

import { SavedActivity } from '../../helpers/ActivityStorage';
import {
	computeStats,
	formatDistance,
	formatDuration,
	formatSpeed,
	formatPace,
} from '../../helpers/ActivityStatsHelper';
import MetricHistoryBarChart, { MetricHistoryEntry } from './MetricHistoryBarChart';

const PRIMARY_COLOR = '#2563eb';

type Props = {
	/** Activities to aggregate. Expected sorted newest-first. */
	activities: SavedActivity[];
	/** Optional label shown when activities list is empty. */
	emptyLabel?: string;
};

/** Formats a pace value as a short "m:ss" label (without the "/km" suffix). */
function formatPaceShort(minPerKm: number): string {
	const m = Math.floor(minPerKm);
	const s = Math.round((minPerKm - m) * 60);
	return `${m}:${String(s).padStart(2, '0')}`;
}

/**
 * Builds the chronological (oldest-first) per-activity history of a metric.
 * Activities without a usable value (0 / negative / non-finite) are skipped.
 */
function buildMetricHistory(
	activities: SavedActivity[],
	getValue: (activity: SavedActivity) => number,
): MetricHistoryEntry[] {
	const entries: MetricHistoryEntry[] = [];
	for (const act of activities) {
		const value = getValue(act);
		if (Number.isFinite(value) && value > 0) {
			entries.push({ date: act.startedAt, value });
		}
	}
	// activities are sorted newest-first – the chart wants oldest-first
	entries.reverse();
	return entries;
}

/**
 * Renders aggregate statistics for a list of activities as SettingsList rows,
 * grouped into the sections: Übersicht, Geschwindigkeit, Pace, Höhenprofil, Gesundheit.
 * Speed and pace rows open a modal with a bar chart showing the metric per
 * activity over time (x-axis: activity date).
 */
const ActivityAggregateStatsSection: React.FC<Props> = ({ activities, emptyLabel }) => {
	const { theme } = useTheme();
	const { show: showHistoryModal } = useMyScrollViewModal();

	const openHistoryModal = useCallback(
		(options: {
			title: string;
			barColor: string;
			unitLabel: string;
			formatValue: (value: number) => string;
			getValue: (activity: SavedActivity) => number;
		}) => {
			const entries = buildMetricHistory(activities, options.getValue);
			showHistoryModal({
				title: options.title,
				children: (
					<View>
						<MetricHistoryBarChart
							entries={entries}
							barColor={options.barColor}
							formatValue={options.formatValue}
							unitLabel={options.unitLabel}
						/>
					</View>
				),
			});
		},
		[activities, showHistoryModal],
	);

	const openMaxSpeedHistory = useCallback(() => {
		openHistoryModal({
			title: '📊 Höchstgeschwindigkeit – Verlauf',
			barColor: PRIMARY_COLOR,
			unitLabel: 'km/h',
			formatValue: (v) => v.toFixed(1),
			getValue: (act) => act.stats.maxSpeedKmh,
		});
	}, [openHistoryModal]);

	const openAvgSpeedHistory = useCallback(() => {
		openHistoryModal({
			title: '📊 Geschwindigkeit – Verlauf',
			barColor: PRIMARY_COLOR,
			unitLabel: 'km/h (Durchschnitt pro Aktivität)',
			formatValue: (v) => v.toFixed(1),
			getValue: (act) => act.stats.avgSpeedKmh,
		});
	}, [openHistoryModal]);

	const openPaceHistory = useCallback(() => {
		openHistoryModal({
			title: '📊 Pace – Verlauf',
			barColor: PRIMARY_COLOR,
			unitLabel: 'min/km (pro Aktivität)',
			formatValue: formatPaceShort,
			getValue: (act) => act.stats.paceMinPerKm,
		});
	}, [openHistoryModal]);

	if (activities.length === 0) {
		return (
			<View style={{ alignItems: 'center', marginTop: 24, gap: 10 }}>
				<Ionicons name="bar-chart-outline" size={40} color={theme.screen.icon} />
				<Text style={{ fontSize: 15, textAlign: 'center', color: theme.screen.icon }}>
					{emptyLabel ?? 'Keine Aktivitäten vorhanden'}
				</Text>
			</View>
		);
	}

	const stats = computeStats(activities);
	const avgSpeed = stats.totalAvgSpeedSum / stats.count;
	const bestPace = stats.bestPaceMinPerKm === Infinity ? 0 : stats.bestPaceMinPerKm;
	const chevron = <Ionicons name="chevron-forward" size={20} color="#9ca3af" />;

	return (
		<>
			{/* Overview */}
			<SettingsListGroupTitle title="Übersicht" />
			<SettingsList
				iconBgColor={PRIMARY_COLOR}
				leftIcon={<Ionicons name="bar-chart-outline" size={22} color="#ffffff" />}
				label="Aktivitäten"
				value={String(stats.count)}
				groupPosition="top"
			/>
			<SettingsList
				iconBgColor={PRIMARY_COLOR}
				leftIcon={<MaterialIcons name="straighten" size={22} color="#ffffff" />}
				label="Gesamtstrecke"
				value={formatDistance(stats.totalDistanceKm)}
				groupPosition="middle"
			/>
			<SettingsList
				iconBgColor={PRIMARY_COLOR}
				leftIcon={<Ionicons name="time-outline" size={22} color="#ffffff" />}
				label="Gesamtdauer"
				value={formatDuration(stats.totalDurationSeconds)}
				groupPosition="bottom"
			/>

			{/* Speed */}
			<SettingsListGroupTitle title="Geschwindigkeit" />
			<SettingsList
				iconBgColor={PRIMARY_COLOR}
				leftIcon={<MaterialCommunityIcons name="speedometer" size={22} color="#ffffff" />}
				label="Höchstgeschwindigkeit"
				value={formatSpeed(stats.maxSpeedKmh)}
				rightIcon={chevron}
				handleFunction={openMaxSpeedHistory}
				groupPosition="top"
			/>
			<SettingsList
				iconBgColor={PRIMARY_COLOR}
				leftIcon={<MaterialCommunityIcons name="speedometer-medium" size={22} color="#ffffff" />}
				label="Durchschnittliche Geschwindigkeit"
				value={formatSpeed(avgSpeed)}
				rightIcon={chevron}
				handleFunction={openAvgSpeedHistory}
				groupPosition="bottom"
			/>

			{/* Pace */}
			<SettingsListGroupTitle title="Pace" />
			<SettingsList
				iconBgColor={PRIMARY_COLOR}
				leftIcon={<MaterialIcons name="timer" size={22} color="#ffffff" />}
				label="Beste Pace"
				value={bestPace > 0 ? formatPace(bestPace) : '—'}
				rightIcon={chevron}
				handleFunction={openPaceHistory}
				groupPosition="top"
			/>
			<SettingsList
				iconBgColor={PRIMARY_COLOR}
				leftIcon={<MaterialIcons name="timer" size={22} color="#ffffff" />}
				label="Durchschnittliche Pace"
				value={stats.avgPaceMinPerKm > 0 ? formatPace(stats.avgPaceMinPerKm) : '—'}
				rightIcon={chevron}
				handleFunction={openPaceHistory}
				groupPosition="middle"
			/>
			<SettingsList
				iconBgColor={PRIMARY_COLOR}
				leftIcon={<MaterialIcons name="timer" size={22} color="#ffffff" />}
				label="Letzte Pace"
				value={stats.lastPaceMinPerKm > 0 ? formatPace(stats.lastPaceMinPerKm) : '—'}
				rightIcon={chevron}
				handleFunction={openPaceHistory}
				groupPosition="bottom"
			/>

			{/* Elevation */}
			<SettingsListGroupTitle title="Höhenprofil" />
			<SettingsList
				iconBgColor={PRIMARY_COLOR}
				leftIcon={<Ionicons name="trending-up-outline" size={22} color="#ffffff" />}
				label="Höhengewinn"
				value={`${Math.round(stats.totalElevationGainM)} m`}
				groupPosition="top"
			/>
			<SettingsList
				iconBgColor={PRIMARY_COLOR}
				leftIcon={<Ionicons name="trending-down-outline" size={22} color="#ffffff" />}
				label="Höhenverlust"
				value={`${Math.round(stats.totalElevationLossM)} m`}
				groupPosition="bottom"
			/>

			{/* Health */}
			<SettingsListGroupTitle title="Gesundheit" />
			<SettingsList
				iconBgColor={PRIMARY_COLOR}
				leftIcon={<MaterialCommunityIcons name="fire" size={22} color="#ffffff" />}
				label="Kalorien"
				value={`${Math.round(stats.totalKcal)} kcal`}
				groupPosition="top"
			/>
			<SettingsList
				iconBgColor={PRIMARY_COLOR}
				leftIcon={<FontAwesome5 name="shoe-prints" size={18} color="#ffffff" />}
				label="Schritte"
				value={stats.totalSteps.toLocaleString()}
				groupPosition="middle"
			/>
			<SettingsList
				iconBgColor={PRIMARY_COLOR}
				leftIcon={<Ionicons name="water-outline" size={22} color="#ffffff" />}
				label="Flüssigkeitsbedarf"
				value={`${Math.round(stats.totalFluidNeedsMl)} ml`}
				groupPosition="bottom"
			/>
		</>
	);
};

export default ActivityAggregateStatsSection;
