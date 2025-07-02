import React, { useMemo, useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import { Text, View, ScrollView } from 'react-native';
import { TranslationKeys } from '@/locales/keys';
import useSetPageTitle from '@/hooks/useSetPageTitle';
import { RootState } from '@/redux/reducer';
import MyMap from '@/components/MyMap/MyMap';
import {
  MARKER_DEFAULT_SIZE,
  MyMapMarkerIcons,
  getDefaultIconAnchor,
} from '@/components/MyMap/markerUtils';
import { useAssets } from 'expo-asset';
import * as FileSystem from 'expo-file-system';

const POSITION_BUNDESTAG = {
  lat: 52.518594247456804,
  lng: 13.376281624711964,
};

const LeafletMap = () => {
  useSetPageTitle(TranslationKeys.leaflet_map);

  const { selectedCanteen, buildings } = useSelector(
      (state: RootState) => state.canteenReducer
  );

  const [assets] = useAssets([require('@/assets/map/marker-icon-2x.png')]);
  const [markerIconSrc, setMarkerIconSrc] = useState<string | null>(null);
  const [selectedMarkerId, setSelectedMarkerId] = useState<string | null>(null);
  const [modalVisible, setModalVisible] = useState(false);

  // Load marker asset asynchronously
  useEffect(() => {
    const loadMarkerIcon = async () => {
      if (assets && assets[0]) {
        try {
          const asset = assets[0];
          const uri = asset.localUri || asset.uri;
          if (!uri) {
            console.error('Asset URI is not available.');
            return;
          }
          const content = await FileSystem.readAsStringAsync(uri, {
            encoding: FileSystem.EncodingType.Base64,
          });
          setMarkerIconSrc(content);
        } catch (error) {
          console.error('Error loading marker icon:', error);
        }
      }
    };

    loadMarkerIcon();
  }, [assets]);

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
      icon: MyMapMarkerIcons.getIconForWebByBase64(markerIconSrc),
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
      <View style={{ flex: 1 }}>
        <View style={{ flex: 1 }}>
          <MyMap
            mapCenterPosition={centerPosition || POSITION_BUNDESTAG}
            mapMarkers={markers}
            onMarkerClick={handleMarkerClick}
            onMapEvent={(e) => console.log('map event', e.tag)}
            renderMarkerModal={renderMarkerModal}
            onMarkerSelectionChange={handleSelectionChange}
          />
        </View>
        <ScrollView style={{ flex: 1 }}>
          <Text selectable>{markerIconSrc}</Text>
        </ScrollView>
      </View>
    </>
  );
};

export default LeafletMap;
