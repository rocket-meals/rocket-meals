/**
 * Loads the handover protocols the housing analytics screens report on.
 *
 * One request per screen visit, no caching: the reports are a management tool opened now and
 * then, and a stale number is worse than a second of loading. Everything else - filtering by
 * period, building or room - happens in memory, so changing a filter never hits the server.
 */

import { DatabaseTypes } from 'repo-depkit-common';
import { CollectionHelper } from '@/helper/collectionHelper';
import { HOUSING_HANDOVER_FORM_INTERNAL_CUSTOM_ID, toHousingHandoverRecords, type HousingHandoverRecord, type HousingHandoverSubmission } from './HousingHandoverRecords';

/**
 * Only the columns the records need. Asking for `*` would pull signatures, addresses, bank
 * details and phone numbers of every former tenant into the app for a statistic that does not
 * use a single one of them.
 */
const HANDOVER_SUBMISSION_FIELDS = [
	'id',
	'state',
	'date_submitted',
	'form_answers.value_string',
	'form_answers.value_number',
	'form_answers.value_boolean',
	'form_answers.value_date',
	'form_answers.value_files.id',
	'form_answers.form_field.internal_custom_id',
	'form_answers.form_field.alias',
];

export async function loadHousingHandoverRecords(): Promise<HousingHandoverRecord[]> {
	const formSubmissionsHelper = new CollectionHelper<DatabaseTypes.FormSubmissions>('form_submissions');
	const submissions = await formSubmissionsHelper.readItems({
		fields: HANDOVER_SUBMISSION_FIELDS,
		filter: { form: { internal_custom_id: { _eq: HOUSING_HANDOVER_FORM_INTERNAL_CUSTOM_ID } } },
		sort: ['date_submitted'],
		limit: -1,
	});

	return toHousingHandoverRecords(submissions as unknown as HousingHandoverSubmission[]);
}
