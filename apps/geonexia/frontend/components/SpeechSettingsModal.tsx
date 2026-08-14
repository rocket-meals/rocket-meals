import React, { useCallback, useEffect, useState } from 'react';
import {
	Keyboard,
	ScrollView,
	StyleSheet,
	Text,
	TouchableOpacity,
	Vibration,
	View,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons, MaterialIcons } from '@expo/vector-icons';
import {
	SettingsList,
	SettingsListBoolean,
	SettingsListGroupTitle,
	SettingsListSelectOption,
	useMyScrollViewModal,
	useTheme,
} from 'repo-depkit-common-ui';
import type { SettingsListItemBaseProps } from 'repo-depkit-common-ui';
import { useDispatch, useSelector } from 'react-redux';
import { getLocales } from 'expo-localization';

import ModalTextInput from './ModalTextInput';
import { updateSpeechSettings, SpeechSettingsState } from '../store/speechSettingsSlice';
import type { SpeechRate } from '../store/speechSettingsSlice';
import { speakAnnouncement, buildPeriodicAnnouncement, speechRateToNumber } from '../helpers/TTSHelper';
import type { AppDispatch, RootState } from '../store/store';

// ─── Constants ────────────────────────────────────────────────────────────────

const TTS_COLOR = '#0369a1';
const INTERVAL_COLOR = '#7c3aed';
const CONTENT_COLOR = '#16a34a';
const HINT_COLOR = '#d97706';
const VOLUME_COLOR = '#2563eb';
const VOLUME_STEP = 0.1;
const VOLUME_MIN = 0.0;
const VOLUME_MAX = 1.0;
const PREVIEW_VIBRATION_DURATION_MS = 400;

const SPEECH_RATE_OPTIONS: Array<{ id: SpeechRate; label: string }> = [
	{ id: 'slow', label: 'Langsam' },
	{ id: 'normal', label: 'Normal' },
	{ id: 'fast', label: 'Schnell' },
];

// Sample stats used for preview announcements in settings
const SAMPLE_STATS = {
	distanceKm: 2.5,
	elapsedSeconds: 1500,
	paceMinPerKm: 5.5,
	speedKmh: 10.9,
} as const;

// ─── PaceMinSecModal ──────────────────────────────────────────────────────────

/** Pace value shared between the pace input row and the modal it opens. */
interface PaceValue {
	minutes: number;
	seconds: number;
}

interface PaceMinSecModalProps extends PaceValue {
	onSave: (minutes: number, seconds: number) => void;
	primaryColor: string;
	saveLabel?: string;
}

