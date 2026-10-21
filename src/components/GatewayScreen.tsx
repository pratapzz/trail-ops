import React, { useState, useEffect, useRef } from 'react';
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
  Copy,
  Send,
  Loader2,
  UserCheck,
  XCircle,
} from 'lucide-react';
import { ScreenType, UserRole } from '../types';
import { CreateTripModal } from './modals/CreateTripModal';
import { PermissionModal } from './modals/PermissionModal';
import { TripGearChecklist } from './TripGearChecklist';
import { PersonalPackingNotes } from './PersonalPackingNotes';
import { WeatherForecast } from './WeatherForecast';
import { BriefingCountdownBanner } from './BriefingCountdownBanner';
import { BriefingTimerModal } from './modals/BriefingTimerModal';
import {
  getSupabase,
  isSupabaseConfigured,
  createSquadGroup,
  fetchSquadMembers,
  lookupSquadByCode,
  normalizeSquadCode,
  submitSquadJoinRequest,
  fetchUserJoinRequestsAndNotifications,
  markNotificationRead,
  subscribeToGroupBriefing,
  cancelGroupBriefing,
  SquadGroupRecord,
  SquadJoinRequestRecord,
  UserNotificationRecord,
  SquadBriefingRecord,
} from '../lib/supabase';

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
  currentUserId?: string;
  currentUserEmail?: string;
  activeSquadId?: string;
  activeSquad?: any;
  userRole?: UserRole;
  onSquadJoined?: (group: SquadGroupRecord, role?: UserRole) => void;
}

