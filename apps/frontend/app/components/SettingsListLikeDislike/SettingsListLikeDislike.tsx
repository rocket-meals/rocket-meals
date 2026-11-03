import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import LoadingIndicator from '@/components/LoadingIndicator/LoadingIndicator';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { CustomTooltip, TooltipContent, TooltipText } from '@/components/CustomTooltip';
import { useTheme } from '@/hooks/useTheme';
import { useAppSelector } from '@/redux/hooks';
import { myContrastColor } from '@/helper/ColorHelper';
import { isWeb } from '@/constants/Constants';
import { SettingsListLikeDislikeProps } from './types';

const LikeDislikeTriggerButton = ({
	triggerProps,
	onPress,
	buttonStyle,
	active,
	loading,
	inactiveIconName,
	activeIconName,
	iconSize,
	backgroundColor,
	contrastColor,
	inactiveIconColor,
	inactiveTextColor,
	count,
}: {
	triggerProps: object;
	onPress: () => void;
	buttonStyle: any;
	active: boolean;
	loading: boolean;
	inactiveIconName: any;
	activeIconName: any;
	iconSize: number;
	backgroundColor: string;
	contrastColor: string;
	inactiveIconColor: string;
	inactiveTextColor: string;
	count: number | null | undefined;
}) => (
	<Pressable
		{...triggerProps}
		style={{
			...buttonStyle,
			backgroundColor: active ? backgroundColor : undefined,
		}}
		onPress={onPress}
	>
		{loading ? (
			<LoadingIndicator size={iconSize} color={backgroundColor} />
		) : (
			<MaterialCommunityIcons
				name={active ? activeIconName : inactiveIconName}
				size={iconSize}
				color={active ? contrastColor : inactiveIconColor}
			/>
		)}
		{count != null && count > 0 && (
			<Text style={[styles.count, { color: active ? contrastColor : inactiveTextColor }]}>{count}</Text>
		)}
	</Pressable>
);

const makeLikeDislikeTrigger = (props: Readonly<{
	onPress: () => void;
	buttonStyle: any;
	active: boolean;
	loading: boolean;
	inactiveIconName: any;
	activeIconName: any;
	iconSize: number;
	backgroundColor: string;
	contrastColor: string;
	inactiveIconColor: string;
	inactiveTextColor: string;
	count: number | null | undefined;
}>) => (triggerProps: object) => <LikeDislikeTriggerButton triggerProps={triggerProps} {...props} />;

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
				trigger={makeLikeDislikeTrigger({
					onPress: onPressLike,
					buttonStyle: styles.likeButton,
					active: like === true,
					loading: likeLoading,
					inactiveIconName: "thumb-up-outline",
					activeIconName: "thumb-up",
					iconSize,
					backgroundColor: foods_area_color,
					contrastColor,
					inactiveIconColor: theme.screen.icon,
					inactiveTextColor: theme.screen.text,
					count: likeCount,
				})}
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
				trigger={makeLikeDislikeTrigger({
					onPress: onPressDislike,
					buttonStyle: styles.dislikeButton,
					active: like === false,
					loading: dislikeLoading,
					inactiveIconName: "thumb-down-outline",
					activeIconName: "thumb-down",
					iconSize,
					backgroundColor: foods_area_color,
					contrastColor,
					inactiveIconColor: theme.screen.icon,
					inactiveTextColor: theme.screen.text,
					count: dislikeCount,
				})}
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
