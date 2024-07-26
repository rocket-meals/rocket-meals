
import {BreakPoint, BreakPointsDictionary, useBreakPointValue} from '@/helper/device/DeviceHelper';
import {View} from '@/components/Themed';
import {Rectangle} from '@/components/shapes/Rectangle';
import animation_thinking from '@/assets/animations/animation_thinking.json';
import {DimensionValue} from 'react-native';
import {MyProjectColoredLottieAnimation} from '@/components/lottie/MyProjectColoredLottieAnimation';
import {TranslationKeys, useTranslation} from '@/helper/translations/Translation';
import {StyleProp} from "react-native/Libraries/StyleSheet/StyleSheet";
import {ViewStyle} from "react-native/Libraries/StyleSheet/StyleSheetTypes";


export type AnimationThinkingProps = {
	color?: string,
	children?: React.ReactNode | React.ReactNode[]
}
export const AnimationThinking = ({children,...props}: AnimationThinkingProps) => {
	const animationSource = animation_thinking;
	const translation_animation = useTranslation(TranslationKeys.animation);
	const translation_image = useTranslation(TranslationKeys.no_data_currently_calculating);
	const accessibilityLabel = translation_animation + ': ' + translation_image;

	const noFoundWidths: BreakPointsDictionary<DimensionValue> = {
		[BreakPoint.sm]: '70%',
		[BreakPoint.md]: '30%',
	}
	const noFoundWidth = useBreakPointValue<DimensionValue>(noFoundWidths);

	return (
		<View style={{width: '100%', alignItems: 'center'}}>
			<View style={{width: noFoundWidth}}>
				<Rectangle aspectRatio={1}>
					<MyProjectColoredLottieAnimation projectColor={props.color} style={{
						width: '100%',
						height: '100%'
					}}
					source={animationSource}
					accessibilityLabel={accessibilityLabel}
					/>
				</Rectangle>
			</View>
		</View>
	)
}
