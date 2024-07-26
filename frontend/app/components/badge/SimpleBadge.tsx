import {useProjectColor} from '@/states/ProjectInfo';
import {useMyContrastColor} from '@/helper/color/MyContrastColor';
import {View, Text, Icon} from "@/components/Themed";
import {IconNames} from "@/constants/IconNames";

export type SimpleBadgeProps = {
  text: string;
  icon?: string;
  borderTopLeft?: boolean;
  borderBottomLeft?: boolean;
  borderTopRight?: boolean;
  borderBottomRight?: boolean;
  borderRadius?: number;
  color?: string;
}


export default function SimpleBadge(props: SimpleBadgeProps) {
	const projectColor = props.color ?? useProjectColor();
	const projectContrastColor = useMyContrastColor(projectColor);

	let usedBorderRadius = props.borderRadius ?? 8;
	let usedPadding = 5;

	let renderedIcon = null;
	if(props.icon){
		renderedIcon = <View style={{
			paddingRight: 5,
		}}>
			<Icon style={{color: projectContrastColor}} name={props.icon} />
		</View>
	}

	let borderTopLeftRadius = props.borderTopLeft ? usedBorderRadius : 0;
	let borderBottomLeftRadius = props.borderBottomLeft ? usedBorderRadius : 0;
	let borderTopRightRadius = props.borderTopRight ? usedBorderRadius : 0;
	let borderBottomRightRadius = props.borderBottomRight ? usedBorderRadius : 0;

	let largestBorderRadiusLeft = Math.max(borderTopLeftRadius, borderBottomLeftRadius);
	let largestBorderRadiusRight = Math.max(borderTopRightRadius, borderBottomRightRadius);

	let paddingLeft = largestBorderRadiusLeft > 0 ? largestBorderRadiusLeft : usedPadding;
	let paddingRight = largestBorderRadiusRight > 0 ? largestBorderRadiusRight : usedPadding;

	return (
		<View style={{
			backgroundColor: projectColor,
			padding: usedPadding,
			paddingLeft: paddingLeft,
			paddingRight: paddingRight,
			borderTopLeftRadius: props.borderTopLeft ? usedBorderRadius : 0,
			borderBottomLeftRadius: props.borderBottomLeft ? usedBorderRadius : 0,
			borderTopRightRadius: props.borderTopRight ? usedBorderRadius : 0,
			borderBottomRightRadius: props.borderBottomRight ? usedBorderRadius : 0,
			flexDirection: "row",
			alignItems: "center",
			justifyContent: "center",
		}}
		>
			{renderedIcon}<Text style={{color: projectContrastColor}}>{props.text}</Text>
		</View>
	)
}