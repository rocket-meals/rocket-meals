// This file is evaluated in two contexts: by Expo when it builds the app
// config (see app.config.ts) and inside the app bundle itself, so it may only
// import modules that are safe in both - no Node built-ins.
import { ServerHelper } from 'repo-depkit-common';
// Settings that are deliberately identical in every app of this monorepo (iOS
// deployment target, Android SDK levels, OTA setup) live in
// repo-depkit-common/appconfig, together with the named building blocks each
// app composes its own privacy manifest from.
import {
	EXPO_OWNER,
	PrivacyAccessedApi,
	PrivacyCollectedData,
	getExpoBuildPropertiesPlugin,
	getExpoSplashScreenPlugin,
	getExpoUpdatesPlugin,
	getMealPhotoImagePickerPlugin,
	getPrivacyManifests,
	getRuntimeVersion,
	getUpdatesConfig,
	getWebConfig,
} from 'repo-depkit-common/appconfig/expoAppConfig';
import {ImageSourcePropType} from "react-native";

export { EXPO_ASC_KEY_ID, EXPO_ASC_ISSUER_ID, EXPO_APPLE_TEAM_ID, EXPO_APPLE_TEAM_TYPE } from 'repo-depkit-common';

export type CustomerConfig = {
        projectName: string;
        projectSlug: string | undefined;
	easUpdateId: string | undefined;
	easProjectId: string | undefined;
	appScheme: string | undefined;
	bundleIdIos: string | undefined;
	bundleIdAndroid: string | undefined;
	baseUrl: string;
	server_url: string;
	appleAppId?: string;
	// Controls whether the iOS submit workflow submits new builds to App Review.
	// Defaults to true when not set; set to false for apps that must never be submitted
	// automatically (e.g. the Rocket Meals demo/test app).
	iosAppStoreReviewSubmitEnabled?: boolean;
        images: {
                company_logo_source_path: string;
                company_logo_source_get_for_react_native: () => ImageSourcePropType;
                icon_logo_source_path: string;
                icon_logo_source_get_for_react_native: () => ImageSourcePropType;
        };
        foodoffers_show_separated_markings_breakdown?: boolean;
};

export enum ConfigCustomerEnum {
        TEST = 'test',
        SWOSY = 'swosy',
        STUDI_FUTTER = 'studi-futter'
}

// DO NOT CHANGE THE NAME OF THIS FUNCTION: getBuildNumber
// The workflow action check-build-number-online will use this function to determine the build number
// and will fail if the function is not present or does not return a number.
// The build number is used to determine if a new build is required.
export function getBuildNumber() {
	// 207: text recognition moved from Tesseract in a WebView to PaddleOCR on
	// onnxruntime. onnxruntime-react-native and @shopify/react-native-skia are
	// native modules, so this needs a new binary - it cannot ship as an OTA
	// update the way the WebView could.
	// 208: new dev client build for the PaddleOCR native modules. Android
	//      failed on a Gradle 9 incompatibility in onnxruntime-react-native,
	//      iOS went through - so 208 exists online for iOS only.
	// 209: same modules, with that library patched. A fresh number so both
	//      platforms build again rather than being skipped as already built.
	// 210: the patch itself was wrong - it compared two Lists, which the Groovy
	//      in Gradle 9 refuses. Corrected and verified against Gradle 9.3.1.
	return 210;
}

export function getMajorVersion() {
	return 21;
}

