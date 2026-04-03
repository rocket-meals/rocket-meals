import React, { useCallback, useRef, useState } from 'react';
import {
	Animated,
	Platform,
	ScrollView,
	StyleSheet,
	Text,
	TouchableOpacity,
	View,
} from 'react-native';
import * as Location from 'expo-location';
import * as Notifications from 'expo-notifications';
import { Ionicons, MaterialCommunityIcons, MaterialIcons } from '@expo/vector-icons';
import { SettingsListBoolean, SettingsListGroupTitle, useTheme } from 'repo-depkit-common-ui';
import { useDispatch, useSelector } from 'react-redux';
import { useRouter } from 'expo-router';

import { setTTSEnabled } from '../../../store/ttsSlice';
import { updateSpeechSettings } from '../../../store/speechSettingsSlice';
import { setThemeMode } from '../../../store/themeSlice';
import type { ThemeMode } from '../../../store/themeSlice';
import { setGpsIntervalMode } from '../../../store/gpsIntervalSlice';
import type { GpsIntervalMode } from '../../../store/gpsIntervalSlice';
import type { AppDispatch, RootState } from '../../../store/store';

// ─── Colors ───────────────────────────────────────────────────────────────────

const COLOR_PRIMARY = '#2563eb';
const COLOR_BACK = '#6b7280';

// ─── Step IDs ─────────────────────────────────────────────────────────────────

type StepId =
	| 'welcome'
	| 'gps'
	| 'notifications'
	| 'tts'
	| 'tts_details'
	| 'gps_precision'
	| 'theme'
	| 'finish';

// ─── Permission status helper ─────────────────────────────────────────────────

type PermStatus = 'idle' | 'granted' | 'denied' | 'loading';

// ─── Step: Welcome ────────────────────────────────────────────────────────────

function WelcomeStep({ theme }: { theme: ReturnType<typeof useTheme>['theme'] }) {
	return (
		<View style={styles.stepContent}>
			<View style={[styles.iconCircle, { backgroundColor: COLOR_PRIMARY + '22' }]}>
				<MaterialCommunityIcons name="map-marker-path" size={56} color={COLOR_PRIMARY} />
			</View>
			<Text style={[styles.stepTitle, { color: theme.screen.text }]}>Willkommen bei Geonexia 🗺️</Text>
			<Text style={[styles.stepDescription, { color: theme.screen.text + 'cc' }]}>
				Erkunde die Welt – Schritt für Schritt. Geonexia zeichnet deine Aktivitäten auf und hilft dir, neue
				Bereiche zu entdecken und zu erkunden.{'\n\n'}Dieses kurze Setup richtet die App optimal für dich ein.
				Du kannst alle Einstellungen jederzeit in den Einstellungen anpassen.
			</Text>
		</View>
	);
}

// ─── Step: GPS ────────────────────────────────────────────────────────────────

