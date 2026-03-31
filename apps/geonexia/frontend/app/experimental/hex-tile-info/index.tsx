import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Alert, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import { MyMap, MyMapHandle, SettingsList, SettingsListGroupTitle, useTheme } from 'repo-depkit-common-ui';
import * as Clipboard from 'expo-clipboard';

import { isAvailable as isH3Available, cellToLatLng, cellToBoundary, getResolution, isValidCell } from '../../../helpers/H3Helper';
import { queryTileFeaturesForArea } from '../../../helpers/TileFeatureHelper';
import type { MapFeatureInfo } from '../../../helpers/RouteNameSuggestionHelper';

const HEX_ID = '8a1f10d5061ffff';
const EXPERIMENTAL_COLOR = '#7c3aed';

/** Minimal injectScript that draws a red bounds rectangle on the map. */
const BOUNDS_RECT_SCRIPT = `
(function () {
  var BOUNDS_SOURCE = 'bounds-rect-source';
  var BOUNDS_LAYER = 'bounds-rect-layer';
  var EMPTY_FC = { type: 'FeatureCollection', features: [] };

  function addBoundsLayer() {
    if (!map || map.getSource(BOUNDS_SOURCE)) return;
    map.addSource(BOUNDS_SOURCE, { type: 'geojson', data: EMPTY_FC });
    map.addLayer({
      id: BOUNDS_LAYER,
      type: 'line',
      source: BOUNDS_SOURCE,
      paint: {
        'line-color': '#ef4444',
        'line-width': 3,
        'line-opacity': 0.9,
      },
    });
  }

  window._mapExtensions.onMapReady = function () {
    addBoundsLayer();
  };

  window._mapExtensions.onMessage = function (data) {
    if (data.boundsRectangle) {
      addBoundsLayer();
      var b = data.boundsRectangle;
      var geojson = {
        type: 'FeatureCollection',
        features: [{
          type: 'Feature',
          geometry: {
            type: 'LineString',
            coordinates: [
              [b.minLng, b.minLat],
              [b.maxLng, b.minLat],
              [b.maxLng, b.maxLat],
              [b.minLng, b.maxLat],
              [b.minLng, b.minLat],
            ],
          },
          properties: {},
        }],
      };
      var src = map && map.getSource(BOUNDS_SOURCE);
      if (src) src.setData(geojson);
    }
  };
})();
`;

