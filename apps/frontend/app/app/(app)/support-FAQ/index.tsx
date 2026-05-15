import React, { useEffect, useState } from 'react';
import { Dimensions, Image, Linking, Platform, ScrollView, Text, View } from 'react-native';
import { useTheme } from '@/hooks/useTheme';
import { router } from 'expo-router';
import SettingsList from '@/components/SettingsList';
import { Ionicons, MaterialCommunityIcons, MaterialIcons, Octicons } from '@expo/vector-icons';
import styles from './styles';
import { useLanguage } from '@/hooks/useLanguage';
import useToast from '@/hooks/useToast';
import { TranslationKeys } from '@/locales/keys';
import useSetPageTitle from '@/hooks/useSetPageTitle';
import CollectibleSpot from '@/components/CollectibleItem/CollectibleSpot';
import { CollectibleAt } from 'repo-depkit-common';
import { useAppSelector } from '@/redux/hooks';
import useIsLtrLanguage from '@/hooks/useIsLtrLanguage';
import AppScreen from '@/components/AppScreen';

const SupportFaq = () => {
	useSetPageTitle(TranslationKeys.feedback_support_faq);
	const { translate, language } = useLanguage();
	const isLtrLanguage = useIsLtrLanguage();
	const { theme } = useTheme();
	const toast = useToast();
	const { profile } = useAppSelector((state) => state.authReducer);
	const [projectName, setProjectName] = useState('');
	const [windowWidth, setWindowWidth] = useState(Dimensions.get('window').width);
	const { serverInfo, appSettings, primaryColor } = useAppSelector((state) => state.settings);

	useEffect(() => {
		if (serverInfo && serverInfo?.info) {
			setProjectName(serverInfo?.info?.project?.project_name);
		}
	}, [serverInfo]);
	useEffect(() => {
		const onChange = ({ window }: { window: any }) => {
			setWindowWidth(window.width);
		};

		const subscription = Dimensions.addEventListener('change', onChange);
		return () => {
			subscription.remove();
		};
	}, []);

	const openInBrowser = async (url: string) => {
		try {
			if (Platform.OS === 'web') {
				window.open(url, '_blank');
			} else {
				const supported = await Linking.canOpenURL(url);

				if (supported) {
					await Linking.openURL(url);
				} else {
					toast(translate(TranslationKeys.cannotOpenUrl).replace('${url}', url), 'error');
				}
			}
		} catch (error) {
			console.error('An error occurred:', error);
		}
	};

	return (
		<AppScreen>
			<View style={styles.imageContainer}>
				<Image source={require('../../../assets/images/dataAccess.png')} style={styles.image} />
			</View>

			<Text style={{ ...styles.groupHeading, color: theme.screen.text, textAlign: 'center' }}>{translate(TranslationKeys.feedback_support_faq)}</Text>
			<View style={[styles.section, { width: '100%' }]}>
				<SettingsList iconBgColor={primaryColor} leftIcon={<MaterialIcons name="feedback" size={24} color={theme.screen.icon} />} label={`${translate(TranslationKeys.feedback)} & ${translate(TranslationKeys.support)}`} rightIcon={<Octicons name={isLtrLanguage ? 'chevron-right' : 'chevron-left'} size={24} color={theme.screen.icon} />} handleFunction={() => router.navigate('/feedback-support')} groupPosition={profile?.id ? 'top' : 'single'} />
				{profile?.id && <SettingsList iconBgColor={primaryColor} leftIcon={<MaterialCommunityIcons name="email" size={24} color={theme.screen.icon} />} label={translate(TranslationKeys.my_support_tickets)} rightIcon={<Octicons name={isLtrLanguage ? 'chevron-right' : 'chevron-left'} size={24} color={theme.screen.icon} />} handleFunction={() => router.navigate('/support-ticket')} groupPosition="bottom" />}
			</View>

			<Text style={{ ...styles.groupHeading, color: theme.screen.text, textAlign: 'center' }}>{translate(TranslationKeys.app)}</Text>
			<View style={[styles.section, { width: '100%' }]}>
				<SettingsList
					iconBgColor={primaryColor}
					leftIcon={<Ionicons name="logo-apple" size={24} color={theme.screen.icon} />}
					label="Apple Store"
					rightIcon={<Octicons name={isLtrLanguage ? 'chevron-right' : 'chevron-left'} size={24} color={theme.screen.icon} />}
					handleFunction={() => {
						if (appSettings?.app_stores_url_to_apple) {
							openInBrowser(appSettings?.app_stores_url_to_apple);
						}
					}}
					groupPosition="top"
				/>
				<SettingsList
					iconBgColor={primaryColor}
					leftIcon={<Ionicons name="logo-google-playstore" size={24} color={theme.screen.icon} />}
					label="Google Play Store"
					rightIcon={<Octicons name={isLtrLanguage ? 'chevron-right' : 'chevron-left'} size={24} color={theme.screen.icon} />}
					handleFunction={() => {
						if (appSettings?.app_stores_url_to_google) {
							openInBrowser(appSettings?.app_stores_url_to_google);
						}
					}}
					groupPosition="middle"
				/>
				<SettingsList
					iconBgColor={primaryColor}
					leftIcon={<MaterialCommunityIcons name="email" size={24} color={theme.screen.icon} />}
					label={translate(TranslationKeys.email)}
					value="info@rocket-meals.de"
					rightIcon={<Octicons name={isLtrLanguage ? 'chevron-right' : 'chevron-left'} size={24} color={theme.screen.icon} />}
					handleFunction={() => {
						Linking.openURL('mailto:info@rocket-meals.de');
					}}
					groupPosition="bottom"
				/>
			</View>

			<Text style={{ ...styles.groupHeading, color: theme.screen.text, textAlign: 'center' }}>{translate(TranslationKeys.project_name)}</Text>
			<View style={[styles.section, { width: '100%' }]}>
				<SettingsList iconBgColor={primaryColor} leftIcon={<MaterialIcons name="info" size={24} color={theme.screen.icon} />} label={translate(TranslationKeys.project_name)} value={projectName?.length > 0 ? projectName : 'SWOSY Test'} groupPosition="top" />
				<SettingsList
					iconBgColor={primaryColor}
					leftIcon={<MaterialIcons name="developer-mode" size={24} color={theme.screen.icon} />}
					label={translate(TranslationKeys.developer)}
					value="Baumgartner Software UG"
					rightIcon={<Octicons name={isLtrLanguage ? 'chevron-right' : 'chevron-left'} size={24} color={theme.screen.icon} />}
					handleFunction={() => {
						openInBrowser('https://baumgartner-software.de');
					}}
					groupPosition="middle"
				/>
				<SettingsList
					iconBgColor={primaryColor}
					leftIcon={<MaterialIcons name="apps" size={24} color={theme.screen.icon} />}
					label={translate(TranslationKeys.software_name)}
					value="Rocket Meals"
					rightIcon={<Octicons name={isLtrLanguage ? 'chevron-right' : 'chevron-left'} size={24} color={theme.screen.icon} />}
					handleFunction={() => {
						openInBrowser('https://rocket-meals.de');
					}}
					groupPosition="bottom"
				/>
			</View>
			<CollectibleSpot collectibleKey={CollectibleAt.collectible_at_faq} />
		</AppScreen>
	);
};

export default SupportFaq;
