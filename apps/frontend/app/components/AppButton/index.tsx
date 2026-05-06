import React from 'react';
import { ActivityIndicator, Appearance, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useAppSelector } from '@/redux/hooks';
import { myContrastColor } from '@/helper/ColorHelper';
import { darkTheme, lightTheme } from '@/styles/themes';
import { AppButtonProps } from './types';

const AppButton: React.FC<AppButtonProps> = ({
	text,
	onPress,
	variant = 'primary',
	iconLeft,
	iconRight,
	style,
	textStyle,
	activeOpacity,
	usePlainText = false,
	loadingIndicatorColor,
	loadingIndicatorSize,
	disabled = false,
	loading = false,
}) => {
	const { primaryColor, selectedTheme } = useAppSelector((state) => state.settings);
	const colorScheme = Appearance.getColorScheme();
	const theme = selectedTheme === 'systematic' ? (colorScheme === 'dark' ? darkTheme : lightTheme) : selectedTheme === 'dark' ? darkTheme : lightTheme;

	const contrastColor = myContrastColor(primaryColor, theme, selectedTheme === 'dark');
	const resolvedText = typeof text === 'string' || typeof text === 'number' ? String(text) : '';
	const resolvedIconLeft =
		React.isValidElement(iconLeft) || Array.isArray(iconLeft) || typeof iconLeft === 'string' || typeof iconLeft === 'number' ? iconLeft : null;
	const resolvedIconRight =
		React.isValidElement(iconRight) || Array.isArray(iconRight) || typeof iconRight === 'string' || typeof iconRight === 'number' ? iconRight : null;

	const getBackgroundColor = () => {
		if (variant === 'primary') return primaryColor;
		if (variant === 'outline') return 'transparent';
		return 'transparent';
	};

	const getTextColor = () => {
		if (variant === 'primary') return contrastColor;
		if (variant === 'outline') return primaryColor;
		return theme.screen.text;
	};

	const getBorderColor = () => {
		if (variant === 'outline') return primaryColor;
		return 'transparent';
	};

	return (
		<TouchableOpacity
			style={[
				variant !== 'ghost' ? styles.container : null,
				{
					backgroundColor: getBackgroundColor(),
					borderColor: getBorderColor(),
					borderWidth: variant === 'outline' ? 1 : 0,
					opacity: disabled ? 0.6 : 1,
				},
				style,
			]}
			onPress={onPress}
			disabled={disabled || loading}
			activeOpacity={0.7}
		>
			{loading ? (
				<ActivityIndicator color={loadingIndicatorColor ?? getTextColor()} size={loadingIndicatorSize} />
			) : (
				<>
					{resolvedIconLeft ? <View>{resolvedIconLeft}</View> : null}
					<Text style={[usePlainText ? null : styles.label, { color: getTextColor() }, textStyle]}>{resolvedText}</Text>
					{resolvedIconRight ? <View>{resolvedIconRight}</View> : null}
				</>
			)}
		</TouchableOpacity>
	);
};

const styles = StyleSheet.create({
	container: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'center',
		borderRadius: 10,
		marginVertical: 20,
		gap: 10,
		paddingHorizontal: 18,
		height: 43,
	},
	label: {
		fontSize: 16,
		fontFamily: 'Poppins_400Regular',
	},
});

export default AppButton;
