import {
	COOLDOWN_DAYS,
	MAX_ASKS_PER_YEAR,
	SCORE_THRESHOLD,
	daysUntilCooldownOver,
	decideAppRating,
	pruneAskedTimestamps,
	type AppRatingDecisionInput,
} from './appRatingDecision';

const NOW = new Date('2026-07-25T12:00:00.000Z');

function daysAgo(days: number): string {
	return new Date(NOW.getTime() - days * 24 * 60 * 60 * 1000).toISOString();
}

function makeInput(overrides: Partial<AppRatingDecisionInput> = {}): AppRatingDecisionInput {
	return {
		score: SCORE_THRESHOLD,
		lastAskedAt: null,
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
		const decision = decideAppRating(makeInput({ score: SCORE_THRESHOLD - 1 }));
		expect(decision).toEqual({ ask: false, reason: 'below_threshold' });
	});

	it('never asks on web', () => {
		const decision = decideAppRating(makeInput({ platform: 'web' }));
		expect(decision).toEqual({ ask: false, reason: 'unsupported_platform' });
	});

	it('asks on android', () => {
		expect(decideAppRating(makeInput({ platform: 'android' }))).toEqual({ ask: true });
	});

	describe('cooldown', () => {
		it('blocks while the cooldown is still running', () => {
			const decision = decideAppRating(makeInput({ lastAskedAt: daysAgo(COOLDOWN_DAYS - 1) }));
			expect(decision).toEqual({ ask: false, reason: 'cooldown' });
		});

		it('allows asking again once the cooldown has passed', () => {
			const decision = decideAppRating(makeInput({ lastAskedAt: daysAgo(COOLDOWN_DAYS + 1) }));
			expect(decision).toEqual({ ask: true });
		});
	});

	describe('yearly budget', () => {
		it('blocks after the yearly maximum of attempts', () => {
			const askedTimestamps = [daysAgo(300), daysAgo(200), daysAgo(130)];
			expect(askedTimestamps).toHaveLength(MAX_ASKS_PER_YEAR);

			const decision = decideAppRating(makeInput({ askedTimestamps, lastAskedAt: daysAgo(130) }));
			expect(decision).toEqual({ ask: false, reason: 'yearly_budget' });
		});

		it('ignores attempts older than a year', () => {
			const askedTimestamps = [daysAgo(400), daysAgo(380), daysAgo(370)];
			const decision = decideAppRating(makeInput({ askedTimestamps, lastAskedAt: daysAgo(370) }));
			expect(decision).toEqual({ ask: true });
		});
	});

	describe('negative signals', () => {
		it('blocks shortly after a negative signal', () => {
			const decision = decideAppRating(makeInput({ negativeSignalAt: daysAgo(1) }));
			expect(decision).toEqual({ ask: false, reason: 'negative_signal' });
		});

		it('allows asking once the negative signal has aged out', () => {
			expect(decideAppRating(makeInput({ negativeSignalAt: daysAgo(30) }))).toEqual({ ask: true });
		});
	});

	describe('malformed persisted state', () => {
		it('treats an unparsable lastAskedAt as never asked', () => {
			expect(decideAppRating(makeInput({ lastAskedAt: 'not-a-date' }))).toEqual({ ask: true });
		});

		it('ignores unparsable entries in askedTimestamps', () => {
			const askedTimestamps = ['not-a-date', '', daysAgo(200)];
			expect(decideAppRating(makeInput({ askedTimestamps }))).toEqual({ ask: true });
		});
	});
});

describe('pruneAskedTimestamps', () => {
	it('keeps only entries from the last year', () => {
		const kept = daysAgo(100);
		expect(pruneAskedTimestamps([daysAgo(400), kept, 'garbage'], NOW)).toEqual([kept]);
	});
});

describe('daysUntilCooldownOver', () => {
	it('returns 0 when never asked', () => {
		expect(daysUntilCooldownOver(null, NOW)).toBe(0);
	});

	it('returns 0 once the cooldown has elapsed', () => {
		expect(daysUntilCooldownOver(daysAgo(COOLDOWN_DAYS + 5), NOW)).toBe(0);
	});

	it('returns the remaining days while the cooldown runs', () => {
		expect(daysUntilCooldownOver(daysAgo(COOLDOWN_DAYS - 10), NOW)).toBe(10);
	});
});
