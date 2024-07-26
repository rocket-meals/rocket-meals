import React, {FunctionComponent} from 'react';
import {SettingsRowActionsheet} from '@/components/settings/SettingsRowActionsheet';
import {useIsDebug} from '@/states/Debug';
import {TranslationKeys, useTranslation} from '@/helper/translations/Translation';
import {
	DrawerConfigPosition,
	getDrawerPositionKeyOptions,
	useDrawerPositionRaw
} from '@/states/DrawerSyncConfig';
import {IconNames} from '@/constants/IconNames';
import {MyModalActionSheetItem} from "@/components/modal/MyModalActionSheet";

interface AppState {

}
export const SettingsRowDrawerPosition: FunctionComponent<AppState> = ({...props}) => {
	const leftIcon = IconNames.drawer_position_icon

	const title = useTranslation(TranslationKeys.drawer_config_position)

	const availableOptionKeys = getDrawerPositionKeyOptions()
	const [savedOptionKey, setSavedOptionKey] = useDrawerPositionRaw()
	const selectedKey = savedOptionKey || DrawerConfigPosition.System
	const isDebug = useIsDebug()

	const translation_direction_left = useTranslation(TranslationKeys.drawer_config_position_left)
	const translation_direction_right = useTranslation(TranslationKeys.drawer_config_position_right)
	const translation_direction_system = useTranslation(TranslationKeys.drawer_config_position_system)
	const translation_select = useTranslation(TranslationKeys.select)

	const translation_edit = useTranslation(TranslationKeys.edit)

	const optionKeyToName: {[key in DrawerConfigPosition]: string}
        = {
        	[DrawerConfigPosition.Left]: translation_direction_left,
        	[DrawerConfigPosition.Right]: translation_direction_right,
        	[DrawerConfigPosition.System]: translation_direction_system
        }

	const optionKeyToIcon: {[key in DrawerConfigPosition]: string}
        = {
        	[DrawerConfigPosition.Left]: IconNames.drawer_position_left_icon,
        	[DrawerConfigPosition.Right]: IconNames.drawer_position_right_icon,
        	[DrawerConfigPosition.System]: IconNames.settings_system_auto_icon
        }

	const selectedName = optionKeyToName[selectedKey]

	const accessibilityLabel = translation_edit+': '+title + ': ' + selectedName
	const label = title

	const items: MyModalActionSheetItem[] = []
	for (const key of availableOptionKeys) {
		const label: string = optionKeyToName[key]

		const icon = optionKeyToIcon[key]
		let active = key === selectedKey
		if (key === DrawerConfigPosition.System && selectedKey === undefined) {
			active = true
		}

		const itemAccessibilityLabel = label+' '+translation_select

		items.push({
			key: key as string,
			label: label,
			iconLeft: icon,
			active: active,
			accessibilityLabel: itemAccessibilityLabel,
			onSelect: async (key: string, hide: () => void) => {
				const nextValue: DrawerConfigPosition = key as DrawerConfigPosition
				setSavedOptionKey(nextValue)
				hide()
			}
		})
	}

	const config: MyModalActionSheetItem = {
		accessibilityLabel: accessibilityLabel,
		key: 'drawer_position',
		label: title,
		title: title,
		items: items
	}

	return (
		<>
			<SettingsRowActionsheet labelRight={selectedName} labelLeft={label} config={config} accessibilityLabel={accessibilityLabel} leftContent={label} leftIcon={leftIcon} {...props}  />
		</>
	)
}
