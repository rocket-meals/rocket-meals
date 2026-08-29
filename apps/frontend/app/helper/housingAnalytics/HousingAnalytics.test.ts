import {
	getActualRentalDurationDays,
	getEarlyMoveOutDays,
	parseCleaningHours,
	toHousingHandoverRecords,
	type HousingHandoverAnswer,
	type HousingHandoverRecord,
	type HousingHandoverSubmission,
} from './HousingHandoverRecords';
import {
	buildHousingReport,
	filterHousingHandoverRecords,
	findHousingReportDefinition,
	getPeriodRange,
	HousingAnalyticsPeriod,
	HousingGrouping,
	HousingReportId,
	type HousingReportDefinition,
} from './HousingAnalyticsReports';

function answer(alias: string, value: Partial<HousingHandoverAnswer>): HousingHandoverAnswer {
	return { form_field: { alias, internal_custom_id: null }, ...value };
}

type HandoverInput = {
	id: string;
	building?: string;
	buildingName?: string;
	room?: string;
	objectNumber?: string;
	defectFree?: boolean;
	cleaning?: string | number;
	photos?: number;
	rentStart?: string;
	rentEnd?: string;
	moveOut?: string;
	availableFrom?: string;
};

/** Builds a submission the way the Hannover form ships it today: matched by alias, dates as ISO strings. */
function submission(input: HandoverInput): HousingHandoverSubmission {
	const answers: HousingHandoverAnswer[] = [];
	if (input.building !== undefined) answers.push(answer('Wohnheimnummer', { value_string: input.building }));
	if (input.buildingName !== undefined) answers.push(answer('Wohnheim', { value_string: input.buildingName }));
	if (input.room !== undefined) answers.push(answer('Zimmer / Whg-Nummer', { value_string: input.room }));
	if (input.objectNumber !== undefined) answers.push(answer('VONUMMER', { value_string: input.objectNumber }));
	if (input.defectFree !== undefined) answers.push(answer('Mängelfrei?', { value_boolean: input.defectFree }));
	if (typeof input.cleaning === 'string') answers.push(answer('Mängel: Reinigung', { value_string: input.cleaning }));
	if (typeof input.cleaning === 'number') answers.push(answer('Mängel: Reinigung', { value_number: input.cleaning }));
	if (input.photos !== undefined) answers.push(answer('Mängel: Fotos', { value_files: new Array(input.photos).fill({ id: 'file' }) }));
	if (input.rentStart !== undefined) answers.push(answer('Mietbeginn', { value_date: input.rentStart }));
	if (input.rentEnd !== undefined) answers.push(answer('Mietende', { value_date: input.rentEnd }));
	if (input.moveOut !== undefined) answers.push(answer('Auszugsdatum', { value_date: input.moveOut }));
	if (input.availableFrom !== undefined) answers.push(answer('Verfügbar Ab -1 (Auszugsdatum)', { value_date: input.availableFrom }));
	return { id: input.id, state: 'closed', date_submitted: input.moveOut ?? null, form_answers: answers };
}

function records(inputs: HandoverInput[]): HousingHandoverRecord[] {
	return toHousingHandoverRecords(inputs.map(submission));
}

function definitionOf(reportId: string): HousingReportDefinition {
	const definition = findHousingReportDefinition(reportId);
	if (!definition) {
		throw new Error(`Unknown report: ${reportId}`);
	}
	return definition;
}

describe('parseCleaningHours', () => {
	it('reads a real number field', () => {
		expect(parseCleaningHours({ value_number: 2.5 })).toBe(2.5);
	});

	it('reads the dropdown texts the form uses today', () => {
		expect(parseCleaningHours({ value_string: 'keine' })).toBe(0);
		expect(parseCleaningHours({ value_string: '0.5 Stunden' })).toBe(0.5);
		expect(parseCleaningHours({ value_string: '1 Stunde' })).toBe(1);
		expect(parseCleaningHours({ value_string: '4 Stunden' })).toBe(4);
	});

	it('accepts a comma as the decimal separator', () => {
		expect(parseCleaningHours({ value_string: '2,5 Stunden' })).toBe(2.5);
	});

	it('prefers the number field over the text', () => {
		expect(parseCleaningHours({ value_number: 3, value_string: '1 Stunde' })).toBe(3);
	});

	it('returns null when nothing is filled in', () => {
		expect(parseCleaningHours({})).toBeNull();
		expect(parseCleaningHours({ value_string: '   ' })).toBeNull();
		expect(parseCleaningHours({ value_string: 'unbekannt' })).toBeNull();
	});
});

