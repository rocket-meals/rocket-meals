import React, { useCallback, useEffect, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useTheme } from '@/hooks/useTheme';
import DEFAULT_TILE_LAYER from './defaultTileLayer';
import type { LeafletWebViewEvent } from './model';
import BaseModal from '@/components/BaseModal';
import { MyMapProps } from '@/components/MyMap/MyMapHelper';

const MyMap: React.FC<MyMapProps> = ({
	mapCenterPosition,
	zoom,
	mapMarkers,
	onMarkerClick,
	onMapEvent,
	renderMarkerModal,
	onMarkerSelectionChange,
}) => {
	const { theme } = useTheme();
	const iframeRef = useRef<HTMLIFrameElement>(null);
	const html = require('@/assets/leaflet/index.html');

	const [selectedMarker, setSelectedMarker] = useState<string | null>(null);

	useEffect(() => {
		onMarkerSelectionChange?.(selectedMarker);
	}, [selectedMarker, onMarkerSelectionChange]);

	const sendCoordinates = useCallback(() => {
		if (iframeRef.current && iframeRef.current.contentWindow) {
			const message = {
				mapCenterPosition,
				zoom: zoom ?? 13,
				mapLayers: [DEFAULT_TILE_LAYER],
				mapMarkers: mapMarkers ?? [],
			};
			iframeRef.current.contentWindow.postMessage(message, '*');
		}
	}, [mapCenterPosition, zoom, mapMarkers]);

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
	}, [
		sendCoordinates,
		onMarkerClick,
		onMapEvent,
		renderMarkerModal,
		onMarkerSelectionChange,
	]);

	return (
		<View
			style={[styles.container, { backgroundColor: theme.screen.background }]}
		>
			<iframe
				ref={iframeRef}
				src={html}
				style={{ width: '100%', height: '100%', border: 'none' }}
				onLoad={sendCoordinates}
				title="map"
			/>
			{renderMarkerModal && selectedMarker && (
				<BaseModal isVisible={true} onClose={() => setSelectedMarker(null)}>
					{renderMarkerModal(selectedMarker, () => setSelectedMarker(null))}
				</BaseModal>
			)}
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
