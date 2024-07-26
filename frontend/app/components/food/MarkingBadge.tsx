import {MyButton} from "@/components/buttons/MyButton";
import React from "react";
import {Foodoffers, Markings} from "@/helper/database/databaseTypes/types";
import {IconNames} from "@/constants/IconNames";
import {TranslationKeys, useTranslation} from "@/helper/translations/Translation";
import {useModalGlobalContext} from "@/components/rootLayout/RootThemeProvider";
import {Icon, Text, useTextContrastColor, useViewBackgroundColor, View} from "@/components/Themed";
import {BUTTON_DEFAULT_Padding, MyButtonCustomContentPadder} from "@/components/buttons/MyButtonCustom";
import {useSynchedMarkingsDict} from "@/states/SynchedMarkings";
import {useProfileLanguageCode} from "@/states/SynchedProfile";
import {getMarkingName, getMarkingShortIdentifier} from "@/components/food/MarkingListItem";
import DirectusImageOrIconComponent, {
	hasResourceImageOrRemoteImage
} from "@/components/image/DirectusImageOrIconComponent";
import {MarkingHelper} from "@/helper/food/MarkingHelper";
import {useCharacterWithInPixel, useIconMaxDimension, useIconWithInPixel} from "@/components/shapes/Rectangle";
import {SETTINGS_ROW_DEFAULT_PADDING} from "@/components/settings/SettingsRow";
import {getDirectusTranslation, TranslationEntry} from "@/helper/translations/DirectusTranslationUseFunction";
import {ThemedMarkdown} from "@/components/markdown/ThemedMarkdown";

export const MarkingBadges = ({foodoffer, color}: {foodoffer: Foodoffers, color: string}) => {
	const markingsIds = MarkingHelper.getFoodOfferMarkingIds(foodoffer);
	const [markingsDict, setMarkingsDict] = useSynchedMarkingsDict();

	let badges: any[] = [];
	for(let markingId of markingsIds){
		const marking: Markings | undefined | null = markingsDict?.[markingId];
		if(!!marking){
			let markingVisible = marking?.show_on_card
			if(markingVisible){
				badges.push(<MarkingBadge markingId={markingId} color={color} />)
			}
		}
	}

	if(badges.length===0){
		return null;
	} else {
		return badges
	}

}

export type MarkingBadgeProps = {
	markingId: string
	borderRadius?: number,
}
export const MarkingBadge = ({markingId, borderRadius}: MarkingBadgeProps) => {
	const [modalConfig, setModalConfig] = useModalGlobalContext();
	const [markingsDict, setMarkingsDict] = useSynchedMarkingsDict();
	const [languageCode, setLanguageCode] = useProfileLanguageCode()
	const viewBackgroundColor = useViewBackgroundColor();
	const textColor = useTextContrastColor();

	const imageWidth = useIconMaxDimension()+(BUTTON_DEFAULT_Padding*2);

	const marking: Markings | undefined | null = markingsDict?.[markingId];

	const translation_description = useTranslation(TranslationKeys.description);
	const translation_eating_habit = useTranslation(TranslationKeys.eating_habits);


	if(!marking){
		return null;
	}


	const translated_name = getMarkingName(marking, languageCode);
	const marking_translations = marking?.translations as TranslationEntry[]
	const translated_description = getDirectusTranslation(languageCode, marking_translations, "description");

	const translation_title = translated_name;

	const accessibilityLabel = translated_name

	const onPress = () => {
		setModalConfig({
			title: translation_title,
			accessibilityLabel: translated_name,
			key: "foodGroupBadge",
			label: translation_eating_habit,
			renderAsContentInsteadItems: (key: string, hide: () => void) => {
				return <View style={{width: "100%", padding: SETTINGS_ROW_DEFAULT_PADDING}}>
					<View style={{width: "100%", alignItems: "center"}}>
						<DirectusImageOrIconComponent resource={marking} widthImage={imageWidth} heightImage={imageWidth} />
					</View>
					<ThemedMarkdown markdown={translated_description} />
				</View>
			}
		})
	}

	let hasImage = hasResourceImageOrRemoteImage(marking);

	let usedIcon = marking.icon || IconNames.identifier;

	let imageAsCustomIcon = null;
	if(hasImage){
	 imageAsCustomIcon = <DirectusImageOrIconComponent resource={marking} widthImage={imageWidth} heightImage={imageWidth} />
	}

	let transparentBackgroundColor = "#FFFFFF00";
	let usedBackgroundColor = hasImage ? transparentBackgroundColor : viewBackgroundColor

	return 	<>
		<MyButton
			isActive={true}
			useTransparentBorderColor={true}
			backgroundColor={usedBackgroundColor}
			borderRadius={borderRadius}
			onPress={onPress}
			accessibilityLabel={accessibilityLabel}
			tooltip={accessibilityLabel}
			icon={usedIcon}
			customIcon={imageAsCustomIcon}
		/>
	</>
}