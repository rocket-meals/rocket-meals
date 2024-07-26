import {BreakPoint, BreakPointsDictionary, useBreakPointValue} from '@/helper/device/DeviceHelper';
import {View} from '@/components/Themed';
import {Rectangle} from '@/components/shapes/Rectangle';
import {DimensionValue} from 'react-native';
import notAllowed from '@/assets/animations/NotAllowed.json';
import {TranslationKeys, useTranslation} from '@/helper/translations/Translation';
import {MyProjectColoredLottieAnimation} from '@/components/lottie/MyProjectColoredLottieAnimation';

export const NotAllowed = ({children,...props}: any) => {
	const animationSource = notAllowed;
	const translation_animation = useTranslation(TranslationKeys.animation);
	const translation_nameOfTheAnimation = useTranslation(TranslationKeys.no_permission_for);
	const accessibilityLabel = translation_animation + ': ' + translation_nameOfTheAnimation;

	const noFoundWidths: BreakPointsDictionary<DimensionValue> = {
		[BreakPoint.sm]: '50%',
		[BreakPoint.md]: '20%',
		[BreakPoint.lg]: '10%',
	}
	const noFoundWidth = useBreakPointValue<DimensionValue>(noFoundWidths);

	return (
		<View style={{width: '100%', alignItems: 'center'}}>
			<View style={{width: noFoundWidth}}>
				<Rectangle>
					<MyProjectColoredLottieAnimation style={{
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
