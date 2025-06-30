import React from 'react';
import { View } from 'react-native';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import styles from './styles';
import { useTheme } from '@/hooks/useTheme';
import 'leaflet/dist/leaflet.css';

export interface Position {
  lat: number;
  lng: number;
}

export interface MyMapProps {
  mapCenterPosition: Position;
  zoom?: number;
  mapMarkers?: { id: string; position: Position; title?: string; icon?: string }[];
}

const MyMap: React.FC<MyMapProps> = ({ mapCenterPosition, zoom, mapMarkers }) => {
  const { theme } = useTheme();

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
