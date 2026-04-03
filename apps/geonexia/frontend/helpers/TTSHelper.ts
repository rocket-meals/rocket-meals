import * as Speech from 'expo-speech';
import { setAudioModeAsync } from 'expo-audio';
import type { SpeechRate } from '../store/speechSettingsSlice';
import { appendTTSLogEntry } from './TTSLogStorage';

// ─── Speech rate mapping ──────────────────────────────────────────────────────

const SPEECH_RATE_MAP: Record<SpeechRate, number> = {
	slow: 0.75,
	normal: 1.0,
	fast: 1.25,
};

/**
 * Convert a {@link SpeechRate} preset to the numeric rate value expected by
 * `expo-speech`.
 */
export function speechRateToNumber(rate: SpeechRate): number {
	return SPEECH_RATE_MAP[rate] ?? 1.0;
}

// ─── TTS announcement helpers ─────────────────────────────────────────────────

/**
 * Configure the audio session so that TTS announcements continue playing when
 * the app is in the background on iOS.  Call once when recording starts and
 * reset when recording stops.
 */
export async function enableBackgroundAudio(): Promise<void> {
	try {
		await setAudioModeAsync({
			shouldPlayInBackground: true,
			playsInSilentMode: true,
			interruptionMode: 'duckOthers',
			interruptionModeAndroid: 'duckOthers',
		});
	} catch (err) {
		console.warn('[TTSHelper] Failed to enable background audio:', err);
	}
}

/**
 * Reset the audio session to default settings when recording stops.
 */
export async function disableBackgroundAudio(): Promise<void> {
	try {
		await setAudioModeAsync({
			shouldPlayInBackground: false,
			playsInSilentMode: false,
			interruptionMode: 'mixWithOthers',
			interruptionModeAndroid: 'duckOthers',
		});
	} catch (err) {
		console.warn('[TTSHelper] Failed to disable background audio:', err);
	}
}

/**
 * Content toggles used by {@link buildKmAnnouncement}.
 */
export interface KmAnnouncementContent {
	announcePace: boolean;
	announceSpeedKmh: boolean;
}

/**
 * Build a localised TTS announcement for a km milestone during recording.
 * Falls back to English for unrecognised language codes. Only the primary
 * language subtag is used (e.g. "de" from "de-DE"); regional variants are not
 * distinguished.
 *
 * @param km          Whole-kilometre milestone reached (e.g. 1, 2, 3 …)
 * @param paceMinPerKm  Current average pace in minutes/km, or null when unavailable
 * @param locale      Full BCP-47 locale tag (e.g. "de-DE", "en-US")
 * @param content     Which speed metrics to announce (pace and/or km/h)
 */
export function buildKmAnnouncement(
	km: number,
	paceMinPerKm: number | null,
	locale: string,
	content: KmAnnouncementContent = { announcePace: true, announceSpeedKmh: false },
): string {
	const langCode = locale.split('-')[0].toLowerCase();
	const paceMin = paceMinPerKm != null ? Math.floor(paceMinPerKm) : null;
	const paceSec = paceMinPerKm != null ? Math.round((paceMinPerKm - Math.floor(paceMinPerKm)) * 60) : null;
	// Derive km/h from pace so both metrics use the same base value.
	const speedKmh = paceToKmh(paceMinPerKm);

	function buildSpeedParts(
		paceLabel: string,
		paceUnit: string,
		speedUnit: string,
	): string {
		const parts: string[] = [];
		if (content.announcePace && paceMin != null && paceSec != null) {
			parts.push(`${paceLabel} ${paceMin} ${paceUnit.replace('{sec}', String(paceSec))}`);
		}
		if (content.announceSpeedKmh && speedKmh != null) {
			parts.push(`${formatSpeedForSpeech(speedKmh)} ${speedUnit}`);
		}
		return parts.length > 0 ? `, ${parts.join(', ')}` : '';
	}

	switch (langCode) {
		case 'de':
			return `${km} Kilometer${buildSpeedParts('Tempo', `Minuten {sec} Sekunden pro Kilometer`, 'Kilometer pro Stunde')}`;
		case 'fr':
			return `${km} kilomètre${km > 1 ? 's' : ''}${buildSpeedParts('allure', `minutes {sec} secondes par kilomètre`, 'kilomètres par heure')}`;
		case 'es':
			return `${km} kilómetro${km > 1 ? 's' : ''}${buildSpeedParts('ritmo', `minutos {sec} segundos por kilómetro`, 'kilómetros por hora')}`;
		case 'it':
			return `${km} chilometro${km > 1 ? 'i' : ''}${buildSpeedParts('passo', `minuti {sec} secondi al chilometro`, 'chilometri all\'ora')}`;
		case 'pt':
			return `${km} quilômetro${km > 1 ? 's' : ''}${buildSpeedParts('ritmo', `minutos {sec} segundos por quilômetro`, 'quilômetros por hora')}`;
		case 'nl':
			return `${km} kilometer${buildSpeedParts('tempo', `minuten {sec} seconden per kilometer`, 'kilometer per uur')}`;
		default:
			return `${km} kilometer${km > 1 ? 's' : ''}${buildSpeedParts('pace', `minutes {sec} seconds per kilometer`, 'kilometers per hour')}`;
	}
}

