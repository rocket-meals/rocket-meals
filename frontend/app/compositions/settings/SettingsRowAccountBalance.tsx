import React, {FunctionComponent} from 'react';
import {TranslationKeys, useTranslation} from '@/helper/translations/Translation';
import {IconNames} from '@/constants/IconNames';
import {Weekday} from '@/helper/date/DateHelper';
import {PriceGroups, useAccountBalance, useProfilePriceGroup} from '@/states/SynchedProfile';
import {View} from '@/components/Themed';
import {AnimationPriceGroup} from "@/compositions/animations/AnimationPriceGroup";
import {SettingsRow} from "@/components/settings/SettingsRow";
import {MyModalActionSheetItem} from "@/components/modal/MyModalActionSheet";
import {useModalGlobalContext} from "@/components/rootLayout/RootThemeProvider";
import {useIsAccountBalanceEnabled} from "@/states/SynchedAppSettings";
import {formatPrice} from "@/components/pricing/PricingBadge";
import {useRouter} from "expo-router";
import {SettingsRowNavigate, SettingsRowNavigateSimple} from "@/components/settings/SettingsRowNavigate";


interface AppState {

}
export const SettingsRowAccountBalance: FunctionComponent<AppState> = ({...props}) => {
	const isAccountBalanceEnabled = useIsAccountBalanceEnabled()
	const translation_accountbalance = useTranslation(TranslationKeys.accountbalance);
	const [accountBalance, setAccountBalance] = useAccountBalance();
	const router = useRouter()

	if(!isAccountBalanceEnabled) {
		return null
	}

	let label = translation_accountbalance
	let labelRight = formatPrice(accountBalance);
	let accessibilityLabel = translation_accountbalance
	let usedIconName = IconNames.account_balance_icon


	return (
		<>
			<SettingsRowNavigateSimple translation_key={TranslationKeys.accountbalance} labelRight={labelRight} route={'/(app)/accountbalance/'} leftIcon={usedIconName} {...props}  />
		</>

	)
}
