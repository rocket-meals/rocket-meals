import React, {FunctionComponent} from 'react';
import {useShowMyCanteenSelectionModal} from '@/compositions/settings/UseGlobalActionSheetSettingProfileCanteen';
import {IconNames} from '@/constants/IconNames';
import {MyButton} from '@/components/buttons/MyButton';
import {useEditCanteenAccessibilityLabel} from '@/compositions/settings/SettingsRowProfileCanteen';

interface AppState {

}
export const SettingsButtonProfileCanteen: FunctionComponent<AppState> = ({...props}) => {
	const accessibilityLabel = useEditCanteenAccessibilityLabel();
	const tooltip = useEditCanteenAccessibilityLabel();

	const onPress = useShowMyCanteenSelectionModal();

	return (
		<>
			<MyButton useOnlyNecessarySpace={true} tooltip={tooltip} accessibilityLabel={accessibilityLabel} useTransparentBackgroundColor={true} useTransparentBorderColor={true} leftIcon={IconNames.canteen_icon} {...props} onPress={onPress} />
		</>

	)
}
