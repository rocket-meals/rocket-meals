import React, {FunctionComponent} from 'react';
import {ListRenderItemInfo, View} from 'react-native';
import {ColorHelper} from '@/components/colorpicker/ColorHelper';
import {MyGridFlatList} from '@/components/grid/MyGridFlatList';
import {useBreakPointValue} from '@/helper/device/DeviceHelper';
import {ViewWithPercentageSupport} from '@/components/ViewWithPercentageSupport';
import {MyTouchableOpacity} from '@/components/buttons/MyTouchableOpacity';
import {TranslationKeys, useTranslation} from '@/helper/translations/Translation';
import {useMyContrastColor} from "@/helper/color/MyContrastColor";
import {Icon} from "@/components/Themed";
import {IconNames} from "@/constants/IconNames";


const ColorPickItem: FunctionComponent<{color: string, isActive: boolean, backgroundColor: string | undefined | null, onPress: (color: string) => void}> = (props) => {
	const [dimensions, setDimensions] = React.useState({ width: 0, height: 0 });

	const translation_select = useTranslation(TranslationKeys.select)
	const translation_color = useTranslation(TranslationKeys.color)


	let selectedColor = props.color

	const outerContrastToBackgroundColor = useMyContrastColor(props.backgroundColor)
	const outerContrastToSelectedColor = useMyContrastColor(selectedColor)

	const renderedIconCheck = ! props.isActive ? null : <Icon name={IconNames.confirm_icon} color={outerContrastToSelectedColor} />



	const color = props.color;

	const outerColorBorderWidth = 5

	const accessibilityLabel = translation_select + ' ' + translation_color + ': ' + color;


	return (
		<View style={{
			width: '100%',
			height: dimensions.width,
			alignItems: 'center',
			justifyContent: 'center',
		}}
		onLayout={event => {
			const { width, height } = event.nativeEvent.layout;
			setDimensions({ width, height });
		}}
		>
			<MyTouchableOpacity style={{width: '100%', height: '100%', alignItems: 'center', justifyContent: 'center'}}
				onPress={() => {
					props.onPress(color);
				}}
				accessibilityLabel={accessibilityLabel}
			>
				<ViewWithPercentageSupport style={{backgroundColor: outerContrastToBackgroundColor, borderColor: outerContrastToBackgroundColor, borderWidth: outerColorBorderWidth, width: '100%', height: '100%', justifyContent: "center", alignItems: "center"}} >
					<ViewWithPercentageSupport style={{backgroundColor: color, width: '100%', height: '100%', justifyContent: "center", alignItems: "center"}} >
						{renderedIconCheck}
					</ViewWithPercentageSupport>
				</ViewWithPercentageSupport>
			</MyTouchableOpacity>
		</View>
	)
}

interface SimpleColorPickerProps {
	onColorChange: (color: string) => void;
	currentColor: string | undefined | null;
	backgroundColor: string | undefined | null;
}
export const SimpleColorPicker: FunctionComponent<SimpleColorPickerProps> = (props) => {
	const amountColumns = useBreakPointValue({sm: 5, md: 6, lg: 7, xl: 16});

	async function onPress(color: string) {
		if (props?.onColorChange) {
			await props.onColorChange(color);
		}
	}

	const steps = 20;
	const colors = ColorHelper.getHueColors(steps)
	type DataItem = { key: string; data: string }

	const data: DataItem[] = []
	if (colors) {
		for (let i = 0; i < colors.length; i++) {
			const resource = colors[i];
			data.push({
				key: resource + '', data: resource
			})
		}
	}

	const renderItem = (info: ListRenderItemInfo<DataItem>) => {
		const {item, index} = info;
		const color = item.data;
		const isActive = color === props.currentColor;
		return <ColorPickItem color={color} onPress={onPress} isActive={isActive} backgroundColor={props.backgroundColor} />
	}

	return <MyGridFlatList data={data} renderItem={renderItem} amountColumns={amountColumns} />
}
