import LottieView from 'lottie-react-native';
import { StyleProp } from 'react-native/Libraries/StyleSheet/StyleSheet';
import { ViewStyle } from 'react-native/Libraries/StyleSheet/StyleSheetTypes';
import { Text, View } from '@/components/Themed';
import React, { useEffect, useRef, useState } from 'react';
import axios from 'axios';
import { useIsPerformanceMode } from '@/states/SynchedPerformanceMode';

/**
 * Type definition for the component's props.
 */
export type MyLottieAnimationProps = {
    accessibilityLabel: string,
    style: StyleProp<ViewStyle>,
    url?: string,
    source?: any,
    colorReplaceMap?: {[key: string]: string},
	projectColor?: string,
    loop?: boolean,
	speed?: number,
    autoPlay?: boolean,
    animationRef?: any,
	zoom?: number,
}

export const DEFAULT_COLOR_TO_BE_REPLACED = '#FF00FF';
export const DEFAULT_COLOR_LIGHTER_TO_BE_REPLACED = '#FFAAFF';
export const DEFAULT_COLOR_DARKER_TO_BE_REPLACED = '#DD00DD';
export const DEFAULT_COLOR_TO_REPLACE_WITH = '#D14610';

/**
 * A component that displays a Lottie animation, with support for dynamic source fetching,
 * color replacement, looping, and autoplay features. It also adapts to a "performance mode" by disabling animations.
 *
 * @param style - The style of the animation container.
 * @param url - The URL to fetch the Lottie animation JSON from.
 * @param source - The Lottie animation JSON to use directly.
 * @param animationRef - A ref to control the Lottie animation programmatically.
 * @param colorReplaceMap - A map of original colors to replacement colors, both in hex format (e.g. {"#FF00FF": "#00FF00"}).
 * @param loop - Whether the animation should loop.
 * @param {MyLottieAnimationProps} props - Component props including styles, animation URL/source, and configurations.
 */
