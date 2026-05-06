import { ReactNode } from 'react';
import { StyleProp, ViewStyle, TextStyle } from 'react-native';

export interface AppButtonProps {
	text?: string;
	onPress?: () => void;
	variant?: 'primary' | 'outline' | 'ghost';
	iconLeft?: ReactNode;
	iconRight?: ReactNode;
	style?: StyleProp<ViewStyle>;
	textStyle?: StyleProp<TextStyle>;
	activeOpacity?: number;
	usePlainText?: boolean;
	loadingIndicatorColor?: string;
	loadingIndicatorSize?: number;
	disabled?: boolean;
	loading?: boolean;
}
