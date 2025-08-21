import React from 'react';
import {
	StyleSheet,
	Text,
	TextStyle,
	TouchableOpacity,
	View,
	ViewStyle,
} from 'react-native';
import { useTheme } from '@/hooks/useTheme';
import { useSelector } from 'react-redux';
import { RootState } from '@/redux/reducer';
import { myContrastColor } from '@/helper/colorHelper';
import { SettingsListProps } from './types';

const padding = 0; // px used for additional padding and border radius
const borderRadius = 10;
const basePaddingVertical = 10;

const SettingsList: React.FC<SettingsListProps> = ({
	leftIcon,
	title,
	label,
	value,
	rightElement,
	rightIcon,
	onPress,
	handleFunction,
	iconBackgroundColor,
	iconBgColor,
	showSeparator = true,
	groupPosition,
}) => {
	const { theme } = useTheme();
	const { primaryColor, selectedTheme } = useSelector(
		(state: RootState) => state.settings
	);

	const pressHandler = onPress || handleFunction;
	const Container: any = pressHandler ? TouchableOpacity : View;
	const iconBg = iconBackgroundColor || iconBgColor || primaryColor;
	const iconColor = myContrastColor(iconBg, theme, selectedTheme === 'dark');

	const containerStyles: ViewStyle[] = [
		styles.container,
		{ backgroundColor: theme.screen.iconBg } as ViewStyle,
	];

	if (groupPosition === 'top') {
		containerStyles.push({
			borderTopLeftRadius: borderRadius,
			borderTopRightRadius: borderRadius,
			paddingTop: basePaddingVertical + padding,
		});
	} else if (groupPosition === 'bottom') {
		containerStyles.push({
			borderBottomLeftRadius: borderRadius,
			borderBottomRightRadius: borderRadius,
			paddingBottom: basePaddingVertical + padding,
		});
	} else if (groupPosition === 'single') {
		containerStyles.push({
			borderRadius: borderRadius,
			paddingTop: basePaddingVertical + padding,
			paddingBottom: basePaddingVertical + padding,
		});
	}

	return (
		<>
			<Container onPress={pressHandler} style={containerStyles}>
				<View style={[styles.iconWrapper, { backgroundColor: iconBg }]}>
					{React.isValidElement(leftIcon)
						? React.cloneElement(leftIcon, { color: iconColor })
						: leftIcon}
				</View>
				<View style={styles.textWrapper}>
					<View style={styles.titleContainer}>
						<Text
							style={[styles.title, { color: theme.screen.text } as TextStyle]}
							numberOfLines={0}
						>
							{title || label}
						</Text>
					</View>
					{value ? (
						<View style={styles.valueContainer}>
							<Text
								style={[styles.value, { color: theme.screen.text } as TextStyle]}
								numberOfLines={0}
							>
								{value}
							</Text>
						</View>
					) : null}
				</View>
				{rightElement || rightIcon ? (
					<View style={styles.rightWrapper}>{rightElement || rightIcon}</View>
				) : null}
			</Container>
			{showSeparator && (
				<View
					style={[
						styles.separator,
						{ backgroundColor: theme.screen.background, marginLeft: 54 },
					]}
				/>
			)}
		</>
	);
};

export default SettingsList;

const styles = StyleSheet.create({
	container: {
		flexDirection: 'row',
		width: '100%',
		alignItems: 'center',
		paddingHorizontal: 16,
		paddingVertical: basePaddingVertical,
	},
	iconWrapper: {
		width: 34,
		height: 34,
		borderRadius: 8,
		alignItems: 'center',
		justifyContent: 'center',
		marginRight: 10,
	},
	textWrapper: {
		flexDirection: 'row',
		flexWrap: 'wrap',
		alignItems: 'center', // statt flex-start, damit beide Container mittig sind
		columnGap: 3,
		flex: 1,
	},
	titleContainer: {
		flexShrink: 1,
		flexGrow: 1,
		minWidth: 0,
	},
	valueContainer: {
		flexShrink: 1,
		flexGrow: 1,
		justifyContent: 'center', // sorgt für vertikale Zentrierung
		alignItems: 'flex-end', // sorgt für horizontale Ausrichtung nach rechts
	},
	value: {
		fontSize: 13,
		textAlign: 'right', // Text rechtsbündig
	},
	rightWrapper: {
		width: 34,
		height: 34,
		borderRadius: 8,
		alignItems: 'center',
		justifyContent: 'center',
		marginLeft: 5,
	},
	separator: {
		width: '100%',
		height: StyleSheet.hairlineWidth,
	},
});
