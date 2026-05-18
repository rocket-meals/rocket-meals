import React from 'react';
import { StyleSheet, View, ViewStyle } from 'react-native';
import SettingsGroupTitle from '@/components/SettingsGroupTitle';

export interface AppSectionProps {
	title?: string;
	children: React.ReactNode;
	sectionStyle?: ViewStyle;
	groupStyle?: ViewStyle;
	titleFontSize?: number;
}
const AppSection: React.FC<AppSectionProps> = ({
	title,
	children,
	sectionStyle,
	groupStyle,
	titleFontSize,
}) => {
	return (
		<View style={[styles.section, sectionStyle]}>
			{title ? (
				<SettingsGroupTitle fontSize={titleFontSize}>{title}</SettingsGroupTitle>
			) : null}
			<View style={[styles.group, groupStyle]}>{children}</View>
		</View>
	);
};

export default AppSection;

const styles = StyleSheet.create({
	section: {
		width: '100%',
		gap: 0,
	},
	group: {
		gap: 0,
	},
});
