import React, { useEffect, useMemo, useState } from 'react';
import { useSelector } from 'react-redux';
import useSelectedCanteen from '@/hooks/useSelectedCanteen';
import { Platform, ScrollView, Text, View } from 'react-native';
import { TranslationKeys } from '@/locales/keys';
import useSetPageTitle from '@/hooks/useSetPageTitle';
import { RootState } from '@/redux/reducer';
import MyMap from '@/components/MyMap/MyMap';
import { getDefaultIconAnchor, MARKER_DEFAULT_SIZE, MyMapMarkerIcons } from '@/components/MyMap/markerUtils';
import { Asset } from 'expo-asset';
import * as FileSystem from 'expo-file-system';
import { MapMarker } from '@/components/MyMap/model';

const POSITION_BUNDESTAG = {
	lat: 52.518594247456804,
	lng: 13.376281624711964,
};

const getMarkerPosition = (index: number) => {
	const offset = index * 0.001; // Adjust the offset for each marker
	return {
		lat: POSITION_BUNDESTAG.lat + offset,
		lng: POSITION_BUNDESTAG.lng,
	};
};

const LOCAL_BASE64_MARKER = 'iVBORw0KGgoAAAANSUhEUgAAABgAAAAYCAYAAADgdz34AAAABHNCSVQICAgIfAhkiAAAAAlwSFlzAAAApgAAAKYB3X3/OAAAABl0RVh0U29mdHdhcmUAd3d3Lmlua3NjYXBlLm9yZ5vuPBoAAANCSURBVEiJtZZPbBtFFMZ/M7ubXdtdb1xSFyeilBapySVU8h8OoFaooFSqiihIVIpQBKci6KEg9Q6H9kovIHoCIVQJJCKE1ENFjnAgcaSGC6rEnxBwA04Tx43t2FnvDAfjkNibxgHxnWb2e/u992bee7tCa00YFsffekFY+nUzFtjW0LrvjRXrCDIAaPLlW0nHL0SsZtVoaF98mLrx3pdhOqLtYPHChahZcYYO7KvPFxvRl5XPp1sN3adWiD1ZAqD6XYK1b/dvE5IWryTt2udLFedwc1+9kLp+vbbpoDh+6TklxBeAi9TL0taeWpdmZzQDry0AcO+jQ12RyohqqoYoo8RDwJrU+qXkjWtfi8Xxt58BdQuwQs9qC/afLwCw8tnQbqYAPsgxE1S6F3EAIXux2oQFKm0ihMsOF71dHYx+f3NND68ghCu1YIoePPQN1pGRABkJ6Bus96CutRZMydTl+TvuiRW1m3n0eDl0vRPcEysqdXn+jsQPsrHMquGeXEaY4Yk4wxWcY5V/9scqOMOVUFthatyTy8QyqwZ+kDURKoMWxNKr2EeqVKcTNOajqKoBgOE28U4tdQl5p5bwCw7BWquaZSzAPlwjlithJtp3pTImSqQRrb2Z8PHGigD4RZuNX6JYj6wj7O4TFLbCO/Mn/m8R+h6rYSUb3ekokRY6f/YukArN979jcW+V/S8g0eT/N3VN3kTqWbQ428m9/8k0P/1aIhF36PccEl6EhOcAUCrXKZXXWS3XKd2vc/TRBG9O5ELC17MmWubD2nKhUKZa26Ba2+D3P+4/MNCFwg59oWVeYhkzgN/JDR8deKBoD7Y+ljEjGZ0sosXVTvbc6RHirr2reNy1OXd6pJsQ+gqjk8VWFYmHrwBzW/n+uMPFiRwHB2I7ih8ciHFxIkd/3Omk5tCDV1t+2nNu5sxxpDFNx+huNhVT3/zMDz8usXC3ddaHBj1GHj/As08fwTS7Kt1HBTmyN29vdwAw+/wbwLVOJ3uAD1wi/dUH7Qei66PfyuRj4Ik9is+hglfbkbfR3cnZm7chlUWLdwmprtCohX4HUtlOcQjLYCu+fzGJH2QRKvP3UNz8bWk1qMxjGTOMThZ3kvgLI5AzFfo379UAAAAASUVORK5CYII=';

const EXTERNAL_MARKER_URL = 'https://cdn4.iconfinder.com/data/icons/small-n-flat/24/map-marker-512.png';

