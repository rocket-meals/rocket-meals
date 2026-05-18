import React from 'react';
import { StyleSheet, Text, View, ViewStyle } from 'react-native';
import { useTheme } from '@/hooks/useTheme';
import useIsLtrLanguage from '@/hooks/useIsLtrLanguage';
import useLanguageTextAlign from '@/hooks/useLanguageTextAlign';

export interface AppInfoRowProps {
	icon?: React.ReactNode;
	label: string;
	value: string;
	textColor?: string;
	style?: ViewStyle;
}

const AppInfoRow: React.FC<AppInfoRowProps> = ({
	icon,
	label,
	value,
	textColor,
	style,
}) => {
	const { theme } = useTheme();
	const isLtrLanguage = useIsLtrLanguage();
	const isRtl = !isLtrLanguage;
	const textAlign = useLanguageTextAlign();
	const resolvedTextColor = textColor ?? theme.screen.text;

	return (
		<View
			style={[
				styles.row,
				isRtl ? styles.rowRtl : undefined,
				style,
			]}
		>
			<View style={[styles.iconLabel, isRtl ? styles.iconLabelRtl : undefined]}>
				{icon ? (
					<View style={[styles.iconWrap, isRtl ? styles.iconWrapRtl : undefined]}>
						{icon}
					</View>
				) : null}
				<Text
					style={[
						styles.label,
						{
							color: resolvedTextColor,
							textAlign,
							writingDirection: isRtl ? 'rtl' : 'ltr',
						},
					]}
				>
					{label}
				</Text>
			</View>

			<Text
				style={[
					styles.value,
					{
						color: resolvedTextColor,
						...(isRtl
							? { textAlign: 'left', writingDirection: 'ltr' as const }
							: {}),
					},
				]}
			>
				{value}
			</Text>
		</View>
	);
};

export default AppInfoRow;

const styles = StyleSheet.create({
	row: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
		paddingVertical: 8,
	},
	rowRtl: {
		flexDirection: 'row-reverse',
	},
	iconLabel: {
		flexDirection: 'row',
		alignItems: 'center',
		flex: 1,
	},
	iconLabelRtl: {
		flexDirection: 'row-reverse',
	},
	iconWrap: {
		marginRight: 8,
	},
	iconWrapRtl: {
		marginRight: 0,
		marginLeft: 8,
	},
	label: {
		fontSize: 14,
		fontFamily: 'Poppins_400Regular',
		flex: 1,
	},
	value: {
		fontSize: 14,
		fontFamily: 'Poppins_700Bold',
		textAlign: 'right',
		flexShrink: 1,
	},
});
