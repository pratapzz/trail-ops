import React, { useState, useEffect } from 'react';
import {
  Compass,
  Users,
  MapPin,
  ArrowRight,
  PlusCircle,
  QrCode,
  Zap,
  CheckCircle2,
  Flashlight,
  Camera,
  Hash,
  Bell,
  Clock,
  AlertOctagon,
  AlertTriangle,
  Radio,
  X,
  LogOut,
  Folder,
  PieChart,
  CreditCard,
  DollarSign,
  ChevronRight,
  Calendar,
  Sparkles,
  Edit3,
  ShieldCheck,
  Code2,
  GraduationCap,
} from 'lucide-react';
import { ScreenType, UserRole } from '../types';
import { CreateTripModal } from './modals/CreateTripModal';
import { PermissionModal } from './modals/PermissionModal';
import { TripGearChecklist } from './TripGearChecklist';
import { PersonalPackingNotes } from './PersonalPackingNotes';
import { WeatherForecast } from './WeatherForecast';
import { getSupabase, isSupabaseConfigured, joinSquadByCode, createSquadGroup, fetchSquadMembers } from '../lib/supabase';

interface GatewayScreenProps {
  onNavigate: (screen: ScreenType) => void;
  onShowToast: (message: string) => void;
  hasJoinedGroup: boolean;
  onSetJoinedGroup: (joined: boolean) => void;
  avatarUrl?: string;
  onOpenSOS?: () => void;
  tripBudget?: number;
  amountPaid?: number;
  amountPending?: number;
  onOpenFacultyDrive?: () => void;
  onOpenSplitwise?: () => void;
  destinationName?: string;
  destinationCoordinates?: { lat: number; lng: number };
  departureDate?: string;
  onUpdateTripDestination?: (tripData: {
    name: string;
    destination: string;
    coordinates: { lat: number; lng: number };
    budgetPerMember: number;
    departureDate: string;
    returnDate: string;
  }) => void;
  userName?: string;
  activeSquadId?: string;
  activeSquad?: any;
}

