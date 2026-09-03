import { buildAppStateJsonForFeedback, isTranslationField, sanitizeAppStateForFeedback } from './appStateForFeedback';

/** Builds a catalogue-like collection of entities, each with translations in eight languages. */
const buildBuildings = (count: number) =>
	Array.from({ length: count }, (_, index) => ({
		id: `building-${index}`,
		alias: `Building ${index}`,
		// Entities in the real state carry a few hundred bytes of metadata each.
		image_remote_url: `https://example.org/buildings/${index}.jpg`,
		coordinates: { type: 'Point', coordinates: [9.818609 + index / 1000, 52.321957 + index / 1000] },
		description: `Description of building ${index}. `.repeat(6),
		translations: [
			{ languages_code: 'de', content: 'Ein sehr langer deutscher Text über dieses Gebäude.' },
			{ languages_code: 'en', content: 'A very long english text about this building.' },
		],
	}));

describe('isTranslationField', () => {
	it('detects translation fields', () => {
		expect(isTranslationField('translations')).toBe(true);
		expect(isTranslationField('balance_translations')).toBe(true);
		expect(isTranslationField('news_translations')).toBe(true);
	});

	it('keeps everything else', () => {
		expect(isTranslationField('translationsCount')).toBe(false);
		expect(isTranslationField('alias')).toBe(false);
	});
});

describe('sanitizeAppStateForFeedback', () => {
	it('removes translations on every level', () => {
		const { state, summary } = sanitizeAppStateForFeedback({
			settings: {
				appSettings: {
					id: 1,
					balance_translations: [{ content: '# Unterstützte Karten' }],
					translations: [{ content: 'Willkommen' }],
				},
			},
			canteenReducer: {
				canteens: [{ id: 'canteen-1', alias: 'Hauptmensa', translations: [{ content: 'Hauptmensa' }] }],
			},
		});

		expect(state).toEqual({
			settings: { appSettings: { id: 1 } },
			canteenReducer: { canteens: [{ id: 'canteen-1', alias: 'Hauptmensa' }] },
		});
		expect(summary.removedTranslationFields).toBe(3);
	});

	it('replaces bulky collections with a placeholder that keeps the entry count', () => {
		const { state, summary } = sanitizeAppStateForFeedback(
			{ campus: { campuses: buildBuildings(50) } },
			{ maxCollectionLength: 500 }
		);

		expect((state as any).campus.campuses).toEqual({ __omitted: 'array', length: 50 });
		expect(summary.omittedCollections).toBe(1);
	});

	it('replaces bulky entity dictionaries as well', () => {
		const buildingsDict = Object.fromEntries(buildBuildings(50).map(building => [building.id, building]));

		const { state } = sanitizeAppStateForFeedback({ canteenReducer: { buildingsDict } }, { maxCollectionLength: 500 });

		expect((state as any).canteenReducer.buildingsDict).toEqual({ __omitted: 'object', length: 50 });
	});

	it('never drops the state root or a reducer slice, however big they are', () => {
		const { state } = sanitizeAppStateForFeedback(
			{ canteenReducer: { canteens: buildBuildings(50), buildingsDict: {} }, campus: { campuses: buildBuildings(50) } },
			{ maxCollectionLength: 500 }
		);

		expect(Object.keys(state as object)).toEqual(['canteenReducer', 'campus']);
		expect(Object.keys((state as any).canteenReducer)).toEqual(['canteens', 'buildingsDict']);
		expect((state as any).canteenReducer.canteens).toEqual({ __omitted: 'array', length: 50 });
	});

	it('keeps small, user specific data untouched', () => {
		const ownFoodFeedbacks = [{ id: 'feedback-1', food: 'food-1', rating: 4, notify: null }];

		const { state } = sanitizeAppStateForFeedback({
			authReducer: { loggedIn: true, profile: { id: 'profile-1', canteen: 'canteen-1' } },
			food: { ownFoodFeedbacks },
		});

		expect((state as any).authReducer).toEqual({ loggedIn: true, profile: { id: 'profile-1', canteen: 'canteen-1' } });
		expect((state as any).food.ownFoodFeedbacks).toEqual(ownFoodFeedbacks);
	});

	it('shortens very long texts', () => {
		const { state, summary } = sanitizeAppStateForFeedback({ settings: { wiki: 'x'.repeat(5000) } }, { maxStringLength: 100 });

		expect(String((state as any).settings.wiki)).toHaveLength(100 + '…[truncated]'.length);
		expect(summary.truncatedStrings).toBe(1);
	});

	it('does not choke on circular references', () => {
		const node: any = { id: 'node' };
		node.self = node;

		const { state } = sanitizeAppStateForFeedback({ node });

		expect((state as any).node.self).toBe('[circular]');
	});

	it('leaves the original state untouched', () => {
		const original = { canteenReducer: { canteens: [{ id: 'canteen-1', translations: [{ content: 'Hauptmensa' }] }] } };

		sanitizeAppStateForFeedback(original);

		expect(original.canteenReducer.canteens[0].translations).toHaveLength(1);
	});
});

describe('buildAppStateJsonForFeedback', () => {
	it('produces valid JSON with a summary of what was dropped', () => {
		const json = buildAppStateJsonForFeedback({
			canteenReducer: { buildings: buildBuildings(200) },
			authReducer: { loggedIn: true },
		});
		const parsed = JSON.parse(json);

		expect(parsed.authReducer).toEqual({ loggedIn: true });
		expect(parsed.canteenReducer.buildings).toEqual({ __omitted: 'array', length: 200 });
		expect(parsed.__sanitized.omittedCollections).toBe(1);
	});

	it('is far smaller than the raw state', () => {
		const state = {
			canteenReducer: { buildings: buildBuildings(200) },
			campus: { campuses: buildBuildings(200), campusesDict: Object.fromEntries(buildBuildings(200).map(b => [b.id, b])) },
		};

		expect(buildAppStateJsonForFeedback(state).length).toBeLessThan(JSON.stringify(state).length / 10);
	});

	it('never exceeds the total length limit', () => {
		const state = Object.fromEntries(Array.from({ length: 200 }, (_, index) => [`reducer${index}`, { id: index, text: 'y'.repeat(400) }]));

		const json = buildAppStateJsonForFeedback(state, { maxTotalLength: 1000 });

		expect(json.length).toBeLessThanOrEqual(1000 + '…[truncated]'.length);
	});
});
