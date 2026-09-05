/**
 * CommonTranslationKeys.ts – the translation keys every app in this monorepo shares.
 *
 * Generic UI vocabulary ("Save", "Cancel", weekday names, ...) lives here exactly once so a
 * new app starts with a fully translated base instead of copying strings around. The
 * matching texts are in `commonTranslations.ts`, in every language of
 * {@link ALL_TRANSLATION_LANGUAGES}.
 *
 * ## Extending this in an app
 *
 * TypeScript `enum`s cannot inherit from each other, so the keys are a frozen const object
 * plus a same-named type. An app "extends" them by spreading:
 *
 * ```ts
 * export const TranslationKeys = {
 * 	...CommonTranslationKeys,
 * 	my_app_specific_key: 'my_app_specific_key',
 * } as const;
 * export type TranslationKeys = (typeof TranslationKeys)[keyof typeof TranslationKeys];
 * ```
 *
 * Declaring the value and the type under one name keeps `TranslationKeys.save` and
 * `key: TranslationKeys` working exactly like the enum they replaced.
 *
 * Never add an app-specific key here – only vocabulary that genuinely makes sense in a
 * second, unrelated app.
 */

export const CommonTranslationKeys = {
	// Generic actions
	save: 'save',
	cancel: 'cancel',
	delete: 'delete',
	create: 'create',
	edit: 'edit',
	confirm: 'confirm',
	submit: 'submit',
	send: 'send',
	reset: 'reset',
	clear: 'clear',
	select: 'select',
	deselect: 'deselect',
	copy: 'copy',
	copied: 'copied',
	upload: 'upload',
	upload_file: 'upload_file',
	upload_image: 'upload_image',
	done: 'done',
	continue: 'continue',
	proceed: 'proceed',
	previous: 'previous',
	search: 'search',
	search_here: 'search_here',
	type_here: 'type_here',
	show: 'show',
	hide: 'hide',
	sort: 'sort',
	filter: 'filter',
	import: 'import',
	okay: 'okay',
	yes: 'yes',
	no: 'no',

	// Generic states and feedback
	loading: 'loading',
	is_loading: 'is_loading',
	success: 'success',
	error: 'error',
	warning: 'warning',
	attention: 'attention',
	information: 'information',
	description: 'description',
	unknown: 'unknown',
	no_value: 'no_value',
	no_data_found: 'no_data_found',
	nothing_found: 'nothing_found',
	somethingWentWrong: 'somethingWentWrong',
	optional: 'optional',
	general: 'general',
	new: 'new',
	active: 'active',
	inactive: 'inactive',
	current: 'current',
	archived: 'archived',
	draft: 'draft',
	submitted: 'submitted',
	closed: 'closed',
	syncing: 'syncing',
	selected: 'selected',

	// Generic labels
	title: 'title',
	color: 'color',
	image: 'image',
	camera: 'camera',
	gallery: 'gallery',
	language: 'language',
	settings: 'settings',
	home: 'home',
	map: 'map',
	location: 'location',
	coordinates: 'coordinates',
	distance: 'distance',
	email: 'email',
	phone_number: 'phone_number',
	password: 'password',
	profile: 'profile',
	nickname: 'nickname',
	account: 'account',
	logout: 'logout',
	sign_in: 'sign_in',
	register: 'register',
	support: 'support',
	feedback: 'feedback',
	category: 'category',
	event: 'event',
	price: 'price',
	notification: 'notification',
	updates: 'updates',
	update_available: 'update_available',
	no_updates_available: 'no_updates_available',

	// Measurement units, used e.g. for a price that refers to an amount ("0,40 €/100 g")
	unit_gram: 'unit_gram',
	unit_kilogram: 'unit_kilogram',
	unit_milliliter: 'unit_milliliter',
	unit_liter: 'unit_liter',

	// Legal and app information
	license: 'license',
	license_information: 'license_information',
	accessibility: 'accessibility',
	cookie_policy: 'cookie_policy',
	privacy_policy: 'privacy_policy',
	general_terms_and_conditions: 'general_terms_and_conditions',
	about_us: 'about_us',

	// Dates and times
	date: 'date',
	day: 'day',
	week: 'week',
	month: 'month',
	year: 'year',
	weekday: 'weekday',
	today: 'today',
	tomorrow: 'tomorrow',
	yesterday: 'yesterday',
	until: 'until',
	startTime: 'startTime',
	endTime: 'endTime',
	date_created: 'date_created',
	date_updated: 'date_updated',

	// Weekdays (short)
	Mon_S: 'Mon_S',
	Tue_S: 'Tue_S',
	Wed_S: 'Wed_S',
	Thu_S: 'Thu_S',
	Fri_S: 'Fri_S',
	Sat_S: 'Sat_S',
	Sun_S: 'Sun_S',

	// Weekdays
	Mon: 'Mon',
	Tue: 'Tue',
	Wed: 'Wed',
	Thu: 'Thu',
	Fri: 'Fri',
	Sat: 'Sat',
	Sun: 'Sun',

	// Months
	January: 'January',
	February: 'February',
	March: 'March',
	April: 'April',
	May: 'May',
	June: 'June',
	July: 'July',
	August: 'August',
	September: 'September',
	October: 'October',
	November: 'November',
	December: 'December',

	// Months (short)
	Jan: 'Jan',
	Feb: 'Feb',
	Mar: 'Mar',
	Apr: 'Apr',
	MayShort: 'MayShort',
	Jun: 'Jun',
	Jul: 'Jul',
	Aug: 'Aug',
	Sep: 'Sep',
	Oct: 'Oct',
	Nov: 'Nov',
	Dec: 'Dec',
} as const;

export type CommonTranslationKeys = (typeof CommonTranslationKeys)[keyof typeof CommonTranslationKeys];

/** All shared keys as a plain array – handy for validation and for iterating in tests. */
export const ALL_COMMON_TRANSLATION_KEYS: readonly CommonTranslationKeys[] =
	Object.values(CommonTranslationKeys);
