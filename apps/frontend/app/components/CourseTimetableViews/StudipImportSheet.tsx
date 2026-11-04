import React, { useCallback, useEffect, useState } from 'react';
import { Linking, Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import LoadingIndicator from '@/components/LoadingIndicator/LoadingIndicator';
import { Entypo, MaterialCommunityIcons } from '@expo/vector-icons';
import { SettingsListGroupTitle, SettingsListSelectOptionSingle } from 'repo-depkit-common-ui';
import SettingsList from '@/components/SettingsList';
import { SettingsListTextInputField } from '@/components/SettingsListTextInput';
import { useMyScrollViewModal } from '@/components/GlobalModal/useMyScrollViewModal';
import useCourseTimetable from '@/hooks/useCourseTimetable';
import useToast from '@/hooks/useToast';
import { useTheme } from '@/hooks/useTheme';
import { useLanguage } from '@/hooks/useLanguage';
import { useAppSelector } from '@/redux/hooks';
import { TranslationKeys } from '@/locales/keys';
import { mergeImportedEvents } from '@/helper/courseTimetable/CourseTimetableModel';
import { resolveSettingsGroupPosition } from '@/helper/settingsListGroupPosition';
import { CorsProxyStatus, STUDIP_DEBUG_CORS_PROXY, STUDIP_DEBUG_CORS_PROXY_UNLOCK_LABEL, STUDIP_DEBUG_CORS_PROXY_UNLOCK_URL, STUDIP_INSTANCES, StudipImportError, checkCorsProxy, fetchStudipSchedule } from '@/helper/courseTimetable/StudipImporter';
import useDebugMode from '@/hooks/useDebugMode';
import StudipSsoLoginModal from './StudipSsoLoginModal';
import type { CourseTimetableEvent } from '@/helper/courseTimetable/CourseTimetableModel';

const ERROR_KEYS: Record<string, TranslationKeys> = {
	unauthorized: TranslationKeys.course_timetable_import_error_credentials,
	network: TranslationKeys.course_timetable_import_error_network,
	unexpected: TranslationKeys.course_timetable_import_error_unexpected,
};

const PROXY_STATUS_KEYS: Record<CorsProxyStatus | 'checking', TranslationKeys> = {
	checking: TranslationKeys.course_timetable_import_proxy_checking,
	ok: TranslationKeys.course_timetable_import_proxy_ok,
	locked: TranslationKeys.course_timetable_import_proxy_locked,
	unreachable: TranslationKeys.course_timetable_import_proxy_unreachable,
};

/** Debug-only panel on web: shows whether the public CORS proxy is unlocked for this browser. */
const CorsProxyPanel: React.FC<{ proxyStatus: CorsProxyStatus | 'checking'; onRecheck: () => void }> = ({ proxyStatus, onRecheck }) => {
	const { theme } = useTheme();
	const { translate } = useLanguage();
	const isOk = proxyStatus === 'ok';
	const isChecking = proxyStatus === 'checking';

	return (
		<View style={[styles.hint, styles.proxyPanel, { backgroundColor: theme.screen.iconBg }]}>
			<Text style={[styles.hintText, { color: theme.screen.text }]}>{translate(TranslationKeys.course_timetable_import_debug_proxy_hint)}</Text>
			<View style={styles.proxyStatusRow}>
				{isChecking ? <LoadingIndicator size="small" color={theme.screen.text} /> : <MaterialCommunityIcons name={isOk ? 'check-circle' : 'alert-circle'} size={20} color={isOk ? '#2E7D32' : theme.sheet.inputBorderInvalid} />}
				<Text style={[styles.proxyStatusText, { color: theme.screen.text }]}>{translate(PROXY_STATUS_KEYS[proxyStatus])}</Text>
			</View>
			<View style={styles.proxyActions}>
				<TouchableOpacity onPress={() => Linking.openURL(STUDIP_DEBUG_CORS_PROXY_UNLOCK_URL)} accessibilityRole="link">
					<Text style={[styles.link, { color: theme.screen.text }]}>{STUDIP_DEBUG_CORS_PROXY_UNLOCK_LABEL}</Text>
				</TouchableOpacity>
				<TouchableOpacity onPress={onRecheck} accessibilityRole="button" disabled={isChecking}>
					<Text style={[styles.link, { color: theme.screen.text }]}>{translate(TranslationKeys.course_timetable_import_proxy_recheck)}</Text>
				</TouchableOpacity>
			</View>
		</View>
	);
};

/** Username and password login of the import, with the start button. */
const PasswordLoginSection: React.FC<{
	canUseSso: boolean;
	username: string;
	onChangeUsername: (value: string) => void;
	password: string;
	onChangePassword: (value: string) => void;
	canSubmit: boolean;
	loading: boolean;
	accentColor: string;
	onStartImport: () => void;
}> = ({ canUseSso, username, onChangeUsername, password, onChangePassword, canSubmit, loading, accentColor, onStartImport }) => {
	const { theme } = useTheme();
	const { translate } = useLanguage();
	return (
		<>
			<SettingsListGroupTitle title={translate(canUseSso ? TranslationKeys.course_timetable_import_or_password : TranslationKeys.course_timetable_import_login)} />
			<SettingsListTextInputField placeholder={translate(TranslationKeys.course_timetable_import_username)} value={username} onChangeText={onChangeUsername} autoCapitalize="none" autoCorrect={false} textContentType="username" returnKeyType="next" />
			<SettingsListTextInputField placeholder={translate(TranslationKeys.password)} value={password} onChangeText={onChangePassword} secureTextEntry autoCapitalize="none" autoCorrect={false} textContentType="password" returnKeyType="done" onSubmitEditing={onStartImport} />

			<View style={[styles.importRow, !canSubmit && styles.importRowDisabled]} accessibilityState={{ disabled: !canSubmit, busy: loading }}>
				<SettingsList
					leftIcon={loading ? <LoadingIndicator /> : <MaterialCommunityIcons name="cloud-download-outline" size={20} />}
					iconBackgroundColor={accentColor}
					title={translate(TranslationKeys.course_timetable_import_start)}
					rightIcon={<Entypo name="chevron-small-right" color={theme.screen.icon} size={24} />}
					onPress={canSubmit ? onStartImport : undefined}
					groupPosition="single"
					showSeparator={false}
				/>
			</View>
		</>
	);
};

/** Both login fields are filled (the username ignoring surrounding whitespace). */
function hasCredentials(username: string, password: string): boolean {
	return username.trim().length > 0 && password.length > 0;
}

/** The translated error for a failed import; developers get the technical reason too (e.g. the CORS proxy answering 403 while locked). */
function getImportErrorText(error: unknown, debugMode: boolean, translate: (key: TranslationKeys) => string): string {
	const code = error instanceof StudipImportError ? error.code : 'unexpected';
	console.warn('Stud.IP import failed:', code, error instanceof Error ? error.message : '');
	const message = translate(ERROR_KEYS[code] ?? TranslationKeys.course_timetable_import_error_unexpected);
	return debugMode && error instanceof Error ? `${message} (${error.message})` : message;
}

/**
 * Import of the timetable from Stud.IP: choose the university, enter the Stud.IP login and
 * replace the timetable with the current semester's schedule. The login goes straight to
 * Stud.IP (see `StudipImporter`) and is kept only in this sheet's state.
 */
const StudipImportSheet: React.FC = () => {
	const { theme } = useTheme();
	const { translate } = useLanguage();
	const toast = useToast();
	const { closeAll } = useMyScrollViewModal();
	const { events, saveEvents } = useCourseTimetable();
	const { primaryColor, appSettings } = useAppSelector(state => state.settings);
	const accentColor = appSettings?.course_timetable_area_color || primaryColor;

	const [instanceId, setInstanceId] = useState(STUDIP_INSTANCES[0]?.id ?? '');
	const [username, setUsername] = useState('');
	const [password, setPassword] = useState('');
	const [loading, setLoading] = useState(false);
	const [errorText, setErrorText] = useState<string | null>(null);

	const instance = STUDIP_INSTANCES.find(entry => entry.id === instanceId);
	// Stud.IP sends no CORS headers, so the browser blocks the requests. On web the import
	// only runs in debug mode, through a public CORS proxy; everyone else uses the phone app.
	const debugMode = useDebugMode();
	const isWeb = Platform.OS === 'web';
	const importBlockedOnWeb = isWeb && !debugMode;
	const useCorsProxy = isWeb && debugMode;

	// Debug on web: check whether the CORS proxy is unlocked for this browser, on open, on
	// request and whenever the tab gets the focus back (e.g. after unlocking it in another tab).
	const [proxyStatus, setProxyStatus] = useState<CorsProxyStatus | 'checking'>('checking');
	const recheckProxy = useCallback(async () => {
		if (!useCorsProxy || !instance) return;
		setProxyStatus('checking');
		setProxyStatus(await checkCorsProxy(instance));
	}, [useCorsProxy, instance]);
	useEffect(() => {
		if (!useCorsProxy) return;
		recheckProxy();
		const onFocus = () => recheckProxy();
		globalThis.window?.addEventListener?.('focus', onFocus);
		return () => globalThis.window?.removeEventListener?.('focus', onFocus);
	}, [useCorsProxy, recheckProxy]);

	const canSubmit = !!instance && !loading && hasCredentials(username, password) && (!useCorsProxy || proxyStatus === 'ok');

	const [ssoVisible, setSsoVisible] = useState(false);
	const canUseSso = !isWeb && !!instance?.ssoLoginPath;

	/** Replaces the timetable with the imported events; shared by both login ways. */
	const applyImported = async (imported: CourseTimetableEvent[]) => {
		if (imported.length === 0) {
			// Nothing to import: keep the current timetable instead of wiping it.
			setErrorText(translate(TranslationKeys.course_timetable_import_empty));
			return;
		}
		await saveEvents(mergeImportedEvents(events, imported, true));
		setPassword('');
		toast(`${translate(TranslationKeys.course_timetable_import_success)} (${imported.length})`, 'success');
		closeAll();
	};

	const showImportError = (error: unknown) => setErrorText(getImportErrorText(error, debugMode, translate));

	const startImport = async () => {
		if (!instance || !canSubmit) return;
		setLoading(true);
		setErrorText(null);
		try {
			const imported = await fetchStudipSchedule(instance, username, password, undefined, useCorsProxy ? { corsProxy: STUDIP_DEBUG_CORS_PROXY } : {});
			await applyImported(imported);
		} catch (error) {
			showImportError(error);
		} finally {
			setLoading(false);
		}
	};

	const startSso = () => {
		setErrorText(null);
		setSsoVisible(true);
	};

	if (importBlockedOnWeb) {
		return (
			<View style={styles.container}>
				<SettingsList leftIcon={<MaterialCommunityIcons name="cellphone-arrow-down" size={20} />} iconBackgroundColor={accentColor} title={translate(TranslationKeys.course_timetable_import_web_hint)} groupPosition="single" showSeparator={false} />
			</View>
		);
	}

	return (
		<View style={styles.container}>
			<SettingsList leftIcon={<MaterialCommunityIcons name="shield-lock-outline" size={20} />} iconBackgroundColor={accentColor} title={translate(TranslationKeys.course_timetable_import_privacy_hint)} groupPosition="single" showSeparator={false} />

			<SettingsListGroupTitle title={translate(TranslationKeys.course_timetable_import_university)} />
			{STUDIP_INSTANCES.map((entry, index) => (
				<SettingsListSelectOptionSingle key={entry.id} label={entry.name} isSelected={entry.id === instanceId} selectionColor={accentColor} onPress={() => setInstanceId(entry.id)} groupPosition={resolveSettingsGroupPosition(index, STUDIP_INSTANCES.length)} showSeparator={index !== STUDIP_INSTANCES.length - 1} />
			))}

			{canUseSso && instance ? (
				<>
					<SettingsListGroupTitle title={translate(TranslationKeys.course_timetable_import_sso_title)} />
					<SettingsList leftIcon={<MaterialCommunityIcons name="school-outline" size={20} />} iconBackgroundColor={accentColor} title={translate(TranslationKeys.course_timetable_import_sso_button)} rightIcon={<Entypo name="chevron-small-right" color={theme.screen.icon} size={24} />} onPress={startSso} groupPosition="single" showSeparator={false} />
					<StudipSsoLoginModal
						instance={instance}
						visible={ssoVisible}
						onClose={() => setSsoVisible(false)}
						onImported={imported => {
							setSsoVisible(false);
							applyImported(imported).catch(showImportError);
						}}
						onError={error => {
							setSsoVisible(false);
							showImportError(error);
						}}
					/>
				</>
			) : null}

			{instance?.passwordLogin ? (
				<PasswordLoginSection
					canUseSso={canUseSso}
					username={username}
					onChangeUsername={setUsername}
					password={password}
					onChangePassword={setPassword}
					canSubmit={canSubmit}
					loading={loading}
					accentColor={accentColor}
					onStartImport={startImport}
				/>
			) : null}

			<Text style={[styles.replaceHint, { color: theme.screen.placeholder }]}>{translate(TranslationKeys.course_timetable_import_replace_hint)}</Text>
			{useCorsProxy ? <CorsProxyPanel proxyStatus={proxyStatus} onRecheck={recheckProxy} /> : null}
			{errorText ? <Text style={[styles.error, { color: theme.sheet.inputBorderInvalid }]}>{errorText}</Text> : null}
		</View>
	);
};

export default StudipImportSheet;

const styles = StyleSheet.create({
	container: {
		width: '100%',
		gap: 8,
		paddingBottom: 24,
	},
	hint: {
		flexDirection: 'row',
		gap: 10,
		padding: 12,
		borderRadius: 14,
	},
	hintText: {
		flex: 1,
		fontSize: 13,
		lineHeight: 19,
		fontFamily: 'Poppins_400Regular',
	},
	proxyPanel: {
		flexDirection: 'column',
		marginTop: 4,
	},
	proxyStatusRow: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 8,
	},
	proxyStatusText: {
		flex: 1,
		fontSize: 14,
		fontFamily: 'Poppins_600SemiBold',
	},
	proxyActions: {
		gap: 10,
	},
	link: {
		flexShrink: 1,
		fontSize: 14,
		fontFamily: 'Poppins_600SemiBold',
		textDecorationLine: 'underline',
	},
	replaceHint: {
		fontSize: 13,
		fontFamily: 'Poppins_400Regular',
		marginTop: 4,
	},
	error: {
		fontSize: 14,
		fontFamily: 'Poppins_600SemiBold',
	},
	importRow: {
		marginTop: 8,
	},
	importRowDisabled: {
		opacity: 0.5,
	},
});
