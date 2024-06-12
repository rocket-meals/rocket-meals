import React, {FunctionComponent} from 'react';
import {TranslationKeys, useTranslation} from '@/helper/translations/Translation';
import {SettingsRow} from '@/components/settings/SettingsRow';
import {useSynchedProfileCanteen} from '@/states/SynchedProfile';
import {
	useShowCanteenSelectionModal,
	useShowMyCanteenSelectionModal,
} from '@/compositions/settings/UseGlobalActionSheetSettingProfileCanteen';
import {IconNames} from '@/constants/IconNames';
import {useIsFoodsEnabled} from '@/states/SynchedAppSettings';
import { Canteens } from '@/helper/database/databaseTypes/types';

interface AppState {

}

export function useEditCanteenAccessibilityLabel(): string {
	const translation_title = useTranslation(TranslationKeys.canteen)
	const translation_select = useTranslation(TranslationKeys.select)
	return translation_title + ': ' + translation_select;
}


interface SettingsRowCanteenSelectionProps {
	labelRight?: string;
	onSelectCanteen: (canteen: Canteens | null) => void;
}
export const SettingsRowCanteenSelection: FunctionComponent<SettingsRowCanteenSelectionProps> = ({...props}) => {
	const leftIcon = IconNames.canteen_icon
	const translation_title = useTranslation(TranslationKeys.canteen)
	const translation_unknown = useTranslation(TranslationKeys.unknown)
	const label = translation_title
	const labelRight: string = props.labelRight || translation_unknown;

	const accessibilityLabel = useEditCanteenAccessibilityLabel();

	const onPress = useShowCanteenSelectionModal({onSelectCanteen: props.onSelectCanteen});

	return (
		<>
			<SettingsRow accessibilityLabel={accessibilityLabel} rightIcon={IconNames.edit_icon} labelRight={labelRight} labelLeft={label} leftIcon={leftIcon} {...props} onPress={onPress} />
		</>
	)
}

export const SettingsRowProfileCanteen: FunctionComponent<AppState> = ({...props}) => {
	const [profileCanteen, setProfileCanteen] = useSynchedProfileCanteen();
	const isFoodsEnabled = useIsFoodsEnabled();

	const canteenId = profileCanteen?.id;
	const canteenIdAsString = canteenId ? canteenId+'' : undefined;
	const labelRight: string | undefined = profileCanteen?.alias || canteenIdAsString || undefined;

	const onPress = useShowMyCanteenSelectionModal();

	if (!isFoodsEnabled) {
		return null;
	}

	return <SettingsRowCanteenSelection labelRight={labelRight} onSelectCanteen={onPress} />
}
