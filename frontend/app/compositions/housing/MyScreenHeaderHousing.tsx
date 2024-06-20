import React from 'react';
import {View, Text} from '@/components/Themed'
import {getMyScreenHeaderFunction, MyScreenHeader, MyScreenHeaderProps} from '@/components/drawer/MyScreenHeader';
import {TranslationKeys, useTranslation} from '@/helper/translations/Translation';
import {Divider} from '@gluestack-ui/themed';
import {SettingsButtonSort} from "@/compositions/settings/SettingsButtonSort";
import {PersistentStore} from "@/helper/syncState/PersistentStore";
import {sortTypesApartments} from "@/states/SynchedSortType";
import {HeaderSearchButtonParams} from "@/compositions/header/HeaderSearchButtonParams";
import {useProfileLanguageCode} from "@/states/SynchedProfile";

const MyScreenHeaderHousing = ({ ...props }: MyScreenHeaderProps) => {
	const translation_apartments = useTranslation(TranslationKeys.apartments);
	const [language, setLanguage] = useProfileLanguageCode();

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
					<HeaderSearchButtonParams titleAddition={translation_apartments} />
					<SettingsButtonSort itemToSort={translation_apartments} synchKey={PersistentStore.sortConfigApartments} availableSortTypes={sortTypesApartments} />
				</View>
			</View>
		);
	}

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


export const getMyScreenHeaderHousing: getMyScreenHeaderFunction = () => {
	return (props: MyScreenHeaderProps) => {
		return <MyScreenHeaderHousing {...props} />
	}
}
