import React, { useMemo } from 'react';
import { ActivityIndicator, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';
import { useSettingsContext } from '../../context/SettingsContext';
import { myContrastColor } from '../../helpers/ColorHelper';

export interface SettingsListLikeButtonProps {
	liked?: boolean | null;
	onPressLike: () => void;
	likeLoading?: boolean;
	likeCount?: number;
	primaryColor?: string;
}

const isWeb = Platform.OS === 'web';

const SettingsListLikeButton: React.FC<SettingsListLikeButtonProps> = ({
	liked,
	onPressLike,
	likeLoading = false,
	likeCount,
	primaryColor,
}) => {
	const { theme, isDark } = useTheme();
	const settingsCtx = useSettingsContext();
	const accentColor = primaryColor ?? settingsCtx?.primaryColor ?? theme.primary;
	const contrastColor = myContrastColor(accentColor, theme, isDark);
	const iconSize = isWeb ? 24 : 22;

	const buttonStyle = useMemo(
		() => [styles.likeButton, { borderColor: theme.screen.text }, liked ? { backgroundColor: accentColor } : undefined],
		[liked, accentColor, theme.screen.text]
	);

	return (
		<View style={styles.row}>
			<Pressable style={buttonStyle} onPress={onPressLike}>
				{likeLoading ? (
					<ActivityIndicator size={iconSize} color={accentColor} />
				) : (
					<MaterialCommunityIcons
						name={liked ? 'thumb-up' : 'thumb-up-outline'}
						size={iconSize}
						color={liked ? contrastColor : theme.screen.icon}
					/>
				)}
				{likeCount != null && likeCount > 0 && (
					<Text style={[styles.count, { color: liked ? contrastColor : theme.screen.text }]}>
						{likeCount}
					</Text>
				)}
			</Pressable>
		</View>
	);
};

export default React.memo(SettingsListLikeButton);

const styles = StyleSheet.create({
	row: {
		flexDirection: 'row',
		alignItems: 'center',
	},
	likeButton: {
		padding: 8,
		borderWidth: 1,
		borderRadius: 5,
		flexDirection: 'row',
		justifyContent: 'center',
		alignItems: 'center',
	},
	count: {
		fontSize: 14,
		marginLeft: 6,
	},
});
