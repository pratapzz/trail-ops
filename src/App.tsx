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
import {
  getSupabase,
  isSupabaseConfigured,
  fetchProfile,
  upsertProfile,
  fetchUserSquad,
  SquadGroupRecord,
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

  // Group membership state - strictly FALSE for new users until they create or join
  const [hasJoinedGroup, setHasJoinedGroup] = useState<boolean>(() => {
    const activeUserId = localStorage.getItem('trailoPS_currentUserId');
    const activeEmail = localStorage.getItem('trailoPS_currentUserEmail');
    if (!activeUserId && !activeEmail) return false;
    const byId = activeUserId ? localStorage.getItem(`trailoPS_hasJoinedGroup_${activeUserId}`) : null;
    const byEmail = activeEmail ? localStorage.getItem(`trailoPS_hasJoinedGroup_${activeEmail}`) : null;
    return byId === 'true' || byEmail === 'true';
  });

  const [activeSquad, setActiveSquad] = useState<SquadGroupRecord | null>(null);

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

  // Group Hierarchy & Financials state
  const [userRole, setUserRole] = useState<UserRole>(() => {
    const saved = localStorage.getItem('trailoPS_userRole');
    return (saved as UserRole) || 'member';
  });

  // App Theme: 'dark' | 'light' | 'system'
  const [theme, setTheme] = useState<'light' | 'dark' | 'system'>(() => {
    return (localStorage.getItem('trailoPS_theme') as any) || 'light';
  });

  useEffect(() => {
    localStorage.setItem('trailoPS_userRole', userRole);
  }, [userRole]);

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

      localStorage.setItem(`trailoPS_profile_${userId}`, JSON.stringify(mappedProfile));
      localStorage.setItem(`trailoPS_profile_${emailKey}`, JSON.stringify(mappedProfile));
      localStorage.setItem(`trailoPS_isProfileComplete_${userId}`, 'true');
      localStorage.setItem(`trailoPS_isProfileComplete_${emailKey}`, 'true');

      // Check group membership in Supabase
      const userSquad = await fetchUserSquad(userId);
      if (userSquad) {
        setActiveSquad(userSquad);
        setHasJoinedGroup(true);
        localStorage.setItem(`trailoPS_hasJoinedGroup_${userId}`, 'true');
        localStorage.setItem(`trailoPS_hasJoinedGroup_${emailKey}`, 'true');
        setTripDestination({
          name: userSquad.name,
          destination: userSquad.destination,
          coordinates: { lat: 27.3184, lng: 88.2412 },
          departureDate: '2026-10-24',
          returnDate: '2026-10-30',
        });
      } else {
        // Keep local joined group state if already active, do not abruptly unset
        const wasJoinedLocally =
          localStorage.getItem(`trailoPS_hasJoinedGroup_${userId}`) === 'true' ||
          localStorage.getItem(`trailoPS_hasJoinedGroup_${emailKey}`) === 'true';
        if (!wasJoinedLocally) {
          setActiveSquad(null);
          setHasJoinedGroup(false);
        }
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
          const joined =
            localStorage.getItem(`trailoPS_hasJoinedGroup_${userId}`) === 'true' ||
            localStorage.getItem(`trailoPS_hasJoinedGroup_${emailKey}`) === 'true';
          setHasJoinedGroup(joined);
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

    // Persist to Supabase if configured
    if (isSupabaseConfigured() && currentUserId) {
      try {
        const combinedMedical = [
          data.medications ? `Medications: ${data.medications}` : '',
          data.allergies && data.allergies.length > 0 ? `Allergies: ${data.allergies.map((a) => a.name).join(', ')}` : '',
          data.healthNotes ? `Notes: ${data.healthNotes}` : '',
        ].filter(Boolean).join(' | ');

        await upsertProfile({
          id: currentUserId,
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
        console.warn('Failed to upsert profile to Supabase:', err);
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
    if (currentUserId) {
      localStorage.setItem(`trailoPS_hasJoinedGroup_${currentUserId}`, String(joined));
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
    if (currentUserId) {
      const sq = await fetchUserSquad(currentUserId);
      setActiveSquad(sq);
      if (sq) {
        setHasJoinedGroup(true);
        setTripDestination({
          name: sq.name,
          destination: sq.destination,
          coordinates: { lat: 27.3184, lng: 88.2412 },
          departureDate: '2026-10-24',
          returnDate: '2026-10-30',
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
            />
          )}

          {currentScreen === 'sos' && (
            <EmergencySOSScreen
              onNavigate={(screen) => setCurrentScreen(screen)}
              onShowToast={showToast}
              activeSquadId={activeSquad?.id}
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
              onUpdateRole={(role) => setUserRole(role)}
              theme={theme}
              onUpdateTheme={(t) => setTheme(t)}
              onOpenSplitwise={() => setIsSplitwiseOpen(true)}
              subGroupName={subGroupName}
              subGroupColor={subGroupColor}
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
        coordinates="27.3184° N, 88.2412° E"
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
          onShowToast={showToast}
        />
      )}
    </div>
  );
}
