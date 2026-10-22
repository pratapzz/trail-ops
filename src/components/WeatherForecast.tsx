import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Cloud,
  Sun,
  CloudRain,
  CloudSnow,
  Wind,
  CloudFog,
  CloudSun,
  Compass,
  Droplets,
  Gauge,
  RotateCw,
  AlertTriangle,
  ShieldCheck,
  AlertOctagon,
  MapPin,
  Search,
  Plus,
  Check,
  X,
  Navigation,
  Eye,
  Sunrise,
  Sunset,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { WeatherData, WeatherConditionType } from '../types';
import { weatherService, GeocodedLocation } from '../services/weatherService';

interface WeatherForecastProps {
  coordinates?: {
    lat: number;
    lng: number;
  };
  destinationName?: string;
  onShowToast?: (message: string) => void;
  onDestinationChange?: (name: string, coordinates: { lat: number; lng: number }) => void;
}

const PRESET_LOCATIONS: Array<{ name: string; lat: number; lng: number; tag: string }> = [
  { name: 'Kolkata, West Bengal', lat: 22.5726, lng: 88.3639, tag: 'City' },
  { name: 'Bagula, Nadia', lat: 23.3333, lng: 88.65, tag: 'Town' },
  { name: 'Siliguri, West Bengal', lat: 26.7271, lng: 88.3953, tag: 'Transit' },
  { name: 'Darjeeling, West Bengal (2,042m)', lat: 27.041, lng: 88.2663, tag: 'Hill' },
  { name: 'Pelling, Sikkim (2,150m)', lat: 27.3184, lng: 88.2412, tag: 'Ridge' },
  { name: 'Manali, Himachal (2,050m)', lat: 32.2432, lng: 77.1892, tag: 'Valley' },
  { name: 'Leh, Ladakh (3,500m)', lat: 34.1526, lng: 77.5771, tag: 'Pass' },
];

