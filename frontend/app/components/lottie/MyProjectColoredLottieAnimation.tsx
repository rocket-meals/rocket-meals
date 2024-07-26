import React from 'react';
import {
	DEFAULT_COLOR_DARKER_TO_BE_REPLACED,
	DEFAULT_COLOR_LIGHTER_TO_BE_REPLACED,
	DEFAULT_COLOR_TO_BE_REPLACED,
	DEFAULT_COLOR_TO_REPLACE_WITH,
	MyLottieAnimation,
	MyLottieAnimationProps
} from '@/components/lottie/MyLottieAnimation';
import {useProjectColor} from '@/states/ProjectInfo';
import {useColorForSelectionWithOption, useLighterOrDarkerColorForSelection} from "@/helper/color/MyContrastColor";

/**
 * A component that displays a Lottie animation, but automatically applies a color replacement based on the project colors
 */
export const MyProjectColoredLottieAnimation = ({colorReplaceMap, ...props}: MyLottieAnimationProps) => {
	const projectColor = useProjectColor();
	const usedProjectColor = props.projectColor || projectColor

	const lighterProjectColor = useColorForSelectionWithOption(usedProjectColor, true)
	const darkerProjectColor = useColorForSelectionWithOption(usedProjectColor, false)

	let usedColorReplaceMap = colorReplaceMap;
	if (!usedColorReplaceMap) {
		usedColorReplaceMap = {}
	}

	if (!usedColorReplaceMap[DEFAULT_COLOR_TO_BE_REPLACED]) {
		usedColorReplaceMap[DEFAULT_COLOR_TO_BE_REPLACED] = usedProjectColor
	}
	if(!usedColorReplaceMap[DEFAULT_COLOR_LIGHTER_TO_BE_REPLACED]) {
		usedColorReplaceMap[DEFAULT_COLOR_LIGHTER_TO_BE_REPLACED] = lighterProjectColor
	}
	if(!usedColorReplaceMap[DEFAULT_COLOR_DARKER_TO_BE_REPLACED]) {
		usedColorReplaceMap[DEFAULT_COLOR_DARKER_TO_BE_REPLACED] = darkerProjectColor
	}

	// check every color and if it is not a hex color, remove it
	for (let key in usedColorReplaceMap) {
		if (!/^#[0-9A-F]{6}$/i.test(key)) {
			delete usedColorReplaceMap[key]
		}
		if (!/^#[0-9A-F]{6}$/i.test(usedColorReplaceMap[key])) {
			delete usedColorReplaceMap[key]
		}
	}

	return <MyLottieAnimation {...props} colorReplaceMap={usedColorReplaceMap} />
}
