import React, { useEffect, useState } from 'react';
import styles from './styles';
import { Dimensions, Linking, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import packages from '../../../constants/LicenseData';
import { useTheme } from '@/hooks/useTheme';
import { isWeb } from '@/constants/Constants';
import { Entypo } from '@expo/vector-icons';
import { TranslationKeys } from '@/locales/keys';
import useSetPageTitle from '@/hooks/useSetPageTitle';
import CollectibleSpot from '@/components/CollectibleItem/CollectibleSpot';
import { CollectibleAt } from 'repo-depkit-common';

import { useLanguage } from '@/hooks/useLanguage';
import useIsLtrLanguage from '@/hooks/useIsLtrLanguage';
import AppScreen from '@/components/AppScreen';

const LicenseInformation = () => {
	useSetPageTitle(TranslationKeys.license_information);
	const { translate, language } = useLanguage();
	const isLtrLanguage = useIsLtrLanguage();
	const isRtl = !isLtrLanguage;
	const { theme } = useTheme();
	const [expanded, setExpanded] = useState(null);
	const [windowWidth, setWindowWidth] = useState(Dimensions.get('window').width);

	const toggleDropdown = (index: any) => {
		setExpanded(expanded === index ? null : index);
	};

	useEffect(() => {
		const onChange = ({ window }: { window: any }) => {
			setWindowWidth(window.width);
		};

		const subscription = Dimensions.addEventListener('change', onChange);
		return () => {
			subscription.remove();
		};
	}, []);

	// Ensure packages is defined before calling map
	if (!Array.isArray(packages)) {
		return <Text>{translate(TranslationKeys.packages_data_not_available)}</Text>;
	}

	return (
		<AppScreen fullWidth={windowWidth < 600}>
			<View style={{ width: windowWidth > 600 ? '90%' : '98%' }}>
				{packages.map((pkg, index) => (
					<View key={pkg.name} style={{ padding: 10 }}>
						<TouchableOpacity
							style={{
								...styles.section,
								backgroundColor: theme.screen.iconBg,
							}}
							onPress={() => toggleDropdown(index)}
						>
							<Text
								style={{
									width: '70%',
									color: theme.screen.text,
									fontSize: windowWidth > 600 ? (isWeb ? 18 : 16) : 16,
								}}
							>
								{pkg.name}
							</Text>
							<View style={styles.iconText}>
								<Text
									style={{
										marginRight: 10,
										color: theme.screen.text,
										fontSize: windowWidth > 600 ? (isWeb ? 18 : 16) : 16,
									}}
								>
									{pkg.version}
								</Text>
								{expanded === index ? <Entypo name="chevron-small-up" size={24} color={theme.screen.icon} /> : <Entypo name="chevron-small-down" size={24} color={theme.screen.icon} />}
							</View>
						</TouchableOpacity>
						{expanded === index && (
							<View style={styles.extandContainer}>
								<View style={[styles.detailText, isRtl ? { flexDirection: 'row-reverse' } : null]}>
									<Text
										style={{
											color: theme.screen.text,
											fontSize: windowWidth > 600 ? (isWeb ? 14 : 12) : 12,
											textAlign: isRtl ? 'right' : 'left',
											writingDirection: isRtl ? 'rtl' : 'ltr',
										}}
									>
										{translate(TranslationKeys.package)}
									</Text>
									<Text
										style={{
											color: theme.screen.text,
											fontSize: windowWidth > 600 ? (isWeb ? 14 : 12) : 12,
											textAlign: isRtl ? 'left' : 'right',
											writingDirection: 'ltr',
										}}
									>
										{pkg.name}
									</Text>
								</View>
								<View style={[styles.detailText, isRtl ? { flexDirection: 'row-reverse' } : null]}>
									<Text
										style={{
											color: theme.screen.text,
											fontSize: windowWidth > 600 ? (isWeb ? 14 : 12) : 12,
											textAlign: isRtl ? 'right' : 'left',
											writingDirection: isRtl ? 'rtl' : 'ltr',
										}}
									>
										{translate(TranslationKeys.version)}
									</Text>
									<Text
										style={{
											color: theme.screen.text,
											fontSize: windowWidth > 600 ? (isWeb ? 14 : 12) : 12,
											textAlign: isRtl ? 'left' : 'right',
											writingDirection: 'ltr',
										}}
									>
										{pkg.version}
									</Text>
								</View>
								<View style={[styles.detailText, isRtl ? { flexDirection: 'row-reverse' } : null]}>
									<Text
										style={{
											color: theme.screen.text,
											fontSize: windowWidth > 600 ? (isWeb ? 14 : 12) : 12,
											textAlign: isRtl ? 'right' : 'left',
											writingDirection: isRtl ? 'rtl' : 'ltr',
										}}
									>
										{translate(TranslationKeys.license)}
									</Text>
									<Text
										style={{
											color: theme.screen.text,
											fontSize: windowWidth > 600 ? (isWeb ? 14 : 12) : 12,
											textAlign: isRtl ? 'left' : 'right',
											writingDirection: 'ltr',
										}}
									>
										{pkg.license}
									</Text>
								</View>
								<View style={[styles.detailText, isRtl ? { flexDirection: 'row-reverse' } : null]}>
									<View
										style={{
											width: '48%',
										}}
									>
										<Text
											style={{
												color: theme.screen.text,
												fontSize: windowWidth > 600 ? (isWeb ? 14 : 12) : 12,
												textAlign: isRtl ? 'right' : 'left',
												writingDirection: isRtl ? 'rtl' : 'ltr',
											}}
										>
											{translate(TranslationKeys.repository)}
										</Text>
									</View>
									<View
										style={{
											width: '48%',
											...(isRtl ? { alignItems: 'flex-start' } : {}),
										}}
									>
										<Text
											style={{ color: 'blue', textAlign: isRtl ? 'left' : 'right', writingDirection: 'ltr' }}
											onPress={() => Linking.openURL(pkg.repository)}
										>
											{pkg.repository}
										</Text>
									</View>
								</View>
								<View style={[styles.detailText, isRtl ? { flexDirection: 'row-reverse' } : null]}>
									<View
										style={{
											width: '48%',
										}}
									>
										<Text
											style={{
												color: theme.screen.text,
												fontSize: windowWidth > 600 ? (isWeb ? 14 : 12) : 12,
												textAlign: isRtl ? 'right' : 'left',
												writingDirection: isRtl ? 'rtl' : 'ltr',
											}}
										>
											{translate(TranslationKeys.license_url)}
										</Text>
									</View>
									<View
										style={{
											width: '48%',
											justifyContent: 'flex-end',
											...(isRtl ? { alignItems: 'flex-start' } : {}),
										}}
									>
										<Text
											style={{
												color: 'blue',
												textAlign: isRtl ? 'left' : 'right',
												writingDirection: 'ltr',
											}}
											onPress={() => Linking.openURL(pkg.licenseUrl)}
										>
											{pkg.licenseUrl}
										</Text>
									</View>
								</View>
							</View>
						)}
					</View>
				))}
			</View>
			<CollectibleSpot collectibleKey={CollectibleAt.collectible_at_license_information} />
		</AppScreen>
	);
};

export default LicenseInformation;
