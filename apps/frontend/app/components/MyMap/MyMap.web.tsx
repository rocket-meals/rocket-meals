import React, { useCallback, useEffect, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useTheme } from '@/hooks/useTheme';
import DEFAULT_TILE_LAYER from './defaultTileLayer';
import type { LeafletWebViewEvent } from './model';
import { MyMapProps } from '@/components/MyMap/MyMapHelper';

const INITIAL_MAP_CENTER = 'mapCenterPosition:{lat:36.56,lng:-76.17}';
const INITIAL_MAP_ZOOM = ',maxZoom:20,zoom:6}';

const MyMap: React.FC<MyMapProps> = ({ mapCenterPosition, zoom, mapMarkers, mapLayers, onMarkerClick, onMapEvent, renderMarkerModal, onMarkerSelectionChange }) => {
	const { theme } = useTheme();
	const iframeRef = useRef<HTMLIFrameElement>(null);
	const [modifiedHtml, setModifiedHtml] = useState<string | null>(null);

	const mapCenterPositionRef = useRef(mapCenterPosition);
	mapCenterPositionRef.current = mapCenterPosition;
	const zoomRef = useRef(zoom);
	zoomRef.current = zoom;

	const [selectedMarker, setSelectedMarker] = useState<string | null>(null);

	useEffect(() => {
		let isMounted = true;
		const htmlUrl = require('@/assets/leaflet/index.html') as string;
		fetch(htmlUrl)
			.then((r) => r.text())
			.then((content) => {
				const pos = mapCenterPositionRef.current;
				const zoomLevel = zoomRef.current ?? 13;
				if (pos) {
					const centered = content.replace(INITIAL_MAP_CENTER, `mapCenterPosition:{lat:${pos.lat},lng:${pos.lng}}`);
					if (centered === content) {
						console.warn('MyMap: initial map center replacement had no effect – HTML structure may have changed');
					}
					content = centered.replace(INITIAL_MAP_ZOOM, `,maxZoom:20,zoom:${zoomLevel}}`);
				}
				if (isMounted) {
					setModifiedHtml(content);
				}
			})
			.catch((error) => {
				console.error('MyMap: failed to load leaflet HTML', error);
				if (isMounted) setModifiedHtml('');
			});
		return () => {
			isMounted = false;
		};
	}, []);

	useEffect(() => {
		onMarkerSelectionChange?.(selectedMarker);
	}, [selectedMarker, onMarkerSelectionChange]);

	const sendCoordinates = useCallback(() => {
		if (iframeRef.current && iframeRef.current.contentWindow) {
			const message = {
				mapCenterPosition,
				zoom: zoom ?? 13,
				mapLayers: mapLayers ?? [DEFAULT_TILE_LAYER],
				mapMarkers: mapMarkers ?? [],
			};
			// Use '*' as targetOrigin because the iframe uses srcDoc which has an opaque origin
			iframeRef.current.contentWindow.postMessage(message, '*');
		}
	}, [mapCenterPosition, zoom, mapLayers, mapMarkers]);

	useEffect(() => {
		sendCoordinates();
	}, [sendCoordinates]);

	useEffect(() => {
		const handler = (event: MessageEvent) => {
			try {
				const data: LeafletWebViewEvent = JSON.parse(event.data);
				if (data.tag === 'MapComponentMounted') {
					sendCoordinates();
					return;
				}
				if (data.tag === 'onMapMarkerClicked') {
					onMarkerClick?.(data.mapMarkerId);
					onMarkerSelectionChange?.(data.mapMarkerId);
					if (renderMarkerModal) {
						setSelectedMarker(data.mapMarkerId);
					}
				}
				onMapEvent?.(data);
			} catch {
				// ignore malformed messages
			}
		};
		window.addEventListener('message', handler);
		return () => window.removeEventListener('message', handler);
	}, [sendCoordinates, onMarkerClick, onMapEvent, renderMarkerModal, onMarkerSelectionChange]);

	if (!modifiedHtml) {
		return null;
	}

	return (
		<View style={[styles.container, { backgroundColor: theme.screen.background }]}>
			<iframe ref={iframeRef} srcDoc={modifiedHtml} style={{ width: '100%', height: '100%', border: 'none' }} onLoad={sendCoordinates} title="map" />
		</View>
	);
};

export default MyMap;

const styles = StyleSheet.create({
	container: {
		flex: 1,
		justifyContent: 'center',
		alignItems: 'center',
	},
	webview: {
		flex: 1,
		width: '100%',
	},
});
