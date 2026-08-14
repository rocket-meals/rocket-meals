/**
 * WeatherHelper – fetches the weather for a GPS coordinate from the free
 * Open-Meteo API (https://open-meteo.com), which requires NO API key.
 *
 * Used e.g. by Geonexia to attach the weather at the start point of a
 * recorded activity. Fetching is strictly best-effort: any network error,
 * HTTP error (e.g. 404) or unexpected payload resolves to `null` so callers
 * can treat the weather as optional data.
 */

// ─── Types ────────────────────────────────────────────────────────────────────

/**
 * Normalized weather condition derived from the WMO weather code.
 * The values are a subset of Geonexia's `WeatherType` so results can be
 * assigned directly to an activity's weather field.
 */
export type WeatherCondition =
  | 'sunny'
  | 'partly_cloudy'
  | 'cloudy'
  | 'foggy'
  | 'rainy'
  | 'snowy'
  | 'stormy';

export type WeatherResult = {
  /** Air temperature at 2m above ground in °C. */
  temperatureCelsius: number;
  /** Raw WMO weather interpretation code (WW) as reported by Open-Meteo. */
  weatherCode: number;
  /** Normalized condition derived from `weatherCode`. */
  condition: WeatherCondition;
  /** Wind speed at 10m above ground in km/h, when provided. */
  windSpeedKmh: number | null;
  /** Unix epoch milliseconds the returned weather data refers to. */
  timestamp: number;
};

export type FetchWeatherOptions = {
  latitude: number;
  longitude: number;
  /**
   * Optional point in time (Date or unix epoch ms) the weather should be
   * looked up for. Omit for the current weather. Times up to 92 days in the
   * past are resolved via Open-Meteo's hourly data; older times yield `null`.
   */
  time?: number | Date;
  /** Abort the request after this many milliseconds. Default: 10 seconds. */
  timeoutMs?: number;
  /** Injectable fetch implementation, used by unit tests. */
  fetchFn?: typeof fetch;
};

// ─── WMO weather code mapping ─────────────────────────────────────────────────

/**
 * Map a WMO weather interpretation code (as used by Open-Meteo) to a
 * normalized {@link WeatherCondition}.
 * Reference: https://open-meteo.com/en/docs (WMO Weather interpretation codes)
 */
export function mapWmoCodeToWeatherCondition(code: number): WeatherCondition {
  if (code === 0) return 'sunny';
  if (code === 1 || code === 2) return 'partly_cloudy';
  if (code === 3) return 'cloudy';
  if (code === 45 || code === 48) return 'foggy';
  // Drizzle (51-57), rain (61-67) and rain showers (80-82)
  if ((code >= 51 && code <= 67) || (code >= 80 && code <= 82)) return 'rainy';
  // Snow fall (71-77) and snow showers (85, 86)
  if ((code >= 71 && code <= 77) || code === 85 || code === 86) return 'snowy';
  // Thunderstorm (95-99)
  if (code >= 95 && code <= 99) return 'stormy';
  // Unknown/reserved codes: cloudy is the least wrong neutral fallback.
  return 'cloudy';
}

// ─── URL building ─────────────────────────────────────────────────────────────

const OPEN_METEO_BASE_URL = 'https://api.open-meteo.com/v1/forecast';
const MAX_PAST_DAYS = 92;
const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Build the Open-Meteo request URL for the given coordinate. With `time` set,
 * hourly data (including enough past days to cover the requested time) is
 * requested; without it, only the current weather. Exported for unit tests.
 */
export function buildOpenMeteoUrl(latitude: number, longitude: number, time?: number | Date): string | null {
  const params = new URLSearchParams({
    latitude: String(latitude),
    longitude: String(longitude),
    timeformat: 'unixtime',
    timezone: 'UTC',
  });
  if (time === undefined) {
    params.set('current', 'temperature_2m,weather_code,wind_speed_10m');
    return `${OPEN_METEO_BASE_URL}?${params.toString()}`;
  }
  const timeMs = typeof time === 'number' ? time : time.getTime();
  if (!Number.isFinite(timeMs)) return null;
  const daysBack = Math.ceil(Math.max(0, Date.now() - timeMs) / DAY_MS);
  if (daysBack > MAX_PAST_DAYS) return null;
  params.set('hourly', 'temperature_2m,weather_code,wind_speed_10m');
  params.set('past_days', String(daysBack));
  params.set('forecast_days', '1');
  return `${OPEN_METEO_BASE_URL}?${params.toString()}`;
}

