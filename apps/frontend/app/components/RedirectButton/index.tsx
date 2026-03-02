import { Dimensions, Text, TouchableOpacity } from 'react-native';
import React from 'react';
import styles from './styles';
import { FontAwesome6, MaterialCommunityIcons } from '@expo/vector-icons';
import { RedirectButtonProps } from './types';
import usePlatformHelper from '@/helper/platformHelper';
import { myContrastColor } from '@/helper/ColorHelper';
import { useTheme } from '@/hooks/useTheme';
import { useSelector } from 'react-redux';
import { RootState } from '@/redux/reducer';

const RedirectButton: React.FC<RedirectButtonProps> = ({ type, label, backgroundColor, color, onClick }) => {
	let containerWidth;
	let fontSize;
	const { isWeb } = usePlatformHelper();
	const { theme } = useTheme();
	const { primaryColor, selectedTheme: mode } = useSelector((state: RootState) => state.settings);

	const contrastColor = myContrastColor(backgroundColor || primaryColor, theme, mode === 'dark');

	if (isWeb()) {
		const windowWidth = Dimensions.get('window').width;

		if (windowWidth < 530) {
			containerWidth = 280;
			fontSize = 12;
		} else {
			containerWidth = 320;
			fontSize = 15;
		}
	} else {
		fontSize = 12;
		containerWidth = '100%';
	}

	return (
		<TouchableOpacity
			style={{
				...styles.container,
				width: containerWidth,
				height: isWeb() ? 50 : 43,
				paddingHorizontal: 18,
				backgroundColor: backgroundColor || primaryColor,
			}}
			onPress={onClick}
		>
			{type === 'email' ? <MaterialCommunityIcons name="email" size={24} color={color || contrastColor} /> : <FontAwesome6 name="arrow-up-right-from-square" size={20} color={color || contrastColor} />}
			<Text style={{ ...styles.label, color: color || contrastColor, fontSize }}>{label}</Text>
		</TouchableOpacity>
	);
};

export default RedirectButton;
