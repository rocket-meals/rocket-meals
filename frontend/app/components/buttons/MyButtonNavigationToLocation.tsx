import React from 'react';
import {LocationType} from "@/helper/geo/LocationType";
import {MyButton} from "@/components/buttons/MyButton";
import {TranslationKeys, useTranslation} from "@/helper/translations/Translation";
import {IconNames} from "@/constants/IconNames";
import {CommonSystemActionHelper} from "@/helper/device/CommonSystemActionHelper";

export type MyNewButtonProps = {
    location: LocationType,
	color?: string,
}
export const MyButtonNavigationToLocation = (props: MyNewButtonProps) => {
	const translation_open_navitation_to_location = useTranslation(TranslationKeys.open_navitation_to_location)
	const {location} = props;

	let onPress = undefined
	if(location){
		onPress = () => {
			CommonSystemActionHelper.openMaps(location)
		}
	}

	return(
		<MyButton
			backgroundColor={props.color}
			useOnlyNecessarySpace={true}
				  useTransparentBackgroundColor={false}
				  useTransparentBorderColor={false}
				  accessibilityLabel={translation_open_navitation_to_location}
				  tooltip={translation_open_navitation_to_location}
				  icon={IconNames.location_open_icon}
				  onPress={onPress}
		/>
	)
}