export default function HexTileInfoScreen() {
	const { theme } = useTheme();
	const [features, setFeatures] = useState<MapFeatureInfo[] | null>(null);
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [mapMounted, setMapMounted] = useState(false);
	const mapRef = useRef<MyMapHandle>(null);
	const runIdRef = useRef(0);

	const resolution = isH3Available() && isValidCell(HEX_ID) ? getResolution(HEX_ID) : null;
	const center = isH3Available() && isValidCell(HEX_ID) ? cellToLatLng(HEX_ID) : null;

	// Compute boundary bounding box
	const boundary = isH3Available() && isValidCell(HEX_ID) ? cellToBoundary(HEX_ID) : [];
	const bounds = useMemo(() => {
		if (boundary.length === 0) return null;
		const lats = boundary.map((v: [number, number]) => v[0]);
		const lngs = boundary.map((v: [number, number]) => v[1]);
		return {
			minLat: Math.min(...lats),
			maxLat: Math.max(...lats),
			minLng: Math.min(...lngs),
			maxLng: Math.max(...lngs),
		};
	}, [boundary]);

	const fetchFeatures = useCallback(async () => {
		if (!bounds) return;
		const runId = ++runIdRef.current;

		setLoading(true);
		setError(null);
		setFeatures(null);

		try {
			if (!isH3Available()) {
				throw new Error('H3 Bibliothek nicht verfügbar');
			}
			if (!isValidCell(HEX_ID)) {
				throw new Error(`Ungültige H3 Zelle: ${HEX_ID}`);
			}

			const areaResult = await queryTileFeaturesForArea(bounds);

			if (runId !== runIdRef.current) return;
			setFeatures(areaResult.features);
		} catch (err) {
			if (runId !== runIdRef.current) return;
			setError(err instanceof Error ? err.message : String(err));
		} finally {
			if (runId === runIdRef.current) {
				setLoading(false);
			}
		}
	}, [bounds]);

	useEffect(() => {
		fetchFeatures();
	}, [fetchFeatures]);

	// Send bounds rectangle to map when map is mounted or bounds change
	useEffect(() => {
		if (!mapMounted || !mapRef.current || !bounds) return;
		mapRef.current.sendToMap({ boundsRectangle: bounds });

		// Fit map to show the bounds with padding
		const latPad = Math.max((bounds.maxLat - bounds.minLat) * 0.5, 0.001);
		const lngPad = Math.max((bounds.maxLng - bounds.minLng) * 0.5, 0.001);
		mapRef.current.sendToMap({
			fitBounds: [
				[bounds.minLng - lngPad, bounds.minLat - latPad],
				[bounds.maxLng + lngPad, bounds.maxLat + latPad],
			],
			fitBoundsPadding: 20,
			animate: false,
		});
	}, [mapMounted, bounds]);

	const handleMapMessage = useCallback((data: object) => {
		const msg = data as { tag?: string };
		if (msg.tag === 'MapComponentMounted') {
			setMapMounted(true);
		}
	}, []);

	// Categorize features (same logic as MagnifyModalContent)
	const streets = features?.filter((f) =>
		f.highway || (f.layerId && (f.layerId.includes('road') || f.layerId.includes('highway') || f.layerId.includes('transportation')))
	) ?? [];
	const waterways = features?.filter((f) =>
		f.waterway || (f.layerId && f.layerId.includes('water'))
	) ?? [];
	const buildings = features?.filter((f) =>
		f.building || (f.layerId && f.layerId.includes('building'))
	) ?? [];
	const pois = features?.filter((f) =>
		f.amenity || f.natural || f.landuse ||
		(f.layerId && (f.layerId.includes('poi') || f.layerId.includes('park') || f.layerId.includes('landuse') || f.layerId.includes('landcover')))
	) ?? [];

	const handleCopyJson = useCallback(async () => {
		if (!features) return;
		const json = JSON.stringify(features, null, 2);
		await Clipboard.setStringAsync(json);
		Alert.alert('Kopiert', 'JSON in Zwischenablage kopiert.');
	}, [features]);

	const mapInitialCenter = center ? { lat: center[0], lng: center[1] } : undefined;

	const content = (
		<View style={[styles.container, { backgroundColor: theme.screen.background }]}>
			<ScrollView contentContainerStyle={styles.listContent}>
				{/* ── Map Preview ── */}
				<SettingsListGroupTitle title="Kartenansicht" />
				<View style={styles.mapContainer}>
					<MyMap
						ref={mapRef}
						initialCenter={mapInitialCenter}
						initialZoom={15}
						onMessage={handleMapMessage}
						injectScript={BOUNDS_RECT_SCRIPT}
						centerAtUserLocationIfNoInitialPosition={false}
					/>
				</View>

				{/* ── Hex Cell Info ── */}
				<SettingsListGroupTitle title="Hex Tile" />
				<SettingsList
					iconBgColor="#6b7280"
					leftIcon={<MaterialIcons name="tag" size={22} color="#ffffff" />}
					label="H3 Index"
					value={HEX_ID}
					groupPosition="top"
				/>
				{resolution !== null && (
					<SettingsList
						iconBgColor={EXPERIMENTAL_COLOR}
						leftIcon={<Ionicons name="grid-outline" size={22} color="#ffffff" />}
						label="Resolution"
						value={String(resolution)}
						groupPosition="middle"
					/>
				)}
				{center !== null && (
					<SettingsList
						iconBgColor={EXPERIMENTAL_COLOR}
						leftIcon={<Ionicons name="location-outline" size={22} color="#ffffff" />}
						label="Zentrum"
						value={`${center[0].toFixed(6)}°N, ${center[1].toFixed(6)}°E`}
						groupPosition="middle"
					/>
				)}
				{bounds !== null && (
					<SettingsList
						iconBgColor={EXPERIMENTAL_COLOR}
						leftIcon={<Ionicons name="resize-outline" size={22} color="#ffffff" />}
						label="Boundary (min/max)"
						value={`Lat: ${bounds.minLat.toFixed(6)} – ${bounds.maxLat.toFixed(6)}\nLng: ${bounds.minLng.toFixed(6)} – ${bounds.maxLng.toFixed(6)}`}
						groupPosition="bottom"
					/>
				)}

				{/* ── Reload ── */}
				<TouchableOpacity
					style={[styles.reloadButton, { backgroundColor: EXPERIMENTAL_COLOR }]}
					onPress={fetchFeatures}
					activeOpacity={0.8}
					disabled={loading}
				>
					<Ionicons name="reload-outline" size={18} color="#ffffff" />
					<Text style={styles.reloadButtonText}>Neu laden</Text>
				</TouchableOpacity>

				{loading && (
					<View style={styles.loadingContainer}>
						<ActivityIndicator size="large" color={EXPERIMENTAL_COLOR} />
						<Text style={[styles.loadingText, { color: theme.screen.text }]}>
							Lade Tile-Features…
						</Text>
					</View>
				)}

				{error && (
					<View style={styles.errorContainer}>
						<Ionicons name="alert-circle" size={24} color="#ef4444" />
						<Text style={styles.errorText}>{error}</Text>
					</View>
				)}

				{features && features.length === 0 && !loading && (
					<SettingsList
						iconBgColor="#6b7280"
						leftIcon={<MaterialIcons name="info-outline" size={22} color="#ffffff" />}
						label="Keine Karteninformationen"
						value="Keine Features in diesem Bereich gefunden."
						groupPosition="single"
					/>
				)}

				{streets.length > 0 && (
					<>
						<SettingsListGroupTitle title="Straßen" />
						{streets.map((f, idx) => (
							<SettingsList
								key={`street-${idx}`}
								iconBgColor="#f97316"
								leftIcon={<MaterialIcons name="directions" size={22} color="#ffffff" />}
								label={f.name ?? f.highway ?? f.class ?? `Straße ${idx + 1}`}
								value={JSON.stringify(f)}
								groupPosition={streets.length === 1 ? 'single' : idx === 0 ? 'top' : idx === streets.length - 1 ? 'bottom' : 'middle'}
							/>
						))}
					</>
				)}

				{waterways.length > 0 && (
					<>
						<SettingsListGroupTitle title="Gewässer" />
						{waterways.map((f, idx) => (
							<SettingsList
								key={`water-${idx}`}
								iconBgColor="#3b82f6"
								leftIcon={<MaterialIcons name="water" size={22} color="#ffffff" />}
								label={f.name ?? f.waterway ?? f.class ?? `Gewässer ${idx + 1}`}
								value={JSON.stringify(f)}
								groupPosition={waterways.length === 1 ? 'single' : idx === 0 ? 'top' : idx === waterways.length - 1 ? 'bottom' : 'middle'}
							/>
						))}
					</>
				)}

				{buildings.length > 0 && (
					<>
						<SettingsListGroupTitle title="Gebäude" />
						{buildings.map((f, idx) => (
							<SettingsList
								key={`building-${idx}`}
								iconBgColor="#8b5cf6"
								leftIcon={<MaterialIcons name="apartment" size={22} color="#ffffff" />}
								label={f.name ?? f.building ?? f.class ?? `Gebäude ${idx + 1}`}
								value={JSON.stringify(f)}
								groupPosition={buildings.length === 1 ? 'single' : idx === 0 ? 'top' : idx === buildings.length - 1 ? 'bottom' : 'middle'}
							/>
						))}
					</>
				)}

				{pois.length > 0 && (
					<>
						<SettingsListGroupTitle title="Points of Interest" />
						{pois.map((f, idx) => (
							<SettingsList
								key={`poi-${idx}`}
								iconBgColor="#10b981"
								leftIcon={<MaterialIcons name="place" size={22} color="#ffffff" />}
								label={f.name ?? f.amenity ?? f.natural ?? f.landuse ?? f.subclass ?? f.class ?? `POI ${idx + 1}`}
								value={JSON.stringify(f)}
								groupPosition={pois.length === 1 ? 'single' : idx === 0 ? 'top' : idx === pois.length - 1 ? 'bottom' : 'middle'}
							/>
						))}
					</>
				)}

				{features && features.length > 0 && (
					<>
						<SettingsListGroupTitle title="Alle Features (JSON)" />
						<TouchableOpacity
							style={[styles.copyButton, { backgroundColor: '#374151' }]}
							onPress={handleCopyJson}
							activeOpacity={0.8}
						>
							<MaterialIcons name="content-copy" size={18} color="#ffffff" />
							<Text style={styles.copyButtonText}>JSON kopieren</Text>
						</TouchableOpacity>
						<View style={[styles.jsonContainer, { backgroundColor: theme.screen.iconBg }]}>
							<Text style={[styles.jsonText, { color: theme.screen.text }]} selectable>
								{JSON.stringify(features, null, 2)}
							</Text>
						</View>
					</>
				)}
			</ScrollView>
		</View>
	);

	if (Platform.OS === 'web') return content;

	return (
		<KeyboardAvoidingView
			behavior={Platform.OS === 'ios' ? 'padding' : undefined}
			keyboardVerticalOffset={Platform.OS === 'ios' ? 20 : 0}
			style={styles.keyboardAvoidingView}
		>
			{content}
		</KeyboardAvoidingView>
	);
}

