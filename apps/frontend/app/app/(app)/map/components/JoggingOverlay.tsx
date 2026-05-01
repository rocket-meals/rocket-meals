import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Alert, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import * as Location from 'expo-location';
import { MaterialIcons } from '@expo/vector-icons';
import type { MyMapHandle } from '@/components/MyMap/MyMapHelper';
import { useMyScrollViewModal } from '@/components/GlobalModal/useMyScrollViewModal';
import { useTheme } from '@/hooks/useTheme';

// ─── Types ────────────────────────────────────────────────────────────────────

type RoutePoint = {
	lat: number;
	lng: number;
	altitude: number | null;
	speed: number | null; // m/s from GPS, may be null or negative
	timestamp: number;
};

type RunStats = {
	distanceKm: number;
	durationSeconds: number;
	paceMinPerKm: number;
	maxSpeedKmh: number;
	minSpeedKmh: number;
	avgSpeedKmh: number;
	kcal: number;
	steps: number;
	elevationGainM: number;
	elevationLossM: number;
	fluidNeedsMl: number;
};

// ─── Computation constants ────────────────────────────────────────────────────

const DEFAULT_RUNNER_WEIGHT_KG = 75;
const KCAL_PER_KG_PER_KM = 0.9;
const AVERAGE_STRIDE_LENGTH_METERS = 0.77;
/** Duration baseline for fluid-needs calculation: 30 minutes in seconds. */
const FLUID_BASELINE_DURATION_SECONDS = 1800;
/** Fluid consumed per baseline duration in millilitres. */
const FLUID_BASELINE_ML = 500;

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Haversine distance between two GPS coordinates in kilometres. */
function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
	const R = 6371;
	const dLat = ((lat2 - lat1) * Math.PI) / 180;
	const dLng = ((lng2 - lng1) * Math.PI) / 180;
	const a =
		Math.sin(dLat / 2) ** 2 +
		Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
	return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/** Compute run statistics from recorded GPS points. */
function computeStats(points: RoutePoint[]): RunStats {
	if (points.length < 2) {
		const durationSeconds = points.length === 1 ? (Date.now() - points[0].timestamp) / 1000 : 0;
		return {
			distanceKm: 0,
			durationSeconds,
			paceMinPerKm: 0,
			maxSpeedKmh: 0,
			minSpeedKmh: 0,
			avgSpeedKmh: 0,
			kcal: 0,
			steps: 0,
			elevationGainM: 0,
			elevationLossM: 0,
			fluidNeedsMl: 0,
		};
	}

	let distanceKm = 0;
	let elevationGainM = 0;
	let elevationLossM = 0;
	const speedsKmh: number[] = [];

	for (let i = 1; i < points.length; i++) {
		const segKm = haversineKm(points[i - 1].lat, points[i - 1].lng, points[i].lat, points[i].lng);
		distanceKm += segKm;

		// Elevation
		if (points[i].altitude != null && points[i - 1].altitude != null) {
			const diff = (points[i].altitude as number) - (points[i - 1].altitude as number);
			if (diff > 0) elevationGainM += diff;
			else elevationLossM += Math.abs(diff);
		}

		// Speed: prefer GPS speed, fall back to distance/time
		const dtSec = (points[i].timestamp - points[i - 1].timestamp) / 1000;
		const gpsSpeed = points[i].speed;
		const segSpeedKmh =
			gpsSpeed != null && gpsSpeed >= 0
				? gpsSpeed * 3.6
				: dtSec > 0
				? (segKm / dtSec) * 3600
				: 0;
		if (segSpeedKmh > 0) speedsKmh.push(segSpeedKmh);
	}

	const durationSeconds = (points[points.length - 1].timestamp - points[0].timestamp) / 1000;
	const paceMinPerKm = distanceKm > 0 ? durationSeconds / 60 / distanceKm : 0;
	const maxSpeedKmh = speedsKmh.length > 0 ? Math.max(...speedsKmh) : 0;
	const minSpeedKmh = speedsKmh.length > 0 ? Math.min(...speedsKmh) : 0;
	const avgSpeedKmh = durationSeconds > 0 ? (distanceKm / durationSeconds) * 3600 : 0;

	// ~KCAL_PER_KG_PER_KM kcal per kg per km, default runner weight DEFAULT_RUNNER_WEIGHT_KG kg
	const kcal = Math.round(distanceKm * DEFAULT_RUNNER_WEIGHT_KG * KCAL_PER_KG_PER_KM);
	// average running stride AVERAGE_STRIDE_LENGTH_METERS m
	const steps = Math.round((distanceKm * 1000) / AVERAGE_STRIDE_LENGTH_METERS);
	// FLUID_BASELINE_ML ml per FLUID_BASELINE_DURATION_SECONDS seconds of running
	const fluidNeedsMl = Math.round((durationSeconds / FLUID_BASELINE_DURATION_SECONDS) * FLUID_BASELINE_ML);

	return {
		distanceKm,
		durationSeconds,
		paceMinPerKm,
		maxSpeedKmh,
		minSpeedKmh,
		avgSpeedKmh,
		kcal,
		steps,
		elevationGainM,
		elevationLossM,
		fluidNeedsMl,
	};
}

