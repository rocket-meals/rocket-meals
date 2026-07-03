import { getValue, setValue } from '@/constants/AsyncStorageHelper';

const STORAGE_KEY = 'appRatingTrackerScore';
const LAST_ASKED_KEY = 'appRatingLastAskedDate';

/** Score threshold to trigger the rating prompt. */
const SCORE_THRESHOLD = 100;
/** Minimum days between rating prompts (cooldown). */
const COOLDOWN_DAYS = 90;

async function getScore(): Promise<number> {
	const stored = await getValue(STORAGE_KEY);
	if (typeof stored === 'number') {
		return stored;
	}
	return 0;
}

async function setScore(score: number): Promise<void> {
	await setValue(STORAGE_KEY, score);
}

async function getLastAskedDate(): Promise<string | null> {
	const stored = await getValue(LAST_ASKED_KEY);
	if (typeof stored === 'string') {
		return stored;
	}
	return null;
}

function daysSince(dateStr: string): number {
	return Math.floor((Date.now() - new Date(dateStr).getTime()) / (1000 * 60 * 60 * 24));
}

export const AppRatingTracker = {
	/**
	 * Add points to the persistent rating score.
	 */
	async addPoints(points: number): Promise<void> {
		const current = await getScore();
		await setScore(current + points);
	},

	/**
	 * Check whether the score threshold is reached AND no cooldown is active.
	 * Returns true if the user should be prompted for a rating.
	 */
	async isEligible(): Promise<boolean> {
		const score = await getScore();
		if (score < SCORE_THRESHOLD) {
			return false;
		}

		const lastAsked = await getLastAskedDate();
		if (lastAsked && daysSince(lastAsked) < COOLDOWN_DAYS) {
			return false;
		}

		return true;
	},

	/**
	 * Check if score threshold is reached (ignoring cooldown).
	 * Useful for debug mode where we want to know if logic would trigger.
	 */
	async hasReachedThreshold(): Promise<boolean> {
		const score = await getScore();
		return score >= SCORE_THRESHOLD;
	},

	/**
	 * Check if cooldown is currently active.
	 */
	async isCooldownActive(): Promise<boolean> {
		const lastAsked = await getLastAskedDate();
		if (!lastAsked) {
			return false;
		}
		return daysSince(lastAsked) < COOLDOWN_DAYS;
	},

	/**
	 * Mark that the user was just prompted for a rating.
	 * Resets the score to 0 and sets the cooldown timestamp.
	 */
	async recordAsked(): Promise<void> {
		await setScore(0);
		await setValue(LAST_ASKED_KEY, new Date().toISOString());
	},

	/**
	 * Get the current score (for debug display).
	 */
	async getScore(): Promise<number> {
		return getScore();
	},
};
