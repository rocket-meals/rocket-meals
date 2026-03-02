import React, { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { useTheme } from '@/hooks/useTheme';
import type { LeafletWebViewEvent, MapMarker } from './model';
import { LatLng, LeafletView, MapMarker as LeafletViewMapMarkers, WebviewLeafletMessage } from 'react-native-leaflet-view';
import useSetPageTitle from '@/hooks/useSetPageTitle';
import { TranslationKeys } from '@/locales/keys';
import { Asset } from 'expo-asset';
import * as FileSystem from 'expo-file-system';
import { MyMapProps } from '@/components/MyMap/MyMapHelper';

const MyMap: React.FC<MyMapProps> = ({ mapCenterPosition, zoom, mapMarkers, onMarkerClick, onMapEvent, renderMarkerModal, onMarkerSelectionChange }) => {
	const { theme } = useTheme();

	const [selectedMarker, setSelectedMarker] = useState<string | null>(null);

	useSetPageTitle(TranslationKeys.leaflet_map);
	const [html, setHtml] = useState<string | null>(null);
	const [icon, setIcon] = useState<string | null>(null);

	useEffect(() => {
		let isMounted = true;
		const loadAssets = async () => {
			const htmlAsset = Asset.fromModule(require('@/assets/leaflet.html'));
			const iconAsset = Asset.fromModule(require('@/assets/map/marker-icon-2x.png'));
			await Promise.all([htmlAsset.downloadAsync(), iconAsset.downloadAsync()]);
			const [htmlContent, iconContent] = await Promise.all([
				FileSystem.readAsStringAsync(htmlAsset.localUri!),
				FileSystem.readAsStringAsync(iconAsset.localUri!, {
					encoding: FileSystem.EncodingType.Base64,
				}),
			]);
			if (isMounted) {
				setHtml(htmlContent);
				setIcon(iconContent);
			}
		};
		loadAssets();
		return () => {
			isMounted = false;
		};
	}, []);

	if (!html || !icon) {
		return <ActivityIndicator />;
	}

	let finalMapMarkers: LeafletViewMapMarkers[] = [];
	if (mapMarkers) {
		finalMapMarkers = mapMarkers.map((marker: MapMarker) => ({
			id: marker.id,
			position: marker.position as LatLng,
			icon: marker.icon,
			size: marker.size || [32, 32],
		}));
	}
	finalMapMarkers.push({
		id: 'berlin-icon',
		position: mapCenterPosition,
		icon: `<img src='data:image/png;base64,${icon}' style='width:32px;height:32px;' />`,
		size: [32, 32],
	});

	const handler = (webviewLeafletMessage: WebviewLeafletMessage) => {
		try {
			let event: MessageEvent = webviewLeafletMessage?.event;
			const data: LeafletWebViewEvent = JSON.parse(event.data);
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

	return (
		<View style={styles.container}>
			<LeafletView
				mapCenterPosition={mapCenterPosition}
				onMessageReceived={handler}
				onMarkerClick={(markerId: any) => {
					if (onMarkerClick) {
						onMarkerClick(markerId);
					}
					if (renderMarkerModal) {
						setSelectedMarker(markerId);
					}
					if (onMarkerSelectionChange) {
						onMarkerSelectionChange(markerId);
					}
				}}
				zoom={13}
				source={{ html }}
				mapMarkers={finalMapMarkers}
				webviewStyle={styles.map}
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
		backgroundColor: 'red',
	},
	map: {
		flex: 1,
		width: '100%',
		height: '100%',
	},
});
