import React, { useCallback, useMemo, useRef } from 'react';
import { Modal, SafeAreaView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { WebView, WebViewMessageEvent } from 'react-native-webview';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '@/hooks/useTheme';
import { useLanguage } from '@/hooks/useLanguage';
import { TranslationKeys } from '@/locales/keys';
import { CourseTimetableEvent } from '@/helper/courseTimetable/CourseTimetableModel';
import { StudipImportError, StudipInstance, buildStudipSessionScheduleScript, parseStudipSessionMessage } from '@/helper/courseTimetable/StudipImporter';

type StudipSsoLoginModalProps = {
	instance: StudipInstance;
	visible: boolean;
	onClose: () => void;
	onImported: (events: CourseTimetableEvent[]) => void;
	onError: (error: StudipImportError) => void;
};

/**
 * Full-screen WebView with the university's central login (SSO) on its Stud.IP. The user signs
 * in on the university's own pages; after every page load a script checks whether the Stud.IP
 * session is logged in and, if so, reads the schedule from the same origin and posts it back.
 *
 * The WebView runs incognito, so the Stud.IP session ends with the modal and nothing of the
 * login stays on the device. Native only – the web build has no WebView.
 */
const StudipSsoLoginModal: React.FC<StudipSsoLoginModalProps> = ({ instance, visible, onClose, onImported, onError }) => {
	const { theme } = useTheme();
	const { translate } = useLanguage();
	const webViewRef = useRef<WebView<{}>>(null);
	const finishedRef = useRef(false);
	const script = useMemo(() => buildStudipSessionScheduleScript(instance), [instance]);

	const handleMessage = useCallback(
		(event: WebViewMessageEvent) => {
			if (finishedRef.current) return;
			try {
				const events = parseStudipSessionMessage(event.nativeEvent.data);
				if (!events) return;
				finishedRef.current = true;
				onImported(events);
			} catch (error) {
				finishedRef.current = true;
				onError(error instanceof StudipImportError ? error : new StudipImportError('unexpected', String(error)));
			}
		},
		[onError, onImported]
	);

	return (
		<Modal
			visible={visible}
			animationType="slide"
			onRequestClose={onClose}
			onShow={() => {
				finishedRef.current = false;
			}}
		>
			<SafeAreaView style={[styles.container, { backgroundColor: theme.screen.background }]}>
				<View style={[styles.header, { borderBottomColor: theme.screen.iconBg }]}>
					<Text style={[styles.title, { color: theme.screen.text }]} numberOfLines={1}>
						{instance.name}
					</Text>
					<TouchableOpacity onPress={onClose} accessibilityRole="button" accessibilityLabel={translate(TranslationKeys.cancel)} style={styles.close}>
						<MaterialCommunityIcons name="close" size={24} color={theme.screen.text} />
					</TouchableOpacity>
				</View>
				<Text style={[styles.hint, { color: theme.screen.placeholder }]}>{translate(TranslationKeys.course_timetable_import_sso_hint)}</Text>
				{visible ? <WebView<{}> ref={webViewRef} source={{ uri: `${instance.baseUrl}${instance.ssoLoginPath ?? '/dispatch.php/login'}` }} incognito sharedCookiesEnabled={false} onLoadEnd={() => webViewRef.current?.injectJavaScript(script)} onMessage={handleMessage} startInLoadingState style={styles.webView} /> : null}
			</SafeAreaView>
		</Modal>
	);
};

export default StudipSsoLoginModal;

const styles = StyleSheet.create({
	container: {
		flex: 1,
	},
	header: {
		flexDirection: 'row',
		alignItems: 'center',
		paddingLeft: 16,
		paddingRight: 6,
		height: 56,
		borderBottomWidth: StyleSheet.hairlineWidth,
	},
	title: {
		flex: 1,
		fontSize: 18,
		fontFamily: 'Poppins_400Regular',
	},
	close: {
		padding: 10,
	},
	hint: {
		fontSize: 13,
		fontFamily: 'Poppins_400Regular',
		paddingHorizontal: 16,
		paddingVertical: 8,
	},
	webView: {
		flex: 1,
	},
});
