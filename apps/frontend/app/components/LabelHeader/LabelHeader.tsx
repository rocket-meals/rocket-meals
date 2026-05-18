import { Dimensions, StyleSheet, Text, View } from 'react-native';
import React, { useCallback, useEffect, useState } from 'react';
import { useTheme } from '@/hooks/useTheme';
import { useAppSelector } from '@/redux/hooks';
import CompanyImage from '@/components/CompanyImage';
import { StringHelper } from 'repo-depkit-common';
import { useLanguage } from '@/hooks/useLanguage';
import { TranslationKeys } from '@/locales/keys';
import useIsLtrLanguage from '@/hooks/useIsLtrLanguage';
import AppOfflineChip from '@/components/AppOfflineChip';


const LabelHeader: React.FC<{ Label: any; isConnected?: Boolean }> = ({ Label, isConnected = true }) => {
	const { theme } = useTheme();
	const { translate } = useLanguage();
	const [currentTime, setCurrentTime] = useState('');
	const [logoStyle, setLogoStyle] = useState(() => ({
		width: styles.logo.width,
		height: 75,
		marginRight: styles.logo.marginRight,
	}));
	const { width } = Dimensions.get('window');
	const { appSettings } = useAppSelector(state => state.settings);
	const isLtrLanguage = useIsLtrLanguage();
	const isArabic = !isLtrLanguage;
	const updateLogoStyle = useCallback(() => {
		setLogoStyle({
			width: width < 600 ? 150 : 300,
			height: 75,
			marginRight: isArabic ? 0 : width > 600 ? 20 : 10,
		});
	}, [isArabic, width]);

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
			const formattedTime = `${StringHelper.replaceAllLiteralWithOptions({ str: now.toLocaleDateString('en-GB'), find: '/', replace: '.' })} - ${now.toLocaleTimeString('en-US', {
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
				flexDirection: isArabic ? 'row-reverse' : 'row',
			}}
		>
			<View style={styles.logoContainer}>
				<CompanyImage appSettings={appSettings} style={logoStyle} />
			</View>
			<View style={{ ...styles.row, flexDirection: isArabic ? 'row-reverse' : 'row' }}>
				<View style={[styles.labelText, isArabic ? { marginLeft: 0, marginRight: 10, alignItems: 'flex-end' } : undefined]}>
					<Text style={{ ...styles.label, color: theme.screen.text, ...(isArabic ? { textAlign: 'right', writingDirection: 'rtl' } : {}) }}>{Label}</Text>
					<Text style={{ ...styles.timestamp, color: theme.screen.text, ...(isArabic ? { textAlign: 'right', writingDirection: 'rtl' } : {}) }}>{currentTime}</Text>
				</View>
				{!isConnected && <AppOfflineChip />}
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
