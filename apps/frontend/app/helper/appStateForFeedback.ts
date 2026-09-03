/**
 * Builds the app-state snapshot that gets appended to a feedback/support report.
 *
 * The raw redux state is a full copy of the synchronised content catalogue: every canteen,
 * building, campus, news entry and food - each of them with `translations` arrays holding the
 * same text in all eight supported languages, and several of them stored twice (as a list and
 * as a dictionary). A real report from production measured ~1.1 MB, which bloats both the
 * database entry and the notification mail that support receives.
 *
 * Support does not need the translated catalogue content, it needs to know in which state the
 * app was: who was logged in, which canteen was selected, which settings were active and how
 * much data had been loaded. So the snapshot keeps the small, user specific parts verbatim and
 * replaces the bulky catalogue collections with a short placeholder that still names how many
 * entries were dropped.
 */

/** Placeholder that replaces a collection which was too big to be included. */
export type OmittedCollection = {
	__omitted: 'array' | 'object';
	/** Number of entries the original collection held. */
	length: number;
};

export type AppStateSanitizeOptions = {
	/** Arrays and dictionaries whose JSON is longer than this are replaced by a placeholder. */
	maxCollectionLength?: number;
	/**
	 * Nesting level from which on collections may be replaced. The default keeps the state root
	 * and its reducer slices (`canteenReducer`, `campus`, …) and only drops what is inside them.
	 */
	minCollapseDepth?: number;
	/** Longer strings are cut off (wiki/markdown content can be several pages long). */
	maxStringLength?: number;
	/** Hard limit for the resulting JSON; anything beyond it is cut off. */
	maxTotalLength?: number;
};

export type AppStateSanitizeSummary = {
	/** How many `translations` / `*_translations` fields were dropped. */
	removedTranslationFields: number;
	/** How many collections were replaced by a placeholder. */
	omittedCollections: number;
	/** How many strings were shortened. */
	truncatedStrings: number;
};

export const DEFAULT_MAX_COLLECTION_LENGTH = 20000;
export const DEFAULT_MIN_COLLAPSE_DEPTH = 2;
export const DEFAULT_MAX_STRING_LENGTH = 500;
export const DEFAULT_MAX_TOTAL_LENGTH = 100000;

const TRUNCATION_SUFFIX = '…[truncated]';

/**
 * True for the fields that carry the translated content of an entity, e.g. `translations` on a
 * building or `balance_translations` on the app settings.
 */
export function isTranslationField(key: string): boolean {
	return key === 'translations' || key.endsWith('_translations');
}

/** Everything that is not an array and not a plain-ish object. */
function isPrimitive(value: unknown): boolean {
	return value === null || typeof value !== 'object';
}

/**
 * A dictionary of entities (`buildingsDict`, `campusesDict`, …) - as opposed to a settings-like
 * object that mostly holds primitives and is worth keeping.
 */
function isEntityDictionary(value: Record<string, unknown>): boolean {
	const values = Object.values(value);
	if (values.length === 0) return false;
	return values.every(entry => entry !== null && typeof entry === 'object');
}

type SanitizeResult = {
	value: unknown;
	/** Approximate length of the JSON representation, used to decide what to drop. */
	size: number;
};

/**
 * Recursively sanitizes `value`, returning the cleaned value together with an estimate of its
 * serialized size so that parents can decide whether they are still small enough to keep.
 */
function sanitizeValue(value: unknown, options: Required<AppStateSanitizeOptions>, summary: AppStateSanitizeSummary, seen: Set<object>, depth: number): SanitizeResult {
	if (typeof value === 'string') {
		if (value.length > options.maxStringLength) {
			summary.truncatedStrings += 1;
			const shortened = value.slice(0, options.maxStringLength) + TRUNCATION_SUFFIX;
			return { value: shortened, size: shortened.length + 2 };
		}
		return { value, size: value.length + 2 };
	}

	// Functions are not serializable - JSON.stringify drops them, so we do the same.
	if (typeof value === 'function' || typeof value === 'symbol' || typeof value === 'undefined') {
		return { value: undefined, size: 0 };
	}

	if (isPrimitive(value)) {
		return { value, size: String(value).length };
	}

	// Redux state should be a tree, but a cyclic reference would otherwise hang the app while
	// the user is already waiting for the report to be sent.
	if (seen.has(value as object)) {
		return { value: '[circular]', size: 12 };
	}
	seen.add(value as object);
	try {
		if (Array.isArray(value)) {
			return sanitizeArray(value, options, summary, seen, depth);
		}
		return sanitizeObject(value as Record<string, unknown>, options, summary, seen, depth);
	} finally {
		seen.delete(value as object);
	}
}

