// Reads the version an app currently has in the Apple App Store and in Google
// Play, so it can be compared with the installed one. Only major and build
// number are compared (e.g. "21.210" of "21.210.0"): the patch number is an OTA
// update and never reaches the stores.

export type StoreRating = {
	// average stars, 1 to 5
	rating: number | null;
	ratingCount: number | null;
};

export type StoreVersionResult = StoreRating & {
	version: string | null;
	storeUrl: string | null;
	error: string | null;
};

const NO_RATING: StoreRating = { rating: null, ratingCount: null };

// Which app to look up in the stores. The App Store finds an app by bundle id
// or by its numeric Apple id (the id in an apps.apple.com link).
export type StoreAppRef = {
	bundleIdIos?: string;
	appleAppId?: string;
	bundleIdAndroid?: string;
};

export type StoreVersionComparison = 'newer_in_store' | 'up_to_date' | 'older_in_store' | 'unknown';

export type InstalledAppIds = {
	bundleIdIos: string | undefined;
	bundleIdAndroid: string | undefined;
};

type ExpoConfigLike = {
	ios?: { bundleIdentifier?: string } | null;
	android?: { package?: string } | null;
} | null;

export type InstalledAppStoreCheck = {
	comparison: StoreVersionComparison;
	storeVersion: string | null;
	storeUrl: string | null;
	error: string | null;
};

export class StoreVersionHelper {
	// The ids of the app that is actually installed. They come from the app
	// config the binary (or its OTA update) was built with, so the in-app
	// customer switcher does not change them. The build-time customer config is
	// the fallback when no app config is embedded.
	static getInstalledAppIds(expoConfig: ExpoConfigLike | undefined, buildTimeConfig: InstalledAppIds): InstalledAppIds {
		return {
			bundleIdIos: expoConfig?.ios?.bundleIdentifier || buildTimeConfig.bundleIdIos,
			bundleIdAndroid: expoConfig?.android?.package || buildTimeConfig.bundleIdAndroid,
		};
	}

	static findConfigForInstalledApp<T extends InstalledAppIds>(configs: T[], installed: InstalledAppIds): T | undefined {
		return configs.find(config => (!!installed.bundleIdIos && config.bundleIdIos === installed.bundleIdIos) || (!!installed.bundleIdAndroid && config.bundleIdAndroid === installed.bundleIdAndroid));
	}

