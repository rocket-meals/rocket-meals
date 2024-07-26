import React, {FunctionComponent} from 'react';
import {SettingsRow, SettingsRowProps} from "@/components/settings/SettingsRow";
import {TranslationKeys, useTranslation} from "@/helper/translations/Translation";
import {MyAccessibilityRoles} from "@/helper/accessibility/MyAccessibilityRoles";
import {AllRoutes, router} from "expo-router";
import {IconNames} from "@/constants/IconNames";

export type SettingsRowNavigateSimpleProps = {
	// translation_key is a static field from the class TranslationKeys
	translation_key: TranslationKeys;
	leftIcon?: string;
	labelRight?: string;
	route: AllRoutes
}
export const SettingsRowNavigateSimple = (props: SettingsRowNavigateSimpleProps) => {
	const translation_title = useTranslation(props.translation_key);
	return <SettingsRowNavigateWithText labelLeft={translation_title} route={props.route} leftIcon={props.leftIcon} labelRight={props.labelRight} />
}

export type SettingsRowNavigateWithTextProps = {
	// translation_key is a static field from the class TranslationKeys
	labelLeft: string;
	labelRight?: string;
	leftIcon?: string;
	route: AllRoutes
}
export const SettingsRowNavigateWithText = (props: SettingsRowNavigateWithTextProps) => {
	const translation_title = props.labelLeft;
	const accessibilityLabel = translation_title;

	let onPress: any = null;
	if(!!props.route){
		onPress = () => {
			router.push(props.route);
		}
	}
	let disabled = !onPress;

	return <SettingsRowNavigate disabled={disabled} accessibilityLabel={accessibilityLabel} labelLeft={translation_title} onPress={onPress} leftIcon={props.leftIcon} labelRight={props.labelRight} />
}

export const SettingsRowNavigate: FunctionComponent<SettingsRowProps> = ({accessibilityLabel, rightIcon, accessibilityRole, ...props}) => {
	const translation_navigate_to = useTranslation(TranslationKeys.navigate_to)
	let usedAccessibilityLabel = translation_navigate_to + ': ' + (accessibilityLabel || props.labelLeft);
	let usedRightIcon = rightIcon;
	if (usedRightIcon === undefined) {
		usedRightIcon = IconNames.chevron_right_icon
	}

	return <SettingsRow accessibilityRole={accessibilityRole || MyAccessibilityRoles.Link} rightIcon={usedRightIcon} accessibilityLabel={usedAccessibilityLabel} {...props} />
}