function omitCollection(kind: OmittedCollection['__omitted'], length: number, summary: AppStateSanitizeSummary): SanitizeResult {
	summary.omittedCollections += 1;
	const placeholder: OmittedCollection = { __omitted: kind, length };
	return { value: placeholder, size: 40 };
}

function sanitizeArray(value: unknown[], options: Required<AppStateSanitizeOptions>, summary: AppStateSanitizeSummary, seen: Set<object>, depth: number): SanitizeResult {
	const mayBeOmitted = depth >= options.minCollapseDepth;
	const items: unknown[] = [];
	let size = 2;
	for (const entry of value) {
		const sanitized = sanitizeValue(entry, options, summary, seen, depth + 1);
		items.push(sanitized.value === undefined ? null : sanitized.value);
		size += sanitized.size + 1;
		if (mayBeOmitted && size > options.maxCollectionLength) {
			// No need to keep sanitizing entries of a collection that gets dropped anyway.
			return omitCollection('array', value.length, summary);
		}
	}
	return { value: items, size };
}

function sanitizeObject(value: Record<string, unknown>, options: Required<AppStateSanitizeOptions>, summary: AppStateSanitizeSummary, seen: Set<object>, depth: number): SanitizeResult {
	// The state root and its reducer slices are what makes the snapshot readable - only the
	// collections inside them may be dropped.
	const mayBeOmitted = depth >= options.minCollapseDepth && isEntityDictionary(value);
	const result: Record<string, unknown> = {};
	let size = 2;
	for (const [key, entry] of Object.entries(value)) {
		if (isTranslationField(key)) {
			summary.removedTranslationFields += 1;
			continue;
		}
		const sanitized = sanitizeValue(entry, options, summary, seen, depth + 1);
		if (sanitized.value === undefined) continue;
		result[key] = sanitized.value;
		size += key.length + 4 + sanitized.size;
		if (mayBeOmitted && size > options.maxCollectionLength) {
			return omitCollection('object', Object.keys(value).length, summary);
		}
	}
	return { value: result, size };
}

/**
 * Removes the translation catalogue and the bulky collections from a redux state snapshot.
 */
export function sanitizeAppStateForFeedback(state: unknown, options?: AppStateSanitizeOptions): { state: unknown; summary: AppStateSanitizeSummary } {
	const resolvedOptions: Required<AppStateSanitizeOptions> = {
		maxCollectionLength: options?.maxCollectionLength ?? DEFAULT_MAX_COLLECTION_LENGTH,
		minCollapseDepth: options?.minCollapseDepth ?? DEFAULT_MIN_COLLAPSE_DEPTH,
		maxStringLength: options?.maxStringLength ?? DEFAULT_MAX_STRING_LENGTH,
		maxTotalLength: options?.maxTotalLength ?? DEFAULT_MAX_TOTAL_LENGTH,
	};
	const summary: AppStateSanitizeSummary = {
		removedTranslationFields: 0,
		omittedCollections: 0,
		truncatedStrings: 0,
	};
	const sanitized = sanitizeValue(state, resolvedOptions, summary, new Set<object>(), 0);
	return { state: sanitized.value, summary };
}

/**
 * Serializes the sanitized app state for the feedback content. The result is capped at
 * `maxTotalLength` characters so a single report can never blow up the feedback mail again.
 */
export function buildAppStateJsonForFeedback(state: unknown, options?: AppStateSanitizeOptions): string {
	const maxTotalLength = options?.maxTotalLength ?? DEFAULT_MAX_TOTAL_LENGTH;
	const { state: sanitizedState, summary } = sanitizeAppStateForFeedback(state, options);
	const isPlainState = sanitizedState !== null && typeof sanitizedState === 'object' && !Array.isArray(sanitizedState);
	const json = JSON.stringify(isPlainState ? { __sanitized: summary, ...(sanitizedState as object) } : { __sanitized: summary, state: sanitizedState });
	if (json.length <= maxTotalLength) {
		return json;
	}
	return json.slice(0, maxTotalLength) + TRUNCATION_SUFFIX;
}
