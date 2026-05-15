import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Entypo } from '@expo/vector-icons';
import { useTheme } from '@/hooks/useTheme';
import useIsLtrLanguage from '@/hooks/useIsLtrLanguage';

export interface AppListItemProps {
	title: string;
	onPress: () => void;
	leftIcon?: React.ReactNode;
	rightElement?: React.ReactNode;
	showChevron?: boolean;
}

const AppListItem: React.FC<AppListItemProps> = ({
	title,
	onPress,
	leftIcon,
	rightElement,
	showChevron = true,
}) => {
	const { theme } = useTheme();
	const isLtrLanguage = useIsLtrLanguage();
	const isArabic = !isLtrLanguage;

	return (
		<TouchableOpacity
			style={[
				styles.container,
				{
					backgroundColor: theme.screen.iconBg,
					flexDirection: isArabic ? 'row-reverse' : 'row',
				},
			]}
			onPress={onPress}
		>
			<View style={[styles.leftContent, { flexDirection: isArabic ? 'row-reverse' : 'row' }]}>
				{leftIcon && <View style={isArabic ? { marginLeft: 10 } : { marginRight: 10 }}>{leftIcon}</View>}
				<Text
					style={[
						styles.title,
						{
							color: theme.screen.text,
							textAlign: isArabic ? 'right' : 'left',
						},
					]}
				>
					{title}
				</Text>
			</View>

			<View style={[styles.rightContent, { flexDirection: isArabic ? 'row-reverse' : 'row' }]}>
				{rightElement}
				{showChevron && (
					<Entypo
						name={isArabic ? 'chevron-small-left' : 'chevron-small-right'}
						color={theme.screen.icon}
						size={24}
					/>
				)}
			</View>
		</TouchableOpacity>
	);
};

export default AppListItem;

const styles = StyleSheet.create({
	container: {
		width: '100%',
		paddingVertical: 12,
		paddingHorizontal: 16,
		borderRadius: 12,
		marginBottom: 8,
		alignItems: 'center',
		justifyContent: 'space-between',
	},
	leftContent: {
		flex: 1,
		alignItems: 'center',
	},
	title: {
		fontSize: 16,
		fontFamily: 'Poppins_400Regular',
		flex: 1,
	},
	rightContent: {
		alignItems: 'center',
		gap: 8,
	},
});
