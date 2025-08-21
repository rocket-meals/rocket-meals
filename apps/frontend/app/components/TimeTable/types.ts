import { GestureResponderEvent } from 'react-native-modal';

export interface TimeTableListProps {
	leftIcon: React.ReactNode;
	label: string;
	rightIcon?: React.ReactNode;
	value?: string;
	handleFunction: (event: GestureResponderEvent) => void;
}
