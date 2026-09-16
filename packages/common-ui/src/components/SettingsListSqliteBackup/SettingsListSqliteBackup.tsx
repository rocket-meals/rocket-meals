import React, { useCallback, useState } from 'react';
import { Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { MaterialCommunityIcons, Octicons } from '@expo/vector-icons';
import SettingsList from '../SettingsList';
import type { SqliteSettingsGroupBaseProps } from '../SettingsList/formFieldTypes';
import { useMyScrollViewModal } from '../GlobalModal/useMyScrollViewModal';
import { DEFAULT_DB_NAME } from '../../helpers/SqliteKeyValueStorage';
import { createKvBackupJson, parseKvBackupJson, restoreKvBackup } from '../../helpers/KvBackupHelper';
import type { KvBackupFile } from '../../helpers/KvBackupHelper';
import { buildJsonExportFilename, pickJsonFromFile, saveJsonToFile } from '../../helpers/JsonFileTransferHelper';
import type { SaveJsonResult } from '../../helpers/JsonFileTransferHelper';
import PrintHidden from '../PrintHidden';

export type SettingsListSqliteBackupTexts = Partial<{
	exportLabel: string;
	exportValue: string;
	importLabel: string;
	importValue: string;
	exportErrorTitle: string;
	exportErrorMessage: string;
	importConfirmTitle: string;
	/** `{count}` is replaced with the number of entries in the picked backup file. */
	importConfirmMessage: string;
	importConfirmButton: string;
	cancel: string;
	importInvalidTitle: string;
	importInvalidMessage: string;
	importErrorTitle: string;
	importErrorMessage: string;
	importDoneTitle: string;
	importDoneMessage: string;
	restartNow: string;
	restartManuallyTitle: string;
	restartManuallyMessage: string;
	ok: string;
}>;

const DEFAULT_TEXTS: Required<SettingsListSqliteBackupTexts> = {
	exportLabel: 'Daten exportieren',
	exportValue: 'Backup als JSON-Datei',
	importLabel: 'Daten importieren',
	importValue: 'Backup wiederherstellen',
	exportErrorTitle: '❌ Export fehlgeschlagen',
	exportErrorMessage: 'Das Backup konnte nicht erstellt werden.',
	importConfirmTitle: '⚠️ Daten importieren',
	importConfirmMessage: 'Alle vorhandenen Daten werden durch das Backup ({count} Einträge) ersetzt. Dies kann nicht rückgängig gemacht werden. Fortfahren?',
	importConfirmButton: 'Importieren',
	cancel: 'Abbrechen',
	importInvalidTitle: '❌ Ungültige Datei',
	importInvalidMessage: 'Die ausgewählte Datei ist kein gültiges Backup dieser App.',
	importErrorTitle: '❌ Import fehlgeschlagen',
	importErrorMessage: 'Das Backup konnte nicht wiederhergestellt werden.',
	importDoneTitle: '✅ Import erfolgreich',
	importDoneMessage: 'Das Backup wurde wiederhergestellt. Die App muss neu gestartet werden, damit die Daten geladen werden.',
	restartNow: 'Jetzt neu starten',
	restartManuallyTitle: 'Neustart erforderlich',
	restartManuallyMessage: 'Automatischer Neustart nicht möglich. Bitte schließe die App vollständig und öffne sie erneut.',
	ok: 'OK',
};

export interface SettingsListSqliteBackupProps extends SqliteSettingsGroupBaseProps {
	/** Used as the export filename base, e.g. 'score-tracker' -> score-tracker-backup-2026-08-14.json. */
	appName: string;
	texts?: SettingsListSqliteBackupTexts;
	exportNativeID?: string;
	importNativeID?: string;
	groupPositionExport?: 'top' | 'middle' | 'bottom' | 'single';
	groupPositionImport?: 'top' | 'middle' | 'bottom' | 'single';
	onExported?: (result: SaveJsonResult) => void;
	/** Called after a successful restore, right before the restart prompt is shown. */
	onImported?: (restoredEntryCount: number) => void;
	onError?: (error: unknown) => void;
}

// Restart so every storage-backed slice re-hydrates from the imported data. Returns
// false when no programmatic reload is available (e.g. dev client without expo-updates),
// in which case the caller asks the user to restart manually. expo-updates is required
// lazily so common-ui does not hard-depend on it at bundle evaluation time.
async function reloadApp(): Promise<boolean> {
	if (Platform.OS === 'web') {
		if (typeof window !== 'undefined') {
			window.location.reload();
			return true;
		}
		return false;
	}
	try {
		// eslint-disable-next-line @typescript-eslint/no-var-requires
		const Updates = require('expo-updates') as typeof import('expo-updates');
		await Updates.reloadAsync();
		return true;
	} catch (error) {
		console.warn('[SettingsListSqliteBackup] Programmatic reload failed:', error);
		return false;
	}
}

function ModalButton({
	label,
	color,
	backgroundColor,
	onPress,
}: Readonly<{ label: string; color: string; backgroundColor?: string; onPress: () => void }>) {
	return (
		<TouchableOpacity
			style={[styles.modalButton, backgroundColor ? { backgroundColor } : styles.modalButtonPlain]}
			onPress={onPress}
			activeOpacity={0.8}
		>
			<Text style={[styles.modalButtonText, { color }]}>{label}</Text>
		</TouchableOpacity>
	);
}

/**
 * Self-contained "database backup" settings group: an export row that dumps the whole
 * shared kv storage (SqliteKeyValueStorage) into a JSON file, and an import row that
 * restores such a file - so after a fresh install everything (settings, games, map
 * progress, ...) can be brought back. Works for any app in this monorepo that persists
 * through the shared kv storage, without each app re-implementing the flow.
 */
const SettingsListSqliteBackup: React.FC<SettingsListSqliteBackupProps> = ({
	dbName = DEFAULT_DB_NAME,
	appName,
	iconBgColor,
	iconColor,
	textColor,
	texts: textsOverride,
	exportNativeID,
	importNativeID,
	groupPositionExport = 'top',
	groupPositionImport = 'bottom',
	onExported,
	onImported,
	onError,
}) => {
	const texts = { ...DEFAULT_TEXTS, ...textsOverride };
	const { show: showConfirmModal, close: closeConfirmModal } = useMyScrollViewModal();
	const { show: showMessageModal, close: closeMessageModal } = useMyScrollViewModal();
	const [isBusy, setIsBusy] = useState(false);

	const showMessage = useCallback(
		(title: string, message: string, buttons?: { label: string; onPress: () => void }[]) => {
			showMessageModal({
				title,
				children: (
					<View style={styles.modalContent}>
						<Text style={[styles.modalText, { color: textColor }]}>{message}</Text>
						{(buttons ?? [{ label: texts.ok, onPress: closeMessageModal }]).map((button) => (
							<ModalButton
								key={button.label}
								label={button.label}
								color="#ffffff"
								backgroundColor={iconBgColor}
								onPress={button.onPress}
							/>
						))}
					</View>
				),
			});
		},
		[showMessageModal, closeMessageModal, textColor, iconBgColor, texts.ok],
	);

	const promptRestart = useCallback(() => {
		showMessage(texts.importDoneTitle, texts.importDoneMessage, [
			{
				label: texts.restartNow,
				onPress: async () => {
					const reloaded = await reloadApp();
					if (!reloaded) {
						closeMessageModal();
						// Give the modal a tick to close before re-opening with new content.
						setTimeout(() => {
							showMessage(texts.restartManuallyTitle, texts.restartManuallyMessage);
						}, 300);
					}
				},
			},
		]);
	}, [showMessage, closeMessageModal, texts]);

	const handleExport = useCallback(async () => {
		if (isBusy) return;
		setIsBusy(true);
		try {
			const json = await createKvBackupJson({ dbName, app: appName });
			const result = await saveJsonToFile(json, buildJsonExportFilename(`${appName}-backup`));
			if (result !== 'cancelled') {
				onExported?.(result);
			}
		} catch (error) {
			console.error('[SettingsListSqliteBackup] Export failed:', error);
			onError?.(error);
			showMessage(texts.exportErrorTitle, texts.exportErrorMessage);
		} finally {
			setIsBusy(false);
		}
	}, [isBusy, dbName, appName, onExported, onError, showMessage, texts]);

	const performRestore = useCallback(
		async (backup: KvBackupFile) => {
			setIsBusy(true);
			try {
				const restoredCount = await restoreKvBackup(backup, dbName);
				onImported?.(restoredCount);
				promptRestart();
			} catch (error) {
				console.error('[SettingsListSqliteBackup] Restore failed:', error);
				onError?.(error);
				showMessage(texts.importErrorTitle, texts.importErrorMessage);
			} finally {
				setIsBusy(false);
			}
		},
		[dbName, onImported, onError, promptRestart, showMessage, texts],
	);

	const handleImport = useCallback(async () => {
		if (isBusy) return;
		let backup: KvBackupFile;
		try {
			const content = await pickJsonFromFile();
			if (content === null) return;
			backup = parseKvBackupJson(content);
		} catch (error) {
			console.warn('[SettingsListSqliteBackup] Picked file rejected:', error);
			onError?.(error);
			showMessage(texts.importInvalidTitle, texts.importInvalidMessage);
			return;
		}
		const entryCount = Object.keys(backup.entries).length;
		showConfirmModal({
			title: texts.importConfirmTitle,
			children: (
				<View style={styles.modalContent}>
					<Text style={[styles.modalText, { color: textColor }]}>
						{texts.importConfirmMessage.replace('{count}', String(entryCount))}
					</Text>
					<ModalButton
						label={texts.importConfirmButton}
						color="#ffffff"
						backgroundColor="#dc2626"
						onPress={() => {
							closeConfirmModal();
							performRestore(backup);
						}}
					/>
					<ModalButton label={texts.cancel} color={textColor} onPress={closeConfirmModal} />
				</View>
			),
		});
	}, [isBusy, onError, showMessage, showConfirmModal, closeConfirmModal, performRestore, textColor, texts]);

	return (
		<>
			<SettingsList
				nativeID={exportNativeID}
				iconBgColor={iconBgColor}
				leftIcon={<MaterialCommunityIcons name="database-export-outline" size={24} color={iconColor} />}
				label={texts.exportLabel}
				value={isBusy ? '...' : texts.exportValue}
				rightIcon={
					<PrintHidden>
						<Octicons name="chevron-right" size={24} color={iconColor} />
					</PrintHidden>
				}
				handleFunction={isBusy ? undefined : handleExport}
				groupPosition={groupPositionExport}
			/>
			<SettingsList
				nativeID={importNativeID}
				iconBgColor={iconBgColor}
				leftIcon={<MaterialCommunityIcons name="database-import-outline" size={24} color={iconColor} />}
				label={texts.importLabel}
				value={isBusy ? '...' : texts.importValue}
				rightIcon={
					<PrintHidden>
						<Octicons name="chevron-right" size={24} color={iconColor} />
					</PrintHidden>
				}
				handleFunction={isBusy ? undefined : handleImport}
				groupPosition={groupPositionImport}
			/>
		</>
	);
};

const styles = StyleSheet.create({
	modalContent: {
		paddingTop: 8,
		paddingBottom: 8,
		gap: 8,
	},
	modalText: {
		fontSize: 15,
		lineHeight: 22,
		marginBottom: 8,
	},
	modalButton: {
		alignItems: 'center',
		justifyContent: 'center',
		paddingVertical: 12,
		borderRadius: 10,
	},
	modalButtonPlain: {
		backgroundColor: 'transparent',
	},
	modalButtonText: {
		fontSize: 15,
		fontWeight: '600',
	},
});

export default SettingsListSqliteBackup;
