// define button type which has a icon for left and right side with family and name and color
// also allow to set a callback for the button
// also allow the content to be a component

import {VStack} from '@gluestack-ui/themed';
import {Heading, Text, View, useViewBackgroundColor} from '@/components/Themed';
import {useLighterOrDarkerColorForSelection, useMyContrastColor} from '@/helper/color/MyContrastColor';
import {MyCard, MyCardDefaultBorderRadius, MyCardProps} from '@/components/card/MyCard';
import {useProjectColor} from "@/states/ProjectInfo";

export type MyCardWithTextProps = {
    heading?: string | null | undefined,
	viewBackgroundColor?: string,
	separatorColor?: string,
	textColor?: string,
    text?: string,
} & MyCardProps

// define the button component
export const MyCardWithText = ({heading, text, ...props}: MyCardWithTextProps) => {
	const projectColor = useProjectColor();
	const separatorColor = props.separatorColor || projectColor
	const defaultViewBackgroundColor = useViewBackgroundColor()


	let viewBackgroundColorForText = defaultViewBackgroundColor

	let lighterOrDarkerDefaultBackgroundColor = useLighterOrDarkerColorForSelection(defaultViewBackgroundColor)
	let textBoxColored = false;
	if(textBoxColored){
		viewBackgroundColorForText = lighterOrDarkerDefaultBackgroundColor
	}

	viewBackgroundColorForText = props.viewBackgroundColor || viewBackgroundColorForText
	let textContrastColor = useMyContrastColor(viewBackgroundColorForText)
	textContrastColor = props.textColor || textContrastColor

	const borderRaidus = props.borderRaidus || MyCardDefaultBorderRadius

	let renderedBottomComponent = null;

	let renderedHeading = null;
	if (heading) {
		renderedHeading = (
			<Heading style={{color: textContrastColor}} size="sm">
				{heading}
			</Heading>
		)
	}

	let renderedText = null;
	if (text) {
		renderedText = (
			<Text style={{color: textContrastColor}} my="$1.5" fontSize="$xs">
				{text}
			</Text>
		)
	}

	let renderedSeparator = null;
	if(!!projectColor){
		renderedSeparator = (
			<View style={{backgroundColor: separatorColor, width: '100%', height: 4}} />
		)

	}

	renderedBottomComponent = (
		<>
			{renderedSeparator}
			<View style={{backgroundColor: viewBackgroundColorForText, width: '100%', flexGrow: 1,
				borderBottomWidth: 1,
				borderLeftWidth: 1,
				borderRightWidth: 1,
				borderBottomEndRadius: borderRaidus,
				borderBottomStartRadius: borderRaidus,
				borderColor: lighterOrDarkerDefaultBackgroundColor,
			}}>
				<View style={{
					// px is padding left and right, py is padding top and bottom
					paddingHorizontal: borderRaidus/2, marginVertical: borderRaidus/2,
				}}
					//px={borderRaidus/2} pt={2} pb={borderRaidus/2}
				>

					{renderedHeading}
					{renderedText}
				</View>
			</View>
		</>
	)

	return (
		<MyCard {...props} bottomComponent={renderedBottomComponent} />
	)
}