import React, {useState} from 'react';
import {TranslationKeys, useTranslation} from "@/helper/translations/Translation";
import {MyModal, MyModalProps} from "@/components/modal/MyModal";
import {IconNames} from "@/constants/IconNames";
import {SettingsRow} from "@/components/settings/SettingsRow";
import {FoodsFeedbacks} from "@/helper/database/databaseTypes/types";
import {MyGridFlatList} from "@/components/grid/MyGridFlatList";
import {FoodFeedbackCommentSingle} from "@/compositions/fooddetails/FoodDetails";
import {View, Text, useViewBackgroundColor} from '../Themed';


export type MyModalActionSheetItem = {
	key: string,
	label: string,
	active?: boolean,
	value?: any,
	title?: string,
	iconLeft?: string | undefined,
	onCancel?: () => Promise<void> | void,
	iconLeftCustomRender?: (key: string, hide: () => void, backgroundColor: string | undefined | null) => React.ReactNode,
	accessibilityLabel: string,
	onSelect?: (key: string, hide: () => void) => void,
	renderAsItem?: (key: string, hide: () => void, backgroundColor: string | undefined | null) => React.ReactNode,
	renderAsContentInsteadItems?: (key: string, hide: () => void, backgroundColor: string | undefined | null) => React.ReactNode,
	renderAsContentPreItems?: (key: string, hide: () => void, backgroundColor: string | undefined | null) => React.ReactNode,
	items?: MyModalActionSheetItem[]
}

export const getMyModalActionSheetItemDefaultRightIcon = (active: boolean) => {
	if(active){
		return IconNames.select_option_active_icon;
	}
	return IconNames.select_option_inactive_icon;
}

export type MyModalActionSheetProps = {
	visible: boolean,
	setVisible: React.Dispatch<React.SetStateAction<boolean>> | ((visible: boolean) => void),
	item: MyModalActionSheetItem
}
export const MyModalActionSheet = ({item, ...props}: MyModalActionSheetProps) => {
	if(!item){
		return null;
	}

	const backgroundColor = useViewBackgroundColor()

	const [selectedItemsHistory, setSelectedItemsHistory] = useState<string[]>([item.key]); // first item is the root item

	const translation_navigate_back = useTranslation(TranslationKeys.navigate_back);
	const hide = () => {
		if(props.setVisible){
			props.setVisible(false);
		}
	}


	let currentItem: MyModalActionSheetItem | undefined = item;
	let currentItems = item.items || [];
	if(selectedItemsHistory.length > 1){
		// iterate through the selected items
		for(let i = 1; i < selectedItemsHistory.length; i++){ // start at 1 because the first item is the root item
			const key = selectedItemsHistory[i];
			const item = currentItems.find((item) => item.key === key);
			if(item && item.items){
				currentItems = item.items;
			}
		}
	}

	let itemsToRender: MyModalActionSheetItem[] = currentItems;



	let finalContent: any = undefined


	if(currentItem.renderAsContentInsteadItems){
		finalContent = currentItem.renderAsContentInsteadItems(currentItem.key, hide, backgroundColor);
	} else {
		let preContent = undefined;
		if(currentItem.renderAsContentPreItems){
			preContent = currentItem.renderAsContentPreItems(currentItem.key, hide, backgroundColor);
		}

		type DataItem = { key: string; data: MyModalActionSheetItem}
		const data: DataItem[] = []

		for(const item of itemsToRender){
			data.push({key: item.key, data: item})
		}

		const renderItem = (item: MyModalActionSheetItem) => {
			let isOption = false;
			let hasSubItems = !!item.items && item.items.length > 0;
			if(item.onSelect && !hasSubItems){
				isOption = true;
			}
			const onSelect = async (key: string) => {
				if(item.onSelect){
					await item.onSelect(key, hide);
					if(props.setVisible){
						//props.setVisible(false);
					}
				} else if(item.items){
					setSelectedItemsHistory([...selectedItemsHistory, key]);
				}
			}

			if(item.renderAsItem){
				return item.renderAsItem(item.key, hide, backgroundColor)
			}

			let iconRight = undefined;
			if(isOption){
				iconRight = getMyModalActionSheetItemDefaultRightIcon(item.active || false);
			}
			if(hasSubItems){
				iconRight = IconNames.chevron_right_icon
			}

			let leftIcon = item.iconLeft;
			let iconLeftCustomRender = undefined
			if(item.iconLeftCustomRender){
				iconLeftCustomRender = item.iconLeftCustomRender(item.key, hide, backgroundColor);
			}

			return <SettingsRow labelLeft={item.label} accessibilityLabel={item.accessibilityLabel} onPress={() => {
					onSelect(item.key);
				}} rightIcon={iconRight} leftIcon={leftIcon} iconLeftCustom={iconLeftCustomRender} active={item.active}  />
		}

		let historyIsIntoSubItems = selectedItemsHistory.length > 1;
		let afterContent = undefined;
		if(historyIsIntoSubItems){
			afterContent =
				<SettingsRow labelLeft={translation_navigate_back} accessibilityLabel={translation_navigate_back} onPress={() => {
					setSelectedItemsHistory(selectedItemsHistory.slice(0, selectedItemsHistory.length - 1));
				}} leftIcon={IconNames.drawer_menu_go_back_icon} />
		}



		finalContent = <MyGridFlatList  data={data} renderItem={(listitem) => {
			let item = listitem.item.data;
			return renderItem(item);
		}} amountColumns={1} preItem={preContent} postItem={afterContent} />
	}


	let title = currentItem.title;
	let onCancel = currentItem.onCancel;

	return <MyModal {...props} title={title} backgroundColor={backgroundColor} onCancel={onCancel}>
		{finalContent}
	</MyModal>
}
