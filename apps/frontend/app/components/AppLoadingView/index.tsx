import React from 'react';
import { ActivityIndicator, StyleSheet, Text, View, ViewStyle } from 'react-native';
import { useTheme } from '@/hooks/useTheme';
import useLanguageTextAlign from '@/hooks/useLanguageTextAlign';

export interface AppLoadingViewProps {
	message?: string;
	size?: 'small' | 'large' | number;
	color?: string;
	height?: number;
	style?: ViewStyle;
}

const AppLoadingView: React.FC<AppLoadingViewProps> = ({
	message,
	size = 30,
	color,
	height = 200,
	style,
}) => {
	const { theme } = useTheme();
	const textAlign = useLanguageTextAlign();
	const resolvedColor = color ?? theme.screen.text;

	const spinnerSize = typeof size === 'number' ? size : size;

	return (
		<View style={[styles.container, { height }, style]}>
			<ActivityIndicator size={spinnerSize} color={resolvedColor} />
			{message ? (
				<Text style={[styles.message, { color: theme.screen.text, textAlign }]}>
					{message}
				</Text>
			) : null}
		</View>
	);
};

export default AppLoadingView;

const styles = StyleSheet.create({
	container: {
		width: '100%',
		justifyContent: 'center',
		alignItems: 'center',
		gap: 12,
		padding: 20,
	},
	message: {
		fontSize: 14,
		fontFamily: 'Poppins_400Regular',
		opacity: 0.8,
	},
});
