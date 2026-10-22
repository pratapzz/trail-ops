import React from 'react';
import { Compass, Newspaper, AlertOctagon, Users, Settings, Flame, Megaphone } from 'lucide-react';
import { ScreenType } from '../types';

interface NavigationProps {
  currentScreen: ScreenType;
  isProfileComplete: boolean;
  onSelectScreen: (screen: ScreenType) => void;
  onOpenSOSModal: () => void;
}

export const Navigation: React.FC<NavigationProps> = ({
  currentScreen,
  isProfileComplete,
  onSelectScreen,
  onOpenSOSModal,
}) => {
  // Do NOT show bottom dock until profile creation is complete, or if on onboarding / login / profile setup
  if (!isProfileComplete || currentScreen === 'onboarding' || currentScreen === 'signin' || currentScreen === 'profile') {
    return null;
  }

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 max-w-md mx-auto px-4 pb-3.5 pointer-events-none">
      {/* iPhone Liquid Glass / Frosted Glossy Glass Theme Bar (overflow visible so SOS button pops up without clipping) */}
      <div className="w-full flex items-center justify-around glass-dock-ios rounded-[28px] px-2 py-1.5 pointer-events-auto transition-all duration-300 relative">
        {/* Top Gloss Specular Sheen Stripe */}
        <div className="absolute top-0 left-3 right-3 h-[1px] bg-gradient-to-r from-transparent via-white/90 to-transparent pointer-events-none rounded-t-[28px]" />

        {/* Tab 1: Home (Expedition Gateway) */}
        <button
          type="button"
          aria-label="Home"
          onClick={() => onSelectScreen('gateway')}
          className={`relative px-3 py-1.5 rounded-2xl transition-all duration-200 active:scale-90 flex flex-col items-center cursor-pointer ${
            currentScreen === 'gateway'
              ? 'bg-emerald-600/15 text-[#0f5238] font-bold shadow-xs'
              : 'text-slate-600 hover:text-emerald-800 hover:bg-white/40'
          }`}
          title="Home Base"
        >
          <Compass className={`w-5 h-5 transition-transform ${currentScreen === 'gateway' ? 'scale-110 text-[#0f5238]' : ''}`} />
          <span className="text-[9px] font-bold tracking-tight mt-0.5">Home</span>
          {currentScreen === 'gateway' && (
            <span className="absolute bottom-0.5 w-1.5 h-1.5 rounded-full bg-[#0f5238] shadow-xs" />
          )}
        </button>

        {/* Tab 2: Announcements / Notices */}
        <button
          type="button"
          aria-label="Announcements"
          onClick={() => onSelectScreen('feed')}
          className={`relative px-3 py-1.5 rounded-2xl transition-all duration-200 active:scale-90 flex flex-col items-center cursor-pointer ${
            currentScreen === 'feed'
              ? 'bg-amber-500/20 text-amber-950 font-bold shadow-xs'
              : 'text-slate-600 hover:text-amber-800 hover:bg-white/40'
          }`}
          title="Official Announcements"
        >
          <Megaphone className={`w-5 h-5 transition-transform ${currentScreen === 'feed' ? 'scale-110 text-amber-700' : ''}`} />
          <span className="text-[9px] font-bold tracking-tight mt-0.5">Notices</span>
          {currentScreen === 'feed' && (
            <span className="absolute bottom-0.5 w-1.5 h-1.5 rounded-full bg-amber-600 shadow-xs" />
          )}
        </button>

        {/* Tab 3 (Center): Tactically Refined Emergency SOS Hero Button */}
        <div className="relative -top-5 flex flex-col items-center">
          <button
            type="button"
            aria-label="Emergency SOS Hub"
            onClick={() => onSelectScreen('sos')}
            className="sos-pulse w-14 h-14 rounded-full bg-gradient-to-tr from-rose-700 via-rose-600 to-red-500 text-white flex items-center justify-center custom-sos-glow active:scale-95 transition-all duration-150 ring-[3.5px] ring-white cursor-pointer shadow-xl relative overflow-hidden group"
            title="Emergency SOS Hub"
          >
            {/* Inner Glossy Sheen */}
            <div className="absolute inset-0 bg-gradient-to-b from-white/40 via-white/10 to-transparent pointer-events-none rounded-full" />
            <div className="flex flex-col items-center justify-center relative z-10">
              <AlertOctagon className="w-6 h-6 fill-white text-rose-700 drop-shadow-sm group-hover:scale-110 transition-transform" />
            </div>
          </button>
          <span className="text-[10px] font-black text-rose-700 mt-1 tracking-widest uppercase drop-shadow-2xs">
            SOS
          </span>
        </div>

        {/* Tab 4: Squad Roll Call / Operations */}
        <button
          type="button"
          aria-label="Squad Presence"
          onClick={() => onSelectScreen('squad')}
          className={`relative px-3 py-1.5 rounded-2xl transition-all duration-200 active:scale-90 flex flex-col items-center cursor-pointer ${
            currentScreen === 'squad'
              ? 'bg-emerald-600/15 text-[#0f5238] font-bold shadow-xs'
              : 'text-slate-600 hover:text-emerald-800 hover:bg-white/40'
          }`}
          title="Squad & Roll Call"
        >
          <Users className={`w-5 h-5 transition-transform ${currentScreen === 'squad' ? 'scale-110 text-[#0f5238]' : ''}`} />
          <span className="text-[9px] font-bold tracking-tight mt-0.5">Squad</span>
          {currentScreen === 'squad' && (
            <span className="absolute bottom-0.5 w-1.5 h-1.5 rounded-full bg-[#0f5238] shadow-xs" />
          )}
        </button>

        {/* Tab 5: Settings */}
        <button
          type="button"
          aria-label="Settings and Profile"
          onClick={() => onSelectScreen('settings')}
          className={`relative px-3 py-1.5 rounded-2xl transition-all duration-200 active:scale-90 flex flex-col items-center cursor-pointer ${
            currentScreen === 'settings'
              ? 'bg-emerald-600/15 text-[#0f5238] font-bold shadow-xs'
              : 'text-slate-600 hover:text-emerald-800 hover:bg-white/40'
          }`}
          title="Settings & Metrics"
        >
          <Settings className={`w-5 h-5 transition-transform ${currentScreen === 'settings' ? 'scale-110 text-[#0f5238]' : ''}`} />
          <span className="text-[9px] font-bold tracking-tight mt-0.5">Settings</span>
          {currentScreen === 'settings' && (
            <span className="absolute bottom-0.5 w-1.5 h-1.5 rounded-full bg-[#0f5238] shadow-xs" />
          )}
        </button>
      </div>
    </nav>
  );
};
