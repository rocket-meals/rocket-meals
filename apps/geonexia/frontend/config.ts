import { ImageSourcePropType } from 'react-native';

export type CustomerConfig = {
	projectName: string;
	images: {
		company_logo_source_get_for_react_native: () => ImageSourcePropType;
	};
};

// DO NOT CHANGE THE NAME OF THIS FUNCTION: getBuildNumber
// The workflow action check-build-number-online will use this function to determine the build number
// and will fail if the function is not present or does not return a number.
// The build number is used to determine if a new build is required.
export function getBuildNumber() {
	// 21: OTA updates were broken: runtimeVersion policy "appVersion" included
	// the patch segment, so patch-only OTA updates never matched the installed
	// binary. getVersion() now pins the patch segment to 0 — this build picks
	// up the stable runtime version plus the update-on-start loader.
	return 22;
}

// DO NOT CHANGE THE NAME OF THIS FUNCTION: getMajorVersion
// The ios-submit-review workflow reads this function: while the major version is
// below 1 the app counts as still in development and is never submitted to
// App Review automatically after a build. Raise to 1 for the first public release.
export function getMajorVersion() {
	return 0;
}

export function getVersionPatch() {
	// Never decrease the visible patch version.
	// 9: GPS tracking + TTS announcements reset to pre-2026-07-10 behavior;
	//    tappable speed/pace stats open a history bar chart modal
	// 10: reliable background GPS capture (headless updates feed the crash
	//     snapshot instead of stopping the task); weather saved on activities
	// 11: settings: whole-database export/import (Datensicherung group,
	//     shared SettingsListSqliteBackup from common-ui)
	// 12: shared Expo app config moved to repo-depkit-common/appconfig
	// 13: privacy manifest declared per app from named building blocks
	// 14: SonarCloud clean-up (recording location update split into helpers)
	// 15: SonarCloud/data-clumps clean-up (live speed kept in a ref, shared
	//     modal/license/sqlite settings types)
	// 16: MyMap (web): message origin check kept inline at the listener
	// 17: app version shown at the bottom of the drawer
	// 18: local ids from the shared UuidHelper (repo-depkit-common)
	// 19: shared translation keys/catalogue moved to repo-depkit-common
	// 20: repaired French texts in the shared translation catalogue
	// 21: apostrophe-truncation check added to the shared translation validation
	// 22: translation lookup accepts a language code in any case and region
	// 23: shared food offer price helper added to repo-depkit-common
	// 24: shared translation catalogue gained the measurement unit symbols
	// 25: shared price formatting uses a narrow no-break space before the symbol
	// 26: NumberHelper sets every value/unit pair with a narrow no-break space
	// 27: shared IBAN recognition helper added to repo-depkit-common
	// 28: shared IBAN recognition no longer reads a number out of surrounding words
	// 29: shared IBAN recognition reads welded groups, refuses lettered bodies
	// 30: shared IBAN form helpers: spacing-aware length and field validation
	// 31: shared IBAN validation against the registry's character patterns
	// 32: common-ui: PrintHidden keeps tap affordances off the printed page
	// 33: form PDF: letterhead carries only the logo, the issuer in the footer
	// 34: master merged back in - PrintHidden next to the form PDF letterhead
	// 35: common: FileNameHelper for file names that survive http headers and file systems
	// 36: common: GuestAccountHelper and popup events restricted to anonymous users
	// 37: common: guest accounts use guest.example.com (Directus rejects .invalid on login)
	// 38: common: default nickname Guest_<YYMMDDHHmm> for guest profiles
	// 39: common: shared chat and food feedback rules (ChatHelper, FoodFeedbackChatStatusHelper, RelationHelper)
	// 40: common: McpAccessHelper for the MCP server access (public and personal tokens)
	// 41: common: the public MCP user has a fixed token (McpAccessHelper.PUBLIC_USER_TOKEN)
	// 42: common: McpAccessHelper - personal MCP tokens come from /utils/random/string (no backend endpoint)
	// 43: common: food feedback status can be set by hand (FoodFeedbackChatStatusHelper)
	// 44: common: McpAccessHelper public token "PUBLIC" + /mcp-public-user endpoint; common-ui: monospace inline code in markdown
	// 45: common: McpInstructionHelper + MCP instruction texts in commonTranslations
	return 45;
}

// Version used for app.config.ts (`version`, and thus the expo-updates
// runtimeVersion via policy "appVersion") — the patch segment is pinned to 0
// like in apps/frontend/app: OTA updates only apply when the runtime version
// matches the installed binary exactly, so including the (OTA-bumped) patch
// here would make every patch update invisible to existing builds.
export function getVersion() {
	return getMajorVersion() + '.' + getBuildNumber() + '.' + 0;
}

// Full version incl. the real patch segment, shown on the settings screen so
// users can verify which OTA update they are running.
export function getVersionInternalForAppsettingsScreen() {
	return getMajorVersion() + '.' + getBuildNumber() + '.' + getVersionPatch();
}

export const geonexiaConfig: CustomerConfig = {
	projectName: 'Geonexia',
	images: {
		company_logo_source_get_for_react_native: () => require('./assets/generated/company.png'),
	},
};

export function getCustomerConfig(): CustomerConfig {
	return geonexiaConfig;
}

export function getCompanyLogoLocalSaved(): ImageSourcePropType {
	return getCustomerConfig().images.company_logo_source_get_for_react_native();
}

export function getAppIconInsideExpoLocalSaved() {
	return require('./assets/icons/app_icon_source.png');
}
