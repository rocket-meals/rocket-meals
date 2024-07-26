import React from 'react';
import {MySafeAreaView} from '@/components/MySafeAreaView';
import {ScrollViewWithGradient} from '@/components/scrollview/ScrollViewWithGradient';
import {IconNames} from '@/constants/IconNames';
import {AnimationPriceGroup} from "@/compositions/animations/AnimationPriceGroup";
import {PriceGroups, useProfilePriceGroup} from "@/states/SynchedProfile";
import {TranslationKeys, useTranslation} from "@/helper/translations/Translation";
import {SettingsRowGroup} from "@/components/settings/SettingsRowGroup";
import {SettingsRow} from "@/components/settings/SettingsRow";
import {getMyModalActionSheetItemDefaultRightIcon} from "@/components/modal/MyModalActionSheet";
import {MyAccessibilityRoles} from "@/helper/accessibility/MyAccessibilityRoles";
import {useFoodsAreaColor} from "@/states/SynchedAppSettings";

export default function SettingsScreen() {

	const [priceGroup, setPriceGroup] = useProfilePriceGroup();
	const title = useTranslation(TranslationKeys.price_group)
	const translation_select = useTranslation(TranslationKeys.select)
	const translation_edit = useTranslation(TranslationKeys.edit)

	const foodsAreaColor = useFoodsAreaColor();

	const translation_price_group_student = useTranslation(TranslationKeys.price_group_student)
	const translation_price_group_employee = useTranslation(TranslationKeys.price_group_employee)
	const translation_price_group_guest = useTranslation(TranslationKeys.price_group_guest)

	const priceGroupToName: {[key in PriceGroups]: string}
		= {
		[PriceGroups.Student]: translation_price_group_student,
		[PriceGroups.Employee]: translation_price_group_employee,
		[PriceGroups.Guest]: translation_price_group_guest,
	}

	const priceGroupToIcon: {[key in PriceGroups]: string}
		= {
		[PriceGroups.Student]: IconNames.price_group_student,
		[PriceGroups.Employee]: IconNames.price_group_employee,
		[PriceGroups.Guest]: IconNames.price_group_guest,
	}

	let renderedPriceGroups: any[] = [];

	const availablePriceGroupKeys = Object.keys(priceGroupToName);
	for (let i=0; i<availablePriceGroupKeys.length; i++) {
		const availablePriceGroupKey = availablePriceGroupKeys[i] as PriceGroups
		const name = priceGroupToName[availablePriceGroupKey];
		const icon = priceGroupToIcon[availablePriceGroupKey];
		let value: PriceGroups = availablePriceGroupKey;
		let isSelected = priceGroup === value;
		let iconRight = getMyModalActionSheetItemDefaultRightIcon(isSelected);
		renderedPriceGroups.push(
			<SettingsRow color={foodsAreaColor} accessibilityRole={MyAccessibilityRoles.Combobox} key={availablePriceGroupKey} active={isSelected} leftIcon={icon} labelLeft={name} rightIcon={iconRight} onPress={async () =>
				await setPriceGroup(value)
			}  accessibilityLabel={
				`${translation_select} ${name}`
			}/>
		)
	}

	return (
		<MySafeAreaView>
			<ScrollViewWithGradient>
				<AnimationPriceGroup />
				<SettingsRowGroup>
					{renderedPriceGroups}
				</SettingsRowGroup>
			</ScrollViewWithGradient>
		</MySafeAreaView>
	);
}