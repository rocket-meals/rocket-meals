import React from 'react';
import { StyleSheet, Text, TouchableOpacity } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '@/hooks/useTheme';
import { useSelector } from 'react-redux';
import { isWeb } from '@/constants/Constants';
import { useLanguage } from '@/hooks/useLanguage';
import { RootState } from '@/redux/reducer';
import { myContrastColor } from '@/helper/ColorHelper';

// Define the type for the theme prop
type Position = {
	id: string;
	name: string;
	//   icon: string;
};

// Define the props for the component
type FirstDayOfWeekProps = {
	position: Position;
	isSelected: boolean;
	onPress: () => void;
};

const FirstDayOfWeek: React.FC<FirstDayOfWeekProps> = ({ position, isSelected, onPress }) => {
	const { theme } = useTheme();
	const { translate } = useLanguage();
	const { primaryColor, selectedTheme: mode } = useSelector((state: RootState) => state.settings);
	const contrastColor = myContrastColor(primaryColor, theme, mode === 'dark');
	return (
		<TouchableOpacity
			style={{
				...styles.row,
				paddingHorizontal: isWeb ? 20 : 10,
				backgroundColor: isSelected ? primaryColor : theme.screen.iconBg,
			}}
			onPress={onPress}
		>
			{/* Theme Text */}
			<Text
				style={{
					...styles.text,
					color: isSelected ? contrastColor : theme.header.text,
				}}
			>
				{translate(position.name)}
			</Text>

			{/* Radio Button */}
			<MaterialCommunityIcons name={isSelected ? 'checkbox-marked' : 'checkbox-blank'} size={24} color={isSelected ? contrastColor : theme.screen.icon} style={styles.radioButton} />
		</TouchableOpacity>
	);
};

const styles = StyleSheet.create({
	row: {
		marginTop: 10,
		width: '100%',
		height: 50,
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
		borderRadius: 12,
	},
	icon: {
		marginRight: 10,
	},
	text: {
		flex: 1,
		fontSize: 16,
		color: 'black',
	},
	radioButton: {
		marginLeft: 'auto',
	},
});

export default FirstDayOfWeek;
