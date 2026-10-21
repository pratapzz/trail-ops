import React, { useState, useEffect, useCallback } from 'react';
import { ScreenType, ProfileFormData, UserRole } from './types';
import { ExpeditionProfileScreen } from './components/ExpeditionProfileScreen';
import { SignInScreen } from './components/SignInScreen';
import { EmergencySOSScreen } from './components/EmergencySOSScreen';
import { GatewayScreen } from './components/GatewayScreen';
import { SquadRollCallScreen } from './components/SquadRollCallScreen';
import { FeedScreen } from './components/FeedScreen';
import { SettingsScreen } from './components/SettingsScreen';
import { Navigation } from './components/Navigation';
import { DistressAlertModal } from './components/modals/DistressAlertModal';
import { FacultyDriveModal } from './components/FacultyDriveModal';
import { SplitwiseModal } from './components/SplitwiseModal';
import { AskAIOverlay } from './components/AskAIOverlay';
import { SupabaseSetupModal } from './components/modals/SupabaseSetupModal';
import { JoinSquadDeepLinkModal } from './components/modals/JoinSquadDeepLinkModal';
import { AttendanceAlertModal } from './components/modals/AttendanceAlertModal';
import { BroadcastAlertModal } from './components/modals/BroadcastAlertModal';
import { EmergencySirenAlertModal } from './components/modals/EmergencySirenAlertModal';
import { startEmergencySiren, stopEmergencySiren } from './lib/emergencyAudio';
import {
  getSupabase,
  isSupabaseConfigured,
  fetchProfile,
  upsertProfile,
  fetchUserSquad,
  fetchUserJoinRequestsAndNotifications,
  fetchGroupNotices,
  markNotificationRead,
  leaveSquadGroup,
  SquadGroupRecord,
  SquadSOSAlarmData,
  clearSquadSOSAlarm,
} from './lib/supabase';
import { CheckCircle2, Database, Shield } from 'lucide-react';

