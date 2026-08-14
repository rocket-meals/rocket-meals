import * as Speech from 'expo-speech';
import { setAudioModeAsync } from 'expo-audio';
import type { SpeechRate } from '../store/speechSettingsSlice';
import { enqueueAnnouncement } from './AudioQueueHelper';
import type { AnnouncementToggles } from './AnnouncementToggles';

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
const DEFAULT_KM_ANNOUNCEMENT_CONTENT: KmAnnouncementContent = { announcePace: true, announceSpeedKmh: false };

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
	content: KmAnnouncementContent = DEFAULT_KM_ANNOUNCEMENT_CONTENT,
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
			return `${km} Kilometer${buildSpeedParts('Tempo', 'Minuten {sec} Sekunden pro Kilometer', 'Kilometer pro Stunde')}`;
		case 'fr':
			return `${km} kilomètre${km > 1 ? 's' : ''}${buildSpeedParts('allure', 'minutes {sec} secondes par kilomètre', 'kilomètres par heure')}`;
		case 'es':
			return `${km} kilómetro${km > 1 ? 's' : ''}${buildSpeedParts('ritmo', 'minutos {sec} segundos por kilómetro', 'kilómetros por hora')}`;
		case 'it':
			return `${km} chilometro${km > 1 ? 'i' : ''}${buildSpeedParts('passo', 'minuti {sec} secondi al chilometro', "chilometri all'ora")}`;
		case 'pt':
			return `${km} quilômetro${km > 1 ? 's' : ''}${buildSpeedParts('ritmo', 'minutos {sec} segundos por quilômetro', 'quilômetros por hora')}`;
		case 'nl':
			return `${km} kilometer${buildSpeedParts('tempo', 'minuten {sec} seconden per kilometer', 'kilometer per uur')}`;
		default:
			return `${km} kilometer${km > 1 ? 's' : ''}${buildSpeedParts('pace', 'minutes {sec} seconds per kilometer', 'kilometers per hour')}`;
	}
}

/**
 * Add a TTS announcement to the audio queue.
 * Items are spoken sequentially; the next item starts only after the previous
 * one finishes (or errors).  Background playback is handled by
 * {@link enableBackgroundAudio}.
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
	// Strip the callback keys that AudioQueueHelper manages internally.
	const { onDone: _d, onError: _e, onStopped: _s, ...forwardedOptions } = (options ?? {}) as Speech.SpeechOptions;
	enqueueAnnouncement(text, languageCode, forwardedOptions, source);
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
export type PeriodicAnnouncementContent = AnnouncementToggles;

/**
 * Format pace (min/km) as a localised speech string fragment.
 * @param paceMinPerKm  Pace value in minutes per km
 * @param langCode      Primary language code (e.g. "de", "en")
 * @param prefix        Label prefix to prepend (e.g. "Pace" or "Durchschnittliche Pace:")
 * @param prefixEn      English label prefix
 */
function formatPaceForSpeech(
	paceMinPerKm: number,
	langCode: string,
	prefix: string,
	prefixEn: string,
): string {
	const pm = Math.floor(paceMinPerKm);
	const ps = Math.round((paceMinPerKm - pm) * 60);
	if (langCode === 'de') {
		return `${prefix} ${pm} Minuten ${ps} Sekunden`;
	}
	return `${prefixEn} ${pm} minutes ${ps} seconds`;
}

/**
 * Format the distance part of a periodic announcement, localised for the
 * given language code.
 */
function resolveDistanceAnnouncementPart(langCode: string, distanceKm: number): string {
	if (langCode === 'de') {
		return formatDistanceForSpeech(distanceKm, 'Kilometer', 'Meter');
	}
	return formatDistanceForSpeech(distanceKm, 'kilometers', 'meters');
}

/**
 * Format the duration part of a periodic announcement, localised for the
 * given language code.
 */
