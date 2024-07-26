import React, {FunctionComponent, useState} from 'react';
import {SettingsRow, SettingsRowProps} from './SettingsRow';
import {TranslationKeys, useTranslation} from '@/helper/translations/Translation';
import { View} from '@/components/Themed';
import {Switch} from '@gluestack-ui/themed';
import {PlatformHelper} from '@/helper/PlatformHelper';
import {MyAccessibilityRoles} from "@/helper/accessibility/MyAccessibilityRoles";

interface AppState {
    value: boolean,
    accessibilityLabel: string,
    labelLeft: string,
    onPress?: (nextValue: boolean) => void,
    onTrackColor?: string,
    debug?: boolean,
    disabled?: boolean

}
export const SettingsRowBooleanSwitch: FunctionComponent<AppState & SettingsRowProps> = ({accessibilityLabel, labelLeft,...props}) => {
	const debug = props?.debug

	const [isCheckedRaw, setIsChecked] = useState(props?.value)
	const isChecked = isCheckedRaw===true

	const translationSwitch = useTranslation(TranslationKeys.switch);
	const translationDisabled = useTranslation(TranslationKeys.button_disabled);

	let accessibilityLabelWithFunction = accessibilityLabel ? accessibilityLabel+': '+translationSwitch : translationSwitch
	if (props?.disabled) {
		accessibilityLabelWithFunction += ' ('+translationDisabled+')';
	}

	function onPress() {
		const nextValue = !isChecked;
		if (nextValue) {
			setIsChecked(true);
		} else {
			setIsChecked(false);
		}
		if (props.onPress) {
			props.onPress(nextValue);
		}
	}

	const iOS_SwitchHeight = 31;
	const Android_SwitchHeight = undefined

	let usedVertical = undefined;
	let usedSwitchHeight = undefined;
	if (PlatformHelper.isIOS()) {
		usedSwitchHeight = iOS_SwitchHeight;
	}
	if (PlatformHelper.isAndroid()) {
		usedVertical = -10; // we want to counter the margin of the SettingsRow
		usedSwitchHeight = Android_SwitchHeight;
	}

	const rightContent: any = (
		<View style={{
			paddingRight: 0,
			justifyContent: 'center',
			alignItems: 'center',
		}}
		>
			<Switch
				style={{
					// on android the switch has a margin, so we need to remove it
					marginVertical: usedVertical,
					height: usedSwitchHeight,
				}}
				size={'md'}
				value={isChecked}
				accessibilityLabel={accessibilityLabelWithFunction}
				disabled={props?.disabled}
				isChecked={isChecked}
				onToggle={() => {
					if (PlatformHelper.isWeb()) {
						//do nothing since, the touchable opacity overlays it on web and would trigger twice
					} else {
						onPress();
					}
				}}
			/>
		</View>
	)

	return (
		<SettingsRow labelLeft={labelLeft} accessibilityLabel={accessibilityLabelWithFunction} accessibilityRole={MyAccessibilityRoles.Switch} {...props} rightContent={rightContent} onPress={onPress} />
	)
}
