/**
 * Builds "write a review" deep links for the two stores.
 *
 * These links are the only rating path that works in every environment (TestFlight,
 * simulator, web, sideloaded builds), which also makes them the fallback that both stores
 * explicitly ask for: a user-triggered button must never call the native review API,
 * because the OS may silently suppress the dialog and leave the user with a dead tap.
 */

/** Appends a query parameter, respecting an already present query string. */
function appendQueryParam(url: string, param: string): string {
	const separator = url.includes('?') ? '&' : '?';
	return url + separator + param;
}

/**
 * Turns a plain App Store product URL into one that opens the review composer directly.
 * Returns undefined when no store URL is configured.
 */
export function buildAppleReviewUrl(storeUrl: string | null | undefined): string | undefined {
	if (!storeUrl) {
		return undefined;
	}
	if (storeUrl.includes('action=write-review')) {
		return storeUrl;
	}
	return appendQueryParam(storeUrl, 'action=write-review');
}

/**
 * Turns a plain Play Store product URL into one that opens the reviews section.
 * Google offers no direct "write review" deep link, so this is the closest equivalent.
 */
export function buildGoogleReviewUrl(storeUrl: string | null | undefined): string | undefined {
	if (!storeUrl) {
		return undefined;
	}
	if (storeUrl.includes('showAllReviews=true')) {
		return storeUrl;
	}
	return appendQueryParam(storeUrl, 'showAllReviews=true');
}

export function buildReviewUrl(
	store: 'ios' | 'android',
	storeUrl: string | null | undefined
): string | undefined {
	return store === 'ios' ? buildAppleReviewUrl(storeUrl) : buildGoogleReviewUrl(storeUrl);
}