function GpsStep({
	theme,
	status,
	onRequest,
}: {
	theme: ReturnType<typeof useTheme>['theme'];
	status: PermStatus;
	onRequest: () => void;
}) {
	const statusColor = status === 'granted' ? COLOR_PRIMARY : status === 'denied' ? '#dc2626' : COLOR_PRIMARY;
	const statusLabel =
		status === 'granted'
			? '✅ Berechtigung erteilt'
			: status === 'denied'
			? '❌ Berechtigung verweigert'
			: status === 'loading'
			? '⏳ Wird angefragt…'
			: null;

	return (
		<View style={styles.stepContent}>
			<View style={[styles.iconCircle, { backgroundColor: COLOR_PRIMARY + '22' }]}>
				<MaterialCommunityIcons name="crosshairs-gps" size={56} color={COLOR_PRIMARY} />
			</View>
			<Text style={[styles.stepTitle, { color: theme.screen.text }]}>GPS & Standort 📍</Text>
			<Text style={[styles.stepDescription, { color: theme.screen.text + 'cc' }]}>
				Geonexia benötigt deinen Standort, um deine Aktivitäten aufzuzeichnen und die Karte zu zentrieren.
				{'\n\n'}
				<Text style={{ fontWeight: '600' }}>Im Vordergrund:</Text> Karte zentrieren und Aktivität starten.
				{'\n'}
				<Text style={{ fontWeight: '600' }}>Im Hintergrund:</Text> Aktivität weiter aufzeichnen, wenn du das
				Handy in die Tasche steckst.
			</Text>
			{statusLabel && (
				<Text style={[styles.statusBadge, { color: statusColor }]}>{statusLabel}</Text>
			)}
			{status === 'idle' && (
				<TouchableOpacity
					style={[styles.actionButton, { backgroundColor: COLOR_PRIMARY }]}
					onPress={onRequest}
					activeOpacity={0.85}
				>
					<MaterialCommunityIcons name="crosshairs-gps" size={20} color="#fff" />
					<Text style={styles.actionButtonText}>GPS-Berechtigung erteilen</Text>
				</TouchableOpacity>
			)}
			{status === 'denied' && (
				<Text style={[styles.hintText, { color: theme.screen.text + '99' }]}>
					Du kannst die Berechtigung jederzeit in den Systemeinstellungen aktivieren.
				</Text>
			)}
		</View>
	);
}

// ─── Step: Notifications ──────────────────────────────────────────────────────

function NotificationsStep({
	theme,
	status,
	onRequest,
}: {
	theme: ReturnType<typeof useTheme>['theme'];
	status: PermStatus;
	onRequest: () => void;
}) {
	const statusColor = status === 'granted' ? COLOR_PRIMARY : status === 'denied' ? '#dc2626' : COLOR_PRIMARY;
	const statusLabel =
		status === 'granted'
			? '✅ Benachrichtigungen aktiviert'
			: status === 'denied'
			? '❌ Berechtigung verweigert'
			: status === 'loading'
			? '⏳ Wird angefragt…'
			: null;

	return (
		<View style={styles.stepContent}>
			<View style={[styles.iconCircle, { backgroundColor: COLOR_PRIMARY + '22' }]}>
				<Ionicons name="notifications-outline" size={56} color={COLOR_PRIMARY} />
			</View>
			<Text style={[styles.stepTitle, { color: theme.screen.text }]}>Push-Benachrichtigungen 🔔</Text>
			<Text style={[styles.stepDescription, { color: theme.screen.text + 'cc' }]}>
				Erhalte Benachrichtigungen über neue Errungenschaften, Ziel-Erreichen und wichtige App-Updates.
				{'\n\n'}
				Du kannst Benachrichtigungen jederzeit in den Systemeinstellungen oder in der App deaktivieren.
			</Text>
			{statusLabel && (
				<Text style={[styles.statusBadge, { color: statusColor }]}>{statusLabel}</Text>
			)}
			{status === 'idle' && (
				<TouchableOpacity
					style={[styles.actionButton, { backgroundColor: COLOR_PRIMARY }]}
					onPress={onRequest}
					activeOpacity={0.85}
				>
					<Ionicons name="notifications-outline" size={20} color="#fff" />
					<Text style={styles.actionButtonText}>Benachrichtigungen aktivieren</Text>
				</TouchableOpacity>
			)}
			{status === 'denied' && (
				<Text style={[styles.hintText, { color: theme.screen.text + '99' }]}>
					Du kannst Benachrichtigungen jederzeit in den Systemeinstellungen aktivieren.
				</Text>
			)}
		</View>
	);
}

// ─── Step: TTS ────────────────────────────────────────────────────────────────

