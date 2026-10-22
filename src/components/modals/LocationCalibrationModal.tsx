import React, { useState, useEffect } from 'react';
import {
  MapPin,
  Search,
  Crosshair,
  Check,
  X,
  Compass,
  RotateCw,
  Sparkles,
  AlertCircle,
  Navigation,
} from 'lucide-react';
import { weatherService, GeocodedLocation } from '../../services/weatherService';

interface LocationCalibrationModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentCoords: { lat: number; lng: number };
  currentLocationName?: string;
  currentLabel?: string;
  onLocationCalibrated: (location: {
    lat: number;
    lng: number;
    name: string;
    isCalibrated: boolean;
  }) => void;
  onShowToast?: (message: string) => void;
}

const POPULAR_PRESETS: Array<{ name: string; lat: number; lng: number; tag: string }> = [
  { name: 'Bagula, Nadia', lat: 23.3333, lng: 88.65, tag: 'Nadia, WB' },
  { name: 'Ranaghat, Nadia', lat: 23.18, lng: 88.58, tag: 'Nadia, WB' },
  { name: 'Krishnanagar, Nadia', lat: 23.40, lng: 88.50, tag: 'Nadia, WB' },
  { name: 'Kolkata, West Bengal', lat: 22.5726, lng: 88.3639, tag: 'West Bengal' },
  { name: 'Siliguri, West Bengal', lat: 26.7271, lng: 88.3953, tag: 'Transit Hub' },
  { name: 'Darjeeling (2,042m)', lat: 27.041, lng: 88.2663, tag: 'Hill Station' },
  { name: 'Pelling, West Sikkim (2,150m)', lat: 27.3184, lng: 88.2412, tag: 'Expedition' },
  { name: 'Gangtok, Sikkim (1,650m)', lat: 27.3389, lng: 88.6065, tag: 'Sikkim' },
  { name: 'New Delhi, India', lat: 28.6139, lng: 77.209, tag: 'Capital' },
];

