import React, { useCallback, useState } from 'react';
import { Alert, StyleSheet, TouchableOpacity } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import type { MyMapHandle } from '../MyMap/MyMapHelper';

interface MapButtonBaseProps {
	mapRef: React.RefObject<MyMapHandle | null>;
	backgroundColor?: string;
	iconColor?: string;
}

export interface MapNorthButtonProps extends MapButtonBaseProps {}

export function MapNorthButton({ mapRef, backgroundColor = '#ffffff', iconColor = '#555555' }: MapNorthButtonProps) {
	const handlePress = useCallback(() => {
		mapRef.current?.sendToMap({ resetBearing: true });
	}, [mapRef]);

	return (
		<TouchableOpacity style={[styles.button, { backgroundColor }]} onPress={handlePress}>
			<MaterialIcons name="explore" size={26} color={iconColor} />
		</TouchableOpacity>
	);
}

export interface MapLocationButtonProps extends MapButtonBaseProps {
	activeColor?: string;
	onLocationFound?: (location: { lat: number; lng: number }) => void;
	/**
	 * When provided, controls the active (following) state display from outside.
	 * When true the button shows as active; when false it shows as inactive.
	 * If omitted, the button manages its own active state internally.
	 */
	isFollowing?: boolean;
	/**
	 * When provided, the map zooms to this level when centering on the user's location.
	 * If omitted, the current map zoom is preserved.
	 */
	zoom?: number;
}

export function MapLocationButton({
	mapRef,
	backgroundColor = '#ffffff',
	iconColor = '#555555',
	activeColor = '#1a73e8',
	onLocationFound,
	isFollowing,
	zoom,
}: MapLocationButtonProps) {
	const [internalActive, setInternalActive] = useState(false);
	const showActive = isFollowing !== undefined ? isFollowing : internalActive;

	const handlePress = useCallback(async () => {
		try {
			const { status } = await Location.requestForegroundPermissionsAsync();
			if (status !== 'granted') {
				Alert.alert('Location', 'Location permission was denied.');
				return;
			}
			const location = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
			const { latitude, longitude } = location.coords;
			const center = { lat: latitude, lng: longitude };
			if (isFollowing === undefined) {
				setInternalActive(true);
			}
			mapRef.current?.sendToMap({
				mapCenterPosition: center,
				userLocation: center,
				...(zoom !== undefined ? { zoom } : {}),
			});
			onLocationFound?.(center);
		} catch (error) {
			console.error('Location error:', error);
			Alert.alert('Location', 'Could not determine location.');
		}
	}, [mapRef, onLocationFound, isFollowing, zoom]);

	return (
		<TouchableOpacity style={[styles.button, { backgroundColor }]} onPress={handlePress}>
			<MaterialIcons name="my-location" size={26} color={showActive ? activeColor : iconColor} />
		</TouchableOpacity>
	);
}

const styles = StyleSheet.create({
	button: {
		width: 44,
		height: 44,
		borderRadius: 8,
		alignItems: 'center',
		justifyContent: 'center',
		shadowColor: '#000',
		shadowOffset: { width: 0, height: 1 },
		shadowOpacity: 0.2,
		shadowRadius: 3,
		elevation: 3,
	},
});
