// Hinweis: Wenn neue SettingsList-Komponenten entstehen, bitte auch im Experimental-Screen hinzufügen.
import React from 'react';
import { StyleSheet, Text, TextStyle, TouchableOpacity, View, ViewStyle } from 'react-native';
import { useTheme } from '@/hooks/useTheme';
import { useSelector } from 'react-redux';
import { RootState } from '@/redux/reducer';
import { myContrastColor } from '@/helper/ColorHelper';
import { SettingsListProps } from './types';
import { borderRadiusContainer, horizontalScreenPadding } from '@/constants/Constants';

const padding = 0; // px used for additional padding and border radius
const basePaddingVertical = 10;

const SettingsList: React.FC<SettingsListProps> = ({ leftIcon, leftIconComponent, title, label, value, rightElement, rightIcon, onPress, handleFunction, iconBackgroundColor, iconBgColor, showSeparator = true, groupPosition, noIconIndent = false }) => {
        const { theme } = useTheme();
        const { primaryColor, selectedTheme } = useSelector((state: RootState) => state.settings);

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
                        : React.cloneElement(leftIcon, { color: iconColor })
                : leftIcon;

        const containerStyles: ViewStyle[] = [styles.container, { backgroundColor: theme.screen.iconBg } as ViewStyle];
        const iconWrapperStyles: ViewStyle[] = [styles.iconWrapper, { backgroundColor: iconBg }];

        if (iconBg?.toLowerCase() === 'transparent') {
                iconWrapperStyles.push(styles.transparentIconWrapper);
        }

	if (groupPosition === 'top') {
		containerStyles.push({
			borderTopLeftRadius: borderRadiusContainer,
			borderTopRightRadius: borderRadiusContainer,
			paddingTop: basePaddingVertical + padding,
		});
	} else if (groupPosition === 'bottom') {
		containerStyles.push({
			borderBottomLeftRadius: borderRadiusContainer,
			borderBottomRightRadius: borderRadiusContainer,
			paddingBottom: basePaddingVertical + padding,
		});
	} else if (groupPosition === 'single') {
		containerStyles.push({
			borderRadius: borderRadiusContainer,
			paddingTop: basePaddingVertical + padding,
			paddingBottom: basePaddingVertical + padding,
		});
	}

        return (
                <>
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
                                                <Text style={[styles.title, { color: theme.screen.text } as TextStyle]} numberOfLines={0}>
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
                        {showSeparator && <View style={[styles.separator, { backgroundColor: theme.screen.background, marginLeft: noIconIndent ? 0 : 54 }]} />}
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
});
