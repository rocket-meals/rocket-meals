import {useProjectColor} from '@/states/ProjectInfo';
import {useMyContrastColor} from '@/helper/color/MyContrastColor';
import {View, Text} from "@/components/Themed";
import SimpleBadge from "@/components/badge/SimpleBadge";
import {MyTouchableOpacity} from "@/components/buttons/MyTouchableOpacity";
import {useGlobalActionSheetSettingPriceGroup} from "@/compositions/settings/SettingsRowPriceGroup";

export type PricingBadgeProps = {
  price: number;
  color?: string;
}

//https://helloacm.com/javascripts-tofixed-implementation-without-rounding/#:~:text=The%20idea%20is%20to%20convert,for%20exactly%20n%20decimal%20places.
function toFixedNoRounding(number: number, fractions: number) {
	const reg = new RegExp("^-?\\d+(?:\\.\\d{0," + fractions + "})?", "g")
	const a = number.toString().match(reg)[0];
	const dot = a.indexOf(".");
	if (dot === -1) { // integer, insert decimal dot and pad up zeros
		return a + "." + "0".repeat(fractions);
	}
	const b = fractions - (a.length - dot) + 1;
	return b > 0 ? (a + "0".repeat(b)) : a;
}

export function formatPrice(price: number | undefined | null): string {
	let currency = "€";

	//TODO? What about different currencies? Should we transform/calculate it?
	if(price===undefined || price===null){
		return "?"+" "+currency;
	}
	//Since Intl.NumberFormat does not work on android, we need to do it ourself
	try{
		let priceWithFraction = ""+toFixedNoRounding(price, 2);
		priceWithFraction = priceWithFraction.replace(".", ",");
		return priceWithFraction+" "+currency;
	} catch (err){
		//console.log(err);
	}
	return price+"";
}

export default function PricingBadge(props: PricingBadgeProps) {
	const priceContent: string = formatPrice(props.price);

	return (
			<SimpleBadge borderBottomLeft={true} borderTopLeft={true} text={priceContent} color={props.color} />
	)
}