import React, {useEffect} from 'react';
import {Heading, View} from '@/components/Themed'
import {getMyScreenHeaderFunction, MyScreenHeader, MyScreenHeaderProps} from '@/components/drawer/MyScreenHeader';
import {SettingsButtonProfileCanteen} from '@/compositions/settings/SettingsButtonProfileCanteen';
import {useFoodOfferSelectedDate} from '@/states/SynchedFoodOfferStates';
import {TranslationKeys, useTranslation} from '@/helper/translations/Translation';
import {DateHelper} from '@/helper/date/DateHelper';
import {useProfileLocaleForJsDate, useSynchedProfileCanteen} from '@/states/SynchedProfile';
import {Divider} from '@gluestack-ui/themed';
import {MyPreviousNextButton} from '@/components/buttons/MyPreviousNextButton';
import {SimpleDatePicker} from '@/components/datePicker/SimpleDatePicker';
import {SettingsButtonProfileEatingHabits} from '@/compositions/settings/SettingsButtonProfileEatingHabits';
import {SettingsButtonSort} from "@/compositions/settings/SettingsButtonSort";
import {PersistentStore} from "@/helper/syncState/PersistentStore";
import {sortTypesForFood} from "@/states/SynchedSortType";
import {UtilizationCanteenButton} from "@/compositions/utilizationForecast/UtilizationCanteenButton";
import {BusinesshoursCanteenButton} from "@/compositions/businesshours/BusinesshoursCanteenButton";
import {SettingsButtonProfilePriceGroup} from "@/compositions/settings/SettingsRowPriceGroup";

const MyScreenHeaderFoodOffers = ({ ...props }: MyScreenHeaderProps) => {
	let title = undefined //"TEST"

	const locale = useProfileLocaleForJsDate()
	const translation_foods = useTranslation(TranslationKeys.foods);

	const [selectedDate, setSelectedDate, changeAmountDays] = useFoodOfferSelectedDate();
	const [tempSelectedDate, setTempSelectedDate] = React.useState(selectedDate);

	const [profileCanteen, setProfileCanteen] = useSynchedProfileCanteen();
	if(!!profileCanteen && profileCanteen.alias){
		title = profileCanteen.alias;
	}

	const translation_day = useTranslation(TranslationKeys.day);

	const dateCopy = new Date(tempSelectedDate);
	const humanReadableDate = DateHelper.useSmartReadableDate(dateCopy, locale)

	// whenever tempSelectedDate changes, update the selectedDate but wait 500ms and clear the timeout if tempSelectedDate changes again
	// do not update selectedDate if tempSelectedDate is the same as selectedDate
	useEffect(() => {
		if(tempSelectedDate !== selectedDate){
			const timeout = setTimeout(() => {
				setSelectedDate((currentSelectedDate) => {
					return tempSelectedDate;
				});
			}, 500);
			return () => clearTimeout(timeout);
		}
	}, [tempSelectedDate]);

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
					<SettingsButtonSort itemToSort={translation_foods} synchKey={PersistentStore.sortConfigFoodoffers} availableSortTypes={sortTypesForFood} />
					<SettingsButtonProfilePriceGroup />
					<SettingsButtonProfileEatingHabits />
					<SettingsButtonProfileCanteen />
				</View>
			</View>
		);
	}

	function renderSwitchDate(forward: boolean) {
		const translation = translation_day;
		return (
			<MyPreviousNextButton useTransparentBorderColor={true}
				translation={translation}
				forward={forward}
				onPress={() => {
					const newDate = DateHelper.addDays(tempSelectedDate, forward ? 1 : -1);
					setTempSelectedDate(newDate);
				}}
			/>
		)
	}

	function renderSubHeaderContent() {
		if(!profileCanteen){
			return null;
		}

		return (
			<View style={{
				width: '100%',
				flexDirection: 'row',
				flexWrap: 'wrap',
			}}
			>
				<View style={{
					justifyContent: 'center',
					alignItems: 'center',
					flexDirection: 'row',
					flexShrink: 1,
				}}
				>
					{renderSwitchDate(false)}
					<SimpleDatePicker currentDate={selectedDate}
									  onSelectDate={(date) => {
										  setTempSelectedDate(date);
										  setSelectedDate((currentSelectedDate) => {
											  return date;
										  });
									  }}
					>
					</SimpleDatePicker>
					{renderSwitchDate(true)}
				</View>
				<View style={{
					flexDirection: 'column',
					justifyContent: 'center',
					flexShrink: 1,
					flexWrap: 'wrap',
				}}
				>
					<Heading>{humanReadableDate}</Heading>
				</View>
				<View style={{
					// take the rest of the space
					justifyContent: 'flex-end',
					alignItems: 'flex-end',
					flexDirection: 'row',
					flexGrow: 1,

				}}
				>
					<UtilizationCanteenButton />
					<BusinesshoursCanteenButton />
				</View>
			</View>
		)
	}

	return (
		<View style={{
			width: '100%',
		}}
		>
			<MyScreenHeader hideDivider={true} {...props} custom_title={title} custom_renderHeaderDrawerOpposite={renderSecondaryHeaderContent} />
			{renderSubHeaderContent()}
			<Divider />
		</View>
	)
}


export const getMyScreenHeaderFoodOffers: getMyScreenHeaderFunction = () => {
	return (props: MyScreenHeaderProps) => {
		return <MyScreenHeaderFoodOffers {...props} />
	}
}
