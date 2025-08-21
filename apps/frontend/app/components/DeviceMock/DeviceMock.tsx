import { Text, View } from 'react-native';
import React from 'react';
import styles from './styles';
import { useTheme } from '@/hooks/useTheme';
import { FontAwesome } from '@expo/vector-icons';

const DeviceMock = () => {
	const { theme } = useTheme();
	return (
		<View
			style={{ ...styles.container, backgroundColor: theme.header.background }}
		>
			<Text style={{ ...styles.time, color: theme.screen.text }}>9:41</Text>
			<View style={styles.row}>
				<FontAwesome name="signal" size={22} color={theme.screen.text} />
				<FontAwesome name="wifi" size={22} color={theme.screen.text} />
				<FontAwesome name="battery" size={22} color={theme.screen.text} />
			</View>
		</View>
	);
};

export default DeviceMock;
