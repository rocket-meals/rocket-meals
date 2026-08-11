import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
	Platform,
	ScrollView,
	StyleSheet,
	Text,
	TouchableOpacity,
	View,
} from 'react-native';
import { Asset } from 'expo-asset';
import * as FileSystem from 'expo-file-system/legacy';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { MyMap, MyMapHandle, SettingsList, SettingsListGroupTitle, SettingsListSelectOptionSingle } from 'repo-depkit-common-ui';
import { useFocusEffect } from 'expo-router';

import MODELS, { GlbModelEntry } from '../../../assets/3dModelAssets';

const MAX_DEBUG_LOG_ENTRIES = 20;

type DebugLogEntry = { id: number; message: string; isError: boolean };

// ─── Constants ────────────────────────────────────────────────────────────────

const ACCENT_COLOR = '#7c3aed';

/** Default position: Kieler Förde harbour area */
const MODEL_POSITION = { lat: 54.3233, lng: 10.1228, altitude: 10 };

const INITIAL_ZOOM = 17;
const INITIAL_PITCH = 45;
const SCALE_STEP = 5;
const SCALE_MIN = 1;
const SCALE_MAX = 200;
const DEFAULT_SCALE = 30;

// ─── Bounding-box inject script ───────────────────────────────────────────────
// Listens for a { kyleBbox: { show, lat, lng, radiusMeters } | null } message
// and draws (or hides) a coloured rectangle around the model position.

