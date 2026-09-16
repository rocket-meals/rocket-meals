/**
 * The report catalogue behind the housing analytics screens.
 *
 * Every report boils the handover records down to a list of observations (one per handover, or
 * one per vacancy gap), each already carrying the group it belongs to. {@link summarizeEntries}
 * then turns those into rows - share, sum, mean or median plus the raw samples for a boxplot.
 * Keeping that last step shared means a new report is a few lines here and nothing in the UI.
 *
 * Everything in this file is pure: no network, no translation, no formatting. The screen decides
 * how a number is written out, this file only says what the number is.
 */

import { computeBoxplotStats, type BoxplotStats } from 'repo-depkit-common';
import {
	getActualRentalDurationDays,
	getBuildingKey,
	getBuildingLabel,
	getDayDifference,
	getEarlyMoveOutDays,
	getHandoverReferenceDate,
	getRoomKey,
	getRoomLabel,
	type HousingHandoverRecord,
} from './HousingHandoverRecords';

export const HousingReportId = {
	DEFECT_RATE: 'defect-rate',
	CONSPICUOUS_ROOMS: 'conspicuous-rooms',
	CLEANING_EFFORT: 'cleaning-effort',
	DEFECT_PHOTOS: 'defect-photos',
	RENTAL_DURATION: 'rental-duration',
	EARLY_MOVE_OUTS: 'early-move-outs',
	VACANCY_DAYS: 'vacancy-days',
} as const;

export type HousingReportId = (typeof HousingReportId)[keyof typeof HousingReportId];

/** What the primary number of a report means - the screen picks the unit label and decimals from it. */
export const HousingReportUnit = {
	SHARE: 'share',
	HOURS: 'hours',
	DAYS: 'days',
	COUNT: 'count',
} as const;

export type HousingReportUnit = (typeof HousingReportUnit)[keyof typeof HousingReportUnit];

/** How the observations of a group become its primary number. */
export const HousingReportAggregation = {
	SHARE: 'share',
	SUM: 'sum',
	MEAN: 'mean',
	MEDIAN: 'median',
} as const;

export type HousingReportAggregation = (typeof HousingReportAggregation)[keyof typeof HousingReportAggregation];

/** Whether a report looks at whole buildings or at single rooms. Switchable on every screen. */
export const HousingGrouping = {
	BUILDING: 'building',
	ROOM: 'room',
} as const;

export type HousingGrouping = (typeof HousingGrouping)[keyof typeof HousingGrouping];

export type HousingReportDefinition = {
	id: HousingReportId;
	/** Translation keys - resolved by the screen, never here. */
	titleKey: string;
	descriptionKey: string;
	/** Section this report is listed under on the overview screen. */
	groupTitleKey: string;
	/** MaterialCommunityIcons name. */
	iconName: string;
	unit: HousingReportUnit;
	aggregation: HousingReportAggregation;
	defaultGrouping: HousingGrouping;
	/** Rank rows by their primary number, or by how many handovers matched. */
	sortBy: 'value' | 'matching';
	sortDirection: 'asc' | 'desc';
	/** Renders a boxplot per row - only meaningful where a group has a spread worth seeing. */
	showsDistribution: boolean;
	/** A second share shown below the primary one (short-term rentals next to early move-outs). */
	hasSecondaryShare: boolean;
};

