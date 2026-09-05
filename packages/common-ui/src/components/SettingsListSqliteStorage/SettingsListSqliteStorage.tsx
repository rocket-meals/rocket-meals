import React, { useCallback, useEffect, useState } from 'react';
import { Alert, Text, View } from 'react-native';
import { MaterialCommunityIcons, Octicons } from '@expo/vector-icons';
import SettingsList from '../SettingsList';
import type { SqliteSettingsGroupBaseProps } from '../SettingsList/formFieldTypes';
import { useMyScrollViewModal } from '../GlobalModal/useMyScrollViewModal';
import { DEFAULT_DB_NAME, getStorageUsage, clearStorage } from '../../helpers/SqliteKeyValueStorage';
import type { SqliteStorageKeyUsage } from '../../helpers/SqliteKeyValueStorage';
import { formatBytes } from '../../helpers/ByteSizeHelper';
import PrintHidden from '../PrintHidden';

export type SettingsListSqliteStorageTexts = Partial<{
	total: string;
	refresh: string;
	clear: string;
	keysModalTitle: string;
	emptyKeys: string;
	clearConfirmTitle: string;
	clearConfirmMessage: string;
	cancel: string;
	confirmClear: string;
}>;

const DEFAULT_TEXTS: Required<SettingsListSqliteStorageTexts> = {
	total: 'SQLite gesamt',
	refresh: 'Speicher aktualisieren',
	clear: 'SQLite löschen',
	keysModalTitle: 'SQLite Keys',
	emptyKeys: 'Keine Einträge',
	clearConfirmTitle: 'SQLite löschen',
	clearConfirmMessage: 'Löscht die komplette SQLite-Datenbank. Fortfahren?',
	cancel: 'Abbrechen',
	confirmClear: 'Löschen',
};

export interface SettingsListSqliteStorageProps extends SqliteSettingsGroupBaseProps {
	texts?: SettingsListSqliteStorageTexts;
	/** Bump this to force a re-read of storage usage, e.g. after an external migration ran. */
	refreshSignal?: number;
	onCleared?: () => void;
	onClearError?: (error: unknown) => void;
}

/**
 * Self-contained "SQLite storage" debug settings group: total size (tap to list every key),
 * a manual refresh row, and a destructive clear row. Reads/writes the same `kv` table that
 * getStorageItem/setStorageItem/clearStorage (SqliteKeyValueStorage) use for `dbName`, so it
 * works for any app/db in this monorepo without each app re-implementing this screen.
 */
const SettingsListSqliteStorage: React.FC<SettingsListSqliteStorageProps> = ({
	dbName = DEFAULT_DB_NAME,
	iconBgColor,
	iconColor,
	textColor,
	texts: textsOverride,
	refreshSignal,
	onCleared,
	onClearError,
}) => {
	const texts = { ...DEFAULT_TEXTS, ...textsOverride };
	const { show: showModal } = useMyScrollViewModal();
	const [usage, setUsage] = useState<SqliteStorageKeyUsage[]>([]);
	const [totalBytes, setTotalBytes] = useState(0);
	const [isClearing, setIsClearing] = useState(false);

	const refresh = useCallback(async () => {
		try {
			const { items, totalBytes: bytes } = await getStorageUsage(dbName);
			setUsage(items);
			setTotalBytes(bytes);
		} catch (error) {
			console.error('Error reading sqlite storage usage:', error);
		}
	}, [dbName]);

	useEffect(() => {
		refresh();
	}, [refresh, refreshSignal]);

	const openKeysSheet = useCallback(() => {
		showModal({
			title: texts.keysModalTitle,
			children: (
				<View style={{ gap: 8 }}>
					{usage.length === 0 ? (
						<Text style={{ color: textColor }}>{texts.emptyKeys}</Text>
					) : (
						usage.map((item) => (
							<SettingsList
								key={item.key}
								iconBgColor={iconBgColor}
								leftIcon={<MaterialCommunityIcons name="key-outline" size={24} color={iconColor} />}
								label={item.key}
								value={formatBytes(item.bytes)}
								groupPosition="middle"
							/>
						))
					)}
				</View>
			),
		});
	}, [usage, iconBgColor, iconColor, textColor, showModal, texts]);

	const handleClear = useCallback(() => {
		Alert.alert(texts.clearConfirmTitle, texts.clearConfirmMessage, [
			{ text: texts.cancel, style: 'cancel' },
			{
				text: texts.confirmClear,
				style: 'destructive',
				onPress: async () => {
					setIsClearing(true);
					try {
						await clearStorage(dbName);
						await refresh();
						onCleared?.();
					} catch (error) {
						console.error('Error clearing sqlite storage:', error);
						onClearError?.(error);
					} finally {
						setIsClearing(false);
					}
				},
			},
		]);
	}, [dbName, texts, refresh, onCleared, onClearError]);

	return (
		<>
			<SettingsList
				iconBgColor={iconBgColor}
				leftIcon={<MaterialCommunityIcons name="database" size={24} color={iconColor} />}
				label={texts.total}
				value={formatBytes(totalBytes)}
				rightIcon={
					<PrintHidden>
						<Octicons name="chevron-right" size={24} color={iconColor} />
					</PrintHidden>
				}
				handleFunction={openKeysSheet}
				groupPosition="top"
			/>
			<SettingsList
				iconBgColor={iconBgColor}
				leftIcon={<MaterialCommunityIcons name="refresh" size={24} color={iconColor} />}
				label={texts.refresh}
				value=""
				handleFunction={refresh}
				groupPosition="middle"
			/>
			<SettingsList
				iconBgColor={iconBgColor}
				leftIcon={<MaterialCommunityIcons name="delete-outline" size={24} color={iconColor} />}
				label={texts.clear}
				value={isClearing ? '...' : ''}
				handleFunction={isClearing ? undefined : handleClear}
				groupPosition="bottom"
			/>
		</>
	);
};

export default SettingsListSqliteStorage;
