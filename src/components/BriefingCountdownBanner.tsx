import React, { useState, useEffect } from 'react';
import { Clock, Settings2, Trash2 } from 'lucide-react';
import { SquadBriefingRecord } from '../lib/supabase';

interface BriefingCountdownBannerProps {
  briefing: SquadBriefingRecord | null;
  isSuperAdminOrAdmin?: boolean;
  onOpenManageModal?: () => void;
  onCancelBriefing?: () => void;
  className?: string;
  variant?: 'banner' | 'card';
}

function formatRemainingTime(seconds: number): string {
  if (seconds <= 0) return '00:00';
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;

  if (hrs > 0) {
    return `${hrs}h ${String(mins).padStart(2, '0')}m ${String(secs).padStart(2, '0')}s`;
  }
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

export const BriefingCountdownBanner: React.FC<BriefingCountdownBannerProps> = ({
  briefing,
  isSuperAdminOrAdmin = false,
  onOpenManageModal,
  onCancelBriefing,
  className = '',
  variant = 'banner',
}) => {
  const [remainingSecs, setRemainingSecs] = useState<number>(() => {
    if (!briefing?.target_iso_time) return 0;
    const diff = Math.floor((new Date(briefing.target_iso_time).getTime() - Date.now()) / 1000);
    return Math.max(0, diff);
  });

  const [confirmCancel, setConfirmCancel] = useState(false);

  useEffect(() => {
    if (!briefing?.target_iso_time) {
      setRemainingSecs(0);
      return;
    }

    const calc = () => {
      const diff = Math.floor((new Date(briefing.target_iso_time).getTime() - Date.now()) / 1000);
      const remaining = Math.max(0, diff);
      setRemainingSecs(remaining);
    };

    calc();
    const interval = setInterval(calc, 1000);
    return () => clearInterval(interval);
  }, [briefing?.target_iso_time]);

  // Requirement: Auto-remove immediately when countdown reaches zero
  if (!briefing || remainingSecs <= 0) {
    return null;
  }

  const targetDate = new Date(briefing.target_iso_time);
  const targetTimeString = targetDate.toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  });

  if (variant === 'card') {
    return (
      <div
        className={`rounded-2xl bg-gradient-to-r from-emerald-950 via-[#0a3824] to-emerald-900 border border-emerald-500/40 p-3.5 text-white shadow-md relative overflow-hidden ${className}`}
      >
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-xl bg-amber-400/20 border border-amber-300/30 flex items-center justify-center text-amber-300 shrink-0">
              <Clock className="w-4 h-4 animate-spin" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping shrink-0" />
                <h4 className="text-xs font-bold text-white truncate">
                  {briefing.title || 'Squad Dusk Briefing'}
                </h4>
              </div>
              <p className="text-[10px] text-emerald-200/90 font-medium">
                Scheduled for <strong className="text-white">{targetTimeString}</strong>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <div className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-400/20 border border-amber-300/40 text-amber-300 font-mono text-xs font-black shadow-xs">
              <Clock className="w-3 h-3" />
              <span>{formatRemainingTime(remainingSecs)}</span>
            </div>

            {isSuperAdminOrAdmin && onOpenManageModal && (
              <button
                type="button"
                onClick={onOpenManageModal}
                className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer"
                title="Manage briefing timer"
              >
                <Settings2 className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Default 'banner' variant (matching Squad & Home header bar)
  return (
    <div
      className={`bg-gradient-to-r from-emerald-950 via-[#0f5238] to-emerald-900 text-white px-4 py-2.5 flex items-center justify-between shadow-xs border-y border-emerald-500/30 transition-all ${className}`}
    >
      <div className="flex items-center gap-2 min-w-0">
        <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping shrink-0" />
        <span className="text-xs font-bold tracking-wide truncate">
          {briefing.title || 'Squad Dusk Briefing'}:
        </span>
        <span className="text-[11px] text-emerald-200 hidden sm:inline">
          (starts at {targetTimeString})
        </span>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-400/20 border border-amber-300/40 text-amber-300 font-mono text-xs font-black shadow-xs">
          <Clock className="w-3.5 h-3.5 animate-spin" />
          <span>{formatRemainingTime(remainingSecs)} left</span>
        </div>

        {isSuperAdminOrAdmin && onOpenManageModal && (
          <button
            type="button"
            onClick={onOpenManageModal}
            className="p-1 rounded-lg bg-emerald-800/60 hover:bg-emerald-700 border border-emerald-500/40 text-emerald-200 hover:text-white transition-all cursor-pointer"
            title="Configure synchronized briefing timer"
          >
            <Settings2 className="w-3.5 h-3.5" />
          </button>
        )}

        {isSuperAdminOrAdmin && onCancelBriefing && (
          <>
            {confirmCancel ? (
              <button
                type="button"
                onClick={() => {
                  onCancelBriefing();
                  setConfirmCancel(false);
                }}
                className="px-2 py-0.5 rounded-md bg-rose-600 hover:bg-rose-700 text-[10px] font-bold text-white transition-colors cursor-pointer"
              >
                Confirm End
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setConfirmCancel(true)}
                className="p-1 rounded-lg bg-rose-950/40 hover:bg-rose-900/60 border border-rose-800/40 text-rose-300 hover:text-white transition-all cursor-pointer"
                title="Cancel briefing timer"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
};
