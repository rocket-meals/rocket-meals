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
	// 3: Photo-grid food widget (content margins disabled - native change)
	// and clock themes (year start, sun/moon day display).
	// 4: shared expo-build-properties plugin from repo-depkit-common/appconfig
	return 4;
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
	// 1: expo-updates runtime version pinned to patch 0 (getVersion)
	// 2: shared Expo app config moved to repo-depkit-common/appconfig
	// 3: privacy manifest declared per app from named building blocks
	// 4: SonarCloud clean-up (widget settings sync split into helpers)
	// 5: SonarCloud/data-clumps clean-up (settings screen split into panels,
	//    shared customer config type)
	// 6: app version shown at the bottom of the drawer
	// 7: UuidHelper added to the shared repo-depkit-common package
	// 8: shared translation keys/catalogue moved to repo-depkit-common
	// 9: repaired French texts in the shared translation catalogue
	// 10: apostrophe-truncation check added to the shared translation validation
	// 11: translation lookup accepts a language code in any case and region
	// 12: shared food offer price helper added to repo-depkit-common
	// 13: shared translation catalogue gained the measurement unit symbols
	// 14: shared price formatting uses a narrow no-break space before the symbol
	// 15: NumberHelper sets every value/unit pair with a narrow no-break space
	// 16: shared IBAN recognition helper added to repo-depkit-common
	// 17: shared IBAN recognition no longer reads a number out of surrounding words
	// 18: shared IBAN recognition reads welded groups, refuses lettered bodies
	// 19: shared IBAN form helpers: spacing-aware length and field validation
	// 20: shared IBAN validation against the registry's character patterns
	// 21: never shipped - the change it described was undone before the merge
	// 22: form PDF: letterhead carries only the logo, the issuer in the footer
	// 23: master merged back in - shared common-ui changes from the housing
	//     analytics reports
	// 24: common: FileNameHelper for file names that survive http headers and file systems
	// 25: common: GuestAccountHelper and popup events restricted to anonymous users
	// 26: common: guest accounts use guest.example.com (Directus rejects .invalid on login)
	// 27: common: default nickname Guest_<YYMMDDHHmm> for guest profiles
	// 28: common: shared chat and food feedback rules (ChatHelper, FoodFeedbackChatStatusHelper, RelationHelper)
	// 29: common: McpAccessHelper for the MCP server access (public and personal tokens)
	// 30: common: the public MCP user has a fixed token (McpAccessHelper.PUBLIC_USER_TOKEN)
	// 31: common: McpAccessHelper - personal MCP tokens come from /utils/random/string (no backend endpoint)
	// 32: common: food feedback status can be set by hand (FoodFeedbackChatStatusHelper)
	// 33: common: McpAccessHelper public token "PUBLIC" + /mcp-public-user endpoint; common-ui: monospace inline code in markdown
	// 34: common: McpInstructionHelper + MCP instruction texts in commonTranslations
	// 35: common: AppFeedbackChatStatusHelper (status, filters and chat of app feedbacks)
	// 36: course timetable redesign (common-ui: MyCalendarMonth in SettingsListDate, MyColorSelection, SettingsListColor)
	// 37: common: app feedbacks without chat can be marked as done (app_feedbacks.state)
	// 38: common: DefaultProfileHelper (scientist default nickname + avatar for new profiles)
	// 39: common: DefaultProfileHelper.findScientist
	// 40: common: default scientist nickname without number
	// 41: common: FeatureWishHelper and collection name feature_whishes
	// 42: common: FeatureWishHelper author like and delete rules, CollectionNames.DIRECTUS_FIELDS
	// 43: common-ui: MyButton with translated action buttons (save, submit, update, edit, cancel, delete)
	// 44: merge of master (backend feedback pages)
	// 45: common: app feedback state kept in sync with its chat
	// 46: common: chats.mail_pending_since for delayed chat mails
	// 47: common: profiles.email_notifications
	// 48: common: app feedback status only from state
	// 49: common: profiles.email_notifications removed again
	// 50: SonarCloud reliability: floating promises marked with void, async without await removed
	// 51: SonarCloud reliability: remaining bugs (labels, regex backtracking, codePointAt, sort compare)
	// 52: SonarCloud: remaining maintainability findings and security hotspots resolved
	// 53: data clumps refactored into shared types and parameter objects
	// 54: common: feature wishes mode (disabled / vote only / vote and submit / submit only)
	// 55: common: app usage event names and the app_usage_events_enabled switch
	// 56: common: app_settings.app_usage_events_enabled is a checkbox tree ("Alle" on top), nothing ticked collects nothing
	// 57: common: app_settings.maintenance_message type
	return 62;
}

// Version used for app.config.ts (`version`, and thus the expo-updates
// runtimeVersion via policy "appVersion") — the patch segment is pinned to 0
// like in apps/frontend/app: OTA updates only apply when the runtime version
// matches the installed binary exactly, so including the (OTA-bumped) patch
// here would make every patch update invisible to existing builds.
export function getVersion() {
	return getMajorVersion() + '.' + getBuildNumber() + '.' + 0;
}

// Full version incl. the real patch segment, meant for any settings/about UI
// so users can verify which OTA update they are running (same contract as
// apps/frontend, geonexia and score-tracker).
export function getVersionInternalForAppsettingsScreen() {
	return getMajorVersion() + '.' + getBuildNumber() + '.' + getVersionPatch();
}

// Contact address shown for support and used as the Google Play contact email
// in store-metadata.ts.
export const SUPPORT_EMAIL = 'nils@baumgartner-software.de';

// Public privacy policy for the app stores (App Store Connect "App-Informationen").
export const PRIVACY_POLICY_URL = 'https://github.com/rocket-meals/rocket-meals/blob/master/apps/tag-und-jahr/PRIVACY.md';

export const tagUndJahrConfig: CustomerConfig = {
	// User-facing brand name - matches `name` in app.config.ts (home screen) so
	// the store listing, the device and the in-app branding all say the same.
	projectName: 'Tag und Jahr',
	// App Store Connect Apple-ID (App-Informationen -> Apple-ID), required for
	// non-interactive "eas submit" (injected as submit.production.ios.ascAppId).
	appleAppId: '6799734478',
	images: {
		company_logo_source_get_for_react_native: () => require('./assets/icons/app_icon_source.png'),
	},
};

export function getCustomerConfig(): CustomerConfig {
	return tagUndJahrConfig;
}

export function getCompanyLogoLocalSaved(): ImageSourcePropType {
	return getCustomerConfig().images.company_logo_source_get_for_react_native();
}

export function getAppIconInsideExpoLocalSaved() {
	return require('./assets/icons/app_icon_source.png');
}
