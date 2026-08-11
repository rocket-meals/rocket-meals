import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
	Animated,
	Easing,
	StyleSheet,
	Text,
	TouchableOpacity,
	useWindowDimensions,
	View,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import Svg, { Circle, Defs, LinearGradient as SvgLinearGradient, RadialGradient, Stop } from 'react-native-svg';
import { useTheme } from 'repo-depkit-common-ui';
import { useDispatch } from 'react-redux';
import { setOnboardingCompleted } from '../store/appSettingsSlice';
import type { AppDispatch } from '../store/store';
import { ComponentIds } from '../constants/ComponentIds';
import { getCustomerConfig } from '../config';

const PRIMARY_COLOR = '#2563eb';
const HERO_SIZE = 230;

type OnboardingStep = {
	icon: keyof typeof Ionicons.glyphMap;
	accent: string;
	accentSoft: string;
	badge: string;
	title: string;
	text: string;
};

// First-launch tour: one card per core area of the app. Shown by the gate in
// app/_layout.tsx until `appSettings.onboardingCompleted` is true; the settings
// screen can reset that flag to replay the tour ("Einführung erneut ansehen").
function buildSteps(appName: string): OnboardingStep[] {
	return [
		{
			icon: 'game-controller-outline',
			accent: '#2563eb',
			accentSoft: '#7c3aed',
			badge: 'Privat & werbefrei',
			title: `Willkommen bei ${appName}`,
			text: 'Dein Punktezähler für Brett-, Karten- und Würfelspiele. Alle Daten bleiben nur auf deinem Gerät - keine Konten, keine Werbung, kein Tracking.',
		},
		{
			icon: 'dice-outline',
			accent: '#16a34a',
			accentSoft: '#0d9488',
			badge: 'Runde für Runde',
			title: 'Spiele & Partien',
			text: 'Lege deine Lieblingsspiele an, starte Partien und erfasse Punkte Runde für Runde. Beendete Partien landen automatisch in der Historie des Spiels.',
		},
		{
			icon: 'people-outline',
			accent: '#f59e0b',
			accentSoft: '#f43f5e',
			badge: 'Zusammen spielen',
			title: 'Freunde',
			text: 'Speichere deine Mitspieler mit Name, Farbe und Avatar. Beim nächsten Spieleabend sind alle mit einem Tipp wieder am Tisch.',
		},
		{
			icon: 'stopwatch-outline',
			accent: '#dc2626',
			accentSoft: '#f97316',
			badge: 'Immer griffbereit',
			title: 'Timer & Würfel',
			text: 'Stoppuhr, Countdown und digitale Würfel sind eingebaut - für Spiele mit Zeitdruck oder wenn mal ein Würfel fehlt.',
		},
	];
}

// Faint game-themed icons scattered around the edges of the screen. Positions
// are fractions of the window size so the pattern scales from phone to web.
const FLOATING_DECOR: ReadonlyArray<{
	icon: keyof typeof Ionicons.glyphMap;
	x: number;
	y: number;
	size: number;
	rotate: string;
	color: string;
	duration: number;
}> = [
	{ icon: 'dice-outline', x: 0.07, y: 0.12, size: 34, rotate: '-14deg', color: '#7c3aed', duration: 3800 },
	{ icon: 'trophy-outline', x: 0.84, y: 0.16, size: 30, rotate: '12deg', color: '#f59e0b', duration: 4400 },
	{ icon: 'extension-puzzle-outline', x: 0.1, y: 0.34, size: 26, rotate: '9deg', color: '#16a34a', duration: 4000 },
	{ icon: 'star-outline', x: 0.88, y: 0.36, size: 22, rotate: '-12deg', color: '#dc2626', duration: 3400 },
	{ icon: 'game-controller-outline', x: 0.05, y: 0.76, size: 30, rotate: '10deg', color: '#2563eb', duration: 4600 },
	{ icon: 'timer-outline', x: 0.86, y: 0.7, size: 26, rotate: '-9deg', color: '#0d9488', duration: 3600 },
	{ icon: 'medal-outline', x: 0.13, y: 0.56, size: 20, rotate: '-6deg', color: '#f43f5e', duration: 4200 },
	{ icon: 'heart-outline', x: 0.83, y: 0.52, size: 18, rotate: '8deg', color: '#ef4444', duration: 3900 },
];

