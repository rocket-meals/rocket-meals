import React, { useCallback, useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import LoadingIndicator from '@/components/LoadingIndicator/LoadingIndicator';
import * as Clipboard from 'expo-clipboard';
import { MaterialCommunityIcons } from '@expo/vector-icons';

import SettingsList from '@/components/SettingsList';
import { useLanguage } from '@/hooks/useLanguage';
import { useTheme } from '@/hooks/useTheme';
import useToast from '@/hooks/useToast';
import { buildErrorReportText, ErrorReportDetails, sendErrorReport } from '@/helper/errorReport';
import { TranslationKeys } from '@/locales/keys';

type ReportState = 'idle' | 'sending' | 'sent' | 'failed';

export interface OcrErrorSheetProps {
	/** What the engine threw, as it threw it. */
	errorMessage: string;
}

/** Which part of the app a report from this sheet concerns. Read by support, not translated. */
const ERROR_REPORT_AREA = 'text-recognition';

/**
 * Shown in place of the camera once text recognition has failed.
 *
 * It says that loading the text recognition went wrong, and offers two things:
 * copy the error, or send it to support. Sending needs no form - the report is
 * filled in from the device, the app state and the error, the way the
 * feedback-support screen would fill it in if the user typed everything out.
 */
export const OcrErrorSheet = ({ errorMessage }: OcrErrorSheetProps) => {
	const { translate } = useLanguage();
	const { theme } = useTheme();
	const toast = useToast();
	const [reportState, setReportState] = useState<ReportState>('idle');

	const details = useMemo<ErrorReportDetails>(() => ({ area: ERROR_REPORT_AREA, message: errorMessage }), [errorMessage]);

	const copyError = useCallback(async () => {
		try {
			await Clipboard.setStringAsync(buildErrorReportText(details));
			toast(translate(TranslationKeys.ocr_error_copied), 'success');
		} catch {
			toast(translate(TranslationKeys.ocr_error_copy_failed), 'error');
		}
	}, [details, toast, translate]);

	const reportError = useCallback(async () => {
		if (reportState === 'sending' || reportState === 'sent') {
			return;
		}
		setReportState('sending');
		try {
			await sendErrorReport(translate(TranslationKeys.ocr_error_report_title), details);
			setReportState('sent');
			toast(translate(TranslationKeys.ocr_error_report_sent), 'success');
		} catch (error) {
			console.warn('OcrErrorSheet: could not send the error report', error);
			setReportState('failed');
			toast(translate(TranslationKeys.ocr_error_report_failed), 'error');
		}
	}, [details, reportState, toast, translate]);

	let reportValue: string | undefined;
	if (reportState === 'sent') {
		reportValue = translate(TranslationKeys.ocr_error_report_sent);
	} else if (reportState === 'failed') {
		reportValue = translate(TranslationKeys.ocr_error_report_failed);
	}

	let reportRightIcon: React.ReactNode = undefined;
	if (reportState === 'sending') {
		reportRightIcon = <LoadingIndicator color={theme.screen.icon} />;
	} else if (reportState === 'sent') {
		reportRightIcon = <MaterialCommunityIcons name="check" size={24} color={theme.screen.icon} />;
	}

	return (
		<View style={styles.container}>
			<View style={styles.messageContainer}>
				<MaterialCommunityIcons name="alert-circle-outline" size={40} color={theme.screen.icon} />
				<Text style={[styles.description, { color: theme.screen.text }]}>{translate(TranslationKeys.ocr_error_description)}</Text>
				<Text selectable style={[styles.errorText, { color: theme.screen.text }]}>
					{errorMessage}
				</Text>
			</View>
			<SettingsList
				label={translate(TranslationKeys.ocr_error_copy)}
				leftIcon={<MaterialCommunityIcons name="content-copy" size={24} color={theme.screen.icon} />}
				groupPosition="top"
				showSeparator
				handleFunction={() => void copyError()}
			/>
			<SettingsList
				label={translate(TranslationKeys.ocr_error_report)}
				value={reportValue}
				leftIcon={<MaterialCommunityIcons name="send" size={24} color={theme.screen.icon} />}
				rightIcon={reportRightIcon}
				groupPosition="bottom"
				handleFunction={() => void reportError()}
			/>
		</View>
	);
};

const styles = StyleSheet.create({
	container: {
		width: '100%',
		gap: 16,
	},
	messageContainer: {
		alignItems: 'center',
		gap: 8,
	},
	description: {
		fontSize: 16,
		fontFamily: 'Poppins_400Regular',
		textAlign: 'center',
	},
	errorText: {
		fontSize: 12,
		fontFamily: 'Poppins_400Regular',
		textAlign: 'center',
		opacity: 0.7,
	},
});

export default OcrErrorSheet;
