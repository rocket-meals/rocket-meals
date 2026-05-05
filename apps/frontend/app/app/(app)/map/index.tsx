import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Alert, Keyboard, Platform, SafeAreaView, ScrollView, StyleSheet, Switch, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useTheme } from '@/hooks/useTheme';
import useSetPageTitle from '@/hooks/useSetPageTitle';
import { TranslationKeys } from '@/locales/keys';
import useSelectedCanteen from '@/hooks/useSelectedCanteen';
import { useAppSelector } from '@/redux/hooks';
import { DatabaseTypes } from 'repo-depkit-common';
import { useDispatch } from 'react-redux';
import { SET_OSM_VECTOR_MAP_AUTO_ROTATE_MODE, SET_OSM_VECTOR_MAP_CAR_MODE, SET_OSM_VECTOR_MAP_CLUSTER_DISTANCE, SET_OSM_VECTOR_MAP_CONSENT, SET_OSM_VECTOR_MAP_GAME_MODE, SET_OSM_VECTOR_MAP_INTELLIGENT_MOVEMENT, SET_OSM_VECTOR_MAP_ORGANISATION_FILTER, SET_OSM_VECTOR_MAP_PEOPLE_COUNT, SET_OSM_VECTOR_MAP_PEOPLE_MODE, SET_OSM_VECTOR_MAP_SHOW_CONTROLS_HINT, SET_OSM_VECTOR_MAP_STYLE_KEY, SET_OSM_VECTOR_MAP_USE_FLY_ANIMATION } from '@/redux/Types/types';
import SettingsGroupMyMapGeneralMarkers from '@/components/SettingsGroupMyMapGeneralMarkers';
import { clusterMarkers } from '@/components/MyMap/clusterUtils';
import { MARKER_DEFAULT_SIZE, createUserLocationMarkerSvg, getMarkerLabelFromBuildingAlias } from '@/components/MyMap/markerUtils';
import { MapMarker } from '@/components/MyMap/model';
import { BARRIER_ICON_KEYS, PARKING_ICON_KEYS, POI_SUBTYPES } from '@/components/MyMap/poiSubtypes';
import { ICON_EMOJI_MAP } from '@/components/MyMap/iconEmojiMap';
import { BuildingsHelper } from '@/redux/actions/Buildings/Buildings';
import MapHeader from '@/app/(app)/map/components/MapHeader';
import DebugView from '@/components/DebugView';
import SettingsList from '@/components/SettingsList/SettingsList';
import SettingsGroupTitle from '@/components/SettingsGroupTitle';
import SettingsListOrganisationFast from '@/components/SettingsListOrganisationFast';
import { useMyScrollViewModal } from '@/components/GlobalModal/useMyScrollViewModal';
import { useLanguage } from '@/hooks/useLanguage';
import useBuildingDetailsModal from '@/hooks/useBuildingDetailsModal';
import { Entypo, MaterialCommunityIcons, MaterialIcons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import MyMap from '@/components/MyMap';
import type { MyMapHandle } from '@/components/MyMap/MyMapHelper';
import { MapStyleKey, SettingsListMyMapThemeSelection, MAP_STYLE_DEFINITIONS } from 'repo-depkit-common-ui';
import JoggingOverlay from '@/app/(app)/map/components/JoggingOverlay';

type BuildingCoordinates = { coordinates?: [number, number] } | null;

// MapLibre pitch value for 70° viewing angle (pitch = degrees from vertical)
const INITIAL_PITCH = 20;
const GAME_MODE_PITCH = 70;

// ─── Game Mode (Spiel Modus) constants ───────────────────────────────────────

const GAME_TICK_MS = 100;
const METERS_PER_LAT_DEG = 111320;
const TICKS_PER_SECOND = 1000 / GAME_TICK_MS;
const KMH_TO_DEG_PER_TICK = 1 / (3.6 * METERS_PER_LAT_DEG * TICKS_PER_SECOND);
const AIRPLANE_DEFAULT_SPEED_KMH = 300;
const AIRPLANE_SPEED_STEP_SMALL = 10;
const AIRPLANE_SPEED_STEP_LARGE = 100;
const AIRPLANE_MIN_SPEED_KMH = 10;
const AIRPLANE_TURN_DEG = 5;
const AIRPLANE_DEFAULT_SIZE = 56;
const AIRPLANE_SIZE_STEP = 8;
const AIRPLANE_MIN_SIZE = 24;

// ─── Auto-Rotate Mode (Auto-Rotate Modus) constants ──────────────────────────

const AUTO_ROTATE_SPEED_STEP = 5; // degrees/second per button press

type GamePosition = { lat: number; lng: number };

function degToRad(deg: number): number {
	return (deg * Math.PI) / 180;
}

function moveByHeading(pos: GamePosition, headingDeg: number, distanceDeg: number): GamePosition {
	const rad = degToRad(headingDeg);
	const cosLat = Math.cos(degToRad(pos.lat));
	return {
		lat: pos.lat + distanceDeg * Math.cos(rad),
		lng: pos.lng + (distanceDeg * Math.sin(rad)) / cosLat,
	};
}

function normalizeHeading(h: number): number {
	return ((h % 360) + 360) % 360;
}

type ControlButtonProps = {
	onPressIn?: () => void;
	onPressOut?: () => void;
	onPress?: () => void;
	label?: string;
	icon?: React.ReactNode;
	color?: string;
	size?: 'sm' | 'md' | 'lg';
};

const ControlButton: React.FC<ControlButtonProps> = ({
	onPressIn,
	onPressOut,
	onPress,
	label,
	icon,
	color = 'rgba(0,0,0,0.65)',
	size = 'md',
}) => {
	const dim = size === 'sm' ? 38 : size === 'lg' ? 58 : 48;
	return (
		<TouchableOpacity
			style={{
				width: dim,
				height: dim,
				borderRadius: dim / 2,
				backgroundColor: color,
				alignItems: 'center',
				justifyContent: 'center',
				margin: 3,
				shadowColor: '#000',
				shadowOffset: { width: 0, height: 2 },
				shadowOpacity: 0.4,
				shadowRadius: 4,
				elevation: 5,
			}}
			onPressIn={onPressIn}
			onPressOut={onPressOut}
			onPress={onPress}
			activeOpacity={0.7}
		>
			{icon ?? (
				<Text style={{ color: 'white', fontSize: size === 'sm' ? 14 : 18, fontWeight: 'bold' }}>
					{label}
				</Text>
			)}
		</TouchableOpacity>
	);
};

type AirplaneControlsProps = {
	onTurnLeftStart: () => void;
	onTurnLeftEnd: () => void;
	onTurnRightStart: () => void;
	onTurnRightEnd: () => void;
	onSpeedUp: () => void;
	onSpeedUpLarge: () => void;
	onSpeedDown: () => void;
	onSpeedDownLarge: () => void;
};

const AirplaneControls: React.FC<AirplaneControlsProps> = ({
	onTurnLeftStart,
	onTurnLeftEnd,
	onTurnRightStart,
	onTurnRightEnd,
	onSpeedUp,
	onSpeedUpLarge,
	onSpeedDown,
	onSpeedDownLarge,
}) => (
	<View style={gameModeStyles.airplaneLayout}>
		<View style={gameModeStyles.turnColumn}>
			<ControlButton onPressIn={onTurnLeftStart} onPressOut={onTurnLeftEnd} label="◀" color="rgba(26,115,232,0.85)" size="lg" />
			<ControlButton onPressIn={onTurnRightStart} onPressOut={onTurnRightEnd} label="▶" color="rgba(26,115,232,0.85)" size="lg" />
		</View>
		<View style={gameModeStyles.throttleColumn}>
			<ControlButton onPress={onSpeedUpLarge} label="+100" color="rgba(46,125,50,0.85)" size="sm" />
			<ControlButton onPress={onSpeedUp} label="+10" color="rgba(46,125,50,0.85)" size="sm" />
			<ControlButton onPress={onSpeedDown} label="-10" color="rgba(183,28,28,0.85)" size="sm" />
			<ControlButton onPress={onSpeedDownLarge} label="-100" color="rgba(183,28,28,0.85)" size="sm" />
		</View>
	</View>
);

const gameModeStyles = StyleSheet.create({
	airplaneLayout: { flexDirection: 'row', alignItems: 'center', gap: 12 },
	turnColumn: { flexDirection: 'row', gap: 6 },
	throttleColumn: { flexDirection: 'column', gap: 6 },
});

type OsmSettingsContentProps = {
	initialSelectedStyleKey: MapStyleKey;
	initialUseFlyAnimation: boolean;
	initialClusterDistance: number;
	initialGameMode: boolean;
	initialAutoRotateMode: boolean;
	initialPeopleMode: boolean;
	initialIntelligentMovement: boolean;
	initialPeopleCount: number;
	initialCarMode: boolean;
	isFullscreen: boolean;
	onSelectedStyleChange: (key: MapStyleKey) => void;
	onFlyAnimationChange: (value: boolean) => void;
	onClusterDistanceChange: (value: number) => void;
	onGameModeChange: (value: boolean) => void;
	onAutoRotateModeChange: (value: boolean) => void;
	onPeopleModeChange: (value: boolean) => void;
	onIntelligentMovementChange: (value: boolean) => void;
	onPeopleCountChange: (value: number) => void;
	onCarModeChange: (value: boolean) => void;
	onToggleFullscreen: () => void;
	onShowControlsHint: () => void;
	onRevokeConsent: () => void;
	theme: ReturnType<typeof useTheme>['theme'];
};

const OsmSettingsContent: React.FC<OsmSettingsContentProps> = ({
	initialSelectedStyleKey,
	initialUseFlyAnimation,
	initialClusterDistance,
	initialGameMode,
	initialAutoRotateMode,
	initialPeopleMode,
	initialIntelligentMovement,
	initialPeopleCount,
	initialCarMode,
	isFullscreen,
	onSelectedStyleChange,
	onFlyAnimationChange,
	onClusterDistanceChange,
	onGameModeChange,
	onAutoRotateModeChange,
	onPeopleModeChange,
	onIntelligentMovementChange,
	onPeopleCountChange,
	onCarModeChange,
	onToggleFullscreen,
	onShowControlsHint,
	onRevokeConsent,
	theme,
}) => {
	const [selectedStyleKey, setSelectedStyleKey] = useState(initialSelectedStyleKey);
	const [localFlyAnimation, setLocalFlyAnimation] = useState(initialUseFlyAnimation);
	const [localClusterDistance, setLocalClusterDistance] = useState(String(initialClusterDistance));
	const [localGameMode, setLocalGameMode] = useState(initialGameMode);
	const [localAutoRotateMode, setLocalAutoRotateMode] = useState(initialAutoRotateMode);
	const [localPeopleMode, setLocalPeopleMode] = useState(initialPeopleMode);
	const [localIntelligentMovement, setLocalIntelligentMovement] = useState(initialIntelligentMovement);
	const [localPeopleCount, setLocalPeopleCount] = useState(String(initialPeopleCount));
	const [localCarMode, setLocalCarMode] = useState(initialCarMode);

	return (
		<>
			<SettingsGroupTitle>Karten Einstellungen</SettingsGroupTitle>
			<SettingsListMyMapThemeSelection
				selectedMapStyleKey={selectedStyleKey}
				onMapStyleKeyChange={(key) => {
					setSelectedStyleKey(key);
					onSelectedStyleChange(key);
				}}
				leftIcon={<MaterialIcons name="layers" size={20} color={theme.screen.icon} />}
				groupPosition="top"
			/>
			<SettingsList
				title="Cluster-Abstand (px)"
				leftIcon={<MaterialCommunityIcons name="dots-grid" size={20} color={theme.screen.icon} />}
				rightElement={
					<TextInput
						value={localClusterDistance}
						onChangeText={(text) => {
							setLocalClusterDistance(text);
							const num = Number.parseInt(text, 10);
							if (!Number.isNaN(num) && num >= 10) {
								onClusterDistanceChange(num);
							}
						}}
						keyboardType="numeric"
						style={{ color: theme.screen.text, textAlign: 'right', minWidth: 60, fontSize: 15 }}
					/>
				}
				groupPosition="middle"
			/>
			<SettingsList
				title="Sanfte Kamera-Bewegung"
				leftIcon={<MaterialIcons name="animation" size={20} color={theme.screen.icon} />}
				rightElement={
					<Switch
						value={localFlyAnimation}
						onValueChange={(value) => {
							setLocalFlyAnimation(value);
							onFlyAnimationChange(value);
						}}
					/>
				}
				groupPosition="middle"
				showSeparator={true}
			/>
			<SettingsList
				title="Vollbild"
				leftIcon={<MaterialIcons name={isFullscreen ? 'fullscreen-exit' : 'fullscreen'} size={20} color={theme.screen.icon} />}
				rightElement={
					<Switch
						value={isFullscreen}
						onValueChange={onToggleFullscreen}
					/>
				}
				groupPosition="middle"
				showSeparator={true}
			/>
			<SettingsList
				title="Kartensteuerung"
				leftIcon={<MaterialIcons name="touch-app" size={20} color={theme.screen.icon} />}
				rightIcon={<Entypo name="chevron-small-right" size={24} color={theme.screen.icon} />}
				onPress={onShowControlsHint}
				groupPosition="bottom"
				showSeparator={false}
			/>
			<SettingsGroupMyMapGeneralMarkers />
			<SettingsGroupTitle>Datenschutz</SettingsGroupTitle>
			<SettingsList
				title="OpenStreetMap-Zustimmung widerrufen"
				value="Karte wird danach nicht mehr geladen"
				leftIcon={<MaterialCommunityIcons name="map-marker-off-outline" size={20} color={theme.screen.icon} />}
				rightIcon={<Entypo name="chevron-small-right" size={24} color={theme.screen.icon} />}
				onPress={onRevokeConsent}
				groupPosition="single"
			/>
			<SettingsGroupTitle>Spaß Einstellungen</SettingsGroupTitle>
			<SettingsList
				title="Spiel Modus"
				leftIcon={<MaterialIcons name="sports-esports" size={20} color={theme.screen.icon} />}
				rightElement={
					<Switch
						value={localGameMode}
						onValueChange={(value) => {
							setLocalGameMode(value);
							onGameModeChange(value);
						}}
					/>
				}
				groupPosition="top"
				showSeparator={true}
			/>
			<SettingsList
				title="Auto-Rotate Modus"
				leftIcon={<MaterialIcons name="360" size={20} color={theme.screen.icon} />}
				rightElement={
					<Switch
						value={localAutoRotateMode}
						onValueChange={(value) => {
							setLocalAutoRotateMode(value);
							onAutoRotateModeChange(value);
						}}
					/>
				}
				groupPosition="middle"
				showSeparator={true}
			/>
			<SettingsList
				title="Fiktiver Mensch Modus"
				leftIcon={<MaterialIcons name="people" size={20} color={theme.screen.icon} />}
				rightElement={
					<Switch
						value={localPeopleMode}
						onValueChange={(value) => {
							setLocalPeopleMode(value);
							onPeopleModeChange(value);
						}}
					/>
				}
				groupPosition="middle"
				showSeparator={true}
			/>
			{localPeopleMode && (
				<SettingsList
					title="Intelligente Bewegung"
					leftIcon={<MaterialIcons name="directions-walk" size={20} color={theme.screen.icon} />}
					rightElement={
						<Switch
							value={localIntelligentMovement}
							onValueChange={(value) => {
								setLocalIntelligentMovement(value);
								onIntelligentMovementChange(value);
							}}
						/>
					}
					groupPosition="middle"
					showSeparator={true}
				/>
			)}
			{localPeopleMode && (
				<SettingsList
					title="Anzahl simulierter Menschen"
					leftIcon={<MaterialIcons name="person-add" size={20} color={theme.screen.icon} />}
					rightElement={
						<TextInput
							value={localPeopleCount}
							onChangeText={(text) => {
								setLocalPeopleCount(text);
								const num = Number.parseInt(text, 10);
								if (!Number.isNaN(num) && num >= 1) {
									onPeopleCountChange(num);
								}
							}}
							keyboardType="numeric"
							style={{ color: theme.screen.text, textAlign: 'right', minWidth: 60, fontSize: 15 }}
						/>
					}
					groupPosition="middle"
					showSeparator={true}
				/>
			)}
			<SettingsList
				title="Fiktiver Autofahrer Modus"
				leftIcon={<MaterialIcons name="directions-car" size={20} color={theme.screen.icon} />}
				rightElement={
					<Switch
						value={localCarMode}
						onValueChange={(value) => {
							setLocalCarMode(value);
							onCarModeChange(value);
						}}
					/>
				}
				groupPosition="bottom"
				showSeparator={false}
			/>
		</>
	);
};

type OsmControlsHintContentProps = {
	onDontShowAgain: () => void;
	theme: ReturnType<typeof useTheme>['theme'];
};

const OsmControlsHintContent: React.FC<OsmControlsHintContentProps> = ({ onDontShowAgain, theme }) => {
	const isWeb = Platform.OS === 'web';
	return (
		<View style={{ paddingHorizontal: 16, paddingVertical: 8 }}>
			{isWeb ? (
				<>
					<Text style={{ color: theme.screen.text, fontSize: 15, marginBottom: 8 }}>
						{'🖱️ Linke Maustaste halten: Karte verschieben'}
					</Text>
					<Text style={{ color: theme.screen.text, fontSize: 15, marginBottom: 8 }}>
						{'🖱️ Rechte Maustaste halten: Neigung ändern'}
					</Text>
					<Text style={{ color: theme.screen.text, fontSize: 15, marginBottom: 8 }}>
						{'🖱️ Mausrad: Zoomen'}
					</Text>
				</>
			) : (
				<>
					<Text style={{ color: theme.screen.text, fontSize: 15, marginBottom: 8 }}>
						{'👌 Zwei Finger spreizen / zusammenführen: Zoomen'}
					</Text>
					<Text style={{ color: theme.screen.text, fontSize: 15, marginBottom: 8 }}>
						{'☝️☝️ Zwei Finger hoch / runter: Neigung ändern'}
					</Text>
					<Text style={{ color: theme.screen.text, fontSize: 15, marginBottom: 8 }}>
						{'☝️ Ein Finger bewegen: Karte verschieben'}
					</Text>
				</>
			)}
			<Text style={{ color: theme.screen.text + '99', fontSize: 13, marginTop: 8, marginBottom: 16 }}>
				{'Dieser Hinweis kann über die Einstellungen jederzeit aufgerufen werden.'}
			</Text>
			<TouchableOpacity
				onPress={onDontShowAgain}
				style={{
					backgroundColor: theme.screen.iconBg,
					borderRadius: 8,
					paddingVertical: 12,
					alignItems: 'center',
				}}
			>
				<Text style={{ color: theme.screen.text, fontSize: 15 }}>Diesen Hinweis nicht mehr anzeigen</Text>
			</TouchableOpacity>
		</View>
	);
};

type OsmConsentContentProps = {
	onConsent: () => void;
	theme: ReturnType<typeof useTheme>['theme'];
};

const OsmConsentContent: React.FC<OsmConsentContentProps> = ({ onConsent, theme }) => (
	<View style={{ paddingHorizontal: 16, paddingVertical: 24, alignItems: 'center' }}>
		<MaterialCommunityIcons name="map-marker-radius" size={56} color={theme.screen.icon} style={{ marginBottom: 16 }} />
		<Text style={{ color: theme.screen.text, fontSize: 17, fontWeight: 'bold', textAlign: 'center', marginBottom: 12 }}>
			Kartenanzeige mit OpenStreetMap
		</Text>
		<Text style={{ color: theme.screen.text, fontSize: 14, textAlign: 'center', marginBottom: 8, lineHeight: 20 }}>
			Diese Karte lädt Kartendaten von <Text style={{ fontWeight: 'bold' }}>OpenStreetMap</Text> (openstreetmap.org) und <Text style={{ fontWeight: 'bold' }}>OpenFreeMap</Text> (openfreemap.org). Dabei werden Daten wie deine IP-Adresse an Server der OpenStreetMap Foundation und Protomaps LLC übertragen.
		</Text>
		<Text style={{ color: theme.screen.text + 'aa', fontSize: 13, textAlign: 'center', marginBottom: 24, lineHeight: 18 }}>
			Deine Zustimmung wird gespeichert und kann jederzeit in den Karten-Einstellungen widerrufen werden.
		</Text>
		<SettingsList
			title="Kartendaten laden (Zustimmen)"
			leftIcon={<MaterialCommunityIcons name="check-circle-outline" size={22} color={theme.screen.icon} />}
			rightIcon={<Entypo name="chevron-small-right" size={24} color={theme.screen.icon} />}
			onPress={onConsent}
			groupPosition="single"
		/>
	</View>
);

type OsmFilterContentProps = {
	organisations: DatabaseTypes.Organizations[];
	initialLikes: Record<string, boolean | null>;
	onLikeChange: (organisationId: string, like: boolean) => void;
	onResetAll: () => void;
};

const OsmFilterContent: React.FC<OsmFilterContentProps> = ({
	organisations,
	initialLikes,
	onLikeChange,
	onResetAll,
}) => {
	const [localLikes, setLocalLikes] = useState<Record<string, boolean | null>>(initialLikes);
	const { translate } = useLanguage();

	useEffect(() => {
		setLocalLikes(initialLikes);
	}, [initialLikes]);

	const handlePressLike = useCallback(
		(orgId: string) => {
			setLocalLikes((prev) => {
				const current = prev[orgId];
				const next = current === true ? null : true;
				if (next === null) {
					const updated = { ...prev };
					delete updated[orgId];
					return updated;
				}
				return { ...prev, [orgId]: next };
			});
			onLikeChange(orgId, true);
		},
		[onLikeChange],
	);

	const handlePressDislike = useCallback(
		(orgId: string) => {
			setLocalLikes((prev) => {
				const current = prev[orgId];
				const next = current === false ? null : false;
				if (next === null) {
					const updated = { ...prev };
					delete updated[orgId];
					return updated;
				}
				return { ...prev, [orgId]: next };
			});
			onLikeChange(orgId, false);
		},
		[onLikeChange],
	);

	const handleResetAll = useCallback(() => {
		setLocalLikes({});
		onResetAll();
	}, [onResetAll]);

	if (organisations.length === 0) {
		return (
			<View style={{ paddingHorizontal: 16, paddingVertical: 12 }}>
				<Text style={{ color: '#888' }}>{translate(TranslationKeys.no_data_found)}</Text>
			</View>
		);
	}

	return (
		<>
			<SettingsList
				label={translate(TranslationKeys.reset_filter)}
				leftIcon={<MaterialCommunityIcons name="broom" size={22} />}
				handleFunction={handleResetAll}
				groupPosition="single"
			/>
			<View style={{ height: 16 }} />
			{organisations.map((org, index) => {
				const total = organisations.length;
				const groupPosition =
					total === 1 ? 'single' : index === 0 ? 'top' : index === total - 1 ? 'bottom' : 'middle';
				return (
					<SettingsListOrganisationFast
						key={org.id}
						organisationId={org.id}
						like={localLikes[org.id] ?? null}
						onPressLike={handlePressLike}
						onPressDislike={handlePressDislike}
						groupPosition={groupPosition}
					/>
				);
			})}
			<SettingsGroupMyMapGeneralMarkers />
		</>
	);
};

const POSITION_BUNDESTAG = {
	lat: 52.518594247456804,
	lng: 13.376281624711964,
};

const MAX_LOG_ENTRIES = 50;
const MAX_ZOOM = 20;
const DEFAULT_ZOOM = 16;
const BUILDING_MARKER_SIZE = MARKER_DEFAULT_SIZE;
const BUILDING_MARKER_COLOR = '#1565c0';
const MAX_BUILDING_LABEL_CHARS = 8;
const MAX_SEARCH_RESULTS = 3;

const noop = () => {};

function getContrastColor(hexColor: string): string {
	const hex = hexColor.replace('#', '');
	if (hex.length !== 6) return '#ffffff';
	const r = Number.parseInt(hex.slice(0, 2), 16) / 255;
	const g = Number.parseInt(hex.slice(2, 4), 16) / 255;
	const b = Number.parseInt(hex.slice(4, 6), 16) / 255;
	const luminance = 0.2126 * r + 0.7152 * g + 0.0722 * b;
	const WCAG_LIGHT_THRESHOLD = 0.179;
	return luminance > WCAG_LIGHT_THRESHOLD ? '#000000' : '#ffffff';
}

function getFirstOrganisationFromDict(
	buildingId: string,
	buildingIdToOrgsDict: Record<string, DatabaseTypes.Organizations[]>,
): DatabaseTypes.Organizations | null {
	const orgs = buildingIdToOrgsDict[buildingId];
	return orgs && orgs.length > 0 ? orgs[0] : null;
}

function createBuildingMarkerSvg(
	externalIdentifier?: string | null,
	markerColor?: string | null,
	markerLabel?: string | null,
	markerLabelColor?: string | null,
	orgMarkerColor?: string | null,
	orgMarkerLabelColor?: string | null,
	fallbackColor?: string | null,
	fallbackLabelColor?: string | null,
	alias?: string | null,
	showLabel?: boolean,
): string {
	const size = BUILDING_MARKER_SIZE;
	const cx = size / 2;
	const cy = size / 2;
	const r = cx - 2;
	const fillColor = markerColor || orgMarkerColor || fallbackColor || BUILDING_MARKER_COLOR;
	const textColor = markerLabelColor || orgMarkerLabelColor || fallbackLabelColor || getContrastColor(fillColor);
	let rawLabel: string | null = markerLabel || externalIdentifier || null;
	if (!rawLabel && alias) {
		rawLabel = getMarkerLabelFromBuildingAlias(alias);
	}
	const label = (showLabel !== false && rawLabel) ? rawLabel.slice(0, MAX_BUILDING_LABEL_CHARS) : null;
	const circleEl = `<circle cx="${cx}" cy="${cy}" r="${r}" fill="${fillColor}" stroke="white" stroke-width="2" opacity="0.9"/>`;
	let textEl = '';
	if (label) {
		const spaceIdx = label.indexOf(' ');
		const splitAtSpace = spaceIdx > 0 && spaceIdx < label.length - 1;
		let line1: string | null = null;
		let line2: string | null = null;
		if (splitAtSpace) {
			line1 = label.slice(0, spaceIdx);
			line2 = label.slice(spaceIdx + 1);
		} else if (label.length >= 4) {
			const mid = Math.ceil(label.length / 2);
			line1 = label.slice(0, mid);
			line2 = label.slice(mid);
		}
		if (line1 !== null && line2 !== null) {
			textEl = `<text x="${cx}" text-anchor="middle" fill="${textColor}" font-family="Arial,sans-serif" font-size="10" font-weight="bold">` +
				`<tspan x="${cx}" text-anchor="middle" dy="${cy - 6}">${line1}</tspan>` +
				`<tspan x="${cx}" text-anchor="middle" dy="13">${line2}</tspan>` +
				`</text>`;
		} else {
			textEl = `<text x="${cx}" y="${cy}" text-anchor="middle" dy="0.35em" fill="${textColor}" font-family="Arial,sans-serif" font-size="12" font-weight="bold">${label}</text>`;
		}
	}
	return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}">${circleEl}${textEl}</svg>`;
}

