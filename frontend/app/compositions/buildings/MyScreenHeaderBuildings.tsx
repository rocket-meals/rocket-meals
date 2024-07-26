import React from 'react';
import {View} from '@/components/Themed'
import {getMyScreenHeaderFunction, MyScreenHeader, MyScreenHeaderProps} from '@/components/drawer/MyScreenHeader';
import {TranslationKeys, useTranslation} from '@/helper/translations/Translation';
import {Divider} from '@gluestack-ui/themed';
import {SettingsButtonSort} from "@/compositions/settings/SettingsButtonSort";
import {PersistentStore} from "@/helper/syncState/PersistentStore";
import {sortTypesApartments, sortTypesBuildings} from "@/states/SynchedSortType";
import {useBuildingIdFromLocalSearchParams} from "@/app/(app)/campus";
import {HeaderSearchButtonParams} from "@/compositions/header/HeaderSearchButtonParams";

const MyScreenHeaderBuildings = ({ ...props }: MyScreenHeaderProps) => {
	const translation_item_to_sort = useTranslation(TranslationKeys.buildings);
	let buildings_id: string | undefined = useBuildingIdFromLocalSearchParams();



	function renderSecondaryHeaderContent(props: any) {
		return (
			<View style={{
				justifyContent: 'flex-end',
				alignItems: 'center',
				flexDirection: 'row',
			}}
			>
				<View style={{
					flexDirection: 'row',
				}}
				>
					<HeaderSearchButtonParams titleAddition={translation_item_to_sort} />
					<SettingsButtonSort itemToSort={translation_item_to_sort} synchKey={PersistentStore.sortConfigBuildings} availableSortTypes={sortTypesBuildings} />
				</View>
			</View>
		);
	}

	if(buildings_id){
		// get options and the rest of the props
		const {options, ...rest} = props;
		// @ts-ignore
		options.showBackButton = true;

		return (
			<View style={{
				width: '100%',
			}}
			>
				<MyScreenHeader options={options} {...rest} />
				<Divider />
			</View>
		)
	} else {
		return (
			<View style={{
				width: '100%',
			}}
			>
				<MyScreenHeader hideDivider={true} {...props} custom_renderHeaderDrawerOpposite={renderSecondaryHeaderContent} />
				<Divider />
			</View>
		)
	}
}


export const getMyScreenHeaderBuildings: getMyScreenHeaderFunction = () => {
	return (props: MyScreenHeaderProps) => {
		return <MyScreenHeaderBuildings {...props} />
	}
}