function PaceMinSecModal({
	minutes,
	seconds,
	onSave,
	primaryColor,
	saveLabel = 'Speichern',
}: Readonly<PaceMinSecModalProps>) {
	const { theme } = useTheme();
	const [mins, setMins] = useState(minutes);
	const [secs, setSecs] = useState(seconds);

	useEffect(() => {
		setMins(minutes);
		setSecs(seconds);
	}, [minutes, seconds]);

	const stepMins = useCallback((delta: number) => {
		setMins((v) => Math.max(0, Math.min(99, v + delta)));
	}, []);

	const stepSecs = useCallback((delta: number) => {
		setSecs((v) => Math.max(0, Math.min(59, v + delta)));
	}, []);

	const handleSave = useCallback(() => {
		Keyboard.dismiss();
		onSave(mins, secs);
	}, [onSave, mins, secs]);

	const content = (
		<View style={styles.paceSheetView}>
			<View style={styles.paceRow}>
				{/* Minutes */}
				<View style={styles.paceField}>
					<Text style={[styles.paceFieldLabel, { color: theme.sheet.text }]}>Minuten</Text>
					<View style={styles.paceInputRow}>
						<TouchableOpacity
							style={[styles.paceStepBtn, { backgroundColor: primaryColor + '20' }]}
							onPress={() => stepMins(-1)}
						>
							<Ionicons name="remove" size={18} color={primaryColor} />
						</TouchableOpacity>
						<ModalTextInput
							style={[
								styles.paceInput,
								{
									color: theme.sheet.text,
									backgroundColor: theme.sheet.inputBg,
									borderColor: theme.sheet.inputBorder,
								},
							]}
							value={String(mins)}
							onChangeText={(t) => {
								const n = Number.parseInt(t, 10);
								if (!Number.isNaN(n)) setMins(Math.max(0, Math.min(99, n)));
							}}
							keyboardType="number-pad"
							textAlign="center"
						/>
						<TouchableOpacity
							style={[styles.paceStepBtn, { backgroundColor: primaryColor + '20' }]}
							onPress={() => stepMins(1)}
						>
							<Ionicons name="add" size={18} color={primaryColor} />
						</TouchableOpacity>
					</View>
					<Text style={[styles.paceSuffix, { color: theme.sheet.placeholder }]}>min</Text>
				</View>

				<Text style={[styles.paceSeparator, { color: theme.sheet.text }]}>:</Text>

				{/* Seconds */}
				<View style={styles.paceField}>
					<Text style={[styles.paceFieldLabel, { color: theme.sheet.text }]}>Sekunden</Text>
					<View style={styles.paceInputRow}>
						<TouchableOpacity
							style={[styles.paceStepBtn, { backgroundColor: primaryColor + '20' }]}
							onPress={() => stepSecs(-5)}
						>
							<Ionicons name="remove" size={18} color={primaryColor} />
						</TouchableOpacity>
						<ModalTextInput
							style={[
								styles.paceInput,
								{
									color: theme.sheet.text,
									backgroundColor: theme.sheet.inputBg,
									borderColor: theme.sheet.inputBorder,
								},
							]}
							value={String(secs)}
							onChangeText={(t) => {
								const n = Number.parseInt(t, 10);
								if (!Number.isNaN(n)) setSecs(Math.max(0, Math.min(59, n)));
							}}
							keyboardType="number-pad"
							textAlign="center"
						/>
						<TouchableOpacity
							style={[styles.paceStepBtn, { backgroundColor: primaryColor + '20' }]}
							onPress={() => stepSecs(5)}
						>
							<Ionicons name="add" size={18} color={primaryColor} />
						</TouchableOpacity>
					</View>
					<Text style={[styles.paceSuffix, { color: theme.sheet.placeholder }]}>sek</Text>
				</View>
			</View>

			<TouchableOpacity
				style={[styles.paceSaveBtn, { backgroundColor: primaryColor }]}
				onPress={handleSave}
				activeOpacity={0.8}
			>
				<Text style={styles.paceSaveBtnText}>{saveLabel}</Text>
			</TouchableOpacity>
		</View>
	);

	return content;
}

// ─── PaceMinSecInput ──────────────────────────────────────────────────────────

interface PaceMinSecInputProps extends PaceValue, Pick<SettingsListItemBaseProps, 'iconBgColor' | 'leftIcon'> {
	label: string;
	modalTitle?: string;
	onSave: (minutes: number, seconds: number) => void;
	disabled?: boolean;
	groupPosition?: 'top' | 'middle' | 'bottom' | 'single';
	primaryColor?: string;
}

function PaceMinSecInput({
	iconBgColor,
	leftIcon,
	label,
	modalTitle,
	minutes,
	seconds,
	onSave,
	disabled,
	groupPosition,
	primaryColor = HINT_COLOR,
}: Readonly<PaceMinSecInputProps>) {
	const { theme } = useTheme();
	const { show, close } = useMyScrollViewModal();

	const handleOpen = useCallback(() => {
		if (disabled) return;
		show({
			title: modalTitle ?? label,
			onClose: close,
			children: (
				<PaceMinSecModal
					minutes={minutes}
					seconds={seconds}
					onSave={(m, s) => {
						onSave(m, s);
						close();
					}}
					primaryColor={primaryColor}
				/>
			),
		});
	}, [disabled, show, close, modalTitle, label, minutes, seconds, onSave, primaryColor]);

	return (
		<SettingsList
			iconBgColor={iconBgColor}
			leftIcon={leftIcon}
			label={label}
			value={`${minutes} min ${String(seconds).padStart(2, '0')} sek`}
			rightIcon={
				<MaterialCommunityIcons name="pencil" size={20} color={theme.screen.icon} />
			}
			onPress={disabled ? undefined : handleOpen}
			groupPosition={groupPosition}
		/>
	);
}