const OsmVectorMapScreen: React.FC = () => {
	useSetPageTitle(TranslationKeys.map);
	const { theme } = useTheme();
	const myMapRef = useRef<MyMapHandle>(null);

	const { buildingsDict, buildingsOrganizations, organisations } = useAppSelector((state) => state.canteenReducer);
	const buildings = useMemo(() => Object.values(buildingsDict ?? {}), [buildingsDict]);
	const primaryColor = useAppSelector((state) => state.settings.primaryColor);
	const drawerPosition = useAppSelector((state) => state.settings.drawerPosition);
	const selectedStyleKey = useAppSelector((state) => ((state.settings as any).osmVectorMapStyleKey ?? MapStyleKey.DEFAULT) as MapStyleKey);
	const useFlyAnimation = useAppSelector((state) => (state.settings as any).osmVectorMapUseFlyAnimation ?? true);
	const clusterDistance = useAppSelector((state) => (state.settings as any).osmVectorMapClusterDistance ?? 30);
	const showControlsHint = useAppSelector((state) => (state.settings as any).osmVectorMapShowControlsHint ?? true);
	const gameMode = useAppSelector((state) => (state.settings as any).osmVectorMapGameMode ?? false);
	const autoRotateMode = useAppSelector((state) => (state.settings as any).osmVectorMapAutoRotateMode ?? false);
	const peopleMode = useAppSelector((state) => (state.settings as any).osmVectorMapPeopleMode ?? false);
	const intelligentMovement = useAppSelector((state) => (state.settings as any).osmVectorMapIntelligentMovement ?? false);
	const peopleCount = useAppSelector((state) => (state.settings as any).osmVectorMapPeopleCount ?? 80);
	const carMode = useAppSelector((state) => (state.settings as any).osmVectorMapCarMode ?? false);
	const osmConsent = useAppSelector((state) => (state.settings as any).osmVectorMapConsent ?? false);
	const showSettings = useAppSelector(
		(state) => ((state.settings as any).osmVectorMapShowSettings ?? { poi: true, transit: true, roadNames: true, leisure: true, barriers: false, parking: true }) as Record<string, boolean>,
	);
	const poiSubSettings = useAppSelector(
		(state) => ((state.settings as any).osmVectorMapPoiSubSettings ?? {}) as Record<string, boolean>,
	);
	const showBuildingMarkers = true;
	const showClusters = true;
	const showMarkerLabels = true;
	const organisationLikes = useAppSelector(
		(state) => ((state.settings as any).osmVectorMapOrganisationFilter ?? {}) as Record<string, boolean | null>,
	);
	const dispatch = useDispatch();
	const selectedCanteen = useSelectedCanteen();
	const { openBuildingDetailsModal } = useBuildingDetailsModal();
	const { show, close } = useMyScrollViewModal();
	const { translate } = useLanguage();

	const [logEntries, setLogEntries] = useState<string[]>([]);
	const logScrollRef = useRef<ScrollView>(null);
	const [searchQuery, setSearchQuery] = useState('');
	const [mapZoom, setMapZoom] = useState(DEFAULT_ZOOM);
	const [mapCenterOverride, setMapCenterOverride] = useState<{ lat: number; lng: number } | null>(null);
	const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
	const [isFullscreen, setIsFullscreen] = useState(false);
	const isFullscreenRef = useRef(isFullscreen);
	isFullscreenRef.current = isFullscreen;

	// pendingNavigateRef: true = include position in next sendMapData call
	const pendingNavigateRef = useRef(true);

	// Ref always pointing to the latest centerPosition for use in one-time HTML loading
	const centerPositionRef = useRef<{ lat: number; lng: number }>(POSITION_BUNDESTAG);

	// ── Game mode (Spiel Modus) state ────────────────────────────────────────────
	const [vehicleHeading, setVehicleHeading] = useState(0);
	const [airplaneSpeedKmh, setAirplaneSpeedKmh] = useState(AIRPLANE_DEFAULT_SPEED_KMH);
	const [airplaneSize, setAirplaneSize] = useState(AIRPLANE_DEFAULT_SIZE);
	const [headingUpMode, setHeadingUpMode] = useState(true);
	const [gameMapReady, setGameMapReady] = useState(false);
	// currentPitch is null until the first pitchend event fires; scaleY=1 until then.
	const [currentPitch, setCurrentPitch] = useState<number | null>(null);

	const vehicleHeadingRef = useRef(vehicleHeading);
	vehicleHeadingRef.current = vehicleHeading;
	const airplaneSpeedRef = useRef(airplaneSpeedKmh);
	airplaneSpeedRef.current = airplaneSpeedKmh;
	const headingUpModeRef = useRef(headingUpMode);
	headingUpModeRef.current = headingUpMode;
	const vehiclePosRef = useRef<GamePosition>(POSITION_BUNDESTAG);
	const turnLeftRef = useRef(false);
	const turnRightRef = useRef(false);
	const gameModeRef = useRef(gameMode);
	gameModeRef.current = gameMode;
	const gameMapReadyRef = useRef(gameMapReady);
	gameMapReadyRef.current = gameMapReady;
	const mapZoomRef = useRef(mapZoom);
	mapZoomRef.current = mapZoom;
	// Tracks whether the map has fired MapComponentMounted at least once
	const mapMountedRef = useRef(false);

	// ── Auto-Rotate Mode (Auto-Rotate Modus) state ───────────────────────────────
	const [autoRotateSpeed, setAutoRotateSpeed] = useState(0); // degrees/second
	const peopleModeRef = useRef(peopleMode);
	peopleModeRef.current = peopleMode;
	const intelligentMovementRef = useRef(intelligentMovement);
	intelligentMovementRef.current = intelligentMovement;
	const peopleCountRef = useRef(peopleCount);
	peopleCountRef.current = peopleCount;
	const carModeRef = useRef(carMode);
	carModeRef.current = carMode;
	const showSettingsRef = useRef(showSettings);
	showSettingsRef.current = showSettings;
	const poiSubSettingsRef = useRef(poiSubSettings);
	poiSubSettingsRef.current = poiSubSettings;

	const handleOrganisationLikeChangeRef = useRef<(orgId: string, like: boolean) => void>(() => {});
	const handleResetAllFiltersRef = useRef<() => void>(() => {});

	const addLog = useCallback((entry: string) => {
		setLogEntries((prev) => {
			const next = [...prev, `${new Date().toLocaleTimeString()}: ${entry}`];
			return next.length > MAX_LOG_ENTRIES ? next.slice(next.length - MAX_LOG_ENTRIES) : next;
		});
	}, []);

	const organisationsDict = useMemo(
		() =>
			(organisations as DatabaseTypes.Organizations[]).reduce<Record<string, DatabaseTypes.Organizations>>(
				(acc, org) => {
					acc[org.id] = org;
					return acc;
				},
				{},
			),
		[organisations],
	);

	const buildingIdToOrgsDict = useMemo(
		() => BuildingsHelper.getBuildingIdToOrganizationsDict(buildingsOrganizations, organisationsDict),
		[buildingsOrganizations, organisationsDict],
	);

	const primaryColorContrastColor = useMemo(() => getContrastColor(primaryColor), [primaryColor]);

	const handleOrganisationLikeChange = useCallback(
		(orgId: string, like: boolean) => {
			const current = organisationLikes[orgId];
			const next = current === like ? null : like;
			const updated = { ...organisationLikes };
			if (next === null) {
				delete updated[orgId];
			} else {
				updated[orgId] = next;
			}
			dispatch({ type: SET_OSM_VECTOR_MAP_ORGANISATION_FILTER, payload: updated });
		},
		[dispatch, organisationLikes],
	);
	handleOrganisationLikeChangeRef.current = handleOrganisationLikeChange;

	const stableOnOrganisationLikeChange = useCallback((orgId: string, like: boolean) => {
		handleOrganisationLikeChangeRef.current(orgId, like);
	}, []);

	const handleResetAllFilters = useCallback(() => {
		dispatch({ type: SET_OSM_VECTOR_MAP_ORGANISATION_FILTER, payload: {} });
	}, [dispatch]);
	handleResetAllFiltersRef.current = handleResetAllFilters;

	const stableOnResetAllFilters = useCallback(() => {
		handleResetAllFiltersRef.current();
	}, []);

	const setSelectedStyleKey = useCallback(
		(key: MapStyleKey) => {
			dispatch({ type: SET_OSM_VECTOR_MAP_STYLE_KEY, payload: key });
		},
		[dispatch],
	);

	const setUseFlyAnimationDispatch = useCallback(
		(value: boolean) => {
			dispatch({ type: SET_OSM_VECTOR_MAP_USE_FLY_ANIMATION, payload: value });
		},
		[dispatch],
	);

	const setClusterDistanceDispatch = useCallback(
		(value: number) => {
			dispatch({ type: SET_OSM_VECTOR_MAP_CLUSTER_DISTANCE, payload: value });
		},
		[dispatch],
	);

	const centerPosition = useMemo(() => {
		if (selectedCanteen?.building) {
			const building = buildingsDict[String(selectedCanteen.building)];
			const coords = (building?.coordinates as BuildingCoordinates)?.coordinates;
			if (coords && coords.length === 2) {
				return { lat: Number(coords[1]), lng: Number(coords[0]) };
			}
		}
		return POSITION_BUNDESTAG;
	}, [selectedCanteen, buildingsDict]);

	// Keep centerPositionRef up to date for use in game mode and other ref-based access
	useEffect(() => {
		centerPositionRef.current = centerPosition;
	}, [centerPosition]);

	useEffect(() => {
		setMapCenterOverride(null);
		pendingNavigateRef.current = true;
		vehiclePosRef.current = centerPosition;
	}, [centerPosition]);

	// When game mode changes, trigger a navigation with the correct pitch
	useEffect(() => {
		pendingNavigateRef.current = true;
		// Reset pitch tracking so scaleY stays at 1 until the camera completes its first correcting pitch.
		setCurrentPitch(null);
		if (gameMode) {
			vehiclePosRef.current = centerPositionRef.current;
			setVehicleHeading(0);
			setAirplaneSpeedKmh(AIRPLANE_DEFAULT_SPEED_KMH);
			setAirplaneSize(AIRPLANE_DEFAULT_SIZE);
			setHeadingUpMode(true);
			setGameMapReady(false);
			// If the map has already loaded, immediately init game without waiting for MapComponentMounted
			if (mapMountedRef.current) {
				sendGameInitDataRef.current();
				setGameMapReady(true);
			}
		} else {
			setGameMapReady(false);
			// Re-enable map interaction and navigate back to normal view when leaving game mode
			sendToMapRef.current({
				enableInteraction: true,
				mapCenterPosition: centerPositionRef.current,
				zoom: DEFAULT_ZOOM,
				pitch: INITIAL_PITCH,
				useFlyAnimation: false,
			});
		}
	}, [gameMode]); // eslint-disable-line react-hooks/exhaustive-deps

	const likedOrganisationIds = useMemo(
		() =>
			Object.entries(organisationLikes)
				.filter(([, v]) => v === true)
				.map(([k]) => k),
		[organisationLikes],
	);

	const dislikedOrganisationIds = useMemo(
		() =>
			Object.entries(organisationLikes)
				.filter(([, v]) => v === false)
				.map(([k]) => k),
		[organisationLikes],
	);

	const buildingMarkers = useMemo((): MapMarker[] => {
		return buildings
			.filter((building) => {
				const coords = (building?.coordinates as BuildingCoordinates)?.coordinates;
				if (!coords || coords.length !== 2) return false;
				const orgIds = (buildingIdToOrgsDict[building.id] ?? []).map((org) => org.id);
				if (likedOrganisationIds.length > 0) {
					if (orgIds.length === 0) return true;
					if (!orgIds.some((id) => likedOrganisationIds.includes(id))) return false;
				}
				if (dislikedOrganisationIds.length > 0 && orgIds.length > 0) {
					const nonDislikedOrgIds = orgIds.filter((id) => !dislikedOrganisationIds.includes(id));
					if (nonDislikedOrgIds.length === 0) return false;
				}
				return true;
			})
			.map((building) => {
				const coords = (building.coordinates as BuildingCoordinates)!.coordinates!;
				const [lng, lat] = coords;
				const firstOrg = getFirstOrganisationFromDict(building.id, buildingIdToOrgsDict);
				return {
					id: `building-${building.id}`,
					position: { lat: Number(lat), lng: Number(lng) },
					icon: createBuildingMarkerSvg(
						building.external_identifier,
						building.map_marker_color,
						building.map_marker_label,
						building.map_marker_label_color,
						firstOrg?.map_marker_color ?? null,
						firstOrg?.map_marker_label_color ?? null,
						primaryColor,
						primaryColorContrastColor,
						building.alias,
						showMarkerLabels,
					),
					size: [BUILDING_MARKER_SIZE, BUILDING_MARKER_SIZE] as [number, number],
					iconAnchor: [BUILDING_MARKER_SIZE / 2, BUILDING_MARKER_SIZE / 2] as [number, number],
				};
			});
	}, [buildings, buildingIdToOrgsDict, likedOrganisationIds, dislikedOrganisationIds, primaryColor, primaryColorContrastColor, showMarkerLabels]);

	// Effective markers respecting display settings
	const effectiveBuildingMarkers = useMemo(
		() => showBuildingMarkers ? buildingMarkers : [],
		[buildingMarkers, showBuildingMarkers],
	);

	const effectiveClusterDistance = showClusters ? clusterDistance : 0;

	const clusteredBuildingMarkers = useMemo(
		() => clusterMarkers(effectiveBuildingMarkers, mapZoom, effectiveClusterDistance),
		[effectiveBuildingMarkers, mapZoom, effectiveClusterDistance],
	);

	// User location marker (non-clustered)
	const userLocationMarker = useMemo((): MapMarker | null => {
		if (!userLocation) return null;
		const size = 28;
		return {
			id: 'user-location',
			position: userLocation,
			icon: createUserLocationMarkerSvg(),
			size: [size, size] as [number, number],
			iconAnchor: [size / 2, size / 2] as [number, number],
		};
	}, [userLocation]);

	const allMarkers = useMemo(
		() => userLocationMarker ? [...clusteredBuildingMarkers, userLocationMarker] : clusteredBuildingMarkers,
		[clusteredBuildingMarkers, userLocationMarker],
	);

	const searchResults = useMemo((): DatabaseTypes.Buildings[] => {
		const q = searchQuery.trim().toLowerCase();
		if (!q) return [];
		return buildings.filter((b) => (b.alias ?? '').toLowerCase().includes(q)).slice(0, MAX_SEARCH_RESULTS);
	}, [buildings, searchQuery]);

	const handleSearchResultSelect = useCallback((building: DatabaseTypes.Buildings) => {
		const coords = (building?.coordinates as BuildingCoordinates)?.coordinates;
		if (coords && coords.length === 2) {
			setMapCenterOverride({ lat: Number(coords[1]), lng: Number(coords[0]) });
			pendingNavigateRef.current = true;
		}
		setSearchQuery('');
		Keyboard.dismiss();
	}, []);

	const selectedStyleUrl = MAP_STYLE_DEFINITIONS[selectedStyleKey]?.styleUrl ?? MAP_STYLE_DEFINITIONS[MapStyleKey.DEFAULT].styleUrl;

	const sendMapData = useCallback(() => {
		if (gameModeRef.current) return; // game loop handles map updates in game mode
		const shouldNavigate = mapCenterOverride !== null || pendingNavigateRef.current;
		const effectiveCenter = mapCenterOverride ?? centerPosition;

		const message: Record<string, unknown> = {
			mapMarkers: allMarkers,
			mapStyle: selectedStyleUrl,
			useFlyAnimation,
		};

		if (shouldNavigate) {
			message.mapCenterPosition = effectiveCenter;
			message.zoom = mapZoom;
			message.pitch = INITIAL_PITCH;
			pendingNavigateRef.current = false;
			setMapCenterOverride(null);
		}

		myMapRef.current?.sendToMap(message);
	}, [mapCenterOverride, centerPosition, mapZoom, allMarkers, selectedStyleUrl, useFlyAnimation]);

	useEffect(() => {
		sendMapData();
	}, [sendMapData]);

	// ── Game mode helpers ─────────────────────────────────────────────────────────

	const sendToMap = useCallback((data: object) => {
		myMapRef.current?.sendToMap(data);
	}, []);

	const sendToMapRef = useRef(sendToMap);
	sendToMapRef.current = sendToMap;

	const buildingMarkersRef = useRef(buildingMarkers);
	buildingMarkersRef.current = buildingMarkers;

	const sendGameInitData = useCallback(() => {
		const pos = vehiclePosRef.current;
		sendToMap({
			mapCenterPosition: pos,
			zoom: DEFAULT_ZOOM,
			pitch: GAME_MODE_PITCH,
			animate: false,
			useFlyAnimation: false,
			mapMarkers: buildingMarkersRef.current,
			vehicleMarker: null,
			mapStyle: selectedStyleUrl,
			disableInteraction: true,
		});
	}, [sendToMap, selectedStyleUrl]);

	const sendGameInitDataRef = useRef(sendGameInitData);
	sendGameInitDataRef.current = sendGameInitData;

	// Re-send building markers when they change while in game mode
	useEffect(() => {
		if (!gameMode || !gameMapReady) return;
		sendToMap({ mapMarkers: buildingMarkers });
	}, [gameMode, gameMapReady, buildingMarkers, sendToMap]);

	// Game loop
	useEffect(() => {
		const id = setInterval(() => {
			if (!gameModeRef.current || !gameMapReadyRef.current) return;
			if (turnLeftRef.current) {
				setVehicleHeading((h) => normalizeHeading(h - AIRPLANE_TURN_DEG));
			} else if (turnRightRef.current) {
				setVehicleHeading((h) => normalizeHeading(h + AIRPLANE_TURN_DEG));
			}
			const heading = vehicleHeadingRef.current;
			const speed = airplaneSpeedRef.current * KMH_TO_DEG_PER_TICK;
			const newPos = moveByHeading(vehiclePosRef.current, heading, speed);
			vehiclePosRef.current = newPos;
			sendToMapRef.current({
				mapCenterPosition: newPos,
				bearing: headingUpModeRef.current ? heading : 0,
				easeAnimation: true,
				easeDuration: GAME_TICK_MS,
			});
		}, GAME_TICK_MS);
		return () => clearInterval(id);
	}, []); // No dependencies – all values read via refs // eslint-disable-line react-hooks/exhaustive-deps

	// Game mode controls
	const handleGameTurnLeftStart = useCallback(() => { turnLeftRef.current = true; }, []);
	const handleGameTurnLeftEnd = useCallback(() => { turnLeftRef.current = false; }, []);
	const handleGameTurnRightStart = useCallback(() => { turnRightRef.current = true; }, []);
	const handleGameTurnRightEnd = useCallback(() => { turnRightRef.current = false; }, []);
	const handleGameSpeedUp = useCallback(() => { setAirplaneSpeedKmh((s) => s + AIRPLANE_SPEED_STEP_SMALL); }, []);
	const handleGameSpeedUpLarge = useCallback(() => { setAirplaneSpeedKmh((s) => s + AIRPLANE_SPEED_STEP_LARGE); }, []);
	const handleGameSpeedDown = useCallback(() => { setAirplaneSpeedKmh((s) => Math.max(s - AIRPLANE_SPEED_STEP_SMALL, AIRPLANE_MIN_SPEED_KMH)); }, []);
	const handleGameSpeedDownLarge = useCallback(() => { setAirplaneSpeedKmh((s) => Math.max(s - AIRPLANE_SPEED_STEP_LARGE, AIRPLANE_MIN_SPEED_KMH)); }, []);
	const handleGameZoomIn = useCallback(() => {
		const newZoom = Math.min((mapZoomRef.current ?? DEFAULT_ZOOM) + 0.5, 22);
		setMapZoom(newZoom);
		sendToMapRef.current({ zoomTo: newZoom, easeDuration: 300 });
	}, []);
	const handleGameZoomOut = useCallback(() => {
		const newZoom = Math.max((mapZoomRef.current ?? DEFAULT_ZOOM) - 0.5, 1);
		setMapZoom(newZoom);
		sendToMapRef.current({ zoomTo: newZoom, easeDuration: 300 });
	}, []);
	const handleGameAirplaneSizeUp = useCallback(() => { setAirplaneSize((s) => s + AIRPLANE_SIZE_STEP); }, []);
	const handleGameAirplaneSizeDown = useCallback(() => { setAirplaneSize((s) => Math.max(s - AIRPLANE_SIZE_STEP, AIRPLANE_MIN_SIZE)); }, []);
	const handleGameCompassToggle = useCallback(() => {
		setHeadingUpMode((prev) => {
			const next = !prev;
			if (!next) sendToMapRef.current({ resetBearing: true });
			return next;
		});
	}, []);
	const handleGameReset = useCallback(() => {
		vehiclePosRef.current = centerPositionRef.current;
		setVehicleHeading(0);
		setAirplaneSpeedKmh(AIRPLANE_DEFAULT_SPEED_KMH);
		setAirplaneSize(AIRPLANE_DEFAULT_SIZE);
	}, []);

	// ── Auto-Rotate Mode (Auto-Rotate Modus) logic ───────────────────────────────

	// Reset speed when auto-rotate mode is activated or deactivated
	useEffect(() => {
		setAutoRotateSpeed(0);
		// Stop map-side auto-rotate when mode is toggled off
		sendToMapRef.current({ autoRotate: false });
	}, [autoRotateMode]);

	// Send auto-rotate speed to the map whenever it changes
	useEffect(() => {
		if (!autoRotateMode || gameMode) {
			sendToMapRef.current({ autoRotate: false });
			return;
		}
		if (autoRotateSpeed === 0) {
			sendToMapRef.current({ autoRotate: false });
		} else {
			sendToMapRef.current({ autoRotate: true, autoRotateSpeed });
		}
	}, [autoRotateSpeed, autoRotateMode, gameMode]);

	// Auto-rotate speed controls
	const handleAutoRotateSpeedLeft = useCallback(() => {
		setAutoRotateSpeed((s) => s - AUTO_ROTATE_SPEED_STEP);
	}, []);
	const handleAutoRotateSpeedRight = useCallback(() => {
		setAutoRotateSpeed((s) => s + AUTO_ROTATE_SPEED_STEP);
	}, []);

	const handleManualRotateLeft1 = useCallback(() => {
		sendToMapRef.current({ bearingDelta: -1, easeAnimation: true, easeDuration: 200 });
	}, []);

	const handleManualRotateRight1 = useCallback(() => {
		sendToMapRef.current({ bearingDelta: 1, easeAnimation: true, easeDuration: 200 });
	}, []);

	const handleToggleFullscreen = useCallback(() => {
		setIsFullscreen((prev) => !prev);
	}, []);

	// Send people mode to the map when it changes and the map is ready
	useEffect(() => {
		if (mapMountedRef.current) {
			sendToMapRef.current({ peopleMode: peopleMode });
		}
	}, [peopleMode]);

	// Send intelligent movement mode to the map when it changes and the map is ready
	useEffect(() => {
		if (mapMountedRef.current) {
			sendToMapRef.current({ intelligentMovement: intelligentMovement });
		}
	}, [intelligentMovement]);

	// Send people count to the map when it changes and the map is ready
	useEffect(() => {
		if (mapMountedRef.current) {
			sendToMapRef.current({ peopleCount: peopleCount });
		}
	}, [peopleCount]);

	// Send car mode to the map when it changes and the map is ready
	useEffect(() => {
		if (mapMountedRef.current) {
			sendToMapRef.current({ carMode: carMode });
		}
	}, [carMode]);

	// Send layer visibility to the map when settings change and the map is ready
	useEffect(() => {
		if (!mapMountedRef.current) return;
		const GROUP_MAP: Record<string, string> = { poi: 'poi', transit: 'transit', roadNames: 'roadLabels', leisure: 'leisure', barriers: 'barriers', parking: 'parking' };
		Object.entries(GROUP_MAP).forEach(([key, group]) => {
			sendToMapRef.current({ setLayerGroupVisibility: { group, visible: showSettings[key] ?? true } });
		});
	}, [showSettings]);

	// Send POI icon overrides when POI sub-settings, the main POI toggle, barriers toggle, or parking toggle changes
	useEffect(() => {
		if (!mapMountedRef.current) return;
		const poiEnabled = showSettings.poi ?? true;
		const barriersEnabled = showSettings.barriers ?? false;
		const parkingEnabled = showSettings.parking ?? true;
		const overrides: Record<string, string | null> = {};
		if (poiEnabled) {
			POI_SUBTYPES.forEach(({ key }) => {
				if (!(poiSubSettings[key] ?? true)) {
					overrides[key] = null;
				}
			});
		}
		if (!barriersEnabled) {
			BARRIER_ICON_KEYS.forEach((key) => {
				overrides[key] = null;
			});
		}
		if (!parkingEnabled) {
			PARKING_ICON_KEYS.forEach((key) => {
				overrides[key] = null;
			});
		}
		sendToMapRef.current({ poiIconOverrides: overrides });
	}, [showSettings, poiSubSettings]);

	const speedLabel = useMemo(() => `${Math.round(airplaneSpeedKmh)} km/h`, [airplaneSpeedKmh]);

	// ✈️ emoji faces northeast (~45°); subtract 45° so 0° heading = pointing north.
	// Transform is applied to a wrapping View (not the Text) so rotation works on native.
	const airplaneEmojiRotation = useMemo(
		() => `${(headingUpMode ? 0 : vehicleHeading) - 45}deg`,
		[headingUpMode, vehicleHeading],
	);

	// Squish the airplane vertically based on the actual camera pitch (cos(pitch) ≈ perspective compression).
	// currentPitch is null until the first pitchend event fires; use scaleY=1 (no squish) until then.
	// At pitch = 0° (top-down) scaleY = 1 (no squish); at pitch = 70° scaleY ≈ 0.34 (strong squish).
	const airplaneScaleY = useMemo(
		() => (currentPitch !== null ? Math.cos(degToRad(currentPitch)) : 1),
		[currentPitch],
	);

	const handleMarkerClick = useCallback(
		(id: string) => {
			if (id.startsWith('cluster:')) {
				const cluster = clusteredBuildingMarkers.find((m) => m.id === id);
				if (cluster) {
					setMapCenterOverride(cluster.position);
					setMapZoom((prev) => Math.min(prev + 2, MAX_ZOOM));
					pendingNavigateRef.current = true;
				}
				addLog(`Cluster clicked: ${id}`);
				return;
			}

			const buildingId = id.startsWith('building-') ? id.slice('building-'.length) : null;
			const building = buildingId ? buildingsDict[String(buildingId)] : null;
			const title = building?.alias ?? id;
			const coords = (building?.coordinates as BuildingCoordinates)?.coordinates;
			const lat = coords ? Number(coords[1]).toFixed(5) : null;
			const lng = coords ? Number(coords[0]).toFixed(5) : null;
			addLog(`Marker clicked: ${title}${lat !== null ? ` (${lat}, ${lng})` : ''}`);

			if (coords && coords.length === 2) {
				setMapCenterOverride({ lat: Number(coords[1]), lng: Number(coords[0]) });
				setMapZoom(DEFAULT_ZOOM);
				pendingNavigateRef.current = true;
			}

			if (buildingId) {
				openBuildingDetailsModal(buildingId);
			}
		},
		[buildingsDict, clusteredBuildingMarkers, openBuildingDetailsModal, addLog],
	);

	const handleMessage = useCallback(
		(data: object) => {
			const d = data as any;
			if (d.tag === 'MapComponentMounted') {
				mapMountedRef.current = true;
				if (gameModeRef.current) {
					setGameMapReady(true);
					sendGameInitData();
				} else {
					pendingNavigateRef.current = true;
					sendMapData();
				}
				sendToMapRef.current({ peopleCount: peopleCountRef.current });
				if (peopleModeRef.current) {
					sendToMapRef.current({ peopleMode: true });
				}
				if (intelligentMovementRef.current) {
					sendToMapRef.current({ intelligentMovement: true });
				}
				if (carModeRef.current) {
					sendToMapRef.current({ carMode: true });
				}
				// Send the emoji map so the HTML has no hardcoded emoji data
				sendToMapRef.current({ iconEmojiMap: ICON_EMOJI_MAP });
				const GROUP_MAP: Record<string, string> = { poi: 'poi', transit: 'transit', roadNames: 'roadLabels', leisure: 'leisure', barriers: 'barriers', parking: 'parking' };
				Object.entries(GROUP_MAP).forEach(([key, group]) => {
					if (!(showSettingsRef.current[key] ?? (key === 'barriers' ? false : true))) {
						sendToMapRef.current({ setLayerGroupVisibility: { group, visible: false } });
					}
				});
				// Send initial POI icon overrides for disabled sub-types, barrier group, and parking group
				const poiEnabled = showSettingsRef.current.poi ?? true;
				const barriersEnabled = showSettingsRef.current.barriers ?? false;
				const parkingEnabled = showSettingsRef.current.parking ?? true;
				const initialPoiOverrides: Record<string, string | null> = {};
				if (poiEnabled) {
					POI_SUBTYPES.forEach(({ key }) => {
						if (!(poiSubSettingsRef.current[key] ?? true)) {
							initialPoiOverrides[key] = null;
						}
					});
				}
				if (!barriersEnabled) {
					BARRIER_ICON_KEYS.forEach((key) => {
						initialPoiOverrides[key] = null;
					});
				}
				if (!parkingEnabled) {
					PARKING_ICON_KEYS.forEach((key) => {
						initialPoiOverrides[key] = null;
					});
				}
				sendToMapRef.current({ poiIconOverrides: initialPoiOverrides });
				addLog('MapComponentMounted');
				return;
			}
			if (d.tag === 'onZoomEnd') {
				setMapZoom(d.zoom);
				if (!gameModeRef.current) {
					addLog(`Zoom: ${d.zoom ?? 'unknown'}`);
				}
			}
			if (d.tag === 'onPitchEnd') {
				setCurrentPitch(d.pitch);
			}
			if (d.tag === 'onMapMarkerClicked' && !gameModeRef.current) {
				handleMarkerClick(d.mapMarkerId);
			}
			if (d.tag === 'MapTapped' && isFullscreenRef.current) {
				setIsFullscreen(false);
			}
			if (d.tag === 'AutoRotateStopped') {
				setAutoRotateSpeed(0);
			}
		},
		[sendMapData, sendGameInitData, handleMarkerClick, addLog],
	);

	const openControlsHintModal = useCallback(() => {
		show({
			title: 'Kartensteuerung',
			children: (
				<OsmControlsHintContent
					onDontShowAgain={() => {
						dispatch({ type: SET_OSM_VECTOR_MAP_SHOW_CONTROLS_HINT, payload: false });
						close();
					}}
					theme={theme}
				/>
			),
		});
	}, [show, close, dispatch, theme]);

	const setGameModeDispatch = useCallback(
		(value: boolean) => {
			dispatch({ type: SET_OSM_VECTOR_MAP_GAME_MODE, payload: value });
		},
		[dispatch],
	);

	const setAutoRotateModeDispatch = useCallback(
		(value: boolean) => {
			dispatch({ type: SET_OSM_VECTOR_MAP_AUTO_ROTATE_MODE, payload: value });
		},
		[dispatch],
	);

	const setPeopleModeDispatch = useCallback(
		(value: boolean) => {
			dispatch({ type: SET_OSM_VECTOR_MAP_PEOPLE_MODE, payload: value });
		},
		[dispatch],
	);

	const setIntelligentMovementDispatch = useCallback(
		(value: boolean) => {
			dispatch({ type: SET_OSM_VECTOR_MAP_INTELLIGENT_MOVEMENT, payload: value });
		},
		[dispatch],
	);

	const setPeopleCountDispatch = useCallback(
		(value: number) => {
			dispatch({ type: SET_OSM_VECTOR_MAP_PEOPLE_COUNT, payload: value });
		},
		[dispatch],
	);

	const setCarModeDispatch = useCallback(
		(value: boolean) => {
			dispatch({ type: SET_OSM_VECTOR_MAP_CAR_MODE, payload: value });
		},
		[dispatch],
	);

	const setConsentDispatch = useCallback(
		(value: boolean) => {
			dispatch({ type: SET_OSM_VECTOR_MAP_CONSENT, payload: value });
		},
		[dispatch],
	);

	const openSettingsModal = useCallback(() => {
		show({
			title: 'Karten Einstellungen',
			children: (
				<OsmSettingsContent
					initialSelectedStyleKey={selectedStyleKey}
					initialUseFlyAnimation={useFlyAnimation}
					initialClusterDistance={clusterDistance}
					initialGameMode={gameMode}
					initialAutoRotateMode={autoRotateMode}
					initialPeopleMode={peopleMode}
					initialIntelligentMovement={intelligentMovement}
					initialPeopleCount={peopleCount}
					initialCarMode={carMode}
					isFullscreen={isFullscreen}
					onSelectedStyleChange={setSelectedStyleKey}
					onFlyAnimationChange={setUseFlyAnimationDispatch}
					onClusterDistanceChange={setClusterDistanceDispatch}
					onGameModeChange={setGameModeDispatch}
					onAutoRotateModeChange={setAutoRotateModeDispatch}
					onPeopleModeChange={setPeopleModeDispatch}
					onIntelligentMovementChange={setIntelligentMovementDispatch}
					onPeopleCountChange={setPeopleCountDispatch}
					onCarModeChange={setCarModeDispatch}
					onToggleFullscreen={handleToggleFullscreen}
					onShowControlsHint={openControlsHintModal}
					onRevokeConsent={() => {
						setConsentDispatch(false);
						close();
					}}
					theme={theme}
				/>
			),
		});
	}, [show, close, selectedStyleKey, useFlyAnimation, clusterDistance, gameMode, autoRotateMode, peopleMode, intelligentMovement, peopleCount, carMode, isFullscreen, theme, setSelectedStyleKey, setUseFlyAnimationDispatch, setClusterDistanceDispatch, setGameModeDispatch, setAutoRotateModeDispatch, setPeopleModeDispatch, setIntelligentMovementDispatch, setPeopleCountDispatch, setCarModeDispatch, setConsentDispatch, handleToggleFullscreen, openControlsHintModal]);

	// Compass: reset map bearing to north
	const handleCompassPress = useCallback(() => {
		myMapRef.current?.sendToMap({ resetBearing: true });
	}, []);

	// Location: request permission and show user position marker
	const handleLocationPress = useCallback(async () => {
		try {
			const { status } = await Location.requestForegroundPermissionsAsync();
			if (status !== 'granted') {
				Alert.alert('Standort', 'Standortberechtigung wurde verweigert.');
				return;
			}
			const location = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
			const { latitude, longitude } = location.coords;
			setUserLocation({ lat: latitude, lng: longitude });
			setMapCenterOverride({ lat: latitude, lng: longitude });
			pendingNavigateRef.current = true;
			addLog(`Standort: ${latitude.toFixed(5)}, ${longitude.toFixed(5)}`);
		} catch (error) {
			console.error('Location error:', error);
			Alert.alert('Standort', 'Standort konnte nicht ermittelt werden.');
		}
	}, [addLog]);

	const openFilterModal = useCallback(() => {
		show({
			title: translate(TranslationKeys.organisations),
			children: (
				<OsmFilterContent
					organisations={organisations as DatabaseTypes.Organizations[]}
					initialLikes={organisationLikes}
					onLikeChange={stableOnOrganisationLikeChange}
					onResetAll={stableOnResetAllFilters}
				/>
			),
		});
	}, [show, translate, organisations, organisationLikes, stableOnOrganisationLikeChange, stableOnResetAllFilters]);

	const isFilterActive = useMemo(() => Object.keys(organisationLikes).length > 0, [organisationLikes]);

	return (
		<SafeAreaView style={[styles.safeArea, { backgroundColor: isFullscreen ? 'transparent' : theme.header.background }]}>
			{!isFullscreen && (
				<MapHeader
					drawerPosition={drawerPosition}
					query={gameMode ? '' : searchQuery}
					onQueryChange={gameMode ? noop : setSearchQuery}
					onSettingsPress={openSettingsModal}
					onFilterPress={gameMode ? undefined : openFilterModal}
					isFilterActive={!gameMode && isFilterActive}
				/>
			)}
			<View style={styles.contentArea}>
				<View style={styles.container}>
					{osmConsent ? (
						<MyMap
							ref={myMapRef}
							initialCenter={centerPosition}
							initialPitch={gameMode ? GAME_MODE_PITCH : INITIAL_PITCH}
							loadingText={translate(TranslationKeys.loading_vector_map)}
							onMessage={handleMessage}
						/>
					) : (
						<ScrollView
							contentContainerStyle={{ flexGrow: 1, justifyContent: 'center' }}
							style={{ flex: 1, backgroundColor: theme.screen.background }}
						>
							<OsmConsentContent
								onConsent={() => setConsentDispatch(true)}
								theme={theme}
							/>
						</ScrollView>
					)}

					{osmConsent && !isFullscreen && (gameMode ? (
						<>
							{/* Vehicle overlay – airplane centered on screen */}
							<View style={styles.vehicleOverlay} pointerEvents="none">
								<View style={{ transform: [{ scaleY: airplaneScaleY }, { rotate: airplaneEmojiRotation }] }}>
									<Text style={{ fontSize: airplaneSize }} accessibilityLabel="Flugzeug">✈️</Text>
								</View>
							</View>

							{/* Top bar: reset + speed/heading info */}
							<View style={styles.gameTopBar} pointerEvents="box-none">
								<TouchableOpacity
									style={[styles.gameTopBarButton, { backgroundColor: theme.screen.background }]}
									onPress={handleGameReset}
								>
									<MaterialIcons name="my-location" size={22} color={theme.screen.icon} />
								</TouchableOpacity>
								<View style={[styles.gameTopBarInfo, { backgroundColor: theme.screen.background + 'dd' }]}>
									<Text style={[styles.gameTopBarTitle, { color: theme.screen.text }]}>✈️ Flugzeug</Text>
									<Text style={[styles.gameTopBarSub, { color: theme.screen.text + 'aa' }]}>
										{`${speedLabel} · Richtung ${Math.round(vehicleHeading)}°`}
									</Text>
								</View>
							</View>

							{/* Zoom + airplane size buttons (left side) */}
							<View style={styles.gameZoomButtons} pointerEvents="box-none">
								<ControlButton onPress={handleGameZoomIn} icon={<MaterialIcons name="add" size={22} color="white" />} color="rgba(0,0,0,0.65)" size="md" />
								<ControlButton onPress={handleGameZoomOut} icon={<MaterialIcons name="remove" size={22} color="white" />} color="rgba(0,0,0,0.65)" size="md" />
								<View style={styles.gameZoomDivider} />
								<ControlButton onPress={handleGameAirplaneSizeUp} icon={<MaterialIcons name="zoom-in" size={22} color="white" />} color="rgba(26,115,232,0.75)" size="md" />
								<ControlButton onPress={handleGameAirplaneSizeDown} icon={<MaterialIcons name="zoom-out" size={22} color="white" />} color="rgba(26,115,232,0.75)" size="md" />
							</View>

							{/* Compass button (top-right) */}
							<View style={styles.gameCompassButton} pointerEvents="box-none">
								<TouchableOpacity
									style={[
										styles.gameCompassTouchable,
										{ backgroundColor: headingUpMode ? 'rgba(26,115,232,0.9)' : (theme.screen.background + 'ee') },
									]}
									onPress={handleGameCompassToggle}
									activeOpacity={0.75}
								>
									<MaterialIcons name="explore" size={26} color={headingUpMode ? 'white' : theme.screen.icon} />
								</TouchableOpacity>
							</View>

							{/* Airplane controls overlay (bottom-right) */}
							<View style={styles.gameControlsOverlay} pointerEvents="box-none">
								<AirplaneControls
									onTurnLeftStart={handleGameTurnLeftStart}
									onTurnLeftEnd={handleGameTurnLeftEnd}
									onTurnRightStart={handleGameTurnRightStart}
									onTurnRightEnd={handleGameTurnRightEnd}
									onSpeedUp={handleGameSpeedUp}
									onSpeedUpLarge={handleGameSpeedUpLarge}
									onSpeedDown={handleGameSpeedDown}
									onSpeedDownLarge={handleGameSpeedDownLarge}
								/>
							</View>
						</>
					) : (
						<>
							{/* Normal map overlay buttons: compass, location, and controls hint */}
							<View style={styles.mapOverlayButtons} pointerEvents="box-none">
								<TouchableOpacity
									style={[styles.mapOverlayButton, { backgroundColor: theme.screen.background }]}
									onPress={handleCompassPress}
								>
									<MaterialIcons name="explore" size={26} color={theme.screen.icon} />
								</TouchableOpacity>
								<TouchableOpacity
									style={[styles.mapOverlayButton, { backgroundColor: theme.screen.background, marginTop: 8 }]}
									onPress={handleLocationPress}
								>
									<MaterialIcons name="my-location" size={26} color={userLocation ? '#1a73e8' : theme.screen.icon} />
								</TouchableOpacity>
								{autoRotateMode && (
									<>
										<TouchableOpacity
											style={[styles.mapOverlayButton, { backgroundColor: autoRotateSpeed < 0 ? 'rgba(26,115,232,0.9)' : theme.screen.background, marginTop: 8 }]}
											onPress={handleAutoRotateSpeedLeft}
										>
											<MaterialIcons name="rotate-left" size={26} color={autoRotateSpeed < 0 ? 'white' : theme.screen.icon} />
										</TouchableOpacity>
										<View style={{ alignItems: 'center', paddingVertical: 2 }}>
											<Text style={{ color: theme.screen.text, fontSize: 10 }}>{`${autoRotateSpeed}°/s`}</Text>
										</View>
										<TouchableOpacity
											style={[styles.mapOverlayButton, { backgroundColor: autoRotateSpeed > 0 ? 'rgba(26,115,232,0.9)' : theme.screen.background }]}
											onPress={handleAutoRotateSpeedRight}
										>
											<MaterialIcons name="rotate-right" size={26} color={autoRotateSpeed > 0 ? 'white' : theme.screen.icon} />
										</TouchableOpacity>

									</>
								)}
								{showControlsHint && (
									<TouchableOpacity
										style={[styles.mapOverlayButton, { backgroundColor: theme.screen.background, marginTop: 8 }]}
										onPress={openControlsHintModal}
									>
										<MaterialIcons name="touch-app" size={26} color={theme.screen.icon} />
									</TouchableOpacity>
								)}
							</View>
							{/* Jogging route recorder */}
							<JoggingOverlay mapRef={myMapRef} />
							<DebugView title="Map Log">
								<ScrollView
									ref={logScrollRef}
									style={[styles.logContainer, { backgroundColor: theme.screen.background, borderTopColor: theme.screen.text + '33' }]}
									onContentSizeChange={() => logScrollRef.current?.scrollToEnd({ animated: true })}
								>
									{logEntries.map((entry, i) => (
										<Text key={i} style={[styles.logEntry, { color: theme.screen.text }]} selectable>
											{entry}
										</Text>
									))}
									{logEntries.length === 0 && (
										<Text style={[styles.logPlaceholder, { color: theme.screen.text + '88' }]}>Map log…</Text>
									)}
								</ScrollView>
							</DebugView>
						</>
					))}
				</View>
				{!gameMode && !isFullscreen && searchResults.length > 0 && (
					<View style={[styles.searchResultsContainer, { backgroundColor: theme.screen.background }]}>
						{searchResults.map((building, index) => (
							<SettingsList
								key={building.id ?? index}
								title={building.alias ?? ''}
								onPress={() => handleSearchResultSelect(building)}
								showSeparator={index < searchResults.length - 1}
								groupPosition={
									searchResults.length === 1
										? 'single'
										: index === 0
										? 'top'
										: index === searchResults.length - 1
										? 'bottom'
										: 'middle'
								}
								noIconIndent
							/>
						))}
					</View>
				)}
			</View>
		</SafeAreaView>
	);
};

