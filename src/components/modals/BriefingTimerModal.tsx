import React, { useState, useEffect } from 'react';
import { Clock, X, AlertCircle, CheckCircle2, Megaphone, Trash2, Calendar, Sparkles } from 'lucide-react';
import {
  SquadBriefingRecord,
  saveGroupBriefing,
  cancelGroupBriefing,
} from '../../lib/supabase';

interface BriefingTimerModalProps {
  isOpen: boolean;
  onClose: () => void;
  groupId: string;
  groupName?: string;
  activeBriefing: SquadBriefingRecord | null;
  onSaved: (briefing: SquadBriefingRecord | null) => void;
  onShowToast: (msg: string) => void;
  currentUserId?: string;
  currentUserName?: string;
  currentUserRole?: string;
}

const PRESET_DURATIONS = [5, 10, 15, 20, 30, 45, 60];

function formatLocalDateTime(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  const year = date.getFullYear();
  const month = pad(date.getMonth() + 1);
  const day = pad(date.getDate());
  const hours = pad(date.getHours());
  const mins = pad(date.getMinutes());
  return `${year}-${month}-${day}T${hours}:${mins}`;
}

export const BriefingTimerModal: React.FC<BriefingTimerModalProps> = ({
  isOpen,
  onClose,
  groupId,
  groupName = 'Squad',
  activeBriefing,
  onSaved,
  onShowToast,
  currentUserId,
  currentUserName,
  currentUserRole,
}) => {
  const [title, setTitle] = useState('Squad Dusk Briefing');
  const [durationMinutes, setDurationMinutes] = useState(15);
  const [targetIsoTime, setTargetIsoTime] = useState<string>(() => {
    return new Date(Date.now() + 15 * 60 * 1000).toISOString();
  });
  const [targetLocalString, setTargetLocalString] = useState<string>(() => {
    return formatLocalDateTime(new Date(Date.now() + 15 * 60 * 1000));
  });
  const [announceInNotices, setAnnounceInNotices] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);
  const [confirmCancel, setConfirmCancel] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Initialize form with active briefing or defaults
  useEffect(() => {
    if (activeBriefing && isOpen) {
      setTitle(activeBriefing.title || 'Squad Dusk Briefing');
      const targetTime = new Date(activeBriefing.target_iso_time).getTime();
      const minsRemaining = Math.max(1, Math.round((targetTime - Date.now()) / 60000));
      setDurationMinutes(minsRemaining);
      setTargetIsoTime(activeBriefing.target_iso_time);
      setTargetLocalString(formatLocalDateTime(new Date(activeBriefing.target_iso_time)));
      setConfirmCancel(false);
      setErrorMessage(null);
    } else if (isOpen) {
      setTitle('Squad Dusk Briefing');
      const defaultMins = 15;
      setDurationMinutes(defaultMins);
      const targetDate = new Date(Date.now() + defaultMins * 60 * 1000);
      setTargetIsoTime(targetDate.toISOString());
      setTargetLocalString(formatLocalDateTime(targetDate));
      setAnnounceInNotices(true);
      setConfirmCancel(false);
      setErrorMessage(null);
    }
  }, [activeBriefing, isOpen]);

  if (!isOpen) return null;

  // Handle preset duration button click
  const handleSelectPreset = (mins: number) => {
    setDurationMinutes(mins);
    const targetDate = new Date(Date.now() + mins * 60 * 1000);
    setTargetIsoTime(targetDate.toISOString());
    setTargetLocalString(formatLocalDateTime(targetDate));
    setErrorMessage(null);
  };

  // Handle custom minutes input
  const handleMinutesChange = (mins: number) => {
    const validMins = Math.max(1, Math.min(1440, mins || 1));
    setDurationMinutes(validMins);
    const targetDate = new Date(Date.now() + validMins * 60 * 1000);
    setTargetIsoTime(targetDate.toISOString());
    setTargetLocalString(formatLocalDateTime(targetDate));
    setErrorMessage(null);
  };

  // Handle datetime-local picker change
  const handleTargetDateTimeChange = (localVal: string) => {
    setTargetLocalString(localVal);
    if (!localVal) return;

    const chosenDate = new Date(localVal);
    const now = Date.now();
    if (isNaN(chosenDate.getTime())) {
      setErrorMessage('Please enter a valid date and time.');
      return;
    }

    if (chosenDate.getTime() <= now) {
      setErrorMessage('Scheduled briefing time must be in the future.');
      return;
    }

    setErrorMessage(null);
    setTargetIsoTime(chosenDate.toISOString());
    const mins = Math.max(1, Math.round((chosenDate.getTime() - now) / 60000));
    setDurationMinutes(mins);
  };

  // Submit start / update
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const cleanTitle = title.trim();
    if (!cleanTitle) {
      setErrorMessage('Please enter a title or purpose for the briefing.');
      return;
    }

    const targetTimestamp = new Date(targetIsoTime).getTime();
    if (isNaN(targetTimestamp) || targetTimestamp <= Date.now()) {
      setErrorMessage('Scheduled time must be at least 1 minute in the future.');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await saveGroupBriefing({
        groupId,
        title: cleanTitle,
        targetIsoTime,
        durationMinutes,
        userId: currentUserId,
        announceInNotices,
        authorName: currentUserName || 'Super Admin',
        authorRole: currentUserRole || 'Super Admin',
      });

      if (res.success && res.briefing) {
        onSaved(res.briefing);
        onShowToast(
          `Briefing timer set for ${cleanTitle} (${durationMinutes} mins). Synced to squad.`
        );
        onClose();
      } else {
        setErrorMessage(res.error || 'Failed to save briefing schedule. Please retry.');
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Error saving briefing timer.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Cancel active briefing
  const handleCancelBriefing = async () => {
    setIsCancelling(true);
    try {
      await cancelGroupBriefing(groupId);
      onSaved(null);
      onShowToast('Briefing timer cancelled and removed from all member screens.');
      onClose();
    } catch (err: any) {
      setErrorMessage('Failed to cancel briefing timer.');
    } finally {
      setIsCancelling(false);
      setConfirmCancel(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in">
      <div className="bg-white dark:bg-slate-900 rounded-3xl w-full max-w-lg shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-gradient-to-r from-emerald-950 via-slate-900 to-slate-900 text-white">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/20 border border-amber-400/30 flex items-center justify-center text-amber-400">
              <Clock className="w-5 h-5 animate-spin" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white tracking-tight">
                {activeBriefing ? 'Edit Group Briefing Timer' : 'Schedule Group Briefing'}
              </h2>
              <p className="text-[11px] text-emerald-300 font-medium">
                {groupName} • Synchronizes live across all member devices
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-slate-300 hover:text-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body Form */}
        <form onSubmit={handleSave} className="p-5 overflow-y-auto space-y-4">
          {errorMessage && (
            <div className="p-3 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 flex items-start gap-2.5 text-rose-700 dark:text-rose-300 text-xs">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Title / Reason */}
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
              Briefing Title or Reason
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Squad Dusk Briefing, Route Review, Camp Assembly"
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 text-slate-900 dark:text-white text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500"
              required
            />
          </div>

          {/* Duration Presets */}
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 flex items-center justify-between">
              <span>Duration Presets</span>
              <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold">
                {durationMinutes} minutes selected
              </span>
            </label>
            <div className="grid grid-cols-4 sm:grid-cols-7 gap-1.5">
              {PRESET_DURATIONS.map((mins) => (
                <button
                  key={mins}
                  type="button"
                  onClick={() => handleSelectPreset(mins)}
                  className={`py-2 px-1 rounded-xl text-xs font-bold transition-all border ${
                    durationMinutes === mins
                      ? 'bg-emerald-600 text-white border-emerald-500 shadow-sm scale-[1.02]'
                      : 'bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                  }`}
                >
                  {mins}m
                </button>
              ))}
            </div>
          </div>

          {/* Custom Duration & Exact Time Picker */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
            <div>
              <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">
                Custom Duration (Minutes)
              </label>
              <div className="relative">
                <input
                  type="number"
                  min="1"
                  max="1440"
                  value={durationMinutes}
                  onChange={(e) => handleMinutesChange(parseInt(e.target.value, 10))}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-xs font-mono font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
                <span className="absolute right-3 top-2.5 text-[10px] uppercase font-bold text-slate-400">
                  Mins
                </span>
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1 flex items-center gap-1">
                <Calendar className="w-3 h-3 text-slate-400" />
                <span>Target Date &amp; Time</span>
              </label>
              <input
                type="datetime-local"
                value={targetLocalString}
                onChange={(e) => handleTargetDateTimeChange(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500 cursor-pointer"
              />
            </div>
          </div>

          {/* Announce in Group Notices (Routine priority) */}
          <div className="pt-2">
            <label className="flex items-start gap-3 p-3 rounded-2xl bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/50 cursor-pointer hover:bg-emerald-50 transition-colors">
              <input
                type="checkbox"
                checked={announceInNotices}
                onChange={(e) => setAnnounceInNotices(e.target.checked)}
                className="mt-0.5 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 w-4 h-4"
              />
              <div className="flex-1 text-xs">
                <div className="flex items-center gap-1.5 font-bold text-slate-900 dark:text-white">
                  <Megaphone className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                  <span>Announce in Group Notices (Routine Notice)</span>
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 leading-snug">
                  Automatically broadcasts a calm routine notice to all squad member devices with the briefing reason, scheduled time, and countdown.
                </p>
              </div>
            </label>
          </div>

          {/* Cancel Active Briefing (if one exists) */}
          {activeBriefing && (
            <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
              {confirmCancel ? (
                <div className="p-3 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 flex items-center justify-between gap-2">
                  <span className="text-xs font-bold text-rose-800 dark:text-rose-300">
                    Cancel and remove timer for all members?
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      disabled={isCancelling}
                      onClick={handleCancelBriefing}
                      className="px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition-colors cursor-pointer"
                    >
                      {isCancelling ? 'Cancelling...' : 'Yes, Cancel'}
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfirmCancel(false)}
                      className="px-2.5 py-1.5 rounded-lg bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-semibold"
                    >
                      Keep
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setConfirmCancel(true)}
                  className="w-full py-2.5 rounded-xl border border-rose-200 dark:border-rose-900/60 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 text-xs font-bold flex items-center justify-center gap-2 transition-colors cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Cancel Active Briefing Timer</span>
                </button>
              )}
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex items-center gap-2.5 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-3 rounded-2xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-bold transition-colors cursor-pointer"
            >
              Close
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-2 py-3 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white text-xs font-bold shadow-lg shadow-emerald-700/20 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <Clock className="w-4 h-4 animate-spin" />
                  <span>Synchronizing...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  <span>{activeBriefing ? 'Update Briefing Timer' : 'Start Briefing Timer'}</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
