import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useTheme } from 'repo-depkit-common-ui';

/** One bar of the history chart: the metric value of a single activity. */
export type MetricHistoryEntry = {
	/** Start timestamp (ms since epoch) of the activity – used for the x-axis date label. */
	date: number;
	/** Metric value of the activity (e.g. avg speed in km/h or pace in min/km). */
	value: number;
};

export type MetricHistoryBarChartProps = {
	/** Entries in chronological order (oldest first = leftmost bar). */
	entries: MetricHistoryEntry[];
	/** Bar fill color. */
	barColor: string;
	/** Formats the value label shown above each bar (keep it short, e.g. "12.3"). */
	formatValue: (value: number) => string;
	/** Unit label shown once in the chart header (e.g. "km/h" or "min/km"). */
	unitLabel?: string;
};

const CHART_HEIGHT = 160;
const BAR_WIDTH = 30;
const BAR_GAP = 10;
const MIN_BAR_HEIGHT = 3;

function formatDateLabel(timestamp: number): { dayMonth: string; year: string } {
	const d = new Date(timestamp);
	const dd = String(d.getDate()).padStart(2, '0');
	const mm = String(d.getMonth() + 1).padStart(2, '0');
	return { dayMonth: `${dd}.${mm}.`, year: String(d.getFullYear()) };
}

/**
 * A simple bar chart (plain Views, no chart library) showing how a single
 * activity metric evolved over time. Each bar is one activity, the x-axis is
 * the activity date, the bar height is the metric value scaled to the maximum
 * of the series. Scrolls horizontally when there are many activities.
 */
const MetricHistoryBarChart: React.FC<MetricHistoryBarChartProps> = ({
	entries,
	barColor,
	formatValue,
	unitLabel,
}) => {
	const { theme } = useTheme();

	if (entries.length === 0) {
		return (
			<Text style={[styles.emptyText, { color: theme.screen.placeholder }]}>
				Keine Daten vorhanden
			</Text>
		);
	}

	const maxValue = Math.max(...entries.map((e) => e.value));
	const showYears = new Set(entries.map((e) => new Date(e.date).getFullYear())).size > 1
		|| new Date(entries[0].date).getFullYear() !== new Date().getFullYear();

	return (
		<View>
			{unitLabel ? (
				<Text style={[styles.unitLabel, { color: theme.screen.placeholder }]}>{unitLabel}</Text>
			) : null}
			<ScrollView
				horizontal
				showsHorizontalScrollIndicator={entries.length > 8}
				contentContainerStyle={styles.scrollContent}
			>
				{entries.map((entry, i) => {
					const ratio = maxValue > 0 ? entry.value / maxValue : 0;
					const barHeight = Math.max(MIN_BAR_HEIGHT, Math.round(ratio * CHART_HEIGHT));
					const { dayMonth, year } = formatDateLabel(entry.date);
					return (
						<View key={`${entry.date}-${i}`} style={styles.barColumn}>
							<View style={styles.barArea}>
								<Text style={[styles.valueLabel, { color: theme.screen.text }]} numberOfLines={1}>
									{formatValue(entry.value)}
								</Text>
								<View
									style={[
										styles.bar,
										{ height: barHeight, backgroundColor: barColor },
									]}
								/>
							</View>
							<View style={[styles.axisLine, { backgroundColor: theme.screen.border }]} />
							<Text style={[styles.dateLabel, { color: theme.screen.placeholder }]}>{dayMonth}</Text>
							{showYears ? (
								<Text style={[styles.dateLabel, { color: theme.screen.placeholder }]}>{year}</Text>
							) : null}
						</View>
					);
				})}
			</ScrollView>
		</View>
	);
};

const styles = StyleSheet.create({
	scrollContent: {
		paddingHorizontal: 12,
		paddingTop: 4,
	},
	unitLabel: {
		fontSize: 12,
		marginBottom: 4,
		paddingHorizontal: 12,
	},
	barColumn: {
		alignItems: 'center',
		marginRight: BAR_GAP,
		width: BAR_WIDTH + 14,
	},
	barArea: {
		height: CHART_HEIGHT + 18,
		justifyContent: 'flex-end',
		alignItems: 'center',
	},
	valueLabel: {
		fontSize: 10,
		marginBottom: 2,
	},
	bar: {
		width: BAR_WIDTH,
		borderTopLeftRadius: 4,
		borderTopRightRadius: 4,
	},
	axisLine: {
		alignSelf: 'stretch',
		height: StyleSheet.hairlineWidth,
		marginTop: 0,
	},
	dateLabel: {
		fontSize: 10,
		marginTop: 2,
	},
	emptyText: {
		fontSize: 14,
		textAlign: 'center',
		paddingVertical: 24,
	},
});

export default MetricHistoryBarChart;
