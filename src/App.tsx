import React, { useState, useEffect } from 'react';
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
import { CheckCircle2 } from 'lucide-react';

export default function App() {
  const [currentUserEmail, setCurrentUserEmail] = useState<string>(() => {
    return localStorage.getItem('trailoPS_currentUserEmail') || '';
  });

  const [isProfileComplete, setIsProfileComplete] = useState<boolean>(() => {
    const activeEmail = localStorage.getItem('trailoPS_currentUserEmail');
    if (!activeEmail) return false;
    return localStorage.getItem(`trailoPS_isProfileComplete_${activeEmail}`) === 'true';
  });

  const [currentScreen, setCurrentScreen] = useState<ScreenType>(() => {
    const activeEmail = localStorage.getItem('trailoPS_currentUserEmail');
    if (!activeEmail) return 'signin';
    const isDone = localStorage.getItem(`trailoPS_isProfileComplete_${activeEmail}`) === 'true';
    return isDone ? 'gateway' : 'signin';
  });

  // Group membership state - stored per-account, strictly FALSE for new users
  const [hasJoinedGroup, setHasJoinedGroup] = useState<boolean>(() => {
    const activeEmail = localStorage.getItem('trailoPS_currentUserEmail');
    if (!activeEmail) return false;
    return localStorage.getItem(`trailoPS_hasJoinedGroup_${activeEmail}`) === 'true';
  });

  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [isSOSModalOpen, setIsSOSModalOpen] = useState(false);
  const [isFacultyDriveOpen, setIsFacultyDriveOpen] = useState(false);
  const [isSplitwiseOpen, setIsSplitwiseOpen] = useState(false);

  // Group Hierarchy & Financials state (persisted in localStorage)
  const [userRole, setUserRole] = useState<UserRole>(() => {
    const saved = localStorage.getItem('trailoPS_userRole');
    return (saved as UserRole) || 'super_admin';
  });

  // App Theme: 'dark' | 'light' | 'system'
  const [theme, setTheme] = useState<'light' | 'dark' | 'system'>(() => {
    return (localStorage.getItem('trailoPS_theme') as any) || 'light';
  });

  useEffect(() => {
    localStorage.setItem('trailoPS_userRole', userRole);
  }, [userRole]);

  useEffect(() => {
    localStorage.setItem('trailoPS_theme', theme);
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else if (theme === 'light') {
      document.documentElement.classList.remove('dark');
    } else {
      if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
    }
  }, [theme]);

  const [tripBudget, setTripBudget] = useState<number>(() => {
    const saved = localStorage.getItem('trailoPS_tripBudget');
    return saved ? Number(saved) : 6000;
  });
  const [amountPaid, setAmountPaid] = useState<number>(() => {
    const saved = localStorage.getItem('trailoPS_amountPaid');
    return saved ? Number(saved) : 4200;
  });
  const [amountPending, setAmountPending] = useState<number>(() => {
    const saved = localStorage.getItem('trailoPS_amountPending');
    return saved ? Number(saved) : 1800;
  });

  useEffect(() => {
    localStorage.setItem('trailoPS_tripBudget', String(tripBudget));
    localStorage.setItem('trailoPS_amountPaid', String(amountPaid));
    localStorage.setItem('trailoPS_amountPending', String(amountPending));
  }, [tripBudget, amountPaid, amountPending]);

  const [subGroupName, setSubGroupName] = useState<string>('Scout Team Alpha');
  const [subGroupColor, setSubGroupColor] = useState<string>('#ef4444');

  // Active Trip & Destination Coordinates State (persisted from group creation)
  const [tripDestination, setTripDestination] = useState(() => {
    const saved = localStorage.getItem('trailoPS_activeTrip');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {}
    }
    return {
      name: 'Denali Base Alpha Expedition',
      destination: 'Pelling High Ridge (2,150m ASL)',
      coordinates: { lat: 27.3184, lng: 88.2412 },
      departureDate: '2026-10-24',
      returnDate: '2026-10-30',
    };
  });

  useEffect(() => {
    localStorage.setItem('trailoPS_activeTrip', JSON.stringify(tripDestination));
  }, [tripDestination]);

  // User Profile State with per-account isolation
  const [profileData, setProfileData] = useState<ProfileFormData>(() => {
    const activeEmail = localStorage.getItem('trailoPS_currentUserEmail');
    if (activeEmail) {
      const saved = localStorage.getItem(`trailoPS_profile_${activeEmail}`);
      if (saved) {
        try {
          return JSON.parse(saved);
        } catch {}
      }
    }
    return {
      fullName: 'Pratap Paul',
      guardianName: 'Mark Paul',
      countryCode: '🇮🇳 +91',
      phoneNumber: '98765 43210',
      emergencyNumber: '+91 98765 00112',
      bloodGroup: 'O+',
      allergies: [
        { id: '1', name: 'Penicillin', severity: 'high', color: 'rose' },
        { id: '2', name: 'Peanuts', severity: 'medium', color: 'amber' },
      ],
      medications: 'Asthma Inhaler (Albuterol 90mcg)',
      medsPacked: true,
      heightCm: 178,
      weightKg: 72,
      experienceLevel: 'Advanced',
      healthNotes: 'Occasional mild headache above 3,500m, responds quickly to hydration.',
      avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80',
    };
  });

  const showToast = (message: string) => {
    setToastMessage(message);
    setTimeout(() => {
      setToastMessage(null);
    }, 3200);
  };

  const handleUserSignIn = (user: { name: string; email: string; avatar?: string; phone?: string }) => {
    const emailKey = (user.email || 'user@trailoPS.app').trim().toLowerCase();
    setCurrentUserEmail(emailKey);
    localStorage.setItem('trailoPS_currentUserEmail', emailKey);

    const savedProfileStr = localStorage.getItem(`trailoPS_profile_${emailKey}`);
    const isDone = localStorage.getItem(`trailoPS_isProfileComplete_${emailKey}`) === 'true';

    if (savedProfileStr && isDone) {
      // Existing user who already completed profile: load their specific profile and group state
      try {
        const parsed = JSON.parse(savedProfileStr);
        setProfileData(parsed);
      } catch {}
      const userJoined = localStorage.getItem(`trailoPS_hasJoinedGroup_${emailKey}`) === 'true';
      setHasJoinedGroup(userJoined);
      setIsProfileComplete(true);
      setCurrentScreen('gateway');
      showToast(`Welcome back, ${user.name}!`);
    } else {
      // NEW GMAIL / USER: MUST DIRECT TO PROFILE CREATION PAGE! DO NOT SKIP!
      const freshDraft: ProfileFormData = {
        fullName: user.name || emailKey.split('@')[0],
        guardianName: '',
        dateOfBirth: '',
        age: undefined,
        gender: undefined,
        countryCode: '🇮🇳 +91',
        phoneNumber: user.phone || '',
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
          user.avatar ||
          'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=200&q=80',
      };
      setProfileData(freshDraft);
      setIsProfileComplete(false);
      setHasJoinedGroup(false);
      setCurrentScreen('profile'); // Directs to Profile Creation
      showToast(`Signed in as ${emailKey}! Please complete your expedition profile.`);
    }
  };

  const handleCompleteProfile = (data: ProfileFormData) => {
    setProfileData(data);
    setIsProfileComplete(true);
    const emailKey = currentUserEmail || 'pratappaul450@gmail.com';
    localStorage.setItem(`trailoPS_profile_${emailKey}`, JSON.stringify(data));
    localStorage.setItem(`trailoPS_isProfileComplete_${emailKey}`, 'true');
    setCurrentScreen('gateway');
    showToast('Expedition profile registered and saved!');
  };

  const handleSetJoinedGroup = (joined: boolean) => {
    setHasJoinedGroup(joined);
    if (currentUserEmail) {
      localStorage.setItem(`trailoPS_hasJoinedGroup_${currentUserEmail}`, String(joined));
    }
  };

  const handleSignOut = () => {
    localStorage.removeItem('trailoPS_currentUserEmail');
    setCurrentUserEmail('');
    setIsProfileComplete(false);
    setHasJoinedGroup(false);
    setCurrentScreen('signin');
    showToast('Signed out of TrailoPS session.');
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
              destinationName={tripDestination.destination}
              destinationCoordinates={tripDestination.coordinates}
              departureDate={tripDestination.departureDate}
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
                localStorage.setItem('trailoPS_activeTrip', JSON.stringify(updatedTrip));
                localStorage.setItem('trailoPS_hasJoinedGroup', 'true');
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
            />
          )}

          {currentScreen === 'sos' && (
            <EmergencySOSScreen
              onNavigate={(screen) => setCurrentScreen(screen)}
              onShowToast={showToast}
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

        {/* Global Floating Bottom Navigation Dock (iOS Frosted Glass Theme) */}
        <Navigation
          currentScreen={currentScreen}
          isProfileComplete={isProfileComplete}
          onSelectScreen={(screen) => setCurrentScreen(screen)}
          onOpenSOSModal={() => setIsSOSModalOpen(true)}
        />

        {/* Global Ask AI Expedition Assistant Floating Overlay (Movable & Clutter-Free) */}
        {isProfileComplete && currentScreen !== 'signin' && currentScreen !== 'profile' && (
          <AskAIOverlay
            destinationName={tripDestination.destination}
            onShowToast={showToast}
          />
        )}

      {/* Toast Notification Container */}
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

      {/* Faculty Drive Modal (Tickets, Permits, Bills, SOPs) */}
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
    </div>
  );
}