function resolveDurationAnnouncementPart(langCode: string, elapsedSeconds: number): string {
	const totalSec = Math.round(elapsedSeconds);
	const h = Math.floor(totalSec / 3600);
	const m = Math.floor((totalSec % 3600) / 60);
	const s = totalSec % 60;
	if (langCode === 'de') {
		if (h > 0) {
			return `${h} Stunde${h > 1 ? 'n' : ''} ${m} Minuten ${s} Sekunden`;
		}
		return `${m} Minuten ${s} Sekunden`;
	}
	if (h > 0) {
		return `${h} hour${h > 1 ? 's' : ''} ${m} minutes ${s} seconds`;
	}
	return `${m} minutes ${s} seconds`;
}

/**
 * Format the current-speed part of a periodic announcement, localised for
 * the given language code. Derives km/h from pace when available so both
 * metrics share the same base; falls back to `speedKmh` from stats.
 * Returns null when no speed value is available.
 */
function resolveSpeedAnnouncementPart(
	langCode: string,
	paceMinPerKm: number | null,
	speedKmh: number | null,
): string | null {
	const derivedKmh = paceToKmh(paceMinPerKm) ?? speedKmh;
	if (derivedKmh == null) {
		return null;
	}
	const sp = formatSpeedForSpeech(derivedKmh);
	if (langCode === 'de') {
		return `${sp} Kilometer pro Stunde`;
	}
	return `${sp} kilometers per hour`;
}

/**
 * Format the average-speed part of a periodic announcement, localised for
 * the given language code. Average speed is always derived from avg pace
 * (total distance / total time). Returns null when pace is unavailable.
 */
function resolveSpeedAvgAnnouncementPart(langCode: string, paceMinPerKm: number | null): string | null {
	const avgKmh = paceToKmh(paceMinPerKm);
	if (avgKmh == null) {
		return null;
	}
	const sp = formatSpeedForSpeech(avgKmh);
	if (langCode === 'de') {
		return `Durchschnittliche Geschwindigkeit: ${sp} Kilometer pro Stunde`;
	}
	return `Average speed: ${sp} kilometers per hour`;
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
		parts.push(resolveDistanceAnnouncementPart(langCode, stats.distanceKm));
	}

	if (content.announcePace && stats.paceMinPerKm != null) {
		parts.push(formatPaceForSpeech(stats.paceMinPerKm, langCode, 'Pace', 'Pace'));
	}

	if (content.announcePaceAvg && stats.paceMinPerKm != null) {
		parts.push(formatPaceForSpeech(stats.paceMinPerKm, langCode, 'Durchschnittliche Pace:', 'Average pace:'));
	}

	if (content.announceDuration) {
		parts.push(resolveDurationAnnouncementPart(langCode, stats.elapsedSeconds));
	}

	if (content.announceSpeed) {
		const speedPart = resolveSpeedAnnouncementPart(langCode, stats.paceMinPerKm, stats.speedKmh);
		if (speedPart != null) {
			parts.push(speedPart);
		}
	}

	if (content.announceSpeedAvg) {
		const speedAvgPart = resolveSpeedAvgAnnouncementPart(langCode, stats.paceMinPerKm);
		if (speedAvgPart != null) {
			parts.push(speedAvgPart);
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

/**
 * Build a localised TTS announcement for when the pace returns to the
 * acceptable target range after a "too fast" or "too slow" warning.
 *
 * @param locale  Full BCP-47 locale tag
 */
export function buildOnTargetAnnouncement(locale: string): string {
	const langCode = locale.split('-')[0].toLowerCase();
	switch (langCode) {
		case 'de':
			return 'Zielgeschwindigkeit erreicht';
		case 'fr':
			return 'Vitesse cible atteinte';
		case 'es':
			return 'Velocidad objetivo alcanzada';
		case 'it':
			return 'Velocità target raggiunta';
		case 'pt':
			return 'Velocidade alvo atingida';
		case 'nl':
			return 'Doelsnelheid bereikt';
		default:
			return 'Target pace reached';
	}
}