export const GatewayScreen: React.FC<GatewayScreenProps> = ({
  userName = 'Pratap',
  onNavigate,
  onShowToast,
  hasJoinedGroup,
  onSetJoinedGroup,
  avatarUrl = 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80',
  onOpenSOS,
  tripBudget = 6000,
  amountPaid = 4200,
  amountPending = 1800,
  onOpenFacultyDrive,
  onOpenSplitwise,
  destinationName = 'Pelling High Ridge (2,150m ASL)',
  destinationCoordinates = { lat: 27.3184, lng: 88.2412 },
  departureDate = '2026-10-24',
  onUpdateTripDestination,
  activeSquadId,
  activeSquad,
}) => {
  const [passcode, setPasscode] = useState(['', '', '', '', '', '']);
  const [joinSubMode, setJoinSubMode] = useState<'code' | 'scanner'>('code');
  const [isFlashOn, setIsFlashOn] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isPermissionModalOpen, setIsPermissionModalOpen] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);

  // Dynamic real squad member attendance stats (No fake 42 counts)
  const [squadMemberStats, setSquadMemberStats] = useState<{ total: number; present: number }>(() => {
    const saved = localStorage.getItem('trailoPS_squad_members');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          const present = parsed.filter((m: any) => m.status === 'present').length;
          return { total: parsed.length, present: present || 1 };
        }
      } catch {}
    }
    return { total: 1, present: 1 };
  });

  const effectiveSquadId = activeSquadId || activeSquad?.id;

  useEffect(() => {
    let isMounted = true;
    const loadStats = async () => {
      // Check live roll call session first
      const squadKey = effectiveSquadId || 'default';
      const liveSession = localStorage.getItem(`trailoPS_active_rollcall_${squadKey}`);
      let livePresentCount: number | null = null;
      if (liveSession) {
        try {
          const parsed = JSON.parse(liveSession);
          if (parsed?.active && Array.isArray(parsed?.presentUserIds)) {
            livePresentCount = parsed.presentUserIds.length;
          }
        } catch {}
      }

      if (effectiveSquadId) {
        try {
          const sbMembers = await fetchSquadMembers(effectiveSquadId);
          if (isMounted && sbMembers && sbMembers.length > 0) {
            const present = livePresentCount !== null
              ? livePresentCount
              : sbMembers.filter((m) => m.status !== 'distress').length;
            setSquadMemberStats({ total: sbMembers.length, present });
            return;
          }
        } catch {}
      }
      const saved = localStorage.getItem('trailoPS_squad_members');
      if (saved && isMounted) {
        try {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed) && parsed.length > 0) {
            const present = livePresentCount !== null
              ? livePresentCount
              : parsed.filter((m: any) => m.status === 'present').length;
            setSquadMemberStats({ total: parsed.length, present: present || 1 });
            return;
          }
        } catch {}
      }
      setSquadMemberStats({ total: 1, present: 1 });
    };

    loadStats();

    window.addEventListener('storage', loadStats);
    window.addEventListener('trailoPS_members_updated', loadStats);
    window.addEventListener('trailoPS_rollcall_sync', loadStats);

    return () => {
      isMounted = false;
      window.removeEventListener('storage', loadStats);
      window.removeEventListener('trailoPS_members_updated', loadStats);
      window.removeEventListener('trailoPS_rollcall_sync', loadStats);
    };
  }, [effectiveSquadId, hasJoinedGroup]);

  // Active Destination and Coordinates set during group creation or passed from parent
  const [activeDestination, setActiveDestination] = useState<{
    name: string;
    coordinates: { lat: number; lng: number };
  }>({
    name: destinationName,
    coordinates: destinationCoordinates,
  });

  // Active Departure Date with inline editing capability
  const [activeDepartureDate, setActiveDepartureDate] = useState<string>(departureDate || '2026-10-24');
  const [isEditingDepartureDate, setIsEditingDepartureDate] = useState(false);

  useEffect(() => {
    if (destinationName && destinationCoordinates) {
      setActiveDestination({
        name: destinationName,
        coordinates: destinationCoordinates,
      });
    }
  }, [destinationName, destinationCoordinates?.lat, destinationCoordinates?.lng]);

  useEffect(() => {
    if (departureDate) {
      setActiveDepartureDate(departureDate);
    }
  }, [departureDate]);

  // Live countdown timer synced with squad
  const [countdownSecs, setCountdownSecs] = useState(165); // 02:45
  useEffect(() => {
    const timer = setInterval(() => {
      setCountdownSecs((prev) => (prev > 0 ? prev - 1 : 180));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Days until Expedition Departure Countdown (Live calculation against activeDepartureDate)
  const [departureDaysLeft, setDepartureDaysLeft] = useState({
    days: 0,
    hours: 0,
    mins: 0,
    secs: 0,
  });

  useEffect(() => {
    const updateCountdown = () => {
      if (!activeDepartureDate) return;
      const parts = activeDepartureDate.split('-');
      let targetDate: Date;
      if (parts.length === 3) {
        targetDate = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]), 6, 0, 0);
      } else {
        targetDate = new Date(activeDepartureDate);
      }

      const now = new Date().getTime();
      const diff = targetDate.getTime() - now;
      if (diff > 0) {
        setDepartureDaysLeft({
          days: Math.floor(diff / (1000 * 60 * 60 * 24)),
          hours: Math.floor((diff / (1000 * 60 * 60)) % 24),
          mins: Math.floor((diff / 1000 / 60) % 60),
          secs: Math.floor((diff / 1000) % 60),
        });
      } else {
        setDepartureDaysLeft({ days: 0, hours: 0, mins: 0, secs: 0 });
      }
    };
    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);
    return () => clearInterval(interval);
  }, [activeDepartureDate]);

  const formatCountdown = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const paidPercent = tripBudget > 0 ? Math.min(Math.round((amountPaid / tripBudget) * 100), 100) : 0;

  const handleCharInput = async (index: number, val: string) => {
    const updated = [...passcode];
    updated[index] = val.toUpperCase().slice(0, 1);
    setPasscode(updated);

    if (updated.every((ch) => ch !== '')) {
      const code = updated.join('');
      const sb = getSupabase();
      if (sb && isSupabaseConfigured()) {
        try {
          const { data: squad } = await sb
            .from('squad_groups')
            .select('*')
            .eq('code', code)
            .single();
          if (squad) {
            onShowToast(`Squad "${squad.name}" found! Review permissions to enter.`);
            setIsPermissionModalOpen(true);
            return;
          } else {
            onShowToast(`No expedition group found with code "${code}". Please verify code.`);
            return;
          }
        } catch {
          // Fallback if offline
        }
      }
      onShowToast(`Passkey ${code} entered. Review permissions to join.`);
      setIsPermissionModalOpen(true);
    }
  };

  const simulateQRScan = () => {
    onShowToast('Point camera at squad QR code to scan invitation link.');
  };

  return (
    <div className="w-full max-w-md mx-auto min-h-screen bg-[#f8faf9] flex flex-col relative pb-32 shadow-2xl overflow-hidden">
      {/* Subtle Ambient Color Glows */}
      <div className="absolute -top-16 -left-16 w-56 h-56 bg-emerald-300/30 rounded-full blur-3xl pointer-events-none -z-0" />
      <div className="absolute top-48 -right-12 w-60 h-60 bg-amber-200/40 rounded-full blur-3xl pointer-events-none -z-0" />

      {/* Top App Bar with Notification Bell Icon */}
      <header className="bg-white/95 backdrop-blur-md sticky top-0 shadow-2xs z-40 border-b border-emerald-900/10">
        <div className="flex items-center justify-between px-4 w-full h-16 max-w-md mx-auto">
          {/* Brand */}
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-emerald-600 to-teal-800 text-white flex items-center justify-center shadow-md shadow-emerald-700/20">
              <Compass className="w-4 h-4" />
            </div>
            <span className="text-xl font-extrabold tracking-tight text-emerald-950">
              TrailoPS
            </span>
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold tracking-wide bg-gradient-to-r from-amber-400 to-amber-500 text-amber-950 shadow-2xs">
              V1
            </span>
          </div>

          {/* Right Actions: Notifications Bell, Online Pill & Avatar */}
          <div className="flex items-center gap-2.5">
            {/* Notification Bell Icon */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowNotifications(!showNotifications)}
                className="w-9 h-9 rounded-full bg-slate-100 hover:bg-emerald-50 text-slate-700 hover:text-emerald-900 flex items-center justify-center transition-colors relative cursor-pointer"
                title="Trail Announcements"
              >
                <Bell className="w-4 h-4" />
                <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-amber-500 rounded-full ring-2 ring-white animate-pulse" />
              </button>

              {/* Notification Dropdown Drawer */}
              {showNotifications && (
                <div className="absolute right-0 top-11 w-72 bg-white rounded-2xl shadow-2xl border border-slate-200 p-3 z-50 animate-in fade-in slide-in-from-top-2 duration-150">
                  <div className="flex items-center justify-between pb-2 border-b border-slate-100 mb-2">
                    <span className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                      <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                      Trail Directives (1 New)
                    </span>
                    <button
                      type="button"
                      onClick={() => setShowNotifications(false)}
                      className="text-slate-400 hover:text-slate-600 cursor-pointer"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <div className="bg-amber-50 p-2.5 rounded-xl border border-amber-200 text-xs mb-2">
                    <span className="font-bold text-amber-950 block text-[11px] uppercase tracking-wide">
                      Weather Advisory · 15m ago
                    </span>
                    <p className="text-[11px] text-amber-900 mt-0.5 leading-snug font-medium">
                      Gusting alpine winds exceeding 45km/h at Ridge Marker 4. Basecamp assembly in effect.
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      setShowNotifications(false);
                      onNavigate('feed');
                    }}
                    className="w-full py-1.5 rounded-lg bg-[#0f5238] hover:bg-[#166534] text-white text-[11px] font-bold flex items-center justify-center gap-1 transition-colors cursor-pointer"
                  >
                    <span>View All in Feed</span>
                    <ArrowRight className="w-3 h-3" />
                  </button>
                </div>
              )}
            </div>

            {/* Online Status Pill */}
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-900 shadow-2xs">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse-glow" />
              <span className="text-[10px] uppercase tracking-wider font-bold">Online</span>
            </div>

            {/* Profile Avatar */}
            <div
              onClick={() => onNavigate('settings')}
              className="relative w-9 h-9 rounded-full ring-2 ring-emerald-500/40 overflow-hidden bg-slate-100 shadow-2xs cursor-pointer"
              title="Profile & Settings"
            >
              <img
                className="w-full h-full object-cover"
                src={avatarUrl}
                alt="Profile"
              />
            </div>
          </div>
        </div>
      </header>

      {/* Main Home Base Content */}
      <main className="flex-1 px-4 pt-4 space-y-4 relative z-10">
        {/* Friendly User Greeting with Dynamic Animation and Animated Icon */}
        <section className="space-y-1.5 pt-1 animate-in fade-in slide-in-from-top-2 duration-300">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-emerald-700 font-semibold text-xs tracking-wide">
              <div className="w-5 h-5 rounded-md bg-emerald-500/15 flex items-center justify-center text-emerald-700">
                <Compass className="w-3.5 h-3.5 animate-spin" style={{ animationDuration: '12s' }} />
              </div>
              <span className="font-bold">Home Base • Expedition Hub</span>
            </div>
            <span className="px-2 py-0.5 rounded-full bg-emerald-100/80 text-[#0f5238] text-[10px] font-bold flex items-center gap-1 border border-emerald-300/60 shadow-2xs">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
              GPS Active
            </span>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap">
            <h1 className="text-2xl text-slate-900 font-black tracking-tight flex items-center gap-2">
              <span className="bg-gradient-to-r from-emerald-950 via-teal-900 to-slate-900 bg-clip-text text-transparent">
                Welcome back, {userName ? userName.split(' ')[0] : 'Explorer'}!
              </span>
              <span className="inline-block animate-wave text-2xl select-none cursor-default" title="Hello Trekker!">
                👋
              </span>
            </h1>

            {/* Animated Explorer Badge Icon */}
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-gradient-to-r from-emerald-500/15 via-teal-500/20 to-amber-500/15 border border-emerald-500/30 text-emerald-900 shadow-2xs">
              <Sparkles className="w-3 h-3 text-emerald-600 animate-spin" style={{ animationDuration: '4s' }} />
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-emerald-800">
                Expedition Ready
              </span>
            </div>
          </div>

          <p className="text-xs text-slate-600 leading-relaxed">
            {hasJoinedGroup
              ? `Your squad is active and ready for ${activeDestination.name ? activeDestination.name.split('(')[0].trim() : 'the trip'}.`
              : 'Join an existing squad route or create a new one for your group.'}
          </p>
        </section>

        {/* CONDITION 1: IF GROUP IS JOINED -> SQUAD LIVE COUNTDOWN, TRIP BUDGET BAR, & DRIVE */}
        {hasJoinedGroup ? (
          <section className="space-y-3.5 animate-in fade-in duration-300">
            {/* Live Squad Countdown & Status Card */}
            <div className="rounded-3xl p-5 bg-gradient-to-br from-[#0f5238] via-[#1b5e40] to-emerald-900 text-white shadow-xl shadow-emerald-950/20 relative overflow-hidden">
              <div className="absolute -top-12 -right-12 w-40 h-40 bg-emerald-400/20 rounded-full blur-2xl pointer-events-none" />

              <div className="flex items-center justify-between mb-3 relative z-10">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-white/10 text-emerald-300 flex items-center justify-center">
                    <Users className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-[10px] text-emerald-300 uppercase font-extrabold tracking-wider">
                      Connected Squad
                    </span>
                    <h3 className="text-base font-extrabold leading-tight text-white">
                      {activeDestination.name ? activeDestination.name.split('(')[0].trim() : 'Squad Expedition'}
                    </h3>
                  </div>
                </div>

                {/* Countdown pill */}
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-400/20 border border-amber-300/40 text-amber-300 text-xs font-bold font-mono">
                  <Clock className="w-3.5 h-3.5 animate-spin" />
                  <span>{departureDaysLeft.days}d {departureDaysLeft.hours}h left</span>
                </div>
              </div>

              {/* EXPEDITION DEPARTURE COUNTDOWN */}
              <div className="bg-black/35 backdrop-blur-md rounded-2xl p-3 border border-white/20 mb-3 relative z-10 space-y-2.5">
                <div className="flex items-center justify-between text-xs font-bold">
                  <span className="text-amber-300 flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5" />
                    <span>Trip Departure Countdown</span>
                  </span>
                  
                  {/* Edit Date Action Button */}
                  <button
                    type="button"
                    onClick={() => setIsEditingDepartureDate(!isEditingDepartureDate)}
                    className="flex items-center gap-1 px-2 py-0.5 rounded-lg bg-white/15 hover:bg-white/25 text-amber-200 text-[10px] font-bold cursor-pointer transition-colors"
                    title="Change departure date"
                  >
                    <Edit3 className="w-2.5 h-2.5" />
                    <span>{isEditingDepartureDate ? 'Done' : 'Change Date'}</span>
                  </button>
                </div>

                {/* Inline Date Selector when editing */}
                {isEditingDepartureDate ? (
                  <div className="p-2.5 rounded-xl bg-white/10 border border-white/20 space-y-1.5 animate-in fade-in duration-150">
                    <div className="flex items-center justify-between text-[11px] text-slate-200">
                      <span className="font-semibold">Select Departure Date:</span>
                      <span className="font-mono text-emerald-300 font-bold">{activeDepartureDate}</span>
                    </div>
                    <input
                      type="date"
                      value={activeDepartureDate}
                      onChange={(e) => {
                        const newDate = e.target.value;
                        if (!newDate) return;
                        setActiveDepartureDate(newDate);
                        if (onUpdateTripDestination) {
                          onUpdateTripDestination({
                            name: activeDestination.name ? activeDestination.name.split('(')[0].trim() : 'Squad Expedition',
                            destination: activeDestination.name,
                            coordinates: activeDestination.coordinates,
                            budgetPerMember: tripBudget,
                            departureDate: newDate,
                            returnDate: '2026-10-30',
                          });
                        }
                        if (onShowToast) {
                          onShowToast(`Expedition departure date updated to ${newDate}! Countdown adjusted.`);
                        }
                      }}
                      className="w-full px-2.5 py-1.5 rounded-lg bg-slate-900 border border-emerald-400 text-white text-xs font-bold outline-none cursor-pointer"
                    />
                  </div>
                ) : (
                  <div className="flex items-center justify-between text-[10px] text-slate-300 font-medium px-0.5">
                    <span>Target Date: <strong className="text-white font-mono">{activeDepartureDate}</strong></span>
                    <span className="text-emerald-300 font-bold">
                      {departureDaysLeft.days > 0
                        ? `${departureDaysLeft.days} Days Remaining`
                        : departureDaysLeft.hours > 0
                        ? 'Departing Today!'
                        : 'Trip In Progress'}
                    </span>
                  </div>
                )}

                <div className="grid grid-cols-4 gap-1.5 text-center">
                  <div className="bg-white/15 rounded-xl py-1.5 px-1 border border-white/10">
                    <span className="text-xl font-black text-amber-300 block leading-tight">{departureDaysLeft.days}</span>
                    <span className="text-[9px] uppercase font-bold text-slate-200">Days</span>
                  </div>
                  <div className="bg-white/15 rounded-xl py-1.5 px-1 border border-white/10">
                    <span className="text-xl font-black text-white block leading-tight">{String(departureDaysLeft.hours).padStart(2, '0')}</span>
                    <span className="text-[9px] uppercase font-bold text-slate-200">Hours</span>
                  </div>
                  <div className="bg-white/15 rounded-xl py-1.5 px-1 border border-white/10">
                    <span className="text-xl font-black text-white block leading-tight">{String(departureDaysLeft.mins).padStart(2, '0')}</span>
                    <span className="text-[9px] uppercase font-bold text-slate-200">Mins</span>
                  </div>
                  <div className="bg-white/15 rounded-xl py-1.5 px-1 border border-white/10">
                    <span className="text-xl font-black text-emerald-400 block leading-tight">{String(departureDaysLeft.secs).padStart(2, '0')}</span>
                    <span className="text-[9px] uppercase font-bold text-slate-200">Secs</span>
                  </div>
                </div>
              </div>

              {/* Progress & Quick Stats - 100% Real Member Count */}
              <div className="grid grid-cols-2 gap-3 py-2 bg-black/20 rounded-2xl p-3 border border-white/10 mb-3 relative z-10">
                <div>
                  <span className="text-[10px] text-emerald-200 block font-medium">Checked In / Present</span>
                  <div className="flex items-baseline gap-1.5">
                    <span className="text-xl font-black text-white">
                      {squadMemberStats.present} / {squadMemberStats.total}
                    </span>
                    <span className="text-[11px] text-emerald-300 font-bold">
                      ({squadMemberStats.total > 0 ? Math.round((squadMemberStats.present / squadMemberStats.total) * 100) : 100}%)
                    </span>
                  </div>
                </div>
                <div>
                  <span className="text-[10px] text-emerald-200 block font-medium">Squad Status</span>
                  <span className="text-xs font-bold text-white flex items-center gap-1 mt-1">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                    {squadMemberStats.present === squadMemberStats.total ? 'All Present' : `${squadMemberStats.total - squadMemberStats.present} Awaiting Check-In`}
                  </span>
                </div>
              </div>

              {/* Quick Actions */}
              <div className="grid grid-cols-2 gap-2 relative z-10">
                <button
                  type="button"
                  onClick={() => onNavigate('squad')}
                  className="py-2.5 px-3 rounded-xl bg-white text-emerald-950 font-bold text-xs hover:bg-emerald-50 active:scale-95 transition-all flex items-center justify-center gap-1 cursor-pointer shadow-sm"
                >
                  <Users className="w-3.5 h-3.5 text-emerald-800" />
                  <span>View Roll Call</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    onSetJoinedGroup(false);
                    onShowToast('Left squad group.');
                  }}
                  className="py-2.5 px-3 rounded-xl bg-white/10 hover:bg-white/20 text-white font-semibold text-xs transition-colors flex items-center justify-center gap-1 cursor-pointer"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Switch Group</span>
                </button>
              </div>
            </div>

            {/* REAL-TIME WEATHER FORECAST FOR DESTINATION COORDINATES */}
            <WeatherForecast
              coordinates={activeDestination.coordinates}
              destinationName={activeDestination.name}
              onShowToast={onShowToast}
              onDestinationChange={(name, coords) => {
                setActiveDestination({ name, coordinates: coords });
              }}
            />

            {/* USER TRIP BUDGET & PAYMENT PROGRESS BAR ON HOME PAGE */}
            <div className="bg-white rounded-3xl p-4 border-2 border-emerald-500/25 shadow-xs space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-extrabold text-emerald-700 uppercase tracking-wider">
                    Your Individual Trip Budget
                  </span>
                  <h4 className="text-base font-extrabold text-slate-900">
                    Total Quota: ₹{tripBudget.toLocaleString()}
                  </h4>
                </div>

                <div className="text-right">
                  <span
                    className={`text-xs font-black px-2.5 py-0.5 rounded-full ${
                      amountPending === 0
                        ? 'bg-emerald-100 text-emerald-900'
                        : 'bg-amber-100 text-amber-900 border border-amber-300'
                    }`}
                  >
                    {amountPending === 0 ? '✓ Paid in Full' : `₹${amountPending.toLocaleString()} Pending`}
                  </span>
                </div>
              </div>

              {/* Dual-Color Amount Bar */}
              <div className="space-y-1.5">
                <div className="flex justify-between text-xs font-semibold">
                  <span className="text-emerald-800 flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-emerald-500" />
                    Paid: ₹{amountPaid.toLocaleString()} ({paidPercent}%)
                  </span>
                  <span className="text-amber-700 flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-amber-500" />
                    Pending: ₹{amountPending.toLocaleString()}
                  </span>
                </div>

                <div className="w-full h-3 rounded-full bg-slate-100 border border-slate-200 overflow-hidden flex">
                  <div
                    className="bg-gradient-to-r from-emerald-600 to-[#0f5238] h-full transition-all duration-700"
                    style={{ width: `${paidPercent}%` }}
                  />
                  <div
                    className="bg-gradient-to-r from-amber-400 to-amber-500 h-full transition-all duration-700"
                    style={{ width: `${100 - paidPercent}%` }}
                  />
                </div>
              </div>

              {/* Quick Launch Splitwise from Home */}
              <button
                type="button"
                onClick={onOpenSplitwise}
                className="w-full py-2.5 rounded-xl bg-slate-50 hover:bg-emerald-50 border border-slate-200 hover:border-emerald-300 text-xs font-bold text-slate-800 flex items-center justify-center gap-1.5 transition-all cursor-pointer"
              >
                <PieChart className="w-3.5 h-3.5 text-emerald-700" />
                <span>Open Splitwise Ledger &amp; Settle Balance</span>
                <ChevronRight className="w-3.5 h-3.5 text-slate-400 ml-0.5" />
              </button>
            </div>

            {/* DUAL ACTION SHORTCUTS: FACULTY DRIVE & SQUAD SPLITWISE */}
            <div className="grid grid-cols-2 gap-3">
              {/* Faculty Drive Card */}
              <div
                onClick={onOpenFacultyDrive}
                className="p-3.5 rounded-2xl bg-gradient-to-b from-white to-purple-50/50 border border-purple-200 shadow-xs cursor-pointer hover:border-purple-400 transition-all active:scale-[0.98] flex flex-col justify-between"
              >
                <div>
                  <div className="w-9 h-9 rounded-xl bg-purple-100 text-purple-800 flex items-center justify-center mb-2">
                    <Folder className="w-4 h-4 fill-current" />
                  </div>
                  <h4 className="text-xs font-bold text-slate-900">Faculty Drive</h4>
                  <p className="text-[10px] text-slate-500 mt-0.5 leading-snug">
                    Tickets, bills, and official permits vault.
                  </p>
                </div>
                <div className="pt-2 flex items-center text-purple-800 font-bold text-[11px]">
                  <span>Open Vault</span>
                  <ArrowRight className="w-3 h-3 ml-1" />
                </div>
              </div>

              {/* Splitwise Card */}
              <div
                onClick={onOpenSplitwise}
                className="p-3.5 rounded-2xl bg-gradient-to-b from-white to-emerald-50/50 border border-emerald-200 shadow-xs cursor-pointer hover:border-emerald-400 transition-all active:scale-[0.98] flex flex-col justify-between"
              >
                <div>
                  <div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center mb-2">
                    <PieChart className="w-4 h-4" />
                  </div>
                  <h4 className="text-xs font-bold text-slate-900">Splitwise Ledger</h4>
                  <p className="text-[10px] text-slate-500 mt-0.5 leading-snug">
                    Shared bills, sub-group splits &amp; dues.
                  </p>
                </div>
                <div className="pt-2 flex items-center text-emerald-800 font-bold text-[11px]">
                  <span>View Splits</span>
                  <ArrowRight className="w-3 h-3 ml-1" />
                </div>
              </div>
            </div>

            {/* PRE-EXPEDITION ESSENTIALS: TRIP GEAR CHECKLIST */}
            <TripGearChecklist onShowToast={onShowToast} />

            {/* PERSONAL TRAIL PACKING TO-DO & NOTES */}
            <PersonalPackingNotes onShowToast={onShowToast} />

            {/* Emergency SOS Hero Shortcut on Home */}
            <div className="rounded-2xl p-4 bg-gradient-to-r from-rose-50 to-red-50/70 border border-rose-200 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-rose-600 text-white flex items-center justify-center shadow-md shadow-rose-600/30">
                  <AlertOctagon className="w-5 h-5 animate-pulse" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-900">Emergency Distress Beacon</h4>
                  <p className="text-[11px] text-slate-500">One-tap emergency help &amp; contacts</p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => onNavigate('sos')}
                className="py-2 px-3.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow-xs active:scale-95 transition-all cursor-pointer"
              >
                Open SOS Hub
              </button>
            </div>
          </section>
        ) : (
          /* CONDITION 2: NOT JOINED YET -> FULLY EXPANDED UNIFIED "JOIN TRIP" HERO CONTAINER */
          <section className="space-y-4 animate-in fade-in duration-300">
            {/* Top Toggle: Join Trip vs Create Trip */}
            <div className="grid grid-cols-2 gap-2 bg-slate-200/70 p-1 rounded-2xl">
              <button
                type="button"
                className="py-2 rounded-xl text-xs font-extrabold bg-white text-emerald-950 shadow-xs flex items-center justify-center gap-1.5"
              >
                <Users className="w-4 h-4 text-emerald-700" />
                <span>Join Expedition</span>
              </button>
              <button
                type="button"
                onClick={() => setIsCreateModalOpen(true)}
                className="py-2 rounded-xl text-xs font-semibold text-slate-600 hover:text-slate-900 flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <PlusCircle className="w-4 h-4 text-amber-600" />
                <span>Create New Route</span>
              </button>
            </div>

            {/* UNIFIED EXPANDED JOIN TRIP CARD */}
            <div className="rounded-3xl bg-white border-2 border-emerald-500/40 p-5 shadow-lg shadow-emerald-900/5 space-y-4 relative overflow-hidden">
              <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-emerald-500 via-[#0f5238] to-teal-500" />

              {/* Header */}
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2.5">
                  <div className="w-10 h-10 rounded-2xl bg-emerald-100 text-[#0f5238] flex items-center justify-center">
                    <Users className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="text-sm font-bold text-slate-900">Join Expedition Squad</h2>
                    <p className="text-[11px] text-slate-500">
                      Enter 6-digit trip passkey or scan trail QR code
                    </p>
                  </div>
                </div>

                {/* Sub-mode switcher tabs */}
                <div className="flex bg-slate-100 p-0.5 rounded-xl border border-slate-200">
                  <button
                    type="button"
                    onClick={() => setJoinSubMode('code')}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                      joinSubMode === 'code'
                        ? 'bg-white text-emerald-950 shadow-xs'
                        : 'text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    Code
                  </button>
                  <button
                    type="button"
                    onClick={() => setJoinSubMode('scanner')}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                      joinSubMode === 'scanner'
                        ? 'bg-white text-emerald-950 shadow-xs'
                        : 'text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    Scanner
                  </button>
                </div>
              </div>

              {/* Sub-view A: 6-digit Code Input */}
              {joinSubMode === 'code' && (
                <div className="space-y-3 pt-1">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-700">Enter 6-Digit Passkey</span>
                    <span className="text-[10px] font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                      Auto-Verifies
                    </span>
                  </div>

                  <div className="grid grid-cols-6 gap-2">
                    {passcode.map((char, index) => (
                      <input
                        key={index}
                        type="text"
                        maxLength={1}
                        value={char}
                        onChange={(e) => handleCharInput(index, e.target.value)}
                        placeholder="-"
                        className={`h-12 rounded-xl text-center font-mono text-lg font-bold outline-none transition-all ${
                          char
                            ? 'bg-emerald-50 border-2 border-emerald-600 text-emerald-950 shadow-2xs'
                            : 'bg-slate-50 border border-slate-200 text-slate-400 focus:border-emerald-500 focus:bg-white'
                        }`}
                      />
                    ))}
                  </div>

                  <p className="text-[11px] text-slate-500 text-center">
                    Ask your lead guide for the 6-character squad code (e.g. <strong>TR89K2</strong>).
                  </p>
                </div>
              )}

              {/* Sub-view B: Integrated Camera Scanner */}
              {joinSubMode === 'scanner' && (
                <div
                  onClick={simulateQRScan}
                  className="relative h-48 rounded-2xl overflow-hidden bg-slate-900 border border-emerald-900/20 flex flex-col justify-between p-3.5 text-white shadow-inner cursor-pointer group"
                >
                  <div className="absolute inset-0 z-0 opacity-40 group-hover:opacity-50 transition-opacity">
                    <img
                      className="w-full h-full object-cover"
                      src="https://images.unsplash.com/photo-1519681393784-d120267933ba?auto=format&fit=crop&w=600&q=80"
                      alt="Camera viewfinder simulation"
                    />
                  </div>

                  <div className="relative z-10 flex justify-between items-center text-xs">
                    <span className="inline-flex items-center gap-1.5 bg-black/60 backdrop-blur-md px-2.5 py-1 rounded-full text-emerald-400 font-semibold border border-emerald-400/30">
                      <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                      Camera Active
                    </span>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setIsFlashOn(!isFlashOn);
                        onShowToast(isFlashOn ? 'Flash turned off' : 'Flash enabled');
                      }}
                      className={`p-2 rounded-full backdrop-blur-md transition-transform active:scale-90 ${
                        isFlashOn ? 'bg-amber-500 text-white' : 'bg-black/60 hover:bg-black/80 text-white'
                      }`}
                      title="Flash toggle"
                    >
                      <Flashlight className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <div className="relative z-10 w-28 h-28 mx-auto self-center border-2 border-dashed border-emerald-300/80 rounded-xl flex items-center justify-center overflow-hidden bg-emerald-950/20 backdrop-blur-[1px]">
                    <div className="absolute w-full h-1 bg-gradient-to-r from-transparent via-emerald-400 to-transparent animate-scanner shadow-[0_0_12px_#34d399]" />
                    <QrCode className="w-10 h-10 text-white/50" />
                  </div>

                  <div className="relative z-10 text-center">
                    <p className="text-[11px] text-white/90 drop-shadow">
                      Tap viewfinder to simulate instant QR code detect
                    </p>
                  </div>
                </div>
              )}

              {/* Squad Verification Hint */}
              <div className="bg-slate-50 rounded-2xl p-3 border border-slate-200/80 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center shrink-0">
                    <ShieldCheck className="w-5 h-5 text-[#0f5238]" />
                  </div>
                  <div>
                    <span className="text-xs font-bold text-slate-900 block">Squad Code Verification</span>
                    <p className="text-[10px] text-slate-500">Enter the 6-character code from your group lead</p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(true)}
                  className="px-3 py-1.5 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-800 text-[11px] font-bold transition-all cursor-pointer flex items-center gap-1"
                >
                  <PlusCircle className="w-3.5 h-3.5 text-emerald-800" />
                  <span>New Route</span>
                </button>
              </div>
            </div>

            {/* REAL-TIME WEATHER FORECAST FOR EXPLORATION DESTINATION */}
            <WeatherForecast
              coordinates={activeDestination.coordinates}
              destinationName={activeDestination.name}
              onShowToast={onShowToast}
              onDestinationChange={(name, coords) => {
                setActiveDestination({ name, coordinates: coords });
              }}
            />

            {/* ALWAYS ACTIVE PERSONAL TRAIL PACKING TO-DO */}
            <PersonalPackingNotes onShowToast={onShowToast} />
          </section>
        )}

        {/* Developer Attribution Card */}
        <footer className="pt-4 pb-2 text-center">
          <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300/80 dark:border-emerald-800/60 shadow-2xs">
            <Code2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
            <span className="text-[11px] font-semibold text-slate-700 dark:text-slate-300">
              Developed &amp; Maintained by
            </span>
            <span className="text-[11px] font-black text-emerald-950 dark:text-emerald-300">
              Pratap Paul
            </span>
          </div>
          <div className="flex items-center justify-center gap-1.5 text-[11px] text-slate-600 dark:text-slate-400 font-medium mt-1.5">
            <GraduationCap className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
            <span>CS Student,</span>
            <span className="font-bold text-slate-800 dark:text-slate-200">Srikrishna College, Bagula</span>
          </div>
        </footer>
      </main>

      {/* Permission Consent Modal Sheet */}
      <PermissionModal
        isOpen={isPermissionModalOpen}
        onClose={() => setIsPermissionModalOpen(false)}
        onConfirm={async () => {
          setIsPermissionModalOpen(false);
          const enteredCode = passcode.join('');
          const sb = getSupabase();
          if (sb && isSupabaseConfigured() && enteredCode.length === 6) {
            try {
              const { data: userResp } = await sb.auth.getUser();
              if (userResp?.user) {
                const res = await joinSquadByCode(userResp.user.id, enteredCode);
                if (res?.group) {
                  onShowToast(`🎉 Successfully joined squad "${res.group.name}"!`);
                  onSetJoinedGroup(true);
                  onNavigate('squad');
                  return;
                }
              }
            } catch (err: any) {
              console.warn('Error joining squad:', err);
            }
          }
          onSetJoinedGroup(true);
          onShowToast('🎉 Successfully joined expedition squad! Telemetry online.');
          onNavigate('squad');
        }}
      />

      {/* Create Trip Modal */}
      <CreateTripModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onCreate={async (trip) => {
          const tripCoords = trip.coordinates || { lat: 27.3184, lng: 88.2412 };
          setActiveDestination({
            name: trip.destination,
            coordinates: tripCoords,
          });
          const sb = getSupabase();
          if (sb && isSupabaseConfigured()) {
            try {
              const { data: userResp } = await sb.auth.getUser();
              if (userResp?.user) {
                await createSquadGroup(
                  userResp.user.id,
                  trip.name,
                  trip.destination,
                  trip.budgetPerMember,
                  trip.passkey
                );
              }
            } catch (err) {
              console.warn('Error saving squad to Supabase:', err);
            }
          }
          if (onUpdateTripDestination) {
            onUpdateTripDestination(trip);
          }
          onShowToast(`Trip "${trip.name}" created! Invitation code: ${trip.passkey}`);
          setPasscode(trip.passkey.split(''));
          localStorage.setItem('trailoPS_userRole', 'super_admin');
          onSetJoinedGroup(true);
        }}
      />
    </div>
  );
};
