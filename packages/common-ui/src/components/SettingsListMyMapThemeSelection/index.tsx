import React, { useCallback, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Ionicons, MaterialCommunityIcons, Entypo } from '@expo/vector-icons';
import { MapStyleKey, MAP_STYLE_DEFINITIONS } from '../MyMap/MyMapHelper';
import MyMap from '../MyMap';
import SettingsList from '../SettingsList';
import type { SettingsListItemBaseProps } from '../SettingsList/types';
import CardWithText from '../CardWithText';
import { useMyScrollViewModal } from '../GlobalModal/useMyScrollViewModal';
import { useTheme } from '../../context/ThemeContext';
import PrintHidden from '../PrintHidden';

const DEFAULT_MAP_PREVIEW_CENTER = { lat: 52.662231, lng: 8.1244 };
const DEFAULT_MAP_PREVIEW_ZOOM = 14;
const DEFAULT_ACCENT_COLOR = '#0891b2';

const _noop = () => {};

/** Map style selection + preview state, shared between the settings-list trigger and its modal content. */
type MapThemeSelectionState = {
	selectedMapStyleKey: MapStyleKey;
	onMapStyleKeyChange: (key: MapStyleKey) => void;
	accentColor?: string;
	mapPreviewCenter?: { lat: number; lng: number };
	mapPreviewZoom?: number;
};

/**
 * User-facing texts of the OpenStreetMap consent gate.
 *
 * The component is translation-agnostic: an app resolves its own translation keys and passes
 * the finished strings in. {@link MAP_THEME_SELECTION_FALLBACK_TEXTS} keeps the component
 * usable without them (playbook, prototypes).
 */
export type SettingsListMyMapThemeSelectionTexts = {
	/** Headline of the consent gate. */
	consentTitle: string;
	/**
	 * Explains which data leaves the device. `{{osm}}` and `{{openFreeMap}}` are replaced by
	 * the provider names, rendered in bold.
	 */
	consentDataNotice: string;
	/** Note that the consent is stored and can be revoked. */
	consentRevokeNotice: string;
	/** Label of the button that grants consent. */
	consentAccept: string;
};

/** English fallback used when an app passes no `texts`. */
export const MAP_THEME_SELECTION_FALLBACK_TEXTS: SettingsListMyMapThemeSelectionTexts = {
	consentTitle: 'Map display with OpenStreetMap',
	consentDataNotice:
		'This map loads map data from {{osm}} (openstreetmap.org) and {{openFreeMap}} (openfreemap.org). Data such as your IP address is transferred to servers of the OpenStreetMap Foundation and Protomaps LLC.',
	consentRevokeNotice: 'Your consent is stored and can be revoked at any time in the map settings.',
	consentAccept: 'Load map data (accept)',
};

const OSM_PROVIDER_NAMES: Record<string, string> = {
	osm: 'OpenStreetMap',
	openFreeMap: 'OpenFreeMap',
};

/**
 * Renders `consentDataNotice` with the `{{osm}}` / `{{openFreeMap}}` placeholders replaced by
 * bold provider names. Splitting here rather than in the text keeps the sentence a single
 * translatable unit while preserving the emphasis on the two brand names.
 */
function renderNoticeWithProviderNames(notice: string): React.ReactNode[] {
	return notice.split(/(\{\{osm\}\}|\{\{openFreeMap\}\})/g).map((part, index) => {
		const providerKey = /^\{\{(osm|openFreeMap)\}\}$/.exec(part)?.[1];
		const key = `${index}-${part}`;
		if (providerKey === undefined) {
			return <React.Fragment key={key}>{part}</React.Fragment>;
		}
		return (
			<Text key={key} style={{ fontWeight: 'bold' }}>
				{OSM_PROVIDER_NAMES[providerKey]}
			</Text>
		);
	});
}

