import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Dimensions, KeyboardTypeOptions, ScrollView, Switch, Text, TouchableOpacity, View } from 'react-native';
import LoadingIndicator from '@/components/LoadingIndicator/LoadingIndicator';
import { useTheme } from '@/hooks/useTheme';
import styles from './styles';
import { isWeb } from '@/constants/Constants';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { deviceData, feedbackData } from '../../../constants/FeedbackSupportData';
import { useLanguage } from '@/hooks/useLanguage';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { AppFeedback } from '@/redux/actions/AppFeedback/AppFeedback';
import { FontAwesome5, MaterialIcons } from '@expo/vector-icons';
import useToast from '@/hooks/useToast';
import usePushNotificationOptInPrompt from '@/hooks/usePushNotificationOptInPrompt';
import { PushNotificationOptInCategory } from '@/helper/PushNotificationOptInHelper';
import { TranslationKeys } from '@/locales/keys';
import useSetPageTitle from '@/hooks/useSetPageTitle';
import { AppFeedbackContentHelper, DatabaseTypes, EmailHelper, StringHelper } from 'repo-depkit-common';
import { useAppSelector } from '@/redux/hooks';
import { configureStore } from '@/redux/store';
import { buildAppStateJsonForFeedback } from '@/helper/appStateForFeedback';
import { ServerAPI } from '@/redux/actions/Auth/Auth';
import { collectDeviceFeedbackFields } from '@/helper/errorReport';
import { myContrastColor } from '@/helper/ColorHelper';
import SettingsList from '@/components/SettingsList';
import SettingsListEditable from '@/components/SettingsListEditable';
import useMyScrollviewTextInputModal from '@/hooks/useMyScrollviewTextInputModal';
import { excerpt } from '@/constants/HelperFunctions';
import SettingsListLikeDislike from '@/components/SettingsListLikeDislike';
import SettingsGroupTitle from '@/components/SettingsGroupTitle';

// Fields where users write free text. These sheets ask not to enter personal data.
const FREE_TEXT_FEEDBACK_KEYS = new Set(['title', 'content']);

/**
 * Fill in `title`/`content` on the sanitized feedback input from
 * `defaultValues` when the user hasn't entered their own (non-empty) value.
 * Mutates `filteredInputValues` in place, matching the original inline logic.
 */
function applyDefaultFeedbackValues(filteredInputValues: { [key: string]: any }, defaultValues?: { title: string; content: string }): void {
	if (!defaultValues) return;

	if (!String(filteredInputValues.title ?? '').trim()) {
		filteredInputValues.title = defaultValues.title;
	}
	if (!String(filteredInputValues.content ?? '').trim()) {
		filteredInputValues.content = defaultValues.content;
	}
}

/**
 * Handle a failed feedback create/update submission: reset the loading
 * state, store the error message/JSON for display, and toast the error.
 */
function reportFeedbackSubmissionError(
	e: any,
	setLoading: (value: boolean) => void,
	setErrorMessage: (value: string | null) => void,
	setErrorJson: (value: string | null) => void,
	toast: (message: string, type?: string) => void
): void {
	setLoading(false);
	setErrorMessage(e?.message || String(e));
	try {
		setErrorJson(JSON.stringify(e));
	} catch (jsonError) {
		setErrorJson(String(e));
	}
	toast(`Error: ${e?.message || e}`, 'error');
}