describe('toHousingHandoverRecords', () => {
	it('maps the answers of a submission onto one record', () => {
		const [record] = records([
			{
				id: 'a',
				building: '370',
				buildingName: 'Bischofsholer Damm',
				room: '40-1',
				objectNumber: '370-01-01-32-4',
				defectFree: false,
				cleaning: '1.5 Stunden',
				photos: 3,
				rentStart: '2024-03-01',
				rentEnd: '2025-04-30',
				moveOut: '2025-02-15',
			},
		]);

		expect(record?.buildingNumber).toBe('370');
		expect(record?.buildingName).toBe('Bischofsholer Damm');
		expect(record?.objectNumber).toBe('370-01-01-32-4');
		expect(record?.defectFree).toBe(false);
		expect(record?.cleaningHours).toBe(1.5);
		expect(record?.defectPhotoCount).toBe(3);
		expect(record?.rentStart?.getFullYear()).toBe(2024);
		expect(record?.moveOutDate?.getMonth()).toBe(1);
	});

	it('matches a field by its internal_custom_id, whatever the alias says', () => {
		const [record] = toHousingHandoverRecords([
			{
				id: 'a',
				form_answers: [{ form_field: { internal_custom_id: 'housing_handover.defect_free', alias: 'Renamed by an admin' }, value_boolean: true }],
			},
		]);

		expect(record?.defectFree).toBe(true);
	});

	it('keeps the stored day regardless of the timezone offset in the value', () => {
		const [record] = records([{ id: 'a', moveOut: '2025-02-28T00:00:00.000Z' }]);

		expect(record?.moveOutDate?.getDate()).toBe(28);
		expect(record?.moveOutDate?.getMonth()).toBe(1);
	});

	it('ignores answers of fields the reports do not read', () => {
		const [record] = toHousingHandoverRecords([
			{ id: 'a', form_answers: [{ form_field: { alias: 'Bankverbindung' }, value_string: 'DE123' }] },
		]);

		expect(record?.buildingNumber).toBeNull();
		expect(record?.cleaningHours).toBeNull();
	});
});

describe('rental duration helpers', () => {
	it('measures the stay up to the move-out, not the contract end', () => {
		const [record] = records([{ id: 'a', rentStart: '2025-01-01', rentEnd: '2025-12-31', moveOut: '2025-01-31' }]);

		expect(getActualRentalDurationDays(record!)).toBe(30);
		expect(getEarlyMoveOutDays(record!)).toBe(334);
	});

	it('falls back to the contract end when nobody filed a move-out date', () => {
		const [record] = records([{ id: 'a', rentStart: '2025-01-01', rentEnd: '2025-01-11' }]);

		expect(getActualRentalDurationDays(record!)).toBe(10);
		expect(getEarlyMoveOutDays(record!)).toBeNull();
	});
});

