import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import MyMap from '@/components/MyMap';
import { MyMapHandle } from '@/components/MyMap/MyMapHelper';
import useSetPageTitle from '@/hooks/useSetPageTitle';
import { Asset } from 'expo-asset';
import * as FileSystem from 'expo-file-system/legacy';
import { ICON_EMOJI_MAP } from '@/components/MyMap/iconEmojiMap';

// Demo center: FAU Erlangen campus area
const DEMO_CENTER = { lat: 49.5977, lng: 11.0036 };
const DEMO_ZOOM = 17;
const DEMO_PITCH = 55;
const MIN_PITCH = 10;
const MAX_PITCH = 85;

// Airplane model placed slightly north-east of the demo center, 100 m above ground
// (raised from 50 m to stay clearly above custom buildings which are up to 50 m tall)
const GLB_MODEL_POSITION = { lng: DEMO_CENTER.lng + 0.001, lat: DEMO_CENTER.lat + 0.001, altitude: 100 };
// Scale in meters – the model will appear ~30 m in size
const GLB_MODEL_SCALE = 30;

const SCALE_STEP = 10;
const SCALE_MIN = 5;
const SCALE_MAX = 300;

/**
 * Image overlay: 200 m × 200 m rectangle centered on demo location.
 * Coordinates order: top-left, top-right, bottom-right, bottom-left (MapLibre image source format).
 */
const IMAGE_OVERLAYS = [
    {
        id: 'pexels-overlay',
        url: 'https://images.pexels.com/photos/6071708/pexels-photo-6071708.jpeg',
        coordinates: [
            [11.00221, 49.59860],
            [11.00499, 49.59860],
            [11.00499, 49.59680],
            [11.00221, 49.59680],
        ],
        opacity: 0.8,
    },
];

/**
 * 3D buildings (simple box extrusions).
 * Each entry needs a closed polygon ring + height in meters + color.
 */
const BUILDINGS_3D = [
    {
        id: 'cube-orange',
        coordinates: [
            [11.00412, 49.59848],
            [11.00468, 49.59848],
            [11.00468, 49.59812],
            [11.00412, 49.59812],
        ],
        height: 15,
        base: 0,
        color: '#ff6600',
        opacity: 0.9,
    },
    {
        id: 'cube-blue',
        coordinates: [
            [11.00269, 49.59747],
            [11.00311, 49.59747],
            [11.00311, 49.59693],
            [11.00269, 49.59693],
        ],
        height: 25,
        base: 0,
        color: '#1565c0',
        opacity: 0.9,
    },
    {
        id: 'tower-red',
        coordinates: [
            [11.00446, 49.59759],
            [11.00474, 49.59759],
            [11.00474, 49.59741],
            [11.00446, 49.59741],
        ],
        height: 50,
        base: 0,
        color: '#c62828',
        opacity: 0.85,
    },
];

type LayerGroup = 'poi' | 'parking' | 'transit' | 'roadLabels';

const LAYER_TOGGLE_BUTTONS: { group: LayerGroup; label: string; emoji: string }[] = [
    { group: 'poi',        label: 'Shops/POI',   emoji: '🏪' },
    { group: 'parking',    label: 'Parking',     emoji: '🅿️' },
    { group: 'transit',    label: 'Bus/Transit', emoji: '🚌' },
    { group: 'roadLabels', label: 'Road names',  emoji: '🛣️' },
];

type Props = {
    onExperimentalClickOnBuildings?: (properties: object) => void;
};