const styles = StyleSheet.create({
	keyboardAvoidingView: {
		flex: 1,
	},
	container: {
		flex: 1,
	},
	listContent: {
		paddingVertical: 16,
	},
	mapContainer: {
		height: 220,
		marginHorizontal: 16,
		marginBottom: 8,
		borderRadius: 12,
		overflow: 'hidden',
	},
	reloadButton: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'center',
		gap: 8,
		marginHorizontal: 16,
		marginVertical: 8,
		paddingVertical: 10,
		borderRadius: 10,
	},
	reloadButtonText: {
		color: '#ffffff',
		fontSize: 15,
		fontWeight: '600',
	},
	copyButton: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'center',
		gap: 8,
		marginHorizontal: 16,
		marginVertical: 8,
		paddingVertical: 10,
		borderRadius: 10,
	},
	copyButtonText: {
		color: '#ffffff',
		fontSize: 15,
		fontWeight: '600',
	},
	loadingContainer: {
		alignItems: 'center',
		paddingVertical: 32,
		gap: 12,
	},
	loadingText: {
		fontSize: 14,
	},
	errorContainer: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 8,
		paddingHorizontal: 16,
		paddingVertical: 12,
	},
	errorText: {
		color: '#ef4444',
		fontSize: 14,
		flex: 1,
	},
	jsonContainer: {
		marginHorizontal: 16,
		padding: 12,
		borderRadius: 8,
	},
	jsonText: {
		fontSize: 11,
		fontFamily: 'monospace',
	},
});