export const GatewayScreen: React.FC<GatewayScreenProps> = ({
  userName = 'Explorer',
  currentUserId,
  currentUserEmail,
  userRole = 'member',
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
  onSquadJoined,
}) => {
  const [passcode, setPasscode] = useState(['', '', '', '', '', '']);
  const inputRefs = useRef<Array<HTMLInputElement | null>>([]);
  const [joinSubMode, setJoinSubMode] = useState<'code' | 'scanner'>('code');
  const [isFlashOn, setIsFlashOn] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isPermissionModalOpen, setIsPermissionModalOpen] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);

  // Code lookup & Join Request state
  const [isVerifyingCode, setIsVerifyingCode] = useState(false);
  const [isSubmittingRequest, setIsSubmittingRequest] = useState(false);
  const [verifiedSquad, setVerifiedSquad] = useState<SquadGroupRecord | null>(null);
  const [codeLookupError, setCodeLookupError] = useState<string | null>(null);
  const [myJoinRequests, setMyJoinRequests] = useState<SquadJoinRequestRecord[]>([]);
  const [userNotifications, setUserNotifications] = useState<UserNotificationRecord[]>([]);
  const notifiedIdsRef = useRef<Set<string>>(new Set());

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
    name: activeSquad?.destination || destinationName,
    coordinates: destinationCoordinates,
  });

  // Active Departure Date with inline editing capability
  const [activeDepartureDate, setActiveDepartureDate] = useState<string>(departureDate || '2026-10-24');
  const [isEditingDepartureDate, setIsEditingDepartureDate] = useState(false);

  useEffect(() => {
    if (activeSquad?.destination) {
      setActiveDestination((prev) => ({
        ...prev,
        name: activeSquad.destination,
      }));
    } else if (destinationName && destinationCoordinates) {
      setActiveDestination({
        name: destinationName,
        coordinates: destinationCoordinates,
      });
    }
  }, [activeSquad?.destination, destinationName, destinationCoordinates?.lat, destinationCoordinates?.lng]);

  useEffect(() => {
    if (departureDate) {
      setActiveDepartureDate(departureDate);
    }
  }, [departureDate]);

  const isSuperAdminOrAdmin =
    userRole === 'super_admin' ||
    userRole === 'admin' ||
    userRole === 'subgroup_admin' ||
    activeSquad?.created_by === currentUserId;

  // Synchronized Group Briefing Timer across all member devices
  const [activeBriefing, setActiveBriefing] = useState<SquadBriefingRecord | null>(null);
  const [isBriefingModalOpen, setIsBriefingModalOpen] = useState(false);

  useEffect(() => {
    const targetGroupId = activeSquad?.id || activeSquadId;
    if (!targetGroupId) {
      setActiveBriefing(null);
      return;
    }
    const unsubscribe = subscribeToGroupBriefing(targetGroupId, (b) => {
      setActiveBriefing(b);
    });
    return () => unsubscribe();
  }, [activeSquad?.id, activeSquadId]);

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

  // Poll / Sync user's join requests and notifications across devices
  useEffect(() => {
    if (!currentUserId) return;
    let isMounted = true;

    const syncRequestsAndNotifications = async () => {
      try {
        const { requests, notifications, joinedGroups } =
          await fetchUserJoinRequestsAndNotifications(currentUserId);
        if (!isMounted) return;

        setMyJoinRequests(requests);
        setUserNotifications(notifications);

        // Keep verifiedSquad request status in sync if open
        setVerifiedSquad((prev) => {
          if (!prev) return null;
          const matchingReq = requests.find((r) => r.group_id === prev.id);
          const isJoined = joinedGroups.some((g) => g.id === prev.id);
          if (isJoined) {
            return { ...prev, userRequestStatus: 'member' };
          }
          if (matchingReq) {
            return { ...prev, userRequestStatus: matchingReq.status };
          }
          return prev;
        });

        // Surface unread join request notifications via toast & auto-unlock accepted groups
        for (const notif of notifications) {
          if (!notif.read && !notifiedIdsRef.current.has(notif.id)) {
            notifiedIdsRef.current.add(notif.id);
            onShowToast(`${notif.title}: ${notif.message}`);
            markNotificationRead(notif.id);

            if (notif.type === 'join_request_accepted' && notif.group_id) {
              const acceptedGroup = joinedGroups.find((g) => g.id === notif.group_id);
              if (acceptedGroup) {
                onSquadJoined?.(acceptedGroup, 'member');
                onSetJoinedGroup(true);
              }
            } else if (notif.type === 'notice_broadcast') {
              window.dispatchEvent(
                new CustomEvent('trailoPS_new_announcement', {
                  detail: {
                    id: notif.notice_id || notif.id,
                    title: (notif.title || 'Squad Broadcast').replace(/^📢\s*\[[^\]]+\]\s*/, ''),
                    text: notif.message,
                    priority: notif.priority || 'critical',
                    author: notif.author_name || 'Squad Member',
                    timestamp: 'Just now',
                  },
                })
              );
            }
          }
        }
      } catch {
        // ignore transient network errors
      }
    };

    syncRequestsAndNotifications();
    const interval = setInterval(syncRequestsAndNotifications, 3500);
    window.addEventListener('trailoPS_join_requests_updated', syncRequestsAndNotifications);

    return () => {
      isMounted = false;
      clearInterval(interval);
      window.removeEventListener('trailoPS_join_requests_updated', syncRequestsAndNotifications);
    };
  }, [currentUserId, hasJoinedGroup]);

  const verifyCodeLookup = async (rawCode: string) => {
    const clean = normalizeSquadCode(rawCode);
    setCodeLookupError(null);
    if (clean.length < 4) {
      setVerifiedSquad(null);
      setCodeLookupError('Please enter a valid 6-character group invitation code.');
      onShowToast('Please enter a valid 6-character group invitation code.');
      return;
    }

    setIsVerifyingCode(true);
    try {
      const foundSquad = await lookupSquadByCode(clean, currentUserId || 'user_self');
      if (foundSquad) {
        setVerifiedSquad(foundSquad);
        setCodeLookupError(null);
        const resolvedRole = ((foundSquad as any).myRole as UserRole) || 'super_admin';
        if (
          (foundSquad as any).autoJoined ||
          foundSquad.userRequestStatus === 'member' ||
          foundSquad.userRequestStatus === 'accepted'
        ) {
          onSquadJoined?.(foundSquad, resolvedRole);
          onSetJoinedGroup(true);
          onShowToast(
            (foundSquad as any).autoJoined
              ? `Joined empty group "${foundSquad.name}" (${foundSquad.code}) automatically as Super Admin!`
              : `Entered group "${foundSquad.name}" (${foundSquad.code})!`
          );
          return;
        } else if (foundSquad.userRequestStatus === 'pending') {
          onShowToast(`Group "${foundSquad.name}" verified — Your join request is awaiting Super Admin approval.`);
        } else {
          onShowToast(`Group "${foundSquad.name}" verified! Review details below to send a join request.`);
        }
      } else {
        setVerifiedSquad(null);
        const errMsg = `No group available with code "${clean}". Please verify the invitation code with your group creator.`;
        setCodeLookupError(errMsg);
        onShowToast(errMsg);
      }
    } catch (err: any) {
      setVerifiedSquad(null);
      const errMsg = err?.message || `Unable to verify code "${clean}".`;
      setCodeLookupError(errMsg);
      onShowToast(errMsg);
    } finally {
      setIsVerifyingCode(false);
    }
  };

  const handleSubmitJoinRequest = async (targetGroup?: SquadGroupRecord) => {
    const group = targetGroup || verifiedSquad;
    if (!group) {
      await verifyCodeLookup(passcode.join(''));
      return;
    }
    const effectiveUserId = currentUserId || 'user_self';

    // If already an approved member or auto-joined empty group, enter the group directly
    if (group.userRequestStatus === 'member' || group.userRequestStatus === 'accepted') {
      const resolvedRole = ((group as any).myRole as UserRole) || 'super_admin';
      onSquadJoined?.(group, resolvedRole);
      onSetJoinedGroup(true);
      onShowToast(`Entered expedition group "${group.name}" (${group.code})!`);
      onNavigate('squad');
      return;
    }

    // Prevent duplicate pending requests
    const existingPending = myJoinRequests.find(
      (r) => r.group_id === group.id && r.status === 'pending'
    );
    if (group.userRequestStatus === 'pending' || existingPending) {
      onShowToast(`Request Sent — Awaiting Approval from "${group.name}" Super Admin.`);
      return;
    }

    setIsSubmittingRequest(true);
    try {
      const res = await submitSquadJoinRequest(
        group.id,
        effectiveUserId,
        userName,
        currentUserEmail,
        avatarUrl
      );

      if (res.alreadyMember) {
        const updated = { ...group, userRequestStatus: 'member' as const };
        const resolvedRole = ((res as any).role as UserRole) || 'super_admin';
        setVerifiedSquad(updated);
        onSquadJoined?.(updated, resolvedRole);
        onSetJoinedGroup(true);
        onShowToast(
          (res as any).autoJoined
            ? `Joined empty group "${group.name}" automatically as Super Admin!`
            : `Entered group "${group.name}"!`
        );
        onNavigate('squad');
        return;
      }

      if (res.success || res.alreadyPending) {
        setVerifiedSquad({ ...group, userRequestStatus: 'pending' });
        if (res.request) {
          setMyJoinRequests((prev) => [
            res.request!,
            ...prev.filter((r) => r.group_id !== group.id),
          ]);
        }
        onShowToast(
          res.alreadyPending
            ? `Request Sent — Awaiting Approval for "${group.name}".`
            : `Join request sent to "${group.name}" Super Admin! Awaiting approval.`
        );
      } else {
        onShowToast(res.error || 'Failed to submit join request.');
      }
    } finally {
      setIsSubmittingRequest(false);
    }
  };

  const handleCharInput = async (index: number, val: string) => {
    setCodeLookupError(null);
    const cleaned = val.toUpperCase().replace(/[^A-Z0-9]/g, '');
    if (cleaned.length > 1) {
      // Handle multi-character input or autofill
      const chars = cleaned.slice(0, 6).split('');
      const next = ['', '', '', '', '', ''];
      for (let i = 0; i < 6; i++) {
        next[i] = chars[i] || '';
      }
      setPasscode(next);
      const nextFocusIdx = Math.min(chars.length, 5);
      inputRefs.current[nextFocusIdx]?.focus();
      if (chars.length === 6) {
        await verifyCodeLookup(chars.join(''));
      }
      return;
    }

    const updated = [...passcode];
    updated[index] = cleaned.slice(0, 1);
    setPasscode(updated);

    if (cleaned && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }

    if (updated.every((ch) => ch !== '')) {
      await verifyCodeLookup(updated.join(''));
    } else {
      setVerifiedSquad(null);
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !passcode[index] && index > 0) {
      const updated = [...passcode];
      updated[index - 1] = '';
      setPasscode(updated);
      inputRefs.current[index - 1]?.focus();
    } else if (e.key === 'Enter') {
      const code = passcode.join('');
      if (code.length >= 4) {
        verifyCodeLookup(code);
      }
    }
  };

  const handlePasteCode = async (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pastedText = e.clipboardData.getData('text') || '';
    // Extract either a 6-char code after ?join= or Invitation Code: or raw alphanumeric
    const joinMatch = pastedText.match(/(?:join=|Code:\s*)([A-Za-z0-9-]{4,8})/i);
    const targetRaw = joinMatch ? joinMatch[1] : pastedText;
    const clean = normalizeSquadCode(targetRaw);
    if (!clean) return;

    const next = ['', '', '', '', '', ''];
    for (let i = 0; i < 6; i++) {
      next[i] = clean[i] || '';
    }
    setPasscode(next);
    const focusIdx = Math.min(clean.length, 5);
    inputRefs.current[focusIdx]?.focus();

    if (clean.length === 6) {
      await verifyCodeLookup(clean);
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
                <div className="absolute right-0 top-11 w-80 bg-white rounded-2xl shadow-2xl border border-slate-200 p-3 z-50 animate-in fade-in slide-in-from-top-2 duration-150">
                  <div className="flex items-center justify-between pb-2 border-b border-slate-100 mb-2">
                    <span className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                      <Bell className="w-3.5 h-3.5 text-emerald-700" />
                      Squad Notifications ({userNotifications.length + 1})
                    </span>
                    <button
                      type="button"
                      onClick={() => setShowNotifications(false)}
                      className="text-slate-400 hover:text-slate-600 cursor-pointer"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <div className="max-h-60 overflow-y-auto space-y-2 mb-2 pr-0.5">
                    {userNotifications.map((notif) => (
                      <div
                        key={notif.id}
                        className={`p-2.5 rounded-xl border text-xs ${
                          notif.type === 'join_request_accepted'
                            ? 'bg-emerald-50 border-emerald-200 text-emerald-950'
                            : notif.type === 'join_request_rejected'
                            ? 'bg-rose-50 border-rose-200 text-rose-950'
                            : 'bg-slate-50 border-slate-200 text-slate-800'
                        }`}
                      >
                        <span className="font-bold block text-[11px] uppercase tracking-wide">
                          {notif.title}
                        </span>
                        <p className="text-[11px] mt-0.5 leading-snug font-medium">
                          {notif.message}
                        </p>
                      </div>
                    ))}

                    <div className="bg-amber-50 p-2.5 rounded-xl border border-amber-200 text-xs">
                      <span className="font-bold text-amber-950 block text-[11px] uppercase tracking-wide">
                        Weather Advisory · 15m ago
                      </span>
                      <p className="text-[11px] text-amber-900 mt-0.5 leading-snug font-medium">
                        Gusting alpine winds exceeding 45km/h at Ridge Marker 4. Basecamp assembly in effect.
                      </p>
                    </div>
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
              <span className="font-bold">Home</span>
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
                TRIP READY
              </span>
            </div>
          </div>

          <p className="text-xs text-slate-600 leading-relaxed">
            {hasJoinedGroup
              ? `Your group '${activeSquad?.name || 'group'}' is ready for the trip.`
              : 'Join an existing squad route or create a new one for your group.'}
          </p>
        </section>

        {/* CONDITION 1: IF GROUP IS JOINED -> SQUAD LIVE COUNTDOWN, TRIP BUDGET BAR, & DRIVE */}
        {hasJoinedGroup ? (
          <section className="space-y-3.5 animate-in fade-in duration-300">
            {/* SYNCHRONIZED GROUP BRIEFING TIMER (Auto-removes immediately when countdown reaches zero) */}
            <BriefingCountdownBanner
              briefing={activeBriefing}
              isSuperAdminOrAdmin={isSuperAdminOrAdmin}
              onOpenManageModal={() => setIsBriefingModalOpen(true)}
              onCancelBriefing={async () => {
                const targetGroupId = activeSquad?.id || activeSquadId;
                if (targetGroupId) {
                  await cancelGroupBriefing(targetGroupId);
                  setActiveBriefing(null);
                  onShowToast('Group briefing timer ended.');
                }
              }}
              variant="card"
            />

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
                      YOUR GROUP
                    </span>
                    <h3 className="text-base font-extrabold leading-tight text-white">
                      {activeSquad?.name || 'Squad Expedition'}
                    </h3>
                    <p className="text-[11px] text-emerald-200 font-medium">
                      Destination: {activeSquad?.destination || activeDestination.name}
                    </p>
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
                    <span>Trip Countdown</span>
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
                    <span>Departure Date: <strong className="text-white font-mono">{activeDepartureDate}</strong></span>
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
                  <span className="text-[10px] text-emerald-200 block font-medium">Present Members</span>
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
                  <span className="text-[10px] text-emerald-200 block font-medium">Group Status</span>
                  <span className="text-xs font-bold text-white flex items-center gap-1 mt-1">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                    {squadMemberStats.present === squadMemberStats.total ? 'Everyone Is Present' : `${squadMemberStats.total - squadMemberStats.present} Awaiting Check-In`}
                  </span>
                </div>
              </div>

              {/* Active Squad Invitation Code & Join by Code Bar */}
              <div className="bg-black/30 backdrop-blur-md rounded-2xl p-2.5 border border-white/15 mb-3 relative z-10 flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-300">
                    Squad Code:
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      const codeToCopy = normalizeSquadCode(activeSquad?.code || '');
                      if (!codeToCopy) return;
                      navigator.clipboard.writeText(codeToCopy);
                      onShowToast(`Squad invitation code "${codeToCopy}" copied!`);
                    }}
                    className="px-2 py-0.5 rounded-lg bg-amber-400 text-slate-950 font-mono text-xs font-black flex items-center gap-1 hover:bg-amber-300 transition-colors cursor-pointer"
                    title="Tap to copy group code"
                  >
                    <span>{normalizeSquadCode(activeSquad?.code || '') || 'SYNCING'}</span>
                    <Copy className="w-3 h-3" />
                  </button>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setPasscode(['', '', '', '', '', '']);
                    onSetJoinedGroup(false);
                    onShowToast('Enter the 6-character code sent by your friend to join their squad.');
                  }}
                  className="px-2.5 py-1 rounded-lg bg-emerald-500/30 hover:bg-emerald-500/50 border border-emerald-300/40 text-white text-[10px] font-bold transition-colors cursor-pointer shrink-0"
                >
                  + Join Friend&apos;s Code
                </button>
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
                    setPasscode(['', '', '', '', '', '']);
                    onSetJoinedGroup(false);
                    onShowToast('Enter a squad code or create a new expedition.');
                  }}
                  className="py-2.5 px-3 rounded-xl bg-white/10 hover:bg-white/20 text-white font-semibold text-xs transition-colors flex items-center justify-center gap-1 cursor-pointer"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Switch / Join Code</span>
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
            <TripGearChecklist
              onShowToast={onShowToast}
              groupId={activeSquad?.id || activeSquadId || localStorage.getItem('trailoPS_active_squad_id') || 'default'}
              currentUserId={currentUserId}
              userRole={userRole}
            />

            {/* PERSONAL TRAIL PACKING TO-DO & NOTES */}
            <PersonalPackingNotes onShowToast={onShowToast} />

            {/* Emergency SOS Hero Shortcut on Home */}
            <div className="rounded-2xl p-4 bg-gradient-to-r from-rose-50 to-red-50/70 border border-rose-200 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-rose-600 text-white flex items-center justify-center shadow-md shadow-rose-600/30">
                  <AlertOctagon className="w-5 h-5 animate-pulse" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-900">Emergency SOS</h4>
                  <p className="text-[11px] text-slate-500">Get emergency help</p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => onNavigate('sos')}
                className="py-2 px-3.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow-xs active:scale-95 transition-all cursor-pointer"
              >
                Open SOS
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
                        ref={(el) => {
                          inputRefs.current[index] = el;
                        }}
                        type="text"
                        maxLength={6}
                        value={char}
                        onChange={(e) => handleCharInput(index, e.target.value)}
                        onKeyDown={(e) => handleKeyDown(index, e)}
                        onPaste={handlePasteCode}
                        placeholder="-"
                        className={`h-12 rounded-xl text-center font-mono text-lg font-bold outline-none transition-all ${
                          char
                            ? 'bg-emerald-50 border-2 border-emerald-600 text-emerald-950 shadow-2xs'
                            : 'bg-slate-50 border border-slate-200 text-slate-400 focus:border-emerald-500 focus:bg-white'
                        }`}
                      />
                    ))}
                  </div>

                  <button
                    type="button"
                    onClick={() => verifyCodeLookup(passcode.join(''))}
                    disabled={isVerifyingCode}
                    className="w-full py-2.5 rounded-xl bg-gradient-to-r from-[#0f5238] to-emerald-600 hover:brightness-105 text-white text-xs font-extrabold flex items-center justify-center gap-1.5 shadow-sm active:scale-98 transition-all cursor-pointer disabled:opacity-60"
                  >
                    {isVerifyingCode ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Verifying Group Code...</span>
                      </>
                    ) : (
                      <>
                        <ArrowRight className="w-4 h-4" />
                        <span>Verify Group Code</span>
                      </>
                    )}
                  </button>

                  {/* Error Banner when an invalid code is entered */}
                  {codeLookupError && (
                    <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-900 text-xs flex items-start gap-2.5 animate-in fade-in duration-150">
                      <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                      <div>
                        <span className="font-extrabold block text-rose-950">No Group Available</span>
                        <span className="text-[11px] text-rose-800 mt-0.5 block leading-relaxed">
                          {codeLookupError}
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Verified Group Details Card & Join Request Action */}
                  {verifiedSquad && (
                    <div className="p-4 rounded-2xl bg-emerald-50/90 border-2 border-emerald-500/50 space-y-3 animate-in fade-in duration-200">
                      <div className="flex items-center justify-between">
                        <span className="inline-flex items-center gap-1 text-[10px] font-extrabold uppercase tracking-wider text-emerald-800 bg-white px-2.5 py-0.5 rounded-full border border-emerald-200">
                          <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                          Verified Expedition Group
                        </span>
                        <span className="font-mono text-xs font-black px-2 py-0.5 rounded-lg bg-emerald-950 text-amber-300">
                          {verifiedSquad.code}
                        </span>
                      </div>

                      <div>
                        <h3 className="text-sm font-black text-slate-900">{verifiedSquad.name}</h3>
                        <div className="grid grid-cols-2 gap-1.5 mt-1.5 text-[11px] text-slate-600 font-medium">
                          <span className="flex items-center gap-1 truncate">
                            <MapPin className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
                            {verifiedSquad.destination || 'Expedition Route'}
                          </span>
                          <span className="flex items-center gap-1">
                            <Users className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
                            {verifiedSquad.memberCount || 1} Member(s)
                          </span>
                          {verifiedSquad.startDate && (
                            <span className="flex items-center gap-1 col-span-2 text-slate-500">
                              <Calendar className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
                              Departure: {verifiedSquad.startDate}
                            </span>
                          )}
                        </div>
                      </div>

                      {verifiedSquad.userRequestStatus === 'pending' ? (
                        <div className="p-3 rounded-xl bg-amber-100/90 border border-amber-300 text-amber-950 text-xs flex items-start gap-2">
                          <Clock className="w-4 h-4 text-amber-700 shrink-0 mt-0.5 animate-pulse" />
                          <div>
                            <span className="font-extrabold block">Request Sent — Awaiting Approval</span>
                            <span className="text-[11px] text-amber-900 block mt-0.5 leading-snug">
                              Your join request is pending review by the group&apos;s Super Admin. Duplicate requests are prevented.
                            </span>
                          </div>
                        </div>
                      ) : verifiedSquad.userRequestStatus === 'member' ||
                        verifiedSquad.userRequestStatus === 'accepted' ? (
                        <button
                          type="button"
                          onClick={() => handleSubmitJoinRequest(verifiedSquad)}
                          className="w-full py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-extrabold flex items-center justify-center gap-1.5 shadow-sm cursor-pointer"
                        >
                          <UserCheck className="w-4 h-4" />
                          <span>Approved Member — Enter Group</span>
                        </button>
                      ) : (
                        <div className="space-y-2">
                          {verifiedSquad.userRequestStatus === 'rejected' && (
                            <div className="p-2.5 rounded-xl bg-rose-100/80 border border-rose-300 text-rose-900 text-[11px] flex items-center gap-1.5 font-semibold">
                              <XCircle className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                              <span>Your previous request was declined. You may submit a new request below.</span>
                            </div>
                          )}
                          <button
                            type="button"
                            onClick={() => handleSubmitJoinRequest(verifiedSquad)}
                            disabled={isSubmittingRequest}
                            className="w-full py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-extrabold flex items-center justify-center gap-1.5 shadow-sm cursor-pointer disabled:opacity-60"
                          >
                            {isSubmittingRequest ? (
                              <>
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                <span>Sending Join Request...</span>
                              </>
                            ) : (
                              <>
                                <Send className="w-3.5 h-3.5 text-emerald-400" />
                                <span>
                                  {verifiedSquad.userRequestStatus === 'rejected'
                                    ? 'Submit New Join Request'
                                    : 'Send Join Request to Super Admin'}
                                </span>
                              </>
                            )}
                          </button>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Active / Pending Join Requests Tracker */}
                  {myJoinRequests.length > 0 && (
                    <div className="pt-2 space-y-2">
                      <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-500 block">
                        Your Group Join Requests
                      </span>
                      {myJoinRequests.map((req) => (
                        <div
                          key={req.id}
                          className={`p-3 rounded-2xl border text-xs flex items-center justify-between gap-2 ${
                            req.status === 'pending'
                              ? 'bg-amber-50/90 border-amber-200 text-amber-950'
                              : req.status === 'accepted'
                              ? 'bg-emerald-50 border-emerald-200 text-emerald-950'
                              : 'bg-rose-50 border-rose-200 text-rose-950'
                          }`}
                        >
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5">
                              <span className="font-extrabold truncate">
                                {req.group_name || 'Expedition Group'}
                              </span>
                              {req.group_code && (
                                <span className="font-mono text-[10px] px-1.5 py-0.2 rounded bg-white/80 border border-slate-200 text-slate-700 font-bold">
                                  {req.group_code}
                                </span>
                              )}
                            </div>
                            <span className="text-[11px] block mt-0.5 font-semibold">
                              {req.status === 'pending'
                                ? '⏳ Request Sent — Awaiting Approval'
                                : req.status === 'accepted'
                                ? '✓ Approved by Super Admin'
                                : '✕ Request Declined by Super Admin'}
                            </span>
                          </div>
                          {req.status === 'rejected' && req.group_code && (
                            <button
                              type="button"
                              onClick={() => verifyCodeLookup(req.group_code!)}
                              className="px-2.5 py-1 rounded-lg bg-white hover:bg-rose-100 border border-rose-300 text-rose-900 text-[10px] font-bold shrink-0 cursor-pointer"
                            >
                              Request Again
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  )}

                  <p className="text-[11px] text-slate-500 text-center">
                    Enter the unique 6-character invitation code generated for your expedition group.
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
              Developed &amp; Maintained by:
            </span>
            <span className="text-[11px] font-black text-emerald-950 dark:text-emerald-300">
              Pratap Paul
            </span>
          </div>
          <div className="flex items-center justify-center gap-1.5 text-[11px] text-slate-600 dark:text-slate-400 font-medium mt-1.5">
            <GraduationCap className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
            <span>CS Student,</span>
            <span className="font-bold text-slate-800 dark:text-slate-200">Sri Krishna College, Nadia</span>
          </div>
        </footer>
      </main>

      {/* Permission Consent Modal Sheet */}
      <PermissionModal
        isOpen={isPermissionModalOpen}
        onClose={() => setIsPermissionModalOpen(false)}
        onConfirm={async () => {
          setIsPermissionModalOpen(false);
          if (verifiedSquad) {
            await handleSubmitJoinRequest(verifiedSquad);
          } else {
            const enteredCode = normalizeSquadCode(passcode.join(''));
            if (enteredCode.length >= 4) {
              await verifyCodeLookup(enteredCode);
            }
          }
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

          const res = await createSquadGroup(
            currentUserId || 'user_self',
            trip.name,
            trip.destination,
            trip.budgetPerMember,
            undefined,
            trip.departureDate,
            trip.returnDate,
            userName,
            currentUserEmail,
            avatarUrl
          );

          if (!res.success || !res.group) {
            onShowToast(res.error || 'Failed to create group in database.');
            return;
          }

          if (onUpdateTripDestination) {
            onUpdateTripDestination(trip);
          }

          onSquadJoined?.(res.group, 'super_admin');
          onShowToast(`Group "${res.group.name}" created! Unique Code: ${res.group.code}`);
          setPasscode(res.group.code.split('').slice(0, 6));
          localStorage.setItem('trailoPS_userRole', 'super_admin');
          onSetJoinedGroup(true);
        }}
      />

      {/* Synchronized Group Briefing Timer Modal */}
      <BriefingTimerModal
        isOpen={isBriefingModalOpen}
        onClose={() => setIsBriefingModalOpen(false)}
        groupId={activeSquad?.id || activeSquadId || 'default'}
        groupName={activeSquad?.name || 'Squad'}
        activeBriefing={activeBriefing}
        onSaved={(b) => setActiveBriefing(b)}
        onShowToast={onShowToast}
        currentUserId={currentUserId}
        currentUserName={userName}
        currentUserRole={userRole}
      />
    </div>
  );
};
