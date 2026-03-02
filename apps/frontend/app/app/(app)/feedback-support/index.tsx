import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Dimensions, KeyboardTypeOptions, PixelRatio, Platform, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { useTheme } from '@/hooks/useTheme';
import FeedbackItem from '../../../components/FeedbackSupport/FeedbackSupport';
import styles from './styles';
import { isWeb } from '@/constants/Constants';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { deviceData, feedbackData } from '../../../constants/FeedbackSupportData';
import { useLanguage } from '@/hooks/useLanguage';
import { useSelector } from 'react-redux';
import * as DeviceInfo from 'expo-device';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { AppFeedback } from '@/redux/actions/AppFeedback/AppFeedback';
import { FontAwesome5, MaterialIcons, Octicons } from '@expo/vector-icons';
import useToast from '@/hooks/useToast';
import { TranslationKeys } from '@/locales/keys';
import useSetPageTitle from '@/hooks/useSetPageTitle';
import { DatabaseTypes, EmailHelper } from 'repo-depkit-common';
import { RootState } from '@/redux/reducer';
import { myContrastColor } from '@/helper/ColorHelper';
import SettingsList from '@/components/SettingsList';
import SettingsListEditable from '@/components/SettingsListEditable';
import useMyScrollviewTextInputModal from '@/hooks/useMyScrollviewTextInputModal';
import { excerpt } from '@/constants/HelperFunctions';