// ─── SpeechSettingsContent ────────────────────────────────────────────────────

export default function SpeechSettingsContent() {
	const dispatch = useDispatch<AppDispatch>();
	const settings = useSelector((state: RootState) => state.speechSettings);

	const locale = getLocales()[0]?.languageTag ?? 'en-US';
	const langCode = locale.split('-')[0].toLowerCase();

	const update = useCallback(
		(partial: Partial<SpeechSettingsState>) => {
			dispatch(updateSpeechSettings(partial));
		},
		[dispatch],
	);

	// ─── Play sample announcement ─────────────────────────────────────────────
	const handlePlaySample = useCallback(() => {
		const text =
			langCode === 'de'
				? '2 Kilometer. Pace: 5 Minuten und 30 Sekunden.'
				: '2 kilometers. Pace: 5 minutes and 30 seconds.';
		speakAnnouncement(text, langCode, {
			volume: settings.volume,
			rate: speechRateToNumber(settings.speechRate),
			useApplicationAudioSession: settings.duckMusicDuringTTS,
		});
	}, [langCode, settings.volume, settings.speechRate, settings.duckMusicDuringTTS]);

	// ─── Play content example (based on enabled toggles) ─────────────────────
	const handlePlayContentSample = useCallback(() => {
		const text = buildPeriodicAnnouncement(
			langCode,
			SAMPLE_STATS,
			{
				announceDistance: settings.announceDistance,
				announcePace: settings.announcePace,
				announceDuration: settings.announceDuration,
				announceSpeed: settings.announceSpeed,
				announceCalories: settings.announceCalories,
				announceHeartRate: settings.announceHeartRate,
				announcePaceAvg: settings.announcePaceAvg,
				announceSpeedAvg: settings.announceSpeedAvg,
			},
		);
		if (!text) return;
		speakAnnouncement(text, langCode, {
			volume: settings.volume,
			rate: speechRateToNumber(settings.speechRate),
			useApplicationAudioSession: settings.duckMusicDuringTTS,
		});
	}, [langCode, settings]);

	// ─── Play faster hint example ─────────────────────────────────────────────
	const handlePlayFasterSample = useCallback(() => {
		const text =
			langCode === 'de'
				? 'Zu schnell. Aktuelle Pace 4 Minuten 30 Sekunden. Ziel Pace 5 Minuten 30 Sekunden.'
				: 'Too fast. Current pace 4 minutes 30 seconds. Target pace 5 minutes 30 seconds.';
		speakAnnouncement(text, langCode, {
			volume: settings.volume,
			rate: speechRateToNumber(settings.speechRate),
			useApplicationAudioSession: settings.duckMusicDuringTTS,
		});
	}, [langCode, settings.volume, settings.speechRate, settings.duckMusicDuringTTS]);

	// ─── Play slower hint example ─────────────────────────────────────────────
	const handlePlaySlowerSample = useCallback(() => {
		const text =
			langCode === 'de'
				? 'Zu langsam. Aktuelle Pace 6 Minuten 30 Sekunden. Ziel Pace 5 Minuten 30 Sekunden.'
				: 'Too slow. Current pace 6 minutes 30 seconds. Target pace 5 minutes 30 seconds.';
		speakAnnouncement(text, langCode, {
			volume: settings.volume,
			rate: speechRateToNumber(settings.speechRate),
			useApplicationAudioSession: settings.duckMusicDuringTTS,
		});
	}, [langCode, settings.volume, settings.speechRate, settings.duckMusicDuringTTS]);

	// ─── Volume stepper ───────────────────────────────────────────────────────
	const handleVolumeDown = useCallback(() => {
		const next = Math.max(VOLUME_MIN, Math.round((settings.volume - VOLUME_STEP) * 10) / 10);
		update({ volume: next });
	}, [settings.volume, update]);

	const handleVolumeUp = useCallback(() => {
		const next = Math.min(VOLUME_MAX, Math.round((settings.volume + VOLUME_STEP) * 10) / 10);
		update({ volume: next });
	}, [settings.volume, update]);

	// ─── Derived state ────────────────────────────────────────────────────────
	const paceHelperActive = settings.paceTargetEnabled;
	const showFasterInput = paceHelperActive && settings.paceHintFasterEnabled;
	const showSlowerInput = paceHelperActive && settings.paceHintSlowerEnabled;

	// ─── Render ───────────────────────────────────────────────────────────────

	return (
		<ScrollView contentContainerStyle={styles.content}>
			{/* ── Master toggle ──────────────────────────────────────── */}
			<SettingsListGroupTitle title="Allgemein" />
			<SettingsListBoolean
				iconBgColor={TTS_COLOR}
				leftIcon={<MaterialCommunityIcons name="account-voice" size={22} color="#ffffff" />}
				label="Aktiviert"
				isEnabled={settings.enabled}
				onToggle={() => update({ enabled: !settings.enabled })}
				valueActive="Sprachansagen aktiv"
				valueInactive="Sprachansagen deaktiviert"
				groupPosition="single"
			/>

			{/* ── Play sample ────────────────────────────────────────── */}
			<SettingsListGroupTitle title="Abspielen" />
			<SettingsList
				iconBgColor={TTS_COLOR}
				leftIcon={<MaterialIcons name="play-circle-filled" size={22} color="#ffffff" />}
				label="Kurzen Text abspielen"
				value={
					langCode === 'de'
						? '2 Kilometer. Pace: 5 Min 30 Sek'
						: '2 km. Pace: 5 min 30 sec'
				}
				rightIcon={<MaterialIcons name="play-arrow" size={24} color={TTS_COLOR} />}
				handleFunction={handlePlaySample}
				groupPosition="single"
			/>

			{/* ── Musik und Lautstärke ────────────────────────────────── */}
			<SettingsListGroupTitle title="Musik und Lautstärke" />
			<SettingsListBoolean
				iconBgColor={TTS_COLOR}
				leftIcon={<MaterialCommunityIcons name="music" size={22} color="#ffffff" />}
				label="Musik bei Ansagen leiser machen"
				isEnabled={settings.duckMusicDuringTTS}
				onToggle={() => update({ duckMusicDuringTTS: !settings.duckMusicDuringTTS })}
				valueActive="Aktiv"
				valueInactive="Deaktiviert"
				groupPosition="top"
			/>
			<SettingsList
				iconBgColor={VOLUME_COLOR}
				leftIcon={<Ionicons name="volume-medium" size={22} color="#ffffff" />}
				label="Volume"
				value={`${Math.round(settings.volume * 100)}%`}
				rightElement={
					<View style={styles.stepper}>
						<TouchableOpacity style={styles.stepBtn} onPress={handleVolumeDown}>
							<Ionicons name="volume-low" size={18} color={VOLUME_COLOR} />
						</TouchableOpacity>
						<TouchableOpacity style={styles.stepBtn} onPress={handleVolumeUp}>
							<Ionicons name="volume-high" size={18} color={VOLUME_COLOR} />
						</TouchableOpacity>
					</View>
				}
				groupPosition="bottom"
			/>

			{/* ── Speech rate ─────────────────────────────────────────── */}
			<SettingsListGroupTitle title="Sprachgeschwindigkeit" />
			<SettingsListSelectOption<SpeechRate>
				options={SPEECH_RATE_OPTIONS}
				selectedOption={settings.speechRate}
				onSelect={(opt) => update({ speechRate: opt.id })}
				iconBgColor={TTS_COLOR}
				selectionColor={TTS_COLOR}
			/>

			{/* ── Pace target helper ──────────────────────────────────── */}
			<SettingsListGroupTitle title="Hilfe beim Halten deiner Zielgeschwindigkeit" />
			<SettingsListBoolean
				iconBgColor={HINT_COLOR}
				leftIcon={<MaterialCommunityIcons name="target" size={22} color="#ffffff" />}
				label="Zielgeschwindigkeit-Hilfe"
				isEnabled={paceHelperActive}
				onToggle={() => update({ paceTargetEnabled: !paceHelperActive })}
				valueActive="Aktiv"
				valueInactive="Deaktiviert"
				groupPosition="top"
			/>

			<View style={!paceHelperActive ? styles.sectionDisabled : undefined}>
				<PaceMinSecInput
					iconBgColor={HINT_COLOR}
					leftIcon={<MaterialCommunityIcons name="speedometer-medium" size={22} color="#ffffff" />}
					label="Ziel Pace"
					modalTitle="Ziel Pace"
					minutes={settings.paceTargetMinutes}
					seconds={settings.paceTargetSeconds}
					onSave={(m, s) => update({ paceTargetMinutes: m, paceTargetSeconds: s })}
					disabled={!paceHelperActive}
					groupPosition="bottom"
				/>

				<SettingsListBoolean
					iconBgColor={HINT_COLOR}
					leftIcon={<MaterialCommunityIcons name="run-fast" size={22} color="#ffffff" />}
					label="Hinweis wenn zu schnell"
					isEnabled={settings.paceHintFasterEnabled}
					onToggle={() => update({ paceHintFasterEnabled: !settings.paceHintFasterEnabled })}
					valueActive="Aktiv"
					valueInactive="Deaktiviert"
					disabled={!paceHelperActive}
					groupPosition="top"
				/>

				{showFasterInput && (
					<PaceMinSecInput
						iconBgColor={HINT_COLOR}
						leftIcon={<MaterialCommunityIcons name="timer-alert-outline" size={22} color="#ffffff" />}
						label="Schneller als Pace"
						modalTitle="Hinweis: Schneller als Pace"
						minutes={settings.paceHintFasterMinutes}
						seconds={settings.paceHintFasterSeconds}
						onSave={(m, s) => update({ paceHintFasterMinutes: m, paceHintFasterSeconds: s })}
						groupPosition="middle"
					/>
				)}

				<SettingsList
					iconBgColor={HINT_COLOR}
					leftIcon={<MaterialIcons name="play-arrow" size={22} color="#ffffff" />}
					label="Beispiel Hinweis abspielen"
					rightIcon={<MaterialIcons name="play-arrow" size={24} color={HINT_COLOR} />}
					handleFunction={paceHelperActive ? handlePlayFasterSample : undefined}
					groupPosition="bottom"
				/>

				<SettingsListBoolean
					iconBgColor={HINT_COLOR}
					leftIcon={<MaterialCommunityIcons name="turtle" size={22} color="#ffffff" />}
					label="Hinweis wenn zu langsam"
					isEnabled={settings.paceHintSlowerEnabled}
					onToggle={() => update({ paceHintSlowerEnabled: !settings.paceHintSlowerEnabled })}
					valueActive="Aktiv"
					valueInactive="Deaktiviert"
					disabled={!paceHelperActive}
					groupPosition="top"
				/>

				{showSlowerInput && (
					<PaceMinSecInput
						iconBgColor={HINT_COLOR}
						leftIcon={<MaterialCommunityIcons name="timer-outline" size={22} color="#ffffff" />}
						label="Langsamer als Pace"
						modalTitle="Hinweis: Langsamer als Pace"
						minutes={settings.paceHintSlowerMinutes}
						seconds={settings.paceHintSlowerSeconds}
						onSave={(m, s) => update({ paceHintSlowerMinutes: m, paceHintSlowerSeconds: s })}
						groupPosition="middle"
					/>
				)}

				<SettingsList
					iconBgColor={HINT_COLOR}
					leftIcon={<MaterialIcons name="play-arrow" size={22} color="#ffffff" />}
					label="Beispiel abspielen"
					rightIcon={<MaterialIcons name="play-arrow" size={24} color={HINT_COLOR} />}
					handleFunction={paceHelperActive ? handlePlaySlowerSample : undefined}
					groupPosition="bottom"
				/>
			</View>

			{/* ── Tone / Vibration at distance ───────────────────────── */}
			<SettingsListGroupTitle title="Benachrichtigung bei Distanz" />
			<SettingsListBoolean
				iconBgColor={INTERVAL_COLOR}
				leftIcon={<Ionicons name="musical-note" size={22} color="#ffffff" />}
				label="Hinweiston bei Distanz"
				isEnabled={settings.toneAtDistance}
				onToggle={() => {
					const next = !settings.toneAtDistance;
					update({ toneAtDistance: next });
					if (next) {
						speakAnnouncement(
							langCode === 'de' ? 'Hinweiston' : 'Hint tone',
							langCode,
							{ volume: settings.volume, rate: speechRateToNumber(settings.speechRate), useApplicationAudioSession: settings.duckMusicDuringTTS },
						);
					}
				}}
				valueActive="Aktiv"
				valueInactive="Deaktiviert"
				groupPosition="top"
			/>
			<SettingsListBoolean
				iconBgColor={INTERVAL_COLOR}
				leftIcon={<MaterialCommunityIcons name="vibrate" size={22} color="#ffffff" />}
				label="Vibration bei Distanz"
				isEnabled={settings.vibrationAtDistance}
				onToggle={() => {
					const next = !settings.vibrationAtDistance;
					update({ vibrationAtDistance: next });
					if (next) {
						Vibration.vibrate(PREVIEW_VIBRATION_DURATION_MS);
					}
				}}
				valueActive="Aktiv"
				valueInactive="Deaktiviert"
				groupPosition="bottom"
			/>

			{/* ── Information intervals ──────────────────────────────── */}
			<SettingsListGroupTitle title="Information im Intervall von" />
			<PaceMinSecInput
				iconBgColor={INTERVAL_COLOR}
				leftIcon={<MaterialCommunityIcons name="clock-outline" size={22} color="#ffffff" />}
				label="Zeit"
				modalTitle="Zeitintervall"
				minutes={settings.intervalTimeMinutes}
				seconds={settings.intervalTimeSeconds}
				onSave={(m, s) => update({ intervalTimeMinutes: m, intervalTimeSeconds: s })}
				groupPosition="single"
				primaryColor={INTERVAL_COLOR}
			/>

			{/* ── Announcement content toggles ───────────────────────── */}
			<SettingsListGroupTitle title="Sprachansagen Inhalte" />
			<SettingsListBoolean
				iconBgColor={CONTENT_COLOR}
				leftIcon={<MaterialCommunityIcons name="map-marker-distance" size={22} color="#ffffff" />}
				label="Distanz"
				isEnabled={settings.announceDistance}
				onToggle={() => update({ announceDistance: !settings.announceDistance })}
				valueActive="Wird angesagt"
				valueInactive="Deaktiviert"
				groupPosition="top"
			/>
			<SettingsListBoolean
				iconBgColor={CONTENT_COLOR}
				leftIcon={<MaterialCommunityIcons name="speedometer-medium" size={22} color="#ffffff" />}
				label="Pace (min/km)"
				isEnabled={settings.announcePace}
				onToggle={() => update({ announcePace: !settings.announcePace })}
				valueActive="Wird angesagt"
				valueInactive="Deaktiviert"
				groupPosition="middle"
			/>
			<SettingsListBoolean
				iconBgColor={CONTENT_COLOR}
				leftIcon={<MaterialCommunityIcons name="speedometer-medium" size={22} color="#ffffff" />}
				label="Durchschnittliche Pace (min/km)"
				isEnabled={settings.announcePaceAvg}
				onToggle={() => update({ announcePaceAvg: !settings.announcePaceAvg })}
				valueActive="Wird angesagt"
				valueInactive="Deaktiviert"
				groupPosition="middle"
			/>
			<SettingsListBoolean
				iconBgColor={CONTENT_COLOR}
				leftIcon={<MaterialCommunityIcons name="speedometer" size={22} color="#ffffff" />}
				label="Geschwindigkeit (km/h)"
				isEnabled={settings.announceSpeed}
				onToggle={() => update({ announceSpeed: !settings.announceSpeed })}
				valueActive="Wird angesagt"
				valueInactive="Deaktiviert"
				groupPosition="middle"
			/>
			<SettingsListBoolean
				iconBgColor={CONTENT_COLOR}
				leftIcon={<MaterialCommunityIcons name="speedometer" size={22} color="#ffffff" />}
				label="Durchschnittliche Geschwindigkeit (km/h)"
				isEnabled={settings.announceSpeedAvg}
				onToggle={() => update({ announceSpeedAvg: !settings.announceSpeedAvg })}
				valueActive="Wird angesagt"
				valueInactive="Deaktiviert"
				groupPosition="middle"
			/>
			<SettingsListBoolean
				iconBgColor={CONTENT_COLOR}
				leftIcon={<MaterialCommunityIcons name="timer-outline" size={22} color="#ffffff" />}
				label="Dauer"
				isEnabled={settings.announceDuration}
				onToggle={() => update({ announceDuration: !settings.announceDuration })}
				valueActive="Wird angesagt"
				valueInactive="Deaktiviert"
				groupPosition="middle"
			/>
			<SettingsListBoolean
				iconBgColor={CONTENT_COLOR}
				leftIcon={<MaterialCommunityIcons name="fire" size={22} color="#ffffff" />}
				label="Kalorien"
				isEnabled={settings.announceCalories}
				onToggle={() => update({ announceCalories: !settings.announceCalories })}
				valueActive="Wird angesagt"
				valueInactive="Deaktiviert"
				groupPosition="middle"
			/>
			<SettingsListBoolean
				iconBgColor={CONTENT_COLOR}
				leftIcon={<MaterialCommunityIcons name="heart-pulse" size={22} color="#ffffff" />}
				label="Herzfrequenz"
				isEnabled={settings.announceHeartRate}
				onToggle={() => update({ announceHeartRate: !settings.announceHeartRate })}
				valueActive="Wird angesagt"
				valueInactive="Deaktiviert"
				groupPosition="middle"
			/>
			<SettingsListBoolean
				iconBgColor={CONTENT_COLOR}
				leftIcon={<MaterialCommunityIcons name="cellphone-arrow-down" size={22} color="#ffffff" />}
				label="App im Hintergrund"
				isEnabled={settings.announceAppInBackground}
				onToggle={() => update({ announceAppInBackground: !settings.announceAppInBackground })}
				valueActive="Wird angesagt"
				valueInactive="Deaktiviert"
				groupPosition="middle"
			/>
			<SettingsList
				iconBgColor={CONTENT_COLOR}
				leftIcon={<MaterialIcons name="play-circle-filled" size={22} color="#ffffff" />}
				label="Beispiel abspielen"
				rightIcon={<MaterialIcons name="play-arrow" size={24} color={CONTENT_COLOR} />}
				handleFunction={handlePlayContentSample}
				groupPosition="bottom"
			/>
		</ScrollView>
	);
}