const styles = StyleSheet.create({
	safeArea: { flex: 1 },
	contentArea: { flex: 1, position: 'relative' },
	container: { flex: 1 },
	mapOverlayButtons: {
		position: 'absolute',
		top: 16,
		right: 12,
		zIndex: 20,
		elevation: 20,
		alignItems: 'center',
	},
	mapOverlayButton: {
		width: 44,
		height: 44,
		borderRadius: 8,
		alignItems: 'center',
		justifyContent: 'center',
		shadowColor: '#000',
		shadowOffset: { width: 0, height: 1 },
		shadowOpacity: 0.2,
		shadowRadius: 3,
		elevation: 3,
	},
	searchResultsContainer: {
		position: 'absolute',
		top: 0,
		left: 0,
		right: 0,
		zIndex: 10,
		elevation: 10,
	},
	logContainer: {
		maxHeight: 120,
		borderTopWidth: 1,
	},
	logEntry: {
		fontSize: 11,
		paddingHorizontal: 8,
		paddingVertical: 1,
	},
	logPlaceholder: {
		fontSize: 11,
		paddingHorizontal: 8,
		paddingVertical: 4,
	},
	// ── Game mode styles ─────────────────────────────────────────────────────────
	vehicleOverlay: {
		position: 'absolute',
		top: 0,
		left: 0,
		right: 0,
		bottom: 0,
		alignItems: 'center',
		justifyContent: 'center',
		zIndex: 20,
		elevation: 20,
	},
	gameTopBar: {
		position: 'absolute',
		top: 0,
		left: 0,
		right: 0,
		flexDirection: 'row',
		alignItems: 'center',
		padding: 12,
		gap: 10,
		zIndex: 30,
		elevation: 30,
	},
	gameTopBarButton: {
		width: 40,
		height: 40,
		borderRadius: 20,
		alignItems: 'center',
		justifyContent: 'center',
		shadowColor: '#000',
		shadowOffset: { width: 0, height: 2 },
		shadowOpacity: 0.2,
		shadowRadius: 3,
		elevation: 3,
	},
	gameTopBarInfo: {
		flex: 1,
		borderRadius: 12,
		paddingHorizontal: 14,
		paddingVertical: 6,
	},
	gameTopBarTitle: {
		fontSize: 15,
		fontWeight: 'bold',
	},
	gameTopBarSub: {
		fontSize: 12,
	},
	gameZoomButtons: {
		position: 'absolute',
		bottom: 32,
		left: 16,
		zIndex: 30,
		elevation: 30,
		gap: 8,
	},
	gameZoomDivider: {
		height: 1,
		backgroundColor: 'rgba(255,255,255,0.3)',
		marginVertical: 2,
	},
	gameCompassButton: {
		position: 'absolute',
		top: 16,
		right: 16,
		zIndex: 30,
		elevation: 30,
	},
	gameCompassTouchable: {
		width: 44,
		height: 44,
		borderRadius: 22,
		alignItems: 'center',
		justifyContent: 'center',
		shadowColor: '#000',
		shadowOffset: { width: 0, height: 2 },
		shadowOpacity: 0.3,
		shadowRadius: 4,
		elevation: 5,
	},
	gameControlsOverlay: {
		position: 'absolute',
		bottom: 32,
		right: 16,
		zIndex: 30,
		elevation: 30,
	},
	rotationButtonText: {
		fontSize: 11,
		fontWeight: 'bold',
	},
});

export default OsmVectorMapScreen;
