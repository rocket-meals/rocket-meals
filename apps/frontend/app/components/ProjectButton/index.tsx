import React from 'react';
import { Appearance, StyleSheet, Text, TouchableOpacity } from 'react-native';
import { useSelector } from 'react-redux';
import { RootState } from '@/redux/reducer';
import { myContrastColor } from '@/helper/ColorHelper';
import { darkTheme, lightTheme } from '@/styles/themes';
import { ProjectButtonProps } from './types';

const ProjectButton: React.FC<ProjectButtonProps> = ({ text, onPress, iconLeft, iconRight, style }) => {
	const { primaryColor, selectedTheme } = useSelector((state: RootState) => state.settings);

	const colorScheme = Appearance.getColorScheme();
	const theme = selectedTheme === 'systematic' ? (colorScheme === 'dark' ? darkTheme : lightTheme) : selectedTheme === 'dark' ? darkTheme : lightTheme;

	const contrastColor = myContrastColor(primaryColor, theme, selectedTheme === 'dark');

	return (
		<TouchableOpacity style={[styles.container, { backgroundColor: primaryColor }, style]} onPress={onPress}>
			{iconLeft}
			<Text style={[styles.label, { color: contrastColor }]}>{text}</Text>
			{iconRight}
		</TouchableOpacity>
	);
};

const styles = StyleSheet.create({
	container: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'center',
		borderRadius: 10,
		marginVertical: 20,
		gap: 10,
		paddingHorizontal: 18,
		height: 43,
	},
	label: {
		fontSize: 16,
		fontFamily: 'Poppins_400Regular',
	},
});

export default ProjectButton;
