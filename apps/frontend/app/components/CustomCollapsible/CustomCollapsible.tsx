import { Text, TouchableOpacity, View } from 'react-native';
import React, { useState } from 'react';
import styles from './styles';
import { MaterialIcons } from '@expo/vector-icons';
import Collapsible from 'react-native-collapsible';
import { useTheme } from '@/hooks/useTheme';
import { CustomCollapsibleProps } from './types';
import { useSelector } from 'react-redux';
import { myContrastColor } from '@/helper/ColorHelper';
import { RootState } from '@/redux/reducer';

const CustomCollapsible: React.FC<CustomCollapsibleProps> = ({ headerText, children, customColor = '', startCollapsed = false }) => {
	const [collapsed, setCollapsed] = useState(startCollapsed);
	const { theme } = useTheme();
	const { primaryColor, selectedTheme: mode } = useSelector((state: RootState) => state.settings);
	const resolvedColor = customColor || primaryColor;
	const contrastColor = myContrastColor(resolvedColor, theme, mode === 'dark');

	return (
		<View style={{ ...styles.headerContainer, borderColor: resolvedColor }}>
			<TouchableOpacity onPress={() => setCollapsed(prev => !prev)}>
				<View
					style={{
						...styles.header,
						borderBottomLeftRadius: collapsed ? 12 : 5,
						borderBottomRightRadius: collapsed ? 12 : 5,
						backgroundColor: collapsed ? '' : resolvedColor,
					}}
				>
					<View style={{ ...styles.iconText, backgroundColor: resolvedColor }}>
						<MaterialIcons name={collapsed ? 'keyboard-arrow-down' : 'keyboard-arrow-up'} size={22} color={contrastColor} style={{ alignSelf: 'center' }} />
					</View>
					<View style={{ marginLeft: 10, width: '70%' }}>
						<Text
							style={{
								...styles.headerText,
								color: collapsed ? theme.screen.text : contrastColor,
							}}
						>
							{headerText}
						</Text>
					</View>
				</View>
			</TouchableOpacity>
			<Collapsible collapsed={collapsed} align="center">
				<View
					style={{
						...styles.content,
						backgroundColor: theme.screen.background,
					}}
				>
					{children}
				</View>
			</Collapsible>
		</View>
	);
};

export default CustomCollapsible;
