import { MapLayer } from './model';

export const DEFAULT_TILE_LAYER: MapLayer = {
	layerType: 'TileLayer',
	url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
	baseLayerName: 'OpenStreetMap',
	baseLayerIsChecked: true,
};

export default DEFAULT_TILE_LAYER;