describe('filterHousingHandoverRecords', () => {
	const all = records([
		{ id: 'a', building: '370', buildingName: 'Bischofsholer Damm', room: '40-1', moveOut: '2025-02-15' },
		{ id: 'b', building: '380', buildingName: 'Hufelandstraße', room: '21-0', moveOut: '2023-02-15' },
	]);

	it('keeps only handovers inside the period', () => {
		const filtered = filterHousingHandoverRecords(all, {
			from: new Date(2025, 0, 1),
			to: new Date(2025, 11, 31),
			buildingQuery: '',
			roomQuery: '',
		});

		expect(filtered.map((record) => record.submissionId)).toEqual(['a']);
	});

	it('searches buildings by number and by name', () => {
		const byNumber = filterHousingHandoverRecords(all, { from: null, to: null, buildingQuery: '380', roomQuery: '' });
		const byName = filterHousingHandoverRecords(all, { from: null, to: null, buildingQuery: 'hufeland', roomQuery: '' });

		expect(byNumber.map((record) => record.submissionId)).toEqual(['b']);
		expect(byName.map((record) => record.submissionId)).toEqual(['b']);
	});

	it('searches rooms', () => {
		const filtered = filterHousingHandoverRecords(all, { from: null, to: null, buildingQuery: '', roomQuery: '40-1' });

		expect(filtered.map((record) => record.submissionId)).toEqual(['a']);
	});

	it('drops handovers without a date once a period is set', () => {
		const undated = records([{ id: 'c', building: '370' }]);

		expect(filterHousingHandoverRecords(undated, { from: new Date(2025, 0, 1), to: null, buildingQuery: '', roomQuery: '' })).toHaveLength(0);
		expect(filterHousingHandoverRecords(undated, { from: null, to: null, buildingQuery: '', roomQuery: '' })).toHaveLength(1);
	});
});

describe('getPeriodRange', () => {
	it('defaults to the twelve months before the reference date', () => {
		const range = getPeriodRange(HousingAnalyticsPeriod.LAST_12_MONTHS, new Date(2026, 7, 29));

		expect(range.from?.getFullYear()).toBe(2025);
		expect(range.from?.getMonth()).toBe(7);
		expect(range.to?.getFullYear()).toBe(2026);
	});

	it('leaves the range open for the all-time preset', () => {
		expect(getPeriodRange(HousingAnalyticsPeriod.ALL_TIME)).toEqual({ from: null, to: null });
	});
});

