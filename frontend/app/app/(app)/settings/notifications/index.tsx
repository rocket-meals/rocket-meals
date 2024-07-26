import {MySafeAreaView} from '@/components/MySafeAreaView';
import React, {useEffect, useState} from 'react';
import {TranslationKeys, useTranslation} from "@/helper/translations/Translation";
import {Heading, Text, View} from "@/components/Themed";
import {AnimationNotificationBell} from "@/compositions/animations/AnimationNotificationBell";
import {useSynchedOwnFoodIdToFoodFeedbacksDict} from "@/states/SynchedFoodFeedbacks";
import {ListRenderItemInfo} from "react-native";
import {MyGridFlatList} from "@/components/grid/MyGridFlatList";
import {SETTINGS_ROW_DEFAULT_PADDING, SettingsRow} from "@/components/settings/SettingsRow";
import {SettingsRowGroup} from "@/components/settings/SettingsRowGroup";
import {FoodNotifyButtonWithPermissionWithName} from "@/components/foodfeedback/FoodNotifyButton";
import {Foods} from "@/helper/database/databaseTypes/types";
import {loadFood} from "@/states/SynchedFoodOfferStates";
import {useIsDemo} from "@/states/SynchedDemo";
import {useProfileLanguageCode} from "@/states/SynchedProfile";
import {getFoodName} from "@/helper/food/FoodTranslation";

export type FoodNotificationRowItemProps = {
	food_id: string,
}
const FoodNotificationRowItem = ({food_id}: FoodNotificationRowItemProps) => {
	const [usedFood, setUsedFood] = useState<Foods | undefined>(undefined);
	const isDemo = useIsDemo();
	const translation_notification = useTranslation(TranslationKeys.notification)
	const translation_is_loading = useTranslation(TranslationKeys.is_loading)
	const [languageCode, setLanguageCode] = useProfileLanguageCode()

	async function loadData() {
		loadFood(isDemo, food_id)
			.then(setUsedFood)
			.catch(console.error);
	}

	useEffect(() => {
		loadData();
	}, [food_id]);

	const default_food_name = translation_is_loading+" ("+food_id+")"
	const food_name = getFoodName(usedFood, languageCode) ||default_food_name

	return (
		<SettingsRow labelLeft={food_name} accessibilityLabel={translation_notification+": "+food_name} rightContent={
			<FoodNotifyButtonWithPermissionWithName food_id={food_id} food_name={food_name} />
		} />
	);
}

export default function EatingHabitsScreen() {

	const translation_notification_index_introduction = useTranslation(TranslationKeys.notification_index_introduction)

	const translation_foods = useTranslation(TranslationKeys.foods)

	const [ownFoodFeedbacksDict, setOwnFoodFeedbacksDict, cacheHelperObjOwnFoodFeedbacks] = useSynchedOwnFoodIdToFoodFeedbacksDict();
	let keysRaw = Object.keys(ownFoodFeedbacksDict || {})
	const [foodKeys, setFoodKeys] = React.useState<string[]>(keysRaw)

	const preItem = <>
		<AnimationNotificationBell />
		<View style={{
			width: '100%',
			paddingHorizontal: SETTINGS_ROW_DEFAULT_PADDING,
		}}>
			<Text>{translation_notification_index_introduction}</Text>
		</View>
	</>

	const renderResource = (info: ListRenderItemInfo<DataItem>) => {
		const {item, index} = info;
		const data = item.data;
		return <FoodNotificationRowItem food_id={data} />
	}

	type DataItem = { key: string; data: string}
	const data: DataItem[] = []

	for (let i=0; i<foodKeys.length; i++) {
		const food_id = foodKeys[i];
		data.push({key: food_id, data: food_id})
	}

	return (
		<MySafeAreaView>
			<SettingsRowGroup>
			{preItem}
			</SettingsRowGroup>
			<SettingsRowGroup>
				<View style={{
					width: '100%',
					paddingHorizontal: SETTINGS_ROW_DEFAULT_PADDING,
				}}>
					<Heading>{translation_foods}</Heading>
				</View>
				<MyGridFlatList
					data={data} renderItem={renderResource} amountColumns={1}
				/>
			</SettingsRowGroup>
		</MySafeAreaView>
	)
}