function formatDuration(totalSeconds: number): string {
	const h = Math.floor(totalSeconds / 3600);
	const m = Math.floor((totalSeconds % 3600) / 60);
	const s = Math.floor(totalSeconds % 60);
	if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
	return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

function formatPace(minPerKm: number): string {
	if (minPerKm <= 0 || !isFinite(minPerKm)) return '--:--';
	const m = Math.floor(minPerKm);
	const s = Math.round((minPerKm - m) * 60);
	return `${m}:${String(s).padStart(2, '0')} min/km`;
}

function formatDistance(km: number): string {
	if (km < 1) return `${Math.round(km * 1000)} m`;
	return `${km.toFixed(2)} km`;
}

// ─── Run Stats Modal Content ──────────────────────────────────────────────────

type RunStatsContentProps = { stats: RunStats };

const RunStatsContent: React.FC<RunStatsContentProps> = ({ stats }) => {
	const { theme } = useTheme();

	const rows: { iconName: React.ComponentProps<typeof MaterialIcons>['name']; label: string; value: string }[] = [
		{ iconName: 'straighten', label: 'Entfernung', value: formatDistance(stats.distanceKm) },
		{ iconName: 'timer', label: 'Dauer', value: formatDuration(stats.durationSeconds) },
		{ iconName: 'speed', label: 'Pace', value: formatPace(stats.paceMinPerKm) },
		{ iconName: 'speed', label: 'Durchschnittsgeschwindigkeit', value: `${stats.avgSpeedKmh.toFixed(1)} km/h` },
		{ iconName: 'speed', label: 'Max. Geschwindigkeit', value: `${stats.maxSpeedKmh.toFixed(1)} km/h` },
		{ iconName: 'speed', label: 'Min. Geschwindigkeit', value: `${stats.minSpeedKmh.toFixed(1)} km/h` },
		{ iconName: 'local-fire-department', label: 'Kalorien', value: `${stats.kcal} kcal` },
		{ iconName: 'directions-walk', label: 'Schritte (geschätzt)', value: stats.steps.toLocaleString() },
		{ iconName: 'trending-up', label: 'Höhenmeter aufwärts', value: `${Math.round(stats.elevationGainM)} m` },
		{ iconName: 'trending-down', label: 'Höhenmeter abwärts', value: `${Math.round(stats.elevationLossM)} m` },
		{ iconName: 'water-drop', label: 'Flüssigkeitsbedarf', value: `${stats.fluidNeedsMl} ml` },
	];

	return (
		<View style={statsStyles.container}>
			{rows.map((row, index) => (
				<View
					key={row.label}
					style={[
						statsStyles.row,
						{ borderBottomColor: theme.screen.text + '22' },
						index === rows.length - 1 && statsStyles.rowLast,
					]}
				>
					<MaterialIcons name={row.iconName} size={20} color={theme.screen.icon} style={statsStyles.rowIcon} />
					<Text style={[statsStyles.rowLabel, { color: theme.screen.text }]}>{row.label}</Text>
					<Text style={[statsStyles.rowValue, { color: theme.screen.text }]}>{row.value}</Text>
				</View>
			))}
		</View>
	);
};

const statsStyles = StyleSheet.create({
	container: { paddingBottom: 16 },
	row: {
		flexDirection: 'row',
		alignItems: 'center',
		paddingVertical: 12,
		paddingHorizontal: 16,
		borderBottomWidth: StyleSheet.hairlineWidth,
	},
	rowLast: { borderBottomWidth: 0 },
	rowIcon: { marginRight: 12 },
	rowLabel: { flex: 1, fontSize: 15 },
	rowValue: { fontSize: 15, fontWeight: '600' },
});

// ─── Jogging Overlay ──────────────────────────────────────────────────────────

const GPS_TIME_INTERVAL_MS = 5000;
const GPS_DISTANCE_INTERVAL_METERS = 5;

export type JoggingOverlayProps = {
	mapRef: React.RefObject<MyMapHandle>;
};

const JoggingOverlay: React.FC<JoggingOverlayProps> = ({ mapRef }) => {
	const { theme } = useTheme();
	const { show } = useMyScrollViewModal();

	const [isRecording, setIsRecording] = useState(false);
	const [elapsedSeconds, setElapsedSeconds] = useState(0);
	const [liveDistanceKm, setLiveDistanceKm] = useState(0);
	const [liveSpeedKmh, setLiveSpeedKmh] = useState<number | null>(null);

	const locationSubRef = useRef<Location.LocationSubscription | null>(null);
	const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
	const startTimeRef = useRef<number>(0);
	// Mutable ref so callbacks always see the latest points without stale closure issues
	const routePointsRef = useRef<RoutePoint[]>([]);

	// Cleanup subscriptions when the component unmounts
	useEffect(() => {
		return () => {
			locationSubRef.current?.remove();
			if (timerRef.current) clearInterval(timerRef.current);
		};
	}, []);

	const sendRouteToMap = useCallback((points: RoutePoint[]) => {
		if (!mapRef.current) return;
		const coords = points.map((p) => [p.lng, p.lat]);
		mapRef.current.sendToMap({ routeCoordinates: coords });
	}, [mapRef]);

	const startRecording = useCallback(async () => {
		try {
			const { status } = await Location.requestForegroundPermissionsAsync();
			if (status !== 'granted') {
				Alert.alert('GPS', 'Standortberechtigung ist für die Laufaufnahme notwendig.');
				return;
			}

			// Reset state
			routePointsRef.current = [];
			startTimeRef.current = Date.now();
			setElapsedSeconds(0);
			setLiveDistanceKm(0);
			setLiveSpeedKmh(null);
			setIsRecording(true);

			// Clear previous route from map
			mapRef.current?.sendToMap({ routeCoordinates: [] });

			// Start elapsed-time ticker
			timerRef.current = setInterval(() => {
				setElapsedSeconds(Math.floor((Date.now() - startTimeRef.current) / 1000));
			}, 1000);

			// Start GPS watch
			const sub = await Location.watchPositionAsync(
				{
					accuracy: Location.Accuracy.BestForNavigation,
					timeInterval: GPS_TIME_INTERVAL_MS,
					distanceInterval: GPS_DISTANCE_INTERVAL_METERS,
				},
				(loc) => {
					const point: RoutePoint = {
						lat: loc.coords.latitude,
						lng: loc.coords.longitude,
						altitude: loc.coords.altitude,
						speed: loc.coords.speed,
						timestamp: loc.timestamp,
					};

					const next = [...routePointsRef.current, point];
					routePointsRef.current = next;

					// Recompute live distance
					let d = 0;
					for (let i = 1; i < next.length; i++) {
						d += haversineKm(next[i - 1].lat, next[i - 1].lng, next[i].lat, next[i].lng);
					}
					setLiveDistanceKm(d);

					// Live speed (GPS speed preferred)
					const gpsSpeed = loc.coords.speed;
					if (gpsSpeed != null && gpsSpeed >= 0) {
						setLiveSpeedKmh(gpsSpeed * 3.6);
					}

					sendRouteToMap(next);
				},
			);

			locationSubRef.current = sub;
		} catch (err) {
			console.error('JoggingOverlay startRecording error:', err);
			Alert.alert('Fehler', 'Die Laufaufnahme konnte nicht gestartet werden.');
			setIsRecording(false);
		}
	}, [mapRef, sendRouteToMap]);

	const stopRecording = useCallback(() => {
		// Stop GPS watch
		locationSubRef.current?.remove();
		locationSubRef.current = null;

		// Stop timer
		if (timerRef.current) {
			clearInterval(timerRef.current);
			timerRef.current = null;
		}

		setIsRecording(false);

		const points = routePointsRef.current;
		if (points.length < 2) {
			Alert.alert('Lauf beendet', 'Es wurden zu wenige GPS-Punkte aufgezeichnet.');
			return;
		}

		const stats = computeStats(points);

		show({
			title: '🏃 Lauf Statistiken',
			children: <RunStatsContent stats={stats} />,
		});
	}, [show]);

	return (
		<>
			{/* Start / Stop button – bottom-left of map */}
			<View style={overlayStyles.buttonContainer} pointerEvents="box-none">
				<TouchableOpacity
					style={[overlayStyles.startStopButton, { backgroundColor: isRecording ? '#e53935' : '#43a047' }]}
					onPress={isRecording ? stopRecording : startRecording}
					activeOpacity={0.8}
				>
					<MaterialIcons name={isRecording ? 'stop' : 'directions-run'} size={26} color="white" />
				</TouchableOpacity>
			</View>

			{/* Live stats bar while recording */}
			{isRecording && (
				<View
					style={[overlayStyles.liveBar, { backgroundColor: theme.screen.background + 'ee' }]}
					pointerEvents="none"
				>
					<View style={overlayStyles.liveStatItem}>
						<MaterialIcons name="timer" size={14} color={theme.screen.icon} />
						<Text style={[overlayStyles.liveStatValue, { color: theme.screen.text }]}>
							{formatDuration(elapsedSeconds)}
						</Text>
					</View>
					<View style={[overlayStyles.liveDivider, { backgroundColor: theme.screen.text + '44' }]} />
					<View style={overlayStyles.liveStatItem}>
						<MaterialIcons name="straighten" size={14} color={theme.screen.icon} />
						<Text style={[overlayStyles.liveStatValue, { color: theme.screen.text }]}>
							{formatDistance(liveDistanceKm)}
						</Text>
					</View>
					<View style={[overlayStyles.liveDivider, { backgroundColor: theme.screen.text + '44' }]} />
					<View style={overlayStyles.liveStatItem}>
						<MaterialIcons name="speed" size={14} color={theme.screen.icon} />
						<Text style={[overlayStyles.liveStatValue, { color: theme.screen.text }]}>
							{liveSpeedKmh != null ? `${liveSpeedKmh.toFixed(1)} km/h` : '-- km/h'}
						</Text>
					</View>
				</View>
			)}
		</>
	);
};

const overlayStyles = StyleSheet.create({
	buttonContainer: {
		position: 'absolute',
		bottom: 32,
		left: 16,
		zIndex: 30,
		elevation: 30,
	},
	startStopButton: {
		width: 52,
		height: 52,
		borderRadius: 26,
		alignItems: 'center',
		justifyContent: 'center',
		shadowColor: '#000',
		shadowOffset: { width: 0, height: 2 },
		shadowOpacity: 0.35,
		shadowRadius: 4,
		elevation: 6,
	},
	liveBar: {
		position: 'absolute',
		bottom: 92,
		left: 8,
		right: 8,
		borderRadius: 10,
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-evenly',
		paddingVertical: 8,
		paddingHorizontal: 12,
		zIndex: 25,
		elevation: 25,
		shadowColor: '#000',
		shadowOffset: { width: 0, height: 1 },
		shadowOpacity: 0.2,
		shadowRadius: 3,
	},
	liveStatItem: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 4,
	},
	liveStatValue: {
		fontSize: 13,
		fontWeight: '600',
	},
	liveDivider: {
		width: 1,
		height: 16,
	},
});

export default JoggingOverlay;