export type SettingsListMyMapThemeSelectionProps = MapThemeSelectionState &
	Pick<SettingsListItemBaseProps, 'leftIcon' | 'iconBgColor' | 'label'> & {
		groupPosition?: 'top' | 'middle' | 'bottom' | 'single';
		modalTitle?: string;
		/** Consent-gate texts. Defaults to {@link MAP_THEME_SELECTION_FALLBACK_TEXTS}. */
		texts?: SettingsListMyMapThemeSelectionTexts;
		nativeID?: string;
		/** Whether the user has consented to OSM map data loading. Defaults to true (no gate). */
		osmConsent?: boolean;
		/** Called when the user grants OSM consent inside the selection modal. */
		onOsmConsentChange?: (value: boolean) => void;
	};

type OsmConsentGateProps = {
	onConsent: () => void;
	texts: SettingsListMyMapThemeSelectionTexts;
};

const OsmConsentGate: React.FC<OsmConsentGateProps> = ({ onConsent, texts }) => {
	const { theme } = useTheme();
	return (
		<View style={{ paddingHorizontal: 16, paddingVertical: 24, alignItems: 'center' }}>
			<MaterialCommunityIcons name="map-marker-radius" size={56} color={theme.screen.icon} style={{ marginBottom: 16 }} />
			<Text style={{ color: theme.screen.text, fontSize: 17, fontWeight: 'bold', textAlign: 'center', marginBottom: 12 }}>
				{texts.consentTitle}
			</Text>
			<Text style={{ color: theme.screen.text, fontSize: 14, textAlign: 'center', marginBottom: 8, lineHeight: 20 }}>
				{renderNoticeWithProviderNames(texts.consentDataNotice)}
			</Text>
			<Text style={{ color: theme.screen.text + 'aa', fontSize: 13, textAlign: 'center', marginBottom: 24, lineHeight: 18 }}>
				{texts.consentRevokeNotice}
			</Text>
			<SettingsList
				title={texts.consentAccept}
				leftIcon={<MaterialCommunityIcons name="check-circle-outline" size={22} color={theme.screen.icon} />}
				rightIcon={
					<PrintHidden>
						<Entypo name="chevron-small-right" size={24} color={theme.screen.icon} />
					</PrintHidden>
				}
				onPress={onConsent}
				groupPosition="single"
			/>
		</View>
	);
};

type MapThemeGridProps = MapThemeSelectionState & {
	accentColor: string;
	mapPreviewCenter: { lat: number; lng: number };
	mapPreviewZoom: number;
	closeModal: () => void;
};

const MapThemeGrid: React.FC<MapThemeGridProps> = ({
	selectedMapStyleKey,
	onMapStyleKeyChange,
	accentColor,
	mapPreviewCenter,
	mapPreviewZoom,
	closeModal,
}) => {
	const { theme } = useTheme();
	return (
		<View style={styles.mapThemeGrid}>
			{(Object.values(MapStyleKey) as MapStyleKey[]).map((key) => {
				const def = MAP_STYLE_DEFINITIONS[key];
				const isSelected = selectedMapStyleKey === key;
				return (
					<CardWithText
						key={key}
						containerStyle={[
							styles.mapThemeCard,
							{ backgroundColor: theme?.card?.background },
							isSelected
								? [styles.mapThemeCardSelected, { borderColor: accentColor }]
								: styles.mapThemeCardUnselected,
						]}
						onPress={() => {
							onMapStyleKeyChange(key);
							closeModal();
						}}
						imageChildren={
							<View style={styles.mapPreviewWrapper} pointerEvents="none">
								<MyMap
									mapStyleKey={key}
									centerAtUserLocationIfNoInitialPosition={false}
									initialCenter={mapPreviewCenter}
									initialZoom={mapPreviewZoom}
									hideLegalInfo={true}
									onMessage={_noop}
								/>
							</View>
						}
						bottomContent={
							<View style={styles.mapThemeCardLabel}>
								{isSelected ? (
									<Ionicons
										name="checkmark-circle"
										size={16}
										color={accentColor}
										style={styles.mapThemeCheckIcon}
									/>
								) : null}
								<Text
									style={[styles.mapThemeCardText, { color: theme.screen.text }]}
									numberOfLines={1}
								>
									{def.label}
								</Text>
							</View>
						}
					/>
				);
			})}
		</View>
	);
};

