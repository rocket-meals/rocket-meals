import React, { useEffect, useState } from 'react';
import { View } from 'react-native';
import styles from './styles';
import { useTheme } from '@/hooks/useTheme';
import { MapShape, MyMapProps, Position } from './types';

interface LeafletComponents {
  MapContainer: React.ComponentType<any>;
  TileLayer: React.ComponentType<any>;
  Marker: React.ComponentType<any>;
  Popup: React.ComponentType<any>;
  Circle: React.ComponentType<any>;
  CircleMarker: React.ComponentType<any>;
  Polygon: React.ComponentType<any>;
  Polyline: React.ComponentType<any>;
  Rectangle: React.ComponentType<any>;
  L: any;
}

const MyMap: React.FC<MyMapProps> = ({ mapCenterPosition, zoom, mapMarkers, mapShapes, onMarkerPress }) => {
  const { theme } = useTheme();
  const [components, setComponents] = useState<LeafletComponents>();

  useEffect(() => {
    let mounted = true;
    (async () => {
      if (typeof window !== 'undefined') {
        const [
          {
            MapContainer,
            TileLayer,
            Marker,
            Popup,
            Circle,
            CircleMarker,
            Polygon,
            Polyline,
            Rectangle,
          },
          leaflet,
        ] = await Promise.all([
          import('react-leaflet'),
          import('leaflet'),
        ]);
        await import('leaflet/dist/leaflet.css');
        if (mounted) {
          setComponents({
            MapContainer,
            TileLayer,
            Marker,
            Popup,
            Circle,
            CircleMarker,
            Polygon,
            Polyline,
            Rectangle,
            L: leaflet.default ?? leaflet,
          });
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

  const { MapContainer, TileLayer, Marker, Popup, Circle, CircleMarker, Polygon, Polyline, Rectangle, L } = components;

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
            icon={
              marker.icon
                ? L.icon({
                    iconUrl: marker.icon,
                    iconSize: marker.size ?? [25, 41],
                    iconAnchor: marker.iconAnchor ?? [12, 41],
                  })
                : undefined
            }
            eventHandlers={{ click: () => onMarkerPress?.(marker.id) }}
          >
            {marker.title && <Popup>{marker.title}</Popup>}
          </Marker>
        ))}
        {mapShapes?.map((shape) => {
          const common = { key: shape.id } as any;
          const options = shape.color ? { pathOptions: { color: shape.color } } : {};
          switch (shape.shapeType) {
            case 'circle':
              return (
                <Circle
                  {...common}
                  center={[shape.center?.lat ?? 0, shape.center?.lng ?? 0]}
                  radius={shape.radius ?? 0}
                  {...options}
                />
              );
            case 'circleMarker':
              return (
                <CircleMarker
                  {...common}
                  center={[shape.center?.lat ?? 0, shape.center?.lng ?? 0]}
                  radius={shape.radius}
                  {...options}
                />
              );
            case 'polygon':
              return (
                <Polygon
                  {...common}
                  positions={shape.positions?.map((p: any) => [p.lat, p.lng]) as any}
                  {...options}
                />
              );
            case 'polyline':
              return (
                <Polyline
                  {...common}
                  positions={shape.positions?.map((p: any) => [p.lat, p.lng]) as any}
                  {...options}
                />
              );
            case 'rectangle':
              return (
                <Rectangle
                  {...common}
                  bounds={
                    shape.positions?.map((p: any) => [p.lat, p.lng]) as any
                  }
                  {...options}
                />
              );
            default:
              return null;
          }
        })}
      </MapContainer>
    </View>
  );
};

export default MyMap;
