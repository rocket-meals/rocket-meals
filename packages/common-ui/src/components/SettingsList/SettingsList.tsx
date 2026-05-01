// Hinweis: Wenn neue SettingsList-Komponenten entstehen, bitte auch im Experimental-Screen hinzufügen.
import React from 'react';
import { StyleSheet, Text, TextStyle, TouchableOpacity, View, ViewStyle } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';
import { useSettingsContext } from '../../context/SettingsContext';
import { myContrastColor } from '../../helpers/ColorHelper';
import { accountRequiredStyles } from '../../helpers/accountRequiredStyles';
import { borderRadiusContainer, horizontalScreenPadding } from '../../constants/ui';
import { lightTheme } from '../../themes';
import { SettingsListProps } from './types';

const padding = 0;
const basePaddingVertical = 10;

const SettingsList: React.FC<SettingsListProps> = ({
	leftIcon,
	leftIconComponent,
	title,
	label,
	value,
	rightElement,
	rightIcon,
	onPress,
	handleFunction,
	iconBackgroundColor,
	iconBgColor,
	primaryColor,
	showSeparator = true,
	groupPosition,
	noIconIndent = false,
	italic = false,
	titleNumberOfLines = 0,
	isAccountRequired = false,
	onAccountRequired,
}) => {
	const { theme, isDark } = useTheme();
	const settingsCtx = useSettingsContext();
	const resolvedPrimaryColor = primaryColor ?? settingsCtx?.primaryColor ?? lightTheme.primary;

	const pressHandler = isAccountRequired
		? (onAccountRequired ?? settingsCtx?.onAccountRequired)
		: (onPress || handleFunction);
	const Container: any = pressHandler ? TouchableOpacity : View;
	const iconBg = iconBackgroundColor || iconBgColor || resolvedPrimaryColor;
	const iconColor = myContrastColor(iconBg, theme, isDark);

	const hasIcon = !!leftIconComponent || !!leftIcon;
	const showIconWrapper = hasIcon && !noIconIndent;
	const shouldReserveIconSpace = !hasIcon && !noIconIndent;

	const renderedLeftIcon = React.isValidElement(leftIcon)
		? noIconIndent
			? leftIcon
			: React.cloneElement(leftIcon as any, { color: iconColor })
		: leftIcon;

	const containerStyles: ViewStyle[] = [styles.container, { backgroundColor: theme.screen.iconBg } as ViewStyle];
	const iconWrapperStyles: ViewStyle[] = [styles.iconWrapper, { backgroundColor: iconBg }];

	if (iconBg?.toLowerCase() === 'transparent') {
		iconWrapperStyles.push(styles.transparentIconWrapper);
	}

	let wrapperBorderRadius: ViewStyle = {};

	if (groupPosition === 'top') {
		containerStyles.push({
			borderTopLeftRadius: borderRadiusContainer,
			borderTopRightRadius: borderRadiusContainer,
			paddingTop: basePaddingVertical + padding,
		});
		wrapperBorderRadius = { borderTopLeftRadius: borderRadiusContainer, borderTopRightRadius: borderRadiusContainer };
	} else if (groupPosition === 'bottom') {
		containerStyles.push({
			borderBottomLeftRadius: borderRadiusContainer,
			borderBottomRightRadius: borderRadiusContainer,
			paddingBottom: basePaddingVertical + padding,
		});
		wrapperBorderRadius = { borderBottomLeftRadius: borderRadiusContainer, borderBottomRightRadius: borderRadiusContainer };
	} else if (groupPosition === 'single') {
		containerStyles.push({
			borderRadius: borderRadiusContainer,
			paddingTop: basePaddingVertical + padding,
			paddingBottom: basePaddingVertical + padding,
		});
		wrapperBorderRadius = { borderRadius: borderRadiusContainer };
	}

	const inner = (
		<Container onPress={pressHandler} style={containerStyles}>
			{showIconWrapper ? (
				leftIconComponent ? (
					leftIconComponent
				) : (
					<View style={iconWrapperStyles}>{renderedLeftIcon}</View>
				)
			) : hasIcon ? (
				leftIconComponent ? leftIconComponent : renderedLeftIcon
			) : null}
			{shouldReserveIconSpace ? <View style={styles.iconPlaceholder} /> : null}
			<View style={styles.textWrapper}>
				<View style={styles.titleContainer}>
					<Text selectable style={[styles.title, { color: theme.screen.text, fontStyle: italic ? 'italic' : 'normal' } as TextStyle]} numberOfLines={titleNumberOfLines} ellipsizeMode="tail">
						{title || label}
					</Text>
				</View>
				{value ? (
					<View style={styles.valueContainer}>
						<Text selectable style={[styles.value, { color: theme.screen.text } as TextStyle]} numberOfLines={0}>
							{value}
						</Text>
					</View>
				) : null}
			</View>
			{rightElement || rightIcon ? <View style={styles.rightWrapper}>{rightElement || rightIcon}</View> : null}
		</Container>
	);

	const separator = showSeparator ? <View style={[styles.separator, { backgroundColor: theme.screen.background, marginLeft: noIconIndent ? 0 : 54 }]} /> : null;

	const accountRequiredBorderStyle: ViewStyle =
		groupPosition === 'middle' || groupPosition === 'bottom'
			? { borderLeftWidth: 2, borderRightWidth: 2, borderBottomWidth: 2 }
			: { borderWidth: 2 };

	if (isAccountRequired) {
		return (
			<>
				<View style={[accountRequiredStyles.wrapper, wrapperBorderRadius, accountRequiredBorderStyle, { borderColor: resolvedPrimaryColor }]}>
					{inner}
					<View
						pointerEvents="none"
						style={[StyleSheet.absoluteFill, accountRequiredStyles.dimOverlay, wrapperBorderRadius]}
					>
						<MaterialCommunityIcons name="lock" size={28} color="#fff" />
					</View>
				</View>
				{separator}
			</>
		);
	}

	return (
		<>
			{inner}
			{separator}
		</>
	);
};

export default SettingsList;

const styles = StyleSheet.create({
	container: {
		flexDirection: 'row',
		width: '100%',
		alignItems: 'center',
		paddingHorizontal: horizontalScreenPadding,
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
	transparentIconWrapper: {
		width: undefined,
		height: undefined,
		marginRight: 12,
		borderRadius: 0,
		padding: 0,
	},
	iconPlaceholder: {
		width: 34,
		height: 34,
		marginRight: 10,
	},
	textWrapper: {
		flexDirection: 'row',
		flexWrap: 'wrap',
		alignItems: 'center',
		columnGap: 3,
		flex: 1,
	},
	title: {
		fontSize: 15,
	},
	titleContainer: {
		flexShrink: 1,
		flexGrow: 1,
		minWidth: 0,
	},
	valueContainer: {
		flexShrink: 1,
		flexGrow: 1,
		justifyContent: 'center',
		alignItems: 'flex-end',
	},
	value: {
		fontSize: 13,
		textAlign: 'right',
	},
	rightWrapper: {
		minWidth: 34,
		minHeight: 34,
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