export const HOUSING_REPORT_DEFINITIONS: HousingReportDefinition[] = [
	{
		id: HousingReportId.DEFECT_RATE,
		titleKey: 'housing_analytics_report_defect_rate',
		descriptionKey: 'housing_analytics_report_defect_rate_description',
		groupTitleKey: 'housing_analytics_group_objects',
		iconName: 'home-alert',
		unit: HousingReportUnit.SHARE,
		aggregation: HousingReportAggregation.SHARE,
		defaultGrouping: HousingGrouping.BUILDING,
		sortBy: 'value',
		sortDirection: 'desc',
		showsDistribution: false,
		hasSecondaryShare: false,
	},
	{
		id: HousingReportId.CONSPICUOUS_ROOMS,
		titleKey: 'housing_analytics_report_conspicuous_rooms',
		descriptionKey: 'housing_analytics_report_conspicuous_rooms_description',
		groupTitleKey: 'housing_analytics_group_objects',
		iconName: 'door-open',
		unit: HousingReportUnit.SHARE,
		aggregation: HousingReportAggregation.SHARE,
		defaultGrouping: HousingGrouping.ROOM,
		sortBy: 'matching',
		sortDirection: 'desc',
		showsDistribution: false,
		hasSecondaryShare: false,
	},
	{
		id: HousingReportId.CLEANING_EFFORT,
		titleKey: 'housing_analytics_report_cleaning_effort',
		descriptionKey: 'housing_analytics_report_cleaning_effort_description',
		groupTitleKey: 'housing_analytics_group_objects',
		iconName: 'broom',
		unit: HousingReportUnit.HOURS,
		aggregation: HousingReportAggregation.SUM,
		defaultGrouping: HousingGrouping.BUILDING,
		sortBy: 'value',
		sortDirection: 'desc',
		showsDistribution: true,
		hasSecondaryShare: false,
	},
	{
		id: HousingReportId.DEFECT_PHOTOS,
		titleKey: 'housing_analytics_report_defect_photos',
		descriptionKey: 'housing_analytics_report_defect_photos_description',
		groupTitleKey: 'housing_analytics_group_objects',
		iconName: 'camera-outline',
		unit: HousingReportUnit.COUNT,
		aggregation: HousingReportAggregation.MEAN,
		defaultGrouping: HousingGrouping.BUILDING,
		sortBy: 'value',
		sortDirection: 'desc',
		showsDistribution: true,
		hasSecondaryShare: false,
	},
	{
		id: HousingReportId.RENTAL_DURATION,
		titleKey: 'housing_analytics_report_rental_duration',
		descriptionKey: 'housing_analytics_report_rental_duration_description',
		groupTitleKey: 'housing_analytics_group_tenancy',
		iconName: 'calendar-range',
		unit: HousingReportUnit.DAYS,
		aggregation: HousingReportAggregation.MEDIAN,
		defaultGrouping: HousingGrouping.BUILDING,
		sortBy: 'value',
		sortDirection: 'asc',
		showsDistribution: true,
		hasSecondaryShare: false,
	},
	{
		id: HousingReportId.EARLY_MOVE_OUTS,
		titleKey: 'housing_analytics_report_early_move_outs',
		descriptionKey: 'housing_analytics_report_early_move_outs_description',
		groupTitleKey: 'housing_analytics_group_tenancy',
		iconName: 'exit-run',
		unit: HousingReportUnit.SHARE,
		aggregation: HousingReportAggregation.SHARE,
		defaultGrouping: HousingGrouping.BUILDING,
		sortBy: 'value',
		sortDirection: 'desc',
		showsDistribution: false,
		hasSecondaryShare: true,
	},
	{
		id: HousingReportId.VACANCY_DAYS,
		titleKey: 'housing_analytics_report_vacancy_days',
		descriptionKey: 'housing_analytics_report_vacancy_days_description',
		groupTitleKey: 'housing_analytics_group_tenancy',
		iconName: 'timer-sand',
		unit: HousingReportUnit.DAYS,
		aggregation: HousingReportAggregation.SUM,
		defaultGrouping: HousingGrouping.BUILDING,
		sortBy: 'value',
		sortDirection: 'desc',
		showsDistribution: true,
		hasSecondaryShare: false,
	},
];

export function findHousingReportDefinition(reportId: string | undefined | null): HousingReportDefinition | null {
	return HOUSING_REPORT_DEFINITIONS.find((definition) => definition.id === reportId) ?? null;
}

/** A contract shorter than this counts as a short-term rental. */
export const SHORT_TERM_RENTAL_DAYS = 183;

export const HousingAnalyticsPeriod = {
	LAST_12_MONTHS: 'last_12_months',
	LAST_24_MONTHS: 'last_24_months',
	CURRENT_YEAR: 'current_year',
	ALL_TIME: 'all_time',
	CUSTOM: 'custom',
} as const;

export type HousingAnalyticsPeriod = (typeof HousingAnalyticsPeriod)[keyof typeof HousingAnalyticsPeriod];