	// The app the server links to in app_settings (app download banner).
	static getStoreAppRefFromStoreUrls(appleUrl: string | null | undefined, googleUrl: string | null | undefined): StoreAppRef {
		return {
			appleAppId: appleUrl ? /\/id(\d+)/.exec(appleUrl)?.[1] : undefined,
			bundleIdAndroid: googleUrl ? /[?&]id=([^&#]+)/.exec(googleUrl)?.[1] : undefined,
		};
	}

	static getAppStoreLookupUrl(ref: StoreAppRef): string | null {
		// country=de: the lookup only finds apps that are listed in that storefront
		if (ref.bundleIdIos) return `https://itunes.apple.com/lookup?bundleId=${encodeURIComponent(ref.bundleIdIos)}&country=de`;
		if (ref.appleAppId) return `https://itunes.apple.com/lookup?id=${encodeURIComponent(ref.appleAppId)}&country=de`;
		return null;
	}

	static getGooglePlayUrl(bundleIdAndroid: string): string {
		return `https://play.google.com/store/apps/details?id=${encodeURIComponent(bundleIdAndroid)}&hl=en&gl=DE`;
	}

	static parseAppStoreLookup(json: unknown): StoreRating & { version: string | null; storeUrl: string | null } {
		const results = (json as { results?: { version?: unknown; trackViewUrl?: unknown; averageUserRating?: unknown; userRatingCount?: unknown }[] } | null)?.results;
		const first = Array.isArray(results) ? results[0] : undefined;
		return {
			version: typeof first?.version === 'string' ? first.version : null,
			storeUrl: typeof first?.trackViewUrl === 'string' ? first.trackViewUrl : null,
			rating: typeof first?.averageUserRating === 'number' ? first.averageUserRating : null,
			ratingCount: typeof first?.userRatingCount === 'number' ? first.userRatingCount : null,
		};
	}

	// Google Play has no public API for this. The details page embeds the
	// current version in its inline data as [[["21.210.0"]] - the first such
	// entry is the version.
	static parseGooglePlayHtml(html: string): string | null {
		const match = /\[\[\["(\d+(?:\.\d+)+)"\]\]/.exec(html);
		return match?.[1] ?? null;
	}

	// The details page embeds the rating as [["3.1",3.1153846],[null,<five star
	// buckets>],["57",57]: the exact average, the count per star, the total.
	static parseGooglePlayRating(html: string): StoreRating {
		const match = /\[\["[\d.,]+",(\d+(?:\.\d+)?)\],\[null,(?:\["[^"]*",\d+\],?){5}\],\["[^"]*",(\d+)\]/.exec(html);
		if (!match) return NO_RATING;
		const rating = Number.parseFloat(match[1] ?? '');
		const ratingCount = Number.parseInt(match[2] ?? '', 10);
		return {
			rating: Number.isNaN(rating) ? null : rating,
			ratingCount: Number.isNaN(ratingCount) ? null : ratingCount,
		};
	}

	static parseMajorAndBuild(version: string | null | undefined): [number, number] | null {
		if (!version) return null;
		const parts = version.trim().split('.');
		if (parts.length < 2) return null;
		const major = Number.parseInt(parts[0] ?? '', 10);
		const build = Number.parseInt(parts[1] ?? '', 10);
		if (Number.isNaN(major) || Number.isNaN(build)) return null;
		return [major, build];
	}

	static compare(installedVersion: string, storeVersion: string | null | undefined): StoreVersionComparison {
		const installed = StoreVersionHelper.parseMajorAndBuild(installedVersion);
		const store = StoreVersionHelper.parseMajorAndBuild(storeVersion);
		if (!installed || !store) return 'unknown';
		const diff = store[0] !== installed[0] ? store[0] - installed[0] : store[1] - installed[1];
		if (diff > 0) return 'newer_in_store';
		if (diff < 0) return 'older_in_store';
		return 'up_to_date';
	}

	// The store the installed app comes from: the App Store on iOS, Google Play
	// on Android. The web has no store version.
	static async checkInstalledAppAgainstStore(platform: string, installedAppIds: InstalledAppIds, installedVersion: string): Promise<InstalledAppStoreCheck> {
		let result: StoreVersionResult | null = null;
		if (platform === 'ios') result = await StoreVersionHelper.fetchAppStoreVersion({ bundleIdIos: installedAppIds.bundleIdIos });
		if (platform === 'android') result = await StoreVersionHelper.fetchGooglePlayVersion(installedAppIds.bundleIdAndroid);
		return {
			comparison: result ? StoreVersionHelper.compare(installedVersion, result.version) : 'unknown',
			storeVersion: result?.version ?? null,
			storeUrl: result?.storeUrl ?? null,
			error: result ? result.error : 'No store on this platform',
		};
	}

	// "21.210.143" -> "21.210": the part of a version the stores know
	static getMajorAndBuildText(version: string | null | undefined): string | null {
		const majorAndBuild = StoreVersionHelper.parseMajorAndBuild(version);
		return majorAndBuild ? `${majorAndBuild[0]}.${majorAndBuild[1]}` : null;
	}

	static async fetchAppStoreVersion(ref: StoreAppRef): Promise<StoreVersionResult> {
		const lookupUrl = StoreVersionHelper.getAppStoreLookupUrl(ref);
		if (!lookupUrl) return { ...NO_RATING, version: null, storeUrl: null, error: 'No iOS app id configured' };
		try {
			const response = await fetch(lookupUrl);
			if (!response.ok) return { ...NO_RATING, version: null, storeUrl: null, error: `HTTP ${response.status}` };
			const parsed = StoreVersionHelper.parseAppStoreLookup(await response.json());
			return { ...parsed, error: parsed.version ? null : 'App not found in the App Store' };
		} catch (error) {
			return { ...NO_RATING, version: null, storeUrl: null, error: (error as Error).message };
		}
	}

	static async fetchGooglePlayVersion(bundleIdAndroid: string | undefined): Promise<StoreVersionResult> {
		if (!bundleIdAndroid) return { ...NO_RATING, version: null, storeUrl: null, error: 'No Android package configured' };
		const storeUrl = StoreVersionHelper.getGooglePlayUrl(bundleIdAndroid);
		try {
			// On the web this is blocked by CORS - Google Play sends no CORS headers.
			const response = await fetch(storeUrl);
			if (!response.ok) return { ...NO_RATING, version: null, storeUrl, error: `HTTP ${response.status}` };
			const html = await response.text();
			const version = StoreVersionHelper.parseGooglePlayHtml(html);
			return { ...StoreVersionHelper.parseGooglePlayRating(html), version, storeUrl, error: version ? null : 'Version not found on the Google Play page' };
		} catch (error) {
			return { ...NO_RATING, version: null, storeUrl, error: (error as Error).message };
		}
	}
}
