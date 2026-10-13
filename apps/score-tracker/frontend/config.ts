import { ImageSourcePropType } from 'react-native';
import type { CustomerConfigBase } from 'repo-depkit-common/appconfig/expoAppConfig';

// Shared shape (see repo-depkit-common/appconfig/expoAppConfig.ts) bound to
// react-native's image source type.
export type CustomerConfig = CustomerConfigBase<ImageSourcePropType>;

// DO NOT CHANGE THE NAME OF THIS FUNCTION: getBuildNumber
// The workflow action check-build-number-online will use this function to determine the build number
// and will fail if the function is not present or does not return a number.
// The build number is used to determine if a new build is required.
export function getBuildNumber() {
	// 23: OTA updates were broken: runtimeVersion policy "appVersion" included
	// the patch segment, so patch-only OTA updates never matched the installed
	// binary. getVersion() now pins the patch segment to 0 (like apps/frontend
	// and geonexia) — this build picks up the stable runtime version.
	// 25: shared expo-build-properties plugin from repo-depkit-common/appconfig
	return 25;
}

// DO NOT CHANGE THE NAME OF THIS FUNCTION: getMajorVersion
// The ios-submit-review workflow reads this function: while the major version is
// below 1 the app counts as still in development and is never submitted to
// App Review automatically after a build. Raise to 1 for the first public release.
export function getMajorVersion() {
	return 0;
}

