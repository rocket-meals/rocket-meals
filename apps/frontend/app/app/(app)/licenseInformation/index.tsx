import React, { useEffect, useState } from 'react';
import styles from './styles';
import { Dimensions, Linking, ScrollView, Text, TouchableOpacity, View, StyleSheet, ViewStyle } from 'react-native';
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
import useLanguageTextAlign from '@/hooks/useLanguageTextAlign';
import AppScreen from '@/components/AppScreen';
import AppInfoRow from '@/components/AppInfoRow';

export interface AppInfoLinkRowProps {
	icon?: React.ReactNode;
	label: string;
	value: string;
	url: string;
	textColor?: string;
	style?: ViewStyle;
}

const AppInfoLinkRow: React.FC<AppInfoLinkRowProps> = ({
	icon,
	label,
	value,
	url,
	textColor,
	style,
}) => {
	const { theme } = useTheme();
	const isLtrLanguage = useIsLtrLanguage();
	const isRtl = !isLtrLanguage;
	const textAlign = useLanguageTextAlign();
	const resolvedTextColor = textColor ?? theme.screen.text;

	const handlePress = () => {
		if (url) {
			Linking.openURL(url).catch((err) => console.error('Failed to open URL:', err));
		}
	};

	return (
		<View
			style={[
				styles.linkRow,
				isRtl ? styles.linkRowRtl : undefined,
				style,
			]}
		>
			<View style={[styles.linkIconLabel, isRtl ? styles.linkIconLabelRtl : undefined]}>
				{icon ? (
					<View style={[styles.linkIconWrap, isRtl ? styles.linkIconWrapRtl : undefined]}>
						{icon}
					</View>
				) : null}
				<Text
					style={[
						styles.linkLabel,
						{
							color: resolvedTextColor,
							textAlign,
							writingDirection: isRtl ? 'rtl' : 'ltr',
						},
					]}
				>
					{label}
				</Text>
			</View>

			<TouchableOpacity onPress={handlePress} activeOpacity={0.7} style={styles.linkValueWrap}>
				<Text
					style={[
						styles.linkValue,
						{
							color: '#3b82f6', // Premium link blue
							textDecorationLine: 'underline',
							...(isRtl
								? { textAlign: 'left', writingDirection: 'ltr' as const }
								: {}),
						},
					]}
					numberOfLines={1}
					ellipsizeMode="tail"
				>
					{value}
				</Text>
			</TouchableOpacity>
		</View>
	);
};


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
								<AppInfoRow
									label={translate(TranslationKeys.package)}
									value={pkg.name}
									style={styles.detailText}
								/>
								<AppInfoRow
									label={translate(TranslationKeys.version)}
									value={pkg.version}
									style={styles.detailText}
								/>
								<AppInfoRow
									label={translate(TranslationKeys.license)}
									value={pkg.license}
									style={styles.detailText}
								/>
								<AppInfoLinkRow
									label={translate(TranslationKeys.repository)}
									value={pkg.repository}
									url={pkg.repository}
									style={styles.detailText}
								/>
								<AppInfoLinkRow
									label={translate(TranslationKeys.license_url)}
									value={pkg.licenseUrl}
									url={pkg.licenseUrl}
									style={styles.detailText}
								/>
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
