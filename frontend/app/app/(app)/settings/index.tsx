import {SettingsRowSyncBooleanSwitch} from '@/components/settings/SettingsRowSyncBooleanSwitch';
import {PersistentStore} from '@/helper/syncState/PersistentStore';
import React from 'react';
import {SettingsRowLogout} from '@/components/settings/SettingsRowLogout';
import {SettingsRowDrawerPosition} from '@/compositions/settings/SettingsRowDrawerPosition';
import {SettingsRowProfileNickname} from '@/compositions/settings/SettingsRowProfileNickname';
import {SettingsRowUser} from '@/compositions/settings/SettingsRowUser';
import {SettingsRowProfileCanteen} from '@/compositions/settings/SettingsRowProfileCanteen';
import {MySafeAreaView} from '@/components/MySafeAreaView';
import {ScrollViewWithGradient} from '@/components/scrollview/ScrollViewWithGradient';
import {SettingsRowProfileLanguage} from '@/compositions/settings/SettingsRowProfileLanguage';
import {IconNames} from '@/constants/IconNames';
import {SettingsRowFirstDayOfWeek} from '@/compositions/settings/SettingsRowFirstDayOfWeek';
import {SettingsRowColorScheme} from '@/compositions/settings/SettingsRowColorScheme';
import {SettingsRowProfileEatingHabits} from '@/compositions/settings/SettingsRowEatingHabits';
import {SettingsRowGroup} from '@/components/settings/SettingsRowGroup';
import {SettingsRowSpacer} from '@/components/settings/SettingsRowSpacer';
import {SettingsRowUserDelete} from '@/compositions/settings/SettingsRowUserDelete';
import {SettingsRowServerConfiguration} from '@/compositions/settings/SettingsRowServerConfiguration';
import {SettingsRowPriceGroup} from '@/compositions/settings/SettingsRowPriceGroup';
import {SettingsRowAppUpdate} from "@/compositions/settings/SettingsRowAppUpdate";
import {SettingsRowAccountBalance} from "@/compositions/settings/SettingsRowAccountBalance";
import {SettingsRowDataAccess} from "@/compositions/settings/SettingsRowDataAccess";
import {ProjectBanner} from "@/components/project/ProjectBanner";
import {View} from "@/components/Themed";
import {useDeveloperModeRaw, useIsDeveloperModeActive} from "@/states/Develop";
import {MyTouchableOpacity} from "@/components/buttons/MyTouchableOpacity";
import {TranslationKeys, useTranslation} from "@/helper/translations/Translation";
import {SETTINGS_ROW_DEFAULT_PADDING} from "@/components/settings/SettingsRow";
import {SettingsRowNavigateSimple} from "@/components/settings/SettingsRowNavigate";
import {SettingsRowResetPopupEventsRead} from "@/compositions/settings/SettingsResetPopupEventsRead";

const ProjectVersionInformation = () => {
	const [develop, setDevelop] = useDeveloperModeRaw();

	const title = "Developer Mode";
	const translation_state_current = useTranslation(TranslationKeys.state_current)
	const translation_state_next = useTranslation(TranslationKeys.state_next)
	const translation_active = useTranslation(TranslationKeys.active)
	const translation_inactive = useTranslation(TranslationKeys.inactive)

	const state_current_translated = develop ? translation_active : translation_inactive;
	const state_next_translated = develop ? translation_inactive : translation_active

	const tooltip = title+": "+translation_state_current+": "+state_current_translated+". "+translation_state_next+": "+state_next_translated;

	return <View style={{width: "100%", paddingLeft: SETTINGS_ROW_DEFAULT_PADDING}}>
		<MyTouchableOpacity accessibilityLabel={tooltip} tooltip={tooltip} onPress={() => {
			setDevelop((currentValue) => {
				return !currentValue
			})
		}} >
			<ProjectBanner/>
		</MyTouchableOpacity>
	</View>
}

export default function SettingsScreen() {

	const isDevelopModeActive = useIsDeveloperModeActive();
	let renderedDeveloperModeSettings = null;

	if(isDevelopModeActive){
		renderedDeveloperModeSettings = (
			<SettingsRowGroup>
				<SettingsRowSyncBooleanSwitch labelLeft={'Debug'} leftIcon={IconNames.debug_icon} accessibilityLabel={'Debug'} variable={PersistentStore.debug} />
				<SettingsRowSyncBooleanSwitch labelLeft={'Demo'} leftIconOn={IconNames.demo_icon_on} leftIconOff={IconNames.demo_icon_off} accessibilityLabel={'Demo'} variable={PersistentStore.demo} />
				<SettingsRowSyncBooleanSwitch labelLeft={'Performance'} leftIconOn={IconNames.performance_icon_on} leftIconOff={IconNames.performance_icon_off} accessibilityLabel={'Performance'} variable={PersistentStore.performance} />
				<SettingsRowSyncBooleanSwitch labelLeft={'Developer'} leftIconOn={IconNames.demo_icon_on} leftIconOff={IconNames.demo_icon_off} accessibilityLabel={'Developer'} variable={PersistentStore.develop} />
				<SettingsRowResetPopupEventsRead />
				<SettingsRowServerConfiguration />
				<SettingsRowAppUpdate />
			</SettingsRowGroup>
		)
	}


	return (
		<MySafeAreaView>
			<ScrollViewWithGradient>
				<SettingsRowSpacer />
				<SettingsRowGroup>
					<SettingsRowUser />
					<SettingsRowProfileNickname />
					<SettingsRowProfileLanguage />
					<SettingsRowProfileCanteen />
					<SettingsRowProfileEatingHabits />
					<SettingsRowPriceGroup />
					<SettingsRowAccountBalance />
					<SettingsRowNavigateSimple translation_key={TranslationKeys.notification} leftIcon={IconNames.notification_active} route={"/(app)/settings/notifications"} />
				</SettingsRowGroup>
				<SettingsRowGroup>
					<SettingsRowColorScheme />
					<SettingsRowDrawerPosition />
					<SettingsRowFirstDayOfWeek />
				</SettingsRowGroup>
				<SettingsRowGroup>
					<SettingsRowLogout />
				</SettingsRowGroup>
				<SettingsRowGroup>
					<SettingsRowUserDelete />
					<SettingsRowDataAccess />
				</SettingsRowGroup>
				<SettingsRowGroup>
					<SettingsRowNavigateSimple translation_key={TranslationKeys.feedback_support_faq} leftIcon={IconNames.support_icon} route={"/(app)/support"} />
				</SettingsRowGroup>
				<ProjectVersionInformation />
				{renderedDeveloperModeSettings}
			</ScrollViewWithGradient>
		</MySafeAreaView>
	);
}