export function getVersionPatch() {
        // 12: shared Expo app config moved to repo-depkit-common/appconfig
        // 13: privacy manifest declared per app from named building blocks
        // 14: content rights declared as "third-party content, rights held"
        // 15: SonarCloud clean-up (map message origin check, login debug panel)
        // 16: SonarCloud/data-clumps clean-up (shared redirect button, license and
        //     Google service account types)
        // 17: MyMap (web): message origin check kept inline at the listener
        // 18: image and file uploads fixed for Expo SDK 57 (expo/fetch form parts)
        // 19: food info modal titled "Speise Info"; app version shown in the drawer
        // 20: app usage event reported before the native rating prompt
        // 21: shared translation keys/catalogue moved to repo-depkit-common
        // 22: shared translation catalogue now also serves the backend; French texts repaired
        // 23: 20 French texts repaired that were cut off at an apostrophe
        // 24: language codes matched case- and region-insensitively when picking a translation
        // 25: food offers sold by weight show a base price ("0,40 €/100 g")
        // 26: the unit of that base price is translated where it is a known unit
        // 27: narrow no-break space before the € symbol, as before a unit
        // 28: every value/unit pair uses the narrow no-break space, nutrients included
        // 29: IBAN form field scans a giro card with the camera (Tesseract OCR,
        //     no native module - ships as an OTA update)
        // 30: the giro card scanner no longer reads a number out of the words
        //     printed around it (bank name, cardholder, "Gültig bis")
        // 31: taking the picture and reading it are separated - the camera
        //     preview and the engine's WebView are never on screen together
        // 32: a number is only read when its letters sit where an IBAN has them,
        //     and groups the engine welded together are read again
        // 33: the giro card scanner reads with PaddleOCR instead of Tesseract
        // 34: reading text is a shared useOcr hook now - it asks where the
        //     picture should come from (automatic camera, camera, photo)
        // 35: build number raised to 208
        // 36: onnxruntime-react-native patched for Gradle 9 (Android build)
        // 37: build number raised to 209
        // 38: the Gradle 9 patch compares integers now, not lists
        // 39: the IBAN form field keeps its printed spacing without being cut
        //     short, and checks the number rather than the spaces
        // 40: the OCR modal says what it read, closes itself for good, and wears
        //     the phone camera's own controls; IBANs are validated against the
        //     IBAN registry's character patterns
        // 41: the camera preview had no height at all in the sheet - its size
        //     comes from the aspect ratio now, not from a layout callback
        // 42: housing analytics reports for the handover protocols (management menu)
        // 43: housing analytics reports exportable as PDF (print) and CSV on the web
        // 44: common-ui: PrintHidden keeps tap affordances off the printed page
        // 45: form PDF: letterhead carries only the logo, the issuer's name moved
        //     to the footer
        // 46: master merged back in - housing analytics reports next to the form
        //     PDF letterhead changes
        // 47: form fields grouped into tabs, last editor shown on the protocol and
        //     in the PDF, search over form contents, experimental inventory items
        //     with QR codes
        // 48: form submission screen shows the filled form as a PDF (debug view),
        //     rendered on the fly by the backend's new form-pdf-preview endpoint
        // 49: that endpoint takes the submission id alone and reuses the mail
        //     hook's own pdf generation - the app only asks and shows
        // 50: safe file names come from common's FileNameHelper, and every call
        //     to our own backend goes through the authorized fetch wrapper
        // 51: guest profiles on the login screen, popup events only for anonymous
        //     users with a button to the login screen
        // 52: guest accounts use guest.example.com - Directus rejects .invalid on login
        // 53: guest account shown in settings, onboarding offered again after
        //     logout/account deletion, no backend logout without a session
        // 54: guests delete their account instead of logging out
        // 55: deleting an account deletes profile and user (not only the profile)
        // 56: login buttons are 50px tall instead of 58px, "Anmelden als: Gast",
        //     "Ohne Account fortfahren" is a text link now, login links get a
        //     24px touch target
        // 57: "Lieber anonym bleiben?" replaced by a neutral "Alternativ:", so the
        //     guest account is not pushed aside by the anonymous option
        // 58: the link after it reads "Eingeschränkt ohne Account weiter"
        // 59: unverified profiles (profiles.verified) can be kept from rating and
        //     commenting foods via foods_ratings_enabled_for_unverified and
        //     foods_feedbacks_comments_type_for_unverified
        // 60: profile updates no longer send the read-only field "verified"
        // 61: foods_feedbacks_comments_type_for_unverified = "inherit" follows the regular comments type
        // 62: foods_ratings_type "disabled" hides the stars and the rating quick action;
        //     foods_ratings_type_for_unverified (inherit/disabled) for unverified profiles
        // 63: rating/comment input locked for guests when only verified accounts may use it,
        //     with the hint that a guest account is not enough
        // 64: the OCR engine (onnxruntime, Skia) is loaded when a scan starts, not
        //     when a form with an IBAN field opens - the form screens crashed on
        //     Android; form screens get an error page instead of closing the app
        // 65: a failed text recognition ends the scan with one modal: the error to
        //     copy, or reported to support in one tap (app feedback filled in by the app)
        // 66: text recognition runs on onnxruntime's WebAssembly build on every
        //     platform - on a device inside a WebView - instead of the native
        //     binding that crashed Android on the first scan
        // 67: the camera preview fills the sheet's full width (no black strip on
        //     the right), the giro card frame has a card's shape and is white
        // 68: opening a food offer the food import replaced since shows a translated
        //     hint and reloads the list instead of "Request failed with status code 403"
        // 69: logout clears the cached food offers (sqlite food_offers_cache_*)
        // 70: logout also clears the food offer list's in-memory cache
        // 71: the details of a food offer that no longer exists close themselves
        // 72: the food offer list asks the server again on focus and when the app returns
        //     from the background (in-memory days were served without it); a dish opened
        //     from a chat shows the food when its offer no longer exists
        // 73: common: shared chat rules (ChatHelper) - chat messages sorted by the shared helper
        // 74: public links under /public/ (give feedback, app download, app download management) and the new MCP instruction screen /public/mcp-instruction; app download cards show an external-link icon
        // 75: MCP instruction screen shows the fixed public MCP token without asking the server
        // 76: MCP instruction screen: ?ai-agent=claude|openai|other preselects the assistant, the user
        //     picks personal or public access (login button without an account), UI labels quoted in monospace
        // 77: the MCP instruction screen's preselect parameter is ?assistant= (?ai-agent= still read)
        // 78: MCP instruction screen shows the OpenAI and Claude symbols (unchanged brand assets) with a trademark notice
        // 79: MCP personal token: random string from Directus saved via PATCH /users/me; an existing token can only be replaced
        // 80: MCP instruction screen: provider and account sections fold away once chosen, the steps
        //     appear after the account choice, every step links to support ("?title=" prefills the form)
        // 81: common: food feedback status can be set by hand (FoodFeedbackChatStatusHelper)
        // 82: MCP instruction screen: token created on "connect with my account", steps only once a token
        //     (or <TOKEN> placeholder) exists, copy rows show only the value, one support link at the end,
        //     token shown and revocable at the bottom; public MCP user ensured via POST /mcp-public-user
        //     (token now "PUBLIC"); common-ui: inline code in markdown renders monospace
        // 83: chat: the initial message (e.g. a food feedback comment) is shown as a labelled
        //     context card instead of a bubble, so it is not taken for a message of either side
        return 83;
}