export function getVersionPatch() {
	// 3: the summed-patch experiment already shipped patch 2 from master;
	// never decrease the visible patch version.
	// 4: common/common-ui: weather API helper + WeatherPreview playbook entry
	// 5: settings: whole-database export/import (Datensicherung group);
	//    version display from the JS bundle (OTA patch bumps visible)
	// 6: shared Expo app config moved to repo-depkit-common/appconfig
	// 7: privacy manifest declared per app from named building blocks
	// 8: SonarCloud clean-up (count labels, import plan and share codec split)
	// 9: data-clumps clean-up (shared app settings, match record and customer
	//    config types)
	// 10: MyMap (web): message origin check kept inline at the listener
	// 11: app version shown at the bottom of the drawer
	// 12: local ids from the shared UuidHelper (repo-depkit-common)
	// 13: shared translation keys/catalogue moved to repo-depkit-common
	// 14: repaired French texts in the shared translation catalogue
	// 15: apostrophe-truncation check added to the shared translation validation
	// 16: translation lookup accepts a language code in any case and region
	// 17: shared food offer price helper added to repo-depkit-common
	// 18: shared translation catalogue gained the measurement unit symbols
	// 19: shared price formatting uses a narrow no-break space before the symbol
	// 20: NumberHelper sets every value/unit pair with a narrow no-break space
	// 21: shared IBAN recognition helper added to repo-depkit-common
	// 22: shared IBAN recognition no longer reads a number out of surrounding words
	// 23: shared IBAN recognition reads welded groups, refuses lettered bodies
	// 24: shared IBAN form helpers: spacing-aware length and field validation
	// 25: shared IBAN validation against the registry's character patterns
	// 26: common-ui: PrintHidden keeps tap affordances off the printed page
	// 27: form PDF: letterhead carries only the logo, the issuer in the footer
	// 28: master merged back in - PrintHidden next to the form PDF letterhead
	// 29: common: FileNameHelper for file names that survive http headers and file systems
	// 30: common: GuestAccountHelper and popup events restricted to anonymous users
	// 31: common: guest accounts use guest.example.com (Directus rejects .invalid on login)
	// 32: common: default nickname Guest_<YYMMDDHHmm> for guest profiles
	// 33: common: shared chat and food feedback rules (ChatHelper, FoodFeedbackChatStatusHelper, RelationHelper)
	// 34: common: McpAccessHelper for the MCP server access (public and personal tokens)
	// 35: common: the public MCP user has a fixed token (McpAccessHelper.PUBLIC_USER_TOKEN)
	// 36: common: McpAccessHelper - personal MCP tokens come from /utils/random/string (no backend endpoint)
	// 37: common: food feedback status can be set by hand (FoodFeedbackChatStatusHelper)
	// 38: common: McpAccessHelper public token "PUBLIC" + /mcp-public-user endpoint; common-ui: monospace inline code in markdown
	// 39: common: McpInstructionHelper + MCP instruction texts in commonTranslations
	// 40: common: AppFeedbackChatStatusHelper (status, filters and chat of app feedbacks)
	// 41: common-ui: avatar SVG generation moved to MyAvatar/AvatarSvg (no react-native), shared with the backend
	// 42: course timetable redesign (common-ui: MyCalendarMonth in SettingsListDate, MyColorSelection, SettingsListColor)
	// 43: common: app feedbacks without chat can be marked as done (app_feedbacks.state)
	// 44: common: DefaultProfileHelper (scientist default nickname + avatar for new profiles)
	// 45: common: DefaultProfileHelper.findScientist
	// 46: common: default scientist nickname without number
	// 47: common: FeatureWishHelper and collection name feature_whishes
	// 48: common: FeatureWishHelper author like and delete rules, CollectionNames.DIRECTUS_FIELDS
	// 49: common-ui: MyButton with translated action buttons (save, submit, update, edit, cancel, delete)
	// 50: merge of master (backend feedback pages)
	// 51: common-ui: SettingsListBoolean can show a loading spinner
	// 52: common: app feedback state kept in sync with its chat, delayed chat mails
	// 53: common: profiles.email_notifications
	// 54: common: app feedback status only from state
	// 55: common: profiles.email_notifications removed again
	// 56: SonarCloud reliability: floating promises marked with void, async without await removed
	// 57: SonarCloud reliability: remaining bugs (labels, regex backtracking, codePointAt, sort compare)
	// 58: SonarCloud: remaining maintainability findings and security hotspots resolved
	// 59: data clumps refactored into shared types and parameter objects
	// 60: common: feature wishes mode (disabled / vote only / vote and submit / submit only)
	// 61: common: app usage event names and the app_usage_events_enabled switch
	// 62: common: app_settings.app_usage_events_enabled is a checkbox tree ("Alle" on top), nothing ticked collects nothing
	// 63: common-ui: silhouette avatar config (SilhouetteAvatar), used by the Live-Puls page
	// 64: common: app_settings.maintenance_message type
	// 70: common: ChatHelper read status helpers, chats.date_last_message and chats_participants.read_until types
	return 70;
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

// Contact address shown in the settings screen (support row) and used as the
// Google Play contact email in store-metadata.ts.
export const SUPPORT_EMAIL = 'nils@baumgartner-software.de';

// Public privacy policy for the app stores (App Store Connect "App-Informationen"
// and the in-app "Datenschutzerklärung" row link to the same ground truth).
export const PRIVACY_POLICY_URL = 'https://github.com/rocket-meals/rocket-meals/blob/master/apps/score-tracker/PRIVACY.md';

export const scoreTrackerConfig: CustomerConfig = {
	// User-facing brand name - matches `name` in app.config.ts (home screen) so
	// the store listing, the device and the in-app branding all say the same.
	projectName: 'Punktlandung',
	// App Store Connect Apple-ID (App-Informationen -> Apple-ID), required for
	// non-interactive "eas submit" (injected as submit.production.ios.ascAppId).
	appleAppId: '6791191897',
	images: {
		company_logo_source_get_for_react_native: () => require('./assets/icons/app_icon_source.png'),
	},
};

export function getCustomerConfig(): CustomerConfig {
	return scoreTrackerConfig;
}

export function getCompanyLogoLocalSaved(): ImageSourcePropType {
	return getCustomerConfig().images.company_logo_source_get_for_react_native();
}

export function getAppIconInsideExpoLocalSaved() {
	return require('./assets/icons/app_icon_source.png');
}
