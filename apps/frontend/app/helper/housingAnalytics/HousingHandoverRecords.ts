/**
 * Turns the "Übergabeprotokoll" form submissions into one flat record per handover.
 *
 * `form_answers` is a key/value table: every answer points at a `form_field` and stores its
 * value in one of the `value_*` columns. Aggregating over that shape directly is painful, so
 * every screen under `app/(app)/housing-analytics` works on {@link HousingHandoverRecord}s
 * instead and never sees a form answer.
 *
 * Fields are matched by `form_fields.internal_custom_id` first and fall back to the German
 * alias, because the reference form ships with `internal_custom_id: null` on every field today
 * (see `helpers/form/customers/hannover/reference_form/forms_export.json`). Filling the ids in
 * makes the mapping stable against renames and translations without touching this file.
 */

import { StringHelper } from 'repo-depkit-common';

/** `forms.internal_custom_id` of the Hannover handover protocol (FormHousingContractsWorkflowHannover.FORM_INTERNAL_ID). */
export const HOUSING_HANDOVER_FORM_INTERNAL_CUSTOM_ID = 'housing-contract-sync-hannover';

/** The answers the analytics screens read out of a handover protocol. */
export const HousingHandoverField = {
	TENANT_NUMBER: 'tenant_number',
	HANDOVER_IN_PERSON: 'handover_in_person',
	DEFECT_FREE: 'defect_free',
	CLEANING_EFFORT: 'cleaning_effort',
	OTHER_DEFECTS: 'other_defects',
	OBJECT_NUMBER: 'object_number',
	RENT_START: 'rent_start',
	RENT_END: 'rent_end',
	MOVE_OUT_DATE: 'move_out_date',
	AVAILABLE_FROM: 'available_from',
	BUILDING_NUMBER: 'building_number',
	BUILDING_NAME: 'building_name',
	ROOM_NUMBER: 'room_number',
	DEFECT_PHOTOS: 'defect_photos',
} as const;

export type HousingHandoverField = (typeof HousingHandoverField)[keyof typeof HousingHandoverField];

/**
 * Prefix for the `form_fields.internal_custom_id` values this helper looks for, e.g.
 * `housing_handover.defect_free`. Nothing carries these ids yet - they are the target state.
 */
export const HOUSING_HANDOVER_FIELD_ID_PREFIX = 'housing_handover.';

/** Aliases of the reference form, used until the fields carry an `internal_custom_id`. */
const FIELD_ALIASES: Record<HousingHandoverField, string[]> = {
	[HousingHandoverField.TENANT_NUMBER]: ['Mieter: Nummer'],
	[HousingHandoverField.HANDOVER_IN_PERSON]: ['Übergabe persönlich?'],
	[HousingHandoverField.DEFECT_FREE]: ['Mängelfrei?'],
	[HousingHandoverField.CLEANING_EFFORT]: ['Mängel: Reinigung'],
	[HousingHandoverField.OTHER_DEFECTS]: ['Mängel: Sonstige'],
	[HousingHandoverField.OBJECT_NUMBER]: ['VONUMMER'],
	[HousingHandoverField.RENT_START]: ['Mietbeginn'],
	[HousingHandoverField.RENT_END]: ['Mietende'],
	[HousingHandoverField.MOVE_OUT_DATE]: ['Auszugsdatum'],
	[HousingHandoverField.AVAILABLE_FROM]: ['Verfügbar Ab -1 (Auszugsdatum)', 'Verfügbar Ab'],
	[HousingHandoverField.BUILDING_NUMBER]: ['Wohnheimnummer'],
	[HousingHandoverField.BUILDING_NAME]: ['Wohnheim'],
	[HousingHandoverField.ROOM_NUMBER]: ['Zimmer / Whg-Nummer'],
	[HousingHandoverField.DEFECT_PHOTOS]: ['Mängel: Fotos'],
};

/** Shape of a form answer as loaded by {@link HousingAnalyticsLoader}; only the parts read here. */
export type HousingHandoverAnswer = {
	form_field?: { internal_custom_id?: string | null; alias?: string | null } | string | null;
	value_string?: string | null;
	value_number?: number | null;
	value_boolean?: boolean | null;
	value_date?: string | null;
	value_files?: unknown[] | null;
};

export type HousingHandoverSubmission = {
	id?: string | null;
	alias?: string | null;
	state?: string | null;
	date_submitted?: string | null;
	form_answers?: HousingHandoverAnswer[] | null;
};

/** One handover protocol, flattened. */
export type HousingHandoverRecord = {
	submissionId: string;
	state: string | null;
	dateSubmitted: Date | null;
	tenantNumber: string | null;
	buildingNumber: string | null;
	buildingName: string | null;
	roomNumber: string | null;
	/** VONUMMER, e.g. `420-01-05-51-6` - the rental object this handover belongs to. */
	objectNumber: string | null;
	handoverInPerson: boolean | null;
	defectFree: boolean | null;
	/** Cleaning effort in hours, `null` when the answer is missing or not parseable. */
	cleaningHours: number | null;
	otherDefects: string | null;
	defectPhotoCount: number;
	rentStart: Date | null;
	rentEnd: Date | null;
	moveOutDate: Date | null;
	availableFrom: Date | null;
};