export function getVersionInternalForAppsettingsScreen() {
	return getMajorVersion() + '.' + getBuildNumber() + '.' + getVersionPatch();
}

export function getVersion() {
	return getMajorVersion() + '.' + getBuildNumber() + '.' + 0;
}

export function getIosBuildNumber() {
	return getBuildNumber().toString();
}

export function getAppIconInsideExpoLocalSaved(): ImageSourcePropType {
	const customerConfig: CustomerConfig = getCustomerConfig();
	return customerConfig.images.icon_logo_source_get_for_react_native();
}

export function getCompanyLogoLocalSaved(): ImageSourcePropType {
	const customerConfig: CustomerConfig = getCustomerConfig();
	return customerConfig.images.company_logo_source_get_for_react_native();
}

export const devConfig: CustomerConfig = {
	projectName: 'Rocket Meals',
	projectSlug: 'rocket-meals-dev',
	easUpdateId: '36f72583-5997-4602-8609-05f39444f2e7',
	easProjectId: '36f72583-5997-4602-8609-05f39444f2e7',
	appScheme: 'app-rocket-meals',
	bundleIdIos: 'de.baumgartner-software.rocket-meals-demo',
	bundleIdAndroid: 'com.baumgartnersoftware.rocketmealsdev',
	baseUrl: '/rocket-meals',
	server_url: ServerHelper.TEST_SERVER_CONFIG.server_url,
	appleAppId: '6483930801',
	// The demo app is only for testing - builds are uploaded but never submitted to App Review.
	iosAppStoreReviewSubmitEnabled: false,
	images: {
		company_logo_source_path: 'assets/images/customers/rocket-meals/company.png',
		company_logo_source_get_for_react_native: () => {return require('@/assets/images/customers/rocket-meals/company.png')},
		icon_logo_source_path: 'assets/images/customers/rocket-meals/icon.png',
		icon_logo_source_get_for_react_native: () => {return require('@/assets/images/customers/swosy/icon.png')},
	},
};

