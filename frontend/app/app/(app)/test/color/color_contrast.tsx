import {StyleSheet} from 'react-native';
import {Text, View, useViewBackgroundColor} from '@/components/Themed';
import {
	getContrastRatio,
	useLighterOrDarkerColorForSelection,
	useMyContrastColor
} from '@/helper/color/MyContrastColor';
import {useProjectColor} from '@/states/ProjectInfo';

export default function HomeScreen() {
	const projectColor = useProjectColor()
	const projectContrastColor = useMyContrastColor(projectColor);
	const contrastRatioProjectContrastColor = getContrastRatio(projectColor, projectContrastColor)

	const viewBackgroundColor = useViewBackgroundColor()
	const myContrastColorBackground = useMyContrastColor(viewBackgroundColor)

	const darkerViewBackgroundColor = useLighterOrDarkerColorForSelection(viewBackgroundColor)
	const myContrastColorDarkerBackground = useMyContrastColor(darkerViewBackgroundColor)

	const contrastRatioViewBackgroundColorBlack = getContrastRatio(viewBackgroundColor, '#000000')
	const contrastRatioViewBackgroundColorWhite = getContrastRatio(viewBackgroundColor, '#FFFFFF')

	const contrastRatioDarkerViewBackgroundColorBlack = getContrastRatio(darkerViewBackgroundColor, '#000000')
	const contrastRatioDarkerViewBackgroundColorWhite = getContrastRatio(darkerViewBackgroundColor, '#FFFFFF')

	return (
		<View style={styles.container}>
			<Text style={styles.title}>Color Information</Text>
			<View style={{width: '100%', height: 20, backgroundColor: projectColor}}>
				<Text style={{color: projectContrastColor}}>{'contrastRatioProjectContrastColor: '+contrastRatioProjectContrastColor}</Text>
			</View>
			<Text>{'viewBackgroundColor: '+viewBackgroundColor}</Text>
			<View style={{width: 20, height: 20, backgroundColor: viewBackgroundColor}}></View>
			<Text>{'myContrastColorBackground: '+myContrastColorBackground}</Text>
			<View style={{width: 20, height: 20, backgroundColor: myContrastColorBackground}}></View>
			<Text>{'darkerViewBackgroundColor: '+darkerViewBackgroundColor}</Text>
			<View style={{width: 20, height: 20, backgroundColor: darkerViewBackgroundColor}}></View>
			<Text>{'myContrastColorDarkerBackground: '+myContrastColorDarkerBackground}</Text>
			<View style={{width: 20, height: 20, backgroundColor: myContrastColorDarkerBackground}}></View>
			<View style={{width: '100%', height: 20, backgroundColor: viewBackgroundColor}}>
				<Text style={{color: '#000000'}}>{'contrastRatioViewBackgroundColorBlack: '+contrastRatioViewBackgroundColorBlack}</Text>
			</View>
			<View style={{width: '100%', height: 20, backgroundColor: viewBackgroundColor}}>
				<Text style={{color: '#FFFFFF'}}>{'contrastRatioViewBackgroundColorWhite: '+contrastRatioViewBackgroundColorWhite}</Text>
			</View>
			<View style={{width: '100%', height: 20, backgroundColor: darkerViewBackgroundColor}}>
				<Text style={{color: '#000000'}}>{'contrastRatioDarkerViewBackgroundColorBlack: '+contrastRatioDarkerViewBackgroundColorBlack}</Text>
			</View>
			<View style={{width: '100%', height: 20, backgroundColor: darkerViewBackgroundColor}}>
				<Text style={{color: '#FFFFFF'}}>{'contrastRatioDarkerViewBackgroundColorWhite: '+contrastRatioDarkerViewBackgroundColorWhite}</Text>
			</View>


		</View>
	);
}

const styles = StyleSheet.create({
	container: {
		flex: 1,
	},
	title: {
		fontSize: 20,
		fontWeight: 'bold',
	},
	separator: {
		marginVertical: 30,
		height: 1,
		width: '80%',
	},
});
