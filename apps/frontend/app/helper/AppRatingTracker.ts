import { getValue, setValue } from '@/constants/AsyncStorageHelper';

const STORAGE_KEY = 'appRatingTracker';

const SCORE_WEIGHTS = {
	/** App opens contribute minimally since they require no active engagement. */
	appOpen: 1,
	/** Food feedback counts 3× because rating food shows active engagement. */
	feedback: 3,
	/** Canteen visits count 2× as a moderate engagement signal. */
	visit: 2,
};

/** Minimum engagement score before the user is eligible for a rating prompt. */
const SCORE_THRESHOLD = 15;
/** User must have used the app for at least this many days before prompting. */
const MIN_DAYS_SINCE_FIRST_USE = 7;
/** Minimum days between rating prompts to avoid annoyance. */
const COOLDOWN_DAYS = 90;

export type AppRatingTrackerData = {
	appOpenCount: number;
	feedbackCount: number;
	visitCount: number;
	firstUseDate: string | null;
	lastAskedDate: string | null;
};

const DEFAULT_DATA: AppRatingTrackerData = {
	appOpenCount: 0,
	feedbackCount: 0,
	visitCount: 0,
	firstUseDate: null,
	lastAskedDate: null,
};

async function loadData(): Promise<AppRatingTrackerData> {
	const stored = await getValue(STORAGE_KEY);
	if (stored && typeof stored === 'object') {
		return { ...DEFAULT_DATA, ...stored };
	}
	return { ...DEFAULT_DATA };
}

async function saveData(data: AppRatingTrackerData): Promise<void> {
	await setValue(STORAGE_KEY, data);
}

function daysBetween(dateA: string, dateB: string): number {
	const a = new Date(dateA).getTime();
	const b = new Date(dateB).getTime();
	return Math.floor(Math.abs(b - a) / (1000 * 60 * 60 * 24));
}

function computeScore(data: AppRatingTrackerData): number {
	return (
		data.appOpenCount * SCORE_WEIGHTS.appOpen +
		data.feedbackCount * SCORE_WEIGHTS.feedback +
		data.visitCount * SCORE_WEIGHTS.visit
	);
}

export const AppRatingTracker = {
	/**
	 * Record an app open event. Should be called once per app session
	 * (e.g. in the main layout mount effect).
	 */
	async recordAppOpen(): Promise<void> {
		const data = await loadData();
		data.appOpenCount += 1;
		if (!data.firstUseDate) {
			data.firstUseDate = new Date().toISOString();
		}
		await saveData(data);
	},

	/**
	 * Record a food feedback / rating event.
	 */
	async recordFeedback(): Promise<void> {
		const data = await loadData();
		data.feedbackCount += 1;
		if (!data.firstUseDate) {
			data.firstUseDate = new Date().toISOString();
		}
		await saveData(data);
	},

	/**
	 * Record a canteen visit check-in event.
	 */
	async recordVisit(): Promise<void> {
		const data = await loadData();
		data.visitCount += 1;
		if (!data.firstUseDate) {
			data.firstUseDate = new Date().toISOString();
		}
		await saveData(data);
	},

	/**
	 * Mark that the user was just prompted for a rating.
	 * Resets the cooldown timer.
	 */
	async recordAsked(): Promise<void> {
		const data = await loadData();
		data.lastAskedDate = new Date().toISOString();
		await saveData(data);
	},

	/**
	 * Check whether the user should be prompted for a rating now.
	 *
	 * Returns `true` when:
	 * 1. Engagement score >= threshold (15)
	 * 2. At least 7 days since first use
	 * 3. Never asked before, or at least 90 days since last asked
	 */
	async shouldAskForRating(): Promise<boolean> {
		const data = await loadData();
		const now = new Date().toISOString();

		// Must have firstUseDate
		if (!data.firstUseDate) {
			return false;
		}

		// Check minimum usage period
		if (daysBetween(data.firstUseDate, now) < MIN_DAYS_SINCE_FIRST_USE) {
			return false;
		}

		// Check cooldown
		if (data.lastAskedDate && daysBetween(data.lastAskedDate, now) < COOLDOWN_DAYS) {
			return false;
		}

		// Check engagement score
		if (computeScore(data) < SCORE_THRESHOLD) {
			return false;
		}

		return true;
	},

	/**
	 * Load the current tracker data (for debug display).
	 */
	async getData(): Promise<AppRatingTrackerData> {
		return loadData();
	},

	/**
	 * Get the current engagement score.
	 */
	async getScore(): Promise<number> {
		const data = await loadData();
		return computeScore(data);
	},
};
