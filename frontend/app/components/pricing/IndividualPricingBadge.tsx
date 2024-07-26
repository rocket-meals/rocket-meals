import {Foodoffers} from '@/helper/database/databaseTypes/types';
import PricingBadge, {formatPrice, PricingBadgeProps} from '@/components/pricing/PricingBadge';
import useProfilePricing from '@/components/pricing/useProfilePricing';
import {
	useEditProfilePriceGroupAccessibilityLabel,
	useNavigateToPriceGroup
} from "@/compositions/settings/SettingsRowPriceGroup";
import {MyTouchableOpacity} from "@/components/buttons/MyTouchableOpacity";
import React from "react";

export type IndivididualPricingBadgeProps = {
    foodOffer: Foodoffers,
    badgeProps?: Omit<PricingBadgeProps, 'price'>
}

export default function IndividualPricingBadge(props: IndivididualPricingBadgeProps) {
	const profilePricing = useProfilePricing(props.foodOffer);

	const accessibilityLabelEditPriceGroup = useEditProfilePriceGroupAccessibilityLabel();

	const onPress = useNavigateToPriceGroup();

	if (!profilePricing) {
		return null;
	}

	const priceContent: string = formatPrice(profilePricing);

	const accessibilityLabel = `${priceContent} - `+accessibilityLabelEditPriceGroup;

	return (
		<>
			<MyTouchableOpacity accessibilityLabel={accessibilityLabel} onPress={onPress} >
				<PricingBadge {...props.badgeProps} price={profilePricing}/>
			</MyTouchableOpacity>
		</>
	)
}