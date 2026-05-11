import { ReactNode } from 'react';
import { StyleProp, TextInputProps, TextStyle, ViewStyle } from 'react-native';

export interface AppTextInputProps extends TextInputProps {
	containerStyle?: StyleProp<ViewStyle>;
	inputStyle?: StyleProp<TextStyle>;
	error?: string;
	label?: string;
	borderColor?: string;
	borderWidth?: number;
	isBottomSheet?: boolean;
	leftElement?: ReactNode;
	rightElement?: ReactNode;
}
