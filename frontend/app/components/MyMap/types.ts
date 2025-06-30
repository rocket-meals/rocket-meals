export interface Position {
  lat: number;
  lng: number;
}

export interface MapMarker {
  id: string;
  position: Position;
  title?: string;
  icon?: string;
}

export interface MapShape {
  id?: string;
  shapeType: 'circle' | 'circleMarker' | 'polygon' | 'polyline' | 'rectangle';
  center?: Position;
  radius?: number;
  positions?: Position[] | Position[][];
  color?: string;
}

export interface MyMapProps {
  mapCenterPosition: Position;
  zoom?: number;
  mapMarkers?: MapMarker[];
  mapShapes?: MapShape[];
  onMarkerPress?: (id: string) => void;
}
