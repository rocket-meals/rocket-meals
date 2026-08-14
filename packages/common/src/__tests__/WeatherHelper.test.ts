import {
  buildOpenMeteoUrl,
  fetchWeatherAtCoordinates,
  mapWmoCodeToWeatherCondition,
  parseHourlyWeatherAt,
} from 'repo-depkit-common';

describe('mapWmoCodeToWeatherCondition', () => {
  it('maps clear sky to sunny', () => {
    expect(mapWmoCodeToWeatherCondition(0)).toBe('sunny');
  });

  it('maps partly cloudy codes', () => {
    expect(mapWmoCodeToWeatherCondition(1)).toBe('partly_cloudy');
    expect(mapWmoCodeToWeatherCondition(2)).toBe('partly_cloudy');
  });

  it('maps overcast to cloudy', () => {
    expect(mapWmoCodeToWeatherCondition(3)).toBe('cloudy');
  });

  it('maps fog codes to foggy', () => {
    expect(mapWmoCodeToWeatherCondition(45)).toBe('foggy');
    expect(mapWmoCodeToWeatherCondition(48)).toBe('foggy');
  });

  it('maps drizzle, rain and rain showers to rainy', () => {
    expect(mapWmoCodeToWeatherCondition(51)).toBe('rainy');
    expect(mapWmoCodeToWeatherCondition(61)).toBe('rainy');
    expect(mapWmoCodeToWeatherCondition(67)).toBe('rainy');
    expect(mapWmoCodeToWeatherCondition(80)).toBe('rainy');
    expect(mapWmoCodeToWeatherCondition(82)).toBe('rainy');
  });

  it('maps snow codes to snowy', () => {
    expect(mapWmoCodeToWeatherCondition(71)).toBe('snowy');
    expect(mapWmoCodeToWeatherCondition(77)).toBe('snowy');
    expect(mapWmoCodeToWeatherCondition(85)).toBe('snowy');
    expect(mapWmoCodeToWeatherCondition(86)).toBe('snowy');
  });

  it('maps thunderstorm codes to stormy', () => {
    expect(mapWmoCodeToWeatherCondition(95)).toBe('stormy');
    expect(mapWmoCodeToWeatherCondition(99)).toBe('stormy');
  });

  it('falls back to cloudy for unknown codes', () => {
    expect(mapWmoCodeToWeatherCondition(42)).toBe('cloudy');
  });
});

describe('buildOpenMeteoUrl', () => {
  it('requests the current weather when no time is given', () => {
    const url = buildOpenMeteoUrl(52.28, 8.02);
    expect(url).toContain('https://api.open-meteo.com/v1/forecast');
    expect(url).toContain('latitude=52.28');
    expect(url).toContain('longitude=8.02');
    expect(url).toContain('current=temperature_2m%2Cweather_code%2Cwind_speed_10m');
    expect(url).not.toContain('hourly=');
  });

  it('requests hourly data covering the requested past time', () => {
    const twoDaysAgo = Date.now() - 2 * 24 * 60 * 60 * 1000;
    const url = buildOpenMeteoUrl(52.28, 8.02, twoDaysAgo);
    expect(url).toContain('hourly=temperature_2m%2Cweather_code%2Cwind_speed_10m');
    expect(url).toContain('past_days=2');
  });

  it('returns null for times further back than the supported window', () => {
    const longAgo = Date.now() - 200 * 24 * 60 * 60 * 1000;
    expect(buildOpenMeteoUrl(52.28, 8.02, longAgo)).toBeNull();
  });
});

describe('parseHourlyWeatherAt', () => {
  it('picks the hourly sample closest to the requested time', () => {
    const baseSec = 1_700_000_000;
    const payload = {
      hourly: {
        time: [baseSec, baseSec + 3600, baseSec + 7200],
        temperature_2m: [1, 2, 3],
        weather_code: [0, 3, 71],
        wind_speed_10m: [10, 20, 30],
      },
    };
    const result = parseHourlyWeatherAt(payload, (baseSec + 3900) * 1000);
    expect(result).not.toBeNull();
    expect(result!.temperatureCelsius).toBe(2);
    expect(result!.condition).toBe('cloudy');
    expect(result!.windSpeedKmh).toBe(20);
    expect(result!.timestamp).toBe((baseSec + 3600) * 1000);
  });

  it('returns null when hourly data is missing', () => {
    expect(parseHourlyWeatherAt({}, Date.now())).toBeNull();
  });
});

describe('fetchWeatherAtCoordinates', () => {
  it('parses a current-weather response', async () => {
    const fetchFn = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        current: { time: 1_700_000_000, temperature_2m: 12.4, weather_code: 61, wind_speed_10m: 14.2 },
      }),
    });
    const result = await fetchWeatherAtCoordinates({ latitude: 52.28, longitude: 8.02, fetchFn: fetchFn as unknown as typeof fetch });
    expect(result).toEqual({
      temperatureCelsius: 12.4,
      weatherCode: 61,
      condition: 'rainy',
      windSpeedKmh: 14.2,
      timestamp: 1_700_000_000_000,
    });
  });

  it('returns null on HTTP errors such as 404', async () => {
    const fetchFn = jest.fn().mockResolvedValue({ ok: false, status: 404 });
    const result = await fetchWeatherAtCoordinates({ latitude: 52.28, longitude: 8.02, fetchFn: fetchFn as unknown as typeof fetch });
    expect(result).toBeNull();
  });

  it('returns null on network errors', async () => {
    const fetchFn = jest.fn().mockRejectedValue(new Error('offline'));
    const result = await fetchWeatherAtCoordinates({ latitude: 52.28, longitude: 8.02, fetchFn: fetchFn as unknown as typeof fetch });
    expect(result).toBeNull();
  });

  it('returns null for non-finite coordinates', async () => {
    const fetchFn = jest.fn();
    const result = await fetchWeatherAtCoordinates({ latitude: Number.NaN, longitude: 8.02, fetchFn: fetchFn as unknown as typeof fetch });
    expect(result).toBeNull();
    expect(fetchFn).not.toHaveBeenCalled();
  });
});
