import React, { useState } from 'react';
import { MapPin, WifiOff, BellRing, AlertOctagon, CheckCircle2, ArrowRight } from 'lucide-react';

interface PermissionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

export const PermissionModal: React.FC<PermissionModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
}) => {
  const [ridgePrecision, setRidgePrecision] = useState(true);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end bg-slate-950/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="w-full max-w-md mx-auto bg-white rounded-t-[32px] border-t border-emerald-100 shadow-2xl p-5 space-y-4 animate-in slide-in-from-bottom duration-300">
        {/* Drag Handle Indicator */}
        <div className="w-12 h-1.5 rounded-full bg-slate-200 mx-auto mb-1" />

        {/* Header: Warm friendly icon & Clear Message */}
        <div className="flex items-start gap-3.5">
          <div className="relative w-12 h-12 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-500 text-white flex items-center justify-center shrink-0 shadow-lg shadow-emerald-600/30">
            <div className="absolute inset-0 rounded-2xl bg-emerald-400 animate-pulse-halo -z-10" />
            <MapPin className="w-6 h-6" />
          </div>
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-slate-900">Live Team Location</h2>
              <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 font-bold text-[10px] tracking-wide uppercase">
                Required
              </span>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              Your trip leaders and trail safety admins need your real-time location so everyone stays connected and safe together.
            </p>
          </div>
        </div>

        {/* Friendly Clarity Safety Bento */}
        <div className="space-y-2.5 bg-gradient-to-b from-[#f4faf7] to-[#eaf5f0] p-3.5 rounded-2xl border border-emerald-600/15">
          {/* Item 1: Offline Ping */}
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-white text-emerald-700 flex items-center justify-center shrink-0 shadow-xs">
              <WifiOff className="w-4 h-4" />
            </div>
            <div className="flex-1">
              <p className="text-xs font-bold text-slate-900">Works Without Signal</p>
              <p className="text-[11px] text-slate-600">Saves points offline and syncs automatically with nearby teammates.</p>
            </div>
          </div>

          {/* Item 2: Off-trail check */}
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-white text-teal-700 flex items-center justify-center shrink-0 shadow-xs">
              <BellRing className="w-4 h-4" />
            </div>
            <div className="flex-1">
              <p className="text-xs font-bold text-slate-900">Trail Separation Notice</p>
              <p className="text-[11px] text-slate-600">Quickly notifies your guide if you take an unexpected detour.</p>
            </div>
          </div>

          {/* Item 3: Emergency Beacon */}
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-white text-rose-600 flex items-center justify-center shrink-0 shadow-xs">
              <AlertOctagon className="w-4 h-4" />
            </div>
            <div className="flex-1">
              <p className="text-xs font-bold text-slate-900">Emergency Rescue Relay</p>
              <p className="text-[11px] text-slate-600">Instantly broadcasts your coordinates if SOS is triggered.</p>
            </div>
          </div>
        </div>

        {/* Precision Mode Toggle */}
        <div
          onClick={() => setRidgePrecision(!ridgePrecision)}
          className="bg-slate-50 px-3.5 py-2.5 rounded-xl border border-slate-200/70 flex items-center justify-between cursor-pointer hover:bg-slate-100 transition-colors"
        >
          <div className="space-y-0.5 pr-3">
            <span className="text-xs font-bold text-slate-900 block">High-Accuracy Ridge Precision</span>
            <span className="text-[11px] text-slate-500 block">Recommended for alpine passes and dense forest trails.</span>
          </div>
          <button
            type="button"
            className={`w-11 h-6 rounded-full transition-colors relative flex items-center px-0.5 ${
              ridgePrecision ? 'bg-emerald-600' : 'bg-slate-300'
            }`}
          >
            <span
              className={`w-5 h-5 rounded-full bg-white shadow-md transform transition-transform ${
                ridgePrecision ? 'translate-x-5' : 'translate-x-0'
              }`}
            />
          </button>
        </div>

        {/* Action Confirmation Controls */}
        <div className="space-y-2 pt-1">
          <button
            type="button"
            onClick={onConfirm}
            className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-emerald-600 via-emerald-700 to-teal-800 text-white font-bold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-lg shadow-emerald-700/25 hover:opacity-95 active:scale-[0.98] transition-all cursor-pointer"
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>Agree &amp; Join Expedition</span>
            <ArrowRight className="w-4 h-4 ml-0.5" />
          </button>
          <button
            type="button"
            onClick={onClose}
            className="w-full py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs flex items-center justify-center transition-colors active:scale-[0.98]"
          >
            Not Now, Return Home
          </button>
        </div>

        {/* Trust & Privacy Footnote */}
        <p className="text-center text-[10px] text-slate-500 font-medium">
          Encrypted telemetry strictly scoped to this expedition duration.
        </p>
      </div>
    </div>
  );
};
