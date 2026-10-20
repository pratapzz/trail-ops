import React, { useEffect } from 'react';
import { AlertOctagon, PhoneCall, VolumeX, MapPin, Battery, User, ShieldAlert, CheckCircle2 } from 'lucide-react';
import { SquadSOSAlarmData } from '../../lib/supabase';
import { stopEmergencySiren } from '../../lib/emergencyAudio';

interface EmergencySirenAlertModalProps {
  isOpen: boolean;
  alarmData: SquadSOSAlarmData | null;
  onMuteAndClose: () => void;
  onResolveAlarm?: () => void;
  isSuperAdminOrAdmin?: boolean;
}

export const EmergencySirenAlertModal: React.FC<EmergencySirenAlertModalProps> = ({
  isOpen,
  alarmData,
  onMuteAndClose,
  onResolveAlarm,
  isSuperAdminOrAdmin = false,
}) => {
  useEffect(() => {
    // When modal unmounts or closes, ensure sound stops
    return () => {
      stopEmergencySiren();
    };
  }, []);

  if (!isOpen || !alarmData) return null;

  const handleCallMember = () => {
    if (alarmData.phone) {
      window.location.href = `tel:${alarmData.phone.replace(/\s+/g, '')}`;
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-in fade-in duration-200">
      <div className="w-full max-w-sm bg-white dark:bg-slate-900 rounded-3xl p-6 border-2 border-rose-500 shadow-2xl shadow-rose-900/50 space-y-4 animate-in zoom-in-95 duration-150">
        
        {/* Pulsing Emergency Header */}
        <div className="flex flex-col items-center text-center space-y-2">
          <div className="relative">
            <div className="w-16 h-16 rounded-full bg-rose-500/20 flex items-center justify-center animate-ping absolute inset-0" />
            <div className="w-16 h-16 rounded-full bg-rose-600 text-white flex items-center justify-center shadow-lg shadow-rose-600/40 relative z-10">
              <AlertOctagon className="w-9 h-9 animate-pulse" />
            </div>
          </div>

          <div className="space-y-0.5">
            <span className="text-[11px] font-extrabold uppercase tracking-widest text-rose-600 dark:text-rose-400">
              Expedition Distress Signal
            </span>
            <h2 className="text-xl font-black text-slate-950 dark:text-white tracking-tight">
              SQUAD SOS ACTIVATED
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              A squad member has triggered the continuous emergency beacon.
            </p>
          </div>
        </div>

        {/* Distressed Member Details Card */}
        <div className="p-3.5 bg-rose-50 dark:bg-rose-950/40 rounded-2xl border border-rose-200 dark:border-rose-900/60 space-y-2 text-xs">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-rose-600 text-white flex items-center justify-center font-bold text-xs">
                {alarmData.distressedUserName?.charAt(0) || 'M'}
              </div>
              <div>
                <span className="font-extrabold text-slate-900 dark:text-white block text-sm">
                  {alarmData.distressedUserName}
                </span>
                <span className="text-[10px] text-rose-700 dark:text-rose-300 font-semibold uppercase">
                  {alarmData.distressedUserRole || 'Squad Member'}
                </span>
              </div>
            </div>
            {alarmData.batteryLevel !== undefined && (
              <span className="inline-flex items-center gap-1 text-[11px] font-bold text-slate-700 dark:text-slate-300">
                <Battery className="w-3.5 h-3.5 text-rose-600" />
                {alarmData.batteryLevel}%
              </span>
            )}
          </div>

          {alarmData.coordinates && (
            <div className="pt-1.5 border-t border-rose-200/60 dark:border-rose-900/40 flex items-center gap-1.5 text-[11px] text-slate-600 dark:text-slate-400">
              <MapPin className="w-3.5 h-3.5 text-rose-600 shrink-0" />
              <span>
                Lat: {alarmData.coordinates.lat.toFixed(4)}, Lng: {alarmData.coordinates.lng.toFixed(4)}
              </span>
            </div>
          )}

          <div className="text-[10px] text-slate-500 dark:text-slate-400">
            Signal broadcasted at {new Date(alarmData.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="space-y-2 pt-1">
          {alarmData.phone && (
            <button
              type="button"
              onClick={handleCallMember}
              className="w-full py-3 px-4 rounded-2xl bg-emerald-700 hover:bg-emerald-600 active:scale-[0.98] text-white text-xs font-bold transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer"
            >
              <PhoneCall className="w-4 h-4" />
              <span>Call {alarmData.distressedUserName} Directly ({alarmData.phone})</span>
            </button>
          )}

          <button
            type="button"
            onClick={onMuteAndClose}
            className="w-full py-3 px-4 rounded-2xl bg-slate-900 dark:bg-white text-white dark:text-slate-950 hover:bg-slate-800 dark:hover:bg-slate-100 active:scale-[0.98] text-xs font-bold transition-all shadow-sm flex items-center justify-center gap-2 cursor-pointer"
          >
            <VolumeX className="w-4 h-4 text-rose-500" />
            <span>Mute Siren on My Device &amp; Acknowledge</span>
          </button>

          {isSuperAdminOrAdmin && onResolveAlarm && (
            <button
              type="button"
              onClick={() => {
                onResolveAlarm();
                onMuteAndClose();
              }}
              className="w-full py-2.5 px-4 rounded-2xl bg-rose-100 dark:bg-rose-950/60 hover:bg-rose-200 text-rose-800 dark:text-rose-200 text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
              <span>Commander: Mark SOS as Resolved for Squad</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