type MapThemeSelectionModalContentProps = MapThemeGridProps & {
	initialHasConsent: boolean;
	onOsmConsentChange?: (value: boolean) => void;
	texts: SettingsListMyMapThemeSelectionTexts;
};

const MapThemeSelectionModalContent: React.FC<MapThemeSelectionModalContentProps> = ({
	initialHasConsent,
	selectedMapStyleKey,
	onMapStyleKeyChange,
	onOsmConsentChange,
	texts,
	accentColor,
	mapPreviewCenter,
	mapPreviewZoom,
	closeModal,
}) => {
	const [hasConsent, setHasConsent] = useState(initialHasConsent);

	const handleConsent = () => {
		setHasConsent(true);
		onOsmConsentChange?.(true);
	};

	if (!hasConsent) {
		return <OsmConsentGate onConsent={handleConsent} texts={texts} />;
	}

	return (
		<MapThemeGrid
			selectedMapStyleKey={selectedMapStyleKey}
			onMapStyleKeyChange={onMapStyleKeyChange}
			accentColor={accentColor}
			mapPreviewCenter={mapPreviewCenter}
			mapPreviewZoom={mapPreviewZoom}
			closeModal={closeModal}
		/>
	);
};

const SettingsListMyMapThemeSelection: React.FC<SettingsListMyMapThemeSelectionProps> = ({
	selectedMapStyleKey,
	onMapStyleKeyChange,
	accentColor = DEFAULT_ACCENT_COLOR,
	groupPosition = 'single',
	mapPreviewCenter = DEFAULT_MAP_PREVIEW_CENTER,
	mapPreviewZoom = DEFAULT_MAP_PREVIEW_ZOOM,
	label = 'Map Style',
	modalTitle = '🗺️ Map Style',
	leftIcon,
	iconBgColor,
	nativeID,
	osmConsent = true,
	onOsmConsentChange,
	texts = MAP_THEME_SELECTION_FALLBACK_TEXTS,
}) => {
	const { show: showModal, close: closeModal } = useMyScrollViewModal();

	const handleOpenSelection = useCallback(() => {
		showModal({
			title: modalTitle,
			disableHorizontalPadding: true,
			children: (
				<MapThemeSelectionModalContent
					initialHasConsent={osmConsent}
					texts={texts}
					selectedMapStyleKey={selectedMapStyleKey}
					onMapStyleKeyChange={onMapStyleKeyChange}
					onOsmConsentChange={onOsmConsentChange}
					accentColor={accentColor}
					mapPreviewCenter={mapPreviewCenter}
					mapPreviewZoom={mapPreviewZoom}
					closeModal={closeModal}
				/>
			),
		});
	}, [showModal, closeModal, selectedMapStyleKey, onMapStyleKeyChange, accentColor, mapPreviewCenter, mapPreviewZoom, modalTitle, osmConsent, onOsmConsentChange, texts]);

	return (
		<SettingsList
			leftIcon={leftIcon}
			iconBgColor={iconBgColor}
			label={label}
			value={MAP_STYLE_DEFINITIONS[selectedMapStyleKey]?.label ?? ''}
			rightIcon={
				<PrintHidden>
					<Ionicons name="chevron-forward" size={20} color="#9ca3af" />
				</PrintHidden>
			}
			onPress={handleOpenSelection}
			groupPosition={groupPosition}
			nativeID={nativeID}
		/>
	);
};

const styles = StyleSheet.create({
	mapThemeGrid: {
		flexDirection: 'row',
		flexWrap: 'wrap',
		gap: 8,
		paddingHorizontal: 16,
		paddingBottom: 8,
	},
	mapThemeCard: {
		width: '30%',
	},
	mapThemeCardSelected: {
		borderWidth: 2,
	},
	mapThemeCardUnselected: {
		borderWidth: 2,
		borderColor: 'transparent',
	},
	mapPreviewWrapper: {
		flex: 1,
	},
	mapThemeCardLabel: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 4,
	},
	mapThemeCheckIcon: {
		flexShrink: 0,
	},
	mapThemeCardText: {
		fontSize: 13,
		fontWeight: '600',
		flexShrink: 1,
	},
});

export default SettingsListMyMapThemeSelection;