const FeedbackScreen = () => {
	useSetPageTitle(TranslationKeys.feedback_and_support);
	const { translate } = useLanguage();
	const { theme } = useTheme();
	const toast = useToast();
	const appFeedback = new AppFeedback();
	const { app_feedbacks_id } = useLocalSearchParams();
	const { profile } = useSelector((state: RootState) => state.authReducer);
	const { primaryColor, selectedTheme: mode } = useSelector((state: RootState) => state.settings);
	const contrastColor = myContrastColor(primaryColor, theme, mode === 'dark');
	const [loading, setLoading] = useState(false);
	const [inputValues, setInputValues] = useState<{
		[key: string]: string | boolean | number | any;
	}>({});
	const [errorMessage, setErrorMessage] = useState<string | null>(null);
	const [errorJson, setErrorJson] = useState<string | null>(null);
	const [windowWidth, setWindowWidth] = useState(Dimensions.get('window').width);
	const { openTextInputModal } = useMyScrollviewTextInputModal();

	useFocusEffect(
		useCallback(() => {
			fetchDeviceInfo();
		}, [])
	);

	const fetchFeedbackById = async () => {
		const response = (await appFeedback.fetchAppFeedbackById(String(app_feedbacks_id))) as DatabaseTypes.AppFeedbacks;
		if (response) {
			setInputValues({
				title: response?.title,
				content: response?.content,
				contact_email: response?.contact_email ? response?.contact_email : '',
				device_brand: response?.device_brand,
				device_system_version: response?.device_system_version,
				device_platform: response?.device_platform,
				display_height: response?.display_height,
				display_width: response?.display_width,
				display_fontscale: response?.display_fontscale,
				display_pixelratio: response?.display_pixelratio,
				display_scale: response?.display_scale,
				positive: response?.positive,
				profile: response?.profile,
			});
		}
	};

	useFocusEffect(
		useCallback(() => {
			if (app_feedbacks_id && profile?.id) {
				fetchFeedbackById();
			}
			return () => {};
		}, [app_feedbacks_id, profile?.id])
	);

	function getIsLandScape(): boolean {
		const windowWidth = Dimensions.get('screen').width;
		const windowHeight = Dimensions.get('screen').height;
		let isLandscape = windowWidth > windowHeight;
		if (Platform.OS === 'web') {
			isLandscape = windowWidth > windowHeight;
		}
		return isLandscape;
	}

	const fetchDeviceInfo = async () => {
		const windowWidth = Dimensions.get('screen').width;
		const windowHeight = Dimensions.get('screen').height;
		const windowScale = Dimensions.get('screen').scale;
		const isSimulator = !DeviceInfo.isDevice;
		const isTablet = DeviceInfo.deviceType === DeviceInfo.DeviceType.TABLET;
		const brand = DeviceInfo.brand;
		const platform = Platform.OS === 'web' ? 'Web' : Platform.OS === 'ios' ? 'iOS' : 'Android';
		const systemVersion = DeviceInfo.osVersion;
		let isLandscape = getIsLandScape();

		setInputValues({
			title: '',
			content: '',
			email: '',
			device_brand: brand,
			device_system_version: systemVersion,
			device_platform: platform,
			display_height: windowHeight,
			display_width: windowWidth,
			display_fontscale: PixelRatio?.getFontScale(),
			display_pixelratio: PixelRatio?.get(),
			display_scale: windowScale,
		});
		setErrorMessage(null);
		setErrorJson(null);
	};

	const feedbackSettingsItems = useMemo(
		() =>
			feedbackData
				.filter(item => item.key !== 'positive')
				.map(item => ({
					...item,
					multiline: item.key === 'content',
					keyboardType: item.key === 'contact_email' ? 'email-address' : undefined,
				})),
		[]
	);
	const deviceSettingsItems = useMemo(() => {
		const numericDeviceKeys = new Set(['display_height', 'display_width', 'display_fontscale', 'display_pixelratio', 'display_scale']);
		return deviceData.map(item => ({
			...item,
			keyboardType: numericDeviceKeys.has(item.key) ? 'numeric' : undefined,
		}));
	}, []);

	const getFeedbackIcon = useCallback(
		(iconName: string) => {
			if (iconName === 'feed') {
				return <MaterialIcons name={iconName as any} size={24} color={theme.screen.icon} />;
			}
			return <MaterialCommunityIcons name={iconName as any} size={24} color={theme.screen.icon} />;
		},
		[theme.screen.icon]
	);

	useEffect(() => {
		const onChange = ({ window }: { window: any }) => {
			setWindowWidth(window.width);
		};

		const subscription = Dimensions.addEventListener('change', onChange);
		return () => {
			subscription.remove();
		};
	}, []);

	const openFeedbackSheet = useCallback(
		({
			key,
			title,
			multiline,
			keyboardType,
		}: {
			key: string;
			title: string;
			multiline?: boolean;
			keyboardType?: KeyboardTypeOptions;
		}) => {
			const isEmailField = key === 'contact_email';
			openTextInputModal({
				title: translate(title as any),
				placeholder: translate(title as any),
				initialValue: String(inputValues[key] ?? ''),
				saveLabel: translate(TranslationKeys.save),
				onSave: value => {
					setInputValues(prevState => ({
						...prevState,
						[key]: value,
					}));
				},
				multiline,
				keyboardType,
				numberOfLines: multiline ? 4 : 1,
				textAlignVertical: multiline ? 'top' : 'center',
				inputStyle: multiline ? { height: 150 } : undefined,
				checkTextInput: isEmailField
					? value => {
							const cleanedEmail = value.replace(/\s+/g, '');
							if (cleanedEmail.trim().length === 0) {
								return { isValid: true, value: '' };
							}
							const { trimmedEmail, isValid } = EmailHelper.sanitizeAndValidate(cleanedEmail);
							return { isValid, value: trimmedEmail };
						}
					: value => ({ isValid: true, value }),
			});
		},
		[inputValues, openTextInputModal, translate]
	);

	const handleCreateAppFeedback = async () => {
		if (inputValues) {
			setLoading(true);
			const { email, ...filteredInputValues } = inputValues;
			if (profile?.id) {
				filteredInputValues.profile = profile?.id;
			}
			const sanitizedInput = Object.fromEntries(
				Object.entries(filteredInputValues).filter(([_, value]) => {
					if (value === undefined || value === null) return false;
					if (typeof value === 'string') {
						return value.trim() !== '';
					}
					return true;
				})
			);
			try {
				console.log('Creating app feedback with input:');
				await appFeedback.createAppFeedback(sanitizedInput);
				console.log('App feedback created successfully');
				setLoading(false);
				console.log('Set loading to false finished');
				await fetchDeviceInfo();
				console.log('Fetched device info after creating feedback');
				toast('Feedback submitted successfully! Thank you for your input.', 'success');
				console.log('Navigating to support ticket or FAQ');
				if (profile?.id) {
					router.navigate('/support-ticket');
				} else {
					router.navigate('/support-FAQ');
				}
			} catch (e: any) {
				setLoading(false);
				setErrorMessage(e?.message || String(e));
				try {
					setErrorJson(JSON.stringify(e));
				} catch (jsonError) {
					setErrorJson(String(e));
				}
				toast(`Error: ${e?.message || e}`, 'error');
			}
		}
	};
	const handleUpdateAppFeedback = async () => {
		if (inputValues && app_feedbacks_id) {
			setLoading(true);
			const { email, ...filteredInputValues } = inputValues;
			if (profile?.id) {
				filteredInputValues.profile = profile?.id;
			}
			const sanitizedInput = Object.fromEntries(
				Object.entries(filteredInputValues).filter(([_, value]) => {
					if (value === undefined || value === null) return false;
					if (typeof value === 'string') {
						return value.trim() !== '';
					}
					return true;
				})
			);
			try {
				await appFeedback.updateAppFeedback(String(app_feedbacks_id), sanitizedInput);
				setLoading(false);
				fetchDeviceInfo();
				toast('Feedback updated successfully! Thank you for your input.', 'success');
				router.navigate('/support-ticket');
			} catch (e: any) {
				setLoading(false);
				setErrorMessage(e?.message || String(e));
				try {
					setErrorJson(JSON.stringify(e));
				} catch (jsonError) {
					setErrorJson(String(e));
				}
				toast(`Error: ${e?.message || e}`, 'error');
			}
		}
	};

	return (
		<View
			style={{
				flex: 1,
				paddingHorizontal: 10,
				backgroundColor: theme.screen.background,
			}}
		>
			<ScrollView>
				<View style={{ alignItems: 'center' }}>
					<View style={[styles.section, { width: windowWidth > 600 ? '85%' : '100%' }]}>
						<Text
							style={{
								fontSize: windowWidth > 600 ? (isWeb ? 20 : 24) : 24,
								color: theme.screen.text,
								padding: 15,
							}}
						>
							{translate(TranslationKeys.your_request)}
						</Text>
						{feedbackSettingsItems.map((item, index) => (
							<SettingsListEditable
								key={item.key}
								iconBgColor={primaryColor}
								leftIcon={getFeedbackIcon(item.icon)}
								label={translate(item.title as any)}
								value={excerpt(String(inputValues[item.key] ?? ''), windowWidth > 850 ? 50 : 20)}
								handleFunction={() => {
									openFeedbackSheet({
										key: item.key,
										title: item.title,
										multiline: item.multiline,
										keyboardType: item.keyboardType,
									});
								}}
								groupPosition={index === 0 ? 'top' : index === feedbackSettingsItems.length - 1 ? 'bottom' : 'middle'}
							/>
						))}
						{feedbackData
							.filter(item => item.key === 'positive')
							.map(item => (
								<FeedbackItem
									key={item.key}
									icon={item.icon}
									title={item.title}
									extraIcons={item.extraIcons}
									theme={theme}
									windowWidth={windowWidth}
									value={inputValues[item.key] || ''}
									inputValues={inputValues}
									setInputValues={setInputValues}
								/>
							))}
						{!profile?.id && (
							<Text
								style={{
									fontSize: windowWidth > 600 ? (isWeb ? 17 : 20) : 20,
									color: theme.screen.text,
									padding: 15,
								}}
							>
								{translate(TranslationKeys.support_warning_no_account_or_mail_provided_therefore_we_cannot_answer_your_request)}
							</Text>
						)}
					</View>

					<View style={[styles.section, { width: windowWidth > 600 ? '85%' : '100%' }]}>
						<TouchableOpacity
							style={[
								styles.row,
								{
									padding: 15,
									borderRadius: 10,
									backgroundColor: primaryColor,
									opacity: inputValues?.title?.length === 0 || inputValues?.content?.length === 0 ? 0.5 : 1,
								},
							]}
							onPress={() => {
								if (app_feedbacks_id) {
									handleUpdateAppFeedback();
								} else {
									handleCreateAppFeedback();
								}
							}}
							disabled={inputValues?.title?.length === 0 || inputValues?.content?.length === 0}
						>
							{loading ? (
								<View style={{ width: '100%' }}>
									<ActivityIndicator size={30} color={theme.screen.text} />
								</View>
							) : (
								<>
									<View style={styles.leftView}>
										<Text
											style={[
												styles.linkText,
												{
													color: contrastColor,
													fontSize: windowWidth > 600 ? (isWeb ? 18 : 16) : 16,
												},
											]}
										>
											{app_feedbacks_id ? translate(TranslationKeys.to_update) : translate(TranslationKeys.send)}
										</Text>
									</View>
									<View>{app_feedbacks_id ? <FontAwesome5 name="save" size={24} color={contrastColor} /> : <MaterialCommunityIcons name="plus" size={24} color={contrastColor} />}</View>
								</>
							)}
						</TouchableOpacity>
					</View>

					<View style={[styles.section, { width: windowWidth > 600 ? '85%' : '100%' }]}>
						{!app_feedbacks_id && profile?.id && (
							<View
								style={{
									...styles.row,
									padding: 15,
									borderRadius: 10,
									backgroundColor: theme.screen.iconBg,
								}}
							>
								<View style={styles.leftView}>
									<Text
										style={[
											styles.linkText,
											{
												color: theme.screen.text,
												fontSize: windowWidth > 600 ? (isWeb ? 18 : 16) : 16,
											},
										]}
									>
										Profile ID
									</Text>
								</View>

								<View style={{ maxWidth: '70%' }}>
									<Text
										style={[
											styles.linkText,
											{
												color: theme.screen.text,
												fontSize: windowWidth > 600 ? (isWeb ? 18 : 16) : 16,
											},
										]}
									>
										{profile?.id}
									</Text>
								</View>
							</View>
						)}

						{app_feedbacks_id && inputValues?.profile && (
							<View
								style={{
									...styles.row,
									padding: 15,
									borderRadius: 10,
									backgroundColor: theme.screen.iconBg,
								}}
							>
								<View style={styles.leftView}>
									<Text
										style={[
											styles.linkText,
											{
												color: theme.screen.text,
												fontSize: windowWidth > 600 ? (isWeb ? 18 : 16) : 16,
											},
										]}
									>
										Profile ID
									</Text>
								</View>

								<View style={{ maxWidth: '70%' }}>
									<Text
										style={[
											styles.linkText,
											{
												color: theme.screen.text,
												fontSize: windowWidth > 600 ? (isWeb ? 18 : 16) : 16,
											},
										]}
									>
										{inputValues?.profile}
									</Text>
								</View>
							</View>
						)}
						{deviceSettingsItems.map((item, index) => (
							<SettingsList
								key={item.key}
								iconBgColor={primaryColor}
								label={translate(item.title as any)}
								value={excerpt(String(item.key === 'device_brand' ? (inputValues[item.key] ? inputValues[item.key] : translate(TranslationKeys.unknown)) : inputValues[item.key] || ''), windowWidth > 850 ? 50 : 20)}
								rightIcon={<MaterialCommunityIcons name="pencil" size={24} color={theme.screen.icon} />}
								handleFunction={() => {
									openFeedbackSheet({
										key: item.key,
										title: item.title,
										keyboardType: item.keyboardType,
									});
								}}
								groupPosition={index === 0 ? 'top' : index === deviceSettingsItems.length - 1 ? 'bottom' : 'middle'}
								noIconIndent
							/>
						))}

						{errorJson && <Text style={{ color: 'red', marginVertical: 10 }}>{errorJson}</Text>}
						{errorMessage && <Text style={{ color: 'red', marginBottom: 10 }}>{errorMessage}</Text>}
					</View>
				</View>
			</ScrollView>
		</View>
	);
};

export default FeedbackScreen;
