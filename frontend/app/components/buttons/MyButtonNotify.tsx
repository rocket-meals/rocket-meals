import React from 'react';
import {LocationType} from "@/helper/geo/LocationType";
import {MyButton} from "@/components/buttons/MyButton";
import {TranslationKeys, useTranslation} from "@/helper/translations/Translation";
import {IconNames} from "@/constants/IconNames";
import {CommonSystemActionHelper} from "@/helper/device/CommonSystemActionHelper";
import {useSynchedDevices} from "@/states/SynchedDevices";
import {NotificationHelper} from "@/helper/notification/NotificationHelper";

export type MyNewButtonProps = {
    onPress?: () => void;
	active?: boolean;
	color?: string;
	tooltip: string;
	accessibilityLabel: string;
}
export const MyButtonNotify = (props: MyNewButtonProps) => {
	const active = props.active;
	const translation_notify = useTranslation(TranslationKeys.notification);
	const translation_active = useTranslation(TranslationKeys.active);
	const translation_inactive = useTranslation(TranslationKeys.inactive);

	let nextActionDescription = translation_notify;
	if (active) {
		nextActionDescription += ': ' + translation_active;
	} else {
		nextActionDescription += ': ' + translation_inactive;
	}
	const accessibilityLabel = nextActionDescription + ': ' + props.accessibilityLabel;

	const tooltip = nextActionDescription + ': ' + props.tooltip;

	const icon = active ? IconNames.notification_active : IconNames.notification_inactive;
	let useTransparentBorderColor = false

	return(
		<MyButton
			backgroundColor={props.color}
			useOnlyNecessarySpace={true}
				  isActive={active}
				  useTransparentBorderColor={useTransparentBorderColor}
				  accessibilityLabel={accessibilityLabel}
				  tooltip={tooltip}
				  icon={icon}
				  onPress={props.onPress}
		/>
	)
}