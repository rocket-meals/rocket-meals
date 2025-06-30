import React, { useMemo } from 'react';
import { useSelector } from 'react-redux';
import { TranslationKeys } from '@/locales/keys';
import useSetPageTitle from '@/hooks/useSetPageTitle';
import { RootState } from '@/redux/reducer';
import MyMap from '@/components/MyMap/MyMap';
import { Image } from 'react-native';
import { MapMarker, MapShape } from '@/components/MyMap/types';

const POSITION_BUNDESTAG = {
  lat: 52.518594247456804,
  lng: 13.376281624711964,
};

const ICON = Image.resolveAssetSource(
  require('@/assets/map/marker-icon-2x.png')
).uri;

const DEMO_MARKERS: MapMarker[] = [
  {
    id: 'bundestag',
    position: POSITION_BUNDESTAG,
    title: 'Bundestag',
    icon: ICON,
  },
  {
    id: 'bundestag_se',
    position: {
      lat: POSITION_BUNDESTAG.lat - 0.0008,
      lng: POSITION_BUNDESTAG.lng + 0.0008,
    },
    title: 'Southeast',
  },
  {
    id: 'bundestag_nw',
    position: {
      lat: POSITION_BUNDESTAG.lat + 0.0008,
      lng: POSITION_BUNDESTAG.lng - 0.0008,
    },
    title: 'Northwest',
  },
];

const DEMO_SHAPES: MapShape[] = [
  {
    id: 'circle200',
    shapeType: 'circle',
    center: POSITION_BUNDESTAG,
    radius: 200,
    color: 'red',
  },
  {
    id: 'circle400',
    shapeType: 'circle',
    center: POSITION_BUNDESTAG,
    radius: 400,
    color: 'blue',
  },
];

const LeafletMap = () => {
  useSetPageTitle(TranslationKeys.leaflet_map);

  const { selectedCanteen, buildings } = useSelector(
    (state: RootState) => state.canteenReducer
  );

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

  return (
    <MyMap
      mapCenterPosition={centerPosition || POSITION_BUNDESTAG}
      mapMarkers={DEMO_MARKERS}
      mapShapes={DEMO_SHAPES}
    />
  );
};

export default LeafletMap;
