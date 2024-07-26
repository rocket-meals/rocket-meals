import React, {FunctionComponent} from 'react';
import {SettingsRowActionsheet} from '@/components/settings/SettingsRowActionsheet';
import {
	getMyColorSchemeKeyOptions,
	MyColorSchemeKey,
	useColorSchemeKeyToThemeDictionary,
	useMyColorSchemeKeyDetermined,
	useMyColorSchemeKeySavedOption,
	useThemeDetermined
} from '@/states/ColorScheme';
import {useIsDebug} from '@/states/Debug';
import {TranslationKeys, useTranslation} from '@/helper/translations/Translation';
import {IconNames} from '@/constants/IconNames';
import {MyModalActionSheetItem} from "@/components/modal/MyModalActionSheet";

interface AppState {

}
export const SettingsRowColorScheme: FunctionComponent<AppState> = ({...props}) => {
	const colorSchemeIconName = IconNames.color_scheme_icon

	const title = useTranslation(TranslationKeys.color_scheme)

	const availableColorSchemeKeys = getMyColorSchemeKeyOptions()
	const [savedColorSchemeOptionRaw, setColorSchemeOptionRaw] = useMyColorSchemeKeySavedOption()
	const selectedColorSchemeKey = useMyColorSchemeKeyDetermined()
	const theme = useThemeDetermined()
	const isDebug = useIsDebug()

	const colorSchemeKeyToThemeDict = useColorSchemeKeyToThemeDictionary()

	const color_scheme_light = useTranslation(TranslationKeys.color_scheme_light)
	const color_scheme_dark = useTranslation(TranslationKeys.color_scheme_dark)
	const color_scheme_system = useTranslation(TranslationKeys.color_scheme_system)
	const translation_select = useTranslation(TranslationKeys.select)

	const translation_edit = useTranslation(TranslationKeys.edit)

	const colorSchemeKeyToName: {[key in MyColorSchemeKey]: string}
        = {
        	[MyColorSchemeKey.Light]: color_scheme_light,
        	[MyColorSchemeKey.Dark]: color_scheme_dark,
        	[MyColorSchemeKey.System]: color_scheme_system,
        	[MyColorSchemeKey.DarkBlueTheme]: 'Dark Blue Theme',
        }

	const selectedThemeName = colorSchemeKeyToName[selectedColorSchemeKey]

	const accessibilityLabel = translation_edit+': '+title + ': ' + selectedThemeName
	const label = title

	const items: MyModalActionSheetItem[] = []
	for (const colorSchemeKey of availableColorSchemeKeys) {
		const label: string = colorSchemeKeyToName[colorSchemeKey]
		const themeForKey = colorSchemeKeyToThemeDict[colorSchemeKey]
		const isDark = themeForKey.dark
		let active = colorSchemeKey === selectedColorSchemeKey

		let icon = isDark ? IconNames.color_scheme_dark_icon : IconNames.color_scheme_light_icon
		if (colorSchemeKey === MyColorSchemeKey.System) {
			icon = IconNames.color_scheme_system_icon
		}
		if (colorSchemeKey === MyColorSchemeKey.System && selectedColorSchemeKey === undefined) {
			active = true
		}

		const itemAccessibilityLabel = label+' '+translation_select

		items.push({
			key: colorSchemeKey as string,
			label: label,
			iconLeft: icon,
			active: active,
			accessibilityLabel: itemAccessibilityLabel,
			onSelect: async (key: string, hide: () => void) => {
				const nextColorSchemeKey: MyColorSchemeKey = colorSchemeKey as MyColorSchemeKey
				setColorSchemeOptionRaw((currentValue) => {
					return nextColorSchemeKey;
				})
				hide()
			}
		})
	}

	const config: MyModalActionSheetItem = {
		label: title,
		accessibilityLabel: accessibilityLabel,
		key: 'color_scheme',
		title: title,
		items: items
	}

	function renderDebug() {

	}

	const labelRight = selectedThemeName


	return (
		<>
			<SettingsRowActionsheet labelLeft={label} labelRight={labelRight} config={config} accessibilityLabel={accessibilityLabel} leftContent={label} leftIcon={colorSchemeIconName} {...props}  />
			{renderDebug()}
		</>
	)
}
