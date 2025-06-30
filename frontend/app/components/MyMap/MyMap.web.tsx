import React, { useEffect, useState } from 'react';
import { View } from 'react-native';
import styles from './styles';
import { useTheme } from '@/hooks/useTheme';

export interface Position {
  lat: number;
  lng: number;
}

export interface MyMapProps {
  mapCenterPosition: Position;
  zoom?: number;
  mapMarkers?: { id: string; position: Position; title?: string; icon?: string }[];
}

interface LeafletComponents {
  MapContainer: React.ComponentType<any>;
  TileLayer: React.ComponentType<any>;
  Marker: React.ComponentType<any>;
  Popup: React.ComponentType<any>;
  L: any;
}

const MyMap: React.FC<MyMapProps> = ({ mapCenterPosition, zoom, mapMarkers }) => {
  const { theme } = useTheme();
  const [components, setComponents] = useState<LeafletComponents>();

  useEffect(() => {
    let mounted = true;
    (async () => {
      if (typeof window !== 'undefined') {
        const [{ MapContainer, TileLayer, Marker, Popup }, leaflet] = await Promise.all([
          import('react-leaflet'),
          import('leaflet'),
        ]);
        await import('leaflet/dist/leaflet.css');
        if (mounted) {
          setComponents({ MapContainer, TileLayer, Marker, Popup, L: leaflet.default ?? leaflet });
        }
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  if (!components) {
    return <View style={[styles.container, { backgroundColor: theme.screen.background }]} />;
  }

  const { MapContainer, TileLayer, Marker, Popup, L } = components;

  return (
    <View style={[styles.container, { backgroundColor: theme.screen.background }]}>
      <MapContainer
        center={[mapCenterPosition.lat, mapCenterPosition.lng]}
        zoom={zoom ?? 13}
        style={{ height: '100%', width: '100%' }}
        scrollWheelZoom
      >
        <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
        {mapMarkers?.map((marker) => (
          <Marker
            key={marker.id}
            position={[marker.position.lat, marker.position.lng]}
            icon={marker.icon ? L.icon({ iconUrl: marker.icon }) : undefined}
          >
            {marker.title && <Popup>{marker.title}</Popup>}
          </Marker>
        ))}
      </MapContainer>
    </View>
  );
};

export default MyMap;