// Three soft color blobs per step, crossfaded by the shared `progress` value.
function StepBackdrop({
	step,
	index,
	width,
	height,
	isDark,
}: {
	step: OnboardingStep;
	index: number;
	width: number;
	height: number;
	isDark: boolean;
}) {
	// SVG gradient ids are document-global on web, so they must be unique per step.
	const idA = `onboarding-blob-a-${index}`;
	const idB = `onboarding-blob-b-${index}`;
	const idC = `onboarding-blob-c-${index}`;
	const opacityA = isDark ? 0.38 : 0.26;
	const opacityB = isDark ? 0.3 : 0.2;
	const opacityC = isDark ? 0.22 : 0.14;
	return (
		<Svg width={width} height={height} style={StyleSheet.absoluteFill}>
			<Defs>
				<RadialGradient id={idA} cx="50%" cy="50%" r="50%">
					<Stop offset="0%" stopColor={step.accent} stopOpacity={opacityA} />
					<Stop offset="100%" stopColor={step.accent} stopOpacity={0} />
				</RadialGradient>
				<RadialGradient id={idB} cx="50%" cy="50%" r="50%">
					<Stop offset="0%" stopColor={step.accentSoft} stopOpacity={opacityB} />
					<Stop offset="100%" stopColor={step.accentSoft} stopOpacity={0} />
				</RadialGradient>
				<RadialGradient id={idC} cx="50%" cy="50%" r="50%">
					<Stop offset="0%" stopColor={step.accentSoft} stopOpacity={opacityC} />
					<Stop offset="100%" stopColor={step.accentSoft} stopOpacity={0} />
				</RadialGradient>
			</Defs>
			<Circle cx={width * 0.85} cy={height * 0.02} r={width * 0.72} fill={`url(#${idA})`} />
			<Circle cx={width * 0.05} cy={height * 0.45} r={width * 0.66} fill={`url(#${idB})`} />
			<Circle cx={width * 0.75} cy={height * 0.95} r={width * 0.6} fill={`url(#${idC})`} />
		</Svg>
	);
}

function FloatingIcon({
	item,
	width,
	height,
	isDark,
}: {
	item: (typeof FLOATING_DECOR)[number];
	width: number;
	height: number;
	isDark: boolean;
}) {
	const anim = useRef(new Animated.Value(0)).current;

	useEffect(() => {
		const loop = Animated.loop(
			Animated.sequence([
				Animated.timing(anim, {
					toValue: 1,
					duration: item.duration,
					easing: Easing.inOut(Easing.sin),
					useNativeDriver: true,
				}),
				Animated.timing(anim, {
					toValue: 0,
					duration: item.duration,
					easing: Easing.inOut(Easing.sin),
					useNativeDriver: true,
				}),
			]),
		);
		loop.start();
		return () => loop.stop();
	}, [anim, item.duration]);

	const translateY = anim.interpolate({ inputRange: [0, 1], outputRange: [-7, 7] });

	return (
		<Animated.View
			pointerEvents="none"
			style={{
				position: 'absolute',
				left: width * item.x,
				top: height * item.y,
				opacity: isDark ? 0.3 : 0.22,
				transform: [{ translateY }, { rotate: item.rotate }],
			}}
		>
			<Ionicons name={item.icon} size={item.size} color={item.color} />
		</Animated.View>
	);
}