export const LocationCalibrationModal: React.FC<LocationCalibrationModalProps> = ({
  isOpen,
  onClose,
  currentCoords,
  currentLocationName,
  currentLabel,
  onLocationCalibrated,
  onShowToast,
}) => {
  const initialLabel = currentLabel || currentLocationName || 'Current Location';
  const [selectedCoords, setSelectedCoords] = useState<{ lat: number; lng: number }>(currentCoords);
  const [selectedName, setSelectedName] = useState<string>(initialLabel);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<GeocodedLocation[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isDetectingHardwareGps, setIsDetectingHardwareGps] = useState(false);
  const [gpsStatusMessage, setGpsStatusMessage] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setSelectedCoords(currentCoords);
      setSelectedName(initialLabel);
      setGpsStatusMessage(null);
    }
  }, [isOpen, currentCoords, initialLabel]);

  // Debounced place search querying Open-Meteo Geocoding
  useEffect(() => {
    if (!searchQuery.trim() || searchQuery.trim().length < 2) {
      setSearchResults([]);
      setIsSearching(false);
      return;
    }

    const timer = setTimeout(async () => {
      setIsSearching(true);
      try {
        const results = await weatherService.searchLocations(searchQuery.trim());
        setSearchResults(results.slice(0, 8));
      } catch {
        setSearchResults([]);
      } finally {
        setIsSearching(false);
      }
    }, 280);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  if (!isOpen) return null;

  const handleForceHardwareGps = () => {
    if (!navigator.geolocation) {
      setGpsStatusMessage('Hardware GPS is not supported by this browser.');
      onShowToast?.('Geolocation API unavailable.');
      return;
    }

    setIsDetectingHardwareGps(true);
    setGpsStatusMessage('Requesting high-accuracy hardware satellite lock...');

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const lat = Number(pos.coords.latitude.toFixed(4));
        const lng = Number(pos.coords.longitude.toFixed(4));
        setSelectedCoords({ lat, lng });

        try {
          const rev = await weatherService.reverseGeocode(lat, lng);
          const resolvedName = rev?.fullName || rev?.name || `${lat.toFixed(4)}°N, ${lng.toFixed(4)}°E`;
          setSelectedName(resolvedName);
          setGpsStatusMessage(`✓ Hardware GPS Lock Acquired: ${resolvedName}`);
          onShowToast?.(`📍 High-accuracy GPS lock: ${resolvedName}`);
        } catch {
          setSelectedName(`${lat.toFixed(4)}°N, ${lng.toFixed(4)}°E`);
          setGpsStatusMessage(`✓ GPS Coordinates: ${lat.toFixed(4)}, ${lng.toFixed(4)}`);
        } finally {
          setIsDetectingHardwareGps(false);
        }
      },
      (err) => {
        setIsDetectingHardwareGps(false);
        if (err.code === 1) {
          setGpsStatusMessage('Permission denied by browser. Use Place Search below to pick your city.');
          onShowToast?.('Browser GPS permission was denied. Select your town below.');
        } else if (err.code === 3) {
          setGpsStatusMessage('GPS Satellite search timed out. Select your town or pin below.');
          onShowToast?.('GPS search timed out.');
        } else {
          setGpsStatusMessage('Hardware GPS signal weak. Select your town or pin below.');
        }
      },
      {
        enableHighAccuracy: true,
        timeout: 12000,
        maximumAge: 0,
      }
    );
  };

  const handleSelectPlace = (place: GeocodedLocation) => {
    const lat = Number(place.lat.toFixed(4));
    const lng = Number(place.lng.toFixed(4));
    setSelectedCoords({ lat, lng });
    setSelectedName(place.fullName || place.name);
    setSearchQuery('');
    setSearchResults([]);
    setGpsStatusMessage(`Selected: ${place.fullName || place.name}`);
    onShowToast?.(`Selected ${place.name}`);
  };

  const handleSelectPreset = (preset: typeof POPULAR_PRESETS[0]) => {
    setSelectedCoords({ lat: preset.lat, lng: preset.lng });
    setSelectedName(preset.name);
    setSearchQuery('');
    setSearchResults([]);
    setGpsStatusMessage(`Selected: ${preset.name}`);
    onShowToast?.(`Selected ${preset.name}`);
  };

  const handleConfirmCalibration = () => {
    const payload = {
      lat: selectedCoords.lat,
      lng: selectedCoords.lng,
      name: selectedName,
      isCalibrated: true,
    };

    // Store in all persistent keys so Weather, SOS Coordinates, and Trail Map stay in sync
    try {
      localStorage.setItem('trailoPS_calibrated_location', JSON.stringify(payload));
      localStorage.setItem('trailoPS_live_gps_coords', JSON.stringify({
        lat: selectedCoords.lat,
        lng: selectedCoords.lng,
        altitude: 2150,
      }));
      localStorage.setItem('trailoPS_live_gps_weather_location', JSON.stringify({
        name: selectedName,
        coordinates: { lat: selectedCoords.lat, lng: selectedCoords.lng },
        isLiveGps: true,
      }));

      // Broadcast reactive update to all active screens
      window.dispatchEvent(
        new CustomEvent('trailoPS_location_updated', {
          detail: {
            lat: selectedCoords.lat,
            lng: selectedCoords.lng,
            label: selectedName,
            isLiveGps: true,
            isCalibrated: true,
          },
        })
      );
    } catch {}

    onLocationCalibrated(payload);
    onShowToast?.(`📍 Location locked to: ${selectedName}`);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-md animate-in fade-in duration-200">
      <div className="w-full max-w-md bg-white rounded-3xl border border-slate-200 shadow-2xl flex flex-col max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="px-5 py-4 bg-gradient-to-r from-emerald-950 via-[#0f5238] to-teal-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white/10 text-emerald-300 flex items-center justify-center border border-white/20 shadow-xs">
              <Crosshair className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-extrabold text-base tracking-tight text-white">Calibrate GPS Location</h3>
                <span className="px-1.5 py-0.5 rounded text-[9px] font-black uppercase tracking-wider bg-emerald-400 text-slate-950">
                  Fixed Pin
                </span>
              </div>
              <p className="text-[11px] text-emerald-200">
                Fixes Weather, SOS Coordinates &amp; Map Pin
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center cursor-pointer transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-4 space-y-4 overflow-y-auto max-h-[calc(90vh-140px)] no-scrollbar">
          {/* Active Coordinates Display Card */}
          <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
            <div className="flex items-start justify-between">
              <div>
                <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block">
                  Target Calibrated Location
                </span>
                <h4 className="text-sm font-black text-slate-900 mt-0.5 leading-snug">
                  {selectedName}
                </h4>
              </div>
              <span className="px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-900 text-[10px] font-bold border border-emerald-300">
                Calibrated
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2 pt-1 font-mono text-xs">
              <div className="p-2 bg-white rounded-xl border border-slate-200">
                <span className="text-[9.5px] font-bold text-slate-400 uppercase block font-sans">Latitude</span>
                <span className="font-black text-slate-800">{selectedCoords.lat.toFixed(4)}°N</span>
              </div>
              <div className="p-2 bg-white rounded-xl border border-slate-200">
                <span className="text-[9.5px] font-bold text-slate-400 uppercase block font-sans">Longitude</span>
                <span className="font-black text-slate-800">{selectedCoords.lng.toFixed(4)}°E</span>
              </div>
            </div>

            {gpsStatusMessage && (
              <p className="text-[11px] text-emerald-800 font-semibold bg-emerald-50 p-2 rounded-xl border border-emerald-200">
                {gpsStatusMessage}
              </p>
            )}
          </div>

          {/* Action 1: Force Hardware GPS */}
          <button
            type="button"
            onClick={handleForceHardwareGps}
            disabled={isDetectingHardwareGps}
            className="w-full py-2.5 px-3 rounded-2xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 shadow-xs"
          >
            <RotateCw className={`w-3.5 h-3.5 ${isDetectingHardwareGps ? 'animate-spin text-emerald-400' : ''}`} />
            <span>{isDetectingHardwareGps ? 'Acquiring Satellite Lock...' : 'Re-Detect Hardware GPS'}</span>
          </button>

          {/* Action 2: Worldwide Place Search Input */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-bold text-slate-700 block">
              Search Any City, Town, Village or Mountain Pass
            </label>
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="e.g. Bagula, Ranaghat, Kolkata, Pelling..."
                className="w-full pl-9 pr-8 py-2.5 rounded-2xl bg-slate-50 border border-slate-200 text-xs font-semibold text-slate-900 placeholder:text-slate-400 focus:bg-white focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500/20 outline-none transition-all"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-2.5 p-1 text-slate-400 hover:text-slate-600"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Live Search Results Dropdown */}
            {isSearching ? (
              <div className="p-3 text-center text-xs text-slate-500 bg-slate-50 rounded-xl border border-slate-200">
                Searching places worldwide...
              </div>
            ) : searchResults.length > 0 ? (
              <div className="max-h-48 overflow-y-auto rounded-2xl border border-slate-200 bg-white divide-y divide-slate-100 shadow-md">
                {searchResults.map((result, idx) => (
                  <button
                    key={`${result.lat}-${result.lng}-${idx}`}
                    type="button"
                    onClick={() => handleSelectPlace(result)}
                    className="w-full p-2.5 text-left hover:bg-emerald-50/80 transition-colors flex items-center justify-between cursor-pointer"
                  >
                    <div>
                      <p className="text-xs font-bold text-slate-900 leading-tight">{result.name}</p>
                      <p className="text-[10px] text-slate-500 mt-0.5">{result.fullName}</p>
                    </div>
                    <span className="text-[10px] font-mono text-emerald-800 font-bold bg-emerald-50 px-1.5 py-0.5 rounded">
                      {result.lat.toFixed(2)}°, {result.lng.toFixed(2)}°
                    </span>
                  </button>
                ))}
              </div>
            ) : null}
          </div>

          {/* Action 3: Quick Regional & Alpine Presets */}
          <div className="space-y-1.5">
            <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block">
              Quick Presets
            </span>
            <div className="grid grid-cols-2 gap-1.5">
              {POPULAR_PRESETS.map((preset) => (
                <button
                  key={preset.name}
                  type="button"
                  onClick={() => handleSelectPreset(preset)}
                  className={`p-2 rounded-xl border text-left transition-all cursor-pointer ${
                    selectedName.includes(preset.name.split(',')[0].trim())
                      ? 'bg-emerald-50 border-emerald-400 ring-2 ring-emerald-300'
                      : 'bg-white border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  <p className="text-[11px] font-bold text-slate-900 leading-tight truncate">
                    {preset.name}
                  </p>
                  <span className="text-[9px] text-slate-500 block mt-0.5 font-mono">
                    {preset.lat.toFixed(2)}°N, {preset.lng.toFixed(2)}°E
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Modal Footer Controls */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center gap-2">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-2.5 rounded-xl border border-slate-200 text-slate-700 text-xs font-semibold hover:bg-slate-100 cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleConfirmCalibration}
            className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-emerald-700 to-teal-800 hover:from-emerald-800 hover:to-teal-900 text-white text-xs font-bold shadow-md active:scale-95 transition-all cursor-pointer flex items-center justify-center gap-1.5"
          >
            <Check className="w-4 h-4" />
            <span>Lock &amp; Calibrate</span>
          </button>
        </div>
      </div>
    </div>
  );
};