const LeafletMap = () => {
	useSetPageTitle(TranslationKeys.leaflet_map);

	const { buildings } = useSelector((state: RootState) => state.canteenReducer);
	const selectedCanteen = useSelectedCanteen();

	const [markerIconSrc, setMarkerIconSrc] = useState<string | null>(null);
	const [selectedMarkerId, setSelectedMarkerId] = useState<string | null>(null);
	const [modalVisible, setModalVisible] = useState(false);
	const [markerError, setMarkerError] = useState<string | null>(null);

	// Load marker asset asynchronously
	useEffect(() => {
		const loadMarkerIcon = async () => {
			try {
				const mapMarkerIcon = require('@/assets/map/marker-icon-2x.png');
				const asset = await Asset.fromModule(mapMarkerIcon);
				await asset.downloadAsync();

				if (Platform.OS === 'web') {
					setMarkerIconSrc(asset.uri);
				} else if (asset.localUri) {
					const content = await FileSystem.readAsStringAsync(asset.localUri, {
						encoding: FileSystem.EncodingType.Base64,
					});
					setMarkerIconSrc(content);
				} else {
					setMarkerError('marker asset missing localUri');
				}
			} catch (error) {
				console.error('Error loading marker icon:', error);
				setMarkerError(String(error));
			}
		};

		loadMarkerIcon();
	}, []);

	const selectedCanteenPosition = useMemo(() => {
		if (selectedCanteen?.building) {
			const building = buildings.find(b => b.id === selectedCanteen.building);
			const coords = (building as any)?.coordinates?.coordinates;
			if (coords && coords.length === 2) {
				return { lat: Number(coords[1]), lng: Number(coords[0]) };
			}
		}
		return undefined;
	}, [selectedCanteen, buildings]);

	const centerPosition = selectedCanteenPosition || POSITION_BUNDESTAG;

	if (!markerIconSrc && !markerError) {
		// Optional: Add a loading spinner or placeholder here
		return null;
	}

	const markers: MapMarker[] = [
		...(markerIconSrc
			? [
					{
						id: 'example',
						position: getMarkerPosition(1),
						icon: MyMapMarkerIcons.getIconForWebByLocalPathUri(markerIconSrc),
						size: [MARKER_DEFAULT_SIZE, MARKER_DEFAULT_SIZE],
						iconAnchor: getDefaultIconAnchor(MARKER_DEFAULT_SIZE, MARKER_DEFAULT_SIZE),
					},
				]
			: []),
		{
			id: 'img-marker',
			position: getMarkerPosition(2),
			icon: MyMapMarkerIcons.getIconForWebByExternalUri(EXTERNAL_MARKER_URL),
			size: [MARKER_DEFAULT_SIZE, MARKER_DEFAULT_SIZE],
			iconAnchor: getDefaultIconAnchor(MARKER_DEFAULT_SIZE, MARKER_DEFAULT_SIZE),
		},
		{
			id: 'img-marker-base64',
			position: getMarkerPosition(3),
			icon: MyMapMarkerIcons.getIconForWebByBase64(LOCAL_BASE64_MARKER),
			size: [MARKER_DEFAULT_SIZE, MARKER_DEFAULT_SIZE],
			iconAnchor: getDefaultIconAnchor(MARKER_DEFAULT_SIZE, MARKER_DEFAULT_SIZE),
		},
	];

	const handleMarkerClick = (id: string) => {
		console.log('marker clicked', id);
		setSelectedMarkerId(id);
	};

	const handleSelectionChange = (id: string | null) => {
		setModalVisible(id !== null);
		setSelectedMarkerId(id);
	};

	const renderMarkerModal = (id: string, onClose: () => void) => <Text onPress={onClose}>{id}</Text>;

	return (
		<View style={{ flex: 1 }}>
			{markerError && (
				<View
					style={{
						position: 'absolute',
						bottom: 0,
						left: 0,
						right: 0,
						height: '40%',
					}}
				>
					<ScrollView>
						<Text selectable>{markerError}</Text>
					</ScrollView>
				</View>
			)}
			<View style={{ flex: 1 }}>
				<Text>
					Selected: {selectedMarkerId ?? 'none'} Visible: {String(modalVisible)}
				</Text>
				<MyMap mapCenterPosition={centerPosition} mapMarkers={markers} onMarkerClick={handleMarkerClick} onMapEvent={e => console.log('map event', e.tag)} renderMarkerModal={renderMarkerModal} onMarkerSelectionChange={handleSelectionChange} />
			</View>
		</View>
	);
};

export default LeafletMap;
