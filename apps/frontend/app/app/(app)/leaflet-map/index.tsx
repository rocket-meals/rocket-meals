import React, { useMemo, useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import useSelectedCanteen from '@/hooks/useSelectedCanteen';
import { Text, Platform } from 'react-native';
import { TranslationKeys } from '@/locales/keys';
import useSetPageTitle from '@/hooks/useSetPageTitle';
import { RootState } from '@/redux/reducer';
import MyMap from '@/components/MyMap/MyMap';
import {
  MARKER_DEFAULT_SIZE,
  MyMapMarkerIcons,
  getDefaultIconAnchor,
} from '@/components/MyMap/markerUtils';
import { Asset } from 'expo-asset';
import * as FileSystem from 'expo-file-system';

const POSITION_BUNDESTAG = {
  lat: 52.518594247456804,
  lng: 13.376281624711964,
};

const LeafletMap = () => {
  useSetPageTitle(TranslationKeys.leaflet_map);

  const { buildings } = useSelector(
      (state: RootState) => state.canteenReducer
  );
  const selectedCanteen = useSelectedCanteen();

  const [markerIconSrc, setMarkerIconSrc] = useState<string | null>(null);
  const [selectedMarkerId, setSelectedMarkerId] = useState<string | null>(null);
  const [modalVisible, setModalVisible] = useState(false);

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
        }
      } catch (error) {
        console.error('Error loading marker icon:', error);
      }
    };

    loadMarkerIcon();
  }, []);

  const centerPosition = useMemo(() => {
    if (selectedCanteen?.building) {
      const building = buildings.find((b) => b.id === selectedCanteen.building);
      const coords = (building as any)?.coordinates?.coordinates;
      if (coords && coords.length === 2) {
        return { lat: Number(coords[1]), lng: Number(coords[0]) };
      }
    }
    return undefined;
  }, [selectedCanteen, buildings]);

  if (!markerIconSrc) {
    // Optional: Add a loading spinner or placeholder here
    return null;
  }

  const markers = [
    {
      id: 'example',
      position: POSITION_BUNDESTAG,
      icon:
        Platform.OS === 'web'
          ? MyMapMarkerIcons.getIconForWebByUri(markerIconSrc)
          : MyMapMarkerIcons.getIconForWebByBase64(markerIconSrc),
      size: [MARKER_DEFAULT_SIZE, MARKER_DEFAULT_SIZE],
      iconAnchor: getDefaultIconAnchor(
          MARKER_DEFAULT_SIZE,
          MARKER_DEFAULT_SIZE,
      ),
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

  const renderMarkerModal = (id: string, onClose: () => void) => (
    <Text onPress={onClose}>{id}</Text>
  );

  return (
    <>
      <Text>Selected: {selectedMarkerId ?? 'none'} Visible: {String(modalVisible)}</Text>
      <MyMap
        mapCenterPosition={centerPosition || POSITION_BUNDESTAG}
        mapMarkers={markers}
        onMarkerClick={handleMarkerClick}
        onMapEvent={(e) => console.log('map event', e.tag)}
        renderMarkerModal={renderMarkerModal}
        onMarkerSelectionChange={handleSelectionChange}
      />
    </>
  );
};

export default LeafletMap;
