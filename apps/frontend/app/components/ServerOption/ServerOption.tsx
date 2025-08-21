import React from 'react';
import { StyleSheet, Text, TouchableOpacity } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '@/hooks/useTheme';
import { useSelector } from 'react-redux';
import { myContrastColor } from '@/helper/colorHelper';
import type { RootState } from '@/redux/reducer';
import type { CustomerConfig } from '@/config';

interface ServerOptionProps {
	server: CustomerConfig;
	isSelected: boolean;
	onPress: () => void;
}

const ServerOption: React.FC<ServerOptionProps> = ({
	server,
	isSelected,
	onPress,
}) => {
	const { theme } = useTheme();
	const { primaryColor, selectedTheme: mode } = useSelector(
		(state: RootState) => state.settings
	);
	const contrastColor = myContrastColor(primaryColor, theme, mode === 'dark');
	return (
		<TouchableOpacity
			style={{
				...styles.row,
				paddingHorizontal: 10,
				backgroundColor: isSelected ? primaryColor : theme.screen.iconBg,
			}}
			onPress={onPress}
		>
			<MaterialCommunityIcons
				name="server"
				size={24}
				color={isSelected ? contrastColor : theme.screen.icon}
				style={styles.icon}
			/>
			<Text
				style={{
					...styles.text,
					color: isSelected ? contrastColor : theme.header.text,
				}}
			>
				{server.projectName}
			</Text>
			<MaterialCommunityIcons
				name={isSelected ? 'checkbox-marked' : 'checkbox-blank'}
				size={24}
				color={isSelected ? contrastColor : theme.screen.icon}
				style={styles.radioButton}
			/>
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

export default ServerOption;
