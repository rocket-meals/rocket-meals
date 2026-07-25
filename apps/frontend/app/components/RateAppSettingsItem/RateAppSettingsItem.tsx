import React, { useCallback, useMemo, useRef, useState } from 'react';
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
import { buildReviewUrl } from '@/helper/ReviewLinkHelper';
// Imported from the pure rules module rather than from `useAppRatingScore`, which renders
// this component in its debug modal — going through the hook would be a circular import.
import { decideAppRatingFromStoredData } from '@/hooks/appRatingDecision';

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
	const { primaryColor, appSettings, appRatingData } = useSelector((state: RootState) => state.settings);
	const { show: showModal } = useMyScrollViewModal();

	const [debugLogs, setDebugLogs] = useState<{ id: number; text: string }[]>([]);
	const nextDebugLogIdRef = useRef(0);

	const iosStoreUrl = appSettings?.app_stores_url_to_apple;
	const androidStoreUrl = appSettings?.app_stores_url_to_google;
	const isWeb = Platform.OS === 'web';
	const hasBothWebLinks = isWeb && Boolean(iosStoreUrl) && Boolean(androidStoreUrl);

	const addLog = useCallback(
		(msg: string) => {
			setDebugLogs(prev => [...prev, { id: nextDebugLogIdRef.current++, text: msg }]);
			onLog?.(msg);
		},
		[onLog]
	);

	/**
	 * Always opens the store review page — never the native review API.
	 *
	 * Both stores forbid triggering the in-app review API from a button: Apple because
	 * "this method may or may not present an alert", Google explicitly with "you should not
	 * have a call-to-action option (such as a button) to trigger the API […] redirect the
	 * user to the Play Store instead". A tap here must always do something visible.
	 */
	const openStore = useCallback(
		(storeUrl: string, store: StoreTarget) => {
			const reviewUrl = buildReviewUrl(store, storeUrl) ?? storeUrl;
			addLog(`Opening ${store} review page`);
			CommonSystemActionHelper.openExternalURL(reviewUrl, true);
		},
		[addLog]
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
							<Text key={log.id} style={{ color: theme.screen.text, fontSize: 13 }}>
								{`${i + 1}. ${log.text}`}
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
				isEnabled={Boolean(appRatingData?.lastAskedAt)}
				onToggle={() => {}}
				disabled
				groupPosition="middle"
				showSeparator
			/>
			<SettingsList
				label="Current decision"
				value={(() => {
					const decision = decideAppRatingFromStoredData(appRatingData);
					return decision.ask ? 'ask' : `blocked: ${decision.reason}`;
				})()}
				groupPosition="middle"
				showSeparator
				leftIcon={<MaterialCommunityIcons name="gavel" size={22} color={theme.screen.icon} />}
				iconBgColor="transparent"
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
					handleFunction={() => openStore(nativeStoreUrl, nativeStore)}
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
