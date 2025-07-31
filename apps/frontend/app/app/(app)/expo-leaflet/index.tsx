import React from 'react';
import { View } from 'react-native';
import { ExpoLeaflet, MapLayer, MapMarker } from 'expo-leaflet';
import { useTheme } from '@/hooks/useTheme';
import useSetPageTitle from '@/hooks/useSetPageTitle';
import { TranslationKeys } from '@/locales/keys';

const mapLayers: MapLayer[] = [
  {
    layerType: 'TileLayer',
    baseLayer: true,
    baseLayerName: 'OpenStreetMap',
    baseLayerIsChecked: true,
    url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
  },
];

const mapMarkers: MapMarker[] = [
  {
    id: '1',
    position: { lat: 52.52, lng: 13.405 },
    icon: '<span>📍</span>',
    size: [32, 32],
  },
  {
    id: '2',
    position: { lat: 52.521, lng: 13.41 },
    icon: '<span>🍔</span>',
    size: [32, 32],
  },
];

const ExpoLeafletScreen = () => {
  useSetPageTitle(TranslationKeys.expo_leaflet);
  const { theme } = useTheme();

  return (
    <View style={{ flex: 1, backgroundColor: theme.screen.background }}>
      <ExpoLeaflet
        mapCenterPosition={{ lat: 52.52, lng: 13.405 }}
        mapLayers={mapLayers}
        mapMarkers={mapMarkers}
        zoom={13}
        onMessage={(e) => console.log('expo-leaflet', e.tag)}
        backgroundColor={theme.screen.background}
      />
    </View>
  );
};

export default ExpoLeafletScreen;
