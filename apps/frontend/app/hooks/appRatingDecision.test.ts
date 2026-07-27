import {
	MAX_ASKS_PER_YEAR,
	NEGATIVE_SIGNAL_BLOCK_DAYS,
	SCORE_THRESHOLD,
	decideAppRating,
	decideAppRatingFromStoredData,
	pruneAskedTimestamps,
	wasAskedOnThisVersion,
	type AppRatingDecisionInput,
} from './appRatingDecision';

const NOW = new Date('2026-07-25T12:00:00.000Z');
const VERSION = '1.42.0';

function daysAgo(days: number): string {
	return new Date(NOW.getTime() - days * 24 * 60 * 60 * 1000).toISOString();
}

function makeInput(overrides: Partial<AppRatingDecisionInput> = {}): AppRatingDecisionInput {
	return {
		score: SCORE_THRESHOLD,
		lastAskedAppVersion: null,
		currentAppVersion: VERSION,
		askedTimestamps: [],
		negativeSignalAt: null,
		platform: 'ios',
		now: NOW,
		...overrides,
	};
}

describe('decideAppRating', () => {
	it('asks once the threshold is reached and nothing blocks', () => {
		expect(decideAppRating(makeInput())).toEqual({ ask: true });
	});

	it('does not ask below the score threshold', () => {
		expect(decideAppRating(makeInput({ score: SCORE_THRESHOLD - 1 }))).toEqual({
			ask: false,
			reason: 'below_threshold',
		});
	});

	it('never asks on web', () => {
		expect(decideAppRating(makeInput({ platform: 'web' }))).toEqual({
			ask: false,
			reason: 'unsupported_platform',
		});
	});

	it('asks on android', () => {
		expect(decideAppRating(makeInput({ platform: 'android' }))).toEqual({ ask: true });
	});

	describe('once per version', () => {
		it('blocks a second ask on the same build', () => {
			const decision = decideAppRating(makeInput({ lastAskedAppVersion: VERSION }));
			expect(decision).toEqual({ ask: false, reason: 'already_asked_this_version' });
		});

		it('allows asking again after a new build', () => {
			expect(decideAppRating(makeInput({ lastAskedAppVersion: '1.41.0' }))).toEqual({ ask: true });
		});

		it('is the safety net against a repeated celebration in one build', () => {
			// Even if a bug fires the celebration ten times, the second call is already blocked.
			const afterFirstAsk = makeInput({ lastAskedAppVersion: VERSION });
			for (let i = 0; i < 10; i++) {
				expect(decideAppRating(afterFirstAsk).ask).toBe(false);
			}
		});
	});

	describe('yearly budget', () => {
		it('blocks after the yearly maximum, even across new builds', () => {
			const askedTimestamps = [daysAgo(300), daysAgo(200), daysAgo(100)];
			expect(askedTimestamps).toHaveLength(MAX_ASKS_PER_YEAR);

			const decision = decideAppRating(makeInput({ askedTimestamps, lastAskedAppVersion: '1.41.0' }));
			expect(decision).toEqual({ ask: false, reason: 'yearly_budget' });
		});

		it('ignores attempts older than a year', () => {
			const askedTimestamps = [daysAgo(400), daysAgo(380), daysAgo(370)];
			expect(decideAppRating(makeInput({ askedTimestamps }))).toEqual({ ask: true });
		});
	});

	describe('negative signals', () => {
		it('blocks shortly after a negative signal', () => {
			expect(decideAppRating(makeInput({ negativeSignalAt: daysAgo(1) }))).toEqual({
				ask: false,
				reason: 'negative_signal',
			});
		});

		it('allows asking once the negative signal has aged out', () => {
			const aged = daysAgo(NEGATIVE_SIGNAL_BLOCK_DAYS + 1);
			expect(decideAppRating(makeInput({ negativeSignalAt: aged }))).toEqual({ ask: true });
		});
	});

	describe('malformed persisted state', () => {
		it('ignores an unparsable negativeSignalAt instead of blocking forever', () => {
			expect(decideAppRating(makeInput({ negativeSignalAt: 'not-a-date' }))).toEqual({ ask: true });
		});

		it('ignores unparsable entries in askedTimestamps', () => {
			const askedTimestamps = ['not-a-date', '', daysAgo(200)];
			expect(decideAppRating(makeInput({ askedTimestamps }))).toEqual({ ask: true });
		});
	});
});

describe('decideAppRatingFromStoredData', () => {
	it('treats missing persisted state as a fresh install below the threshold', () => {
		expect(decideAppRatingFromStoredData(null, VERSION, NOW)).toEqual({
			ask: false,
			reason: 'below_threshold',
		});
	});

	it('reads the version cap out of the persisted slice', () => {
		const data = { score: SCORE_THRESHOLD, lastAskedAppVersion: VERSION };
		expect(decideAppRatingFromStoredData(data, VERSION, NOW)).toEqual({
			ask: false,
			reason: 'already_asked_this_version',
		});
	});
});

describe('wasAskedOnThisVersion', () => {
	it('is false on a fresh install', () => {
		expect(wasAskedOnThisVersion(null, VERSION)).toBe(false);
		expect(wasAskedOnThisVersion({}, VERSION)).toBe(false);
	});

	it('is true only for a matching version', () => {
		expect(wasAskedOnThisVersion({ lastAskedAppVersion: VERSION }, VERSION)).toBe(true);
		expect(wasAskedOnThisVersion({ lastAskedAppVersion: '1.41.0' }, VERSION)).toBe(false);
	});
});

describe('pruneAskedTimestamps', () => {
	it('keeps only entries from the last year', () => {
		const kept = daysAgo(100);
		expect(pruneAskedTimestamps([daysAgo(400), kept, 'garbage'], NOW)).toEqual([kept]);
	});
});