export const swosyConfig: CustomerConfig = {
	projectName: 'SWOSY 2.0',
	projectSlug: 'rocket-meals-swosy',
	easUpdateId: '4147159f-d7b5-4db5-b6eb-f9988519950c',
	easProjectId: '4147159f-d7b5-4db5-b6eb-f9988519950c',
	appScheme: 'app-rocket-meals-swosy',
	bundleIdIos: 'de.baumgartner-software.swosy',
	bundleIdAndroid: 'de.baumgartnersoftware.swosy',
	baseUrl: '/swosy',
	server_url: ServerHelper.SWOSY_SERVER_CONFIG.server_url,
	appleAppId: '6667117575',
	iosAppStoreReviewSubmitEnabled: true,
	images: {
		company_logo_source_path: 'assets/images/customers/swosy/company.png',
		company_logo_source_get_for_react_native: () => {return require('@/assets/images/customers/swosy/company.png')},
		icon_logo_source_path: 'assets/images/customers/swosy/icon.png',
		icon_logo_source_get_for_react_native: () => {return require('@/assets/images/customers/swosy/icon.png')},
	}
};

export const studiFutterConfig: CustomerConfig = {
        projectName: 'Studi|Futter',
        projectSlug: 'rocket-meals-studi-futter',
	easUpdateId: '461671f9-774f-4bc4-80a8-5601313539b0',
	easProjectId: '461671f9-774f-4bc4-80a8-5601313539b0',
	appScheme: 'app-rocket-meals-studi-futter',
	bundleIdIos: 'de.stwh.app',
	bundleIdAndroid: 'de.baumgartnersoftware.studifutter',
	baseUrl: '/studi-futter',
	server_url: ServerHelper.STUDI_FUTTER_SERVER_CONFIG.server_url,
	appleAppId: '1548108390',
	iosAppStoreReviewSubmitEnabled: true,
	images: {
		company_logo_source_path: 'assets/images/customers/studi-futter/company.png',
		company_logo_source_get_for_react_native: () => {return require('@/assets/images/customers/studi-futter/company.png')},
		icon_logo_source_path: 'assets/images/customers/studi-futter/icon.png',
		icon_logo_source_get_for_react_native: () => {return require('@/assets/images/customers/studi-futter/icon.png')},
        },
    foodoffers_show_separated_markings_breakdown: true
};

export function getCustomerConfigsDict(): Record<ConfigCustomerEnum, CustomerConfig> {
        return {
                [ConfigCustomerEnum.TEST]: devConfig,
                [ConfigCustomerEnum.SWOSY]: swosyConfig,
                [ConfigCustomerEnum.STUDI_FUTTER]: studiFutterConfig,
        };
}

export function getCustomerEnumForConfig(config: CustomerConfig): ConfigCustomerEnum | null {
        const matchingEntry = Object.entries(getCustomerConfigsDict()).find(([, customerConfig]) =>
                customerConfig.server_url === config.server_url
        );

        return matchingEntry ? (matchingEntry[0] as ConfigCustomerEnum) : null;
}

export const configMuenster: CustomerConfig = {
        projectName: 'Münster',
        projectSlug: undefined,
	easUpdateId:  undefined,
	easProjectId:  undefined,
	appScheme:  undefined,
	bundleIdIos:  undefined,
	bundleIdAndroid:  undefined,
	baseUrl: '/muenster',
	server_url: ServerHelper.SERVER_CONFIG_MUENSTER.server_url,
	images: {
		company_logo_source_path: 'assets/images/customers/rocket-meals/company.png',
		company_logo_source_get_for_react_native: () => {return require('@/assets/images/customers/rocket-meals/company.png')},
		icon_logo_source_path: 'assets/images/customers/rocket-meals/icon.png',
		icon_logo_source_get_for_react_native: () => {return require('@/assets/images/customers/rocket-meals/icon.png')},
	}
};

export function getCustomerConfigurations(): CustomerConfig[] {
	return [
		devConfig,
		swosyConfig,
		studiFutterConfig,
		configMuenster,
	];
}

// EXPO_PUBLIC_CUSTOMER is inlined into the JS bundle by Metro at build time and therefore
// remains available after an OTA update (eas update) in the running app bundle.
// CUSTOMER is only available in the Node context at build time (e.g. app.config.ts, icon generation)
// but not in the app bundle itself. Both variables are needed so that the customer
// is resolved correctly for both native builds and OTA updates.
export function getCustomerEnvVariable(): string | undefined {
	return process.env.EXPO_PUBLIC_CUSTOMER || process.env.CUSTOMER || undefined;
}

export function getCustomerConfig(): CustomerConfig {
	const customer = getCustomerEnvVariable();
	return getCustomerConfigsDict()[customer as ConfigCustomerEnum] || devConfig;
}

