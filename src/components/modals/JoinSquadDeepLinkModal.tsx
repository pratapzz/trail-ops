import React, { useState, useEffect } from 'react';
import { Users, Compass, Shield, CheckCircle2, AlertTriangle, ArrowRight, X, Loader2 } from 'lucide-react';
import { getSupabase, joinSquadByCode, SquadGroupRecord } from '../../lib/supabase';

interface JoinSquadDeepLinkModalProps {
  code?: string;
  joinCode?: string;
  currentUserId: string;
  isOpen: boolean;
  onClose: () => void;
  onJoined: (group: SquadGroupRecord) => void;
  onShowToast: (message: string) => void;
}

export const JoinSquadDeepLinkModal: React.FC<JoinSquadDeepLinkModalProps> = ({
  code,
  joinCode,
  currentUserId,
  isOpen,
  onClose,
  onJoined,
  onShowToast,
}) => {
  const effectiveCode = code || joinCode || '';
  const [loading, setLoading] = useState(true);
  const [joining, setJoining] = useState(false);
  const [squad, setSquad] = useState<SquadGroupRecord | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen || !effectiveCode) return;

    let isMounted = true;
    const fetchSquadDetails = async () => {
      setLoading(true);
      setError(null);
      const sb = getSupabase();
      if (!sb) {
        if (isMounted) {
          setError('Supabase is not configured. Please configure your backend first.');
          setLoading(false);
        }
        return;
      }

      try {
        const { data, error: err } = await sb
          .from('squad_groups')
          .select('*')
          .eq('code', effectiveCode.trim().toUpperCase())
          .single();

        if (err || !data) {
          if (isMounted) {
            setError(`Squad invitation code "${effectiveCode}" is invalid or has expired.`);
            setLoading(false);
          }
          return;
        }

        if (isMounted) {
          setSquad(data as SquadGroupRecord);
          setLoading(false);
        }
      } catch (e: any) {
        if (isMounted) {
          setError(e.message || 'Error validating squad invitation');
          setLoading(false);
        }
      }
    };

    fetchSquadDetails();

    return () => {
      isMounted = false;
    };
  }, [isOpen, effectiveCode]);

  if (!isOpen) return null;

  const handleConfirmJoin = async () => {
    if (!effectiveCode || !currentUserId) {
      onShowToast('Please authenticate before joining this squad.');
      return;
    }

    setJoining(true);
    const res = await joinSquadByCode(currentUserId, effectiveCode);
    setJoining(false);

    if (res.success && res.group) {
      onShowToast(`Successfully joined "${res.group.name}"!`);
      onJoined(res.group);
      onClose();
    } else {
      onShowToast(res.error || 'Failed to join squad.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
      <div className="bg-slate-900 border border-slate-700/80 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl flex flex-col text-slate-100">
        <div className="p-5 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-semibold text-white tracking-tight">Expedition Squad Invitation</h3>
              <p className="text-xs text-slate-400 font-mono">Code: {code}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          {loading ? (
            <div className="py-8 flex flex-col items-center justify-center gap-3 text-slate-400">
              <Loader2 className="w-6 h-6 animate-spin text-emerald-400" />
              <span className="text-xs">Validating squad code against database...</span>
            </div>
          ) : error ? (
            <div className="p-4 bg-rose-500/10 border border-rose-500/30 rounded-xl text-rose-300 text-xs flex items-start gap-2.5">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-rose-400" />
              <div>
                <div className="font-medium">Invitation Error</div>
                <div className="text-rose-300/80 mt-0.5">{error}</div>
              </div>
            </div>
          ) : squad ? (
            <div className="space-y-3">
              <div className="p-4 bg-slate-800/70 border border-slate-700/60 rounded-xl space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-emerald-400 font-semibold tracking-wider uppercase">Active Mission</span>
                  <span className="text-xs font-mono bg-slate-900 px-2 py-0.5 rounded border border-slate-700 text-slate-300">
                    {squad.code}
                  </span>
                </div>
                <h4 className="text-base font-bold text-white tracking-tight">{squad.name}</h4>
                <div className="flex items-center gap-1.5 text-xs text-slate-300">
                  <Compass className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Destination: {squad.destination || 'Expedition Trail'}</span>
                </div>
              </div>

              <div className="text-xs text-slate-400 bg-slate-950/50 p-3 rounded-xl border border-slate-800/80">
                You are joining this tactical squad as a verified expedition member. You will gain access to real-time roll call, 4K media vault, and the shared railway travel roster.
              </div>
            </div>
          ) : null}
        </div>

        <div className="p-4 border-t border-slate-800 bg-slate-950/60 flex items-center justify-end gap-2.5">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-medium text-slate-400 hover:text-white rounded-xl transition-colors"
          >
            Cancel
          </button>
          {squad && (
            <button
              type="button"
              onClick={handleConfirmJoin}
              disabled={joining}
              className="px-4 py-2 text-xs font-semibold bg-emerald-500 hover:bg-emerald-400 text-slate-950 rounded-xl shadow-sm transition-colors flex items-center gap-1.5 disabled:opacity-50"
            >
              {joining ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ArrowRight className="w-3.5 h-3.5" />}
              Confirm & Join Squad
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
