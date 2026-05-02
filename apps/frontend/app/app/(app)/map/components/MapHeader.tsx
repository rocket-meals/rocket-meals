import React, { memo } from 'react';
import { View, TextInput, StyleSheet } from 'react-native';
import { FontAwesome, Ionicons, MaterialIcons } from '@expo/vector-icons';
import { CustomTooltip, TooltipContent, TooltipText } from '@/components/CustomTooltip';
import IconButton from '@/components/UI/IconButton';
import { TranslationKeys } from '@/locales/keys';
import { DrawerNavigationProp } from '@react-navigation/drawer';
import { useNavigation } from 'expo-router';
import { useTheme } from '@/hooks/useTheme';
import { useLanguage } from '@/hooks/useLanguage';
import { isWeb } from '@/constants/Constants';

type RootDrawerParamList = Record<string, undefined>;

interface MapHeaderProps {
	drawerPosition: 'left' | 'right' | 'system' | undefined;
	query: string;
	onQueryChange: (text: string) => void;
	onSettingsPress?: () => void;
	onFilterPress?: () => void;
	isFilterActive?: boolean;
}

const MapHeader: React.FC<MapHeaderProps> = ({
	drawerPosition,
	query,
	onQueryChange,
	onSettingsPress,
	onFilterPress,
	isFilterActive,
}) => {
	const { theme } = useTheme();
	const { translate } = useLanguage();
	const drawerNavigation = useNavigation<DrawerNavigationProp<RootDrawerParamList>>();

	const isRTL = drawerPosition === 'right';
	const rowDirection = isRTL ? 'row-reverse' : 'row';

	return (
		<View style={[styles.header, { backgroundColor: theme.header.background }]}>
			<View style={[styles.row, { flexDirection: rowDirection }]}>
				{/* Burger Menu */}
				<CustomTooltip
					placement="bottom"
					trigger={triggerProps => (
						<IconButton
							{...triggerProps}
							onPress={() => drawerNavigation.toggleDrawer()}
							style={styles.iconButton}
						>
							<Ionicons name="menu" size={24} color={theme.header.text} />
						</IconButton>
					)}
				>
					<TooltipContent bg={theme.tooltip.background} py="$1" px="$2">
						<TooltipText fontSize="$sm" color={theme.tooltip.text}>
							{translate(TranslationKeys.open_drawer)}
						</TooltipText>
					</TooltipContent>
				</CustomTooltip>

				{/* Search Bar */}
				<View style={[
					styles.searchInputWrapper,
					{
						borderColor: theme.header.text + '55',
						backgroundColor: theme.header.text + '15',
					},
				]}>
					<MaterialIcons name="search" size={20} color={theme.header.text + '88'} style={styles.searchIcon} />
					<TextInput
						style={[
							styles.searchInput,
							{
								color: theme.header.text,
							},
						]}
						cursorColor={theme.header.text}
						placeholderTextColor={theme.header.text + '88'}
						value={query}
						onChangeText={onQueryChange}
						placeholder={translate(TranslationKeys.search)}
					/>
				</View>

				{/* Filter Icon */}
				<CustomTooltip
					placement="bottom"
					trigger={triggerProps => (
						<IconButton
							{...triggerProps}
							onPress={() => onFilterPress?.()}
							style={styles.iconButton}
						>
							<View style={styles.filterIconWrapper}>
								<FontAwesome name="filter" size={24} color={theme.header.text} />
								{isFilterActive && <View style={styles.filterBadge} />}
							</View>
						</IconButton>
					)}
				>
					<TooltipContent bg={theme.tooltip.background} py="$1" px="$2">
						<TooltipText fontSize="$sm" color={theme.tooltip.text}>
							{translate(TranslationKeys.filter)}
						</TooltipText>
					</TooltipContent>
				</CustomTooltip>

				{/* Settings Cog */}
				<CustomTooltip
					placement="bottom"
					trigger={triggerProps => (
						<IconButton
							{...triggerProps}
							onPress={() => onSettingsPress?.()}
							style={styles.iconButton}
						>
							<Ionicons name="settings-outline" size={24} color={theme.header.text} />
						</IconButton>
					)}
				>
					<TooltipContent bg={theme.tooltip.background} py="$1" px="$2">
						<TooltipText fontSize="$sm" color={theme.tooltip.text}>
							{translate(TranslationKeys.settings)}
						</TooltipText>
					</TooltipContent>
				</CustomTooltip>
			</View>
		</View>
	);
};

export default memo(MapHeader);

const styles = StyleSheet.create({
	header: {
		width: '100%',
		paddingHorizontal: isWeb ? 20 : 10,
		paddingVertical: 8,
	},
	row: {
		width: '100%',
		flexDirection: 'row',
		alignItems: 'center',
		gap: 8,
	},
	iconButton: {
		padding: 8,
	},
	filterIconWrapper: {
		position: 'relative',
	},
	filterBadge: {
		position: 'absolute',
		top: -2,
		right: -2,
		width: 8,
		height: 8,
		borderRadius: 4,
		backgroundColor: '#FF3B30',
	},
	searchInputWrapper: {
		flex: 1,
		height: 40,
		borderRadius: 20,
		borderWidth: 1,
		flexDirection: 'row',
		alignItems: 'center',
		paddingHorizontal: 12,
	},
	searchIcon: {
		marginRight: 6,
	},
	searchInput: {
		flex: 1,
		height: 40,
		fontFamily: 'Poppins_400Regular',
		fontSize: 15,
	},
});
