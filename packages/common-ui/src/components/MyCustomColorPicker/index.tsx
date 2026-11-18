import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { GestureResponderEvent, LayoutChangeEvent, PanResponder, Platform, StyleSheet, TextInput, View } from 'react-native';
import { BottomSheetTextInput } from '@gorhom/bottom-sheet';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';
import { useTheme } from '../../context/ThemeContext';
import { FontHelper } from '../../helpers/FontHelper';

// Text inputs inside the bottom-sheet modal must use BottomSheetTextInput so the
// sheet lifts above the keyboard (plain TextInputs are invisible to the sheet's
// keyboard tracking). Web has no sheet keyboard handling, so it keeps TextInput.
const ResolvedTextInput = Platform.OS === 'web' ? TextInput : BottomSheetTextInput;

/**
 * MyCustomColorPicker — a dependency-free custom color selector.
 *
 * Layout (top to bottom, mirroring common design-tool pickers):
 *   1. Saturation/value surface: the current hue as base color, blended to white
 *      towards the left and to black towards the bottom, with a draggable thumb.
 *   2. Hue slider: a rainbow gradient strip with a draggable thumb.
 *   3. Hex input row: a text field accepting '#rrggbb' / 'rrggbb' / '#rgb' values,
 *      next to a live preview swatch of the current color.
 *
 * Implemented with react-native-svg gradients + PanResponder only — deliberately
 * no external color-picker library. Touch coordinates are derived from pageX/pageY
 * relative to the surface measured via measureInWindow, because locationX/locationY
 * is unreliable during move events on web (it becomes relative to whichever child
 * element — e.g. the thumb — is under the pointer).
 */

type Hsv = { h: number; s: number; v: number };

function clamp(value: number, min: number, max: number): number {
	return Math.min(max, Math.max(min, value));
}

function hsvToRgb({ h, s, v }: Hsv): { r: number; g: number; b: number } {
	const c = v * s;
	const hh = (h % 360) / 60;
	const x = c * (1 - Math.abs((hh % 2) - 1));
	let r = 0, g = 0, b = 0;
	if (hh >= 0 && hh < 1) { r = c; g = x; }
	else if (hh < 2) { r = x; g = c; }
	else if (hh < 3) { g = c; b = x; }
	else if (hh < 4) { g = x; b = c; }
	else if (hh < 5) { r = x; b = c; }
	else { r = c; b = x; }
	const m = v - c;
	return {
		r: Math.round((r + m) * 255),
		g: Math.round((g + m) * 255),
		b: Math.round((b + m) * 255),
	};
}

function rgbToHsv(r: number, g: number, b: number): Hsv {
	const rn = r / 255, gn = g / 255, bn = b / 255;
	const max = Math.max(rn, gn, bn);
	const min = Math.min(rn, gn, bn);
	const d = max - min;
	let h = 0;
	if (d !== 0) {
		if (max === rn) h = 60 * (((gn - bn) / d) % 6);
		else if (max === gn) h = 60 * ((bn - rn) / d + 2);
		else h = 60 * ((rn - gn) / d + 4);
	}
	if (h < 0) h += 360;
	const s = max === 0 ? 0 : d / max;
	return { h, s, v: max };
}

function componentToHex(c: number): string {
	return c.toString(16).padStart(2, '0');
}

export function hsvToHex(hsv: Hsv): string {
	const { r, g, b } = hsvToRgb(hsv);
	return `#${componentToHex(r)}${componentToHex(g)}${componentToHex(b)}`;
}

