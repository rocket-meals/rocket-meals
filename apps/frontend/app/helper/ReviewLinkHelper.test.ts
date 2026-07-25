import { buildAppleReviewUrl, buildGoogleReviewUrl, buildReviewUrl } from './ReviewLinkHelper';

const APPLE_URL = 'https://apps.apple.com/de/app/rocket-meals/id1234567890';
const GOOGLE_URL = 'https://play.google.com/store/apps/details?id=de.rocketmeals.app';

describe('buildAppleReviewUrl', () => {
	it('appends the write-review action to a plain product URL', () => {
		expect(buildAppleReviewUrl(APPLE_URL)).toBe(`${APPLE_URL}?action=write-review`);
	});

	it('uses & when the URL already has a query string', () => {
		expect(buildAppleReviewUrl(`${APPLE_URL}?l=en`)).toBe(`${APPLE_URL}?l=en&action=write-review`);
	});

	it('does not append twice', () => {
		const alreadyBuilt = `${APPLE_URL}?action=write-review`;
		expect(buildAppleReviewUrl(alreadyBuilt)).toBe(alreadyBuilt);
	});

	it('returns undefined without a configured store URL', () => {
		expect(buildAppleReviewUrl(null)).toBeUndefined();
		expect(buildAppleReviewUrl(undefined)).toBeUndefined();
		expect(buildAppleReviewUrl('')).toBeUndefined();
	});
});

describe('buildGoogleReviewUrl', () => {
	it('appends showAllReviews to the existing query string', () => {
		expect(buildGoogleReviewUrl(GOOGLE_URL)).toBe(`${GOOGLE_URL}&showAllReviews=true`);
	});

	it('does not append twice', () => {
		const alreadyBuilt = `${GOOGLE_URL}&showAllReviews=true`;
		expect(buildGoogleReviewUrl(alreadyBuilt)).toBe(alreadyBuilt);
	});

	it('returns undefined without a configured store URL', () => {
		expect(buildGoogleReviewUrl(null)).toBeUndefined();
	});
});

describe('buildReviewUrl', () => {
	it('dispatches to the store specific builder', () => {
		expect(buildReviewUrl('ios', APPLE_URL)).toBe(`${APPLE_URL}?action=write-review`);
		expect(buildReviewUrl('android', GOOGLE_URL)).toBe(`${GOOGLE_URL}&showAllReviews=true`);
	});
});
