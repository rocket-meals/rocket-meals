import { Dimensions, StyleSheet, Text, View } from 'react-native';
import React, { useCallback, useEffect, useState } from 'react';
import { useTheme } from '@/hooks/useTheme';
import { useSelector } from 'react-redux';
import CompanyImage from '@/components/CompanyImage';
import { RootState } from '@/redux/reducer';

const LabelHeader: React.FC<{ Label: any; isConnected?: Boolean }> = ({ Label, isConnected = true }) => {
	const { theme } = useTheme();
	const [currentTime, setCurrentTime] = useState('');
	const [logoStyle, setLogoStyle] = useState(styles.logo);
	const { width } = Dimensions.get('window');
	const { appSettings } = useSelector((state: RootState) => state.settings);
	const updateLogoStyle = useCallback(() => {
		setLogoStyle({
			width: width < 600 ? 150 : 300,
			height: 75,
			marginRight: width > 600 ? 20 : 10,
		});
	}, [width]);

	useEffect(() => {
		updateLogoStyle();
		const subscription = Dimensions.addEventListener('change', updateLogoStyle);

		return () => {
			subscription.remove();
		};
	}, [updateLogoStyle]);

	useEffect(() => {
		const interval = setInterval(() => {
			const now = new Date();
			const formattedTime = `${now.toLocaleDateString('en-GB').replace(/\//g, '.')} - ${now.toLocaleTimeString('en-US', {
				hour12: false,
			})}`;
			setCurrentTime(formattedTime);
		}, 1000);

		return () => clearInterval(interval);
	}, []);
	return (
		<View
			style={{
				...styles.headerContainer,
				backgroundColor: theme.screen.background,
			}}
		>
			<View style={styles.logoContainer}>
				<CompanyImage appSettings={appSettings} style={logoStyle} />
			</View>
			<View style={{ ...styles.row }}>
				<View style={styles.labelText}>
					<Text style={{ ...styles.label, color: theme.screen.text }}>{Label}</Text>
					<Text style={{ ...styles.timestamp, color: theme.screen.text }}>{currentTime}</Text>
				</View>
				{!isConnected && (
					<View style={styles.offlineChip}>
						<Text
							style={{
								...styles.timestamp,
								color: '#ffffff',
								fontSize: 12,
							}}
						>
							{'Offline'}
						</Text>
					</View>
				)}
			</View>
		</View>
	);
};

const styles = StyleSheet.create({
	headerContainer: {
		width: '100%',
		flexDirection: 'row',
		alignItems: 'center',
		borderBottomWidth: 1,
		borderBottomColor: '#ddd',
	},
	logoContainer: {
		flexDirection: 'row',
		alignItems: 'center',
	},
	labelText: {
		marginLeft: 10,
	},
	logo: {
		width: 300,
		height: 80,
		marginRight: 10,
	},
	label: {
		fontSize: 18,
		fontWeight: 'bold',
		color: '#000',
	},
	timestamp: {
		fontSize: 14,
		color: '#ffffff',
		fontFamily: 'Poppins_400Regular',
	},
	row: {
		flex: 1,
		flexDirection: 'row',
		justifyContent: 'space-between',
		alignItems: 'center',
		paddingRight: 10,
	},
	offlineChip: {
		width: 80,
		justifyContent: 'center',
		alignItems: 'center',
		backgroundColor: 'red',
		padding: 4,
		borderRadius: 25,
	},
});
export default LabelHeader;
