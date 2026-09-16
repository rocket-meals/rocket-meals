/**
 * Turns a report result into a CSV file for Excel.
 *
 * Semicolon-separated with comma decimals and a UTF-8 BOM: that is what a German Excel opens
 * without an import dialog, and it matches the TL1 exports the handover data comes from.
 *
 * Pure, like the reports themselves - the column headings come in already translated.
 */

import { NumberHelper } from 'repo-depkit-common';
import {
	HousingReportAggregation,
	HousingReportId,
	HousingReportUnit,
	type HousingReportDefinition,
	type HousingReportResult,
	type HousingReportRow,
} from './HousingAnalyticsReports';

const SEPARATOR = ';';
const UTF8_BOM = '﻿';

export type HousingReportCsvLabels = {
	group: string;
	handovers: string;
	matching: string;
	share: string;
	value: string;
	sum: string;
	average: string;
	median: string;
	minimum: string;
	maximum: string;
	costs: string;
	shortTermShare: string;
	overall: string;
};

export type HousingReportCsvOptions = {
	definition: HousingReportDefinition;
	result: HousingReportResult;
	labels: HousingReportCsvLabels;
	/** Only used by the cleaning report, to turn hours into money. */
	hourlyRate: number;
};

/** Quotes a field only when it needs it, so the file stays readable in a text editor. */
export function escapeCsvField(value: string): string {
	if (value.includes(SEPARATOR) || value.includes('"') || value.includes('\n') || value.includes('\r')) {
		return `"${value.split('"').join('""')}"`;
	}
	return value;
}

function formatCsvNumber(value: number, decimals: number): string {
	return NumberHelper.formatNumber(value, null, true, ',', null, decimals);
}

function decimalsFor(unit: HousingReportUnit): number {
	switch (unit) {
		case HousingReportUnit.DAYS:
			return 0;
		case HousingReportUnit.SHARE:
		case HousingReportUnit.HOURS:
		case HousingReportUnit.COUNT:
		default:
			return 1;
	}
}

/** Which columns a report fills - a share report has no sum worth printing, and vice versa. */
function buildColumns(options: HousingReportCsvOptions): { header: string; cell: (row: HousingReportRow) => string }[] {
	const { definition, labels, hourlyRate } = options;
	const decimals = decimalsFor(definition.unit);
	const isShare = definition.unit === HousingReportUnit.SHARE;

	const columns: { header: string; cell: (row: HousingReportRow) => string }[] = [
		{ header: labels.group, cell: (row) => row.label },
		{ header: labels.handovers, cell: (row) => String(row.sampleCount) },
	];

	if (isShare) {
		columns.push(
			{ header: labels.matching, cell: (row) => String(row.matchingCount) },
			{ header: labels.share, cell: (row) => formatCsvNumber((row.ratio ?? 0) * 100, 1) }
		);
	} else {
		columns.push({ header: labels.value, cell: (row) => formatCsvNumber(row.value, decimals) });
	}

	if (definition.id === HousingReportId.CLEANING_EFFORT) {
		columns.push({ header: labels.costs, cell: (row) => formatCsvNumber(row.sum * hourlyRate, 2) });
	}

	if (definition.hasSecondaryShare) {
		columns.push({ header: labels.shortTermShare, cell: (row) => formatCsvNumber((row.secondaryRatio ?? 0) * 100, 1) });
	}

	// The spread only says something where the rows carry samples at all.
	if (definition.showsDistribution) {
		if (definition.aggregation !== HousingReportAggregation.SUM) {
			columns.push({ header: labels.sum, cell: (row) => formatCsvNumber(row.sum, decimals) });
		}
		columns.push(
			{ header: labels.average, cell: (row) => formatCsvNumber(row.mean, decimals) },
			{ header: labels.median, cell: (row) => formatCsvNumber(row.median, decimals) },
			{ header: labels.minimum, cell: (row) => (row.stats ? formatCsvNumber(row.stats.min, decimals) : '') },
			{ header: labels.maximum, cell: (row) => (row.stats ? formatCsvNumber(row.stats.max, decimals) : '') }
		);
	}

	return columns;
}

export function buildHousingReportCsv(options: HousingReportCsvOptions): string {
	const columns = buildColumns(options);
	const lines: string[] = [columns.map((column) => escapeCsvField(column.header)).join(SEPARATOR)];

	for (const row of options.result.rows) {
		lines.push(columns.map((column) => escapeCsvField(column.cell(row))).join(SEPARATOR));
	}

	// The total goes last, where a reader expects it, and labelled rather than left unnamed.
	if (options.result.total) {
		const total = { ...options.result.total, label: options.labels.overall };
		lines.push(columns.map((column) => escapeCsvField(column.cell(total))).join(SEPARATOR));
	}

	return UTF8_BOM + lines.join('\r\n') + '\r\n';
}

/** e.g. `housing-analytics-defect-rate-2026-08-30.csv` - stable, sortable, no umlauts to mangle. */
export function buildHousingReportCsvFileName(reportId: string, date: Date = new Date()): string {
	const year = date.getFullYear();
	const month = String(date.getMonth() + 1).padStart(2, '0');
	const day = String(date.getDate()).padStart(2, '0');
	return `housing-analytics-${reportId}-${year}-${month}-${day}.csv`;
}
