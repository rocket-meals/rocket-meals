import React from 'react';
import { StyleSheet, TextInput, View, Text } from 'react-native';
import { BottomSheetTextInput } from '@gorhom/bottom-sheet';
import { useTheme } from '@/hooks/useTheme';
import { useAppSelector } from '@/redux/hooks';
import useLanguageTextAlign from '@/hooks/useLanguageTextAlign';
import { AppTextInputProps } from './types';

const AppTextInput: React.FC<AppTextInputProps> = ({
	style,
	containerStyle,
	inputStyle,
	error,
	label,
	placeholderTextColor,
	borderColor,
	borderWidth,
	isBottomSheet,
	leftElement,
	rightElement,
	...props
}) => {
	const { theme } = useTheme();
	const { primaryColor } = useAppSelector((state) => state.settings);
	const languageTextAlign = useLanguageTextAlign();
	const hasIcons = !!leftElement || !!rightElement;

	const resolvedBorderWidth = borderWidth !== undefined ? borderWidth : 1;
	const ResolvedTextInput = isBottomSheet ? BottomSheetTextInput : TextInput;

	return (
		<View style={[styles.container, containerStyle]}>
			{label ? (
				<Text style={[styles.label, { color: theme.screen.text, textAlign: languageTextAlign }]}>
					{label}
				</Text>
			) : null}

			{!hasIcons ? (
				<ResolvedTextInput
					style={[
						styles.inputWithBorder,
						{
							color: theme.screen.text,
							borderColor: error ? 'red' : (borderColor || theme.screen.icon),
							borderWidth: resolvedBorderWidth,
							textAlign: languageTextAlign,
						},
						inputStyle,
						style,
					]}
					placeholderTextColor={placeholderTextColor || theme.screen.placeholder}
					selectionColor={primaryColor}
					{...props}
				/>
			) : (
				<View
					style={[
						styles.inputFieldContainer,
						{
							borderColor: error ? 'red' : (borderColor || theme.screen.icon),
							borderWidth: resolvedBorderWidth,
						},
						inputStyle as any,
					]}
				>
					{leftElement}
					<ResolvedTextInput
						style={[
							styles.input,
							{
								color: theme.screen.text,
								textAlign: languageTextAlign,
							},
							style,
						]}
						placeholderTextColor={placeholderTextColor || theme.screen.placeholder}
						selectionColor={primaryColor}
						{...props}
					/>
					{rightElement}
				</View>
			)}

			{error ? (
				<Text style={[styles.errorText, { textAlign: languageTextAlign }]}>
					{error}
				</Text>
			) : null}
		</View>
	);
};

const styles = StyleSheet.create({
	container: {
		width: '100%',
	},
	label: {
		fontSize: 14,
		fontFamily: 'Poppins_700Bold',
		marginBottom: 4,
	},
	inputFieldContainer: {
		borderWidth: 1,
		borderRadius: 10,
		paddingHorizontal: 12,
		flexDirection: 'row',
		alignItems: 'center',
		gap: 8,
	},
	inputWithBorder: {
		borderWidth: 1,
		borderRadius: 10,
		paddingHorizontal: 12,
		fontFamily: 'Poppins_400Regular',
		fontSize: 14,
	},
	input: {
		flex: 1,
		height: '100%',
		fontFamily: 'Poppins_400Regular',
		fontSize: 14,
	},
	errorText: {
		color: 'red',
		fontSize: 12,
		marginTop: 4,
		fontFamily: 'Poppins_400Regular',
	},
});

export default AppTextInput;