const BBOX_SCRIPT = `
(function () {
  var SRC = 'kyle-bbox-source';
  var LAYER = 'kyle-bbox-layer';
  var EMPTY = { type: 'FeatureCollection', features: [] };

  function ensureLayer() {
    if (!map || map.getSource(SRC)) return;
    map.addSource(SRC, { type: 'geojson', data: EMPTY });
    map.addLayer({
      id: LAYER,
      type: 'line',
      source: SRC,
      paint: {
        'line-color': '#a855f7',
        'line-width': 3,
        'line-opacity': 0.9,
        'line-dasharray': [4, 2],
      },
    });
  }

  window._mapExtensions.onMapReady = function () { ensureLayer(); };

  window._mapExtensions.onMessage = function (data) {
    if (data.kyleBbox === undefined) return;
    ensureLayer();
    var src = map && map.getSource(SRC);
    if (!src) return;
    if (!data.kyleBbox) {
      src.setData(EMPTY);
      return;
    }
    var lat = data.kyleBbox.lat;
    var lng = data.kyleBbox.lng;
    var r = data.kyleBbox.radiusMeters || 20;
    // Approximate metres → degrees (valid for small radii)
    var dLat = r / 111320;
    var dLng = r / (111320 * Math.cos(lat * Math.PI / 180));
    var geojson = {
      type: 'FeatureCollection',
      features: [{
        type: 'Feature',
        geometry: {
          type: 'LineString',
          coordinates: [
            [lng - dLng, lat - dLat],
            [lng + dLng, lat - dLat],
            [lng + dLng, lat + dLat],
            [lng - dLng, lat + dLat],
            [lng - dLng, lat - dLat],
          ],
        },
        properties: {},
      }],
    };
    src.setData(geojson);
  };
})();
`;

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function KyleTest3DScreen() {
	const mapRef = useRef<MyMapHandle>(null);
	const mapMountedRef = useRef(false);
	const glbUrlCacheRef = useRef<Map<string, string>>(new Map());

	const [mapKey, setMapKey] = useState(0);
	const [mapMounted, setMapMounted] = useState(false);
	const [selectedModel, setSelectedModel] = useState<GlbModelEntry>(MODELS[0]);
	const [scale, setScale] = useState(DEFAULT_SCALE);
	const [showBbox, setShowBbox] = useState(false);
	const [loadingModel, setLoadingModel] = useState(false);
	const [debugLog, setDebugLog] = useState<DebugLogEntry[]>([]);
	const nextDebugLogIdRef = useRef(0);

	// ── Focus / blur map lifecycle ────────────────────────────────────────────
	useFocusEffect(
		useCallback(() => {
			return () => {
				setMapMounted(false);
				mapMountedRef.current = false;
				setMapKey((k) => k + 1);
			};
		}, []),
	);

	// ── Load GLB asset as a base64 data URI (cached) ────────────────────────
	// Using a data URI (loader.parse) instead of a file:// URL (XHR) avoids
	// WKWebView restrictions that can silently block XHR requests to file:// URLs.
	const loadGlbUrl = useCallback(async (entry: GlbModelEntry): Promise<string> => {
		const cached = glbUrlCacheRef.current.get(entry.key);
		if (cached) return cached;

		const asset = Asset.fromModule(entry.source);
		await asset.downloadAsync();

		let url: string;
		if (Platform.OS === 'web') {
			url = asset.uri;
		} else {
			if (!asset.localUri) throw new Error('Asset localUri is undefined after downloadAsync');
			const base64 = await FileSystem.readAsStringAsync(asset.localUri, {
				encoding: FileSystem.EncodingType.Base64,
			});
			url = `data:model/gltf-binary;base64,${base64}`;
		}

		glbUrlCacheRef.current.set(entry.key, url);
		return url;
	}, []);

	// ── Send the selected model to the map ────────────────────────────────────
	const sendModelToMap = useCallback(
		async (entry: GlbModelEntry, currentScale: number) => {
			if (!mapMountedRef.current || !mapRef.current) return;
			setLoadingModel(true);
			try {
				const url = await loadGlbUrl(entry);
				if (!mapMountedRef.current || !mapRef.current) return;
				mapRef.current.sendToMap({
					glbModels: [
						{
							id: 'kyle-model',
							url,
							position: MODEL_POSITION,
							scale: currentScale,
							rotateX: Math.PI / 2,
							rotateY: 0,
							rotateZ: 0,
						},
					],
				});
			} catch (e) {
				const msg = `Failed to load model: ${entry.key}: ${e instanceof Error ? e.message : String(e)}`;
				console.warn('Failed to load 3D model:', e);
				setDebugLog((prev) => [{ id: nextDebugLogIdRef.current++, message: msg, isError: true }, ...prev].slice(0, MAX_DEBUG_LOG_ENTRIES));
			} finally {
				setLoadingModel(false);
			}
		},
		[loadGlbUrl],
	);

	// ── Send bounding box state to map ────────────────────────────────────────
	const syncBbox = useCallback(
		(show: boolean, currentScale: number) => {
			if (!mapRef.current) return;
			mapRef.current.sendToMap({
				kyleBbox: show
					? { lat: MODEL_POSITION.lat, lng: MODEL_POSITION.lng, radiusMeters: currentScale }
					: null,
			});
		},
		[],
	);

	// ── Handle map ready ──────────────────────────────────────────────────────
	const handleMapMessage = useCallback(
		(data: object) => {
			const msg = data as { tag?: string; message?: string; isError?: boolean };
			if (msg.tag === 'MapComponentMounted') {
				mapMountedRef.current = true;
				setMapMounted(true);
			}
			if (msg.tag === 'GlbDebugLog' && msg.message) {
				const entry: DebugLogEntry = { id: nextDebugLogIdRef.current++, message: msg.message, isError: msg.isError ?? false };
				setDebugLog((prev) => [entry, ...prev].slice(0, MAX_DEBUG_LOG_ENTRIES));
			}
		},
		[],
	);

	// Once map is mounted, load the initial model
	useEffect(() => {
		if (!mapMounted) return;
		sendModelToMap(selectedModel, scale);
		syncBbox(showBbox, scale);
	// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [mapMounted]);

	// ── Model selection ───────────────────────────────────────────────────────
	const handleSelectModel = useCallback(
		(entry: GlbModelEntry) => {
			setSelectedModel(entry);
			sendModelToMap(entry, scale);
		},
		[scale, sendModelToMap],
	);

	// ── Scale controls ────────────────────────────────────────────────────────
	const handleScaleChange = useCallback(
		(delta: number) => {
			setScale((prev) => {
				const next = Math.max(SCALE_MIN, Math.min(SCALE_MAX, prev + delta));
				if (next === prev) return prev;
				mapRef.current?.sendToMap({ updateGlbModelScale: { id: 'kyle-model', scale: next } });
				syncBbox(showBbox, next);
				return next;
			});
		},
		[showBbox, syncBbox],
	);

	// ── Zoom to model ─────────────────────────────────────────────────────────
	const handleZoomToModel = useCallback(() => {
		mapRef.current?.sendToMap({
			mapCenterPosition: { lat: MODEL_POSITION.lat, lng: MODEL_POSITION.lng },
			zoom: INITIAL_ZOOM,
			pitch: INITIAL_PITCH,
		});
	}, []);

	// ── Bounding box toggle ───────────────────────────────────────────────────
	const handleToggleBbox = useCallback(() => {
		setShowBbox((prev) => {
			const next = !prev;
			syncBbox(next, scale);
			return next;
		});
	}, [scale, syncBbox]);

	// ─── Render ────────────────────────────────────────────────────────────────

	return (
		<ScrollView
			style={styles.container}
			contentContainerStyle={styles.scrollContent}
			showsVerticalScrollIndicator={false}
		>
			{/* ── Map ─────────────────────────────────────────────────────────── */}
			<View style={styles.mapWrapper}>
				<MyMap
					key={mapKey}
					ref={mapRef}
					onMessage={handleMapMessage}
					injectScript={BBOX_SCRIPT}
					centerAtUserLocationIfNoInitialPosition={false}
					initialCenter={{ lat: MODEL_POSITION.lat, lng: MODEL_POSITION.lng }}
					initialZoom={INITIAL_ZOOM}
					initialPitch={INITIAL_PITCH}
				/>

				{/* Map overlay buttons */}
				<View style={styles.mapButtons}>
					{/* Zoom to model */}
					<TouchableOpacity
						style={[styles.mapButton, { backgroundColor: ACCENT_COLOR }]}
						onPress={handleZoomToModel}
						activeOpacity={0.8}
					>
						<Ionicons name="locate-outline" size={20} color="#ffffff" />
					</TouchableOpacity>

					{/* Bounding box toggle */}
					<TouchableOpacity
						style={[
							styles.mapButton,
							{ backgroundColor: showBbox ? ACCENT_COLOR : 'rgba(0,0,0,0.55)' },
						]}
						onPress={handleToggleBbox}
						activeOpacity={0.8}
					>
						<MaterialCommunityIcons name="cube-outline" size={20} color="#ffffff" />
					</TouchableOpacity>
				</View>

				{/* Info overlay: position */}
				<View style={styles.infoOverlay}>
					<Ionicons name="location-outline" size={13} color="#ffffff" style={styles.infoIcon} />
					<Text style={styles.infoText} numberOfLines={1}>
						{MODEL_POSITION.lat.toFixed(5)}°N, {MODEL_POSITION.lng.toFixed(5)}°E
						{' · alt '}
						{MODEL_POSITION.altitude} m
					</Text>
				</View>

				{/* Scale overlay */}
				<View style={styles.scaleOverlay}>
					<TouchableOpacity
						style={[styles.scaleButton, { backgroundColor: ACCENT_COLOR }]}
						onPress={() => handleScaleChange(SCALE_STEP)}
						activeOpacity={0.8}
					>
						<Ionicons name="add" size={20} color="#ffffff" />
					</TouchableOpacity>
					<View style={styles.scaleValueBadge}>
						<Text style={styles.scaleValueText}>{scale} m</Text>
					</View>
					<TouchableOpacity
						style={[styles.scaleButton, { backgroundColor: ACCENT_COLOR }]}
						onPress={() => handleScaleChange(-SCALE_STEP)}
						activeOpacity={0.8}
					>
						<Ionicons name="remove" size={20} color="#ffffff" />
					</TouchableOpacity>
				</View>

				{/* Loading indicator */}
				{loadingModel && (
					<View style={styles.loadingOverlay}>
						<Text style={styles.loadingText}>Lade Modell…</Text>
					</View>
				)}
			</View>

			{/* ── Model selection ───────────────────────────────────────────────── */}
			<SettingsListGroupTitle title="3D Modell auswählen" />
			{MODELS.map((entry, idx) => {
				const isFirst = idx === 0;
				const isLast = idx === MODELS.length - 1;
				let groupPosition: 'single' | 'top' | 'bottom' | 'middle';
				if (isFirst && isLast) groupPosition = 'single';
				else if (isFirst) groupPosition = 'top';
				else if (isLast) groupPosition = 'bottom';
				else groupPosition = 'middle';
				return (
					<SettingsListSelectOptionSingle
						key={entry.key}
						label={entry.label}
						iconBgColor={ACCENT_COLOR}
						leftIcon={<MaterialCommunityIcons name="cube-outline" size={22} color="#ffffff" />}
						isSelected={selectedModel.key === entry.key}
						selectionColor={ACCENT_COLOR}
						groupPosition={groupPosition}
						onPress={() => handleSelectModel(entry)}
					/>
				);
			})}

			{/* ── Position info ─────────────────────────────────────────────────── */}
			<SettingsListGroupTitle title="Position" />
			<SettingsList
				iconBgColor={ACCENT_COLOR}
				leftIcon={<Ionicons name="location-outline" size={22} color="#ffffff" />}
				label="Koordinaten"
				value={`${MODEL_POSITION.lat.toFixed(6)}°N, ${MODEL_POSITION.lng.toFixed(6)}°E`}
				groupPosition="top"
			/>
			<SettingsList
				iconBgColor={ACCENT_COLOR}
				leftIcon={<Ionicons name="trending-up-outline" size={22} color="#ffffff" />}
				label="Höhe"
				value={`${MODEL_POSITION.altitude} m über Meeresspiegel`}
				groupPosition="middle"
			/>
			<SettingsList
				iconBgColor={ACCENT_COLOR}
				leftIcon={<MaterialCommunityIcons name="resize" size={22} color="#ffffff" />}
				label="Modellgröße"
				value={`${scale} m`}
				groupPosition="bottom"
			/>

			{/* ── Debug Log ──────────────────────────────────────────────────────── */}
			<SettingsListGroupTitle title="Debug Log" />
			{debugLog.length === 0 ? (
				<SettingsList
					iconBgColor={ACCENT_COLOR}
					leftIcon={<Ionicons name="information-circle-outline" size={22} color="#ffffff" />}
					label="Keine Einträge"
					value="Noch keine Debug-Nachrichten"
					groupPosition="single"
				/>
			) : (
				debugLog.map((entry, idx) => {
					const isFirst = idx === 0;
					const isLast = idx === debugLog.length - 1;
					let groupPosition: 'single' | 'top' | 'bottom' | 'middle';
					if (isFirst && isLast) groupPosition = 'single';
					else if (isFirst) groupPosition = 'top';
					else if (isLast) groupPosition = 'bottom';
					else groupPosition = 'middle';
					return (
						<SettingsList
							key={entry.id}
							iconBgColor={entry.isError ? '#dc2626' : ACCENT_COLOR}
							leftIcon={
								<Ionicons
									name={entry.isError ? 'warning-outline' : 'checkmark-circle-outline'}
									size={22}
									color="#ffffff"
								/>
							}
							label={entry.message}
							groupPosition={groupPosition}
						/>
					);
				})
			)}
		</ScrollView>
	);
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
	container: {
		flex: 1,
	},
	scrollContent: {
		flexGrow: 1,
		paddingBottom: 32,
	},
	// Map
	mapWrapper: {
		width: '100%',
		aspectRatio: 1,
		position: 'relative',
	},
	mapButtons: {
		position: 'absolute',
		top: 14,
		right: 14,
		gap: 10,
	},
	mapButton: {
		width: 42,
		height: 42,
		borderRadius: 21,
		alignItems: 'center',
		justifyContent: 'center',
		shadowColor: '#000',
		shadowOffset: { width: 0, height: 1 },
		shadowOpacity: 0.25,
		shadowRadius: 3,
		elevation: 4,
	},
	infoOverlay: {
		position: 'absolute',
		bottom: 14,
		left: 14,
		right: 14,
		flexDirection: 'row',
		alignItems: 'center',
		backgroundColor: 'rgba(0,0,0,0.65)',
		borderRadius: 10,
		paddingHorizontal: 12,
		paddingVertical: 7,
		gap: 5,
	},
	infoIcon: {
		flexShrink: 0,
	},
	infoText: {
		color: '#ffffff',
		fontSize: 12,
		fontWeight: '500',
		flex: 1,
	},
	scaleOverlay: {
		position: 'absolute',
		top: 14,
		left: 14,
		alignItems: 'center',
		gap: 6,
	},
	scaleButton: {
		width: 38,
		height: 38,
		borderRadius: 19,
		alignItems: 'center',
		justifyContent: 'center',
		shadowColor: '#000',
		shadowOffset: { width: 0, height: 1 },
		shadowOpacity: 0.25,
		shadowRadius: 3,
		elevation: 4,
	},
	scaleValueBadge: {
		backgroundColor: 'rgba(0,0,0,0.6)',
		borderRadius: 6,
		paddingHorizontal: 7,
		paddingVertical: 3,
	},
	scaleValueText: {
		color: '#ffffff',
		fontSize: 11,
		fontWeight: '600',
		textAlign: 'center',
	},
	loadingOverlay: {
		...StyleSheet.absoluteFill,
		backgroundColor: 'rgba(0,0,0,0.35)',
		alignItems: 'center',
		justifyContent: 'center',
	},
	loadingText: {
		color: '#ffffff',
		fontSize: 15,
		fontWeight: '600',
		backgroundColor: 'rgba(0,0,0,0.5)',
		paddingHorizontal: 16,
		paddingVertical: 8,
		borderRadius: 8,
		overflow: 'hidden',
	},
});