function TTSStep({
	theme,
	ttsEnabled,
	onToggle,
}: {
	theme: ReturnType<typeof useTheme>['theme'];
	ttsEnabled: boolean;
	onToggle: (v: boolean) => void;
}) {
	return (
		<View style={styles.stepContent}>
			<View style={[styles.iconCircle, { backgroundColor: COLOR_PRIMARY + '22' }]}>
				<MaterialCommunityIcons name="account-voice" size={56} color={COLOR_PRIMARY} />
			</View>
			<Text style={[styles.stepTitle, { color: theme.screen.text }]}>Sprachansagen 🔊</Text>
			<Text style={[styles.stepDescription, { color: theme.screen.text + 'cc' }]}>
				Geonexia kann während deiner Aktivität Entfernung, Tempo und Dauer ansagen – ganz ohne auf das Display
				zu schauen.{'\n\n'}Möchtest du Sprachansagen aktivieren?
			</Text>
			<View style={styles.toggleCard}>
				<SettingsListBoolean
					iconBgColor={COLOR_PRIMARY}
					leftIcon={<MaterialCommunityIcons name="account-voice" size={22} color="#ffffff" />}
					label="Sprachansagen"
					isEnabled={ttsEnabled}
					onToggle={() => onToggle(!ttsEnabled)}
					valueActive="Aktiviert"
					valueInactive="Deaktiviert"
					groupPosition="single"
				/>
			</View>
			{ttsEnabled && (
				<Text style={[styles.hintText, { color: COLOR_PRIMARY }]}>
					💡 Im nächsten Schritt kannst du festlegen, was angesagt werden soll.
				</Text>
			)}
		</View>
	);
}

// ─── Step: TTS Details ───────────────────────────────────────────────────────

function TTSDetailsStep({
	theme,
	announceDistance,
	announcePace,
	announceDuration,
	announceSpeed,
	onToggleDistance,
	onTogglePace,
	onToggleDuration,
	onToggleSpeed,
}: {
	theme: ReturnType<typeof useTheme>['theme'];
	announceDistance: boolean;
	announcePace: boolean;
	announceDuration: boolean;
	announceSpeed: boolean;
	onToggleDistance: (v: boolean) => void;
	onTogglePace: (v: boolean) => void;
	onToggleDuration: (v: boolean) => void;
	onToggleSpeed: (v: boolean) => void;
}) {
	return (
		<View style={styles.stepContent}>
			<View style={[styles.iconCircle, { backgroundColor: COLOR_PRIMARY + '22' }]}>
				<MaterialIcons name="record-voice-over" size={56} color={COLOR_PRIMARY} />
			</View>
			<Text style={[styles.stepTitle, { color: theme.screen.text }]}>Was soll angesagt werden? 📢</Text>
			<Text style={[styles.stepDescription, { color: theme.screen.text + 'cc' }]}>
				Wähle aus, welche Werte bei deinen Intervall-Ansagen vorgelesen werden sollen.
			</Text>
			<View style={styles.toggleCard}>
				<SettingsListGroupTitle title="Ansage-Inhalte" />
				<SettingsListBoolean
					iconBgColor={COLOR_PRIMARY}
					leftIcon={<MaterialCommunityIcons name="map-marker-distance" size={22} color="#ffffff" />}
					label="Distanz"
					isEnabled={announceDistance}
					onToggle={() => onToggleDistance(!announceDistance)}
					valueActive="Ja"
					valueInactive="Nein"
					groupPosition="top"
				/>
				<SettingsListBoolean
					iconBgColor={COLOR_PRIMARY}
					leftIcon={<MaterialIcons name="speed" size={22} color="#ffffff" />}
					label="Tempo (min/km)"
					isEnabled={announcePace}
					onToggle={() => onTogglePace(!announcePace)}
					valueActive="Ja"
					valueInactive="Nein"
					groupPosition="middle"
				/>
				<SettingsListBoolean
					iconBgColor={COLOR_PRIMARY}
					leftIcon={<Ionicons name="time-outline" size={22} color="#ffffff" />}
					label="Dauer"
					isEnabled={announceDuration}
					onToggle={() => onToggleDuration(!announceDuration)}
					valueActive="Ja"
					valueInactive="Nein"
					groupPosition="middle"
				/>
				<SettingsListBoolean
					iconBgColor={COLOR_PRIMARY}
					leftIcon={<MaterialCommunityIcons name="speedometer" size={22} color="#ffffff" />}
					label="Geschwindigkeit (km/h)"
					isEnabled={announceSpeed}
					onToggle={() => onToggleSpeed(!announceSpeed)}
					valueActive="Ja"
					valueInactive="Nein"
					groupPosition="bottom"
				/>
			</View>
		</View>
	);
}

