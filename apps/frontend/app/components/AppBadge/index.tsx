import React from 'react';
import { StyleSheet, Text, View, ViewStyle, TextStyle } from 'react-native';

export interface AppBadgeProps {
	count: number;
	maxCount?: number;
	backgroundColor?: string;
	textColor?: string;
	style?: ViewStyle;
	textStyle?: TextStyle;
}

const AppBadge: React.FC<AppBadgeProps> = ({
	count,
	maxCount = 99,
	backgroundColor = 'red',
	textColor = 'white',
	style,
	textStyle,
}) => {
	if (count <= 0) return null;

	const displayValue = count > maxCount ? `${maxCount}+` : String(count);

	return (
		<View
			style={[
				styles.badge,
				{ backgroundColor },
				style,
			]}
		>
			<Text style={[styles.text, { color: textColor }, textStyle]}>
				{displayValue}
			</Text>
		</View>
	);
};

export default AppBadge;

const styles = StyleSheet.create({
	badge: {
		position: 'absolute',
		top: -4,
		right: -4,
		borderRadius: 8,
		minWidth: 16,
		height: 16,
		justifyContent: 'center',
		alignItems: 'center',
		paddingHorizontal: 2,
		zIndex: 10,
	},
	text: {
		fontSize: 10,
		fontFamily: 'Poppins_700Bold',
	},
});
