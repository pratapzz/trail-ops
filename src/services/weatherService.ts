import { WeatherData, WeatherConditionType, HourlyWeatherItem, DailyForecastItem } from '../types';

/**
 * Real-Time Weather & Atmospheric Telemetry Service
 * Fetches live GPS weather, reverse geocoding, hourly/daily forecasts,
 * UV index, visibility, sunrise/sunset, and Air Quality Index (AQI)
 * aligned with Google Weather readings.
 */

interface Coordinates {
  lat: number;
  lng: number;
}

export interface GeocodedLocation {
  name: string;
  fullName: string;
  lat: number;
  lng: number;
  elevation?: number;
  country?: string;
  admin1?: string;
}

// Helper to map WMO Weather interpretation codes accurately
function mapWmoCode(code: number, isDay = 1): { type: WeatherConditionType; text: string } {
  if (code === 0) return { type: 'sunny', text: isDay ? 'Sunny & Clear' : 'Clear Sky' };
  if (code === 1) return { type: 'sunny', text: isDay ? 'Mostly Sunny' : 'Mostly Clear' };
  if (code === 2) return { type: 'partly_cloudy', text: 'Partly Cloudy' };
  if (code === 3) return { type: 'cloudy', text: 'Overcast' };
  if (code === 45 || code === 48) return { type: 'fog', text: 'Fog & Mist' };
  if (code >= 51 && code <= 57) return { type: 'light_rain', text: 'Light Drizzle' };
  if (code >= 61 && code <= 65) return { type: 'light_rain', text: 'Rain' };
  if (code === 66 || code === 67) return { type: 'heavy_rain', text: 'Freezing Rain' };
  if (code >= 71 && code <= 77) return { type: 'snow', text: 'Snowfall' };
  if (code >= 80 && code <= 81) return { type: 'light_rain', text: 'Scattered Showers' };
  if (code === 82) return { type: 'heavy_rain', text: 'Heavy Rain Showers' };
  if (code === 85 || code === 86) return { type: 'snow', text: 'Snow Showers' };
  if (code >= 95) return { type: 'heavy_rain', text: 'Thunderstorm' };
  return { type: 'partly_cloudy', text: 'Scattered Clouds' };
}

// Convert degrees (0-360) to cardinal direction string
function formatWindDirection(degrees?: number): string {
  if (typeof degrees !== 'number' || Number.isNaN(degrees)) return 'NW (315°)';
  const dirs = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
  const idx = Math.round(((degrees %= 360) < 0 ? degrees + 360 : degrees) / 45) % 8;
  return `${dirs[idx]} (${Math.round(degrees)}°)`;
}

// Format ISO time string (e.g. "2026-10-20T06:12") to "06:12 AM"
function formatIsoTime(isoStr?: string, fallback = '06:00 AM'): string {
  if (!isoStr) return fallback;
  try {
    const timePart = isoStr.split('T')[1];
    if (timePart) {
      const [hStr, mStr] = timePart.split(':');
      const h = parseInt(hStr, 10);
      const m = parseInt(mStr, 10);
      if (!Number.isNaN(h) && !Number.isNaN(m)) {
        const period = h >= 12 ? 'PM' : 'AM';
        const hour12 = h % 12 || 12;
        return `${hour12.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')} ${period}`;
      }
    }
    const d = new Date(isoStr);
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  } catch {
    return fallback;
  }
}

// Helper to estimate elevation if offline
function estimateElevation(coords: Coordinates, name = ''): number {
  const lowerName = name.toLowerCase();
  if (lowerName.includes('dzongri') || lowerName.includes('summit')) return 4020;
  if (lowerName.includes('pelling')) return 2150;
  if (lowerName.includes('yuksom')) return 1780;
  if (lowerName.includes('leh') || lowerName.includes('ladakh')) return 3500;
  if (lowerName.includes('manali')) return 2050;
  if (lowerName.includes('darjeeling')) return 2042;
  if (lowerName.includes('base') || lowerName.includes('camp')) return 2650;
  return Math.max(10, Math.round(Math.abs(coords.lat - 22) * 40));
}

