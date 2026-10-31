// Ground truth for the app store screenshots of all rocket-meals tenant apps.
// See docs/STORE_SCREENSHOTS.md for the whole flow.
//
//   yarn store-screenshots:generate          (renders into store-screenshots/<tenant>/)
//   yarn store-screenshots:push              (uploads the committed files to the stores)
//
// The screenshots are rendered from the public tenant web app in kiosk mode and are
// committed to the repository, so every change is visible in the git history. Which
// screens a tenant gets is decided by its backend: a screen whose app_settings flag is
// off (e.g. course_timetable_enabled at Studi|Futter) is left out, exactly like the
// drawer of the app leaves it out (components/Drawer/CustomDrawerContent.tsx).
//
// Bundle ids and urls come from config.ts so they cannot drift apart from the builds.
// The module may only import code that also runs in plain Node (the generator and the
// upload scripts load it with ts-node/tsx).
import { AppScreens, DatabaseTypes, ROCKET_MEALS_WEB_HOST } from 'repo-depkit-common';
import { ConfigCustomerEnum, CustomerConfig, getCustomerConfigsDict, getVersion } from './config';

export type StoreScreenshotStore = 'apple' | 'google';

export type StoreScreenshotDevice = {
	/** Folder name below store-screenshots/<tenant>/ */
	key: string;
	store: StoreScreenshotStore;
	/**
	 * Apple: screenshotDisplayType of App Store Connect (e.g. APP_IPHONE_67).
	 * Google: image type of the Play listing (e.g. phoneScreenshots).
	 */
	storeType: string;
	/** CSS viewport, multiplied with deviceScaleFactor this gives the pixel size. */
	viewportWidth: number;
	viewportHeight: number;
	deviceScaleFactor: number;
	/** Renders the iPhone status bar mock of the web app (?deviceMock=iphone). */
	iphoneStatusBar: boolean;
};

// Pixel sizes are the ones the stores require:
//   Apple 6.9"/6.7" iPhone 1290x2796, Apple 13"/12.9" iPad 2048x2732,
//   Google phone and 10" tablet 9:16 with at least 1080 px on the short side.
export const STORE_SCREENSHOT_DEVICES: StoreScreenshotDevice[] = [
	{ key: 'apple-iphone-6.7', store: 'apple', storeType: 'APP_IPHONE_67', viewportWidth: 430, viewportHeight: 932, deviceScaleFactor: 3, iphoneStatusBar: true },
	{ key: 'apple-ipad-12.9', store: 'apple', storeType: 'APP_IPAD_PRO_3GEN_129', viewportWidth: 1024, viewportHeight: 1366, deviceScaleFactor: 2, iphoneStatusBar: false },
	{ key: 'google-phone', store: 'google', storeType: 'phoneScreenshots', viewportWidth: 360, viewportHeight: 640, deviceScaleFactor: 3, iphoneStatusBar: false },
	{ key: 'google-tablet-10', store: 'google', storeType: 'tenInchScreenshots', viewportWidth: 720, viewportHeight: 1280, deviceScaleFactor: 1.5, iphoneStatusBar: false },
];

type AppSettingsFlag = keyof DatabaseTypes.AppSettings;

export type StoreScreenshotScreen = {
	route: AppScreens | string;
	/** The screen is only shot when this app_settings flag of the tenant backend is true. */
	requiresAppSetting?: AppSettingsFlag;
};

// Order = order in the store. Apple shows at most 10, Google at most 8 per type, so the
// list stays at 8 or below. The first two are the ones people actually see in the search
// results. Eating habits is left out on purpose: it opens with an explanation sheet that
// covers half of the screen.
export const STORE_SCREENSHOT_SCREENS: StoreScreenshotScreen[] = [
	{ route: AppScreens.FOOD_OFFERS, requiresAppSetting: 'foods_enabled' },
	{ route: AppScreens.CAMPUS, requiresAppSetting: 'campus_enabled' },
	{ route: AppScreens.HOUSING, requiresAppSetting: 'housing_enabled' },
	{ route: AppScreens.COURSE_TIMETABLE, requiresAppSetting: 'course_timetable_enabled' },
	{ route: AppScreens.NEWS, requiresAppSetting: 'news_enabled' },
	{ route: AppScreens.ACCOUNT_BALANCE, requiresAppSetting: 'balance_enabled' },
	{ route: AppScreens.SETTINGS },
];

export type StoreScreenshotTenant = {
	/** Folder name below store-screenshots/, same as CUSTOMER / EXPO_PUBLIC_CUSTOMER. */
	tenant: ConfigCustomerEnum;
	displayName: string;
	/** Public web app the screenshots are rendered from, e.g. https://rocket-meals.de/swosy */
	webUrl: string;
	/** Directus api of the tenant, its app_settings decide which screens are shot. */
	serverUrl: string;
	bundleIdIos?: string;
	packageNameAndroid?: string;
	/**
	 * Automatic uploads (after a new render, before an iOS review submission) only happen
	 * when this is true. Keep it false until the committed screenshots of the tenant have
	 * been looked at once - a manual workflow run with "upload" still uploads them.
	 */
	autoUpload: boolean;
	/** Store version (major.build.0). Screenshots are rendered again when it changes. */
	appVersion: string;
	screens: StoreScreenshotScreen[];
};

// Tenants whose screenshots go to the stores without a human in the loop.
const AUTO_UPLOAD_TENANTS: ConfigCustomerEnum[] = [];

// Screens a tenant never wants in the store although its backend has them switched on.
// Leave empty unless a screen looks bad for that tenant.
const EXCLUDED_ROUTES: Partial<Record<ConfigCustomerEnum, string[]>> = {};

function tenantScreenshots(tenant: ConfigCustomerEnum, config: CustomerConfig): StoreScreenshotTenant {
	const excluded = EXCLUDED_ROUTES[tenant] ?? [];
	return {
		tenant,
		displayName: config.projectName,
		webUrl: `${ROCKET_MEALS_WEB_HOST}${config.baseUrl}`,
		serverUrl: config.server_url,
		bundleIdIos: config.bundleIdIos,
		packageNameAndroid: config.bundleIdAndroid,
		autoUpload: AUTO_UPLOAD_TENANTS.includes(tenant),
		appVersion: getVersion(),
		screens: STORE_SCREENSHOT_SCREENS.filter(screen => !excluded.includes(screen.route)),
	};
}

export function getStoreScreenshotTenants(): StoreScreenshotTenant[] {
	return Object.entries(getCustomerConfigsDict()).map(([tenant, config]) => tenantScreenshots(tenant as ConfigCustomerEnum, config));
}