export const WeatherForecast: React.FC<WeatherForecastProps> = ({
  coordinates = { lat: 27.3184, lng: 88.2412 },
  destinationName = 'Expedition Destination',
  onShowToast,
  onDestinationChange,
}) => {
  const [activeLocation, setActiveLocation] = useState<{
    name: string;
    coordinates: { lat: number; lng: number };
    isLiveGps?: boolean;
  }>(() => {
    try {
      const calibrated = localStorage.getItem('trailoPS_calibrated_location');
      if (calibrated) {
        const parsed = JSON.parse(calibrated);
        if (parsed && parsed.name && typeof parsed.lat === 'number' && typeof parsed.lng === 'number') {
          return {
            name: parsed.name,
            coordinates: { lat: parsed.lat, lng: parsed.lng },
            isLiveGps: true,
          };
        }
      }
      const savedGps = localStorage.getItem('trailoPS_live_gps_weather_location');
      if (savedGps) {
        const parsed = JSON.parse(savedGps);
        if (parsed && parsed.name && parsed.coordinates?.lat && parsed.coordinates?.lng) {
          return parsed;
        }
      }
    } catch {}
    return {
      name: destinationName,
      coordinates,
      isLiveGps: false,
    };
  });

  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isDetectingGps, setIsDetectingGps] = useState(false);
  const [unit, setUnit] = useState<'C' | 'F'>('C');
  const [forecastTab, setForecastTab] = useState<'hourly' | 'daily'>('hourly');
  const hasAutoDetectedRef = useRef(false);
  const userManuallySelectedRef = useRef(false);

  // Compact / Expanded toggle state (defaults to compact as requested)
  const [isExpanded, setIsExpanded] = useState(false);
  // Track if location is turned off on device or permission denied
  const [isLocationOff, setIsLocationOff] = useState(false);

  // Weather search and addition state
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<GeocodedLocation[]>([]);
  const [isSearchingPlaces, setIsSearchingPlaces] = useState(false);
  const [customLocationName, setCustomLocationName] = useState('');
  const [customAltitude, setCustomAltitude] = useState('2400');

  // Auto-detect real live GPS location on mount so weather matches user's actual phone location
  const detectLiveGpsWeather = useCallback(
    async (showFeedback = false) => {
      setIsDetectingGps(true);
      try {
        const geo = await weatherService.detectLiveLocation();
        if (geo) {
          setIsLocationOff(false);
          const liveLoc = {
            name: geo.fullName || geo.name || 'My Live Location',
            coordinates: { lat: geo.lat, lng: geo.lng },
            isLiveGps: true,
          };
          userManuallySelectedRef.current = false;
          setActiveLocation(liveLoc);
          try {
            localStorage.setItem('trailoPS_live_gps_weather_location', JSON.stringify(liveLoc));
            localStorage.setItem(
              'trailoPS_live_gps_coords',
              JSON.stringify({ lat: geo.lat, lng: geo.lng, altitude: 2150 })
            );
            window.dispatchEvent(
              new CustomEvent('trailoPS_location_updated', {
                detail: { ...liveLoc.coordinates, label: liveLoc.name, isLiveGps: true },
              })
            );
          } catch {}
          if (onDestinationChange) {
            onDestinationChange(liveLoc.name, liveLoc.coordinates);
          }
          if (showFeedback && onShowToast) {
            onShowToast(`📍 Synced real GPS location: ${geo.name || 'Current Town'}`);
          }
        } else {
          setIsLocationOff(true);
          if (showFeedback && onShowToast) {
            onShowToast('⚠️ Location is turned off. Please enable device location in settings.');
          }
        }
      } catch {
        setIsLocationOff(true);
        if (showFeedback && onShowToast) {
          onShowToast('⚠️ Location is turned off. Please enable device location in settings.');
        }
      } finally {
        setIsDetectingGps(false);
      }
    },
    [onDestinationChange, onShowToast]
  );

  // Sync when other components update the global location
  useEffect(() => {
    const handleLocationUpdate = (e: any) => {
      const { lat, lng, label, isLiveGps, isCalibrated } = e.detail || {};
      if (isCalibrated) {
        userManuallySelectedRef.current = false;
      }
      if (userManuallySelectedRef.current) return;
      
      if (typeof lat === 'number' && typeof lng === 'number') {
        const nextLoc = {
          name: label || 'Current Location',
          coordinates: { lat, lng },
          isLiveGps: isLiveGps ?? true,
        };
        setActiveLocation(nextLoc);
        loadWeather(true, nextLoc);
      }
    };

    const handleStorageSync = (e: StorageEvent) => {
      if (userManuallySelectedRef.current) return;
      if (e.key === 'trailoPS_live_gps_weather_location' && e.newValue) {
        try {
          const parsed = JSON.parse(e.newValue);
          if (parsed && parsed.coordinates) {
            setActiveLocation(parsed);
          }
        } catch {}
      }
    };

    window.addEventListener('trailoPS_location_updated', handleLocationUpdate);
    window.addEventListener('storage', handleStorageSync);
    return () => {
      window.removeEventListener('trailoPS_location_updated', handleLocationUpdate);
      window.removeEventListener('storage', handleStorageSync);
    };
  }, []);

  useEffect(() => {
    if (!hasAutoDetectedRef.current) {
      hasAutoDetectedRef.current = true;
      if (!destinationName || destinationName === 'Expedition Destination') {
        detectLiveGpsWeather(false);
      }
    }
  }, [detectLiveGpsWeather, destinationName]);

  // Debounced live geocoded search
  useEffect(() => {
    if (!searchQuery.trim() || searchQuery.trim().length < 2) {
      setSearchResults([]);
      setIsSearchingPlaces(false);
      return;
    }

    const timer = setTimeout(async () => {
      setIsSearchingPlaces(true);
      try {
        const results = await weatherService.searchLocations(searchQuery);
        setSearchResults(results);
      } catch {
        setSearchResults([]);
      } finally {
        setIsSearchingPlaces(false);
      }
    }, 280);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Keep in sync if parent explicitly changes destination to a non-default location
  useEffect(() => {
    const isDefaultPelling =
      Math.abs(coordinates.lat - 27.3184) < 0.001 && Math.abs(coordinates.lng - 88.2412) < 0.001;
    if (!isDefaultPelling && !activeLocation.isLiveGps && !userManuallySelectedRef.current) {
      setActiveLocation({
        name: destinationName,
        coordinates,
        isLiveGps: false,
      });
    }
  }, [coordinates.lat, coordinates.lng, destinationName, activeLocation.isLiveGps]);

  const lastLoadedCoordsRef = useRef<{ lat: number; lng: number } | null>(null);

  const loadWeather = useCallback(
    async (isManualRefresh = false, targetLocation = activeLocation) => {
      // Prevent redundant loads for tiny movements (less than ~100m)
      if (lastLoadedCoordsRef.current && !isManualRefresh) {
        const dLat = Math.abs(targetLocation.coordinates.lat - lastLoadedCoordsRef.current.lat);
        const dLng = Math.abs(targetLocation.coordinates.lng - lastLoadedCoordsRef.current.lng);
        if (dLat < 0.001 && dLng < 0.001) return;
      }

      if (isManualRefresh || weather) {
        setIsRefreshing(true);
      } else {
        setIsLoading(true);
      }

      try {
        const data = await weatherService.fetchDestinationWeather(
          targetLocation.coordinates,
          targetLocation.name
        );
        if (data) {
          setWeather(data);
          lastLoadedCoordsRef.current = targetLocation.coordinates;
        }
        if (isManualRefresh && onShowToast) {
          onShowToast(
            `Weather telemetry refreshed for ${data?.destinationName || targetLocation.name}`
          );
        }
      } catch {
        if (onShowToast) {
          onShowToast('Failed to fetch destination weather telemetry.');
        }
      } finally {
        setIsLoading(false);
        setIsRefreshing(false);
      }
    },
    [activeLocation.coordinates.lat, activeLocation.coordinates.lng, activeLocation.name, onShowToast, weather]
  );

  useEffect(() => {
    loadWeather(false, activeLocation);
  }, [activeLocation.coordinates.lat, activeLocation.coordinates.lng, activeLocation.name, loadWeather]);

  const handleSelectLocation = (loc: { name: string; lat: number; lng: number }) => {
    userManuallySelectedRef.current = true;
    const newLoc = {
      name: loc.name,
      coordinates: { lat: loc.lat, lng: loc.lng },
      isLiveGps: false,
    };
    setActiveLocation(newLoc);
    try {
      localStorage.setItem('trailoPS_live_gps_weather_location', JSON.stringify(newLoc));
    } catch {}
    setIsSearchOpen(false);
    setSearchQuery('');
    if (onDestinationChange) {
      onDestinationChange(loc.name, { lat: loc.lat, lng: loc.lng });
    }
    if (onShowToast) {
      onShowToast(`Switched weather telemetry to ${loc.name}`);
    }
  };

  const handleAddCustomLocation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customLocationName.trim()) return;

    // Try real geocoding first for the custom location name!
    try {
      const matches = await weatherService.searchLocations(customLocationName.trim());
      if (matches && matches.length > 0) {
        const best = matches[0];
        handleSelectLocation({
          name: best.fullName,
          lat: best.lat,
          lng: best.lng,
        });
        setCustomLocationName('');
        return;
      }
    } catch {}

    const hash = customLocationName.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    const lat = 27.0 + (hash % 60) * 0.1;
    const lng = 77.0 + ((hash * 3) % 110) * 0.1;
    const fullName = `${customLocationName.trim()} (${customAltitude}m ASL)`;

    handleSelectLocation({ name: fullName, lat, lng });
    setCustomLocationName('');
  };

  const filteredPresets = PRESET_LOCATIONS.filter(
    (p) =>
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.tag.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const convertTemp = (celsius: number) => {
    if (unit === 'F') {
      return Math.round((celsius * 9) / 5 + 32);
    }
    return Math.round(celsius);
  };

  const renderWeatherIcon = (type: WeatherConditionType, className = 'w-5 h-5') => {
    switch (type) {
      case 'sunny':
        return <Sun className={`${className} text-amber-500`} />;
      case 'partly_cloudy':
        return <CloudSun className={`${className} text-amber-400`} />;
      case 'cloudy':
        return <Cloud className={`${className} text-slate-400`} />;
      case 'light_rain':
      case 'heavy_rain':
        return <CloudRain className={`${className} text-sky-400`} />;
      case 'snow':
        return <CloudSnow className={`${className} text-cyan-200`} />;
      case 'windy':
        return <Wind className={`${className} text-teal-400`} />;
      case 'fog':
        return <CloudFog className={`${className} text-slate-300`} />;
      default:
        return <Sun className={`${className} text-amber-400`} />;
    }
  };

  return (
    <div className="rounded-3xl bg-white border border-slate-200/90 shadow-sm overflow-hidden transition-all duration-300">
      {/* Header with Coordinates, Quick Weather Preview, and Expand/Compact Arrow */}
      <div className="p-3.5 sm:p-4 bg-slate-900 text-white flex flex-col gap-2.5">
        <div className="flex items-center justify-between gap-2">
          {/* Locality & Telemetry Subtitle */}
          <div className="space-y-0.5 min-w-0 flex-1">
            <div className="flex items-center gap-1.5 text-[11px] font-bold tracking-wide">
              {isLocationOff ? (
                <span className="text-amber-400 flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
                  Location is Turned Off
                </span>
              ) : (
                <span className="text-emerald-400 flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  {activeLocation.isLiveGps ? 'Live GPS Weather' : 'Expedition Route Weather'}
                </span>
              )}
            </div>

            <h3 className="text-sm font-extrabold text-white leading-tight flex items-center gap-1.5 truncate">
              <MapPin className={`w-3.5 h-3.5 shrink-0 ${isLocationOff ? 'text-amber-400' : 'text-rose-400'}`} />
              <span className="truncate max-w-[200px]">
                {isLocationOff ? 'Location Off / Blocked' : activeLocation.name}
              </span>
            </h3>

            {!isLocationOff && (
              <p className="text-[10px] text-slate-400 font-mono">
                {activeLocation.coordinates.lat.toFixed(4)}° N,{' '}
                {activeLocation.coordinates.lng.toFixed(4)}° E
                {weather ? ` · Alt: ${weather.elevationMeters}m ASL` : ''}
              </p>
            )}
          </div>

          {/* Quick Temp & Condition Preview (Visible in Compact & Header) */}
          <div className="flex items-center gap-2 shrink-0">
            {weather && !isLocationOff && (
              <div className="flex items-center gap-2 pr-1.5 border-r border-slate-800">
                <div className="text-right">
                  <span className="text-base sm:text-lg font-black text-white font-mono leading-none block">
                    {convertTemp(weather.temperature)}°{unit}
                  </span>
                  <span className="text-[10px] text-slate-400 font-semibold block capitalize truncate max-w-[85px]">
                    {weather.condition.replace(/_/g, ' ')}
                  </span>
                </div>
                {renderWeatherIcon(weather.conditionType, 'w-6 h-6')}
              </div>
            )}

            {isLocationOff && (
              <button
                type="button"
                onClick={() => detectLiveGpsWeather(true)}
                disabled={isDetectingGps}
                className="px-2.5 py-1 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-[11px] font-black transition-all shadow-xs cursor-pointer active:scale-95"
              >
                {isDetectingGps ? 'Checking...' : 'Turn On'}
              </button>
            )}

            {/* Side Arrow: Expand / Compact Toggle Button */}
            <button
              type="button"
              onClick={() => setIsExpanded(!isExpanded)}
              className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-emerald-400 hover:text-white border border-slate-700 transition-all cursor-pointer flex items-center justify-center active:scale-90"
              title={isExpanded ? 'Collapse weather to compact summary' : 'Expand full weather forecast'}
            >
              {isExpanded ? (
                <ChevronUp className="w-4 h-4 text-emerald-400" />
              ) : (
                <ChevronDown className="w-4 h-4 text-emerald-400" />
              )}
            </button>
          </div>
        </div>

        {/* Action Controls Row (Visible when Expanded) */}
        {isExpanded && (
          <div className="pt-2 border-t border-slate-800 flex items-center justify-between gap-1 text-xs animate-in fade-in duration-200">
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
              Meteorology Telemetry
            </span>

            <div className="flex items-center gap-1">
              {/* GPS Auto-Detect Button */}
              <button
                type="button"
                onClick={() => detectLiveGpsWeather(true)}
                disabled={isDetectingGps}
                className={`p-1.5 rounded-lg border text-xs font-bold transition-all cursor-pointer flex items-center gap-1 ${
                  activeLocation.isLiveGps && !isLocationOff
                    ? 'bg-emerald-600/90 text-white border-emerald-400 shadow-xs'
                    : 'bg-slate-800 hover:bg-slate-700 text-cyan-400 border-slate-700'
                }`}
                title="Detect my real phone GPS location"
              >
                <Navigation className={`w-3.5 h-3.5 ${isDetectingGps ? 'animate-spin' : ''}`} />
                <span className="text-[10px]">GPS</span>
              </button>

              {/* Search Toggle Button */}
              <button
                type="button"
                onClick={() => setIsSearchOpen(!isSearchOpen)}
                className={`p-1.5 rounded-lg border text-xs font-bold transition-all cursor-pointer flex items-center gap-1 ${
                  isSearchOpen
                    ? 'bg-emerald-600 text-white border-emerald-500 shadow-xs'
                    : 'bg-slate-800 hover:bg-slate-700 text-emerald-400 border-slate-700'
                }`}
                title="Search any city or mountain pass"
              >
                <Search className="w-3.5 h-3.5" />
                <span className="text-[10px]">Search</span>
              </button>

              {/* °C / °F Switch */}
              <div className="bg-slate-800 p-0.5 rounded-lg border border-slate-700 flex text-[10px] font-bold">
                <button
                  type="button"
                  onClick={() => setUnit('C')}
                  className={`px-1.5 py-0.5 rounded transition-all cursor-pointer ${
                    unit === 'C'
                      ? 'bg-emerald-600 text-white shadow-xs'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  °C
                </button>
                <button
                  type="button"
                  onClick={() => setUnit('F')}
                  className={`px-1.5 py-0.5 rounded transition-all cursor-pointer ${
                    unit === 'F'
                      ? 'bg-emerald-600 text-white shadow-xs'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  °F
                </button>
              </div>

              {/* Refresh Button */}
              <button
                type="button"
                onClick={() => loadWeather(true)}
                disabled={isRefreshing || isLoading}
                className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 cursor-pointer active:scale-90 transition-all disabled:opacity-50"
                title="Refresh real-time weather sensors"
              >
                <RotateCw
                  className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-emerald-400' : ''}`}
                />
              </button>
            </div>
          </div>
        )}

        {/* Collapsible Destination Search & Custom Weather Addition Panel */}
        {isSearchOpen && (
          <div className="mt-2.5 pt-3 border-t border-slate-800/80 space-y-3 animate-in fade-in slide-in-from-top-2 duration-200">
            {/* Quick GPS Banner inside Search */}
            <button
              type="button"
              onClick={() => {
                detectLiveGpsWeather(true);
                setIsSearchOpen(false);
              }}
              className="w-full py-2 px-3 rounded-xl bg-emerald-600/20 hover:bg-emerald-600/30 border border-emerald-500/40 text-emerald-300 text-xs font-bold flex items-center justify-center gap-2 cursor-pointer transition-colors"
            >
              <Navigation className="w-3.5 h-3.5 text-emerald-400" />
              <span>Use My Live Phone GPS Location</span>
            </button>

            {/* Search Input Bar */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search any city, town, mountain pass, or pin..."
                className="w-full pl-8 pr-8 py-1.5 rounded-xl bg-slate-800/90 border border-slate-700 text-xs text-white placeholder-slate-400 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 font-medium"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>

            {/* Live Search Results (Worldwide Cities, Mountains & Peaks) */}
            {searchQuery.trim().length >= 2 && (
              <div className="space-y-1.5 animate-in fade-in duration-150">
                <div className="flex items-center justify-between text-[10px] font-bold text-slate-400">
                  <span className="uppercase tracking-wider flex items-center gap-1">
                    <Search className="w-2.5 h-2.5 text-emerald-400" />
                    <span>
                      Search Results {isSearchingPlaces ? '(Searching...)' : `(${searchResults.length})`}
                    </span>
                  </span>
                  {isSearchingPlaces && (
                    <RotateCw className="w-2.5 h-2.5 animate-spin text-emerald-400" />
                  )}
                </div>

                {searchResults.length > 0 ? (
                  <div className="space-y-1 max-h-36 overflow-y-auto no-scrollbar">
                    {searchResults.map((place, idx) => (
                      <button
                        key={`${place.name}-${idx}`}
                        type="button"
                        onClick={() =>
                          handleSelectLocation({
                            name: place.fullName,
                            lat: place.lat,
                            lng: place.lng,
                          })
                        }
                        className="w-full text-left p-2 rounded-xl bg-slate-800/90 hover:bg-slate-700/90 border border-slate-700/80 transition-all flex items-center justify-between group cursor-pointer"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <MapPin className="w-3.5 h-3.5 text-rose-400 shrink-0 group-hover:scale-110 transition-transform" />
                          <div className="min-w-0">
                            <span className="text-xs font-bold text-white block truncate">
                              {place.name}
                            </span>
                            <span className="text-[10px] text-slate-400 truncate block">
                              {[place.admin1, place.country].filter(Boolean).join(', ')}
                            </span>
                          </div>
                        </div>
                        <div className="text-right shrink-0">
                          {place.elevation && (
                            <span className="text-[10px] font-mono text-emerald-400 font-bold block">
                              {place.elevation}m ASL
                            </span>
                          )}
                          <span className="text-[9px] text-slate-500 font-mono">
                            {place.lat.toFixed(2)}°, {place.lng.toFixed(2)}°
                          </span>
                        </div>
                      </button>
                    ))}
                  </div>
                ) : !isSearchingPlaces ? (
                  <p className="text-[11px] text-slate-400 italic py-1 text-center bg-slate-800/40 rounded-lg">
                    No matching location found. Use the custom adder below!
                  </p>
                ) : null}
              </div>
            )}

            {/* Quick Presets */}
            {filteredPresets.length > 0 && (
              <div className="space-y-1.5">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                  Quick Cities &amp; Expedition Hubs
                </span>
                <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto no-scrollbar">
                  {filteredPresets.map((loc) => {
                    const isSelected = activeLocation.name === loc.name;
                    return (
                      <button
                        key={loc.name}
                        type="button"
                        onClick={() => handleSelectLocation(loc)}
                        className={`text-[10px] font-semibold px-2 py-1 rounded-lg border transition-all cursor-pointer flex items-center gap-1 ${
                          isSelected
                            ? 'bg-emerald-600 border-emerald-400 text-white font-bold'
                            : 'bg-slate-800/80 hover:bg-slate-700 border-slate-700 text-slate-300 hover:text-white'
                        }`}
                      >
                        <MapPin className="w-2.5 h-2.5 shrink-0 text-emerald-400" />
                        <span className="truncate max-w-[140px]">{loc.name.split(' (')[0]}</span>
                        <span className="text-[8px] text-slate-400 opacity-80">({loc.tag})</span>
                        {isSelected && <Check className="w-2.5 h-2.5 text-white ml-0.5" />}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Custom Destination Weather Adder */}
            <form onSubmit={handleAddCustomLocation} className="pt-2 border-t border-slate-800 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  Add Custom Place / Basecamp
                </span>
                <span className="text-[9px] text-emerald-400">Live Geocoded Lookup</span>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={customLocationName}
                  onChange={(e) => setCustomLocationName(e.target.value)}
                  placeholder="e.g. Krishnanagar, Kedarkantha..."
                  className="flex-1 px-2.5 py-1.5 rounded-xl bg-slate-800/90 border border-slate-700 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 font-medium"
                />
                <div className="flex items-center gap-1 w-20">
                  <input
                    type="number"
                    value={customAltitude}
                    onChange={(e) => setCustomAltitude(e.target.value)}
                    placeholder="2400"
                    className="w-full px-2 py-1.5 rounded-xl bg-slate-800/90 border border-slate-700 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 font-medium text-center"
                    title="Altitude in meters"
                  />
                  <span className="text-[10px] text-slate-400">m</span>
                </div>
                <button
                  type="submit"
                  disabled={!customLocationName.trim()}
                  className="px-2.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white text-xs font-bold transition-all cursor-pointer flex items-center gap-1 shrink-0"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Load</span>
                </button>
              </div>
            </form>
          </div>
        )}
      </div>

      {/* Location is Turned Off Guidance Banner */}
      {isLocationOff && (
        <div className="p-3 bg-amber-50 border-b border-amber-200 text-amber-900 flex items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2 min-w-0">
            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
            <span className="text-[11px] font-semibold text-amber-900 leading-tight">
              Location is turned off. Please turn on device GPS to see accurate live weather for your current place.
            </span>
          </div>
          <button
            type="button"
            onClick={() => detectLiveGpsWeather(true)}
            disabled={isDetectingGps}
            className="px-2.5 py-1 rounded-lg bg-amber-600 hover:bg-amber-500 text-white font-bold text-[11px] shrink-0 cursor-pointer transition-all active:scale-95 shadow-xs"
          >
            {isDetectingGps ? 'Checking...' : 'Turn On'}
          </button>
        </div>
      )}

      {/* Main Body (Expandable via Side Arrow) */}
      {isExpanded && (
        <div>
          {isLoading ? (
            <div className="p-5 space-y-4 animate-pulse">
              <div className="h-20 bg-slate-100 rounded-2xl" />
              <div className="grid grid-cols-4 gap-2">
                <div className="h-14 bg-slate-100 rounded-xl" />
                <div className="h-14 bg-slate-100 rounded-xl" />
                <div className="h-14 bg-slate-100 rounded-xl" />
                <div className="h-14 bg-slate-100 rounded-xl" />
              </div>
              <div className="h-16 bg-slate-100 rounded-2xl" />
            </div>
          ) : weather ? (
            <div className="p-4 space-y-3.5">
              {/* Hero Temperature Card */}
              <div className="rounded-2xl p-4 bg-gradient-to-br from-slate-900 via-[#0a3524] to-[#0f5238] text-white relative overflow-hidden shadow-sm">
                <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-400/15 rounded-full blur-2xl pointer-events-none" />

                <div className="flex items-center justify-between relative z-10">
                  <div>
                    <div className="flex items-baseline gap-1">
                      <span className="text-4xl font-black tracking-tight text-white">
                        {convertTemp(weather.temperature)}°
                      </span>
                      <span className="text-xs font-semibold text-emerald-300">{unit}</span>
                    </div>
                    <div className="text-xs font-bold text-emerald-200 mt-0.5">{weather.condition}</div>
                    <div className="text-[11px] text-slate-300 mt-1 flex items-center gap-2 flex-wrap">
                      <span>
                        Feels like {convertTemp(weather.feelsLike)}°{unit}
                      </span>
                      <span className="text-slate-500">·</span>
                      <span>
                        H: {convertTemp(weather.highTemp)}° L: {convertTemp(weather.lowTemp)}°
                      </span>
                      <span className="text-slate-500">·</span>
                      <span className="text-emerald-300 font-semibold">
                        AQI {weather.airQualityIndex}
                      </span>
                    </div>
                  </div>

                  {/* Big Condition Icon */}
                  <div className="w-16 h-16 rounded-2xl bg-white/10 backdrop-blur-md border border-white/15 flex items-center justify-center shadow-inner">
                    {renderWeatherIcon(weather.conditionType, 'w-9 h-9')}
                  </div>
                </div>
              </div>

              {/* Primary Micro-Metrics Grid (4 items) */}
              <div className="grid grid-cols-4 gap-2">
                {/* Wind */}
                <div className="bg-slate-50 rounded-xl p-2 border border-slate-200/80 text-center">
                  <div className="flex items-center justify-center text-teal-700 mb-1">
                    <Wind className="w-3.5 h-3.5" />
                  </div>
                  <span className="text-[10px] text-slate-500 block font-medium">Wind</span>
                  <span className="text-xs font-extrabold text-slate-900 leading-tight block">
                    {weather.windSpeedKmH}{' '}
                    <span className="text-[9px] font-normal text-slate-500">km/h</span>
                  </span>
                  <span className="text-[9px] text-teal-800 font-semibold block">
                    {weather.windDirection}
                  </span>
                </div>

                {/* Precipitation */}
                <div className="bg-slate-50 rounded-xl p-2 border border-slate-200/80 text-center">
                  <div className="flex items-center justify-center text-sky-600 mb-1">
                    <Droplets className="w-3.5 h-3.5" />
                  </div>
                  <span className="text-[10px] text-slate-500 block font-medium">Rain Prob</span>
                  <span className="text-xs font-extrabold text-slate-900 leading-tight block">
                    {weather.precipitationChance}%
                  </span>
                  <span className="text-[9px] text-sky-700 font-semibold block">
                    UV {weather.uvIndex}
                  </span>
                </div>

                {/* Humidity */}
                <div className="bg-slate-50 rounded-xl p-2 border border-slate-200/80 text-center">
                  <div className="flex items-center justify-center text-indigo-600 mb-1">
                    <Gauge className="w-3.5 h-3.5" />
                  </div>
                  <span className="text-[10px] text-slate-500 block font-medium">Humidity</span>
                  <span className="text-xs font-extrabold text-slate-900 leading-tight block">
                    {weather.humidity}%
                  </span>
                  <span className="text-[9px] text-indigo-700 font-semibold block">
                    Vis {weather.visibilityKm}km
                  </span>
                </div>

                {/* Barometric Pressure & Sun */}
                <div className="bg-slate-50 rounded-xl p-2 border border-slate-200/80 text-center">
                  <div className="flex items-center justify-center text-amber-600 mb-1">
                    <Compass className="w-3.5 h-3.5" />
                  </div>
                  <span className="text-[10px] text-slate-500 block font-medium">Pressure</span>
                  <span className="text-xs font-extrabold text-slate-900 leading-tight block">
                    {weather.pressureHpa}
                  </span>
                  <span className="text-[9px] text-amber-700 font-semibold block">hPa</span>
                </div>
              </div>

              {/* Sunrise / Sunset & UV / Visibility Strip */}
              <div className="grid grid-cols-3 gap-2 px-3 py-2 rounded-xl bg-slate-50 border border-slate-200/70 text-[10px] text-slate-600 font-semibold">
                <div className="flex items-center gap-1.5">
                  <Sunrise className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                  <span>Rise: {weather.sunrise}</span>
                </div>
                <div className="flex items-center justify-center gap-1.5">
                  <Sunset className="w-3.5 h-3.5 text-orange-500 shrink-0" />
                  <span>Set: {weather.sunset}</span>
                </div>
                <div className="flex items-center justify-end gap-1.5">
                  <Eye className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  <span>AQI: {weather.airQualityIndex}</span>
                </div>
              </div>

              {/* Alpine Trail Safety Advisory */}
              <div
                className={`p-3 rounded-2xl border text-xs flex items-start gap-2.5 ${
                  weather.safetyAdvisory.level === 'optimal'
                    ? 'bg-emerald-50/70 border-emerald-200 text-emerald-950'
                    : weather.safetyAdvisory.level === 'warning'
                    ? 'bg-amber-50/80 border-amber-300 text-amber-950'
                    : 'bg-rose-50 border-rose-300 text-rose-950'
                }`}
              >
                <div className="shrink-0 mt-0.5">
                  {weather.safetyAdvisory.level === 'optimal' && (
                    <ShieldCheck className="w-4 h-4 text-emerald-700" />
                  )}
                  {weather.safetyAdvisory.level === 'warning' && (
                    <AlertTriangle className="w-4 h-4 text-amber-700" />
                  )}
                  {weather.safetyAdvisory.level === 'severe' && (
                    <AlertOctagon className="w-4 h-4 text-rose-700" />
                  )}
                </div>
                <div className="space-y-0.5">
                  <span className="font-extrabold block text-[11px] uppercase tracking-wide">
                    {weather.safetyAdvisory.title}
                  </span>
                  <p className="text-[11px] leading-relaxed opacity-90">
                    {weather.safetyAdvisory.description}
                  </p>
                </div>
              </div>

              {/* Forecast Tabs: Hourly vs 5-Day */}
              <div className="space-y-2 pt-1">
                <div className="flex items-center justify-between">
                  <div className="flex bg-slate-100 p-0.5 rounded-xl border border-slate-200 text-xs">
                    <button
                      type="button"
                      onClick={() => setForecastTab('hourly')}
                      className={`px-3 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                        forecastTab === 'hourly'
                          ? 'bg-white text-slate-900 shadow-xs'
                          : 'text-slate-500 hover:text-slate-800'
                      }`}
                    >
                      Hourly (12h)
                    </button>
                    <button
                      type="button"
                      onClick={() => setForecastTab('daily')}
                      className={`px-3 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                        forecastTab === 'daily'
                          ? 'bg-white text-slate-900 shadow-xs'
                          : 'text-slate-500 hover:text-slate-800'
                      }`}
                    >
                      5-Day Outlook
                    </button>
                  </div>

                  <span className="text-[10px] text-slate-500 font-medium">
                    Updated {weather.lastUpdated}
                  </span>
                </div>

                {/* View A: Consecutive Hourly Forecast Scrollable Rail */}
                {forecastTab === 'hourly' && (
                  <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-1">
                    {weather.hourly.map((h, i) => (
                      <div
                        key={i}
                        className={`flex flex-col items-center justify-between p-2.5 min-w-[70px] rounded-xl border transition-all ${
                          i === 0
                            ? 'bg-emerald-50/80 border-emerald-300 shadow-2xs'
                            : 'bg-slate-50 border-slate-200'
                        }`}
                      >
                        <span className="text-[10px] font-bold text-slate-600">{h.time}</span>
                        <div className="my-1.5">{renderWeatherIcon(h.conditionType, 'w-5 h-5')}</div>
                        <span className="text-xs font-extrabold text-slate-900">
                          {convertTemp(h.temp)}°
                        </span>
                        <span className="text-[9px] text-sky-600 font-semibold mt-0.5">
                          {h.rainChance}%
                        </span>
                      </div>
                    ))}
                  </div>
                )}

                {/* View B: 5-Day Outlook List */}
                {forecastTab === 'daily' && (
                  <div className="space-y-1.5 pt-1">
                    {weather.daily.map((d, i) => (
                      <div
                        key={i}
                        className="flex items-center justify-between p-2 rounded-xl bg-slate-50 border border-slate-200/80 text-xs"
                      >
                        <div className="flex items-center gap-2 w-24">
                          <span className="font-bold text-slate-800">{d.day}</span>
                          <span className="text-[10px] text-slate-500 font-medium">{d.date}</span>
                        </div>

                        <div className="flex items-center gap-1.5 flex-1 justify-center">
                          {renderWeatherIcon(d.conditionType, 'w-4 h-4')}
                          <span className="text-[11px] text-slate-700 font-medium truncate max-w-[100px]">
                            {d.condition}
                          </span>
                        </div>

                        <div className="flex items-center gap-2 w-24 justify-end text-right">
                          <span className="text-[10px] text-sky-600 font-bold">{d.rainChance}%</span>
                          <span className="font-extrabold text-slate-900">{convertTemp(d.high)}°</span>
                          <span className="text-slate-500 font-medium">{convertTemp(d.low)}°</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="p-5 text-center space-y-3 bg-slate-50/70 rounded-2xl m-3 border border-dashed border-slate-200">
              <div className="w-10 h-10 rounded-xl bg-slate-200 text-slate-700 mx-auto flex items-center justify-center">
                <Compass className="w-5 h-5 text-emerald-800" />
              </div>
              <div className="space-y-1">
                <h5 className="text-xs font-bold text-slate-800">Weather Telemetry Offline</h5>
                <p className="text-[11px] text-slate-600 font-mono">
                  Coordinates: {activeLocation.coordinates.lat.toFixed(4)}°N,{' '}
                  {activeLocation.coordinates.lng.toFixed(4)}°E
                </p>
                <p className="text-[10px] text-slate-500 max-w-xs mx-auto leading-relaxed">
                  Live meteorology requires an active network connection. Route coordinates and offline
                  navigation markers remain active.
                </p>
              </div>
              <button
                type="button"
                onClick={() => loadWeather(true)}
                disabled={isRefreshing}
                className="px-3 py-1.5 bg-[#0f5238] hover:bg-[#166534] text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 mx-auto cursor-pointer shadow-xs active:scale-95"
              >
                <RotateCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
                <span>Retry Connection</span>
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