const styles = StyleSheet.create({
	content: {
		paddingBottom: 40,
	},
	stepper: {
		flexDirection: 'row',
		gap: 4,
	},
	stepBtn: {
		width: 36,
		height: 36,
		borderRadius: 8,
		alignItems: 'center',
		justifyContent: 'center',
		backgroundColor: 'rgba(37,99,235,0.12)',
	},
	sectionDisabled: {
		opacity: 0.4,
	},
	// ── PaceMinSecModal styles ──────────────────────────────────────────────────
	paceSheetView: {
		width: '100%',
		padding: 10,
		alignItems: 'stretch',
	},
	paceRow: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'center',
		gap: 12,
		marginTop: 12,
	},
	paceField: {
		flex: 1,
		alignItems: 'center',
		gap: 4,
	},
	paceFieldLabel: {
		fontSize: 13,
		fontWeight: '500',
		marginBottom: 2,
	},
	paceInputRow: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 6,
	},
	paceStepBtn: {
		width: 36,
		height: 36,
		borderRadius: 8,
		alignItems: 'center',
		justifyContent: 'center',
	},
	paceInput: {
		width: 64,
		height: 56,
		borderWidth: 1,
		borderRadius: 10,
		fontSize: 22,
		fontWeight: '600',
		textAlign: 'center',
	},
	paceSuffix: {
		fontSize: 12,
		marginTop: 2,
	},
	paceSeparator: {
		fontSize: 28,
		fontWeight: '700',
		marginTop: 20,
	},
	paceSaveBtn: {
		width: '100%',
		height: 48,
		borderRadius: 12,
		alignItems: 'center',
		justifyContent: 'center',
		marginTop: 16,
	},
	paceSaveBtnText: {
		fontSize: 16,
		fontWeight: '600',
		color: '#ffffff',
	},
});