export type HousingDateRange = {
	from: Date | null;
	to: Date | null;
};

/**
 * Turns a period preset into a concrete range.
 *
 * A year of move-outs is the default everywhere: it covers a full letting cycle including the
 * semester peaks, which a "last 3 months" window would cut right through.
 */
export function getPeriodRange(period: HousingAnalyticsPeriod, today: Date = new Date()): HousingDateRange {
	const endOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate());
	switch (period) {
		case HousingAnalyticsPeriod.LAST_12_MONTHS:
			return { from: new Date(today.getFullYear() - 1, today.getMonth(), today.getDate()), to: endOfToday };
		case HousingAnalyticsPeriod.LAST_24_MONTHS:
			return { from: new Date(today.getFullYear() - 2, today.getMonth(), today.getDate()), to: endOfToday };
		case HousingAnalyticsPeriod.CURRENT_YEAR:
			return { from: new Date(today.getFullYear(), 0, 1), to: endOfToday };
		case HousingAnalyticsPeriod.ALL_TIME:
		case HousingAnalyticsPeriod.CUSTOM:
		default:
			return { from: null, to: null };
	}
}

export type HousingAnalyticsFilter = HousingDateRange & {
	/** Free text matched against building number and name. */
	buildingQuery: string;
	/** Free text matched against room number and VONUMMER. */
	roomQuery: string;
};

export const EMPTY_HOUSING_ANALYTICS_FILTER: HousingAnalyticsFilter = {
	from: null,
	to: null,
	buildingQuery: '',
	roomQuery: '',
};

function matchesQuery(query: string, ...candidates: (string | null)[]): boolean {
	const needle = query.trim().toLowerCase();
	if (needle.length === 0) {
		return true;
	}
	return candidates.some((candidate) => (candidate ?? '').toLowerCase().includes(needle));
}

function isWithinRange(date: Date | null, range: HousingDateRange): boolean {
	if (!range.from && !range.to) {
		return true;
	}
	if (!date) {
		// A handover with no date cannot be placed in a period - leaving it in would silently
		// inflate every windowed report with records that may be years old.
		return false;
	}
	if (range.from && date.getTime() < range.from.getTime()) {
		return false;
	}
	if (range.to && date.getTime() > range.to.getTime()) {
		return false;
	}
	return true;
}

export function filterHousingHandoverRecords(records: HousingHandoverRecord[], filter: HousingAnalyticsFilter): HousingHandoverRecord[] {
	return records.filter((record) => {
		if (!isWithinRange(getHandoverReferenceDate(record), filter)) {
			return false;
		}
		if (!matchesQuery(filter.buildingQuery, record.buildingNumber, record.buildingName)) {
			return false;
		}
		return matchesQuery(filter.roomQuery, record.roomNumber, record.objectNumber);
	});
}

/** One observation that goes into a report, already assigned to its group. */
type ReportEntry = {
	groupKey: string;
	groupLabel: string;
	/** Numeric value behind sum/mean/median and the boxplot. */
	sample: number | null;
	/** Counts toward the primary share. */
	matches: boolean;
	/** Counts toward the secondary share (short-term rentals). */
	secondaryMatches: boolean;
};

export type HousingReportRow = {
	key: string;
	label: string;
	/** The report's primary number, in its unit. Shares are 0..1. */
	value: number;
	/** Set for share reports, `null` otherwise. */
	ratio: number | null;
	/** Handovers (or gaps) behind this row. */
	sampleCount: number;
	/** How many of them matched, for share reports. */
	matchingCount: number;
	secondaryRatio: number | null;
	secondaryCount: number;
	sum: number;
	mean: number;
	median: number;
	samples: number[];
	stats: BoxplotStats | null;
};

export type HousingReportResult = {
	reportId: HousingReportId;
	grouping: HousingGrouping;
	rows: HousingReportRow[];
	/** The same aggregation over every observation, regardless of group. */
	total: HousingReportRow | null;
	/** Handovers left after filtering. */
	recordCount: number;
	/** Handovers that could not be used because the answer behind the report was missing. */
	skippedCount: number;
};

function groupKeyOf(record: HousingHandoverRecord, grouping: HousingGrouping): string | null {
	return grouping === HousingGrouping.ROOM ? getRoomKey(record) : getBuildingKey(record);
}

