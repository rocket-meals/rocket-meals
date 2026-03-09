import React, { useCallback, useEffect, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { WebView, WebViewMessageEvent } from 'react-native-webview';
import type { LeafletWebViewEvent } from './model';
import { MyMapProps } from '@/components/MyMap/MyMapHelper';
import DEFAULT_TILE_LAYER from './defaultTileLayer';
import { Asset } from 'expo-asset';
import * as FileSystem from 'expo-file-system/legacy';

const INITIAL_MAP_CENTER = 'mapCenterPosition:{lat:36.56,lng:-76.17}';
const INITIAL_MAP_ZOOM = ',maxZoom:20,zoom:6}';

const MyMap: React.FC<MyMapProps> = ({ mapCenterPosition, zoom, mapMarkers, mapLayers, onMarkerClick, onMapEvent, renderMarkerModal, onMarkerSelectionChange }) => {
	const webViewRef = useRef<WebView>(null);
	const [html, setHtml] = useState<string | null>(null);
	const [selectedMarker, setSelectedMarker] = useState<string | null>(null);

	const mapCenterPositionRef = useRef(mapCenterPosition);
	mapCenterPositionRef.current = mapCenterPosition;
	const zoomRef = useRef(zoom);
	zoomRef.current = zoom;

	useEffect(() => {
		let isMounted = true;
		const loadHtml = async () => {
			const htmlAsset = Asset.fromModule(require('@/assets/leaflet/index.html'));
			await htmlAsset.downloadAsync();
			let htmlContent = await FileSystem.readAsStringAsync(htmlAsset.localUri!);
			const pos = mapCenterPositionRef.current;
			const zoomLevel = zoomRef.current ?? 13;
			if (pos) {
				const centered = htmlContent.replace(INITIAL_MAP_CENTER, `mapCenterPosition:{lat:${pos.lat},lng:${pos.lng}}`);
				if (centered === htmlContent) {
					console.warn('MyMap: initial map center replacement had no effect – HTML structure may have changed');
				}
				htmlContent = centered.replace(INITIAL_MAP_ZOOM, `,maxZoom:20,zoom:${zoomLevel}}`);
			}
			if (isMounted) {
				setHtml(htmlContent);
			}
		};
		loadHtml();
		return () => {
			isMounted = false;
		};
	}, []);

	useEffect(() => {
		onMarkerSelectionChange?.(selectedMarker);
	}, [selectedMarker, onMarkerSelectionChange]);

	const sendMapData = useCallback(() => {
		const message = {
			mapCenterPosition,
			zoom: zoom ?? 13,
			mapLayers: mapLayers ?? [DEFAULT_TILE_LAYER],
			mapMarkers: mapMarkers ?? [],
		};
		const json = JSON.stringify(message);
		webViewRef.current?.injectJavaScript(`window.dispatchEvent(new MessageEvent('message',{data:${json}}));true;`);
	}, [mapCenterPosition, zoom, mapLayers, mapMarkers]);

	const handleMessage = useCallback(
		(event: WebViewMessageEvent) => {
			try {
				const data: LeafletWebViewEvent = JSON.parse(event.nativeEvent.data);
				if (data.tag === 'MapComponentMounted') {
					sendMapData();
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
		},
		[sendMapData, onMarkerClick, onMapEvent, renderMarkerModal, onMarkerSelectionChange],
	);

	if (!html) {
		return null;
	}

	return (
		<View style={styles.container}>
			<WebView
				ref={webViewRef}
				source={{ html }}
				onMessage={handleMessage}
				style={styles.map}
				javaScriptEnabled={true}
				domStorageEnabled={true}
				originWhitelist={['*']}
			/>
		</View>
	);
};

export default MyMap;

const styles = StyleSheet.create({
	container: {
		flex: 1,
		width: '100%',
		height: '100%',
	},
	map: {
		flex: 1,
		width: '100%',
		height: '100%',
	},
});