export default function App() {
  const [currentUserId, setCurrentUserId] = useState<string>(() => {
    return localStorage.getItem('trailoPS_currentUserId') || '';
  });

  const [currentUserEmail, setCurrentUserEmail] = useState<string>(() => {
    return localStorage.getItem('trailoPS_currentUserEmail') || '';
  });

  const [currentUserName, setCurrentUserName] = useState<string>(() => {
    return localStorage.getItem('trailoPS_currentUserName') || '';
  });

  const [currentUserAvatar, setCurrentUserAvatar] = useState<string>(() => {
    return localStorage.getItem('trailoPS_currentUserAvatar') || '';
  });

  const [isProfileComplete, setIsProfileComplete] = useState<boolean>(() => {
    const activeUserId = localStorage.getItem('trailoPS_currentUserId');
    const activeEmail = localStorage.getItem('trailoPS_currentUserEmail');
    if (!activeUserId && !activeEmail) return false;
    const byId = activeUserId ? localStorage.getItem(`trailoPS_isProfileComplete_${activeUserId}`) : null;
    const byEmail = activeEmail ? localStorage.getItem(`trailoPS_isProfileComplete_${activeEmail}`) : null;
    return byId === 'true' || byEmail === 'true';
  });

  const [currentScreen, setCurrentScreen] = useState<ScreenType>(() => {
    const activeEmail = localStorage.getItem('trailoPS_currentUserEmail');
    if (!activeEmail) return 'signin';
    const isDone = localStorage.getItem(`trailoPS_isProfileComplete_${activeEmail}`) === 'true';
    return isDone ? 'gateway' : 'signin';
  });

  // Group membership state - strictly synchronized with activeSquad so refresh never desynchronizes them
  const [activeSquad, setActiveSquad] = useState<SquadGroupRecord | null>(() => {
    try {
      const activeUserId = localStorage.getItem('trailoPS_currentUserId');
      const saved =
        (activeUserId && localStorage.getItem(`trailoPS_active_squad_${activeUserId}`)) ||
        localStorage.getItem('trailoPS_active_squad');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && parsed.id && parsed.name) return parsed;
      }
    } catch {}
    return null;
  });

  const [hasJoinedGroup, setHasJoinedGroup] = useState<boolean>(() => {
    try {
      const activeUserId = localStorage.getItem('trailoPS_currentUserId');
      const saved =
        (activeUserId && localStorage.getItem(`trailoPS_active_squad_${activeUserId}`)) ||
        localStorage.getItem('trailoPS_active_squad');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && parsed.id && parsed.name) return true;
      }
    } catch {}
    return false;
  });

  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [isSOSModalOpen, setIsSOSModalOpen] = useState(false);
  const [isFacultyDriveOpen, setIsFacultyDriveOpen] = useState(false);
  const [isSplitwiseOpen, setIsSplitwiseOpen] = useState(false);
  const [isSetupModalOpen, setIsSetupModalOpen] = useState(false);

  // Join deep link state from URL (?join=CODE)
  const [joinCodeParam, setJoinCodeParam] = useState<string | null>(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get('join') || null;
  });
  const [isJoinDeepLinkOpen, setIsJoinDeepLinkOpen] = useState(false);

  // Commander-Initiated Live Roll Call & Broadcast Alert State
  const squadKey = activeSquad?.id || 'default';
  const [activeRollCallSession, setActiveRollCallSession] = useState<{
    sessionId: string;
    active: boolean;
    startedAt: string;
    startedBy: string;
    presentUserIds: string[];
  } | null>(() => {
    const saved = localStorage.getItem(`trailoPS_active_rollcall_${squadKey}`);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed && typeof parsed === 'object') return parsed;
      } catch {}
    }
    return null;
  });

  const [isAttendanceModalOpen, setIsAttendanceModalOpen] = useState(false);
  const [latestBroadcast, setLatestBroadcast] = useState<{
    id: string;
    title: string;
    text: string;
    imageUrl?: string;
    priority: 'critical' | 'advisory' | 'info';
    author: string;
    timestamp: string;
  } | null>(null);
  const [isBroadcastModalOpen, setIsBroadcastModalOpen] = useState(false);

  // Group-Wide Continuous SOS Alarm State
  const [activeSOSAlarm, setActiveSOSAlarm] = useState<SquadSOSAlarmData | null>(() => {
    const saved = localStorage.getItem(`trailoPS_squad_sos_alarm_${squadKey}`);
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {}
    }
    return null;
  });

  // Sync Roll Call, Broadcast alerts, and Group-Wide SOS Siren across tabs and screens
  useEffect(() => {
    const handleRollCallSync = () => {
      const saved = localStorage.getItem(`trailoPS_active_rollcall_${squadKey}`);
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          if (parsed && typeof parsed === 'object') {
            setActiveRollCallSession(parsed);
            const myId = currentUserId || '1';
            // Show alert popup if roll call is active and user has not marked present yet
            if (parsed.active && !parsed.presentUserIds.includes(myId)) {
              setIsAttendanceModalOpen(true);
            }
          }
        } catch {}
      } else {
        setActiveRollCallSession(null);
      }
    };

    const handleNewAnnouncement = (e: any) => {
      if (e?.detail) {
        setLatestBroadcast(e.detail);
        setIsBroadcastModalOpen(true);
      } else {
        const saved = localStorage.getItem(`trailoPS_latest_broadcast_${squadKey}`);
        if (saved) {
          try {
            const parsed = JSON.parse(saved);
            if (parsed) {
              setLatestBroadcast(parsed);
              setIsBroadcastModalOpen(true);
            }
          } catch {}
        }
      }
    };

    const handleSOSAlarm = (e: any) => {
      if (e?.detail) {
        setActiveSOSAlarm(e.detail);
        startEmergencySiren();
      }
    };

    const handleSOSAlarmCleared = () => {
      setActiveSOSAlarm(null);
      stopEmergencySiren();
    };

    const handleGroupDeleted = () => {
      stopEmergencySiren();
      setActiveSOSAlarm(null);
      setHasJoinedGroup(false);
      setActiveSquad(null);
      localStorage.removeItem('trailoPS_joined_group');
      localStorage.removeItem('trailoPS_active_squad');
      setCurrentScreen('gateway');
      showToast('The expedition squad has been closed by the Super Admin.');
    };

    const handleStorageChange = (e: StorageEvent) => {
      handleRollCallSync();
      if (!e.key) return;

      if (e.key === `trailoPS_squad_sos_alarm_${squadKey}` || e.key.startsWith('trailoPS_squad_sos_alarm_')) {
        if (e.newValue) {
          try {
            const parsed = JSON.parse(e.newValue);
            setActiveSOSAlarm(parsed);
            startEmergencySiren();
          } catch {}
        } else {
          setActiveSOSAlarm(null);
          stopEmergencySiren();
        }
      }

      if (e.key === 'trailoPS_group_deleted') {
        handleGroupDeleted();
      }
    };

    handleRollCallSync();

    // Check if alarm was already active
    const existingAlarm = localStorage.getItem(`trailoPS_squad_sos_alarm_${squadKey}`);
    if (existingAlarm) {
      try {
        const parsed = JSON.parse(existingAlarm);
        if (parsed) {
          setActiveSOSAlarm(parsed);
          startEmergencySiren();
        }
      } catch {}
    }

    // Set up BroadcastChannel for zero-latency multi-tab/window synchronization
    let squadBus: BroadcastChannel | null = null;
    try {
      if (typeof BroadcastChannel !== 'undefined') {
        squadBus = new BroadcastChannel(`trailops_squad_bus_${squadKey}`);
        squadBus.onmessage = (event) => {
          if (event.data?.type === 'SOS_TRIGGERED') {
            setActiveSOSAlarm(event.data.payload);
            startEmergencySiren();
          } else if (event.data?.type === 'SOS_CLEARED') {
            setActiveSOSAlarm(null);
            stopEmergencySiren();
          } else if (event.data?.type === 'GROUP_DELETED') {
            handleGroupDeleted();
          } else if (event.data?.type === 'GROUP_NOTICE_BROADCAST') {
            const notice = event.data?.notice;
            if (notice && notice.author_id !== currentUserId) {
              const seenKey = `trailoPS_seen_notice_${currentUserId}_${notice.id}`;
              if (!localStorage.getItem(seenKey)) {
                setLatestBroadcast({
                  id: notice.id,
                  title: notice.title,
                  text: notice.text,
                  imageUrl: notice.image_url,
                  priority: notice.priority,
                  author: notice.author_name,
                  timestamp: 'Just now',
                });
                setIsBroadcastModalOpen(true);
              }
            }
          }
        };
      }
    } catch (e) {}

    // Set up Supabase Realtime channel for cross-device SOS, notices & group updates
    const sb = getSupabase();
    let realtimeChannel: any = null;
    if (sb && isSupabaseConfigured()) {
      try {
        realtimeChannel = sb.channel(`squad_realtime_${squadKey}`)
          .on('broadcast', { event: 'sos_trigger' }, ({ payload }: any) => {
            if (payload) {
              setActiveSOSAlarm(payload);
              startEmergencySiren();
            }
          })
          .on('broadcast', { event: 'sos_cleared' }, () => {
            setActiveSOSAlarm(null);
            stopEmergencySiren();
          })
          .on('broadcast', { event: 'group_deleted' }, () => {
            handleGroupDeleted();
          })
          .on('broadcast', { event: 'notice_broadcast' }, ({ payload }: any) => {
            const notice = payload?.notice;
            if (notice && notice.author_id !== currentUserId) {
              const seenKey = `trailoPS_seen_notice_${currentUserId}_${notice.id}`;
              if (!localStorage.getItem(seenKey)) {
                setLatestBroadcast({
                  id: notice.id,
                  title: notice.title,
                  text: notice.text,
                  imageUrl: notice.image_url,
                  priority: notice.priority,
                  author: notice.author_name,
                  timestamp: 'Just now',
                });
                setIsBroadcastModalOpen(true);
              }
            }
          })
          .subscribe();
      } catch (err) {
        console.warn('Realtime subscription error:', err);
      }
    }

    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('trailoPS_rollcall_sync', handleRollCallSync);
    window.addEventListener('trailoPS_new_announcement', handleNewAnnouncement);
    window.addEventListener('trailoPS_squad_sos_alarm', handleSOSAlarm);
    window.addEventListener('trailoPS_squad_sos_alarm_cleared', handleSOSAlarmCleared);
    window.addEventListener('trailoPS_group_deleted', handleGroupDeleted);

    return () => {
      if (squadBus) {
        try { squadBus.close(); } catch {}
      }
      if (realtimeChannel && sb) {
        try { sb.removeChannel(realtimeChannel); } catch {}
      }
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('trailoPS_rollcall_sync', handleRollCallSync);
      window.removeEventListener('trailoPS_new_announcement', handleNewAnnouncement);
      window.removeEventListener('trailoPS_squad_sos_alarm', handleSOSAlarm);
      window.removeEventListener('trailoPS_squad_sos_alarm_cleared', handleSOSAlarmCleared);
      window.removeEventListener('trailoPS_group_deleted', handleGroupDeleted);
    };
  }, [squadKey, currentUserId]);

  // Global cross-device background sync for notices and alerts (operates on any active screen)
  useEffect(() => {
    let isMounted = true;

    const pollIncomingNoticesAndBroadcasts = async () => {
      try {
        const targetUserId = currentUserId || localStorage.getItem('trailoPS_currentUserId');
        const targetGroupId = activeSquad?.id || localStorage.getItem('trailoPS_active_squad_id');

        // 1. Check user notifications if user ID available
        if (targetUserId) {
          const { notifications } = await fetchUserJoinRequestsAndNotifications(targetUserId);
          if (!isMounted) return;
          for (const notif of notifications) {
            if (!notif.read && notif.type === 'notice_broadcast') {
              const seenKey = `trailoPS_seen_notice_${targetUserId}_${notif.notice_id || notif.id}`;
              if (!localStorage.getItem(seenKey)) {
                localStorage.setItem(seenKey, 'true');
                markNotificationRead(notif.id);
                setLatestBroadcast({
                  id: notif.notice_id || notif.id,
                  title: (notif.title || 'Squad Broadcast').replace(/^📢\s*\[[^\]]+\]\s*/, ''),
                  text: notif.message,
                  priority: notif.priority || 'critical',
                  author: notif.author_name || 'Squad Member',
                  timestamp: 'Just now',
                });
                setIsBroadcastModalOpen(true);
                showToast(`📢 ${notif.title}: ${notif.message}`);
              }
            }
          }
        }

        // 2. Also check group notices endpoint for newly published broadcasts
        if (targetGroupId) {
          const res = await fetchGroupNotices(targetGroupId, targetUserId || undefined);
          if (!isMounted) return;
          if (res.notices && res.notices.length > 0) {
            const newest = res.notices[0];
            const seenKey = `trailoPS_seen_notice_${targetUserId || 'anon'}_${newest.id}`;
            const isCreator = targetUserId && newest.author_id === targetUserId;
            if (!isCreator && !localStorage.getItem(seenKey)) {
              localStorage.setItem(seenKey, 'true');
              setLatestBroadcast({
                id: newest.id,
                title: newest.title,
                text: newest.text,
                imageUrl: newest.image_url,
                priority: newest.priority,
                author: newest.author_name,
                timestamp: 'Just now',
              });
              setIsBroadcastModalOpen(true);
              showToast(`📢 Announcement: ${newest.title}`);
            }
          }
        }
      } catch {}
    };

    pollIncomingNoticesAndBroadcasts();
    const interval = setInterval(pollIncomingNoticesAndBroadcasts, 3500);

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [currentUserId, activeSquad?.id]);

  const handleMarkPresentFromModal = () => {
    const myId = currentUserId || '1';
    if (!activeRollCallSession) return;
    const updated = {
      ...activeRollCallSession,
      presentUserIds: Array.from(new Set([...activeRollCallSession.presentUserIds, myId])),
    };
    setActiveRollCallSession(updated);
    localStorage.setItem(`trailoPS_active_rollcall_${squadKey}`, JSON.stringify(updated));
    window.dispatchEvent(new CustomEvent('trailoPS_rollcall_sync', { detail: updated }));

    const savedMembers = localStorage.getItem('trailoPS_squad_members');
    if (savedMembers) {
      try {
        const parsed = JSON.parse(savedMembers);
        if (Array.isArray(parsed)) {
          const next = parsed.map((m: any) => (m.id === myId ? { ...m, status: 'present' } : m));
          localStorage.setItem('trailoPS_squad_members', JSON.stringify(next));
          window.dispatchEvent(new CustomEvent('trailoPS_members_updated'));
        }
      } catch {}
    }
    showToast('✓ Attendance confirmed! You are marked Present.');
    setTimeout(() => {
      setIsAttendanceModalOpen(false);
    }, 600);
  };

  // Group Hierarchy & Financials state
  const [userRole, setUserRole] = useState<UserRole>(() => {
    const saved = localStorage.getItem('trailoPS_userRole');
    const savedMembers = localStorage.getItem('trailoPS_squad_members');
    if (savedMembers) {
      try {
        const parsed = JSON.parse(savedMembers);
        if (Array.isArray(parsed) && (parsed.length <= 1 || !parsed.some((m: any) => m.roleHierarchy === 'super_admin'))) {
          localStorage.setItem('trailoPS_userRole', 'super_admin');
          return 'super_admin';
        }
      } catch {}
    }
    if (saved === 'super_admin' || saved === 'admin' || saved === 'faculty' || saved === 'subgroup_admin') {
      return saved as UserRole;
    }
    // If user is the creator or in a 1-member group, default to super_admin
    return 'super_admin';
  });

  // App Theme: 'dark' | 'light' | 'system'
  const [theme, setTheme] = useState<'light' | 'dark' | 'system'>(() => {
    return (localStorage.getItem('trailoPS_theme') as any) || 'light';
  });

  useEffect(() => {
    localStorage.setItem('trailoPS_userRole', userRole);
  }, [userRole]);

  // Mandatory Single Member Super Admin Check: Ensure 1 member in group is always Super Admin
  useEffect(() => {
    if (hasJoinedGroup) {
      const savedMembers = localStorage.getItem('trailoPS_squad_members');
      if (savedMembers) {
        try {
          const parsed = JSON.parse(savedMembers);
          if (Array.isArray(parsed) && (parsed.length <= 1 || !parsed.some((m: any) => m.roleHierarchy === 'super_admin'))) {
            if (userRole !== 'super_admin') {
              setUserRole('super_admin');
              localStorage.setItem('trailoPS_userRole', 'super_admin');
            }
          }
        } catch {}
      } else {
        if (userRole !== 'super_admin') {
          setUserRole('super_admin');
          localStorage.setItem('trailoPS_userRole', 'super_admin');
        }
      }
    }
  }, [hasJoinedGroup, userRole]);

  // Handle dark mode class application on <html>
  useEffect(() => {
    localStorage.setItem('trailoPS_theme', theme);
    const root = document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else if (theme === 'light') {
      root.classList.remove('dark');
    } else {
      if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
        root.classList.add('dark');
      } else {
        root.classList.remove('dark');
      }
    }
  }, [theme]);

  const [tripBudget, setTripBudget] = useState<number>(() => {
    const saved = localStorage.getItem('trailoPS_tripBudget');
    return saved ? Number(saved) : 6000;
  });
  const [amountPaid, setAmountPaid] = useState<number>(() => {
    const saved = localStorage.getItem('trailoPS_amountPaid');
    return saved ? Number(saved) : 0;
  });
  const [amountPending, setAmountPending] = useState<number>(() => {
    const saved = localStorage.getItem('trailoPS_amountPending');
    return saved ? Number(saved) : 6000;
  });

  useEffect(() => {
    localStorage.setItem('trailoPS_tripBudget', String(tripBudget));
    localStorage.setItem('trailoPS_amountPaid', String(amountPaid));
    localStorage.setItem('trailoPS_amountPending', String(amountPending));
  }, [tripBudget, amountPaid, amountPending]);

  const [subGroupName, setSubGroupName] = useState<string>('Scout Team Alpha');
  const [subGroupColor, setSubGroupColor] = useState<string>('#ef4444');

  // Active Trip & Destination Coordinates State
  const [tripDestination, setTripDestination] = useState<{
    name: string;
    destination: string;
    coordinates: { lat: number; lng: number };
    departureDate: string;
    returnDate: string;
  }>(() => {
    const saved = localStorage.getItem('trailoPS_activeTrip');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {}
    }
    return {
      name: 'Expedition Route',
      destination: 'Pelling High Ridge (2,150m ASL)',
      coordinates: { lat: 27.3184, lng: 88.2412 },
      departureDate: '2026-10-24',
      returnDate: '2026-10-30',
    };
  });

  useEffect(() => {
    localStorage.setItem('trailoPS_activeTrip', JSON.stringify(tripDestination));
  }, [tripDestination]);

  // Clean empty profile draft for new users
  const getEmptyProfileDraft = (name: string, email: string, avatar?: string): ProfileFormData => ({
    fullName: name,
    guardianName: '',
    dateOfBirth: '',
    age: undefined,
    gender: undefined,
    countryCode: '🇮🇳 +91',
    phoneNumber: '',
    emergencyNumber: '',
    bloodGroup: 'O+',
    allergies: [],
    medications: '',
    medsPacked: false,
    heightCm: 175,
    weightKg: 70,
    experienceLevel: 'Intermediate',
    healthNotes: '',
    avatarUrl:
      avatar ||
      'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=200&q=80',
  });

  // User Profile State with per-account isolation
  const [profileData, setProfileData] = useState<ProfileFormData>(() => {
    const activeUserId = localStorage.getItem('trailoPS_currentUserId');
    const activeEmail = localStorage.getItem('trailoPS_currentUserEmail');
    if (activeUserId) {
      const saved = localStorage.getItem(`trailoPS_profile_${activeUserId}`);
      if (saved) {
        try {
          return JSON.parse(saved);
        } catch {}
      }
    }
    if (activeEmail) {
      const saved = localStorage.getItem(`trailoPS_profile_${activeEmail}`);
      if (saved) {
        try {
          return JSON.parse(saved);
        } catch {}
      }
    }
    return getEmptyProfileDraft('', '');
  });

  const showToast = (message: string) => {
    setToastMessage(message);
    setTimeout(() => {
      setToastMessage(null);
    }, 3200);
  };

  // Synchronize user session state across Supabase & local storage
  const syncUserSession = useCallback(async (
    userId: string,
    email: string,
    metaName?: string,
    metaAvatar?: string
  ) => {
    const emailKey = email.trim().toLowerCase();
    setCurrentUserId(userId);
    setCurrentUserEmail(emailKey);
    localStorage.setItem('trailoPS_currentUserId', userId);
    localStorage.setItem('trailoPS_currentUserEmail', emailKey);

    // 1. Try fetching real profile from Supabase
    let remoteProfile: any = null;
    try {
      remoteProfile = await fetchProfile(userId);
    } catch (e) {
      console.warn('Error fetching Supabase profile:', e);
    }

    if (remoteProfile && remoteProfile.is_profile_complete) {
      // Existing profile found in Supabase
      const mappedProfile: ProfileFormData = {
        fullName: remoteProfile.full_name || metaName || emailKey.split('@')[0],
        guardianName: remoteProfile.guardian_name || '',
        dateOfBirth: remoteProfile.date_of_birth || '',
        age: remoteProfile.age,
        gender: remoteProfile.gender,
        countryCode: '🇮🇳 +91',
        phoneNumber: remoteProfile.phone || '',
        emergencyNumber: remoteProfile.emergency_contact_phone || '',
        bloodGroup: remoteProfile.blood_group || 'O+',
        allergies: [],
        medications: remoteProfile.medical_conditions || '',
        medsPacked: true,
        heightCm: 175,
        weightKg: 70,
        experienceLevel: 'Intermediate',
        healthNotes: '',
        avatarUrl: remoteProfile.avatar_url || metaAvatar || '',
      };
      setProfileData(mappedProfile);
      setCurrentUserName(mappedProfile.fullName);
      setCurrentUserAvatar(mappedProfile.avatarUrl);
      setIsProfileComplete(true);

      localStorage.setItem('trailoPS_currentUserName', mappedProfile.fullName);
      if (mappedProfile.avatarUrl) {
        localStorage.setItem('trailoPS_currentUserAvatar', mappedProfile.avatarUrl);
      }
      localStorage.setItem(`trailoPS_profile_${userId}`, JSON.stringify(mappedProfile));
      localStorage.setItem(`trailoPS_profile_${emailKey}`, JSON.stringify(mappedProfile));
      localStorage.setItem(`trailoPS_isProfileComplete_${userId}`, 'true');
      localStorage.setItem(`trailoPS_isProfileComplete_${emailKey}`, 'true');

      // Check group membership in database
      const userSquad = await fetchUserSquad(userId);
      if (userSquad) {
        setActiveSquad(userSquad);
        setHasJoinedGroup(true);
        localStorage.setItem(`trailoPS_hasJoinedGroup_${userId}`, 'true');
        localStorage.setItem(`trailoPS_hasJoinedGroup_${emailKey}`, 'true');
        localStorage.setItem('trailoPS_active_squad', JSON.stringify(userSquad));
        localStorage.setItem('trailoPS_active_squad_id', userSquad.id);
        localStorage.setItem(`trailoPS_active_squad_${userId}`, JSON.stringify(userSquad));
        localStorage.setItem(`trailoPS_active_squad_id_${userId}`, userSquad.id);
        setTripDestination({
          name: userSquad.name,
          destination: userSquad.destination,
          coordinates: { lat: 27.3184, lng: 88.2412 },
          departureDate: userSquad.startDate || '2026-10-24',
          returnDate: '2026-10-30',
        });
      } else {
        setActiveSquad(null);
        setHasJoinedGroup(false);
        localStorage.removeItem('trailoPS_active_squad');
        localStorage.removeItem('trailoPS_active_squad_id');
        localStorage.removeItem(`trailoPS_active_squad_${userId}`);
        localStorage.removeItem(`trailoPS_active_squad_id_${userId}`);
        localStorage.setItem(`trailoPS_hasJoinedGroup_${userId}`, 'false');
        localStorage.setItem(`trailoPS_hasJoinedGroup_${emailKey}`, 'false');
      }

      // Strictly transition to gateway ONLY if user was on the signin screen
      setCurrentScreen((prevScreen) => (prevScreen === 'signin' ? 'gateway' : prevScreen));
      showToast(`Welcome back, ${mappedProfile.fullName}!`);
    } else {
      // Check local storage for this specific email/ID as fallback
      const savedLocal =
        localStorage.getItem(`trailoPS_profile_${userId}`) ||
        localStorage.getItem(`trailoPS_profile_${emailKey}`);
      const isDoneLocal =
        localStorage.getItem(`trailoPS_isProfileComplete_${userId}`) === 'true' ||
        localStorage.getItem(`trailoPS_isProfileComplete_${emailKey}`) === 'true';

      if (savedLocal && isDoneLocal) {
        try {
          const parsed = JSON.parse(savedLocal);
          setProfileData(parsed);
          setCurrentUserName(parsed.fullName);
          setCurrentUserAvatar(parsed.avatarUrl);
          setIsProfileComplete(true);
          if (parsed.fullName) {
            localStorage.setItem('trailoPS_currentUserName', parsed.fullName);
          }
          if (parsed.avatarUrl) {
            localStorage.setItem('trailoPS_currentUserAvatar', parsed.avatarUrl);
          }
          upsertProfile({
            id: userId,
            email: emailKey,
            full_name: parsed.fullName,
            avatar_url: parsed.avatarUrl,
            phone: parsed.phoneNumber,
            is_profile_complete: true,
          }).catch(() => {});
          const userSquad = await fetchUserSquad(userId);
          if (userSquad) {
            setActiveSquad(userSquad);
            setHasJoinedGroup(true);
            localStorage.setItem(`trailoPS_hasJoinedGroup_${userId}`, 'true');
            localStorage.setItem(`trailoPS_hasJoinedGroup_${emailKey}`, 'true');
            localStorage.setItem('trailoPS_active_squad', JSON.stringify(userSquad));
            localStorage.setItem('trailoPS_active_squad_id', userSquad.id);
            localStorage.setItem(`trailoPS_active_squad_${userId}`, JSON.stringify(userSquad));
            localStorage.setItem(`trailoPS_active_squad_id_${userId}`, userSquad.id);
          } else {
            setActiveSquad(null);
            setHasJoinedGroup(false);
            localStorage.removeItem('trailoPS_active_squad');
            localStorage.removeItem('trailoPS_active_squad_id');
            localStorage.removeItem(`trailoPS_active_squad_${userId}`);
            localStorage.removeItem(`trailoPS_active_squad_id_${userId}`);
            localStorage.setItem(`trailoPS_hasJoinedGroup_${userId}`, 'false');
            localStorage.setItem(`trailoPS_hasJoinedGroup_${emailKey}`, 'false');
          }
          setCurrentScreen((prevScreen) => (prevScreen === 'signin' ? 'gateway' : prevScreen));
          showToast(`Welcome back, ${parsed.fullName}!`);
          return;
        } catch {}
      }

      // NEW USER / GMAIL: DIRECT STRICTLY TO PROFILE CREATION (NEVER SKIP)
      const freshDraft = getEmptyProfileDraft(
        metaName || emailKey.split('@')[0],
        emailKey,
        metaAvatar
      );
      setProfileData(freshDraft);
      setCurrentUserName(freshDraft.fullName);
      setCurrentUserAvatar(freshDraft.avatarUrl);
      setIsProfileComplete(false);
      setHasJoinedGroup(false);
      setActiveSquad(null);
      localStorage.setItem(`trailoPS_isProfileComplete_${userId}`, 'false');
      localStorage.setItem(`trailoPS_isProfileComplete_${emailKey}`, 'false');
      localStorage.setItem(`trailoPS_hasJoinedGroup_${userId}`, 'false');
      localStorage.setItem(`trailoPS_hasJoinedGroup_${emailKey}`, 'false');

      setCurrentScreen('profile');
      showToast(`Signed in as ${emailKey}. Please complete your expedition profile.`);
    }
  }, []);

  // Listen for Supabase Auth state changes
  useEffect(() => {
    const sb = getSupabase();
    if (!sb) return;

    // Check existing session on boot
    sb.auth.getSession().then(({ data }) => {
      if (data?.session?.user) {
        const u = data.session.user;
        const name = u.user_metadata?.full_name || u.email?.split('@')[0] || 'Trekker';
        const avatar = u.user_metadata?.avatar_url;
        syncUserSession(u.id, u.email || '', name, avatar);
      }
    });

    const { data: authListener } = sb.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' && session?.user) {
        const u = session.user;
        if (currentUserId !== u.id) {
          const name = u.user_metadata?.full_name || u.email?.split('@')[0] || 'Trekker';
          const avatar = u.user_metadata?.avatar_url;
          syncUserSession(u.id, u.email || '', name, avatar);
        }
      } else if (event === 'SIGNED_OUT') {
        setCurrentUserId('');
        setCurrentUserEmail('');
        setCurrentUserName('');
        setCurrentUserAvatar('');
        setIsProfileComplete(false);
        setHasJoinedGroup(false);
        setActiveSquad(null);
        setCurrentScreen('signin');
      }
    });

    return () => {
      authListener?.subscription?.unsubscribe();
    };
  }, [syncUserSession]);

  // Check URL join parameter on launch
  useEffect(() => {
    if (joinCodeParam) {
      setIsJoinDeepLinkOpen(true);
    }
  }, [joinCodeParam]);

  const handleUserSignIn = (user: { id?: string; name: string; email: string; avatar?: string; phone?: string }) => {
    const userId = user.id || 'usr_' + Math.random().toString(36).slice(2, 9);
    syncUserSession(userId, user.email, user.name, user.avatar);
  };

  const handleCompleteProfile = async (data: ProfileFormData) => {
    setProfileData(data);
    setIsProfileComplete(true);
    setCurrentUserName(data.fullName);
    if (data.avatarUrl) setCurrentUserAvatar(data.avatarUrl);

    const activeUserId = currentUserId || 'usr_' + Date.now();
    const activeEmail = currentUserEmail || 'user@trailoPS.app';

    // Persist in localStorage
    localStorage.setItem(`trailoPS_profile_${activeUserId}`, JSON.stringify(data));
    localStorage.setItem(`trailoPS_profile_${activeEmail}`, JSON.stringify(data));
    localStorage.setItem(`trailoPS_isProfileComplete_${activeUserId}`, 'true');
    localStorage.setItem(`trailoPS_isProfileComplete_${activeEmail}`, 'true');

    // Persist to database (Supabase + Server DB)
    if (activeUserId) {
      try {
        const combinedMedical = [
          data.medications ? `Medications: ${data.medications}` : '',
          data.allergies && data.allergies.length > 0 ? `Allergies: ${data.allergies.map((a) => a.name).join(', ')}` : '',
          data.healthNotes ? `Notes: ${data.healthNotes}` : '',
        ].filter(Boolean).join(' | ');

        await upsertProfile({
          id: activeUserId,
          email: activeEmail,
          full_name: data.fullName,
          avatar_url: data.avatarUrl,
          phone: data.phoneNumber,
          date_of_birth: data.dateOfBirth,
          age: data.age,
          gender: data.gender,
          blood_group: data.bloodGroup,
          medical_conditions: combinedMedical || data.medications || '',
          emergency_contact_name: data.guardianName || 'Emergency Next of Kin',
          emergency_contact_phone: data.emergencyNumber,
          gear_checklist: data.allergies || [],
          is_profile_complete: true,
        });
      } catch (err) {
        console.warn('Failed to upsert profile:', err);
      }
    }

    setCurrentScreen('gateway');
    showToast('Expedition profile registered and secured!');

    // If waiting on deep link join code, open modal
    if (joinCodeParam) {
      setIsJoinDeepLinkOpen(true);
    }
  };

  const handleSetJoinedGroup = (joined: boolean) => {
    setHasJoinedGroup(joined);
    const effectiveId = currentUserId || localStorage.getItem('trailoPS_currentUserId') || '';
    if (!joined) {
      const targetGroupId = activeSquad?.id || localStorage.getItem('trailoPS_active_squad_id') || '';
      if (targetGroupId) {
        leaveSquadGroup(targetGroupId, effectiveId || 'user_self').catch(() => {});
      }
      setActiveSquad(null);
      localStorage.removeItem('trailoPS_active_squad');
      localStorage.removeItem('trailoPS_active_squad_id');
      localStorage.removeItem('trailoPS_activeTrip');
      localStorage.removeItem('trailoPS_squad_members');
      localStorage.removeItem('trailoPS_joined_group');
      if (effectiveId) {
        localStorage.removeItem(`trailoPS_active_squad_${effectiveId}`);
        localStorage.removeItem(`trailoPS_active_squad_id_${effectiveId}`);
      }
    }
    if (effectiveId) {
      localStorage.setItem(`trailoPS_hasJoinedGroup_${effectiveId}`, String(joined));
    }
    if (currentUserEmail) {
      localStorage.setItem(`trailoPS_hasJoinedGroup_${currentUserEmail}`, String(joined));
    }
  };

  const handleSignOut = async () => {
    const sb = getSupabase();
    if (sb) {
      try {
        await sb.auth.signOut();
      } catch {}
    }

    localStorage.removeItem('trailoPS_currentUserId');
    localStorage.removeItem('trailoPS_currentUserEmail');
    localStorage.removeItem('trailoPS_currentUserName');
    localStorage.removeItem('trailoPS_currentUserAvatar');

    setCurrentUserId('');
    setCurrentUserEmail('');
    setCurrentUserName('');
    setCurrentUserAvatar('');
    setIsProfileComplete(false);
    setHasJoinedGroup(false);
    setActiveSquad(null);
    setProfileData(getEmptyProfileDraft('', ''));
    setCurrentScreen('signin');
    showToast('Signed out of TrailoPS session.');
  };

  const refreshActiveSquad = async () => {
    const effectiveId = currentUserId || localStorage.getItem('trailoPS_currentUserId') || '';
    if (effectiveId) {
      const sq = await fetchUserSquad(effectiveId);
      setActiveSquad(sq);
      if (sq) {
        setHasJoinedGroup(true);
        localStorage.setItem(`trailoPS_hasJoinedGroup_${effectiveId}`, 'true');
        localStorage.setItem('trailoPS_active_squad', JSON.stringify(sq));
        localStorage.setItem('trailoPS_active_squad_id', sq.id);
        setTripDestination({
          name: sq.name,
          destination: sq.destination,
          coordinates: { lat: 27.3184, lng: 88.2412 },
          departureDate: sq.startDate || sq.start_date || '2026-10-24',
          returnDate: sq.endDate || sq.end_date || '2026-10-30',
        });
      }
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-start text-slate-800 dark:text-slate-100">
      {/* Screen Render Container with Smooth Page Change Animation & Tactical Dark Theme */}
      <div className="w-full max-w-md flex-1 bg-[#f8faf9] dark:bg-slate-950 dark:text-slate-100 relative min-h-screen flex flex-col transition-colors duration-200 shadow-2xl">
        <div key={currentScreen} className="animate-page-enter w-full flex-1 flex flex-col">
          {currentScreen === 'signin' && (
            <SignInScreen
              onNavigate={(screen) => setCurrentScreen(screen)}
              onShowToast={showToast}
              onSocialSignIn={handleUserSignIn}
            />
          )}

          {currentScreen === 'profile' && (
            <ExpeditionProfileScreen
              onNavigate={(screen) => setCurrentScreen(screen)}
              onShowToast={showToast}
              onCompleteProfile={handleCompleteProfile}
              initialData={profileData}
            />
          )}

          {currentScreen === 'gateway' && (
            <GatewayScreen
              onNavigate={(screen) => setCurrentScreen(screen)}
              onShowToast={showToast}
              hasJoinedGroup={hasJoinedGroup}
              onSetJoinedGroup={handleSetJoinedGroup}
              userName={profileData.fullName}
              currentUserId={currentUserId}
              currentUserEmail={currentUserEmail}
              avatarUrl={profileData.avatarUrl}
              onOpenSOS={() => setIsSOSModalOpen(true)}
              tripBudget={tripBudget}
              amountPaid={amountPaid}
              amountPending={amountPending}
              onOpenFacultyDrive={() => setIsFacultyDriveOpen(true)}
              onOpenSplitwise={() => setIsSplitwiseOpen(true)}
              destinationName={activeSquad?.destination || tripDestination.destination}
              destinationCoordinates={tripDestination.coordinates}
              departureDate={tripDestination.departureDate}
              activeSquadId={activeSquad?.id}
              activeSquad={activeSquad}
              userRole={userRole}
              onSquadJoined={(group, role) => {
                setActiveSquad(group);
                setHasJoinedGroup(true);
                localStorage.setItem('trailoPS_active_squad', JSON.stringify(group));
                localStorage.setItem('trailoPS_active_squad_id', group.id);
                if (role) {
                  setUserRole(role);
                  localStorage.setItem('trailoPS_userRole', role);
                }
                if (currentUserId) {
                  localStorage.setItem(`trailoPS_active_squad_${currentUserId}`, JSON.stringify(group));
                  localStorage.setItem(`trailoPS_active_squad_id_${currentUserId}`, group.id);
                  localStorage.setItem(`trailoPS_hasJoinedGroup_${currentUserId}`, 'true');
                }
                if (currentUserEmail) {
                  localStorage.setItem(`trailoPS_hasJoinedGroup_${currentUserEmail}`, 'true');
                }
                setTripDestination((prev) => ({
                  ...prev,
                  name: group.name,
                  destination: group.destination || prev.destination,
                }));
              }}
              onUpdateTripDestination={(trip) => {
                const updatedTrip = {
                  name: trip.name,
                  destination: trip.destination,
                  coordinates: trip.coordinates,
                  departureDate: trip.departureDate,
                  returnDate: trip.returnDate,
                };
                setTripDestination(updatedTrip);
                setTripBudget(trip.budgetPerMember);
                setAmountPaid(0);
                setAmountPending(trip.budgetPerMember);
                setHasJoinedGroup(true);
                setUserRole('super_admin');
                localStorage.setItem('trailoPS_userRole', 'super_admin');
                if (currentUserId) {
                  localStorage.setItem(`trailoPS_hasJoinedGroup_${currentUserId}`, 'true');
                }
                if (currentUserEmail) {
                  localStorage.setItem(`trailoPS_hasJoinedGroup_${currentUserEmail}`, 'true');
                }
                localStorage.setItem('trailoPS_activeTrip', JSON.stringify(updatedTrip));
              }}
            />
          )}

          {currentScreen === 'feed' && (
            <FeedScreen
              onNavigate={(screen) => setCurrentScreen(screen)}
              onShowToast={showToast}
              hasJoinedGroup={hasJoinedGroup}
              activeSquad={activeSquad}
              userRole={userRole}
              currentUserId={currentUserId}
              currentUserName={profileData.fullName}
              currentUserAvatar={profileData.avatarUrl}
            />
          )}

          {currentScreen === 'squad' && (
            <SquadRollCallScreen
              onNavigate={(screen) => setCurrentScreen(screen)}
              onShowToast={showToast}
              hasJoinedGroup={hasJoinedGroup}
              onSetJoinedGroup={handleSetJoinedGroup}
              userRole={userRole}
              onUpdateRole={(role) => setUserRole(role)}
              onOpenFacultyDrive={() => setIsFacultyDriveOpen(true)}
              onOpenSplitwise={() => setIsSplitwiseOpen(true)}
              currentUserName={profileData.fullName}
              currentUserAvatar={profileData.avatarUrl}
              currentUserId={currentUserId}
              activeSquad={activeSquad}
              onRefreshSquad={refreshActiveSquad}
              onSquadJoined={(group, role) => {
                setActiveSquad(group);
                setHasJoinedGroup(true);
                localStorage.setItem('trailoPS_active_squad', JSON.stringify(group));
                localStorage.setItem('trailoPS_active_squad_id', group.id);
                if (role) {
                  setUserRole(role);
                  localStorage.setItem('trailoPS_userRole', role);
                }
                if (currentUserId) {
                  localStorage.setItem(`trailoPS_active_squad_${currentUserId}`, JSON.stringify(group));
                  localStorage.setItem(`trailoPS_active_squad_id_${currentUserId}`, group.id);
                  localStorage.setItem(`trailoPS_hasJoinedGroup_${currentUserId}`, 'true');
                }
                if (currentUserEmail) {
                  localStorage.setItem(`trailoPS_hasJoinedGroup_${currentUserEmail}`, 'true');
                }
              }}
            />
          )}

          {currentScreen === 'sos' && (
            <EmergencySOSScreen
              onNavigate={(screen) => setCurrentScreen(screen)}
              onShowToast={showToast}
              activeSquadId={activeSquad?.id}
              currentUserId={currentUserId}
              currentUserName={profileData.fullName}
              userRole={userRole}
            />
          )}

          {currentScreen === 'settings' && (
            <SettingsScreen
              onNavigate={(screen) => setCurrentScreen(screen)}
              onShowToast={showToast}
              profileData={profileData}
              onSignOut={handleSignOut}
              hasJoinedGroup={hasJoinedGroup}
              tripBudget={tripBudget}
              amountPaid={amountPaid}
              amountPending={amountPending}
              userRole={userRole}
              onUpdateRole={(role) => {
                setUserRole(role);
                localStorage.setItem('trailoPS_userRole', role);
              }}
              theme={theme}
              onUpdateTheme={(t) => setTheme(t)}
              onOpenSplitwise={() => setIsSplitwiseOpen(true)}
              subGroupName={subGroupName}
              subGroupColor={subGroupColor}
              activeSquad={activeSquad}
              currentUserId={currentUserId}
              onLeaveSquad={() => {
                handleSetJoinedGroup(false);
              }}
              onSquadDeleted={() => {
                handleSetJoinedGroup(false);
              }}
            />
          )}
        </div>
      </div>

      {/* Global Floating Bottom Navigation Dock */}
      <Navigation
        currentScreen={currentScreen}
        isProfileComplete={isProfileComplete}
        onSelectScreen={(screen) => setCurrentScreen(screen)}
        onOpenSOSModal={() => setIsSOSModalOpen(true)}
      />

      {/* Global Ask AI Expedition Assistant Floating Overlay */}
      {isProfileComplete && currentScreen !== 'signin' && currentScreen !== 'profile' && (
        <AskAIOverlay
          destinationName={activeSquad?.destination || tripDestination.destination}
          onShowToast={showToast}
        />
      )}

      {/* Global Toast Notification Container */}
      {toastMessage && (
        <div className="fixed top-12 left-1/2 -translate-x-1/2 z-50 max-w-xs w-full px-4 animate-in fade-in slide-in-from-top-4 duration-200 pointer-events-none">
          <div className="bg-slate-900/95 backdrop-blur-md text-white text-xs font-medium px-4 py-3 rounded-2xl shadow-xl border border-emerald-500/30 flex items-center gap-2.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span className="leading-snug">{toastMessage}</span>
          </div>
        </div>
      )}

      {/* Global Distress Alert Modal */}
      <DistressAlertModal
        isOpen={isSOSModalOpen}
        onClose={() => setIsSOSModalOpen(false)}
        coordinates="Location Unavailable"
      />

      {/* Faculty Drive Modal */}
      <FacultyDriveModal
        isOpen={isFacultyDriveOpen}
        onClose={() => setIsFacultyDriveOpen(false)}
        userRole={userRole}
        onShowToast={showToast}
      />

      {/* Splitwise Shared Ledger Modal */}
      <SplitwiseModal
        isOpen={isSplitwiseOpen}
        onClose={() => setIsSplitwiseOpen(false)}
        userRole={userRole}
        tripBudget={tripBudget}
        amountPaid={amountPaid}
        amountPending={amountPending}
        onShowToast={showToast}
        onSettlePayment={(settleAmt) => {
          const newPaid = amountPaid + settleAmt;
          setAmountPaid(newPaid);
          setAmountPending(Math.max(0, tripBudget - newPaid));
        }}
      />

      {/* Supabase In-App Backend Setup Modal */}
      <SupabaseSetupModal
        isOpen={isSetupModalOpen}
        onClose={() => setIsSetupModalOpen(false)}
        onSaved={() => {
          showToast('Supabase connection updated! Synchronizing data...');
          if (currentUserId && currentUserEmail) {
            syncUserSession(currentUserId, currentUserEmail);
          }
        }}
      />

      {/* WhatsApp / Deep Link Squad Invitation Join Confirmation Modal */}
      {joinCodeParam && (
        <JoinSquadDeepLinkModal
          joinCode={joinCodeParam}
          isOpen={isJoinDeepLinkOpen}
          onClose={() => {
            setIsJoinDeepLinkOpen(false);
            setJoinCodeParam(null);
            const url = new URL(window.location.href);
            url.searchParams.delete('join');
            window.history.replaceState({}, '', url.toString());
          }}
          onJoined={(squad) => {
            setActiveSquad(squad);
            setHasJoinedGroup(true);
            if (currentUserId) {
              localStorage.setItem(`trailoPS_hasJoinedGroup_${currentUserId}`, 'true');
            }
            if (currentUserEmail) {
              localStorage.setItem(`trailoPS_hasJoinedGroup_${currentUserEmail}`, 'true');
            }
            setTripDestination({
              name: squad.name,
              destination: squad.destination,
              coordinates: { lat: 27.3184, lng: 88.2412 },
              departureDate: '2026-10-24',
              returnDate: '2026-10-30',
            });
            setIsJoinDeepLinkOpen(false);
            setJoinCodeParam(null);
            const url = new URL(window.location.href);
            url.searchParams.delete('join');
            window.history.replaceState({}, '', url.toString());
            setCurrentScreen('squad');
            showToast(`Joined ${squad.name} successfully!`);
          }}
          currentUserId={currentUserId}
          currentUserName={profileData.fullName}
          currentUserEmail={currentUserEmail}
          currentUserAvatar={profileData.avatarUrl}
          onShowToast={showToast}
        />
      )}

      {/* Global Commander-Initiated Live Roll Call Alert Modal */}
      {activeRollCallSession && (
        <AttendanceAlertModal
          isOpen={isAttendanceModalOpen}
          onClose={() => setIsAttendanceModalOpen(false)}
          startedBy={activeRollCallSession.startedBy}
          startedAt={activeRollCallSession.startedAt}
          presentCount={activeRollCallSession.presentUserIds.length}
          pendingCount={Math.max(0, 1 - activeRollCallSession.presentUserIds.length)}
          isAlreadyPresent={activeRollCallSession.presentUserIds.includes(currentUserId || '1')}
          onMarkPresent={handleMarkPresentFromModal}
        />
      )}

      {/* Global Broadcast Announcement Alert Modal */}
      <BroadcastAlertModal
        isOpen={isBroadcastModalOpen}
        onClose={() => setIsBroadcastModalOpen(false)}
        broadcast={latestBroadcast}
      />

      {/* Global Group-Wide Continuous Emergency SOS Siren Alert Modal */}
      <EmergencySirenAlertModal
        isOpen={Boolean(activeSOSAlarm)}
        alarmData={activeSOSAlarm}
        onMuteAndClose={() => {
          stopEmergencySiren();
          setActiveSOSAlarm(null);
        }}
        onResolveAlarm={() => {
          stopEmergencySiren();
          if (activeSOSAlarm?.groupId) {
            clearSquadSOSAlarm(activeSOSAlarm.groupId);
          }
          setActiveSOSAlarm(null);
          showToast('Emergency distress alert resolved.');
        }}
        isSuperAdminOrAdmin={userRole === 'super_admin' || userRole === 'admin' || userRole === 'subgroup_admin'}
      />
    </div>
  );
}