describe('buildHousingReport', () => {
	it('shares the defects per building and ranks the worst one first', () => {
		const report = buildHousingReport(
			definitionOf(HousingReportId.DEFECT_RATE),
			records([
				{ id: 'a', building: '370', defectFree: false },
				{ id: 'b', building: '370', defectFree: true },
				{ id: 'c', building: '380', defectFree: false },
				{ id: 'd', building: '380', defectFree: false },
			]),
			HousingGrouping.BUILDING
		);

		expect(report.rows.map((row) => row.key)).toEqual(['380', '370']);
		expect(report.rows[0]?.value).toBe(1);
		expect(report.rows[1]?.value).toBe(0.5);
		expect(report.total?.matchingCount).toBe(3);
	});

	it('skips handovers whose defect answer is missing', () => {
		const report = buildHousingReport(
			definitionOf(HousingReportId.DEFECT_RATE),
			records([
				{ id: 'a', building: '370', defectFree: false },
				{ id: 'b', building: '370' },
			]),
			HousingGrouping.BUILDING
		);

		expect(report.rows[0]?.sampleCount).toBe(1);
		expect(report.recordCount).toBe(2);
		expect(report.skippedCount).toBe(1);
	});

	it('ranks conspicuous rooms by how often defects came up, not by the share', () => {
		const report = buildHousingReport(
			definitionOf(HousingReportId.CONSPICUOUS_ROOMS),
			records([
				{ id: 'a', building: '370', room: '1', objectNumber: '370-1', defectFree: false },
				{ id: 'b', building: '370', room: '1', objectNumber: '370-1', defectFree: false },
				{ id: 'c', building: '370', room: '1', objectNumber: '370-1', defectFree: true },
				{ id: 'd', building: '370', room: '2', objectNumber: '370-2', defectFree: false },
			]),
			HousingGrouping.ROOM
		);

		// The room with 2 of 3 defects outranks the one with 1 of 1, even though its share is lower.
		expect(report.rows[0]?.key).toBe('370-1');
		expect(report.rows[0]?.matchingCount).toBe(2);
		expect(report.rows[1]?.key).toBe('370-2');
	});

	it('sums the cleaning hours and keeps the samples for the boxplot', () => {
		const report = buildHousingReport(
			definitionOf(HousingReportId.CLEANING_EFFORT),
			records([
				{ id: 'a', building: '370', cleaning: '2 Stunden' },
				{ id: 'b', building: '370', cleaning: 1 },
				{ id: 'c', building: '370', cleaning: 'keine' },
			]),
			HousingGrouping.BUILDING
		);

		expect(report.rows[0]?.value).toBe(3);
		expect(report.rows[0]?.samples).toEqual([2, 1, 0]);
		expect(report.rows[0]?.median).toBe(1);
	});

	it('reports the median tenancy duration, shortest building first', () => {
		const report = buildHousingReport(
			definitionOf(HousingReportId.RENTAL_DURATION),
			records([
				{ id: 'a', building: '370', rentStart: '2025-01-01', moveOut: '2025-01-11' },
				{ id: 'b', building: '370', rentStart: '2025-01-01', moveOut: '2025-01-21' },
				{ id: 'c', building: '380', rentStart: '2025-01-01', moveOut: '2025-07-30' },
			]),
			HousingGrouping.BUILDING
		);

		expect(report.rows[0]?.key).toBe('370');
		expect(report.rows[0]?.value).toBe(15);
	});

	it('separates leaving early from renting short-term', () => {
		const report = buildHousingReport(
			definitionOf(HousingReportId.EARLY_MOVE_OUTS),
			records([
				// Full-year contract, left after one month: early and short.
				{ id: 'a', building: '370', rentStart: '2025-01-01', rentEnd: '2025-12-31', moveOut: '2025-01-31' },
				// Short exchange-semester contract, served to the end: short but not early.
				{ id: 'b', building: '370', rentStart: '2025-01-01', rentEnd: '2025-03-31', moveOut: '2025-03-31' },
				// Full-year contract, served to the end: neither.
				{ id: 'c', building: '370', rentStart: '2025-01-01', rentEnd: '2025-12-31', moveOut: '2025-12-31' },
			]),
			HousingGrouping.BUILDING
		);

		const row = report.rows[0];
		expect(row?.matchingCount).toBe(1);
		expect(row?.ratio).toBeCloseTo(1 / 3);
		expect(row?.secondaryCount).toBe(2);
		// Only the early move-out carries a sample, so the spread describes those alone.
		expect(row?.samples).toEqual([334]);
	});

	it('counts the days a room stood empty between two tenancies', () => {
		const report = buildHousingReport(
			definitionOf(HousingReportId.VACANCY_DAYS),
			records([
				{ id: 'a', building: '370', objectNumber: '370-1', rentStart: '2024-01-01', moveOut: '2024-06-30', availableFrom: '2024-06-30' },
				{ id: 'b', building: '370', objectNumber: '370-1', rentStart: '2024-07-10', moveOut: '2025-01-31', availableFrom: '2025-01-31' },
			]),
			HousingGrouping.BUILDING
		);

		expect(report.rows[0]?.value).toBe(10);
		expect(report.rows[0]?.sampleCount).toBe(1);
	});

	it('ignores an overlap between two contracts of the same room', () => {
		const report = buildHousingReport(
			definitionOf(HousingReportId.VACANCY_DAYS),
			records([
				{ id: 'a', building: '370', objectNumber: '370-1', rentStart: '2024-01-01', moveOut: '2024-06-30', availableFrom: '2024-06-30' },
				{ id: 'b', building: '370', objectNumber: '370-1', rentStart: '2024-06-01', moveOut: '2025-01-31' },
			]),
			HousingGrouping.BUILDING
		);

		expect(report.rows).toHaveLength(0);
	});

	it('has no rows when nothing is left after filtering', () => {
		const report = buildHousingReport(definitionOf(HousingReportId.DEFECT_RATE), [], HousingGrouping.BUILDING);

		expect(report.rows).toHaveLength(0);
		expect(report.total).toBeNull();
	});
});
