import { WeatherData, WeatherConditionType, HourlyWeatherItem, DailyForecastItem } from '../types';

/**
 * Mock Weather API Service
 * Fetches real-time weather and forecast data for expedition destination coordinates.
 * Simulates atmospheric physics (barometric pressure drop with altitude, wind chill,
 * diurnal mountain temperature variation, and alpine trail safety advisories).
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

// Helper to map WMO Weather interpretation codes
function mapWmoCode(code: number): { type: WeatherConditionType; text: string } {
  if (code === 0) return { type: 'sunny', text: 'Clear Sky' };
  if (code === 1 || code === 2) return { type: 'partly_cloudy', text: 'Partly Cloudy' };
  if (code === 3) return { type: 'cloudy', text: 'Overcast' };
  if (code === 45 || code === 48) return { type: 'fog', text: 'Fog & Mountain Mist' };
  if (code >= 51 && code <= 67) return { type: 'light_rain', text: 'Rain Showers' };
  if (code >= 71 && code <= 77) return { type: 'snow', text: 'Snow & Flurries' };
  if (code >= 80 && code <= 82) return { type: 'heavy_rain', text: 'Heavy Alpine Rain' };
  if (code >= 95) return { type: 'heavy_rain', text: 'Mountain Thunderstorm' };
  return { type: 'partly_cloudy', text: 'Scattered Clouds' };
}

// Helper to estimate elevation from coordinates and name
function estimateElevation(coords: Coordinates, name = ''): number {
  const lowerName = name.toLowerCase();
  if (lowerName.includes('dzongri') || lowerName.includes('summit')) return 4020;
  if (lowerName.includes('pelling')) return 2150;
  if (lowerName.includes('yuksom')) return 1780;
  if (lowerName.includes('leh') || lowerName.includes('ladakh')) return 3500;
  if (lowerName.includes('manali')) return 2050;
  if (lowerName.includes('darjeeling')) return 2042;
  if (lowerName.includes('base') || lowerName.includes('camp')) return 2650;

  // Derive pseudo-elevation from latitude & longitude
  const hash = Math.abs(Math.sin(coords.lat * 12.9898 + coords.lng * 78.233)) * 10000;
  return Math.round(1400 + (hash % 2600));
}

// Calculate barometric pressure in hPa at given altitude in meters
function calculateBarometricPressure(elevationMeters: number): number {
  return Math.round(1013.25 * Math.pow(1 - 0.0000225577 * elevationMeters, 5.25588));
}

export const weatherService = {
  /**
   * Worldwide Geocoding search (Searches any mountain, pass, city, or district worldwide)
   */
  async searchLocations(query: string): Promise<GeocodedLocation[]> {
    if (!query || query.trim().length < 2) return [];
    try {
      const url = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(
        query.trim()
      )}&count=8&language=en&format=json`;
      const res = await fetch(url, { signal: AbortSignal.timeout(3500) });
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
   * Fetches real-time weather observations and forecast for specified coordinates
   */
  async fetchDestinationWeather(
    coords: Coordinates,
    destinationName = 'Expedition Destination'
  ): Promise<WeatherData> {
    // Attempt real Open-Meteo forecast first
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 8000);
      const url = `https://api.open-meteo.com/v1/forecast?latitude=${coords.lat}&longitude=${coords.lng}&current=temperature_2m,relative_humidity_2m,apparent_temperature,precipitation,weather_code,wind_speed_10m,surface_pressure&hourly=temperature_2m,precipitation_probability,weather_code,wind_speed_10m&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max,wind_speed_10m_max&timezone=auto`;
      const res = await fetch(url, { signal: controller.signal });
      clearTimeout(timeoutId);

      if (res.ok) {
        const json = await res.json();
        const current = json.current || {};
        const mapped = mapWmoCode(current.weather_code ?? 0);

        const currentTemp = Math.round(current.temperature_2m ?? 18);
        const feelsLike = Math.round(current.apparent_temperature ?? currentTemp);
        const windSpeed = Math.round(current.wind_speed_10m ?? 12);
        const pressure = Math.round(current.surface_pressure ?? 1013);
        const humidity = Math.round(current.relative_humidity_2m ?? 60);

        const elevation = Math.round(json.elevation ?? estimateElevation(coords, destinationName));
        const nowHourIndex = new Date().getHours();

        // Map hourly forecast (next 8 items)
        const hourly: HourlyWeatherItem[] = [];
        if (json.hourly && Array.isArray(json.hourly.time)) {
          for (let i = 0; i < 8; i++) {
            const idx = (nowHourIndex + i * 3) % json.hourly.time.length;
            const hourDate = new Date(json.hourly.time[idx]);
            const timeStr = i === 0 ? 'Now' : hourDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            const hCode = json.hourly.weather_code?.[idx] ?? 1;
            const hMapped = mapWmoCode(hCode);
            hourly.push({
              time: timeStr,
              temp: Math.round(json.hourly.temperature_2m?.[idx] ?? currentTemp),
              condition: hMapped.text,
              conditionType: hMapped.type,
              rainChance: Math.round(json.hourly.precipitation_probability?.[idx] ?? 10),
              windSpeed: Math.round(json.hourly.wind_speed_10m?.[idx] ?? windSpeed),
            });
          }
        }

        // Map daily forecast (5 days)
        const daysOfWeek = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
        const daily: DailyForecastItem[] = [];
        if (json.daily && Array.isArray(json.daily.time)) {
          for (let d = 0; d < Math.min(5, json.daily.time.length); d++) {
            const dateObj = new Date(json.daily.time[d]);
            const dayName = d === 0 ? 'Today' : daysOfWeek[dateObj.getDay()];
            const dateStr = `${dateObj.getDate()} ${dateObj.toLocaleString('default', { month: 'short' })}`;
            const dCode = json.daily.weather_code?.[d] ?? 1;
            const dMapped = mapWmoCode(dCode);
            daily.push({
              day: dayName,
              date: dateStr,
              high: Math.round(json.daily.temperature_2m_max?.[d] ?? currentTemp + 3),
              low: Math.round(json.daily.temperature_2m_min?.[d] ?? currentTemp - 4),
              condition: dMapped.text,
              conditionType: dMapped.type,
              rainChance: Math.round(json.daily.precipitation_probability_max?.[d] ?? 15),
              windSpeed: Math.round(json.daily.wind_speed_10m_max?.[d] ?? windSpeed),
            });
          }
        }

        // Real precip probability from hourly current hour
        const realPrecipProb = Math.round(
          json.hourly?.precipitation_probability?.[nowHourIndex] ??
          json.daily?.precipitation_probability_max?.[0] ??
          15
        );

        // Mountain safety advisory
        let advisoryLevel: 'optimal' | 'warning' | 'severe' = 'optimal';
        let advisoryTitle = 'Favorable Alpine Weather Window';
        let advisoryDescription = 'Stable atmospheric conditions. Clear visibility and optimal trail safety.';
        if (windSpeed > 35 || currentTemp < 0) {
          advisoryLevel = 'warning';
          advisoryTitle = 'Alpine Wind & Sub-Zero Advisory';
          advisoryDescription = `Gusts reaching ${windSpeed} km/h. Equip thermal windbreakers and crampons on icy trails.`;
        }

        const todayHigh = json.daily?.temperature_2m_max?.[0]
          ? Math.round(json.daily.temperature_2m_max[0])
          : currentTemp + 3;
        const todayLow = json.daily?.temperature_2m_min?.[0]
          ? Math.round(json.daily.temperature_2m_min[0])
          : currentTemp - 4;

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
          windDirection: 'NW (315°)',
          visibilityKm: elevation > 3500 ? 14.5 : 10.0,
          precipitationChance: realPrecipProb,
          uvIndex: Math.min(10, Math.round(4 + (elevation / 1000))),
          pressureHpa: pressure,
          airQualityIndex: 18,
          sunrise: '05:38 AM',
          sunset: '05:46 PM',
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
      // Graceful offline fallback below
    }

    // Atmospheric physics fallback for offline or zero-network expedition mode
    await new Promise((resolve) => setTimeout(resolve, 300));
    const elevation = estimateElevation(coords, destinationName);
    const pressure = calculateBarometricPressure(elevation);
    const now = new Date();
    const currentHour = now.getHours();
    const altitudeDrop = (elevation / 1000) * 6.2;
    const diurnalOffset = Math.sin(((currentHour - 9) / 24) * 2 * Math.PI) * 4.5;
    const currentTemp = Math.round(22 - altitudeDrop + diurnalOffset);
    const baseWind = 12 + Math.round(elevation / 350);
    const windSpeed = Math.max(8, baseWind);
    const windChill = currentTemp <= 10 && windSpeed > 4.8
      ? Math.round(13.12 + 0.6215 * currentTemp - 11.37 * Math.pow(windSpeed, 0.16) + 0.3965 * currentTemp * Math.pow(windSpeed, 0.16))
      : currentTemp - 2;

    // Conditions
    let conditionType: WeatherConditionType = 'partly_cloudy';
    let conditionText = 'Partly Cloudy';
    let rainChance = 15;

    if (elevation > 3600) {
      if (currentTemp <= 1) {
        conditionType = 'snow';
        conditionText = 'Alpine Flurries & Snow';
        rainChance = 45;
      } else {
        conditionType = 'windy';
        conditionText = 'High Altitude Gale';
        rainChance = 20;
      }
    } else if (windSpeed > 28) {
      conditionType = 'windy';
      conditionText = 'Gusting Mountain Winds';
      rainChance = 25;
    } else if (currentHour >= 18 || currentHour <= 7) {
      conditionType = 'fog';
      conditionText = 'Valley Fog & Mist';
      rainChance = 30;
    } else if (currentHour >= 11 && currentHour <= 15) {
      conditionType = 'sunny';
      conditionText = 'Crisp Alpine Sunshine';
      rainChance = 10;
    }

    const highTemp = currentTemp + 4;
    const lowTemp = Math.max(-5, currentTemp - 6);

    // Safety advisory
    let advisoryLevel: 'optimal' | 'warning' | 'severe' = 'optimal';
    let advisoryTitle = 'Favorable Alpine Weather Window';
    let advisoryDescription = 'Stable atmospheric pressure. Prime trekking conditions between 06:30 and 13:00. Maintain hydration at high altitude.';

    if (windSpeed > 30 || currentTemp < 2) {
      advisoryLevel = 'warning';
      advisoryTitle = 'Alpine Wind & Chill Advisory';
      advisoryDescription = `Gusts reaching ${windSpeed} km/h along exposed ridge trails. Freeze level at ${elevation - 300}m. Equip thermal outer shell & windbreakers.`;
    } else if (elevation > 3800 && currentTemp <= 0) {
      advisoryLevel = 'severe';
      advisoryTitle = 'Sub-Zero Summit Warning';
      advisoryDescription = 'Icy crampon conditions above tree line. Summit windows restricted to morning before thermal clouds develop.';
    }

    // Hourly forecast (next 24 hours in 3h blocks)
    const hourly: HourlyWeatherItem[] = [];
    for (let i = 0; i < 8; i++) {
      const forecastHour = (currentHour + i * 3) % 24;
      const hourStr = `${String(forecastHour).padStart(2, '0')}:00`;
      const hourOffset = Math.sin(((forecastHour - 9) / 24) * 2 * Math.PI) * 4;
      const hourTemp = Math.round(22 - altitudeDrop + hourOffset);

      let hType: WeatherConditionType = 'partly_cloudy';
      let hDesc = 'Partly Cloudy';
      let hRain = 15;

      if (forecastHour >= 6 && forecastHour <= 11) {
        hType = 'sunny';
        hDesc = 'Clear';
        hRain = 5;
      } else if (forecastHour >= 12 && forecastHour <= 16) {
        hType = 'partly_cloudy';
        hDesc = 'Scattered Clouds';
        hRain = 20;
      } else if (forecastHour >= 17 && forecastHour <= 21) {
        hType = elevation > 3500 ? 'snow' : 'light_rain';
        hDesc = elevation > 3500 ? 'Light Snow' : 'Passing Mist';
        hRain = 40;
      } else {
        hType = 'fog';
        hDesc = 'Alpine Mist';
        hRain = 25;
      }

      hourly.push({
        time: i === 0 ? 'Now' : hourStr,
        temp: i === 0 ? currentTemp : hourTemp,
        condition: hDesc,
        conditionType: hType,
        rainChance: hRain,
        windSpeed: Math.round(windSpeed + (i % 2 === 0 ? 3 : -2)),
      });
    }

    // 5-Day forecast
    const daysOfWeek = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const daily: DailyForecastItem[] = [];
    for (let d = 0; d < 5; d++) {
      const targetDate = new Date();
      targetDate.setDate(now.getDate() + d);
      const dayName = d === 0 ? 'Today' : daysOfWeek[targetDate.getDay()];
      const dateStr = `${targetDate.getDate()} ${targetDate.toLocaleString('default', { month: 'short' })}`;

      const dHigh = highTemp + (d % 2 === 0 ? 1 : -1);
      const dLow = lowTemp + (d % 3 === 0 ? -1 : 1);

      let dType: WeatherConditionType = 'partly_cloudy';
      let dDesc = 'Partly Cloudy';
      let dRain = 15;

      if (d === 0) {
        dType = conditionType;
        dDesc = conditionText;
        dRain = rainChance;
      } else if (d === 1) {
        dType = 'sunny';
        dDesc = 'Clear Skies';
        dRain = 10;
      } else if (d === 2) {
        dType = elevation > 3000 ? 'windy' : 'light_rain';
        dDesc = elevation > 3000 ? 'Ridge Gale' : 'Light Showers';
        dRain = 45;
      } else if (d === 3) {
        dType = elevation > 3500 ? 'snow' : 'cloudy';
        dDesc = elevation > 3500 ? 'Alpine Flurries' : 'Overcast';
        dRain = 35;
      } else {
        dType = 'sunny';
        dDesc = 'Clear Summit Window';
        dRain = 10;
      }

      daily.push({
        day: dayName,
        date: dateStr,
        high: dHigh,
        low: dLow,
        condition: dDesc,
        conditionType: dType,
        rainChance: dRain,
        windSpeed: Math.round(windSpeed + (d * 1.5)),
      });
    }

    const lastUpdated = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });

    return {
      destinationName,
      coordinates: {
        lat: Number(coords.lat.toFixed(4)),
        lng: Number(coords.lng.toFixed(4)),
      },
      elevationMeters: elevation,
      temperature: currentTemp,
      feelsLike: windChill,
      condition: conditionText,
      conditionType,
      highTemp,
      lowTemp,
      humidity: Math.min(85, Math.max(42, Math.round(58 + (Math.sin(Date.now() / 20000) * 12)))),
      windSpeedKmH: windSpeed,
      windDirection: 'NW (315°)',
      visibilityKm: elevation > 3500 ? 14.5 : 9.8,
      precipitationChance: rainChance,
      uvIndex: Math.min(10, Math.round(5 + (elevation / 1000))),
      pressureHpa: pressure,
      airQualityIndex: 18, // Pristine mountain air
      sunrise: '05:38 AM',
      sunset: '05:46 PM',
      safetyAdvisory: {
        level: advisoryLevel,
        title: advisoryTitle,
        description: advisoryDescription,
      },
      hourly,
      daily,
      lastUpdated,
    };
  },
};
