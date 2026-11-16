import React, { useState } from 'react';
import { Radio, CheckCircle2, XCircle, Square, Loader2 } from 'lucide-react';

export interface HomeRollCallSession {
  sessionId: string;
  active: boolean;
  startedAt: string;
  startedBy: string;
  presentUserIds: string[];
  deniedUserIds?: string[];
  totalMembers?: number;
}

interface HomeAttendanceCardProps {
  session: HomeRollCallSession | null;
  currentUserId: string;
  isSuperAdmin: boolean;
  onStart: () => Promise<void> | void;
  onEnd: () => Promise<void> | void;
  onMarkPresent: () => Promise<void> | void;
  onDeny: () => Promise<void> | void;
}

/** Start / answer the squad attendance roll call straight from the Home screen. */
export const HomeAttendanceCard: React.FC<HomeAttendanceCardProps> = ({
  session,
  currentUserId,
  isSuperAdmin,
  onStart,
  onEnd,
  onMarkPresent,
  onDeny,
}) => {
  const [busy, setBusy] = useState<null | 'start' | 'end' | 'present' | 'deny'>(null);
  const live = Boolean(session?.active);
  const present = session?.presentUserIds?.length || 0;
  const denied = session?.deniedUserIds?.length || 0;
  const total = Math.max(session?.totalMembers || 0, present + denied, 1);
  const pending = Math.max(0, total - present - denied);
  const iAmPresent = Boolean(currentUserId && session?.presentUserIds?.includes(currentUserId));
  const iAmDenied = Boolean(currentUserId && session?.deniedUserIds?.includes(currentUserId));

  const run = async (kind: 'start' | 'end' | 'present' | 'deny', fn: () => Promise<void> | void) => {
    if (busy) return;
    setBusy(kind);
    try {
      await fn();
    } finally {
      setBusy(null);
    }
  };

  // Members with no live roll call have nothing to do here.
  if (!live && !isSuperAdmin) return null;

  return (
    <section className="glass-card rounded-3xl p-4 relative overflow-hidden" aria-label="Squad attendance">
      <div className="absolute -top-10 -right-8 w-32 h-32 bg-emerald-400/25 rounded-full blur-2xl pointer-events-none" />
      <div className="flex items-center gap-3 relative">
        <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-500 text-white flex items-center justify-center shadow-md shadow-emerald-700/25 shrink-0">
          <Radio className={`w-5 h-5 ${live ? 'animate-pulse' : ''}`} />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-800 dark:text-emerald-300">Squad attendance</span>
            {live && <span className="inline-flex w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />}
          </div>
          <p className="text-xs text-slate-600 truncate">
            {live
              ? `Live since ${session?.startedAt} · by ${session?.startedBy}`
              : 'Ask everyone to confirm they are with the group.'}
          </p>
        </div>
      </div>

      {live && (
        <div className="grid grid-cols-3 gap-2 mt-3 relative">
          <div className="glass-chip rounded-xl py-1.5 text-center">
            <span className="block text-[10px] font-bold uppercase text-emerald-800 dark:text-emerald-300">Present</span>
            <span className="text-lg font-black text-emerald-700 dark:text-emerald-400">{present}</span>
          </div>
          <div className="glass-chip rounded-xl py-1.5 text-center">
            <span className="block text-[10px] font-bold uppercase text-rose-800 dark:text-rose-300">Denied</span>
            <span className="text-lg font-black text-rose-600">{denied}</span>
          </div>
          <div className="glass-chip rounded-xl py-1.5 text-center">
            <span className="block text-[10px] font-bold uppercase text-amber-800 dark:text-amber-300">Pending</span>
            <span className="text-lg font-black text-amber-600">{pending}</span>
          </div>
        </div>
      )}

      <div className="flex gap-2 mt-3 relative">
        {!live && isSuperAdmin && (
          <button
            type="button"
            disabled={busy !== null}
            onClick={() => run('start', onStart)}
            className="flex-1 py-3.5 px-4 rounded-2xl bg-gradient-to-r from-emerald-600 via-teal-600 to-[#0f5238] text-white text-sm font-black flex items-center justify-center gap-2 shadow-lg shadow-emerald-700/25 active:scale-95 transition-all cursor-pointer disabled:opacity-60"
          >
            {busy === 'start' ? <Loader2 className="w-5 h-5 animate-spin" /> : <Radio className="w-5 h-5" />}
            <span>Start Attendance</span>
          </button>
        )}

        {live && (
          <>
            {iAmPresent ? (
              <div className="flex-1 py-2.5 rounded-xl bg-emerald-100/80 border border-emerald-300 text-[#0f5238] text-xs font-bold flex items-center justify-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                You're present
              </div>
            ) : (
              <button
                type="button"
                disabled={busy !== null}
                onClick={() => run('present', onMarkPresent)}
                className="flex-1 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center justify-center gap-1.5 shadow-sm active:scale-95 transition-all cursor-pointer disabled:opacity-60"
              >
                <CheckCircle2 className="w-4 h-4" />
                Present
              </button>
            )}

            {!isSuperAdmin && !iAmDenied && (
              <button
                type="button"
                disabled={busy !== null}
                onClick={() => run('deny', onDeny)}
                className="py-2.5 px-4 rounded-xl bg-rose-100 hover:bg-rose-200 text-rose-800 text-xs font-bold flex items-center gap-1.5 active:scale-95 transition-all cursor-pointer disabled:opacity-60"
              >
                <XCircle className="w-4 h-4" />
                Deny
              </button>
            )}
            {!isSuperAdmin && iAmDenied && (
              <span className="py-2.5 px-3 rounded-xl bg-rose-100 border border-rose-300 text-rose-800 text-xs font-bold flex items-center gap-1">
                <XCircle className="w-4 h-4" /> Denied
              </span>
            )}

            {isSuperAdmin && (
              <button
                type="button"
                disabled={busy !== null}
                onClick={() => run('end', onEnd)}
                className="py-2.5 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold flex items-center gap-1.5 active:scale-95 transition-all cursor-pointer disabled:opacity-60"
              >
                {busy === 'end' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Square className="w-3.5 h-3.5 fill-current" />}
                End
              </button>
            )}
          </>
        )}
      </div>
    </section>
  );
};
