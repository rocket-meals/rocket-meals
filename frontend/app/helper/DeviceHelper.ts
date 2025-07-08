import {Dimensions, PixelRatio, useWindowDimensions} from 'react-native';
import {EdgeInsets, useSafeAreaInsets} from 'react-native-safe-area-context';
import {Devices} from '@rocket-meals/shared';
import * as DeviceInfo from 'expo-device';
import {DeviceType} from 'expo-device';
import usePlatformHelper from '@/helper/platformHelper';

/**
 * Defines the breakpoints for responsive design.
 * @returns {BreakPointsDictionary<number>} An object with keys as breakpoint names and values as the corresponding widths in pixels.
 */
export function getDimensionWidthBreakPoints(): BreakPointsDictionary<number> {
	return {
		[BreakPoint.sm]: 576,
		[BreakPoint.md]: 768,
		[BreakPoint.lg]: 992,
		[BreakPoint.xl]: 1200,
		[BreakPoint.xxl]: 1400
	};
}

/**
 * Custom hook to determine if the device has a large screen.
 * @returns {boolean} True if the screen width is greater than or equal to the large breakpoint, false otherwise.
 */
export function useIsLargeDevice(): boolean {
	return useBreakPointValue({
		[BreakPoint.sm]: false,
		[BreakPoint.xxl]: true,
	});
}

// Enumeration of possible breakpoint names.
export enum BreakPoint {
    sm = 'sm',
    md = 'md',
    lg = 'lg',
    xl = 'xl',
    xxl = 'xxl'
}

/**
 * Defines a type for a dictionary where 'sm' breakpoint is required and other breakpoints are optional.
 * @template T The type of values associated with each breakpoint.
 */
export type BreakPointsDictionary<T> = {
    [P in Exclude<BreakPoint, BreakPoint.sm>]?: T;
} & {
    [BreakPoint.sm]: T; // Making 'sm' required
};

/**
 * Generates a sorted list of breakpoints from smallest to largest based on their associated widths.
 * @returns {BreakPoint[]} An ordered array of breakpoints from smallest to largest width.
 */
function getSmallestToLargestBreakPointList(): BreakPoint[] {
	const widthBreakPoints: BreakPointsDictionary<number> = getDimensionWidthBreakPoints();
	const widthToBreakPoint: { width: number, breakPoint: BreakPoint }[] = [];
	for (const breakPoint in widthBreakPoints) {
		const width: number | undefined = widthBreakPoints[breakPoint as BreakPoint];
		if (width !== undefined) {
			widthToBreakPoint.push({width, breakPoint: breakPoint as BreakPoint});
		}
	}
	widthToBreakPoint.sort((a, b) => a.width - b.width);
	return widthToBreakPoint.map(value => value.breakPoint);
}

/**
 * Custom hook to obtain the value associated with the current breakpoint.
 * @template T The type of value to be returned based on the current breakpoint.
 * @param {BreakPointsDictionary<T>} breakPoints An object mapping breakpoints to their corresponding values.
 * @returns {T} The value associated with the current screen width's breakpoint.
 */
export function useBreakPointValue<T>(breakPoints: BreakPointsDictionary<T>): T {
	const dimensions = useWindowDimensions();
	const scale = dimensions.scale;
	const widthUnscaled = dimensions.width; // the unscaled width is our reference how "big" the screen is, for fingers size
	const widthScaled = widthUnscaled * scale; // the scaled width is how fine and detailed the screen is to the eye

	const widthBreakPoints: BreakPointsDictionary<number> = getDimensionWidthBreakPoints();

	const breakPointOrder = getSmallestToLargestBreakPointList().reverse(); // From largest to smallest for iteration.

	for (let i = 0; i < breakPointOrder.length; i++) {
		const breakPoint = breakPointOrder[i];
		const width: number | undefined = widthBreakPoints[breakPoint];
		if (width && widthUnscaled >= width) {
			const valueOfBreakPoint = breakPoints[breakPoint]
			if (valueOfBreakPoint) {
				return valueOfBreakPoint;
			}
		}
	}

	return breakPoints[BreakPoint.sm];
}

/**
 * Custom hook to obtain the safe area insets of the current device screen.
 * @returns {EdgeInsets} An object representing the safe area insets of the screen.
 */
export function useInsets(): EdgeInsets {
	const insets = useSafeAreaInsets();

	return {
		top: insets.top,
		right: insets.right,
		bottom: insets.bottom,
		left: insets.left,
	};
}

export function getIsLandScape(): boolean {
    const { isWeb } = usePlatformHelper();
	const windowWidth = Dimensions.get('screen').width;
	const windowHeight = Dimensions.get('screen').height;
	let isLandscape = windowWidth > windowHeight;
	if (isWeb()) {
		isLandscape = windowWidth > windowHeight;
	}
	return isLandscape;
}

export function getCurrentDevice(deviceInformationsId: string | undefined, devices: any): Devices | undefined {
	let foundDevice: undefined | Devices = undefined;
	if (deviceInformationsId) {
		for (const device of devices) {
			if (getDeviceIdentifier(device) === deviceInformationsId) {
				foundDevice = device;
				break;
			}
		}
	}
	return foundDevice;
}

export function getDeviceIdentifier(device: Partial<Devices>) {
	return device.platform+'_'+device.brand+'_'+device.system_version;
}

export function getDeviceInformationWithoutPushToken(): Partial<Devices> { // Promise<DeviceInformationType>
	const { getPlatformDisplayName, isIOS, isAndroid, isWeb } = usePlatformHelper();
    const windowWidth = Dimensions.get('screen').width;
	const windowHeight = Dimensions.get('screen').height;
	const windowScale = Dimensions.get('screen').scale;
	const isSimulator = !DeviceInfo.isDevice
	const isTablet = DeviceInfo.deviceType === DeviceType.TABLET;
	const brand = DeviceInfo.brand;
	const platform = getPlatformDisplayName();
	const systemVersion = DeviceInfo.osVersion;
	let isLandscape = getIsLandScape();

	/**
	 * ATTENTION !!!
	 * VERY IMPORTANT !!!
	 * If we are accessing other values for the device, please update the app.json expo.ios.privacyManifests
	 *
	 * https://docs.expo.dev/guides/apple-privacy/
	 * https://developer.apple.com/documentation/bundleresources/privacy_manifest_files/describing_use_of_required_reason_api
	 */
	return {
		display_width: windowWidth,
		display_height: windowHeight,
		display_scale: windowScale,
		display_pixelratio: PixelRatio.get(),
		display_fontscale: PixelRatio.getFontScale(),
		is_simulator: isSimulator,
		is_tablet: isTablet,
		is_landscape: isLandscape,
		brand: brand,
		platform: platform,
		system_version: systemVersion,
		is_ios: isIOS(),
		is_android: isAndroid(),
		is_web: isWeb(),
	}
}