// Grober Abgleich einer Text-Antwort mit der lokalen Uhr (ohne Abhängigkeiten, auch in Tests genutzt).

export interface TimeCheck {
  /** Gefundene Uhrzeit im Text, z. B. "07:31" (undefined, wenn keine gefunden). */
  found?: string;
  /** Lokale Uhrzeit HH:MM. */
  local: string;
  /** Abweichung Antwort − lokal in Minuten (über Mitternacht korrekt, Bereich −720 … 720). */
  deviationMin?: number;
  /** Datum der Antwort passt zu heute (Wochentag, „5. Oktober“, 05.10. oder ISO-Datum gefunden). */
  dateOk: boolean;
}

const WEEKDAYS = ["Sonntag", "Montag", "Dienstag", "Mittwoch", "Donnerstag", "Freitag", "Samstag"];
const MONTHS = ["Januar", "Februar", "März", "April", "Mai", "Juni", "Juli", "August", "September", "Oktober", "November", "Dezember"];

const pad = (n: number) => String(n).padStart(2, "0");

/** Erste Uhrzeit HH:MM (optional :SS) im Text als Minuten seit Mitternacht. */
export function findTime(text: string): { text: string; minutes: number } | undefined {
  const m = /(?<![\d:])([01]?\d|2[0-3]):([0-5]\d)(?::[0-5]\d)?(?![\d:])/.exec(text);
  if (!m) return undefined;
  const h = Number(m[1]);
  const min = Number(m[2]);
  return { text: `${pad(h)}:${pad(min)}`, minutes: h * 60 + min };
}

/** Prüft, ob das heutige Datum in irgendeiner üblichen Form im Text steht. */
export function mentionsDate(text: string, now: Date): boolean {
  const d = now.getDate();
  const mo = now.getMonth() + 1;
  const y = now.getFullYear();
  const t = text.toLowerCase();
  const patterns = [
    `${y}-${pad(mo)}-${pad(d)}`,
    `${pad(d)}.${pad(mo)}.`,
    `${d}.${mo}.`,
    `${d}. ${MONTHS[mo - 1]!.toLowerCase()}`,
  ];
  return patterns.some((p) => t.includes(p)) || t.includes(WEEKDAYS[now.getDay()]!.toLowerCase());
}

export function checkAnswer(text: string, now: Date = new Date()): TimeCheck {
  const localMin = now.getHours() * 60 + now.getMinutes();
  const res: TimeCheck = { local: `${pad(now.getHours())}:${pad(now.getMinutes())}`, dateOk: mentionsDate(text, now) };
  const t = findTime(text);
  if (t) {
    res.found = t.text;
    let diff = t.minutes - localMin;
    if (diff > 720) diff -= 1440;
    if (diff < -720) diff += 1440;
    res.deviationMin = diff;
  }
  return res;
}