function groupLabelOf(record: HousingHandoverRecord, grouping: HousingGrouping): string | null {
	return grouping === HousingGrouping.ROOM ? getRoomLabel(record) : getBuildingLabel(record);
}

function buildRow(key: string, label: string, entries: ReportEntry[], aggregation: HousingReportAggregation): HousingReportRow {
	const samples = entries.map((entry) => entry.sample).filter((sample): sample is number => sample !== null);
	const sum = samples.reduce((accumulated, sample) => accumulated + sample, 0);
	const mean = samples.length > 0 ? sum / samples.length : 0;
	const stats = samples.length > 0 ? computeBoxplotStats(samples) : null;
	const median = stats?.median ?? 0;

	const matchingCount = entries.filter((entry) => entry.matches).length;
	const secondaryCount = entries.filter((entry) => entry.secondaryMatches).length;
	const ratio = entries.length > 0 ? matchingCount / entries.length : 0;
	const secondaryRatio = entries.length > 0 ? secondaryCount / entries.length : 0;

	let value: number;
	switch (aggregation) {
		case HousingReportAggregation.SHARE:
			value = ratio;
			break;
		case HousingReportAggregation.SUM:
			value = sum;
			break;
		case HousingReportAggregation.MEAN:
			value = mean;
			break;
		case HousingReportAggregation.MEDIAN:
		default:
			value = median;
			break;
	}

	return {
		key,
		label,
		value,
		ratio: aggregation === HousingReportAggregation.SHARE ? ratio : null,
		sampleCount: entries.length,
		matchingCount,
		secondaryRatio: aggregation === HousingReportAggregation.SHARE ? secondaryRatio : null,
		secondaryCount,
		sum,
		mean,
		median,
		samples,
		stats,
	};
}

function summarizeEntries(entries: ReportEntry[], definition: HousingReportDefinition, grouping: HousingGrouping): Omit<HousingReportResult, 'recordCount' | 'skippedCount'> {
	const grouped = new Map<string, { label: string; entries: ReportEntry[] }>();
	for (const entry of entries) {
		const existing = grouped.get(entry.groupKey);
		if (existing) {
			existing.entries.push(entry);
		} else {
			grouped.set(entry.groupKey, { label: entry.groupLabel, entries: [entry] });
		}
	}

	const rows: HousingReportRow[] = [];
	for (const [key, group] of grouped) {
		rows.push(buildRow(key, group.label, group.entries, definition.aggregation));
	}

	const ascending = definition.sortDirection === 'asc';
	rows.sort((left, right) => {
		if (definition.sortBy === 'matching') {
			const byMatching = right.matchingCount - left.matchingCount;
			if (byMatching !== 0) {
				return byMatching;
			}
		} else {
			const byValue = ascending ? left.value - right.value : right.value - left.value;
			if (byValue !== 0) {
				return byValue;
			}
		}
		// Ties: the row backed by more handovers is the more meaningful one.
		return right.sampleCount - left.sampleCount;
	});

	return {
		reportId: definition.id,
		grouping,
		rows,
		total: entries.length > 0 ? buildRow('__total__', '', entries, definition.aggregation) : null,
	};
}

/** Builds an entry per record, skipping the ones the extractor cannot read. */
function collectRecordEntries(
	records: HousingHandoverRecord[],
	grouping: HousingGrouping,
	extract: (record: HousingHandoverRecord) => Omit<ReportEntry, 'groupKey' | 'groupLabel'> | null
): ReportEntry[] {
	const entries: ReportEntry[] = [];
	for (const record of records) {
		const key = groupKeyOf(record, grouping);
		if (!key) {
			continue;
		}
		const extracted = extract(record);
		if (!extracted) {
			continue;
		}
		entries.push({ ...extracted, groupKey: key, groupLabel: groupLabelOf(record, grouping) ?? key });
	}
	return entries;
}

/**
 * Days a room stood empty between two tenancies.
 *
 * Only gaps that both ends of are known are counted, and only positive ones: an overlap means
 * the next contract started before the room was handed back, which is a data problem rather
 * than a vacancy.
 */
