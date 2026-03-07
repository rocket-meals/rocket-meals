// Hinweis: Wenn neue SettingsList-Komponenten entstehen, bitte auch im Experimental-Screen hinzufügen.
import React from 'react';
import { StyleSheet, Text, TextStyle, TouchableOpacity, View, ViewStyle } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '@/hooks/useTheme';
import { useAppSelector } from '@/redux/hooks';
import { myContrastColor } from '@/helper/ColorHelper';
import { SettingsListProps } from './types';
import { borderRadiusContainer, horizontalScreenPadding } from '@/constants/Constants';
import useRatingPermissionModal from '@/hooks/useRatingPermissionModal';

const padding = 0; // px used for additional padding and border radius
const basePaddingVertical = 10;

const SettingsList: React.FC<SettingsListProps> = ({ leftIcon, leftIconComponent, title, label, value, rightElement, rightIcon, onPress, handleFunction, iconBackgroundColor, iconBgColor, showSeparator = true, groupPosition, noIconIndent = false, italic = false, isAccountRequired = false }) => {
        const { theme } = useTheme();
        const { primaryColor, selectedTheme } = useAppSelector((state) => state.settings);
        const user = useAppSelector((state) => state.authReducer.user);
        const { openRatingPermissionModal } = useRatingPermissionModal();

        const pressHandler = onPress || handleFunction;
        const Container: any = pressHandler ? TouchableOpacity : View;
        const iconBg = iconBackgroundColor || iconBgColor || primaryColor;
        const iconColor = myContrastColor(iconBg, theme, selectedTheme === 'dark');

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
					<Text style={[styles.title, { color: theme.screen.text, fontStyle: italic ? 'italic' : 'normal' } as TextStyle]} numberOfLines={0}>
						{title || label}
					</Text>
				</View>
				{value ? (
					<View style={styles.valueContainer}>
						<Text style={[styles.value, { color: theme.screen.text } as TextStyle]} numberOfLines={0}>
							{value}
						</Text>
					</View>
				) : null}
			</View>
			{rightElement || rightIcon ? <View style={styles.rightWrapper}>{rightElement || rightIcon}</View> : null}
		</Container>
	);

	const separator = showSeparator ? <View style={[styles.separator, { backgroundColor: theme.screen.background, marginLeft: noIconIndent ? 0 : 54 }]} /> : null;

	if (isAccountRequired && !user?.id) {
		return (
			<>
				<View style={[styles.accountRequiredWrapper, wrapperBorderRadius, { borderColor: primaryColor }]}>
					{inner}
					<TouchableOpacity
						onPress={openRatingPermissionModal}
						activeOpacity={0.8}
						style={[StyleSheet.absoluteFill, styles.dimOverlay, wrapperBorderRadius]}
					>
						<MaterialCommunityIcons name="lock" size={28} color="#fff" />
					</TouchableOpacity>
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
		alignItems: 'center', // statt flex-start, damit beide Container mittig sind
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
		justifyContent: 'center', // sorgt für vertikale Zentrierung
		alignItems: 'flex-end', // sorgt für horizontale Ausrichtung nach rechts
	},
	value: {
		fontSize: 13,
		textAlign: 'right', // Text rechtsbündig
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
	accountRequiredWrapper: {
		position: 'relative',
		overflow: 'hidden',
		borderWidth: 2,
		borderStyle: 'dashed',
	},
	dimOverlay: {
		backgroundColor: 'rgba(128,128,128,0.45)',
		justifyContent: 'center',
		alignItems: 'center',
	},
});