export function getGeneratedAssetsPath(): string {
	const customer = getCustomerEnvVariable() || ConfigCustomerEnum.TEST;
	return `./assets/generated/${customer}`;
}

// Apple privacy manifest of THIS app (required for App Review). Rocket Meals
// talks to a canteen backend, so location, messages, photos, other user content
// and the account email leave the device.
const ROCKET_MEALS_PRIVACY = {
	collectedDataTypes: [
		PrivacyCollectedData.PreciseLocation,
		PrivacyCollectedData.EmailsOrTextMessages,
		PrivacyCollectedData.PhotosOrVideos,
		PrivacyCollectedData.OtherUserContent,
		PrivacyCollectedData.EmailAddress,
	],
	// Required-reason APIs of the React Native/Expo runtime itself.
	accessedApiTypes: [
		PrivacyAccessedApi.UserDefaults,
		PrivacyAccessedApi.SystemBootTime,
		PrivacyAccessedApi.DiskSpace,
		PrivacyAccessedApi.FileTimestamp,
	],
};

export function getFinalConfig(config?: any, licenses?: unknown[]) {
	const customerConfig: CustomerConfig = getCustomerConfig();
	const generatedPath = getGeneratedAssetsPath();
	return {
		expo: {
			name: customerConfig.projectName,
			slug: customerConfig.projectSlug,
			version: getVersion(),
			orientation: 'default',
			icon: `${generatedPath}/icon.png`,
			notification: {
				icon: `${generatedPath}/notification-icon.png`,
			},
			updates: getUpdatesConfig(customerConfig.easUpdateId),
			scheme: customerConfig.appScheme,
			userInterfaceStyle: 'automatic',
			splash: {
				image: `${generatedPath}/splash.png`,
				resizeMode: 'contain',
				backgroundColor: '#ffffff',
			},
			assetBundlePatterns: ['**/*'],
			ios: {
				supportsTablet: true,
				bundleIdentifier: customerConfig.bundleIdIos,
				buildNumber: getIosBuildNumber(),
				...(customerConfig.appleAppId ? { appId: customerConfig.appleAppId } : {}),
				infoPlist: {
					NSPhotoLibraryUsageDescription: 'We need access to your photo library to select files',
					NSDocumentDirectoryUsageDescription: 'We need access to your document directory to select files',
				},
				config: {
					usesNonExemptEncryption: false,
				},
				entitlements: {
					'com.apple.developer.applesignin': ['Default'],
				},
				privacyManifests: getPrivacyManifests(ROCKET_MEALS_PRIVACY),
			},
			android: {
				adaptiveIcon: {
					foregroundImage: `${generatedPath}/adaptive-icon.png`,
					backgroundColor: '#ffffff',
				},
				package: customerConfig.bundleIdAndroid,
				blockedPermissions: ['android.permission.READ_MEDIA_IMAGES', 'android.permission.READ_MEDIA_VIDEO'],
				versionCode: getBuildNumber(),
			},
			web: getWebConfig(`${generatedPath}/favicon.png`),
			plugins: [
				'expo-router',
				'expo-secure-store',
				'expo-location',
				'expo-notifications',
				'expo-web-browser',
				['expo-document-picker', { iCloudContainerEnvironment: 'Production' }],
				[
					'expo-camera',
					{
						cameraPermission: 'This app needs camera access to scan QR codes for adding friends.',
						recordAudioAndroid: false,
					},
				],
				getExpoSplashScreenPlugin({ image: `${generatedPath}/splash-icon.png`, backgroundColor: '#ffffff' }),
				[
					'react-native-nfc-manager',
					{
						nfcPermission: 'The app accesses NFC read your Card balance.',
						includeNdefEntitlement: false,
					},
				],
				getExpoUpdatesPlugin(),
				getMealPhotoImagePickerPlugin(),
				getExpoBuildPropertiesPlugin(),
				'expo-localization',
				'expo-asset',
				'expo-font',
			],
			experiments: {
				typedRoutes: true,
				baseUrl: customerConfig.baseUrl + (process.env.EXPO_PUBLIC_BASE_URL_SUFFIX || ''),
			},
			extra: {
				router: {
					origin: false,
				},
				eas: {
					projectId: customerConfig.easProjectId,
				},
				licenses: licenses ?? [],
			},
			owner: EXPO_OWNER,
			runtimeVersion: getRuntimeVersion(),
		},
	};
}