function collectVacancyEntries(records: HousingHandoverRecord[], grouping: HousingGrouping): ReportEntry[] {
	const byRoom = new Map<string, HousingHandoverRecord[]>();
	for (const record of records) {
		const roomKey = getRoomKey(record);
		if (!roomKey) {
			continue;
		}
		const existing = byRoom.get(roomKey);
		if (existing) {
			existing.push(record);
		} else {
			byRoom.set(roomKey, [record]);
		}
	}

	const entries: ReportEntry[] = [];
	for (const roomRecords of byRoom.values()) {
		const sorted = [...roomRecords].sort((left, right) => (left.rentStart?.getTime() ?? 0) - (right.rentStart?.getTime() ?? 0));
		for (let index = 0; index < sorted.length - 1; index++) {
			const previous = sorted[index];
			const next = sorted[index + 1];
			if (!previous || !next) {
				continue;
			}
			const availableFrom = previous.availableFrom ?? previous.moveOutDate;
			if (!availableFrom || !next.rentStart) {
				continue;
			}
			const vacancyDays = getDayDifference(next.rentStart, availableFrom);
			if (vacancyDays <= 0) {
				continue;
			}
			const groupKey = groupKeyOf(previous, grouping);
			if (!groupKey) {
				continue;
			}
			entries.push({
				groupKey,
				groupLabel: groupLabelOf(previous, grouping) ?? groupKey,
				sample: vacancyDays,
				matches: true,
				secondaryMatches: false,
			});
		}
	}
	return entries;
}

function collectEntries(definition: HousingReportDefinition, records: HousingHandoverRecord[], grouping: HousingGrouping): ReportEntry[] {
	switch (definition.id) {
		case HousingReportId.DEFECT_RATE:
		case HousingReportId.CONSPICUOUS_ROOMS:
			return collectRecordEntries(records, grouping, (record) =>
				record.defectFree === null ? null : { sample: null, matches: record.defectFree === false, secondaryMatches: false }
			);

		case HousingReportId.CLEANING_EFFORT:
			return collectRecordEntries(records, grouping, (record) =>
				record.cleaningHours === null ? null : { sample: record.cleaningHours, matches: record.cleaningHours > 0, secondaryMatches: false }
			);

		case HousingReportId.DEFECT_PHOTOS:
			return collectRecordEntries(records, grouping, (record) => ({
				sample: record.defectPhotoCount,
				matches: record.defectPhotoCount > 0,
				secondaryMatches: false,
			}));

		case HousingReportId.RENTAL_DURATION:
			return collectRecordEntries(records, grouping, (record) => {
				const durationDays = getActualRentalDurationDays(record);
				if (durationDays === null) {
					return null;
				}
				return { sample: durationDays, matches: durationDays < SHORT_TERM_RENTAL_DAYS, secondaryMatches: false };
			});

		case HousingReportId.EARLY_MOVE_OUTS:
			return collectRecordEntries(records, grouping, (record) => {
				const earlyDays = getEarlyMoveOutDays(record);
				const durationDays = getActualRentalDurationDays(record);
				if (earlyDays === null || durationDays === null) {
					return null;
				}
				const leftEarly = earlyDays > 0;
				return {
					// Only early move-outs carry a sample, so the boxplot describes how far ahead
					// people leave - not a distribution diluted by everyone who stayed.
					sample: leftEarly ? earlyDays : null,
					matches: leftEarly,
					secondaryMatches: durationDays < SHORT_TERM_RENTAL_DAYS,
				};
			});

		case HousingReportId.VACANCY_DAYS:
			return collectVacancyEntries(records, grouping);

		default:
			return [];
	}
}

/** Runs one report over already filtered records. */
export function buildHousingReport(definition: HousingReportDefinition, records: HousingHandoverRecord[], grouping: HousingGrouping): HousingReportResult {
	const entries = collectEntries(definition, records, grouping);
	const summary = summarizeEntries(entries, definition, grouping);
	const usableRecords = definition.id === HousingReportId.VACANCY_DAYS ? records.length : entries.length;
	return {
		...summary,
		recordCount: records.length,
		skippedCount: Math.max(0, records.length - usableRecords),
	};
}