const MapWithCustomImagesAndBuildings = ({ onExperimentalClickOnBuildings }: Props) => {
    useSetPageTitle('Map – Custom Images & Buildings');

    const mapRef = useRef<MyMapHandle>(null);
    const mapReadyRef = useRef(false);
    const glbUrlRef = useRef<string | null>(null);
    const modelScaleRef = useRef(GLB_MODEL_SCALE);
    const [modelScale, setModelScale] = useState(GLB_MODEL_SCALE);
    const onBuildingClickRef = useRef(onExperimentalClickOnBuildings);
    onBuildingClickRef.current = onExperimentalClickOnBuildings;

    const [selectedBuilding, setSelectedBuilding] = useState<object | null>(null);
    const [selectedPoi, setSelectedPoi] = useState<{ iconId: string; emoji: string; properties: object } | null>(null);
    const [layerVisibility, setLayerVisibility] = useState<Record<LayerGroup, boolean>>({
        poi: true,
        parking: true,
        transit: true,
        roadLabels: true,
    });

    const sendGlbIfReady = useCallback(() => {
        if (mapReadyRef.current && glbUrlRef.current) {
            mapRef.current?.sendToMap({
                glbModels: [{
                    id: 'airplane',
                    url: glbUrlRef.current,
                    position: GLB_MODEL_POSITION,
                    scale: modelScaleRef.current,
                    rotateX: Math.PI / 2,
                    rotateY: 0,
                    rotateZ: 0,
                }],
            });
        }
    }, []);

    useEffect(() => {
        let isMounted = true;
        const loadGlb = async () => {
            try {
                const asset = Asset.fromModule(require('@/assets/3dmodels/airplane.glb'));
                await asset.downloadAsync();
                let url: string;
                if (Platform.OS === 'web') {
                    url = asset.uri;
                } else {
                    if (!asset.localUri) throw new Error('Asset localUri is undefined after downloadAsync');
                    const base64 = await FileSystem.readAsStringAsync(asset.localUri, {
                        encoding: FileSystem.EncodingType.Base64,
                    });
                    url = `data:model/gltf-binary;base64,${base64}`;
                }
                if (isMounted) {
                    glbUrlRef.current = url;
                    sendGlbIfReady();
                }
            } catch (e) {
                console.warn('Failed to load airplane.glb. Ensure the asset exists at @/assets/3dmodels/airplane.glb:', e);
            }
        };
        loadGlb();
        return () => {
            isMounted = false;
        };
    }, [sendGlbIfReady]);

    const handleMessage = useCallback((data: object) => {
        const msg = data as { tag?: string; properties?: object; iconId?: string; emoji?: string };
        if (msg.tag === 'MapComponentMounted') {
            mapReadyRef.current = true;
            mapRef.current?.sendToMap({
                iconEmojiMap: ICON_EMOJI_MAP,
                mapCenterPosition: DEMO_CENTER,
                zoom: DEMO_ZOOM,
                pitch: DEMO_PITCH,
                animate: false,
                minPitch: MIN_PITCH,
                maxPitch: MAX_PITCH,
                imageOverlays: IMAGE_OVERLAYS,
                buildings3d: BUILDINGS_3D,
                enableBuildingClick: true,
                poiClickEnabled: true,
            });
            sendGlbIfReady();
        } else if (msg.tag === 'BuildingClicked' && msg.properties) {
            setSelectedBuilding(msg.properties);
            setSelectedPoi(null);
            onBuildingClickRef.current?.(msg.properties);
        } else if (msg.tag === 'PoiClicked') {
            setSelectedPoi({ iconId: msg.iconId ?? '', emoji: msg.emoji ?? '', properties: msg.properties ?? {} });
            setSelectedBuilding(null);
        } else if (msg.tag === 'MapTapped') {
            setSelectedBuilding(null);
            setSelectedPoi(null);
        }
    }, [sendGlbIfReady]);

    const handleScaleChange = useCallback((delta: number) => {
        const newScale = Math.max(SCALE_MIN, Math.min(SCALE_MAX, modelScaleRef.current + delta));
        if (newScale === modelScaleRef.current) return;
        modelScaleRef.current = newScale;
        setModelScale(newScale);
        if (mapReadyRef.current) {
            mapRef.current?.sendToMap({ updateGlbModelScale: { id: 'airplane', scale: newScale } });
        }
    }, []);

    const handleLayerToggle = useCallback((group: LayerGroup) => {
        setLayerVisibility(prev => {
            const newVisible = !prev[group];
            mapRef.current?.sendToMap({ setLayerGroupVisibility: { group, visible: newVisible } });
            return { ...prev, [group]: newVisible };
        });
    }, []);

    return (
        <View style={styles.container}>
            <MyMap
                ref={mapRef}
                initialCenter={DEMO_CENTER}
                initialPitch={DEMO_PITCH}
                loadingText="Loading map…"
                onMessage={handleMessage}
            />

            {/* Layer toggle buttons */}
            <View style={styles.layerToggles}>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.layerTogglesContent}>
                    {LAYER_TOGGLE_BUTTONS.map(({ group, label, emoji }) => {
                        const active = layerVisibility[group];
                        return (
                            <Pressable
                                key={group}
                                style={[styles.layerToggleButton, !active && styles.layerToggleButtonOff]}
                                onPress={() => handleLayerToggle(group)}
                            >
                                <Text style={styles.layerToggleEmoji}>{emoji}</Text>
                                <Text style={[styles.layerToggleLabel, !active && styles.layerToggleLabelOff]}>{label}</Text>
                            </Pressable>
                        );
                    })}
                </ScrollView>
            </View>

            {/* Selected building info */}
            {selectedBuilding != null && (
                <View style={styles.buildingInfo}>
                    <Text style={styles.buildingInfoTitle}>Building</Text>
                    <ScrollView style={styles.buildingInfoScroll}>
                        {Object.entries(selectedBuilding).map(([k, v]) => (
                            <Text key={k} style={styles.buildingInfoRow}>
                                <Text style={styles.buildingInfoKey}>{k}: </Text>
                                {String(v)}
                            </Text>
                        ))}
                    </ScrollView>
                    <Pressable style={styles.buildingInfoClose} onPress={() => setSelectedBuilding(null)}>
                        <Text style={styles.buildingInfoCloseText}>✕</Text>
                    </Pressable>
                </View>
            )}

            {/* Selected POI info */}
            {selectedPoi !== null && (
                <View style={styles.buildingInfo}>
                    <Text style={styles.buildingInfoTitle}>
                        {selectedPoi.emoji ? `${selectedPoi.emoji} ` : ''}{selectedPoi.iconId || 'POI'}
                    </Text>
                    <ScrollView style={styles.buildingInfoScroll}>
                        {Object.entries(selectedPoi.properties).map(([k, v]) => (
                            <Text key={k} style={styles.buildingInfoRow}>
                                <Text style={styles.buildingInfoKey}>{k}: </Text>
                                {String(v)}
                            </Text>
                        ))}
                    </ScrollView>
                    <Pressable style={styles.buildingInfoClose} onPress={() => setSelectedPoi(null)}>
                        <Text style={styles.buildingInfoCloseText}>✕</Text>
                    </Pressable>
                </View>
            )}

            {/* Scale controls */}
            <View style={styles.scaleControls}>
                <Pressable style={styles.scaleButton} onPress={() => handleScaleChange(SCALE_STEP)}>
                    <Text style={styles.scaleButtonText}>＋</Text>
                </Pressable>
                <Text style={styles.scaleLabel}>{modelScale} m</Text>
                <Pressable style={styles.scaleButton} onPress={() => handleScaleChange(-SCALE_STEP)}>
                    <Text style={styles.scaleButtonText}>－</Text>
                </Pressable>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    // Layer toggle bar
    layerToggles: {
        position: 'absolute',
        top: 12,
        left: 0,
        right: 0,
    },
    layerTogglesContent: {
        paddingHorizontal: 12,
        gap: 8,
    },
    layerToggleButton: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        backgroundColor: 'rgba(255,255,255,0.92)',
        borderRadius: 20,
        paddingHorizontal: 12,
        paddingVertical: 7,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.18,
        shadowRadius: 3,
        elevation: 4,
    },
    layerToggleButtonOff: {
        backgroundColor: 'rgba(180,180,180,0.75)',
    },
    layerToggleEmoji: {
        fontSize: 15,
    },
    layerToggleLabel: {
        fontSize: 12,
        color: '#222',
        fontWeight: '600',
    },
    layerToggleLabelOff: {
        color: '#666',
        fontWeight: '400',
    },
    // Building info panel
    buildingInfo: {
        position: 'absolute',
        bottom: 120,
        left: 16,
        right: 72,
        backgroundColor: 'rgba(255,255,255,0.95)',
        borderRadius: 12,
        padding: 12,
        maxHeight: 180,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.22,
        shadowRadius: 6,
        elevation: 6,
    },
    buildingInfoTitle: {
        fontSize: 13,
        fontWeight: '700',
        color: '#333',
        marginBottom: 4,
    },
    buildingInfoScroll: {
        maxHeight: 110,
    },
    buildingInfoRow: {
        fontSize: 11,
        color: '#555',
        lineHeight: 18,
    },
    buildingInfoKey: {
        fontWeight: '600',
        color: '#222',
    },
    buildingInfoClose: {
        position: 'absolute',
        top: 8,
        right: 10,
        padding: 4,
    },
    buildingInfoCloseText: {
        fontSize: 14,
        color: '#888',
    },
    // Scale controls
    scaleControls: {
        position: 'absolute',
        bottom: 32,
        right: 16,
        alignItems: 'center',
        gap: 6,
    },
    scaleButton: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: 'rgba(255,255,255,0.92)',
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.2,
        shadowRadius: 3,
        elevation: 4,
    },
    scaleButtonText: {
        fontSize: 22,
        lineHeight: 26,
        color: '#333',
        fontWeight: '600',
    },
    scaleLabel: {
        fontSize: 12,
        color: '#fff',
        backgroundColor: 'rgba(0,0,0,0.45)',
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 4,
        overflow: 'hidden',
        textAlign: 'center',
    },
});

export default MapWithCustomImagesAndBuildings;