// ─── Response parsing ─────────────────────────────────────────────────────────

type OpenMeteoResponse = {
  current?: {
    time?: number;
    temperature_2m?: number;
    weather_code?: number;
    wind_speed_10m?: number;
  };
  hourly?: {
    time?: number[];
    temperature_2m?: (number | null)[];
    weather_code?: (number | null)[];
    wind_speed_10m?: (number | null)[];
  };
};

function parseCurrentWeather(payload: OpenMeteoResponse): WeatherResult | null {
  const current = payload.current;
  if (!current || typeof current.temperature_2m !== 'number' || typeof current.weather_code !== 'number') {
    return null;
  }
  return {
    temperatureCelsius: current.temperature_2m,
    weatherCode: current.weather_code,
    condition: mapWmoCodeToWeatherCondition(current.weather_code),
    windSpeedKmh: typeof current.wind_speed_10m === 'number' ? current.wind_speed_10m : null,
    timestamp: typeof current.time === 'number' ? current.time * 1000 : Date.now(),
  };
}

/**
 * Pick the hourly sample closest to the requested time. Exported for unit
 * tests.
 */
export function parseHourlyWeatherAt(payload: OpenMeteoResponse, timeMs: number): WeatherResult | null {
  const hourly = payload.hourly;
  const times = hourly?.time;
  if (!hourly || !Array.isArray(times) || times.length === 0) return null;
  let bestIndex = -1;
  let bestTime = 0;
  let bestDelta = Number.POSITIVE_INFINITY;
  for (let i = 0; i < times.length; i++) {
    const time = times[i];
    if (typeof time !== 'number') continue;
    const delta = Math.abs(time * 1000 - timeMs);
    if (delta < bestDelta) {
      bestDelta = delta;
      bestIndex = i;
      bestTime = time;
    }
  }
  if (bestIndex === -1) return null;
  const temperature = hourly.temperature_2m?.[bestIndex];
  const weatherCode = hourly.weather_code?.[bestIndex];
  if (typeof temperature !== 'number' || typeof weatherCode !== 'number') return null;
  const windSpeed = hourly.wind_speed_10m?.[bestIndex];
  return {
    temperatureCelsius: temperature,
    weatherCode,
    condition: mapWmoCodeToWeatherCondition(weatherCode),
    windSpeedKmh: typeof windSpeed === 'number' ? windSpeed : null,
    timestamp: bestTime * 1000,
  };
}

// ─── Fetching ─────────────────────────────────────────────────────────────────

/**
 * Fetch the weather (temperature + normalized condition) for a GPS coordinate
 * and an optional point in time from the free, key-less Open-Meteo API.
 *
 * Resolves to `null` on ANY failure (network error, timeout, HTTP error such
 * as 404, malformed payload, or a time too far in the past) – callers should
 * treat the result as optional and simply skip storing weather data then.
 */
export async function fetchWeatherAtCoordinates(options: FetchWeatherOptions): Promise<WeatherResult | null> {
  const { latitude, longitude, time, timeoutMs = 10_000 } = options;
  const fetchFn = options.fetchFn ?? (typeof fetch === 'function' ? fetch : null);
  if (!fetchFn || !Number.isFinite(latitude) || !Number.isFinite(longitude)) return null;
  const url = buildOpenMeteoUrl(latitude, longitude, time);
  if (url === null) return null;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetchFn(url, { signal: controller.signal });
    if (!response.ok) return null;
    const payload = (await response.json()) as OpenMeteoResponse;
    if (time === undefined) return parseCurrentWeather(payload);
    const timeMs = typeof time === 'number' ? time : time.getTime();
    return parseHourlyWeatherAt(payload, timeMs);
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}