export const MyLottieAnimation = ({
	style, url, source, animationRef, colorReplaceMap, loop, zoom, ...props
}: MyLottieAnimationProps) => {
	// State to manage performance mode.
	const animationsDisabled = false;
	const isPerformanceMode = useIsPerformanceMode();

	// Ref to control the Lottie animation programmatically.
	const animation = useRef(null);

	// Use provided colorReplaceMap or initialize as empty if not provided.
	let usedColorReplaceMap = colorReplaceMap;

	// Default to true if loop is not explicitly set.
	const usedLoop = loop === undefined ? true : loop;
	// Default to true if autoPlay is not explicitly set.
	let usedAutoPlay = props.autoPlay === undefined ? true : props.autoPlay;
	usedAutoPlay = isPerformanceMode ? false : usedAutoPlay;

	const speed = props.speed || 1;

	// State for managing animation source.
	const [usedSource, setUsedSource] = useState(source);
	const [reloadnumber, setReloadnumber] = useState(0);

	const [dimensions, setDimensions] = useState({width: 0, height: 0});

	// Styles for the animation container.
	const styleAnimationContainer: StyleProp<ViewStyle> = {
			width: "100%",
			height: "100%",
		overflow: "hidden",
	}
	const mergedStyle: StyleProp<ViewStyle> = [styleAnimationContainer, style];

	// Styles used when in performance mode.
	const mergedPerformanceStyle: StyleProp<ViewStyle> = [style, {
		borderColor: 'black',
		borderWidth: 1,
		justifyContent: 'center',
		alignItems: 'center',
	}];

	// Return a simplified view when in performance mode.
	if (animationsDisabled) {
		return (
			<View style={mergedPerformanceStyle}>
				<Text>
					{'Animation disabled'}
				</Text>
				<Text>
					{'Deactivate performance mode to see animations'}
				</Text>
			</View>
		)
	}

	/**
     * Converts a hex color string to a Lottie-compatible color array.
     * @param {string} hex - The hex color string.
     * @returns {number[]} An array representing the RGB values scaled to [0,1].
     */
	function hexToLottieColor(hex: string): number[] {
		const r = (parseInt(hex.slice(1, 3), 16) / 255).toFixed(4);
		const g = (parseInt(hex.slice(3, 5), 16) / 255).toFixed(4);
		const b = (parseInt(hex.slice(5, 7), 16) / 255).toFixed(4);
		return [parseFloat(r), parseFloat(g), parseFloat(b)];
	}

	// Default colors for replacement (not used in this snippet but might be part of a larger context).

	if (!usedColorReplaceMap) {
		usedColorReplaceMap = {};
	}

	const usedColorReplaceMapAfter: {[key: string]: number[]} = {};

	// Convert the provided colorReplaceMap to Lottie's required format.
	for (const color in colorReplaceMap) {
		usedColorReplaceMapAfter[hexToLottieColor(color).toString()] = hexToLottieColor(colorReplaceMap[color]);
	}

	/**
     * Recursively replaces colors in the Lottie JSON using the provided color map.
     * @param {any} lottieJSON - The Lottie JSON to modify.
     * @param {{[key: string]: number[]}} colorReplaceMap - A map of original colors to replacement colors.
     * @returns {any} The modified Lottie JSON.
     */
	function replaceColorsInLottie(lottieJSON: any, colorReplaceMap: {[key: string]: number[]}) {
		if (Array.isArray(lottieJSON)) {
			for (let i = 0; i < lottieJSON.length; i++) {
				lottieJSON[i] = replaceColorsInLottie(lottieJSON[i], colorReplaceMap);
			}
		} else if (typeof lottieJSON === 'object' && lottieJSON !== null) {
			for (const key in lottieJSON) {
				if (key === 'c') {
					if (lottieJSON[key].a === 0 && colorReplaceMap[lottieJSON[key].k.toString()]) {
						lottieJSON[key].k = colorReplaceMap[lottieJSON[key].k.toString()];
					}
				} else {
					lottieJSON[key] = replaceColorsInLottie(lottieJSON[key], colorReplaceMap);
				}
			}
		}
		return lottieJSON;
	}

	// Effect hook to play the animation on mount.
	useEffect(() => {
		animation.current?.play();
	}, []);

	// Effect hook to download animation data if URL is provided and not in performance mode.
	useEffect(() => {
		if (!animationsDisabled) {
			downloadInformations();
		}
	}, [url, animationsDisabled])

	// Cleanup effect for when the component unmounts.
	useEffect(() => {
		return () => {
			setUsedSource(undefined);
		}
	}, [])

	/**
     * Fetches the Lottie animation JSON from a provided URL.
     */
	async function downloadInformations() {
		if (!source && !!url) {
			try {
				const answer = await axios.get(url);
				const data = answer.data;
				setUsedSource(data);
				setReloadnumber(reloadnumber + 1);
			} catch (err) {
				// Handle error (not implemented here)
			}
		}
	}

	// Prepare the Lottie source with colors replaced as needed.
	const lottieJSONCopy = usedSource ? JSON.parse(JSON.stringify(usedSource)) : {};
	const coloredSource = replaceColorsInLottie(lottieJSONCopy, usedColorReplaceMapAfter);

	const usedZoom = zoom || 1;

	return (
		<View style={mergedStyle} onLayout={(event) => {
			setDimensions({
				width: event.nativeEvent.layout.width,
				height: event.nativeEvent.layout.height,
			});
		}}>
			<View style={{
				position: "absolute",
				justifyContent: "center",
				alignItems: "center",
				left: dimensions.width/2-usedZoom*dimensions.width/2, // Center the animation
				top: dimensions.height/2-usedZoom*dimensions.height/2, // Center the animation
				width: dimensions.width*usedZoom,
				height: dimensions.height*usedZoom,
			}}>
				<LottieView
					key={reloadnumber + ''}
					autoPlay={usedAutoPlay}
					speed={speed}
					loop={usedLoop}
					ref={animation}
					resizeMode={"contain"}
					webStyle={{
						height: dimensions.height*usedZoom,
						width: dimensions.width*usedZoom,
					}}
					style={{
						height: dimensions.height*usedZoom,
						width: dimensions.width*usedZoom,
					}}
					source={coloredSource}
				/>
			</View>
		</View>
	)
}