/** Parses '#rrggbb', 'rrggbb', '#rgb' or 'rgb'. Returns null for invalid input. */
export function hexToHsv(hex: string): Hsv | null {
	const raw = hex.trim().replace(/^#/, '');
	let full = raw;
	if (/^[0-9a-fA-F]{3}$/.test(raw)) {
		full = raw.split('').map((ch) => ch + ch).join('');
	}
	if (!/^[0-9a-fA-F]{6}$/.test(full)) return null;
	const r = Number.parseInt(full.slice(0, 2), 16);
	const g = Number.parseInt(full.slice(2, 4), 16);
	const b = Number.parseInt(full.slice(4, 6), 16);
	return rgbToHsv(r, g, b);
}

/** Normalizes user hex input to '#rrggbb' lowercase, or null if invalid. */
export function normalizeHexColor(hex: string): string | null {
	const hsv = hexToHsv(hex);
	if (!hsv) return null;
	const raw = hex.trim().replace(/^#/, '').toLowerCase();
	const full = raw.length === 3 ? raw.split('').map((ch) => ch + ch).join('') : raw;
	return `#${full}`;
}

const SV_SURFACE_HEIGHT = 200;
const SV_THUMB_SIZE = 24;
const HUE_TRACK_HEIGHT = 16;
const HUE_THUMB_SIZE = 24;
/** Rainbow stops at 0°, 60°, 120°, 180°, 240°, 300°, 360°. */
const HUE_GRADIENT_STOPS = ['#ff0000', '#ffff00', '#00ff00', '#00ffff', '#0000ff', '#ff00ff', '#ff0000'];

export type MyCustomColorPickerProps = {
	/** Currently selected color as '#rrggbb' (or without '#'). */
	color?: string | null;
	/** Called with '#rrggbb' whenever the user picks a valid color (drag, hue change, or valid hex input). */
	onColorChange: (hex: string) => void;
};

/**
 * Creates a PanResponder that claims the gesture (so the surrounding bottom-sheet
 * scroll view does not steal vertical drags) and reports page coordinates.
 */
function useSurfacePanResponder(onTouch: (pageX: number, pageY: number) => void) {
	const handlerRef = useRef(onTouch);
	handlerRef.current = onTouch;
	return useMemo(
		() =>
			PanResponder.create({
				onStartShouldSetPanResponder: () => true,
				onMoveShouldSetPanResponder: () => true,
				onPanResponderTerminationRequest: () => false,
				onPanResponderGrant: (e: GestureResponderEvent) => {
					handlerRef.current(e.nativeEvent.pageX, e.nativeEvent.pageY);
				},
				onPanResponderMove: (e: GestureResponderEvent) => {
					handlerRef.current(e.nativeEvent.pageX, e.nativeEvent.pageY);
				},
			}),
		[],
	);
}

const MyCustomColorPicker: React.FC<MyCustomColorPickerProps> = ({ color, onColorChange }) => {
	const { theme } = useTheme();

	const initialHsv = useMemo<Hsv>(() => (color ? hexToHsv(color) : null) ?? { h: 200, s: 0.75, v: 0.75 }, []);
	const [hsv, setHsv] = useState<Hsv>(initialHsv);
	const [hexText, setHexText] = useState<string>(hsvToHex(initialHsv));
	// Keep the latest hsv accessible inside the async measureInWindow callbacks.
	const hsvRef = useRef(hsv);
	hsvRef.current = hsv;
	/** Last color emitted via onColorChange — used to ignore prop echoes of our own updates. */
	const lastEmittedRef = useRef<string | null>(color ? normalizeHexColor(color) : null);

	// Sync from the outside only when the prop changes to a color we did not just emit
	// (e.g. the parent switches the edited color key).
	useEffect(() => {
		if (!color) return;
		const normalized = normalizeHexColor(color);
		if (!normalized || normalized === lastEmittedRef.current) return;
		const nextHsv = hexToHsv(normalized);
		if (nextHsv) {
			lastEmittedRef.current = normalized;
			setHsv(nextHsv);
			setHexText(normalized);
		}
	}, [color]);

	const emit = useCallback(
		(next: Hsv) => {
			setHsv(next);
			const hex = hsvToHex(next);
			setHexText(hex);
			lastEmittedRef.current = hex;
			onColorChange(hex);
		},
		[onColorChange],
	);

	// ── Saturation/value surface ──────────────────────────────────────────────
	const svSizeRef = useRef({ width: 0, height: SV_SURFACE_HEIGHT });
	const svViewRef = useRef<React.ComponentRef<typeof View>>(null);
	const [svWidth, setSvWidth] = useState(0);

	const handleSvLayout = useCallback((e: LayoutChangeEvent) => {
		svSizeRef.current.width = e.nativeEvent.layout.width;
		setSvWidth(e.nativeEvent.layout.width);
	}, []);

	const handleSvTouch = useCallback(
		(pageX: number, pageY: number) => {
			svViewRef.current?.measureInWindow((x, y) => {
				const { width, height } = svSizeRef.current;
				if (width <= 0 || height <= 0) return;
				const s = clamp((pageX - x) / width, 0, 1);
				const v = clamp(1 - (pageY - y) / height, 0, 1);
				emit({ ...hsvRef.current, s, v });
			});
		},
		[emit],
	);
	const svPanResponder = useSurfacePanResponder(handleSvTouch);

	// ── Hue slider ────────────────────────────────────────────────────────────
	const hueSizeRef = useRef({ width: 0 });
	const hueViewRef = useRef<React.ComponentRef<typeof View>>(null);
	const [hueWidth, setHueWidth] = useState(0);

	const handleHueLayout = useCallback((e: LayoutChangeEvent) => {
		hueSizeRef.current.width = e.nativeEvent.layout.width;
		setHueWidth(e.nativeEvent.layout.width);
	}, []);

	const handleHueTouch = useCallback(
		(pageX: number) => {
			hueViewRef.current?.measureInWindow((x) => {
				const { width } = hueSizeRef.current;
				if (width <= 0) return;
				const h = clamp((pageX - x) / width, 0, 1) * 360;
				emit({ ...hsvRef.current, h });
			});
		},
		[emit],
	);
	const huePanResponder = useSurfacePanResponder(handleHueTouch);

	// ── Hex input ─────────────────────────────────────────────────────────────
	const handleHexTextChange = useCallback(
		(text: string) => {
			setHexText(text);
			const nextHsv = hexToHsv(text);
			if (nextHsv) {
				const normalized = normalizeHexColor(text)!;
				lastEmittedRef.current = normalized;
				setHsv(nextHsv);
				onColorChange(normalized);
			}
		},
		[onColorChange],
	);

	const currentHex = hsvToHex(hsv);
	const hueHex = hsvToHex({ h: hsv.h, s: 1, v: 1 });
	const isHexTextValid = hexToHsv(hexText) !== null;

	const svThumbLeft = clamp(hsv.s * svWidth - SV_THUMB_SIZE / 2, -SV_THUMB_SIZE / 2, svWidth - SV_THUMB_SIZE / 2);
	const svThumbTop = clamp((1 - hsv.v) * SV_SURFACE_HEIGHT - SV_THUMB_SIZE / 2, -SV_THUMB_SIZE / 2, SV_SURFACE_HEIGHT - SV_THUMB_SIZE / 2);
	const hueThumbLeft = clamp((hsv.h / 360) * hueWidth - HUE_THUMB_SIZE / 2, -HUE_THUMB_SIZE / 2, hueWidth - HUE_THUMB_SIZE / 2);

	return (
		<View style={styles.container}>
			{/* Saturation/value surface */}
			<View
				ref={svViewRef}
				style={styles.svSurface}
				onLayout={handleSvLayout}
				collapsable={false}
				{...svPanResponder.panHandlers}
			>
				{svWidth > 0 && (
					<Svg width={svWidth} height={SV_SURFACE_HEIGHT}>
						<Defs>
							<LinearGradient id="svWhite" x1="0" y1="0" x2="1" y2="0">
								<Stop offset="0" stopColor="#ffffff" stopOpacity="1" />
								<Stop offset="1" stopColor="#ffffff" stopOpacity="0" />
							</LinearGradient>
							<LinearGradient id="svBlack" x1="0" y1="0" x2="0" y2="1">
								<Stop offset="0" stopColor="#000000" stopOpacity="0" />
								<Stop offset="1" stopColor="#000000" stopOpacity="1" />
							</LinearGradient>
						</Defs>
						<Rect x="0" y="0" width={svWidth} height={SV_SURFACE_HEIGHT} fill={hueHex} />
						<Rect x="0" y="0" width={svWidth} height={SV_SURFACE_HEIGHT} fill="url(#svWhite)" />
						<Rect x="0" y="0" width={svWidth} height={SV_SURFACE_HEIGHT} fill="url(#svBlack)" />
					</Svg>
				)}
				<View
					pointerEvents="none"
					style={[styles.svThumb, { left: svThumbLeft, top: svThumbTop, backgroundColor: currentHex }]}
				/>
			</View>

			{/* Hue slider */}
			<View
				ref={hueViewRef}
				style={styles.hueTrackWrapper}
				onLayout={handleHueLayout}
				collapsable={false}
				{...huePanResponder.panHandlers}
			>
				{hueWidth > 0 && (
					<View style={styles.hueTrack}>
						<Svg width={hueWidth} height={HUE_TRACK_HEIGHT}>
							<Defs>
								<LinearGradient id="hue" x1="0" y1="0" x2="1" y2="0">
									{HUE_GRADIENT_STOPS.map((stop, index) => (
										<Stop key={index} offset={`${index / (HUE_GRADIENT_STOPS.length - 1)}`} stopColor={stop} />
									))}
								</LinearGradient>
							</Defs>
							<Rect x="0" y="0" width={hueWidth} height={HUE_TRACK_HEIGHT} fill="url(#hue)" />
						</Svg>
					</View>
				)}
				<View
					pointerEvents="none"
					style={[styles.hueThumb, { left: hueThumbLeft, backgroundColor: hueHex }]}
				/>
			</View>

			{/* Hex input + preview swatch */}
			<View style={styles.hexRow}>
				<ResolvedTextInput
					style={[
						styles.hexInput,
						{
							color: theme.screen.text,
							borderColor: isHexTextValid ? theme.screen.text + '33' : '#ef4444',
						},
					]}
					value={hexText}
					onChangeText={handleHexTextChange}
					placeholder="#2596be"
					placeholderTextColor={theme.screen.text + '66'}
					autoCapitalize="none"
					autoCorrect={false}
					maxLength={7}
				/>
				<View style={[styles.previewSwatch, { backgroundColor: currentHex, borderColor: theme.screen.text + '22' }]} />
			</View>
		</View>
	);
};

const styles = StyleSheet.create({
	container: {
		width: '100%',
		paddingHorizontal: 12,
		paddingVertical: 12,
		gap: 16,
	},
	svSurface: {
		width: '100%',
		height: SV_SURFACE_HEIGHT,
		borderRadius: 12,
		overflow: 'hidden',
	},
	svThumb: {
		position: 'absolute',
		width: SV_THUMB_SIZE,
		height: SV_THUMB_SIZE,
		borderRadius: SV_THUMB_SIZE / 2,
		borderWidth: 3,
		borderColor: '#ffffff',
		shadowColor: '#000000',
		shadowOffset: { width: 0, height: 1 },
		shadowOpacity: 0.35,
		shadowRadius: 2,
		elevation: 3,
	},
	hueTrackWrapper: {
		width: '100%',
		height: HUE_THUMB_SIZE,
		justifyContent: 'center',
	},
	hueTrack: {
		height: HUE_TRACK_HEIGHT,
		borderRadius: HUE_TRACK_HEIGHT / 2,
		overflow: 'hidden',
	},
	hueThumb: {
		position: 'absolute',
		top: 0,
		width: HUE_THUMB_SIZE,
		height: HUE_THUMB_SIZE,
		borderRadius: HUE_THUMB_SIZE / 2,
		borderWidth: 3,
		borderColor: '#ffffff',
		shadowColor: '#000000',
		shadowOffset: { width: 0, height: 1 },
		shadowOpacity: 0.35,
		shadowRadius: 2,
		elevation: 3,
	},
	hexRow: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 12,
	},
	hexInput: {
		flex: 1,
		fontFamily: FontHelper.getMonospaceFontFamily(),
		fontSize: 14,
		paddingHorizontal: 12,
		paddingVertical: 10,
		borderWidth: 1,
		borderRadius: 10,
	},
	previewSwatch: {
		width: 44,
		height: 44,
		borderRadius: 10,
		borderWidth: 1,
	},
});

export default MyCustomColorPicker;