const ALIAS_TO_FIELD: Map<string, HousingHandoverField> = buildAliasLookup();

function buildAliasLookup(): Map<string, HousingHandoverField> {
	const lookup = new Map<string, HousingHandoverField>();
	for (const field of Object.values(HousingHandoverField)) {
		for (const alias of FIELD_ALIASES[field]) {
			lookup.set(normalizeAlias(alias), field);
		}
	}
	return lookup;
}

/** Lower-cases and collapses whitespace so "Mängel:  Reinigung" still matches "Mängel: Reinigung". */
export function normalizeAlias(alias: string): string {
	const collapsed = StringHelper.replaceAllWithOptions({
		str: alias.trim(),
		find: '\\s+',
		replace: ' ',
		flags: 'g',
	});
	return collapsed.toLowerCase();
}

/** Resolves which handover field an answer belongs to, or `null` when it is not one we read. */
export function resolveHousingHandoverField(answer: HousingHandoverAnswer): HousingHandoverField | null {
	const formField = answer.form_field;
	if (!formField || typeof formField === 'string') {
		return null;
	}

	const internalCustomId = formField.internal_custom_id;
	if (internalCustomId) {
		const withoutPrefix = internalCustomId.startsWith(HOUSING_HANDOVER_FIELD_ID_PREFIX)
			? internalCustomId.slice(HOUSING_HANDOVER_FIELD_ID_PREFIX.length)
			: internalCustomId;
		const known = Object.values(HousingHandoverField).find((field) => field === withoutPrefix);
		if (known) {
			return known;
		}
	}

	const alias = formField.alias;
	if (alias) {
		return ALIAS_TO_FIELD.get(normalizeAlias(alias)) ?? null;
	}
	return null;
}

/**
 * Reads the cleaning effort as a number of hours.
 *
 * The field is a dropdown of German texts today ("keine", "0.5 Stunden", ... "4 Stunden") stored
 * in `value_string`, but it may well be a real number field tomorrow - so `value_number` wins when
 * it is set and the string is only parsed as a fallback. Both `0.5` and `0,5` are accepted.
 */
export function parseCleaningHours(answer: HousingHandoverAnswer): number | null {
	if (typeof answer.value_number === 'number' && Number.isFinite(answer.value_number)) {
		return answer.value_number;
	}

	const raw = answer.value_string;
	if (raw === null || raw === undefined) {
		return null;
	}

	const normalized = raw.trim().toLowerCase();
	if (normalized.length === 0) {
		return null;
	}
	// "keine" / "kein" is an explicit zero, not a missing answer.
	if (normalized.startsWith('kein')) {
		return 0;
	}

	const match = /\d+(?:[.,]\d+)?/.exec(normalized);
	if (!match) {
		return null;
	}
	const withDot = StringHelper.replaceAllLiteralWithOptions({ str: match[0], find: ',', replace: '.' });
	const parsed = Number.parseFloat(withDot);
	return Number.isFinite(parsed) ? parsed : null;
}

/**
 * Parses a stored date into a local midnight `Date`.
 *
 * The importer writes ISO strings into `value_date`. Cutting the string down to its date part
 * and building the `Date` from the parts keeps the day stable no matter which timezone the
 * browser runs in - `new Date('2025-02-28T00:00:00Z')` is already the 27th west of Greenwich.
 */
export function parseHandoverDate(value: string | null | undefined): Date | null {
	if (!value) {
		return null;
	}
	const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(value.trim());
	if (!match) {
		return null;
	}
	const year = Number.parseInt(match[1] ?? '', 10);
	const month = Number.parseInt(match[2] ?? '', 10);
	const day = Number.parseInt(match[3] ?? '', 10);
	if (!Number.isFinite(year) || !Number.isFinite(month) || !Number.isFinite(day)) {
		return null;
	}
	const date = new Date(year, month - 1, day);
	return Number.isNaN(date.getTime()) ? null : date;
}

function readString(answer: HousingHandoverAnswer): string | null {
	const value = answer.value_string;
	if (value === null || value === undefined) {
		return null;
	}
	const trimmed = value.trim();
	return trimmed.length > 0 ? trimmed : null;
}

