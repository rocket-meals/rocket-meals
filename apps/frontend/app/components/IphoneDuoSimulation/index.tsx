import React, { useEffect, useMemo, useState, useSyncExternalStore } from 'react';
import { Platform, StyleSheet, Text, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { SafeAreaInsetsContext, useSafeAreaInsets } from 'react-native-safe-area-context';
import type { EdgeInsets } from 'react-native-safe-area-context';
import { sqliteKeyValueStorage } from '@/redux/storage/sqliteStorage';

/**
 * Experimental: imitates the outer display of the iPhone Duo without a
 * simulator.
 *
 * What is special about that display is not its size (466 x 678 pt, any browser
 * window can be resized to that) but the status bar: it stands upright along
 * the right edge and takes 84 pt away from the content. iOS reports it as the
 * right safe area inset. A screen that respects the insets gets narrower, a
 * screen that ignores them ends up underneath the bar.
 *
 * So the simulation does exactly two things: it hands every component below it
 * that right inset through the safe area context, and it draws the bar on top.
 * Layout mistakes then show up the way they do on the device.
 *
 * Limits: it is made for the web build. Natively the SafeAreaView reads the
 * insets from the system and not from this context, so on a phone only the
 * hook based parts follow. The inner display needs no simulation, it behaves
 * like a small tablet.
 */

/** Size of the outer display in points, as the iOS simulator reports it. */
export const IPHONE_DUO_OUTER_SIZE = { width: 466, height: 678 } as const;
/** Width the upright status bar takes away on the right edge, in points. */
export const IPHONE_DUO_VERTICAL_BAR_INSET = 84;

const STORAGE_KEY = 'experimental_simulate_iphone_duo';
/** Opens the web app with the simulation switched on: `?simulate=iphone-duo`. */
const URL_PARAM = 'simulate';
const URL_VALUE = 'iphone-duo';

let enabled = false;
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
	return enabled;
}

function isRequestedByUrl(): boolean {
	if (Platform.OS !== 'web' || typeof window === 'undefined') return false;
	try {
		return new URLSearchParams(window.location.search).get(URL_PARAM) === URL_VALUE;
	} catch {
		return false;
	}
}

export function setIphoneDuoSimulationEnabled(value: boolean) {
	if (enabled === value) return;
	enabled = value;
	emit();
	// Remembered so a reload keeps the mode; a failed write only costs that.
	Promise.resolve(sqliteKeyValueStorage.setItem(STORAGE_KEY, value ? '1' : '0')).catch(() => undefined);
}

export function useIphoneDuoSimulationEnabled(): boolean {
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
	const active = useIphoneDuoSimulationEnabled();
	const realInsets = useSafeAreaInsets();
	const clock = useClock(active);

	useEffect(() => {
		if (isRequestedByUrl()) {
			setIphoneDuoSimulationEnabled(true);
			return;
		}
		let cancelled = false;
		Promise.resolve(sqliteKeyValueStorage.getItem(STORAGE_KEY))
			.then(stored => {
				if (!cancelled && stored === '1') {
					enabled = true;
					emit();
				}
			})
			.catch(() => undefined);
		return () => {
			cancelled = true;
		};
	}, []);

	const insets: EdgeInsets = useMemo(
		() => ({ ...realInsets, right: Math.max(realInsets.right, IPHONE_DUO_VERTICAL_BAR_INSET) }),
		[realInsets]
	);

	if (!active) {
		return <>{children}</>;
	}

	return (
		<SafeAreaInsetsContext.Provider value={insets}>
			{children}
			{/* Drawn last and without touch handling: like the real bar it covers
			    whatever a screen wrongly places under it, and taps go through. */}
			<View pointerEvents="none" style={styles.bar} testID="iphone-duo-vertical-bar">
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
		right: 0,
		bottom: 0,
		width: IPHONE_DUO_VERTICAL_BAR_INSET,
		alignItems: 'center',
		paddingTop: 22,
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
