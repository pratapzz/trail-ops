import React, { useEffect, useState } from 'react';
import { BellRing, X, Share } from 'lucide-react';
import {
  enablePushNotifications,
  getPushStatus,
  isIosNotInstalled,
  isPushSupported,
  PushStatus,
} from '../lib/pushNotifications';

interface PushAlertsPromptProps {
  userId: string;
  groupId?: string | null;
  onShowToast: (msg: string) => void;
}

const DISMISS_KEY = 'trailoPS_push_prompt_dismissed_at';

/** One-tap prompt so SOS / attendance / notices reach the phone even when the app is closed. */
export const PushAlertsPrompt: React.FC<PushAlertsPromptProps> = ({ userId, groupId, onShowToast }) => {
  const [status, setStatus] = useState<PushStatus>(() => getPushStatus());
  const [dismissed, setDismissed] = useState<boolean>(() => {
    try {
      const at = Number(localStorage.getItem(DISMISS_KEY) || 0);
      return Date.now() - at < 3 * 24 * 60 * 60 * 1000; // re-ask after 3 days
    } catch {
      return false;
    }
  });
  const [busy, setBusy] = useState(false);
  const iosNeedsInstall = isIosNotInstalled();

  useEffect(() => {
    const onFocus = () => setStatus(getPushStatus());
    window.addEventListener('focus', onFocus);
    return () => window.removeEventListener('focus', onFocus);
  }, []);

  if (dismissed || !userId) return null;
  if (status === 'granted') return null;
  if (!iosNeedsInstall && (status === 'unsupported')) return null;

  const dismiss = () => {
    try {
      localStorage.setItem(DISMISS_KEY, String(Date.now()));
    } catch {}
    setDismissed(true);
  };

  const enable = async () => {
    setBusy(true);
    const next = await enablePushNotifications(userId, groupId);
    setBusy(false);
    setStatus(next);
    if (next === 'granted') onShowToast('🔔 Background alerts on. SOS and attendance will reach you even when the app is closed.');
    else if (next === 'denied') onShowToast('Notifications are blocked. Allow them in your browser site settings.');
  };

  return (
    <section className="glass-card rounded-3xl p-4 relative overflow-hidden" aria-label="Enable background alerts">
      <button
        type="button"
        onClick={dismiss}
        aria-label="Dismiss"
        className="absolute top-3 right-3 p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-white/50 cursor-pointer"
      >
        <X className="w-4 h-4" />
      </button>
      <div className="flex items-start gap-3 pr-6">
        <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-amber-500 to-rose-500 text-white flex items-center justify-center shadow-md shrink-0">
          <BellRing className="w-5 h-5" />
        </div>
        <div className="min-w-0">
          <h3 className="text-sm font-bold text-slate-900">Get alerts when the app is closed</h3>
          {iosNeedsInstall ? (
            <p className="text-xs text-slate-600 mt-0.5 leading-snug">
              On iPhone, tap <Share className="inline w-3.5 h-3.5 -mt-0.5" /> Share → <b>Add to Home Screen</b>, open
              TrailOPS from that icon, then turn alerts on here.
            </p>
          ) : status === 'denied' ? (
            <p className="text-xs text-slate-600 mt-0.5 leading-snug">
              Notifications are blocked for this site. Open your browser's site settings, allow Notifications, then
              come back.
            </p>
          ) : (
            <p className="text-xs text-slate-600 mt-0.5 leading-snug">
              SOS, attendance checks and squad notices will pop up on your phone even if TrailOPS is in the background.
            </p>
          )}
        </div>
      </div>
      {!iosNeedsInstall && status === 'default' && isPushSupported() && (
        <button
          type="button"
          disabled={busy}
          onClick={enable}
          className="mt-3 w-full py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold active:scale-95 transition-all cursor-pointer disabled:opacity-60"
        >
          {busy ? 'Turning on…' : 'Turn on background alerts'}
        </button>
      )}
    </section>
  );
};