function applyAnswer(record: HousingHandoverRecord, field: HousingHandoverField, answer: HousingHandoverAnswer): void {
	switch (field) {
		case HousingHandoverField.TENANT_NUMBER:
			record.tenantNumber = readString(answer);
			break;
		case HousingHandoverField.BUILDING_NUMBER:
			record.buildingNumber = readString(answer);
			break;
		case HousingHandoverField.BUILDING_NAME:
			record.buildingName = readString(answer);
			break;
		case HousingHandoverField.ROOM_NUMBER:
			record.roomNumber = readString(answer);
			break;
		case HousingHandoverField.OBJECT_NUMBER:
			record.objectNumber = readString(answer);
			break;
		case HousingHandoverField.OTHER_DEFECTS:
			record.otherDefects = readString(answer);
			break;
		case HousingHandoverField.HANDOVER_IN_PERSON:
			record.handoverInPerson = answer.value_boolean ?? null;
			break;
		case HousingHandoverField.DEFECT_FREE:
			record.defectFree = answer.value_boolean ?? null;
			break;
		case HousingHandoverField.CLEANING_EFFORT:
			record.cleaningHours = parseCleaningHours(answer);
			break;
		case HousingHandoverField.DEFECT_PHOTOS:
			record.defectPhotoCount = answer.value_files?.length ?? 0;
			break;
		case HousingHandoverField.RENT_START:
			record.rentStart = parseHandoverDate(answer.value_date);
			break;
		case HousingHandoverField.RENT_END:
			record.rentEnd = parseHandoverDate(answer.value_date);
			break;
		case HousingHandoverField.MOVE_OUT_DATE:
			record.moveOutDate = parseHandoverDate(answer.value_date);
			break;
		case HousingHandoverField.AVAILABLE_FROM:
			record.availableFrom = parseHandoverDate(answer.value_date);
			break;
	}
}

function createEmptyRecord(submission: HousingHandoverSubmission): HousingHandoverRecord {
	return {
		submissionId: submission.id ?? '',
		state: submission.state ?? null,
		dateSubmitted: parseHandoverDate(submission.date_submitted),
		tenantNumber: null,
		buildingNumber: null,
		buildingName: null,
		roomNumber: null,
		objectNumber: null,
		handoverInPerson: null,
		defectFree: null,
		cleaningHours: null,
		otherDefects: null,
		defectPhotoCount: 0,
		rentStart: null,
		rentEnd: null,
		moveOutDate: null,
		availableFrom: null,
	};
}

/** Flattens one submission and its answers into a record. */
export function toHousingHandoverRecord(submission: HousingHandoverSubmission): HousingHandoverRecord {
	const record = createEmptyRecord(submission);
	for (const answer of submission.form_answers ?? []) {
		const field = resolveHousingHandoverField(answer);
		if (field) {
			applyAnswer(record, field, answer);
		}
	}
	return record;
}

export function toHousingHandoverRecords(submissions: HousingHandoverSubmission[]): HousingHandoverRecord[] {
	return submissions.map(toHousingHandoverRecord);
}

/** The date a handover is filed under: when the tenant moved out, or when the protocol was submitted. */
export function getHandoverReferenceDate(record: HousingHandoverRecord): Date | null {
	return record.moveOutDate ?? record.dateSubmitted;
}

/** Groups everything about one rental object under a stable key, VONUMMER when it is known. */
export function getRoomKey(record: HousingHandoverRecord): string | null {
	if (record.objectNumber) {
		return record.objectNumber;
	}
	if (record.buildingNumber && record.roomNumber) {
		return `${record.buildingNumber}-${record.roomNumber}`;
	}
	return record.roomNumber;
}

export function getRoomLabel(record: HousingHandoverRecord): string | null {
	const room = record.roomNumber ?? record.objectNumber;
	if (!room) {
		return null;
	}
	const building = record.buildingName ?? record.buildingNumber;
	return building ? `${building} · ${room}` : room;
}

export function getBuildingKey(record: HousingHandoverRecord): string | null {
	return record.buildingNumber ?? record.buildingName;
}

export function getBuildingLabel(record: HousingHandoverRecord): string | null {
	if (record.buildingNumber && record.buildingName) {
		return `${record.buildingNumber} ${record.buildingName}`;
	}
	return record.buildingName ?? record.buildingNumber;
}

const MILLISECONDS_PER_DAY = 24 * 60 * 60 * 1000;

/** Whole days between two local-midnight dates. */
export function getDayDifference(later: Date, earlier: Date): number {
	return Math.round((later.getTime() - earlier.getTime()) / MILLISECONDS_PER_DAY);
}

/** How long the tenant actually stayed: move-out (or contract end) minus contract start, in days. */
export function getActualRentalDurationDays(record: HousingHandoverRecord): number | null {
	const end = record.moveOutDate ?? record.rentEnd;
	if (!record.rentStart || !end) {
		return null;
	}
	const days = getDayDifference(end, record.rentStart);
	return days >= 0 ? days : null;
}

/** How long the contract was meant to run, in days. */
export function getPlannedRentalDurationDays(record: HousingHandoverRecord): number | null {
	if (!record.rentStart || !record.rentEnd) {
		return null;
	}
	const days = getDayDifference(record.rentEnd, record.rentStart);
	return days >= 0 ? days : null;
}

/**
 * Days the tenant left before the contract ended, `null` when that cannot be told.
 *
 * A tenant leaving early is the stronger signal than a short contract: a short contract is often
 * just an exchange semester, while leaving early means taking a loss to get out.
 */
export function getEarlyMoveOutDays(record: HousingHandoverRecord): number | null {
	if (!record.moveOutDate || !record.rentEnd) {
		return null;
	}
	return getDayDifference(record.rentEnd, record.moveOutDate);
}