/**
 * Speak a TTS announcement, stopping any currently playing speech first.
 * `useApplicationAudioSession` defaults to `true` so background music is not
 * interrupted on iOS.  All other options can be overridden via the third arg.
 *
 * Every call is logged to the TTS log storage (text + outcome) so that crash
 * causes can be diagnosed later from the Settings screen.
 *
 * @param source  Label identifying the announcement origin (e.g.
 *                `"km_milestone"`, `"periodic"`, `"pace_hint"`,
 *                `"background"`).  Used in the log for filtering.
 */
export function speakAnnouncement(
	text: string,
	languageCode: string,
	options?: Omit<Speech.SpeechOptions, 'language'>,
	source: string = 'unknown',
): void {
	// Log intent *before* the speech call.
	void appendTTSLogEntry({
		timestamp: Date.now(),
		text,
		languageCode,
		success: true,
		source,
	});

	try {
		Speech.stop();
		Speech.speak(text, {
			useApplicationAudioSession: true,
			...options,
			language: languageCode,
		});
	} catch (err) {
		const message = err instanceof Error ? err.message : String(err);
		console.warn('[TTSHelper] speakAnnouncement failed:', message);
		void appendTTSLogEntry({
			timestamp: Date.now(),
			text,
			languageCode,
			success: false,
			error: message,
			source,
		});
	}
}

// ─── Distance / speed formatting helpers ─────────────────────────────────────

const METERS_PER_KM = 1000;

/**
 * Derive km/h from pace (minutes per km). Returns null when pace is
 * unavailable or zero.
 */
function paceToKmh(paceMinPerKm: number | null): number | null {
	return paceMinPerKm != null && paceMinPerKm > 0 ? 60 / paceMinPerKm : null;
}

/**
 * Format a distance value for speech announcements.
 * - <1 km  → rounded to the nearest 100 m  (e.g. "400 Meter")
 * - <10 km → one decimal place              (e.g. "2,5 Kilometer")
 * - ≥10 km → whole kilometres only          (e.g. "12 Kilometer")
 */
function formatDistanceForSpeech(distanceKm: number, unitKm: string, unitM: string): string {
	if (distanceKm < 1) {
		const meters = Math.round(distanceKm * METERS_PER_KM / 100) * 100;
		return `${meters} ${unitM}`;
	}
	if (distanceKm < 10) {
		return `${distanceKm.toFixed(1)} ${unitKm}`;
	}
	return `${Math.round(distanceKm)} ${unitKm}`;
}

/**
 * Format a speed (km/h) value for speech announcements.
 * Uses the same tiered rounding as distance:
 * - <1 km/h  → expressed as metres per hour, rounded to 100 m  (rare edge case)
 * - <10 km/h → one decimal place
 * - ≥10 km/h → whole number only
 */
function formatSpeedForSpeech(speedKmh: number): string {
	if (speedKmh < 10) {
		return speedKmh.toFixed(1);
	}
	return String(Math.round(speedKmh));
}

/**
 * Content toggles used by {@link buildPeriodicAnnouncement}.
 */
export interface PeriodicAnnouncementContent {
	announceDistance: boolean;
	announcePace: boolean;
	announceDuration: boolean;
	announceSpeed: boolean;
	announceCalories: boolean;
	announceHeartRate: boolean;
}

/**
 * Build a localised TTS announcement for periodic (time-based) updates during
 * recording.  Only the content toggles that are enabled are included.
 *
 * When both pace and speed are enabled, km/h is derived from pace
 * (60 / paceMinPerKm) so that both metrics use the same base value.
 * The `speedKmh` field from stats is only used as a fallback when pace is
 * unavailable.
 */