// ─── Step: GPS Precision ─────────────────────────────────────────────────────

function GpsPrecisionStep({
	theme,
	selected,
	onSelect,
}: {
	theme: ReturnType<typeof useTheme>['theme'];
	selected: GpsIntervalMode;
	onSelect: (mode: GpsIntervalMode) => void;
}) {
	const options: { id: GpsIntervalMode; label: string; description: string; icon: string }[] = [
		{
			id: 'default',
			label: 'Standard (1s)',
			description: 'Gutes Gleichgewicht zwischen Genauigkeit und Akkulaufzeit.',
			icon: 'crosshairs-gps',
		},
		{
			id: 'energy_saving',
			label: 'Energie sparen (4s)',
			description: 'Spart Akku – geringfügig weniger präzise Aufzeichnung.',
			icon: 'battery-heart-outline',
		},
		{
			id: 'high_precision',
			label: 'Hohe Präzision (0.5s)',
			description: 'Maximale Genauigkeit für intensive Aktivitäten – höherer Akkuverbrauch.',
			icon: 'radar',
		},
	];

	return (
		<View style={styles.stepContent}>
			<View style={[styles.iconCircle, { backgroundColor: COLOR_PRIMARY + '22' }]}>
				<MaterialCommunityIcons name="radar" size={56} color={COLOR_PRIMARY} />
			</View>
			<Text style={[styles.stepTitle, { color: theme.screen.text }]}>GPS-Präzision ⚡</Text>
			<Text style={[styles.stepDescription, { color: theme.screen.text + 'cc' }]}>
				Wie oft soll der Standort aktualisiert werden? Dies beeinflusst die Genauigkeit der Aufzeichnung und
				den Akkuverbrauch.
			</Text>
			<View style={styles.optionList}>
				{options.map((opt) => {
					const isSelected = selected === opt.id;
					return (
						<TouchableOpacity
							key={opt.id}
							style={[
								styles.optionCard,
								{
									backgroundColor: isSelected ? COLOR_PRIMARY + '18' : theme.screen.iconBg,
									borderColor: isSelected ? COLOR_PRIMARY : 'transparent',
									borderWidth: 2,
								},
							]}
							onPress={() => onSelect(opt.id)}
							activeOpacity={0.8}
						>
							<View style={[styles.optionIcon, { backgroundColor: isSelected ? COLOR_PRIMARY : COLOR_PRIMARY + '55' }]}>
								<MaterialCommunityIcons name={opt.icon as any} size={24} color="#ffffff" />
							</View>
							<View style={styles.optionText}>
								<Text style={[styles.optionLabel, { color: theme.screen.text }]}>{opt.label}</Text>
								<Text style={[styles.optionDesc, { color: theme.screen.text + '99' }]}>{opt.description}</Text>
							</View>
							{isSelected && <Ionicons name="checkmark-circle" size={24} color={COLOR_PRIMARY} />}
						</TouchableOpacity>
					);
				})}
			</View>
		</View>
	);
}

// ─── Step: Theme ─────────────────────────────────────────────────────────────

