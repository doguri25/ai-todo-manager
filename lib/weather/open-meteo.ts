/**
 * Open-Meteo 날씨 코드 → 짧은 한국어 설명.
 * @see https://open-meteo.com/en/docs
 */
export const weatherCodeLabel = (code: number): string => {
  if (code === 0) return "맑음";
  if (code === 1 || code === 2) return "대체로 맑음";
  if (code === 3) return "흐림";
  if (code === 45 || code === 48) return "안개";
  if (code >= 51 && code <= 57) return "이슬비";
  if (code >= 61 && code <= 67) return "비";
  if (code >= 71 && code <= 77) return "눈";
  if (code >= 80 && code <= 82) return "소나기";
  if (code >= 85 && code <= 86) return "눈 소나기";
  if (code >= 95 && code <= 99) return "뇌우";
  return "날씨 정보";
};

export type WeatherSnapshot = {
  temperature: number;
  weatherCode: number;
  label: string;
  time?: string;
};

export type HourlyWeather = WeatherSnapshot & {
  hourLabel: string;
};

export type DailyWeather = {
  date: string;
  weekday: string;
  weatherCode: number;
  label: string;
  tempMax: number;
  tempMin: number;
};

export type WeatherBundle = {
  location: string;
  latitude: number;
  longitude: number;
  current: WeatherSnapshot;
  /** 현재 이후 3·6·9시간 예보 */
  laterHours: HourlyWeather[];
  weekly: DailyWeather[];
};

/** @deprecated CurrentWeather 별칭 — 기존 import 호환 */
export type CurrentWeather = WeatherSnapshot & { location?: string };

const SEOUL = {
  latitude: 37.5665,
  longitude: 126.978,
  location: "서울",
};

/**
 * 좌표를 한국어 장소명으로 변환한다.
 */
export const reverseGeocode = async (
  latitude: number,
  longitude: number
): Promise<string> => {
  try {
    const params = new URLSearchParams({
      latitude: String(latitude),
      longitude: String(longitude),
      localityLanguage: "ko",
    });
    const response = await fetch(
      `https://api.bigdatacloud.net/data/reverse-geocode-client?${params.toString()}`
    );
    if (!response.ok) return SEOUL.location;

    const data = (await response.json()) as {
      city?: string;
      locality?: string;
      principalSubdivision?: string;
    };

    return (
      data.city ||
      data.locality ||
      data.principalSubdivision ||
      SEOUL.location
    );
  } catch {
    return SEOUL.location;
  }
};

/**
 * Open-Meteo로 현재·시간별·주간 날씨를 조회한다.
 */
export const fetchWeatherBundle = async (
  latitude = SEOUL.latitude,
  longitude = SEOUL.longitude,
  locationName?: string
): Promise<WeatherBundle | null> => {
  const params = new URLSearchParams({
    latitude: String(latitude),
    longitude: String(longitude),
    current: "temperature_2m,weather_code",
    hourly: "temperature_2m,weather_code",
    daily: "weather_code,temperature_2m_max,temperature_2m_min",
    timezone: "Asia/Seoul",
    forecast_days: "7",
  });

  const response = await fetch(
    `https://api.open-meteo.com/v1/forecast?${params.toString()}`
  );
  if (!response.ok) return null;

  const data = (await response.json()) as {
    current?: {
      time?: string;
      temperature_2m?: number;
      weather_code?: number;
    };
    hourly?: {
      time?: string[];
      temperature_2m?: number[];
      weather_code?: number[];
    };
    daily?: {
      time?: string[];
      weather_code?: number[];
      temperature_2m_max?: number[];
      temperature_2m_min?: number[];
    };
  };

  const currentTemp = data.current?.temperature_2m;
  const currentCode = data.current?.weather_code;
  if (typeof currentTemp !== "number" || typeof currentCode !== "number") {
    return null;
  }

  const nowMs = Date.now();
  const hourlyTimes = data.hourly?.time ?? [];
  const hourlyTemps = data.hourly?.temperature_2m ?? [];
  const hourlyCodes = data.hourly?.weather_code ?? [];

  const laterHours: HourlyWeather[] = [];
  for (const offset of [3, 6, 9]) {
    const target = nowMs + offset * 60 * 60 * 1000;
    let bestIndex = -1;
    let bestDiff = Number.POSITIVE_INFINITY;
    hourlyTimes.forEach((iso, index) => {
      const diff = Math.abs(new Date(iso).getTime() - target);
      if (diff < bestDiff) {
        bestDiff = diff;
        bestIndex = index;
      }
    });
    if (bestIndex < 0) continue;
    const code = hourlyCodes[bestIndex];
    const temp = hourlyTemps[bestIndex];
    if (typeof code !== "number" || typeof temp !== "number") continue;
    laterHours.push({
      temperature: Math.round(temp),
      weatherCode: code,
      label: weatherCodeLabel(code),
      time: hourlyTimes[bestIndex],
      hourLabel: `${offset}시간 후`,
    });
  }

  const weekly: DailyWeather[] = (data.daily?.time ?? []).map((date, index) => {
    const code = data.daily?.weather_code?.[index] ?? 0;
    const max = data.daily?.temperature_2m_max?.[index] ?? 0;
    const min = data.daily?.temperature_2m_min?.[index] ?? 0;
    const weekday = new Intl.DateTimeFormat("ko-KR", {
      weekday: "short",
      timeZone: "Asia/Seoul",
    }).format(new Date(`${date}T12:00:00+09:00`));

    return {
      date,
      weekday,
      weatherCode: code,
      label: weatherCodeLabel(code),
      tempMax: Math.round(max),
      tempMin: Math.round(min),
    };
  });

  const location =
    locationName ?? (await reverseGeocode(latitude, longitude));

  return {
    location,
    latitude,
    longitude,
    current: {
      temperature: Math.round(currentTemp),
      weatherCode: currentCode,
      label: weatherCodeLabel(currentCode),
      time: data.current?.time,
    },
    laterHours,
    weekly,
  };
};

/**
 * 브라우저 위치 또는 서울 기본값으로 날씨 묶음을 가져온다.
 */
export const fetchLocalWeatherBundle = async (): Promise<WeatherBundle | null> => {
  try {
    if (typeof navigator !== "undefined" && navigator.geolocation) {
      const position = await new Promise<GeolocationPosition>(
        (resolve, reject) => {
          navigator.geolocation.getCurrentPosition(resolve, reject, {
            timeout: 4000,
            maximumAge: 30 * 60 * 1000,
          });
        }
      );
      return await fetchWeatherBundle(
        position.coords.latitude,
        position.coords.longitude
      );
    }
  } catch {
    // 위치 거부·타임아웃 시 서울로 폴백
  }

  return fetchWeatherBundle(SEOUL.latitude, SEOUL.longitude, SEOUL.location);
};

/**
 * @deprecated fetchLocalWeatherBundle 사용
 */
export const fetchLocalWeather = async (): Promise<CurrentWeather | null> => {
  const bundle = await fetchLocalWeatherBundle();
  if (!bundle) return null;
  return { ...bundle.current, location: bundle.location };
};

/**
 * @deprecated fetchWeatherBundle 사용
 */
export const fetchCurrentWeather = async (
  latitude = SEOUL.latitude,
  longitude = SEOUL.longitude
): Promise<CurrentWeather | null> => {
  const bundle = await fetchWeatherBundle(latitude, longitude);
  if (!bundle) return null;
  return { ...bundle.current, location: bundle.location };
};