export function buildPeriodicAnnouncement(
	locale: string,
	stats: {
		distanceKm: number;
		elapsedSeconds: number;
		paceMinPerKm: number | null;
		speedKmh: number | null;
	},
	content: PeriodicAnnouncementContent,
): string {
	const langCode = locale.split('-')[0].toLowerCase();
	const parts: string[] = [];

	if (content.announceDistance) {
		const d = stats.distanceKm;
		if (langCode === 'de') {
			parts.push(formatDistanceForSpeech(d, 'Kilometer', 'Meter'));
		} else {
			parts.push(formatDistanceForSpeech(d, 'kilometers', 'meters'));
		}
	}

	if (content.announcePace && stats.paceMinPerKm != null) {
		const pm = Math.floor(stats.paceMinPerKm);
		const ps = Math.round((stats.paceMinPerKm - pm) * 60);
		if (langCode === 'de') {
			parts.push(`Pace ${pm} Minuten ${ps} Sekunden`);
		} else {
			parts.push(`Pace ${pm} minutes ${ps} seconds`);
		}
	}

	if (content.announceDuration) {
		const totalSec = Math.round(stats.elapsedSeconds);
		const h = Math.floor(totalSec / 3600);
		const m = Math.floor((totalSec % 3600) / 60);
		const s = totalSec % 60;
		if (langCode === 'de') {
			if (h > 0) {
				parts.push(`${h} Stunde${h > 1 ? 'n' : ''} ${m} Minuten ${s} Sekunden`);
			} else {
				parts.push(`${m} Minuten ${s} Sekunden`);
			}
		} else {
			if (h > 0) {
				parts.push(`${h} hour${h > 1 ? 's' : ''} ${m} minutes ${s} seconds`);
			} else {
				parts.push(`${m} minutes ${s} seconds`);
			}
		}
	}

	if (content.announceSpeed) {
		// Derive km/h from pace when available so both metrics share the same base.
		const derivedKmh = paceToKmh(stats.paceMinPerKm) ?? stats.speedKmh;
		if (derivedKmh != null) {
			const sp = formatSpeedForSpeech(derivedKmh);
			if (langCode === 'de') {
				parts.push(`${sp} Kilometer pro Stunde`);
			} else {
				parts.push(`${sp} kilometers per hour`);
			}
		}
	}

	return parts.join('. ');
}

/**
 * Build a localised TTS announcement for when the app moves to the background
 * while recording is active.
 */
export function buildBackgroundAnnouncement(locale: string): string {
	const langCode = locale.split('-')[0].toLowerCase();
	switch (langCode) {
		case 'de':
			return 'Die App läuft im Hintergrund';
		case 'fr':
			return "L'application continue en arrière-plan";
		case 'es':
			return 'La aplicación sigue en segundo plano';
		case 'it':
			return "L'app continua in background";
		case 'pt':
			return 'O aplicativo continua em segundo plano';
		case 'nl':
			return 'De app draait op de achtergrond';
		default:
			return 'The app is running in the background';
	}
}

// ─── Pace hint announcement ──────────────────────────────────────────────────

/**
 * The pace hint state used for hysteresis tracking during recording.
 * - `on_target`: the runner is within the acceptable pace range
 * - `too_fast`:  the runner exceeded the "faster" threshold
 * - `too_slow`:  the runner exceeded the "slower" threshold
 */
export type PaceHintState = 'on_target' | 'too_fast' | 'too_slow';

/**
 * Build a localised TTS announcement for a pace deviation hint.
 *
 * @param kind         Whether the runner is too fast or too slow
 * @param currentPace  Current average pace in min/km
 * @param targetPace   Target pace in min/km
 * @param locale       Full BCP-47 locale tag
 */
export function buildPaceHintAnnouncement(
	kind: 'too_fast' | 'too_slow',
	currentPace: number,
	targetPace: number,
	locale: string,
): string {
	const langCode = locale.split('-')[0].toLowerCase();
	const curMin = Math.floor(currentPace);
	const curSec = Math.round((currentPace - curMin) * 60);
	const tgtMin = Math.floor(targetPace);
	const tgtSec = Math.round((targetPace - tgtMin) * 60);

	if (langCode === 'de') {
		const label = kind === 'too_fast' ? 'Zu schnell' : 'Zu langsam';
		return `${label}. Aktuelle Pace ${curMin} Minuten ${curSec} Sekunden. Ziel Pace ${tgtMin} Minuten ${tgtSec} Sekunden.`;
	}
	const label = kind === 'too_fast' ? 'Too fast' : 'Too slow';
	return `${label}. Current pace ${curMin} minutes ${curSec} seconds. Target pace ${tgtMin} minutes ${tgtSec} seconds.`;
}
