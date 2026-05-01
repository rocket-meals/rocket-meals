import { ReactNode } from 'react';
import { StyleProp, ViewStyle } from 'react-native';

export interface ProjectButtonProps {
	text: string;
	onPress?: () => void;
	iconLeft?: ReactNode;
	iconRight?: ReactNode;
	style?: StyleProp<ViewStyle>;
}
