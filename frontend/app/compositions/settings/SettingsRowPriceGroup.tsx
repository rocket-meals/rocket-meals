import React, {FunctionComponent} from 'react';
import {TranslationKeys, useTranslation} from '@/helper/translations/Translation';
import {IconNames} from '@/constants/IconNames';
import {Weekday} from '@/helper/date/DateHelper';
import {PriceGroups, useProfilePriceGroup} from '@/states/SynchedProfile';
import {SettingsRow} from "@/components/settings/SettingsRow";
import {router} from "expo-router";
import {MyButton} from "@/components/buttons/MyButton";

export type AvailableOption = {
    value: string | null | undefined | Weekday
    name: string,
    icon?: string,
}

export function usePriceGroupSelectedName(){
	const [priceGroup, setPriceGroup] = useProfilePriceGroup();

	const translation_price_group_student = useTranslation(TranslationKeys.price_group_student)
	const translation_price_group_employee = useTranslation(TranslationKeys.price_group_employee)
	const translation_price_group_guest = useTranslation(TranslationKeys.price_group_guest)

	const priceGroupToName: {[key in PriceGroups]: string}
		= {
		[PriceGroups.Student]: translation_price_group_student,
		[PriceGroups.Employee]: translation_price_group_employee,
		[PriceGroups.Guest]: translation_price_group_guest,
	}

	let selectedOptionName = priceGroupToName[priceGroup]

	return selectedOptionName;
}

export const useNavigateToPriceGroup = () => {
	const onPress = () => {
		router.push('/(app)/settings/price-group/');
	}

	return onPress
}

export const useEditProfilePriceGroupAccessibilityLabel = () => {
	const [priceGroup, setPriceGroup] = useProfilePriceGroup();
	const navigateToPriceGroup = useNavigateToPriceGroup();

	const title = useTranslation(TranslationKeys.price_group)

	const translation_edit = useTranslation(TranslationKeys.edit)

	const translation_price_group_student = useTranslation(TranslationKeys.price_group_student)
	const translation_price_group_employee = useTranslation(TranslationKeys.price_group_employee)
	const translation_price_group_guest = useTranslation(TranslationKeys.price_group_guest)

	const priceGroupToName: {[key in PriceGroups]: string}
		= {
		[PriceGroups.Student]: translation_price_group_student,
		[PriceGroups.Employee]: translation_price_group_employee,
		[PriceGroups.Guest]: translation_price_group_guest,
	}

	let selectedOptionName = priceGroupToName[priceGroup]

	return translation_edit+': '+title + ' ' + selectedOptionName

}

interface AppState {

}
export const SettingsButtonProfilePriceGroup: FunctionComponent<AppState> = ({...props}) => {
	const accessibilityLabel = useEditProfilePriceGroupAccessibilityLabel();
	const tooltip = useEditProfilePriceGroupAccessibilityLabel();

	const onPress = useNavigateToPriceGroup();

	return (
		<>
			<MyButton useOnlyNecessarySpace={true} tooltip={tooltip} accessibilityLabel={accessibilityLabel} useTransparentBackgroundColor={true} useTransparentBorderColor={true} leftIcon={IconNames.price_group_icon} {...props} onPress={onPress} />
		</>
	)
}


interface AppState {

}
export const SettingsRowPriceGroup: FunctionComponent<AppState> = ({...props}) => {
	const usedIconName: string = IconNames.price_group_icon

	const [priceGroup, setPriceGroup] = useProfilePriceGroup();
	const navigateToPriceGroup = useNavigateToPriceGroup();

	const title = useTranslation(TranslationKeys.price_group)

	const translation_edit = useTranslation(TranslationKeys.edit)

	const translation_price_group_student = useTranslation(TranslationKeys.price_group_student)
	const translation_price_group_employee = useTranslation(TranslationKeys.price_group_employee)
	const translation_price_group_guest = useTranslation(TranslationKeys.price_group_guest)

	const priceGroupToName: {[key in PriceGroups]: string}
        = {
        	[PriceGroups.Student]: translation_price_group_student,
        	[PriceGroups.Employee]: translation_price_group_employee,
        	[PriceGroups.Guest]: translation_price_group_guest,
        }

	let selectedOptionName = priceGroupToName[priceGroup]

	const accessibilityLabel = translation_edit+': '+title + ': ' + selectedOptionName
	const label = title


	const labelRight = selectedOptionName

	const onPress = navigateToPriceGroup


	return (
		<>
			<SettingsRow labelLeft={label} labelRight={labelRight} onPress={onPress} accessibilityLabel={accessibilityLabel} leftContent={label} leftIcon={usedIconName} {...props}  />
		</>
	)
}
