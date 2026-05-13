import React, { useMemo } from 'react';
import { ActivityIndicator, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';
import { useSettingsContext } from '../../context/SettingsContext';
import { myContrastColor } from '../../helpers/ColorHelper';

export interface LikeDislikeBaseProps {
	like: boolean | null | undefined;
	likeLoading?: boolean;
	dislikeLoading?: boolean;
	likeCount?: number;
	dislikeCount?: number;
}

export interface SettingsListLikeDislikeFastProps extends LikeDislikeBaseProps {
	onPressLike: () => void;
	onPressDislike: () => void;
	primaryColor?: string;
}

const isWeb = Platform.OS === 'web';

const SettingsListLikeDislikeFast: React.FC<SettingsListLikeDislikeFastProps> = ({
	like,
	onPressLike,
	onPressDislike,
	likeLoading = false,
	dislikeLoading = false,
	likeCount,
	dislikeCount,
	primaryColor,
}) => {
	const { theme, isDark } = useTheme();
	const settingsCtx = useSettingsContext();
	const accentColor = primaryColor ?? settingsCtx?.primaryColor ?? theme.primary;
	const contrastColor = myContrastColor(accentColor, theme, isDark);
	const iconSize = isWeb ? 24 : 22;

	const likeButtonStyle = useMemo(
		() => [styles.likeButton, { borderColor: theme.screen.text }, like ? { backgroundColor: accentColor } : undefined],
		[like, accentColor, theme.screen.text]
	);

	const dislikeButtonStyle = useMemo(
		() => [styles.dislikeButton, { borderColor: theme.screen.text }, like === false ? { backgroundColor: accentColor } : undefined],
		[like, accentColor, theme.screen.text]
	);

	return (
		<View style={styles.row}>
			<Pressable style={likeButtonStyle} onPress={onPressLike}>
				{likeLoading ? (
					<ActivityIndicator size={iconSize} color={accentColor} />
				) : (
					<MaterialCommunityIcons
						name={like ? 'thumb-up' : 'thumb-up-outline'}
						size={iconSize}
						color={like ? contrastColor : theme.screen.icon}
					/>
				)}
				{likeCount != null && likeCount > 0 && (
					<Text style={[styles.count, { color: like ? contrastColor : theme.screen.text }]}>
						{likeCount}
					</Text>
				)}
			</Pressable>

			<Pressable style={dislikeButtonStyle} onPress={onPressDislike}>
				{dislikeLoading ? (
					<ActivityIndicator size={iconSize} color={accentColor} />
				) : (
					<MaterialCommunityIcons
						name={like === false ? 'thumb-down' : 'thumb-down-outline'}
						size={iconSize}
						color={like === false ? contrastColor : theme.screen.icon}
					/>
				)}
				{dislikeCount != null && dislikeCount > 0 && (
					<Text style={[styles.count, { color: like === false ? contrastColor : theme.screen.text }]}>
						{dislikeCount}
					</Text>
				)}
			</Pressable>
		</View>
	);
};

export default React.memo(SettingsListLikeDislikeFast);

const styles = StyleSheet.create({
	row: {
		flexDirection: 'row',
		alignItems: 'center',
	},
	likeButton: {
		padding: 8,
		borderTopWidth: 1,
		borderBottomWidth: 1,
		borderLeftWidth: 1,
		borderRightWidth: 0,
		borderTopLeftRadius: 5,
		borderBottomLeftRadius: 5,
		flexDirection: 'row',
		justifyContent: 'center',
		alignItems: 'center',
	},
	dislikeButton: {
		padding: 8,
		borderTopWidth: 1,
		borderBottomWidth: 1,
		borderRightWidth: 1,
		borderLeftWidth: 1,
		borderTopRightRadius: 5,
		borderBottomRightRadius: 5,
		flexDirection: 'row',
		justifyContent: 'center',
		alignItems: 'center',
	},
	count: {
		fontSize: 14,
		marginLeft: 6,
	},
});