export default function OnboardingScreen() {
	const { theme, isDark } = useTheme();
	const insets = useSafeAreaInsets();
	const dispatch = useDispatch<AppDispatch>();
	const { width, height } = useWindowDimensions();
	const [stepIndex, setStepIndex] = useState(0);

	const steps = buildSteps(getCustomerConfig().projectName);
	const step = steps[stepIndex] ?? steps[0];
	const isLastStep = stepIndex === steps.length - 1;

	// Drives the backdrop crossfade and the progress dots; follows stepIndex.
	const progress = useRef(new Animated.Value(0)).current;
	// Fade/slide-in of the card content on every step change (and first mount).
	const contentAnim = useRef(new Animated.Value(0)).current;
	// Endless slow spin of the dashed orbit ring around the hero icon.
	const ringAnim = useRef(new Animated.Value(0)).current;

	useEffect(() => {
		Animated.timing(progress, {
			toValue: stepIndex,
			duration: 420,
			easing: Easing.out(Easing.cubic),
			useNativeDriver: false,
		}).start();
	}, [stepIndex, progress]);

	useEffect(() => {
		contentAnim.setValue(0);
		Animated.timing(contentAnim, {
			toValue: 1,
			duration: 380,
			easing: Easing.out(Easing.cubic),
			useNativeDriver: true,
		}).start();
	}, [stepIndex, contentAnim]);

	useEffect(() => {
		const loop = Animated.loop(
			Animated.timing(ringAnim, {
				toValue: 1,
				duration: 16000,
				easing: Easing.linear,
				useNativeDriver: true,
			}),
		);
		loop.start();
		return () => loop.stop();
	}, [ringAnim]);

	const backdropOpacities = useMemo(
		() =>
			steps.map((_, index) =>
				progress.interpolate({
					inputRange: [index - 1, index, index + 1],
					outputRange: [0, 1, 0],
					extrapolate: 'clamp',
				}),
			),
		[progress, steps.length],
	);

	const contentSlide = contentAnim.interpolate({ inputRange: [0, 1], outputRange: [24, 0] });
	const ringRotation = ringAnim.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });

	const handleFinish = useCallback(() => {
		dispatch(setOnboardingCompleted(true));
	}, [dispatch]);

	const handleNext = useCallback(() => {
		if (stepIndex === steps.length - 1) {
			handleFinish();
			return;
		}
		setStepIndex((index) => index + 1);
	}, [stepIndex, steps.length, handleFinish]);

	const handleBack = useCallback(() => {
		setStepIndex((index) => Math.max(0, index - 1));
	}, []);

	return (
		<View style={[styles.container, { backgroundColor: theme.screen.background }]}>
			<StatusBar style="auto" />

			<View style={StyleSheet.absoluteFill} pointerEvents="none">
				{steps.map((backdropStep, index) => (
					<Animated.View
						key={backdropStep.title}
						style={[StyleSheet.absoluteFill, { opacity: backdropOpacities[index] }]}
					>
						<StepBackdrop step={backdropStep} index={index} width={width} height={height} isDark={isDark} />
					</Animated.View>
				))}
				{FLOATING_DECOR.map((item) => (
					<FloatingIcon key={item.icon} item={item} width={width} height={height} isDark={isDark} />
				))}
			</View>

			<View
				style={[
					styles.inner,
					{
						paddingTop: insets.top + 16,
						paddingBottom: insets.bottom + 24,
						paddingLeft: insets.left + 24,
						paddingRight: insets.right + 24,
					},
				]}
			>
				<View style={styles.skipRow}>
					<TouchableOpacity
						nativeID={ComponentIds.ONBOARDING_SKIP_BUTTON}
						onPress={handleFinish}
						hitSlop={12}
						accessibilityRole="button"
					>
						<Text style={[styles.skipText, { color: theme.screen.placeholder }]}>Überspringen</Text>
					</TouchableOpacity>
				</View>

				<Animated.View
					style={[styles.content, { opacity: contentAnim, transform: [{ translateY: contentSlide }] }]}
				>
					<View style={styles.heroWrap}>
						<Svg width={HERO_SIZE} height={HERO_SIZE}>
							<Defs>
								<RadialGradient id={`onboarding-hero-glow-${stepIndex}`} cx="50%" cy="50%" r="50%">
									<Stop offset="55%" stopColor={step.accent} stopOpacity={isDark ? 0.32 : 0.2} />
									<Stop offset="100%" stopColor={step.accent} stopOpacity={0} />
								</RadialGradient>
								<SvgLinearGradient id={`onboarding-hero-fill-${stepIndex}`} x1="0%" y1="0%" x2="100%" y2="100%">
									<Stop offset="0%" stopColor={step.accent} />
									<Stop offset="100%" stopColor={step.accentSoft} />
								</SvgLinearGradient>
							</Defs>
							<Circle
								cx={HERO_SIZE / 2}
								cy={HERO_SIZE / 2}
								r={HERO_SIZE / 2}
								fill={`url(#onboarding-hero-glow-${stepIndex})`}
							/>
							<Circle
								cx={HERO_SIZE / 2}
								cy={HERO_SIZE / 2}
								r={78}
								fill={`url(#onboarding-hero-fill-${stepIndex})`}
							/>
							{/* Soft highlight so the gradient disc reads as a glossy sphere */}
							<Circle cx={HERO_SIZE / 2 - 26} cy={HERO_SIZE / 2 - 30} r={44} fill="#ffffff" fillOpacity={0.14} />
						</Svg>
						<Animated.View
							pointerEvents="none"
							style={[StyleSheet.absoluteFill, { transform: [{ rotate: ringRotation }] }]}
						>
							<Svg width={HERO_SIZE} height={HERO_SIZE}>
								<Circle
									cx={HERO_SIZE / 2}
									cy={HERO_SIZE / 2}
									r={97}
									stroke={step.accent}
									strokeOpacity={0.5}
									strokeWidth={2}
									strokeDasharray="2 10"
									strokeLinecap="round"
									fill="none"
								/>
							</Svg>
						</Animated.View>
						<View style={styles.heroIcon} pointerEvents="none">
							<Ionicons name={step.icon} size={78} color="#ffffff" />
						</View>
						<View style={[styles.satellite, styles.satelliteTopRight]}>
							<Ionicons name="sparkles" size={16} color={step.accentSoft} />
						</View>
						<View style={[styles.satellite, styles.satelliteBottomLeft, { backgroundColor: step.accentSoft }]}>
							<Ionicons name="star" size={14} color="#ffffff" />
						</View>
						<View style={[styles.satelliteDot, { backgroundColor: step.accent }]} />
					</View>

					<View style={[styles.badge, { backgroundColor: step.accent + '1A', borderColor: step.accent + '33' }]}>
						<Text style={[styles.badgeText, { color: step.accent }]}>{step.badge}</Text>
					</View>
					<Text style={[styles.title, { color: theme.screen.text }]}>{step.title}</Text>
					<Text style={[styles.text, { color: theme.screen.placeholder }]}>{step.text}</Text>
				</Animated.View>

				<View style={styles.dotsRow}>
					{steps.map((dotStep, index) => (
						<Animated.View
							key={dotStep.title}
							style={[
								styles.dot,
								{
									width: progress.interpolate({
										inputRange: [index - 1, index, index + 1],
										outputRange: [10, 28, 10],
										extrapolate: 'clamp',
									}),
									backgroundColor: progress.interpolate({
										inputRange: [index - 1, index, index + 1],
										outputRange: [theme.screen.border, dotStep.accent, theme.screen.border],
										extrapolate: 'clamp',
									}),
								},
							]}
						/>
					))}
				</View>

				<View style={styles.buttonRow}>
					{stepIndex > 0 ? (
						<TouchableOpacity
							nativeID={ComponentIds.ONBOARDING_BACK_BUTTON}
							style={[styles.backButton, { borderColor: theme.screen.border }]}
							onPress={handleBack}
							activeOpacity={0.7}
							accessibilityRole="button"
						>
							<Ionicons name="arrow-back" size={22} color={theme.screen.text} />
						</TouchableOpacity>
					) : (
						<View style={styles.backButtonPlaceholder} />
					)}
					<TouchableOpacity
						nativeID={ComponentIds.ONBOARDING_NEXT_BUTTON}
						style={[styles.nextButton, { backgroundColor: PRIMARY_COLOR }]}
						onPress={handleNext}
						activeOpacity={0.8}
						accessibilityRole="button"
					>
						<Text style={styles.nextButtonText}>{isLastStep ? "Los geht's!" : 'Weiter'}</Text>
						{!isLastStep && <Ionicons name="arrow-forward" size={20} color="#ffffff" />}
					</TouchableOpacity>
				</View>
			</View>
		</View>
	);
}

