import {MapLayer} from "@/components/leaflet";

// http://alexurquhart.github.io/free-tiles/#
// https://www.openstreetmap.org/#map=15/52.3806/9.6642
// http://leaflet-extras.github.io/leaflet-providers/preview/index.html

export function getMapLayers(): MapLayer[] {
	let keys = Object.keys(LeafletMapLayers);
	let mapLayers: MapLayer[] = [];
	keys.forEach((key) => {
		mapLayers.push((LeafletMapLayers as any)[key]);
	});
	return mapLayers;
}

export class LeafletMapLayers {
	static OpenStreetMapMapnik: MapLayer = {
		baseLayerName: "OpenStreetMap",
		baseLayerIsChecked: true,
		layerType: "TileLayer",
		baseLayer: true,
		url: "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
		attribution: "&copy; <a href='http://osm.org/copyright'>OpenStreetMap</a> contributors",
	};

//	static DarkMatter: MapLayer = {
//		baseLayerName: "Dark Matter",
//		baseLayerIsChecked: false,
//		layerType: "TileLayer",
//		baseLayer: true,
//		url: "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png",
//		attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
//	};
//
//	static DarkMatterNoLabels: MapLayer = {
//		baseLayerName: "Dark Matter No Labels",
//		baseLayerIsChecked: false,
//		layerType: "TileLayer",
//		baseLayer: true,
//		url: "https://{s}.basemaps.cartocdn.com/dark_nolabels/{z}/{x}/{y}.png",
//		attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
//	};
//
//	static Positron: MapLayer = {
//		baseLayerName: "Positron",
//		baseLayerIsChecked: false,
//		layerType: "TileLayer",
//		baseLayer: true,
//		url: "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png",
//		attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
//	};
//
//	static PositronNoLabels: MapLayer = {
//		baseLayerName: "Positron No Labels",
//		baseLayerIsChecked: false,
//		layerType: "TileLayer",
//		baseLayer: true,
//		url: "https://{s}.basemaps.cartocdn.com/light_nolabels/{z}/{x}/{y}.png",
//		attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
//	};
}