import React, { useEffect, useMemo, useState, useSyncExternalStore } from 'react';
import { Platform, StyleSheet, Text, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { SafeAreaInsetsContext, useSafeAreaInsets } from 'react-native-safe-area-context';
import type { EdgeInsets } from 'react-native-safe-area-context';
import { sqliteKeyValueStorage } from '@/redux/storage/sqliteStorage';

/**
 * Experimental: imitates the screens of the iPhone Duo without a simulator.
 *
 * What is special about the Duo is not the size of its screens (any browser
 * window can be resized to them) but the status bar: in most poses it stands
 * upright along one side, the "rail", and takes 84 pt away from the content.
 * iOS reports it as a safe area inset on that side. A screen that respects the
 * insets gets narrower, a screen that ignores them ends up underneath the bar.
 *
 * So the simulation does exactly two things: it hands every component below it
 * that side inset through the safe area context, and it draws the bar on top.
 * Layout mistakes then show up the way they do on the device.
 *
 * How sure the poses are:
 * - Outer display upright: measured in the iOS simulator (466 x 678 pt, rail
 *   on the right, 84 pt).
 * - Everything else follows Apple's and Expo's descriptions and has not been
 *   checked on a device: the rail also appears when the device is folded and
 *   held sideways and when it is open and held sideways, while the open
 *   display held upright keeps the usual horizontal bar. The sizes of the inner
 *   display are derived from its pixel count. On which side the rail sits when
 *   the folded device is turned is not documented, so both sides can be tried.
 *
 * Limits: it is made for the web build. Natively the SafeAreaView reads the
 * insets from the system and not from this context, so on a phone only the
 * hook based parts follow.
 */

/** Width the upright status bar takes away on its edge, in points. */
export const IPHONE_DUO_VERTICAL_BAR_INSET = 84;

export type IphoneDuoPose = 'outer-portrait' | 'outer-landscape' | 'outer-landscape-left' | 'inner-portrait' | 'inner-landscape';

type PoseDefinition = {
	/** Window size of the pose in points: resize the browser window to this. */
	width: number;
	height: number;
	/** Side the upright status bar stands on, or null for the usual bar on top. */
	rail: 'left' | 'right' | null;
};

export const IPHONE_DUO_POSES: Record<IphoneDuoPose, PoseDefinition> = {
	'outer-portrait': { width: 466, height: 678, rail: 'right' },
	'outer-landscape': { width: 678, height: 466, rail: 'right' },
	'outer-landscape-left': { width: 678, height: 466, rail: 'left' },
	'inner-portrait': { width: 669, height: 951, rail: null },
	'inner-landscape': { width: 951, height: 669, rail: 'right' },
};

export const IPHONE_DUO_POSE_ORDER = Object.keys(IPHONE_DUO_POSES) as IphoneDuoPose[];

const STORAGE_KEY = 'experimental_simulate_iphone_duo';
/**
 * Opens the web app with a pose switched on: `?simulate=iphone-duo` for the
 * outer display upright, `?simulate=iphone-duo-inner-landscape` and so on for
 * the others.
 */
const URL_PARAM = 'simulate';
const URL_PREFIX = 'iphone-duo';

function isPose(value: unknown): value is IphoneDuoPose {
	return typeof value === 'string' && value in IPHONE_DUO_POSES;
}

let pose: IphoneDuoPose | null = null;
const listeners = new Set<() => void>();

function emit() {
	listeners.forEach(listener => listener());
}

function subscribe(listener: () => void) {
	listeners.add(listener);
	return () => {
		listeners.delete(listener);
	};
}

function getSnapshot() {
	return pose;
}

function getPoseRequestedByUrl(): IphoneDuoPose | null {
	if (Platform.OS !== 'web' || typeof window === 'undefined') return null;
	try {
		const value = new URLSearchParams(window.location.search).get(URL_PARAM);
		if (value === URL_PREFIX) return 'outer-portrait';
		const named = value?.startsWith(`${URL_PREFIX}-`) ? value.slice(URL_PREFIX.length + 1) : null;
		return isPose(named) ? named : null;
	} catch {
		return null;
	}
}

/** Switches the simulation to a pose, or off with null. */
export function setIphoneDuoSimulationPose(value: IphoneDuoPose | null) {
	if (pose === value) return;
	pose = value;
	emit();
	// Remembered so a reload keeps the pose; a failed write only costs that.
	Promise.resolve(sqliteKeyValueStorage.setItem(STORAGE_KEY, value ?? '')).catch(() => undefined);
}

export function useIphoneDuoSimulationPose(): IphoneDuoPose | null {
	return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}

/** Clock in the bar, like the one in the real status bar. */
function useClock(active: boolean): string {
	const [now, setNow] = useState(() => new Date());
	useEffect(() => {
		if (!active) return;
		const timer = setInterval(() => setNow(new Date()), 30 * 1000);
		return () => clearInterval(timer);
	}, [active]);
	return `${now.getHours()}:${String(now.getMinutes()).padStart(2, '0')}`;
}

const IphoneDuoSimulation: React.FC<{ children: React.ReactNode }> = ({ children }) => {
	const activePose = useIphoneDuoSimulationPose();
	const rail = activePose ? IPHONE_DUO_POSES[activePose].rail : null;
	const realInsets = useSafeAreaInsets();
	const clock = useClock(rail !== null);

	useEffect(() => {
		const requested = getPoseRequestedByUrl();
		if (requested) {
			setIphoneDuoSimulationPose(requested);
			return;
		}
		let cancelled = false;
		Promise.resolve(sqliteKeyValueStorage.getItem(STORAGE_KEY))
			.then(stored => {
				if (!cancelled && isPose(stored)) {
					pose = stored;
					emit();
				}
			})
			.catch(() => undefined);
		return () => {
			cancelled = true;
		};
	}, []);

	const insets: EdgeInsets = useMemo(
		() => ({
			...realInsets,
			left: rail === 'left' ? Math.max(realInsets.left, IPHONE_DUO_VERTICAL_BAR_INSET) : realInsets.left,
			right: rail === 'right' ? Math.max(realInsets.right, IPHONE_DUO_VERTICAL_BAR_INSET) : realInsets.right,
		}),
		[realInsets, rail]
	);

	if (!rail) {
		return <>{children}</>;
	}

	return (
		<SafeAreaInsetsContext.Provider value={insets}>
			{children}
			{/* Drawn last and without touch handling: like the real bar it covers
			    whatever a screen wrongly places under it, and taps go through. */}
			<View pointerEvents="none" style={[styles.bar, rail === 'left' ? styles.barLeft : styles.barRight]} testID="iphone-duo-vertical-bar">
				<View style={styles.pill}>
					<Text style={styles.clock}>{clock}</Text>
					<MaterialCommunityIcons name="wifi" size={26} color="#000000" />
				</View>
			</View>
		</SafeAreaInsetsContext.Provider>
	);
};

const styles = StyleSheet.create({
	bar: {
		// Above everything, sheets and modals included, as on the device. On the
		// web those are rendered into the page body, hence the fixed position.
		position: Platform.OS === 'web' ? ('fixed' as 'absolute') : 'absolute',
		zIndex: 2147483647,
		elevation: 100,
		top: 0,
		bottom: 0,
		width: IPHONE_DUO_VERTICAL_BAR_INSET,
		alignItems: 'center',
		paddingTop: 22,
	},
	barLeft: {
		left: 0,
	},
	barRight: {
		right: 0,
	},
	pill: {
		width: 56,
		paddingVertical: 14,
		borderRadius: 28,
		alignItems: 'center',
		gap: 6,
		backgroundColor: 'rgba(255,255,255,0.82)',
	},
	clock: {
		fontSize: 15,
		fontWeight: '700',
		color: '#000000',
	},
});

export default IphoneDuoSimulation;
