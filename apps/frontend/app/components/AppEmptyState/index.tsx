import React from 'react';
import { StyleSheet, Text, View, ViewStyle } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '@/hooks/useTheme';
import useLanguageTextAlign from '@/hooks/useLanguageTextAlign';

export interface AppEmptyStateProps {
	message: string;
	description?: string;
	iconName?: React.ComponentProps<typeof MaterialCommunityIcons>['name'] | null;
	iconSize?: number;
	iconColor?: string;
	style?: ViewStyle;
}

const AppEmptyState: React.FC<AppEmptyStateProps> = ({
	message,
	description,
	iconName = 'tray-remove',
	iconSize = 48,
	iconColor,
	style,
}) => {
	const { theme } = useTheme();
	const textAlign = useLanguageTextAlign();
	const resolvedIconColor = iconColor ?? theme.screen.icon;

	return (
		<View style={[styles.container, style]}>
			{iconName ? (
				<MaterialCommunityIcons
					name={iconName}
					size={iconSize}
					color={resolvedIconColor}
					style={styles.icon}
				/>
			) : null}
			<Text style={[styles.message, { color: theme.screen.text, textAlign }]}>
				{message}
			</Text>
			{description ? (
				<Text style={[styles.description, { color: theme.screen.icon, textAlign }]}>
					{description}
				</Text>
			) : null}
		</View>
	);
};

export default AppEmptyState;

const styles = StyleSheet.create({
	container: {
		flex: 1,
		alignItems: 'center',
		justifyContent: 'center',
		paddingVertical: 40,
		paddingHorizontal: 20,
		gap: 12,
	},
	icon: {
		opacity: 0.6,
	},
	message: {
		fontSize: 16,
		fontFamily: 'Poppins_400Regular',
		textAlign: 'center',
	},
	description: {
		fontSize: 13,
		fontFamily: 'Poppins_400Regular',
		textAlign: 'center',
		opacity: 0.7,
	},
});
