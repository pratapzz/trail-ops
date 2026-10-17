import React from 'react';
import { Compass, ArrowLeft } from 'lucide-react';
import { ScreenType } from '../types';

interface HeaderProps {
  currentScreen: ScreenType;
  onBack?: () => void;
  onSelectScreen?: (screen: ScreenType) => void;
  statusText?: string;
  avatarUrl?: string;
}

export const Header: React.FC<HeaderProps> = ({
  currentScreen,
  onBack,
  onSelectScreen,
  statusText = 'Online',
  avatarUrl = 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80',
}) => {
  return (
    <header className="bg-white/95 backdrop-blur-md sticky top-0 z-40 w-full border-b border-emerald-950/10 shadow-xs">
      <div className="flex items-center justify-between px-4 w-full h-16 max-w-md mx-auto">
        {/* Left: Back button or Compass Brand */}
        <div className="flex items-center gap-2">
          {onBack && (
            <button
              type="button"
              onClick={onBack}
              aria-label="Go Back"
              className="w-9 h-9 rounded-full flex items-center justify-center bg-slate-100 text-slate-700 hover:bg-slate-200 active:scale-95 transition-all"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
          )}

          <div
            onClick={() => onSelectScreen && onSelectScreen('gateway')}
            className="flex items-center gap-2 cursor-pointer group"
          >
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-emerald-800 via-emerald-700 to-emerald-500 text-white flex items-center justify-center shadow-md shadow-emerald-900/20 group-hover:scale-105 transition-transform">
              <Compass className="w-4 h-4" />
            </div>
            <div className="flex items-center gap-1.5">
              <span className="font-extrabold text-lg tracking-tight text-emerald-950">
                Trailo<span className="text-emerald-700">PS</span>
              </span>
              <span className="px-1.5 py-0.5 rounded-md bg-emerald-100 text-emerald-900 text-[10px] font-extrabold tracking-wider border border-emerald-300">
                V1
              </span>
            </div>
          </div>
        </div>

        {/* Right: Quick Status & User Avatar */}
        <div className="flex items-center gap-2.5">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 text-[11px] font-bold shadow-xs">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>{statusText}</span>
          </div>

          <div
            onClick={() => onSelectScreen && onSelectScreen('profile')}
            className="relative cursor-pointer"
            title="View Profile"
          >
            <div className="w-9 h-9 rounded-full overflow-hidden ring-2 ring-emerald-500/30 bg-slate-100 flex items-center justify-center shadow-xs hover:ring-emerald-500 transition-all">
              <img
                src={avatarUrl}
                alt="Expedition Member"
                className="w-full h-full object-cover"
              />
            </div>
            <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-emerald-500 rounded-full ring-2 ring-white" />
          </div>
        </div>
      </div>
    </header>
  );
};
