import {MyButton} from "@/components/buttons/MyButton";
import React from "react";
import {Apartments} from "@/helper/database/databaseTypes/types";
import {useProfileLocaleForJsDate} from "@/states/SynchedProfile";
import {IconNames} from "@/constants/IconNames";
import {TranslationKeys, useTranslation} from "@/helper/translations/Translation";
import {DateHelper} from "@/helper/date/DateHelper";
import {Text, View} from "@/components/Themed";
import {MyScrollView} from "@/components/scrollview/MyScrollView";
import {useModalGlobalContext} from "@/components/rootLayout/RootThemeProvider";
import {useHousingAreaColor} from "@/states/SynchedAppSettings";

export type FreeRoomBadgeProps = {
	apartment: Apartments,
	borderRadius?: number,
}
export const FreeRoomBadge = ({apartment, borderRadius}: FreeRoomBadgeProps) => {
	const translation_free_rooms = useTranslation(TranslationKeys.free_rooms);
	const locale = useProfileLocaleForJsDate()
	const [modalConfig, setModalConfig] = useModalGlobalContext();

	const housingAreaColor = useHousingAreaColor();

	let available_from = apartment.available_from;
	let available_from_date = available_from ? new Date(available_from) : new Date();
	let readableAvailableFrom = DateHelper.useSmartReadableDate(available_from_date, locale)

	if(!available_from){
		return null;
	}


	const accessibilityLabel = translation_free_rooms+": "+readableAvailableFrom;

	const dislike_icon = IconNames.sort_free_rooms_icon;

	const onPress = () => {
		setModalConfig({
			title: translation_free_rooms,
			accessibilityLabel: accessibilityLabel,
			key: "free_rooms",
			label: translation_free_rooms,
			renderAsContentInsteadItems: (key: string, hide: () => void) => {
				return(
					<MyScrollView>
						<View style={{
							width: "100%",
						}}>
							<Text style={{
								textAlign: "center",
							}}>{accessibilityLabel}</Text>
						</View>
					</MyScrollView>
				)
			}
		})

	}

	return 	<>
		<MyButton
			backgroundColor={housingAreaColor}
			isActive={true}
			borderRadius={borderRadius}
			onPress={onPress}
			accessibilityLabel={accessibilityLabel} tooltip={accessibilityLabel} icon={dislike_icon} />
	</>
}