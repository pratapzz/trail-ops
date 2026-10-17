import React, { useState, useEffect } from 'react';
import {
  X,
  MapPin,
  Compass,
  Users,
  Check,
  Camera,
  Calendar,
  DollarSign,
  Navigation,
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  Sparkles,
  Search,
  SkipForward,
  Minus,
  Plus,
  Hand,
} from 'lucide-react';
import { Waypoint } from '../../types';
import { weatherService } from '../../services/weatherService';
import {
  APIProvider,
  Map,
  AdvancedMarker,
  Pin,
} from '@vis.gl/react-google-maps';

interface CreateTripModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreate: (tripData: {
    name: string;
    fromLocation: string;
    destination: string;
    coordinates: { lat: number; lng: number };
    departureDate: string;
    returnDate: string;
    budgetPerMember: number;
    coverBg: string;
    passkey: string;
    waypoints: Waypoint[];
  }) => void;
}

export const CreateTripModal: React.FC<CreateTripModalProps> = ({
  isOpen,
  onClose,
  onCreate,
}) => {
  const [wizardStep, setWizardStep] = useState<1 | 2>(1);

  // Step 1: Group Basics, Cover, Destination, Dates & Budget
  const [name, setName] = useState('Denali Base Alpha Expedition');
  const [coverBg, setCoverBg] = useState(
    'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=1200&q=80'
  );
  const [fromLocation, setFromLocation] = useState('Siliguri / Bagdogra Junction');
  const [destination, setDestination] = useState('Pelling High Ridge (2,150m ASL)');
  const [departureDate, setDepartureDate] = useState('2026-10-24');
  const [returnDate, setReturnDate] = useState('2026-10-30');
  const [budgetPerMember, setBudgetPerMember] = useState<number>(6000);
  const [generatedPasskey] = useState('TR89K2');

  // Step 2: Google Maps Pointing with Red Markers
  const [mapCenter, setMapCenter] = useState<{ lat: number; lng: number }>({
    lat: 27.3184,
    lng: 88.2412,
  });
  const [mapGestureMode, setMapGestureMode] = useState<'greedy' | 'cooperative'>('greedy');
  const [searchLocationQuery, setSearchLocationQuery] = useState('');
  const [waypoints, setWaypoints] = useState<Waypoint[]>([
    {
      id: '1',
      name: 'Start: Siliguri Base Transit',
      elevation: '120m',
      type: 'start',
      isRedMarked: true,
      lat: 26.7271,
      lng: 88.3953,
    },
    {
      id: '2',
      name: 'Pass 1: Yuksom Foothills',
      elevation: '1,780m',
      type: 'pass',
      isRedMarked: true,
      lat: 27.3698,
      lng: 88.2212,
    },
    {
      id: '3',
      name: 'Camp: Pelling Ridge Marker #3',
      elevation: '2,150m',
      type: 'camp',
      isRedMarked: true,
      lat: 27.3184,
      lng: 88.2412,
    },
    {
      id: '4',
      name: 'Summit: Dzongri High Point',
      elevation: '4,020m',
      type: 'summit',
      isRedMarked: true,
      lat: 27.5028,
      lng: 88.1697,
    },
  ]);
  const [newPointElevation, setNewPointElevation] = useState('2,650m');

  const [searchedLocation, setSearchedLocation] = useState<{
    name: string;
    lat: number;
    lng: number;
    elevation: string;
  } | null>(null);
  const [isSearchingMap, setIsSearchingMap] = useState(false);

  const mapsApiKey =
    import.meta.env.VITE_GOOGLE_MAPS_API_KEY ||
    'AIzaSyAOJhA8O6Aja7BCmmP8qs7y4M2A4Dll968';

  // Always reset to Step 1 (Group Details & Budget) whenever modal opens
  useEffect(() => {
    if (isOpen) {
      setWizardStep(1);
      setSearchLocationQuery('');
      setSearchedLocation(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSearchLocation = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!searchLocationQuery.trim()) return;

    setIsSearchingMap(true);
    try {
      const places = await weatherService.searchLocations(searchLocationQuery.trim());
      if (places && places.length > 0) {
        const top = places[0];
        const targetLat = top.lat;
        const targetLng = top.lng;
        const targetElevation = top.elevation ? `${top.elevation}m` : '2,200m';
        setMapCenter({ lat: targetLat, lng: targetLng });
        setSearchedLocation({
          name: top.name,
          lat: targetLat,
          lng: targetLng,
          elevation: targetElevation,
        });
        return;
      }
    } catch {
      // fallback
    } finally {
      setIsSearchingMap(false);
    }

    // Secondary fallback coordinates resolver for common trail & mountain regions
    const query = searchLocationQuery.toLowerCase();
    let targetLat = 27.3184;
    let targetLng = 88.2412;
    let targetElevation = '2,450m';

    if (query.includes('pelling')) {
      targetLat = 27.3184;
      targetLng = 88.2412;
      targetElevation = '2,150m';
    } else if (query.includes('yuksom')) {
      targetLat = 27.3698;
      targetLng = 88.2212;
      targetElevation = '1,780m';
    } else if (query.includes('dzongri')) {
      targetLat = 27.5028;
      targetLng = 88.1697;
      targetElevation = '4,020m';
    } else if (query.includes('manali')) {
      targetLat = 32.2432;
      targetLng = 77.1892;
      targetElevation = '2,050m';
    } else if (query.includes('leh') || query.includes('ladakh')) {
      targetLat = 34.1526;
      targetLng = 77.5771;
      targetElevation = '3,500m';
    } else if (query.includes('darjeeling')) {
      targetLat = 27.041;
      targetLng = 88.2663;
      targetElevation = '2,042m';
    } else {
      const hash = query.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
      targetLat = 26.5 + (hash % 80) * 0.1;
      targetLng = 77.0 + ((hash * 2) % 120) * 0.1;
    }

    setMapCenter({ lat: targetLat, lng: targetLng });
    setSearchedLocation({
      name: searchLocationQuery.trim(),
      lat: targetLat,
      lng: targetLng,
      elevation: targetElevation,
    });
  };

  const handleAddSearchedPin = () => {
    if (!searchedLocation) return;
    const newWp: Waypoint = {
      id: `wp-${Date.now()}`,
      name: searchedLocation.name,
      elevation: searchedLocation.elevation,
      type: 'camp',
      isRedMarked: true,
      lat: searchedLocation.lat,
      lng: searchedLocation.lng,
    };
    setWaypoints((prev) => [...prev, newWp]);
    setSearchedLocation(null);
    setSearchLocationQuery('');
  };

  const handleDeleteWaypoint = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setWaypoints((prev) => prev.filter((w) => w.id !== id));
  };

  const toggleWaypointMark = (id: string) => {
    setWaypoints((prev) =>
      prev.map((w) => (w.id === id ? { ...w, isRedMarked: !w.isRedMarked } : w))
    );
  };

  const handleFinalSubmit = (skipMap = false) => {
    onCreate({
      name,
      fromLocation,
      destination,
      coordinates: mapCenter,
      departureDate,
      returnDate,
      budgetPerMember,
      coverBg,
      passkey: generatedPasskey,
      waypoints: skipMap ? [] : waypoints,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-md animate-in fade-in duration-200">
      <div className="w-full max-w-md bg-white rounded-3xl border border-slate-200 shadow-2xl flex flex-col max-h-[92vh] overflow-hidden">
        {/* Top Header */}
        <div className="px-5 py-4 bg-gradient-to-r from-emerald-950 via-[#0f5238] to-teal-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-white/10 text-emerald-300 flex items-center justify-center border border-white/20">
              <Compass className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-sm text-white">Create Expedition Group</h3>
              <p className="text-[11px] text-emerald-200">
                Step {wizardStep} of 2: {wizardStep === 1 ? 'Details & Dates' : 'Google Maps Pointing'}
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

        {/* Wizard Step Tabs */}
        <div className="flex items-center justify-between px-5 py-2.5 bg-slate-50 border-b border-slate-200 text-xs">
          <button
            type="button"
            onClick={() => setWizardStep(1)}
            className={`font-bold transition-colors ${
              wizardStep === 1 ? 'text-emerald-900' : 'text-slate-400'
            }`}
          >
            1. Group Details &amp; Budget
          </button>
          <span>→</span>
          <button
            type="button"
            onClick={() => setWizardStep(2)}
            className={`font-bold transition-colors ${
              wizardStep === 2 ? 'text-emerald-900' : 'text-slate-400'
            }`}
          >
            2. Google Maps Pointing (Optional)
          </button>
        </div>

        {/* Body content */}
        <div className="flex-1 p-5 overflow-y-auto space-y-4 bg-[#f8faf9]">
          {/* STEP 1: GROUP NAME, BACKGROUND COVER, DESTINATION, DATES & BUDGET */}
          {wizardStep === 1 && (
            <div className="space-y-4 animate-in fade-in duration-200">
              {/* Group Name */}
              <div className="space-y-2">
                <label className="block text-xs font-semibold text-slate-700">
                  Group / Expedition Name
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Denali Base Alpha Expedition"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-slate-200 text-xs font-bold text-slate-900 focus:border-emerald-600 outline-none"
                  required
                />

                {/* Cover Image Preview & Presets */}
                <div className="mt-2 relative h-28 rounded-2xl overflow-hidden border border-slate-200 shadow-2xs group">
                  <img src={coverBg} alt="Cover Preview" className="w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-black/40 flex items-center justify-between p-3 text-white">
                    <span className="text-[11px] font-bold flex items-center gap-1">
                      <Camera className="w-3.5 h-3.5" />
                      Background Cover
                    </span>
                    <div className="flex gap-1.5">
                      <button
                        type="button"
                        onClick={() =>
                          setCoverBg(
                            'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=1200&q=80'
                          )
                        }
                        className="px-2 py-0.5 rounded bg-white/20 hover:bg-white/40 text-[10px] font-bold backdrop-blur-xs"
                      >
                        Sunrise
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          setCoverBg(
                            'https://images.unsplash.com/photo-1511497584788-87676104235f?auto=format&fit=crop&w=1200&q=80'
                          )
                        }
                        className="px-2 py-0.5 rounded bg-white/20 hover:bg-white/40 text-[10px] font-bold backdrop-blur-xs"
                      >
                        Pines
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          setCoverBg(
                            'https://images.unsplash.com/photo-1519681393784-d120267933ba?auto=format&fit=crop&w=1200&q=80'
                          )
                        }
                        className="px-2 py-0.5 rounded bg-white/20 hover:bg-white/40 text-[10px] font-bold backdrop-blur-xs"
                      >
                        Glacier
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Journey Route Origin & Destination */}
              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    From Where (Origin)
                  </label>
                  <input
                    type="text"
                    value={fromLocation}
                    onChange={(e) => setFromLocation(e.target.value)}
                    placeholder="e.g. Siliguri / Bagdogra"
                    className="w-full px-3 py-2 rounded-xl bg-white border border-slate-200 text-xs text-slate-900 focus:border-emerald-600 outline-none"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Journey Destination
                  </label>
                  <input
                    type="text"
                    value={destination}
                    onChange={(e) => setDestination(e.target.value)}
                    placeholder="e.g. Pelling High Pass"
                    className="w-full px-3 py-2 rounded-xl bg-white border border-slate-200 text-xs text-slate-900 focus:border-emerald-600 outline-none"
                    required
                  />
                </div>
              </div>

              {/* Departure & Return Dates (For countdown in Squad Dusk Briefing) */}
              <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200 space-y-2">
                <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800">
                  <Calendar className="w-4 h-4 text-emerald-700" />
                  <span>Expedition Departure &amp; Return Dates</span>
                </div>
                <div className="grid grid-cols-2 gap-2.5">
                  <div>
                    <label className="block text-[11px] text-slate-500 mb-1">
                      Departure Date (जाने का दिन)
                    </label>
                    <input
                      type="date"
                      value={departureDate}
                      onChange={(e) => setDepartureDate(e.target.value)}
                      className="w-full px-2.5 py-1.5 rounded-xl bg-white border border-slate-200 text-xs font-bold text-slate-800 outline-none focus:border-emerald-600"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] text-slate-500 mb-1">
                      Return Date (आने का दिन)
                    </label>
                    <input
                      type="date"
                      value={returnDate}
                      onChange={(e) => setReturnDate(e.target.value)}
                      className="w-full px-2.5 py-1.5 rounded-xl bg-white border border-slate-200 text-xs font-bold text-slate-800 outline-none focus:border-emerald-600"
                      required
                    />
                  </div>
                </div>
                <p className="text-[10px] text-slate-500">
                  Days remaining until departure will show as the live countdown in the squad dusk briefing.
                </p>
              </div>

              {/* Budget For Everyone */}
              <div className="bg-emerald-50/70 p-4 rounded-2xl border border-emerald-200/80 space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-emerald-950">
                    Individual Budget For Everyone (₹)
                  </label>
                  <span className="text-xs font-black text-emerald-800 bg-white px-2.5 py-0.5 rounded-full border border-emerald-300">
                    ₹{budgetPerMember.toLocaleString()} / member
                  </span>
                </div>
                <div className="relative flex items-center">
                  <span className="absolute left-3 text-emerald-700 font-bold text-sm">₹</span>
                  <input
                    type="number"
                    value={budgetPerMember}
                    onChange={(e) => setBudgetPerMember(Number(e.target.value))}
                    step="500"
                    className="w-full pl-8 pr-3 py-2.5 rounded-xl bg-white border border-emerald-300 text-sm font-bold text-slate-900 focus:ring-2 focus:ring-emerald-500/20 outline-none"
                  />
                </div>
                <p className="text-[11px] text-emerald-800 font-medium">
                  Each joining member will have an individual payment tracker of{' '}
                  <strong>₹{budgetPerMember.toLocaleString()}</strong> on their profile &amp; home screen.
                </p>
              </div>

              <div className="flex gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => handleFinalSubmit(true)}
                  className="w-1/2 py-3 rounded-2xl border border-slate-200 hover:bg-slate-100 text-slate-700 text-xs font-bold flex items-center justify-center gap-1 cursor-pointer transition-all"
                >
                  <SkipForward className="w-3.5 h-3.5 text-slate-500" />
                  <span>Skip Maps &amp; Create</span>
                </button>
                <button
                  type="button"
                  onClick={() => setWizardStep(2)}
                  className="w-1/2 py-3 rounded-2xl bg-[#0f5238] hover:bg-emerald-800 text-white text-xs font-bold flex items-center justify-center gap-1.5 shadow-md active:scale-98 transition-all cursor-pointer"
                >
                  <span>Google Maps Points</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* STEP 2: GOOGLE MAPS INTEGRATION WITH RED MARKS & SKIP OPTION */}
          {wizardStep === 2 && (
            <div className="space-y-3.5 animate-in fade-in duration-200">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-rose-600" />
                    <span>Google Maps Route Pointing</span>
                  </h4>
                  <p className="text-[11px] text-slate-500">
                    Search mountain spots &amp; mark trail checkpoints in red
                  </p>
                </div>
                <span className="text-[10px] font-bold text-rose-700 bg-rose-50 border border-rose-200 px-2 py-0.5 rounded-full">
                  Red Pin Protocol
                </span>
              </div>

              {/* Location Search Bar for Google Maps */}
              <form onSubmit={handleSearchLocation} className="flex gap-2">
                <div className="relative flex-1">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    value={searchLocationQuery}
                    onChange={(e) => setSearchLocationQuery(e.target.value)}
                    placeholder="Search place on Google Maps (e.g. Pelling, Yuksom)..."
                    className="w-full pl-9 pr-3 py-2 rounded-xl bg-white border border-slate-200 text-xs text-slate-900 outline-none focus:border-rose-500"
                  />
                </div>
                <button
                  type="submit"
                  className="px-3.5 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow-xs active:scale-95 transition-transform cursor-pointer"
                >
                  Search Place
                </button>
              </form>

              {/* SEARCHED LOCATION RESULT CARD: ADD AS RED PIN TO MAP */}
              {searchedLocation && (
                <div className="p-3 rounded-2xl bg-rose-50 border-2 border-rose-300/80 flex items-center justify-between shadow-xs animate-in fade-in slide-in-from-top-1 duration-200">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-xl bg-rose-600 text-white flex items-center justify-center shadow-xs">
                      <MapPin className="w-4 h-4 fill-white text-rose-600" />
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-extrabold text-slate-900">
                          {searchedLocation.name}
                        </span>
                        <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-white text-rose-700 border border-rose-200">
                          Found
                        </span>
                      </div>
                      <span className="text-[10px] text-slate-500 font-mono block">
                        Altitude: {searchedLocation.elevation} • Coords: {searchedLocation.lat.toFixed(4)}, {searchedLocation.lng.toFixed(4)}
                      </span>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={handleAddSearchedPin}
                    className="px-3 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-black flex items-center gap-1 cursor-pointer active:scale-95 shadow-sm transition-transform"
                  >
                    <Plus className="w-3.5 h-3.5 stroke-[3]" />
                    <span>Add Red Pin</span>
                  </button>
                </div>
              )}

              {/* Two-finger Gesture Hint & Mode Switcher (Request 10) */}
              <div className="flex items-center justify-between px-3 py-1.5 rounded-xl bg-slate-100 border border-slate-200 text-[10px] text-slate-700 font-semibold">
                <span className="flex items-center gap-1.5">
                  <Hand className="w-3.5 h-3.5 text-rose-600" />
                  <span>
                    {mapGestureMode === 'greedy'
                      ? 'Map Moving: Free 1 & 2-Finger Pan / Zoom Active'
                      : 'Two-Finger Touch: Use 2 fingers to move map'}
                  </span>
                </span>
                <button
                  type="button"
                  onClick={() =>
                    setMapGestureMode(mapGestureMode === 'greedy' ? 'cooperative' : 'greedy')
                  }
                  className={`px-2 py-0.5 rounded-md font-bold transition-all cursor-pointer ${
                    mapGestureMode === 'greedy'
                      ? 'bg-rose-600 text-white shadow-2xs'
                      : 'bg-white text-slate-700 border border-slate-300'
                  }`}
                >
                  {mapGestureMode === 'greedy' ? '⚡ Free Map' : '✋ 2-Finger'}
                </button>
              </div>

              {/* Interactive Google Map Container with Touch Event Isolation */}
              <div
                className="relative h-60 w-full rounded-2xl overflow-hidden border-2 border-slate-200 shadow-inner bg-slate-100"
                onTouchStart={(e) => {
                  if (e.touches.length >= 2 || mapGestureMode === 'greedy') {
                    e.stopPropagation();
                  }
                }}
                onTouchMove={(e) => {
                  if (e.touches.length >= 2 || mapGestureMode === 'greedy') {
                    e.stopPropagation();
                  }
                }}
                style={{ touchAction: 'none' }}
              >
                <APIProvider apiKey={mapsApiKey}>
                  <Map
                    mapId="DEMO_MAP_ID"
                    defaultCenter={mapCenter}
                    center={mapCenter}
                    defaultZoom={11}
                    gestureHandling={mapGestureMode}
                    disableDefaultUI={false}
                    className="w-full h-full"
                    internalUsageAttributionIds={['gmp_mcp_codeassist_v1_aistudio']}
                  >
                    {waypoints
                      .filter((wp) => wp.isRedMarked && wp.lat && wp.lng)
                      .map((wp) => (
                        <AdvancedMarker
                          key={wp.id}
                          position={{ lat: wp.lat!, lng: wp.lng! }}
                          title={`${wp.name} (${wp.elevation})`}
                        >
                          <Pin
                            background="#e11d48"
                            glyphColor="#ffffff"
                            borderColor="#9f1239"
                            scale={1.1}
                          />
                        </AdvancedMarker>
                      ))}

                    {/* Immediate Marker for Searched Location */}
                    {searchedLocation && (
                      <AdvancedMarker
                        position={{ lat: searchedLocation.lat, lng: searchedLocation.lng }}
                        title={`${searchedLocation.name} (Found Location)`}
                      >
                        <Pin
                          background="#059669"
                          glyphColor="#ffffff"
                          borderColor="#064e3b"
                          scale={1.25}
                        />
                      </AdvancedMarker>
                    )}
                  </Map>
                </APIProvider>
              </div>

              {/* Waypoints List with Red Toggle and Minus Delete Sign */}
              <div className="space-y-1.5 max-h-36 overflow-y-auto no-scrollbar">
                <span className="text-[11px] font-bold text-slate-700 block">
                  Marked Red Pins ({waypoints.filter((w) => w.isRedMarked).length}) — Tap minus to remove:
                </span>
                {waypoints.map((wp) => (
                  <div
                    key={wp.id}
                    onClick={() => toggleWaypointMark(wp.id)}
                    className="flex items-center justify-between p-2 rounded-xl bg-white border border-slate-200 shadow-2xs cursor-pointer hover:border-rose-400 text-xs transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <span
                        className={`w-3 h-3 rounded-full ${
                          wp.isRedMarked ? 'bg-rose-600' : 'bg-slate-300'
                        }`}
                      />
                      <span className="font-bold text-slate-800">{wp.name}</span>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-mono text-slate-500">{wp.elevation}</span>
                      {/* Minus Sign Button to delete marked pin */}
                      <button
                        type="button"
                        onClick={(e) => handleDeleteWaypoint(wp.id, e)}
                        className="w-6 h-6 rounded-lg bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-600 flex items-center justify-center cursor-pointer active:scale-90 transition-all"
                        title="Remove this pin from route"
                      >
                        <Minus className="w-3.5 h-3.5 stroke-[2.5]" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Action Buttons: Skip Map Pointing OR Confirm & Create Group */}
              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setWizardStep(1)}
                  className="w-1/4 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-700 hover:bg-slate-100"
                >
                  Back
                </button>
                <button
                  type="button"
                  onClick={() => handleFinalSubmit(true)}
                  className="w-1/3 py-2.5 rounded-xl border border-amber-300 bg-amber-50 hover:bg-amber-100 text-amber-900 text-xs font-bold flex items-center justify-center gap-1 cursor-pointer"
                >
                  <SkipForward className="w-3.5 h-3.5" />
                  <span>Skip Maps</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleFinalSubmit(false)}
                  className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-emerald-700 to-teal-800 hover:brightness-105 text-white text-xs font-bold flex items-center justify-center gap-1.5 shadow-md active:scale-95 transition-all cursor-pointer"
                >
                  <Check className="w-4 h-4" />
                  <span>Create Group</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
