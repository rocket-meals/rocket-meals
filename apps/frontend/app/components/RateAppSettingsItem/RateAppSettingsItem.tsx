import React, { useCallback, useMemo, useState } from 'react';
import { Ionicons, MaterialCommunityIcons, MaterialIcons, Octicons } from '@expo/vector-icons';
import { Platform, Text, View } from 'react-native';
import { useSelector } from 'react-redux';

import SettingsList from '@/components/SettingsList/SettingsList';
import SettingsListBoolean from '@/components/SettingsListBoolean/SettingsListBoolean';
import { useMyScrollViewModal } from '@/components/GlobalModal/useMyScrollViewModal';
import { useLanguage } from '@/hooks/useLanguage';
import { useTheme } from '@/hooks/useTheme';
import { TranslationKeys } from '@/locales/keys';
import { RootState } from '@/redux/reducer';
import { CommonSystemActionHelper } from '@/helper/SystemActionHelper';
import useNativeQuickRateApp from '@/hooks/useNativeQuickRateApp';

const RATE_APP_ICON_BACKGROUND = '#F7D21F';

type RateAppSettingsItemProps = {
	groupPosition?: 'top' | 'middle' | 'bottom' | 'single';
	showSeparator?: boolean;
	onLog?: (message: string) => void;
	debug?: boolean;
};

type StoreTarget = 'ios' | 'android';

const STORE_ICON_BY_TARGET: Record<StoreTarget, keyof typeof Ionicons.glyphMap> = {
	ios: 'logo-apple',
	android: 'logo-google-playstore',
};