const FeedbackScreen = () => {
	useSetPageTitle(TranslationKeys.feedback_and_support);
	const { translate } = useLanguage();
	const { theme } = useTheme();
	const toast = useToast();
	const appFeedback = new AppFeedback();
	// `?title=` prefills the title, e.g. from the MCP instruction's "Probleme?" links.
	const { app_feedbacks_id, title: titleParam } = useLocalSearchParams();
	const prefilledTitle = typeof titleParam === 'string' ? titleParam : '';
    const { profile } = useAppSelector((state) => state.authReducer);
    const { askForPushNotifications } = usePushNotificationOptInPrompt();
    const { primaryColor, selectedTheme: mode } = useAppSelector((state) => state.settings);
	const contrastColor = myContrastColor(primaryColor, theme, mode === 'dark');
	const [loading, setLoading] = useState(false);
	const [inputValues, setInputValues] = useState<{
		[key: string]: any;
	}>({});
	const [errorMessage, setErrorMessage] = useState<string | null>(null);
	const [errorJson, setErrorJson] = useState<string | null>(null);
	const [includeAppState, setIncludeAppState] = useState(true);
	const [windowWidth, setWindowWidth] = useState(Dimensions.get('window').width);
	const { openTextInputModal } = useMyScrollviewTextInputModal();

	useFocusEffect(
		useCallback(() => {
			fetchDeviceInfo();
		}, [prefilledTitle])
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
				chat: response?.chat,
			});
		}
	};

	useFocusEffect(
		useCallback(() => {
			if (app_feedbacks_id && profile?.id) {
				void fetchFeedbackById();
			}
			return () => {};
		}, [app_feedbacks_id, profile?.id])
	);

	const fetchDeviceInfo = () => {
		setInputValues({
			title: prefilledTitle,
			content: '',
			email: '',
			positive: false,
			...collectDeviceFeedbackFields(),
		});
		setErrorMessage(null);
		setErrorJson(null);
	};

	// Without a profile we can only answer via mail, so the contact email becomes mandatory.
	const isContactEmailRequired = !profile?.id;
	const isContactEmailValid = useMemo(
		() => EmailHelper.sanitizeAndValidate(String(inputValues.contact_email ?? '')).isValid,
		[inputValues.contact_email]
	);
	const isContactEmailMissing = isContactEmailRequired && !isContactEmailValid;

	const feedbackSettingsItems = useMemo(
		() =>
			feedbackData
				.filter(item => item.key !== 'positive')
				.map(item => ({
					...item,
					multiline: item.key === 'content',
					keyboardType: (item.key === 'contact_email' ? 'email-address' : undefined) as KeyboardTypeOptions | undefined,
					required: item.key === 'contact_email' && isContactEmailRequired,
				})),
		[isContactEmailRequired]
	);
	const deviceSettingsItems = useMemo(() => {
		const numericDeviceKeys = new Set(['display_height', 'display_width', 'display_fontscale', 'display_pixelratio', 'display_scale']);
		return deviceData.map(item => ({
			...item,
			keyboardType: (numericDeviceKeys.has(item.key) ? 'numeric' : undefined) as KeyboardTypeOptions | undefined,
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
			required,
		}: {
			key: string;
			title: string;
			multiline?: boolean;
			keyboardType?: KeyboardTypeOptions;
			required?: boolean;
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
				// Only title and message are free text. The contact email is personal on purpose, the device rows are technical.
				hint: FREE_TEXT_FEEDBACK_KEYS.has(key) ? translate(TranslationKeys.no_personal_data_hint) : undefined,
				checkTextInput: isEmailField
					? value => {
							const cleanedEmail = StringHelper.replaceAllWithOptions({ str: value, find: String.raw`\s+`, replace: '' });
							if (cleanedEmail.trim().length === 0) {
								return { isValid: !required, value: '' };
							}
							const { trimmedEmail, isValid } = EmailHelper.sanitizeAndValidate(cleanedEmail);
							return { isValid, value: trimmedEmail };
						}
					: value => ({ isValid: true, value }),
			});
		},
		[inputValues, openTextInputModal, translate]
	);

	// The app state belongs into the `data` column, not into `content`: `content` is what the
	// user wrote and is shown as the initial message of the support chat.
	const applyAppStateToFeedback = async (sanitizedInput: { [key: string]: any }) => {
		if (!includeAppState) return;
		try {
			// The raw state contains the whole content catalogue with all translations (>1 MB in
			// production), which blew up the feedback entry and the notification mail.
			const session = await ServerAPI.getSessionDiagnostics();
			const appStateJson = buildAppStateJsonForFeedback(configureStore.getState(), { session });
			sanitizedInput.data = AppFeedbackContentHelper.buildAppStateData(appStateJson);
		} catch (e) {
			console.warn('feedback-support: could not serialize app state', e);
			// send the serialization error itself along with the feedback so it can be investigated
			sanitizedInput.data = AppFeedbackContentHelper.buildAppStateErrorData(e);
		}
	};

	const handleCreateAppFeedback = async (defaultValues?: { title: string; content: string }) => {
		if (inputValues) {
			setLoading(true);
			// `chat` is linked by the server-side hook and is not writable for the app.
			const { email, chat, ...filteredInputValues } = inputValues;
			applyDefaultFeedbackValues(filteredInputValues, defaultValues);
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
			await applyAppStateToFeedback(sanitizedInput);
			try {
				console.log('Creating app feedback with input:');
				await appFeedback.createAppFeedback(sanitizedInput);
				console.log('App feedback created successfully');
				setLoading(false);
				console.log('Set loading to false finished');
				fetchDeviceInfo();
				console.log('Fetched device info after creating feedback');
				toast('Feedback submitted successfully! Thank you for your input.', 'success');
				console.log('Navigating to support ticket or FAQ');
				if (profile?.id) {
					router.navigate('/support-ticket');
					// With a profile we can answer in the support chat - a good moment to offer push notifications.
					void askForPushNotifications(PushNotificationOptInCategory.APP_FEEDBACK);
				} else {
					router.navigate('/support-FAQ');
				}
			} catch (e: any) {
				reportFeedbackSubmissionError(e, setLoading, setErrorMessage, setErrorJson, toast);
			}
		}
	};

	const handleSendDebugRequest = () => {
		void handleCreateAppFeedback({
			title: translate(TranslationKeys.debug_request_default_title),
			content: translate(TranslationKeys.debug_request_default_content),
		});
	};

	const handleUpdateAppFeedback = async () => {
		if (inputValues && app_feedbacks_id) {
			setLoading(true);
			// `chat` is linked by the server-side hook and is not writable for the app.
			const { email, chat, ...filteredInputValues } = inputValues;
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
			await applyAppStateToFeedback(sanitizedInput);
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

	const webHeadingFontSize = isWeb ? 20 : 24;
	const requestHeadingFontSize = windowWidth > 600 ? webHeadingFontSize : 24;
	const webLinkFontSize = isWeb ? 18 : 16;
	const linkFontSize = windowWidth > 600 ? webLinkFontSize : 16;

	// `*` is the common non-linguistic marker for a mandatory field, so it needs no translation.
	const getFieldLabel = (title: string, required?: boolean) => {
		const label = translate(title as any);
		return required ? `${label} *` : label;
	};

	const getGroupPosition = (index: number, total: number) => {
		if (index === 0) {
			return 'top';
		}
		if (index === total - 1) {
			return 'bottom';
		}
		return 'middle';
	};

	const getDeviceItemValue = (key: string) => {
		if (key === 'device_brand') {
			return inputValues[key] ? inputValues[key] : translate(TranslationKeys.unknown);
		}
		return inputValues[key] || '';
	};

	// A chat only exists for feedbacks of users with a profile - the hook creates it on the server.
	const linkedChatId = typeof inputValues.chat === 'object' ? inputValues.chat?.id : inputValues.chat;

	// Labels of the fields that still block sending. Shown in red below the button, because a
	// dimmed button alone did not tell users why nothing happens when they tap it.
	const missingFieldLabels = useMemo(() => {
		const labels: string[] = [];
		if (!String(inputValues?.title ?? '').trim()) labels.push(translate(TranslationKeys.title));
		if (!String(inputValues?.content ?? '').trim()) labels.push(translate(TranslationKeys.feedback));
		if (isContactEmailMissing) labels.push(translate(TranslationKeys.email));
		return labels;
	}, [inputValues?.title, inputValues?.content, isContactEmailMissing, translate]);

	const isFeedbackFieldMissing = (key: string) => {
		if (key === 'title' || key === 'content') return !String(inputValues?.[key] ?? '').trim();
		if (key === 'contact_email') return isContactEmailMissing;
		return false;
	};

	const isSubmitDisabled = missingFieldLabels.length > 0;

	const submitButtonLabel = app_feedbacks_id ? translate(TranslationKeys.to_update) : translate(TranslationKeys.send);
	const submitButtonIcon = app_feedbacks_id ? <FontAwesome5 name="save" size={24} color={contrastColor} /> : <MaterialCommunityIcons name="plus" size={24} color={contrastColor} />;

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
								fontSize: requestHeadingFontSize,
								color: theme.screen.text,
								padding: 15,
							}}
						>
							{translate(TranslationKeys.your_request)}
						</Text>
						{feedbackSettingsItems.map((item, index) => (
							<React.Fragment key={item.key}>
								<SettingsListEditable
									iconBgColor={primaryColor}
									leftIcon={getFeedbackIcon(item.icon)}
									label={getFieldLabel(item.title, item.required)}
									value={excerpt(String(inputValues[item.key] ?? ''), windowWidth > 850 ? 50 : 20)}
									handleFunction={() => {
										openFeedbackSheet({
											key: item.key,
											title: item.title,
											multiline: item.multiline,
											keyboardType: item.keyboardType,
											required: item.required,
										});
									}}
									groupPosition={getGroupPosition(index, feedbackSettingsItems.length)}
								/>
								{isFeedbackFieldMissing(item.key) && (
									<Text style={{ color: theme.screen.errorText, fontSize: 12, marginLeft: 15, marginTop: 2, marginBottom: 6 }}>
										{translate(TranslationKeys.feedback_field_missing_hint)}
									</Text>
								)}
							</React.Fragment>
						))}
						{feedbackData
							.filter(item => item.key === 'positive')
							.map(item => (
								<SettingsList
									key={item.key}
									iconBgColor={primaryColor}
									leftIcon={<MaterialCommunityIcons name="thumb-up-outline" size={24} color={theme.screen.icon} />}
									label={translate(item.title as any)}
									rightElement={
										<SettingsListLikeDislike
											like={inputValues.positive}
											onPressLike={() =>
												setInputValues((prev: any) => ({
													...prev,
													positive: prev.positive === true ? null : true,
												}))
											}
											onPressDislike={() =>
												setInputValues((prev: any) => ({
													...prev,
													positive: prev.positive === false ? null : false,
												}))
											}
										/>
									}
									groupPosition="single"
								/>
							))}
					</View>

					<View style={[styles.section, { width: windowWidth > 600 ? '85%' : '100%' }]}>
						<TouchableOpacity
							style={[
								styles.row,
								{
									padding: 15,
									borderRadius: 10,
									backgroundColor: primaryColor,
									opacity: isSubmitDisabled ? 0.5 : 1,
								},
							]}
							onPress={() => {
								if (app_feedbacks_id) {
									void handleUpdateAppFeedback();
								} else {
									void handleCreateAppFeedback();
								}
							}}
							disabled={isSubmitDisabled}
						>
							{loading ? (
								<View style={{ width: '100%' }}>
									<LoadingIndicator size={30} color={theme.screen.text} />
								</View>
							) : (
								<>
									<View style={styles.leftView}>
										<Text
											style={[
												styles.linkText,
												{
													color: contrastColor,
													fontSize: linkFontSize,
												},
											]}
										>
											{submitButtonLabel}
										</Text>
									</View>
									<View>{submitButtonIcon}</View>
								</>
							)}
						</TouchableOpacity>

						{isSubmitDisabled && !loading && (
							<Text style={{ color: theme.screen.errorText, marginTop: 10 }} accessibilityLiveRegion="polite">
								{`${translate(TranslationKeys.feedback_missing_fields_hint)} ${missingFieldLabels.join(', ')}`}
							</Text>
						)}

						{linkedChatId && (
							<TouchableOpacity
								style={[
									styles.row,
									{
										marginTop: 10,
										padding: 15,
										borderRadius: 10,
										backgroundColor: theme.screen.iconBg,
									},
								]}
								onPress={() => router.push({ pathname: '/chats/details', params: { chat_id: String(linkedChatId) } })}
							>
								<View style={styles.leftView}>
									<Text
										style={[
											styles.linkText,
											{
												color: theme.screen.text,
												fontSize: linkFontSize,
											},
										]}
									>
										{translate(TranslationKeys.feedback_open_chat)}
									</Text>
								</View>
								<View>
									<MaterialCommunityIcons name="chat" size={24} color={theme.screen.text} />
								</View>
							</TouchableOpacity>
						)}
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
												fontSize: linkFontSize,
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
												fontSize: linkFontSize,
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
												fontSize: linkFontSize,
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
												fontSize: linkFontSize,
											},
										]}
									>
										{inputValues?.profile}
									</Text>
								</View>
							</View>
						)}
						<SettingsGroupTitle fontSize={14}>
							{translate(TranslationKeys.optional_device_data_description)}
						</SettingsGroupTitle>
						{deviceSettingsItems.map((item, index) => (
							<SettingsList
								key={item.key}
								iconBgColor={primaryColor}
								label={translate(item.title as any)}
								value={excerpt(String(getDeviceItemValue(item.key)), windowWidth > 850 ? 50 : 20)}
								rightIcon={<MaterialCommunityIcons name="pencil" size={24} color={theme.screen.icon} />}
								handleFunction={() => {
									openFeedbackSheet({
										key: item.key,
										title: item.title,
										keyboardType: item.keyboardType,
									});
								}}
								groupPosition={getGroupPosition(index, deviceSettingsItems.length)}
								noIconIndent
							/>
						))}

						<SettingsGroupTitle fontSize={14}>
							{translate(TranslationKeys.feedback_include_app_state_description)}
						</SettingsGroupTitle>
						<SettingsList
							iconBgColor={primaryColor}
							leftIcon={<MaterialCommunityIcons name="bug-outline" size={24} color={theme.screen.icon} />}
							label={translate(TranslationKeys.feedback_include_app_state_title)}
							rightElement={<Switch value={includeAppState} onValueChange={setIncludeAppState} accessibilityLabel={translate(TranslationKeys.feedback_include_app_state_title)} />}
							groupPosition="single"
						/>

						{!app_feedbacks_id && (
							<TouchableOpacity
								style={[
									styles.row,
									{
										marginTop: 10,
										padding: 15,
										borderRadius: 10,
										backgroundColor: theme.screen.iconBg,
										opacity: loading || isContactEmailMissing ? 0.5 : 1,
									},
								]}
								onPress={handleSendDebugRequest}
								disabled={loading || isContactEmailMissing}
							>
								<View style={styles.leftView}>
									<Text
										style={[
											styles.linkText,
											{
												color: theme.screen.text,
												fontSize: linkFontSize,
											},
										]}
									>
										{translate(TranslationKeys.debug_request_send)}
									</Text>
								</View>
								<View>
									<MaterialCommunityIcons name="bug-outline" size={24} color={theme.screen.text} />
								</View>
							</TouchableOpacity>
						)}

						{errorJson && <Text style={{ color: theme.screen.errorText, marginVertical: 10 }}>{errorJson}</Text>}
						{errorMessage && <Text style={{ color: theme.screen.errorText, marginBottom: 10 }}>{errorMessage}</Text>}
					</View>
				</View>
			</ScrollView>
		</View>
	);
};

export default FeedbackScreen;