export const weatherService = {
  /**
   * Reverse Geocode live GPS coordinates into a human-readable town/city/locality name
   */
  async reverseGeocode(lat: number, lng: number): Promise<GeocodedLocation> {
    // 1. Primary: BigDataCloud free client reverse geocoding (fast, no key required, accurate locality)
    try {
      const url = `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${encodeURIComponent(
        lat
      )}&longitude=${encodeURIComponent(lng)}&localityLanguage=en`;
      const res = await fetch(url, { signal: AbortSignal.timeout(4000) });
      if (res.ok) {
        const data = await res.json();
        const locality =
          data.locality ||
          data.city ||
          data.town ||
          data.village ||
          data.principalSubdivision ||
          'Current Location';
        const admin1 = data.principalSubdivision || '';
        const country = data.countryName || '';
        const parts = [locality, admin1 && admin1 !== locality ? admin1 : '', country]
          .filter(Boolean)
          .slice(0, 3);
        return {
          name: locality,
          fullName: parts.join(', ') || `${lat.toFixed(3)}°N, ${lng.toFixed(3)}°E`,
          lat,
          lng,
          admin1,
          country,
        };
      }
    } catch {
      // Fallback to Nominatim below
    }

    // 2. Secondary: OpenStreetMap Nominatim reverse geocoding
    try {
      const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${encodeURIComponent(
        lat
      )}&lon=${encodeURIComponent(lng)}&zoom=12&addressdetails=1`;
      const res = await fetch(url, {
        headers: { 'Accept-Language': 'en' },
        signal: AbortSignal.timeout(4000),
      });
      if (res.ok) {
        const data = await res.json();
        const addr = data.address || {};
        const name =
          addr.suburb ||
          addr.town ||
          addr.city ||
          addr.village ||
          addr.county ||
          addr.state_district ||
          data.name ||
          'Current Location';
        const state = addr.state || '';
        const country = addr.country || '';
        const parts = [name, state && state !== name ? state : '', country].filter(Boolean);
        return {
          name,
          fullName: parts.join(', ') || `${lat.toFixed(3)}°N, ${lng.toFixed(3)}°E`,
          lat,
          lng,
          admin1: state,
          country,
        };
      }
    } catch {
      // ignore
    }

    return {
      name: 'Live GPS Location',
      fullName: `Live GPS (${lat.toFixed(3)}°N, ${lng.toFixed(3)}°E)`,
      lat,
      lng,
    };
  },

  /**
   * Auto-detects user's live location via Hardware GPS first, then falls back to IP Geolocation
   * when browser/iframe GPS permission is blocked or denied, so weather always matches Google Weather on user's phone.
   */
  async detectLiveLocation(): Promise<GeocodedLocation | null> {
    // 1. Try browser/phone hardware GPS first
    if (typeof navigator !== 'undefined' && navigator.geolocation) {
      try {
        const pos = await new Promise<GeolocationPosition>((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(resolve, reject, {
            enableHighAccuracy: true,
            timeout: 4500,
            maximumAge: 60000,
          });
        });
        const lat = Number(pos.coords.latitude.toFixed(4));
        const lng = Number(pos.coords.longitude.toFixed(4));
        return await this.reverseGeocode(lat, lng);
      } catch {
        // Proceed to IP geolocation fallback below
      }
    }

    // 2. Fallback to IP Geolocation (works even when iframe blocks geolocation permission)
    const ipProviders = [
      'https://ipwho.is/',
      'https://get.geojs.io/v1/ip/geo.json',
      'https://ipapi.co/json/',
    ];

    for (const endpoint of ipProviders) {
      try {
        const res = await fetch(endpoint, { signal: AbortSignal.timeout(3500) });
        if (res.ok) {
          const data = await res.json();
          const lat = parseFloat(data.latitude ?? data.lat);
          const lng = parseFloat(data.longitude ?? data.lon);
          if (!Number.isNaN(lat) && !Number.isNaN(lng)) {
            const geo = await this.reverseGeocode(lat, lng);
            if (geo && geo.name !== 'Live GPS Location') {
              return geo;
            }
            const city = data.city || data.region || 'Current Location';
            const region = data.region || data.region_name || '';
            const country = data.country || data.country_name || '';
            const parts = [city, region && region !== city ? region : '', country].filter(Boolean);
            return {
              name: city,
              fullName: parts.join(', ') || `${lat.toFixed(3)}°N, ${lng.toFixed(3)}°E`,
              lat,
              lng,
              admin1: region,
              country,
            };
          }
        }
      } catch {
        // try next provider
      }
    }

    return null;
  },

  /**
   * Worldwide Geocoding search (Searches any mountain, pass, city, town, or district worldwide)
   */
  async searchLocations(query: string): Promise<GeocodedLocation[]> {
    if (!query || query.trim().length < 2) return [];
    try {
      const url = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(
        query.trim()
      )}&count=8&language=en&format=json`;
      const res = await fetch(url, { signal: AbortSignal.timeout(4000) });
      if (res.ok) {
        const data = await res.json();
        if (data && Array.isArray(data.results) && data.results.length > 0) {
          return data.results.map((item: any) => {
            const parts = [item.name, item.admin1, item.country].filter(Boolean);
            const altStr = item.elevation ? ` (${Math.round(item.elevation)}m ASL)` : '';
            return {
              name: item.name,
              fullName: `${parts.join(', ')}${altStr}`,
              lat: item.latitude,
              lng: item.longitude,
              elevation: item.elevation ? Math.round(item.elevation) : undefined,
              country: item.country,
              admin1: item.admin1,
            };
          });
        }
      }
    } catch {
      // Offline fallback
    }

    // Fallback dictionary for common expeditions & places
    const localPlaces = [
      { name: 'Kolkata', fullName: 'Kolkata, West Bengal, India (9m ASL)', lat: 22.5726, lng: 88.3639, elevation: 9 },
      { name: 'Bagula', fullName: 'Bagula, Nadia, West Bengal, India (14m ASL)', lat: 23.3333, lng: 88.65, elevation: 14 },
      { name: 'Siliguri', fullName: 'Siliguri, West Bengal, India (122m ASL)', lat: 26.7271, lng: 88.3953, elevation: 122 },
      { name: 'Darjeeling', fullName: 'Darjeeling, West Bengal, India (2,042m ASL)', lat: 27.041, lng: 88.2663, elevation: 2042 },
      { name: 'Pelling High Ridge', fullName: 'Pelling, Sikkim, India (2,150m ASL)', lat: 27.3184, lng: 88.2412, elevation: 2150 },
      { name: 'Yuksom Foothills', fullName: 'Yuksom, Sikkim, India (1,780m ASL)', lat: 27.3698, lng: 88.2212, elevation: 1780 },
      { name: 'Dzongri Summit', fullName: 'Dzongri High Point, Sikkim, India (4,020m ASL)', lat: 27.5028, lng: 88.1697, elevation: 4020 },
      { name: 'Manali Solang Valley', fullName: 'Solang Valley, Himachal Pradesh, India (2,050m ASL)', lat: 32.2432, lng: 77.1892, elevation: 2050 },
      { name: 'Leh Ladakh Pass', fullName: 'Leh, Ladakh, India (3,524m ASL)', lat: 34.1526, lng: 77.5771, elevation: 3500 },
      { name: 'Kedarkantha Peak', fullName: 'Kedarkantha, Uttarakhand, India (3,810m ASL)', lat: 31.0232, lng: 78.1724, elevation: 3810 },
      { name: 'Rohtang Pass', fullName: 'Rohtang Pass, Himachal Pradesh, India (3,978m ASL)', lat: 32.3716, lng: 77.2466, elevation: 3978 },
      { name: 'Everest Base Camp', fullName: 'Everest Base Camp, Khumbu, Nepal (5,364m ASL)', lat: 28.0044, lng: 86.8525, elevation: 5364 },
      { name: 'Spiti Valley Kaza', fullName: 'Kaza, Spiti Valley, Himachal Pradesh, India (3,800m ASL)', lat: 32.2276, lng: 78.071, elevation: 3800 },
      { name: 'Triund Dharamshala', fullName: 'Triund, Dharamshala, India (2,828m ASL)', lat: 32.253, lng: 76.354, elevation: 2828 },
      { name: 'Valley of Flowers', fullName: 'Valley of Flowers, Uttarakhand, India (3,658m ASL)', lat: 30.728, lng: 79.6053, elevation: 3658 },
      { name: 'Shimla Ridge', fullName: 'Shimla, Himachal Pradesh, India (2,206m ASL)', lat: 31.1048, lng: 77.1734, elevation: 2206 },
      { name: 'Rishikesh Valley', fullName: 'Rishikesh, Uttarakhand, India (372m ASL)', lat: 30.0869, lng: 78.2676, elevation: 372 },
    ];

    const q = query.toLowerCase();
    return localPlaces.filter(
      (p) => p.name.toLowerCase().includes(q) || p.fullName.toLowerCase().includes(q)
    );
  },

  /**
   * Fetches real-time weather observations, hourly/daily forecasts, and AQI for specified coordinates
   */
  async fetchDestinationWeather(
    coords: Coordinates,
    destinationName = 'Current Location'
  ): Promise<WeatherData | null> {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 8500);

      const forecastUrl = `https://api.open-meteo.com/v1/forecast?latitude=${coords.lat}&longitude=${coords.lng}&current=temperature_2m,relative_humidity_2m,apparent_temperature,is_day,precipitation,weather_code,wind_speed_10m,wind_direction_10m,surface_pressure&hourly=temperature_2m,apparent_temperature,precipitation_probability,weather_code,wind_speed_10m,visibility,uv_index&daily=weather_code,temperature_2m_max,temperature_2m_min,sunrise,sunset,uv_index_max,precipitation_probability_max,wind_speed_10m_max&timezone=auto`;
      const aqiUrl = `https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${coords.lat}&longitude=${coords.lng}&current=us_aqi,european_aqi,pm2_5&timezone=auto`;

      const [res, aqiRes] = await Promise.all([
        fetch(forecastUrl, { signal: controller.signal }),
        fetch(aqiUrl, { signal: controller.signal }).catch(() => null),
      ]);
      clearTimeout(timeoutId);

      let realAqi = 32;
      if (aqiRes && aqiRes.ok) {
        try {
          const aqiJson = await aqiRes.json();
          const rawAqi =
            aqiJson?.current?.us_aqi ??
            aqiJson?.current?.european_aqi ??
            (aqiJson?.current?.pm2_5 ? Math.round(aqiJson.current.pm2_5 * 2.2) : 32);
          if (typeof rawAqi === 'number' && !Number.isNaN(rawAqi)) {
            realAqi = Math.round(rawAqi);
          }
        } catch {}
      }

      if (res.ok) {
        const json = await res.json();
        const current = json.current || {};
        const isDay = current.is_day ?? 1;
        const mapped = mapWmoCode(current.weather_code ?? 0, isDay);

        const currentTemp = Math.round(current.temperature_2m ?? 24);
        const feelsLike = Math.round(current.apparent_temperature ?? currentTemp);
        const windSpeed = Math.round(current.wind_speed_10m ?? 10);
        const windDirection = formatWindDirection(current.wind_direction_10m);
        const pressure = Math.round(current.surface_pressure ?? 1012);
        const humidity = Math.round(current.relative_humidity_2m ?? 65);
        const elevation = Math.round(json.elevation ?? estimateElevation(coords, destinationName));

        // Find accurate starting index in json.hourly.time matching current observation time
        let startHourIdx = new Date().getHours();
        if (json.hourly && Array.isArray(json.hourly.time) && current.time) {
          const currentHourPrefix = String(current.time).slice(0, 13); // "YYYY-MM-DDTHH"
          const foundIdx = json.hourly.time.findIndex((t: string) =>
            String(t).startsWith(currentHourPrefix)
          );
          if (foundIdx >= 0) {
            startHourIdx = foundIdx;
          }
        }

        // Map next 12 consecutive hours so hourly rail matches Google Weather
        const hourly: HourlyWeatherItem[] = [];
        if (json.hourly && Array.isArray(json.hourly.time)) {
          for (let i = 0; i < 12; i++) {
            const idx = Math.min(startHourIdx + i, json.hourly.time.length - 1);
            const rawIso = json.hourly.time[idx];
            const timeStr = i === 0 ? 'Now' : formatIsoTime(rawIso, `${i}h`);
            const hCode = json.hourly.weather_code?.[idx] ?? current.weather_code ?? 0;
            const hMapped = mapWmoCode(hCode, 1);
            hourly.push({
              time: timeStr,
              temp: Math.round(
                i === 0
                  ? currentTemp
                  : (json.hourly.temperature_2m?.[idx] ?? currentTemp)
              ),
              condition: hMapped.text,
              conditionType: hMapped.type,
              rainChance: Math.round(json.hourly.precipitation_probability?.[idx] ?? 0),
              windSpeed: Math.round(json.hourly.wind_speed_10m?.[idx] ?? windSpeed),
            });
          }
        }

        // Map 5-day daily forecast
        const daysOfWeek = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
        const daily: DailyForecastItem[] = [];
        if (json.daily && Array.isArray(json.daily.time)) {
          for (let d = 0; d < Math.min(5, json.daily.time.length); d++) {
            const [y, m, dayNum] = String(json.daily.time[d]).split('-').map(Number);
            const dateObj = y && m && dayNum ? new Date(y, m - 1, dayNum) : new Date(json.daily.time[d]);
            const dayName = d === 0 ? 'Today' : daysOfWeek[dateObj.getDay()];
            const dateStr = `${dateObj.getDate()} ${dateObj.toLocaleString('en-US', { month: 'short' })}`;
            const dCode = json.daily.weather_code?.[d] ?? 1;
            const dMapped = mapWmoCode(dCode, 1);
            daily.push({
              day: dayName,
              date: dateStr,
              high: Math.round(json.daily.temperature_2m_max?.[d] ?? currentTemp + 3),
              low: Math.round(json.daily.temperature_2m_min?.[d] ?? currentTemp - 4),
              condition: dMapped.text,
              conditionType: dMapped.type,
              rainChance: Math.round(json.daily.precipitation_probability_max?.[d] ?? 0),
              windSpeed: Math.round(json.daily.wind_speed_10m_max?.[d] ?? windSpeed),
            });
          }
        }

        // Real precipitation probability for current hour
        const realPrecipProb = Math.round(
          json.hourly?.precipitation_probability?.[startHourIdx] ??
            json.daily?.precipitation_probability_max?.[0] ??
            0
        );

        // Real visibility in km
        const rawVisMeters = json.hourly?.visibility?.[startHourIdx];
        const visibilityKm =
          typeof rawVisMeters === 'number'
            ? Number((rawVisMeters / 1000).toFixed(1))
            : 10.0;

        // Real UV Index
        const rawUv =
          json.hourly?.uv_index?.[startHourIdx] ??
          json.daily?.uv_index_max?.[0] ??
          3;
        const uvIndex = Math.round(rawUv);

        // Real Sunrise & Sunset
        const sunrise = formatIsoTime(json.daily?.sunrise?.[0], '06:00 AM');
        const sunset = formatIsoTime(json.daily?.sunset?.[0], '06:00 PM');

        // Dynamic safety advisory based on live weather conditions
        let advisoryLevel: 'optimal' | 'warning' | 'severe' = 'optimal';
        let advisoryTitle = 'Favorable Weather Window';
        let advisoryDescription = `Clear conditions at ${destinationName}. Visibility ${visibilityKm} km, AQI ${realAqi}, UV Index ${uvIndex}.`;

        if (windSpeed > 40 || (current.weather_code ?? 0) >= 95) {
          advisoryLevel = 'severe';
          advisoryTitle = 'Severe Storm & High Wind Alert';
          advisoryDescription = `Thunderstorm or strong gusts (${windSpeed} km/h) detected. Delay exposed ridge travel.`;
        } else if (windSpeed > 28 || currentTemp < 2 || realPrecipProb >= 65) {
          advisoryLevel = 'warning';
          advisoryTitle =
            realPrecipProb >= 65
              ? 'High Precipitation Advisory'
              : 'Wind & Temperature Advisory';
          advisoryDescription = `Rain probability ${realPrecipProb}% with ${windSpeed} km/h winds (${windDirection}). Carry rain shell & waterproof gear.`;
        }

        const todayHigh =
          typeof json.daily?.temperature_2m_max?.[0] === 'number'
            ? Math.round(json.daily.temperature_2m_max[0])
            : Math.max(currentTemp, currentTemp + 2);
        const todayLow =
          typeof json.daily?.temperature_2m_min?.[0] === 'number'
            ? Math.round(json.daily.temperature_2m_min[0])
            : Math.min(currentTemp, currentTemp - 3);

        const now = new Date();
        return {
          destinationName,
          coordinates: {
            lat: Number(coords.lat.toFixed(4)),
            lng: Number(coords.lng.toFixed(4)),
          },
          elevationMeters: elevation,
          temperature: currentTemp,
          feelsLike,
          condition: mapped.text,
          conditionType: mapped.type,
          highTemp: todayHigh,
          lowTemp: todayLow,
          humidity,
          windSpeedKmH: windSpeed,
          windDirection,
          visibilityKm,
          precipitationChance: realPrecipProb,
          uvIndex,
          pressureHpa: pressure,
          airQualityIndex: realAqi,
          sunrise,
          sunset,
          safetyAdvisory: {
            level: advisoryLevel,
            title: advisoryTitle,
            description: advisoryDescription,
          },
          hourly: hourly.length > 0 ? hourly : [],
          daily: daily.length > 0 ? daily : [],
          lastUpdated: now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        };
      }
    } catch {
      return null;
    }
    return null;
  },
};