function ThemeStep({
	theme,
	selected,
	onSelect,
}: {
	theme: ReturnType<typeof useTheme>['theme'];
	selected: ThemeMode;
	onSelect: (mode: ThemeMode) => void;
}) {
	const options: { id: ThemeMode; label: string; description: string; emoji: string }[] = [
		{
			id: 'light',
			label: 'Hell',
			description: 'Helles Design – ideal für draußen bei Sonnenlicht.',
			emoji: '☀️',
		},
		{
			id: 'dark',
			label: 'Dunkel',
			description: 'Dunkles Design – schont die Augen bei wenig Licht.',
			emoji: '🌙',
		},
		{
			id: 'systematic',
			label: 'System',
			description: 'Folgt automatisch den Systemeinstellungen deines Geräts.',
			emoji: '⚙️',
		},
	];

	return (
		<View style={styles.stepContent}>
			<View style={[styles.iconCircle, { backgroundColor: COLOR_PRIMARY + '22' }]}>
				<MaterialCommunityIcons name="theme-light-dark" size={56} color={COLOR_PRIMARY} />
			</View>
			<Text style={[styles.stepTitle, { color: theme.screen.text }]}>Erscheinungsbild 🎨</Text>
			<Text style={[styles.stepDescription, { color: theme.screen.text + 'cc' }]}>
				Wähle das Erscheinungsbild der App. Du kannst es jederzeit in den Einstellungen ändern.
			</Text>
			<View style={styles.optionList}>
				{options.map((opt) => {
					const isSelected = selected === opt.id;
					return (
						<TouchableOpacity
							key={opt.id}
							style={[
								styles.optionCard,
								{
									backgroundColor: isSelected ? COLOR_PRIMARY + '18' : theme.screen.iconBg,
									borderColor: isSelected ? COLOR_PRIMARY : 'transparent',
									borderWidth: 2,
								},
							]}
							onPress={() => onSelect(opt.id)}
							activeOpacity={0.8}
						>
							<Text style={styles.optionEmoji}>{opt.emoji}</Text>
							<View style={styles.optionText}>
								<Text style={[styles.optionLabel, { color: theme.screen.text }]}>{opt.label}</Text>
								<Text style={[styles.optionDesc, { color: theme.screen.text + '99' }]}>{opt.description}</Text>
							</View>
							{isSelected && <Ionicons name="checkmark-circle" size={24} color={COLOR_PRIMARY} />}
						</TouchableOpacity>
					);
				})}
			</View>
		</View>
	);
}

// ─── Step: Finish ─────────────────────────────────────────────────────────────

function FinishStep({ theme }: { theme: ReturnType<typeof useTheme>['theme'] }) {
	return (
		<View style={styles.stepContent}>
			<View style={[styles.iconCircle, { backgroundColor: COLOR_PRIMARY + '22' }]}>
				<MaterialCommunityIcons name="check-circle-outline" size={56} color={COLOR_PRIMARY} />
			</View>
			<Text style={[styles.stepTitle, { color: theme.screen.text }]}>Alles bereit! 🎉</Text>
			<Text style={[styles.stepDescription, { color: theme.screen.text + 'cc' }]}>
				Super, die Einrichtung ist abgeschlossen. Du kannst jetzt loslegen und deine erste Aktivität aufzeichnen!
				{'\n\n'}
				Alle Einstellungen können jederzeit in den <Text style={{ fontWeight: '600' }}>Einstellungen</Text> angepasst werden.
			</Text>
			<View style={[styles.summaryCard, { backgroundColor: COLOR_PRIMARY + '12' }]}>
				<Text style={[styles.summaryTitle, { color: COLOR_PRIMARY }]}>💡 Tipp</Text>
				<Text style={[styles.summaryText, { color: theme.screen.text + 'cc' }]}>
					Starte eine neue Aktivität über den Hauptscreen. Die Karte zeigt dir in Echtzeit, welche Bereiche du
					bereits erkundet hast – unbekannte Hexagone warten auf dich!
				</Text>
			</View>
		</View>
	);
}

// ─── Progress Bar ─────────────────────────────────────────────────────────────

