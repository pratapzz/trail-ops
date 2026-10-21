import React from 'react';
import { Radio, CheckCircle2, XCircle, X } from 'lucide-react';

interface AttendanceAlertModalProps {
  isOpen: boolean;
  onClose: () => void;
  startedBy: string;
  startedAt: string;
  presentCount: number;
  deniedCount?: number;
  pendingCount: number;
  isAlreadyPresent: boolean;
  isAlreadyDenied?: boolean;
  onMarkPresent: () => void;
  onDenyAttendance?: () => void;
}

export const AttendanceAlertModal: React.FC<AttendanceAlertModalProps> = ({
  isOpen,
  onClose,
  startedBy,
  startedAt,
  presentCount,
  deniedCount = 0,
  pendingCount,
  isAlreadyPresent,
  isAlreadyDenied = false,
  onMarkPresent,
  onDenyAttendance,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-md animate-in fade-in duration-200">
      <div className="w-full max-w-sm bg-white text-slate-900 rounded-3xl p-6 border-2 border-emerald-500 shadow-2xl flex flex-col items-center text-center relative overflow-hidden">
        {/* Glow ambient background */}
        <div className="absolute -top-10 -right-10 w-32 h-32 bg-emerald-400/20 rounded-full blur-2xl pointer-events-none" />
        <div className="absolute -bottom-10 -left-10 w-32 h-32 bg-teal-400/20 rounded-full blur-2xl pointer-events-none" />

        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 text-slate-400 hover:text-slate-700 rounded-xl hover:bg-slate-100 transition-colors cursor-pointer"
          title="Minimize"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Pulsing Beacon Icon */}
        <div className="relative mb-3 mt-1">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-500 text-white flex items-center justify-center shadow-lg shadow-emerald-600/30">
            <Radio className="w-8 h-8 animate-pulse" />
          </div>
          <span className="absolute -top-1 -right-1 flex h-4 w-4">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-4 w-4 bg-emerald-600 border-2 border-white" />
          </span>
        </div>

        {/* Header Tag */}
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-100 text-[#0f5238] text-[11px] font-extrabold uppercase tracking-wide mb-2">
          <span>📢 Live Roll Call In Progress</span>
        </div>

        {/* Title & Body */}
        <h3 className="text-xl font-black tracking-tight text-slate-900 mb-1">
          Confirm Your Attendance
        </h3>
        <p className="text-xs text-slate-600 leading-relaxed mb-4 max-w-xs">
          Squad Commander <strong className="text-slate-900 font-bold">{startedBy || 'Super Admin'}</strong> has started a live attendance check-in at <strong className="text-slate-900 font-mono">{startedAt || 'just now'}</strong>. Select <strong className="text-emerald-700">Present</strong> or <strong className="text-rose-700">Deny</strong> below.
        </p>

        {/* Real-time Tally Card */}
        <div className="w-full grid grid-cols-3 gap-2 bg-slate-50 border border-slate-200/80 rounded-2xl p-2.5 mb-4">
          <div className="text-center p-2 rounded-xl bg-emerald-50 border border-emerald-200">
            <span className="text-[10px] text-emerald-800 font-bold uppercase tracking-wider block">Present</span>
            <span className="text-xl font-black text-emerald-700 leading-tight">{presentCount}</span>
            <span className="text-[9px] text-emerald-600 font-semibold block mt-0.5">Checked In</span>
          </div>

          <div className="text-center p-2 rounded-xl bg-rose-50 border border-rose-200">
            <span className="text-[10px] text-rose-800 font-bold uppercase tracking-wider block">Denied</span>
            <span className="text-xl font-black text-rose-700 leading-tight">{deniedCount}</span>
            <span className="text-[9px] text-rose-600 font-semibold block mt-0.5">Not Present</span>
          </div>

          <div className="text-center p-2 rounded-xl bg-amber-50 border border-amber-200">
            <span className="text-[10px] text-amber-800 font-bold uppercase tracking-wider block">Pending</span>
            <span className="text-xl font-black text-amber-700 leading-tight">{pendingCount}</span>
            <span className="text-[9px] text-amber-600 font-semibold block mt-0.5">Awaiting</span>
          </div>
        </div>

        {/* Attendance Action Buttons: Present & Deny */}
        {isAlreadyPresent ? (
          <div className="w-full space-y-2">
            <div className="w-full py-3.5 px-4 rounded-2xl bg-emerald-100 border border-emerald-300 text-[#0f5238] font-bold text-sm flex items-center justify-center gap-2 shadow-xs">
              <CheckCircle2 className="w-5 h-5 text-emerald-600" />
              <span>✓ You Are Marked Present!</span>
            </div>
            {onDenyAttendance && (
              <button
                type="button"
                onClick={onDenyAttendance}
                className="w-full py-2 px-3 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-xs font-bold transition-colors cursor-pointer"
              >
                Change to Deny
              </button>
            )}
          </div>
        ) : isAlreadyDenied ? (
          <div className="w-full space-y-2">
            <div className="w-full py-3.5 px-4 rounded-2xl bg-rose-100 border border-rose-300 text-rose-900 font-bold text-sm flex items-center justify-center gap-2 shadow-xs">
              <XCircle className="w-5 h-5 text-rose-600" />
              <span>✕ You Denied Attendance</span>
            </div>
            <button
              type="button"
              onClick={onMarkPresent}
              className="w-full py-2 px-3 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 text-xs font-bold transition-colors cursor-pointer"
            >
              Change to Present
            </button>
          </div>
        ) : (
          <div className="w-full grid grid-cols-2 gap-2.5">
            <button
              type="button"
              onClick={onMarkPresent}
              className="py-3.5 px-4 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-500 hover:to-teal-600 text-white font-black text-sm flex items-center justify-center gap-1.5 shadow-lg shadow-emerald-700/25 active:scale-95 transition-all cursor-pointer"
            >
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>Present</span>
            </button>

            <button
              type="button"
              onClick={() => {
                if (onDenyAttendance) {
                  onDenyAttendance();
                } else {
                  onClose();
                }
              }}
              className="py-3.5 px-4 rounded-2xl bg-rose-600 hover:bg-rose-700 text-white font-black text-sm flex items-center justify-center gap-1.5 shadow-lg shadow-rose-700/20 active:scale-95 transition-all cursor-pointer"
            >
              <XCircle className="w-4 h-4 shrink-0" />
              <span>Deny</span>
            </button>
          </div>
        )}

        <button
          type="button"
          onClick={onClose}
          className="mt-3 text-xs text-slate-500 hover:text-slate-800 font-semibold transition-colors cursor-pointer"
        >
          Dismiss popup
        </button>
      </div>
    </div>
  );
};

