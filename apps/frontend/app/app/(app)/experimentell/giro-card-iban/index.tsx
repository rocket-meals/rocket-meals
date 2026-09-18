import React, { useCallback, useState } from 'react';
import { ScrollView, Text, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { IbanCandidate } from 'repo-depkit-common';

import { useTheme } from '@/hooks/useTheme';
import { useLanguage } from '@/hooks/useLanguage';
import { useAppSelector } from '@/redux/hooks';
import useSetPageTitle from '@/hooks/useSetPageTitle';
import { TranslationKeys } from '@/locales/keys';
import IBANInput from '@/components/IBANInput/IBANInput';
import SettingsList from '@/components/SettingsList';
import SettingsListBoolean from '@/components/SettingsListBoolean';
import { useGiroCardIbanScannerModal } from '@/components/GiroCardIbanScanner';
import { ENGINE_NAME } from '@/helper/TextRecognitionShared';
import styles from '../styles';

/**
 * Experimental screen for reading the IBAN off a giro card.
 *
 * It embeds the same `IBANInput` the form submission screen uses, so the camera
 * button and the field it fills can be tried end to end, and it prints the raw
 * lines the text recognizer returned — which is what tells you whether a card
 * was not recognized at all or merely misread.
 *
 * The card to hold in front of the camera lives with the unit test fixtures:
 * `packages/common/src/__tests__/fixtures/girocard/girocard-sample.jpg`. Its
 * IBAN carries dummy check digits, hence the checksum toggle below.
 */
const GiroCardIbanScreen = () => {
	useSetPageTitle(TranslationKeys.giro_card_iban_scanner_test);
	const { theme } = useTheme();
	const { translate } = useLanguage();
	const { primaryColor } = useAppSelector((state) => state.settings);

	const [iban, setIban] = useState('');
	const [error, setError] = useState('');
	const [allowInvalidChecksum, setAllowInvalidChecksum] = useState(true);
	const [recognizedLines, setRecognizedLines] = useState<string[]>([]);
	const [lastCandidate, setLastCandidate] = useState<IbanCandidate | null>(null);

	const { openGiroCardIbanScanner } = useGiroCardIbanScannerModal();

	const openScanner = useCallback(() => {
		openGiroCardIbanScanner({
			allowInvalidChecksum,
			onRecognizedLinesChange: setRecognizedLines,
			onIbanDetected: (formattedIban, candidate) => {
				setIban(formattedIban);
				setLastCandidate(candidate);
			},
		});
	}, [allowInvalidChecksum, openGiroCardIbanScanner]);

	const renderLogBox = (children: React.ReactNode) => <View style={{ ...styles.logsContainer, backgroundColor: theme.screen.iconBg }}>{children}</View>;

	return (
		<ScrollView
			style={{ ...styles.container, backgroundColor: theme.screen.background }}
			contentContainerStyle={{
				...styles.contentContainer,
				backgroundColor: theme.screen.background,
			}}
		>
			<View style={styles.content}>
				<Text style={{ ...styles.heading, color: theme.screen.text }}>{translate(TranslationKeys.giro_card_iban_scanner_test)}</Text>
				<Text style={{ ...styles.body, color: theme.screen.text }}>{translate(TranslationKeys.giro_card_iban_scanner_test_description)}</Text>

				<View style={styles.section}>
					<SettingsList iconBgColor={primaryColor} leftIcon={<MaterialCommunityIcons name="credit-card-scan-outline" size={24} color={theme.screen.icon} />} label={translate(TranslationKeys.giro_card_scan_title)} rightIcon={<MaterialCommunityIcons name="chevron-right" size={24} color={theme.screen.icon} />} handleFunction={openScanner} groupPosition="top" />
					<SettingsListBoolean iconBgColor={primaryColor} leftIcon={<MaterialCommunityIcons name="numeric" size={24} color={theme.screen.icon} />} label={translate(TranslationKeys.giro_card_scan_allow_invalid_checksum)} valueActive={translate(TranslationKeys.active)} valueInactive={translate(TranslationKeys.inactive)} isEnabled={allowInvalidChecksum} onToggle={() => setAllowInvalidChecksum((enabled) => !enabled)} groupPosition="middle" />
					<SettingsList iconBgColor={primaryColor} leftIcon={<MaterialCommunityIcons name="text-recognition" size={24} color={theme.screen.icon} />} label={translate(TranslationKeys.giro_card_scan_engine)} value={ENGINE_NAME} groupPosition="bottom" />
				</View>

				<View style={styles.section}>
					<IBANInput id="experimental-iban" value={iban} onChange={(_id, nextValue) => setIban(nextValue)} onError={(_id, nextError) => setError(nextError)} error={error} isDisabled={false} custom_type="bank_account_number" prefix={null} suffix={null} allowInvalidScannedChecksum={allowInvalidChecksum} />
				</View>

				<View style={styles.section}>
					<Text style={{ ...styles.heading, color: theme.screen.text }}>{translate(TranslationKeys.giro_card_scan_last_result)}</Text>
					{renderLogBox(
						lastCandidate ? (
							<>
								<Text style={{ ...styles.logEntry, color: theme.screen.text }}>{lastCandidate.formatted}</Text>
								<Text style={{ ...styles.logEntry, color: theme.screen.text }}>
									{lastCandidate.countryCode} · checksum {String(lastCandidate.checksumValid)} · length {String(lastCandidate.lengthValid)} · structure {String(lastCandidate.structureValid)}
								</Text>
							</>
						) : (
							<Text style={{ ...styles.logEntry, color: theme.screen.text }}>{translate(TranslationKeys.giro_card_scan_no_result_yet)}</Text>
						),
					)}
				</View>

				<View style={styles.section}>
					<Text style={{ ...styles.heading, color: theme.screen.text }}>{translate(TranslationKeys.giro_card_scan_recognized_lines)}</Text>
					{renderLogBox(
						recognizedLines.length > 0 ? (
							recognizedLines.map((line, index) => (
								<Text key={`${index}-${line}`} style={{ ...styles.logEntry, color: theme.screen.text }}>
									{line}
								</Text>
							))
						) : (
							<Text style={{ ...styles.logEntry, color: theme.screen.text }}>{translate(TranslationKeys.giro_card_scan_no_lines_yet)}</Text>
						),
					)}
				</View>
			</View>
		</ScrollView>
	);
};

export default GiroCardIbanScreen;