const styles = StyleSheet.create({
	container: {
		flex: 1,
	},
	inner: {
		flex: 1,
	},
	skipRow: {
		flexDirection: 'row',
		justifyContent: 'flex-end',
	},
	skipText: {
		fontSize: 16,
	},
	content: {
		flex: 1,
		justifyContent: 'center',
		alignItems: 'center',
		gap: 18,
	},
	heroWrap: {
		width: HERO_SIZE,
		height: HERO_SIZE,
		justifyContent: 'center',
		alignItems: 'center',
	},
	heroIcon: {
		...StyleSheet.absoluteFill,
		justifyContent: 'center',
		alignItems: 'center',
	},
	satellite: {
		position: 'absolute',
		width: 34,
		height: 34,
		borderRadius: 17,
		backgroundColor: '#ffffff',
		justifyContent: 'center',
		alignItems: 'center',
		shadowColor: '#000000',
		shadowOffset: { width: 0, height: 3 },
		shadowOpacity: 0.18,
		shadowRadius: 6,
		elevation: 5,
	},
	satelliteTopRight: {
		top: 14,
		right: 10,
	},
	satelliteBottomLeft: {
		bottom: 22,
		left: 6,
		width: 30,
		height: 30,
		borderRadius: 15,
	},
	satelliteDot: {
		position: 'absolute',
		top: 40,
		left: 22,
		width: 12,
		height: 12,
		borderRadius: 6,
	},
	badge: {
		borderRadius: 999,
		borderWidth: 1,
		paddingHorizontal: 14,
		paddingVertical: 6,
	},
	badgeText: {
		fontSize: 13,
		fontWeight: '700',
		letterSpacing: 0.4,
		textTransform: 'uppercase',
	},
	title: {
		fontSize: 30,
		fontWeight: '800',
		textAlign: 'center',
	},
	text: {
		fontSize: 17,
		lineHeight: 25,
		textAlign: 'center',
		maxWidth: 480,
	},
	dotsRow: {
		flexDirection: 'row',
		justifyContent: 'center',
		alignItems: 'center',
		gap: 8,
		marginBottom: 24,
	},
	dot: {
		height: 10,
		borderRadius: 5,
	},
	buttonRow: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 12,
	},
	backButton: {
		width: 54,
		height: 54,
		borderRadius: 27,
		borderWidth: 1,
		justifyContent: 'center',
		alignItems: 'center',
	},
	backButtonPlaceholder: {
		width: 54,
		height: 54,
	},
	nextButton: {
		flex: 1,
		height: 54,
		borderRadius: 27,
		flexDirection: 'row',
		justifyContent: 'center',
		alignItems: 'center',
		gap: 8,
	},
	nextButtonText: {
		color: '#ffffff',
		fontSize: 18,
		fontWeight: '600',
	},
});