export const RateAppSettingsItem: React.FC<RateAppSettingsItemProps> = ({
	groupPosition = 'single',
	showSeparator = false,
	onLog,
	debug = false,
}) => {
	const { translate } = useLanguage();
	const { theme } = useTheme();
	const { primaryColor, appSettings } = useSelector((state: RootState) => state.settings);
	const { show: showModal } = useMyScrollViewModal();
	const { wasAskedForRating, requestNativeReview } = useNativeQuickRateApp();

	const [debugLogs, setDebugLogs] = useState<string[]>([]);

	const iosStoreUrl = appSettings?.app_stores_url_to_apple;
	const androidStoreUrl = appSettings?.app_stores_url_to_google;
	const isWeb = Platform.OS === 'web';
	const hasBothWebLinks = isWeb && Boolean(iosStoreUrl) && Boolean(androidStoreUrl);

	const addLog = useCallback(
		(msg: string) => {
			setDebugLogs(prev => [...prev, msg]);
			onLog?.(msg);
		},
		[onLog]
	);

	const openStore = useCallback(
		(storeUrl: string, store: StoreTarget) => {
			addLog(`Opening ${store} store URL`);
			CommonSystemActionHelper.openExternalURL(storeUrl, true);
		},
		[addLog]
	);

	const handleNativeRating = useCallback(
		async (storeUrl: string | undefined, store: StoreTarget) => {
			if (wasAskedForRating) {
				addLog('Already asked for rating, opening store URL');
				if (storeUrl) {
					openStore(storeUrl, store);
				}
				return;
			}
			addLog('Requesting native review dialog');
			const shown = await requestNativeReview();
			if (shown) {
				addLog('Native review dialog shown');
				return;
			}
			addLog('Native review not available, falling back to store URL');
			if (storeUrl) {
				openStore(storeUrl, store);
			}
		},
		[addLog, openStore, requestNativeReview, wasAskedForRating]
	);

	const showDebugLogsModal = useCallback(() => {
		showModal({
			children: (
				<View style={{ padding: 16, gap: 8 }}>
					<Text style={{ color: theme.screen.text, fontWeight: 'bold', fontSize: 16, marginBottom: 4 }}>
						App Rating Debug Logs
					</Text>
					{debugLogs.length === 0 ? (
						<Text style={{ color: theme.screen.text, fontSize: 13 }}>No logs yet</Text>
					) : (
						debugLogs.map((log, i) => (
							<Text key={i} style={{ color: theme.screen.text, fontSize: 13 }}>
								{`${i + 1}. ${log}`}
							</Text>
						))
					)}
				</View>
			),
		});
	}, [debugLogs, showModal, theme.screen.text]);

	const rows = useMemo(
		() => [
			{ key: 'ios', store: 'ios' as const, label: translate(TranslationKeys.rate_app), url: iosStoreUrl, icon: STORE_ICON_BY_TARGET.ios },
			{ key: 'android', store: 'android' as const, label: translate(TranslationKeys.rate_app), url: androidStoreUrl, icon: STORE_ICON_BY_TARGET.android },
		],
		[androidStoreUrl, iosStoreUrl, translate]
	);

	const debugSection = debug ? (
		<>
			<SettingsListBoolean
				label="Was user asked for rating?"
				isEnabled={wasAskedForRating}
				onToggle={() => {}}
				disabled
				groupPosition="middle"
				showSeparator
			/>
			<SettingsList
				label="Debug Logs for App Rating"
				handleFunction={showDebugLogsModal}
				groupPosition="bottom"
				showSeparator={false}
				leftIcon={<MaterialCommunityIcons name="bug" size={22} color={theme.screen.icon} />}
				iconBgColor="transparent"
			/>
		</>
	) : null;

	if (isWeb) {
		const visibleRows = rows.filter(row => Boolean(row.url));

		if (!visibleRows.length && !debug) {
			return null;
		}

		return (
			<>
				{visibleRows.map((row, index) => {
					const isFirst = index === 0;
					const isLast = index === visibleRows.length - 1;
					const hasMore = debug || !isLast;

					let computedGroupPosition: 'top' | 'middle' | 'bottom' | 'single';
					if (hasBothWebLinks || debug) {
						if (isFirst) {
							computedGroupPosition = 'top';
						} else if (debug && isLast) {
							computedGroupPosition = 'middle';
						} else {
							computedGroupPosition = 'bottom';
						}
					} else {
						computedGroupPosition = debug ? 'top' : 'single';
					}

					return (
						<SettingsList
							key={row.key}
							label={row.label}
							handleFunction={row.url ? () => openStore(row.url!, row.store) : undefined}
							groupPosition={computedGroupPosition}
							showSeparator={hasMore}
							iconBgColor={RATE_APP_ICON_BACKGROUND}
							leftIcon={<MaterialIcons name="star" size={22} color={primaryColor} />}
							rightElement={
								row.url ? (
									<View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
										<Ionicons name={row.icon} size={20} color={theme.screen.icon} />
										<Octicons name="chevron-right" size={20} color={theme.screen.icon} />
									</View>
								) : undefined
							}
						/>
					);
				})}
				{debugSection}
			</>
		);
	}

	const nativeStore = Platform.OS === 'ios' ? 'ios' : 'android';
	const nativeRow = rows.find(row => row.store === nativeStore);
	const nativeStoreUrl = nativeRow?.url;

	if (!nativeStoreUrl && !debug) {
		return null;
	}

	return (
		<>
			{nativeStoreUrl && (
				<SettingsList
					label={nativeRow?.label || translate(TranslationKeys.rate_app)}
					handleFunction={() => handleNativeRating(nativeStoreUrl, nativeStore)}
					groupPosition={debug ? 'top' : groupPosition}
					showSeparator={debug}
					iconBgColor={RATE_APP_ICON_BACKGROUND}
					leftIcon={<MaterialIcons name="star" size={22} color={primaryColor} />}
					rightElement={
						<View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
							<Ionicons name={nativeRow?.icon || STORE_ICON_BY_TARGET[nativeStore]} size={20} color={theme.screen.icon} />
							<Octicons name="chevron-right" size={20} color={theme.screen.icon} />
						</View>
					}
				/>
			)}
			{debugSection}
		</>
	);
};