function ProgressDots({
	total,
	current,
	color,
}: {
	total: number;
	current: number;
	color: string;
}) {
	return (
		<View style={styles.progressDots}>
			{Array.from({ length: total }).map((_, i) => (
				<View
					key={i}
					style={[
						styles.dot,
						{
							backgroundColor: i === current ? color : color + '33',
							width: i === current ? 20 : 8,
						},
					]}
				/>
			))}
		</View>
	);
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function OnboardingScreen() {
	const { theme } = useTheme();
	const dispatch = useDispatch<AppDispatch>();
	const router = useRouter();

	// ─── Redux state ──────────────────────────────────────────────────────────
	const ttsEnabled = useSelector((s: RootState) => s.tts.ttsEnabled);
	const speechSettings = useSelector((s: RootState) => s.speechSettings);
	const selectedTheme = useSelector((s: RootState) => s.theme.selectedMode);
	const selectedGpsMode = useSelector((s: RootState) => s.gpsInterval.selectedMode);

	// ─── Step management ─────────────────────────────────────────────────────
	const [stepIndex, setStepIndex] = useState(0);
	const scrollViewRef = useRef<ScrollView>(null);
	const fadeAnim = useRef(new Animated.Value(1)).current;

	// Build step list dynamically (insert tts_details after tts if enabled)
	const steps: StepId[] = React.useMemo(() => {
		const base: StepId[] = ['welcome', 'gps', 'notifications', 'tts'];
		if (ttsEnabled) base.push('tts_details');
		base.push('gps_precision', 'theme', 'finish');
		return base;
	}, [ttsEnabled]);

	const currentStep = steps[stepIndex];
	const isFirst = stepIndex === 0;
	const isLast = stepIndex === steps.length - 1;

	// ─── Permission states ────────────────────────────────────────────────────
	const [gpsStatus, setGpsStatus] = useState<PermStatus>('idle');
	const [notifStatus, setNotifStatus] = useState<PermStatus>('idle');

	// ─── Animated transition ──────────────────────────────────────────────────
	const animateToStep = useCallback(
		(nextIndex: number) => {
			Animated.sequence([
				Animated.timing(fadeAnim, { toValue: 0, duration: 120, useNativeDriver: true }),
				Animated.timing(fadeAnim, { toValue: 1, duration: 180, useNativeDriver: true }),
			]).start();
			setStepIndex(nextIndex);
			scrollViewRef.current?.scrollTo({ y: 0, animated: false });
		},
		[fadeAnim],
	);

	const handleNext = useCallback(() => {
		if (!isLast) animateToStep(stepIndex + 1);
	}, [isLast, stepIndex, animateToStep]);

	const handleFinish = useCallback(() => {
		router.back();
	}, [router]);

	const handleBack = useCallback(() => {
		if (!isFirst) animateToStep(stepIndex - 1);
	}, [isFirst, stepIndex, animateToStep]);

	// ─── GPS permission ───────────────────────────────────────────────────────
	const handleRequestGps = useCallback(async () => {
		setGpsStatus('loading');
		try {
			const { status: fg } = await Location.requestForegroundPermissionsAsync();
			if (fg !== 'granted') {
				setGpsStatus('denied');
				return;
			}
			if (Platform.OS !== 'web') {
				try {
					await Location.requestBackgroundPermissionsAsync();
				} catch (bgErr) {
					console.warn('[Onboarding] Background location permission failed:', bgErr);
				}
			}
			setGpsStatus('granted');
		} catch (err) {
			console.warn('[Onboarding] GPS permission request failed:', err);
			setGpsStatus('denied');
		}
	}, []);

	// ─── Notification permission ──────────────────────────────────────────────
	const handleRequestNotif = useCallback(async () => {
		setNotifStatus('loading');
		try {
			const { status } = await Notifications.requestPermissionsAsync();
			setNotifStatus(status === 'granted' ? 'granted' : 'denied');
		} catch (err) {
			console.warn('[Onboarding] Notification permission request failed:', err);
			setNotifStatus('denied');
		}
	}, []);

	// ─── TTS toggles ─────────────────────────────────────────────────────────
	const handleTTSToggle = useCallback(
		(v: boolean) => {
			dispatch(setTTSEnabled(v));
		},
		[dispatch],
	);

	const handleToggleDistance = useCallback(
		(v: boolean) => dispatch(updateSpeechSettings({ announceDistance: v })),
		[dispatch],
	);
	const handleTogglePace = useCallback(
		(v: boolean) => dispatch(updateSpeechSettings({ announcePace: v })),
		[dispatch],
	);
	const handleToggleDuration = useCallback(
		(v: boolean) => dispatch(updateSpeechSettings({ announceDuration: v })),
		[dispatch],
	);
	const handleToggleSpeed = useCallback(
		(v: boolean) => dispatch(updateSpeechSettings({ announceSpeed: v })),
		[dispatch],
	);

	// ─── Theme & GPS mode ─────────────────────────────────────────────────────
	const handleSelectTheme = useCallback(
		(mode: ThemeMode) => dispatch(setThemeMode(mode)),
		[dispatch],
	);
	const handleSelectGpsMode = useCallback(
		(mode: GpsIntervalMode) => dispatch(setGpsIntervalMode(mode)),
		[dispatch],
	);

	// ─── Render step content ──────────────────────────────────────────────────
	const renderStep = () => {
		switch (currentStep) {
			case 'welcome':
				return <WelcomeStep theme={theme} />;
			case 'gps':
				return <GpsStep theme={theme} status={gpsStatus} onRequest={handleRequestGps} />;
			case 'notifications':
				return (
					<NotificationsStep theme={theme} status={notifStatus} onRequest={handleRequestNotif} />
				);
			case 'tts':
				return <TTSStep theme={theme} ttsEnabled={ttsEnabled} onToggle={handleTTSToggle} />;
			case 'tts_details':
				return (
					<TTSDetailsStep
						theme={theme}
						announceDistance={speechSettings.announceDistance}
						announcePace={speechSettings.announcePace}
						announceDuration={speechSettings.announceDuration}
						announceSpeed={speechSettings.announceSpeed}
						onToggleDistance={handleToggleDistance}
						onTogglePace={handleTogglePace}
						onToggleDuration={handleToggleDuration}
						onToggleSpeed={handleToggleSpeed}
					/>
				);
			case 'gps_precision':
				return (
					<GpsPrecisionStep theme={theme} selected={selectedGpsMode} onSelect={handleSelectGpsMode} />
				);
			case 'theme':
				return <ThemeStep theme={theme} selected={selectedTheme} onSelect={handleSelectTheme} />;
			case 'finish':
				return <FinishStep theme={theme} />;
		}
	};

	// ─── Render ───────────────────────────────────────────────────────────────

	return (
		<View style={[styles.container, { backgroundColor: theme.screen.background }]}>
			{/* ── Scrollable Content ──────────────────────────────────────── */}
			<ScrollView
				ref={scrollViewRef}
				style={styles.scrollArea}
				contentContainerStyle={styles.scrollContent}
				showsVerticalScrollIndicator={false}
			>
				<Animated.View style={{ opacity: fadeAnim }}>{renderStep()}</Animated.View>
			</ScrollView>

			{/* ── Bottom Navigation ────────────────────────────────────────── */}
			<View style={[styles.bottomBar, { backgroundColor: theme.screen.background, borderTopColor: COLOR_PRIMARY + '33' }]}>
				<ProgressDots total={steps.length} current={stepIndex} color={COLOR_PRIMARY} />
				<View style={styles.navRow}>
					{/* Back */}
					<TouchableOpacity
						style={[
							styles.navButton,
							{
								backgroundColor: isFirst ? 'transparent' : COLOR_BACK + '18',
								opacity: isFirst ? 0 : 1,
							},
						]}
						onPress={handleBack}
						disabled={isFirst}
						activeOpacity={0.8}
					>
						<Ionicons name="arrow-back" size={20} color={COLOR_BACK} />
						<Text style={[styles.navButtonText, { color: COLOR_BACK }]}>Zurück</Text>
					</TouchableOpacity>

					{/* Step label */}
					<Text style={[styles.stepCounter, { color: COLOR_PRIMARY }]}>
						{stepIndex + 1} / {steps.length}
					</Text>

					{/* Next / Finish */}
					{isLast ? (
						<TouchableOpacity
							style={[styles.navButton, styles.navButtonPrimary, { backgroundColor: COLOR_PRIMARY }]}
							onPress={handleFinish}
							activeOpacity={0.85}
						>
							<Text style={styles.navButtonTextWhite}>Fertig</Text>
							<Ionicons name="checkmark" size={20} color="#fff" />
						</TouchableOpacity>
					) : (
						<TouchableOpacity
							style={[styles.navButton, styles.navButtonPrimary, { backgroundColor: COLOR_PRIMARY }]}
							onPress={handleNext}
							activeOpacity={0.85}
						>
							<Text style={styles.navButtonTextWhite}>Weiter</Text>
							<Ionicons name="arrow-forward" size={20} color="#fff" />
						</TouchableOpacity>
					)}
				</View>
			</View>
		</View>
	);
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
	container: {
		flex: 1,
	},
	scrollArea: {
		flex: 1,
	},
	scrollContent: {
		flexGrow: 1,
		paddingBottom: 16,
	},
	stepContent: {
		paddingHorizontal: 24,
		paddingTop: 32,
		alignItems: 'center',
	},
	iconCircle: {
		width: 112,
		height: 112,
		borderRadius: 56,
		alignItems: 'center',
		justifyContent: 'center',
		marginBottom: 24,
	},
	stepTitle: {
		fontSize: 24,
		fontWeight: '700',
		textAlign: 'center',
		marginBottom: 16,
	},
	stepDescription: {
		fontSize: 15,
		lineHeight: 22,
		textAlign: 'center',
		marginBottom: 24,
	},
	statusBadge: {
		fontSize: 15,
		fontWeight: '600',
		marginBottom: 16,
	},
	actionButton: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 10,
		paddingVertical: 14,
		paddingHorizontal: 28,
		borderRadius: 14,
		marginBottom: 16,
	},
	actionButtonText: {
		color: '#ffffff',
		fontSize: 16,
		fontWeight: '700',
	},
	hintText: {
		fontSize: 13,
		textAlign: 'center',
		marginTop: 4,
		paddingHorizontal: 8,
	},
	toggleCard: {
		width: '100%',
		marginBottom: 16,
	},
	optionList: {
		width: '100%',
		gap: 10,
		marginBottom: 8,
	},
	optionCard: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 14,
		padding: 14,
		borderRadius: 14,
	},
	optionIcon: {
		width: 44,
		height: 44,
		borderRadius: 10,
		alignItems: 'center',
		justifyContent: 'center',
	},
	optionEmoji: {
		fontSize: 30,
		width: 44,
		textAlign: 'center',
	},
	optionText: {
		flex: 1,
	},
	optionLabel: {
		fontSize: 15,
		fontWeight: '600',
		marginBottom: 2,
	},
	optionDesc: {
		fontSize: 13,
		lineHeight: 18,
	},
	summaryCard: {
		width: '100%',
		borderRadius: 14,
		padding: 16,
		marginTop: 8,
	},
	summaryTitle: {
		fontSize: 14,
		fontWeight: '700',
		marginBottom: 6,
	},
	summaryText: {
		fontSize: 14,
		lineHeight: 20,
	},
	// ── Bottom Bar ────────────────────────────────────────────────────────────
	bottomBar: {
		borderTopWidth: 1,
		paddingTop: 12,
		paddingBottom: Platform.OS === 'ios' ? 28 : 16,
		paddingHorizontal: 20,
	},
	progressDots: {
		flexDirection: 'row',
		justifyContent: 'center',
		alignItems: 'center',
		gap: 6,
		marginBottom: 12,
	},
	dot: {
		height: 8,
		borderRadius: 4,
	},
	navRow: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
	},
	navButton: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 6,
		paddingVertical: 12,
		paddingHorizontal: 18,
		borderRadius: 12,
		minWidth: 100,
		justifyContent: 'center',
	},
	navButtonPrimary: {
		shadowColor: '#000',
		shadowOffset: { width: 0, height: 2 },
		shadowOpacity: 0.15,
		shadowRadius: 4,
		elevation: 3,
	},
	navButtonText: {
		fontSize: 15,
		fontWeight: '600',
	},
	navButtonTextWhite: {
		fontSize: 15,
		fontWeight: '700',
		color: '#ffffff',
	},
	stepCounter: {
		fontSize: 13,
		fontWeight: '600',
	},
});
