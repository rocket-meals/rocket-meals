import React from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { CustomTooltip, TooltipContent, TooltipText } from '@/components/CustomTooltip';
import { useTheme } from '@/hooks/useTheme';
import { useAppSelector } from '@/redux/hooks';
import { myContrastColor } from '@/helper/ColorHelper';
import { isWeb } from '@/constants/Constants';
import { SettingsListLikeDislikeProps } from './types';
import { ComponentIds } from '@/constants/ComponentIds';

const SettingsListLikeDislike: React.FC<SettingsListLikeDislikeProps> = ({
	like,
	onPressLike,
	onPressDislike,
	likeTooltipText,
	dislikeTooltipText,
	likeLoading = false,
	dislikeLoading = false,
	likeCount,
	dislikeCount,
}) => {
	const { theme } = useTheme();
	const { primaryColor, appSettings, selectedTheme: mode } = useAppSelector((state) => state.settings);
	const foods_area_color = appSettings?.foods_area_color ? appSettings?.foods_area_color : primaryColor;
	const contrastColor = myContrastColor(foods_area_color, theme, mode === 'dark');
	const iconSize = isWeb ? 24 : 22;

	return (
		<View style={styles.row}>
			<CustomTooltip
				placement="top"
				trigger={triggerProps => (
					<Pressable
						{...triggerProps}
						nativeID={ComponentIds.MARKING_LIKE_BUTTON}
						style={{
							...styles.likeButton,
							backgroundColor: like ? foods_area_color : undefined,
						}}
						onPress={onPressLike}
					>
						{likeLoading ? (
							<ActivityIndicator size={iconSize} color={foods_area_color} />
						) : (
							<MaterialCommunityIcons
								name={like ? 'thumb-up' : 'thumb-up-outline'}
								size={iconSize}
								color={like ? contrastColor : theme.screen.icon}
							/>
						)}
						{likeCount != null && likeCount > 0 && (
							<Text style={[styles.count, { color: like ? contrastColor : theme.screen.text }]}>{likeCount}</Text>
						)}
					</Pressable>
				)}
			>
				{likeTooltipText ? (
					<TooltipContent bg={theme.tooltip.background} py="$1" px="$2">
						<TooltipText fontSize="$sm" color={theme.tooltip.text}>
							{likeTooltipText}
						</TooltipText>
					</TooltipContent>
				) : <></>}
			</CustomTooltip>

			<CustomTooltip
				placement="top"
				trigger={triggerProps => (
					<Pressable
						{...triggerProps}
						nativeID={ComponentIds.MARKING_DISLIKE_BUTTON}
						style={{
							...styles.dislikeButton,
							backgroundColor: like === false ? foods_area_color : undefined,
						}}
						onPress={onPressDislike}
					>
						{dislikeLoading ? (
							<ActivityIndicator size={iconSize} color={foods_area_color} />
						) : (
							<MaterialCommunityIcons
								name={like === false ? 'thumb-down' : 'thumb-down-outline'}
								size={iconSize}
								color={like === false ? contrastColor : theme.screen.icon}
							/>
						)}
						{dislikeCount != null && dislikeCount > 0 && (
							<Text style={[styles.count, { color: like === false ? contrastColor : theme.screen.text }]}>{dislikeCount}</Text>
						)}
					</Pressable>
				)}
			>
				{dislikeTooltipText ? (
					<TooltipContent bg={theme.tooltip.background} py="$1" px="$2">
						<TooltipText fontSize="$sm" color={theme.tooltip.text}>
							{dislikeTooltipText}
						</TooltipText>
					</TooltipContent>
				) : <></>}
			</CustomTooltip>
		</View>
	);
};

export default SettingsListLikeDislike;

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
		borderColor: '#2E2E2E',
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
		borderColor: '#2E2E2E',
		flexDirection: 'row',
		justifyContent: 'center',
		alignItems: 'center',
	},
	count: {
		fontSize: 14,
		fontFamily: 'Poppins_400Regular',
		marginLeft: 6,
	},
});
