import React from 'react';
import { TouchableOpacity, View, StyleSheet, ViewStyle } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useTheme } from '@/hooks/useTheme';
import AppBadge from '@/components/AppBadge';

export interface AppFormQueueButtonProps {
	count: number;
	iconColor?: string;
	iconSize?: number;
	buttonStyle?: ViewStyle;
}

const AppFormQueueButton: React.FC<AppFormQueueButtonProps> = ({
	count,
	iconColor,
	iconSize = 22,
	buttonStyle,
}) => {
	const { theme } = useTheme();
	const resolvedIconColor = iconColor ?? theme.screen.icon;

	return (
		<TouchableOpacity
			onPress={() => router.push('/form-queue')}
			style={[styles.button, { backgroundColor: theme.screen.iconBg }, buttonStyle]}
		>
			<View>
				<MaterialCommunityIcons
					name="clock-outline"
					size={iconSize}
					color={resolvedIconColor}
				/>
				<AppBadge count={count} />
			</View>
		</TouchableOpacity>
	);
};

export default AppFormQueueButton;

const styles = StyleSheet.create({
	button: {
		padding: 10,
		borderRadius: 20,
	},
});
