import React, { useState, useEffect } from 'react';
import { Users, Compass, Shield, CheckCircle2, AlertTriangle, ArrowRight, X, Loader2, Clock, Send, Calendar } from 'lucide-react';
import { lookupSquadByCode, submitSquadJoinRequest, SquadGroupRecord } from '../../lib/supabase';

interface JoinSquadDeepLinkModalProps {
  code?: string;
  joinCode?: string;
  currentUserId: string;
  currentUserName?: string;
  currentUserEmail?: string;
  currentUserAvatar?: string;
  isOpen: boolean;
  onClose: () => void;
  onJoined: (group: SquadGroupRecord) => void;
  onRequestSent?: (group: SquadGroupRecord) => void;
  onShowToast: (message: string) => void;
}

export const JoinSquadDeepLinkModal: React.FC<JoinSquadDeepLinkModalProps> = ({
  code,
  joinCode,
  currentUserId,
  currentUserName,
  currentUserEmail,
  currentUserAvatar,
  isOpen,
  onClose,
  onJoined,
  onRequestSent,
  onShowToast,
}) => {
  const effectiveCode = code || joinCode || '';
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [squad, setSquad] = useState<SquadGroupRecord | null>(null);
  const [requestStatus, setRequestStatus] = useState<'none' | 'pending' | 'accepted' | 'rejected' | 'member'>('none');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen || !effectiveCode) return;

    let isMounted = true;
    const fetchSquadDetails = async () => {
      setLoading(true);
      setError(null);
      try {
        const found = await lookupSquadByCode(effectiveCode, currentUserId);
        if (!found) {
          if (isMounted) {
            setError(`No expedition group found with invitation code "${effectiveCode.toUpperCase()}". Please verify the code with your group creator.`);
            setLoading(false);
          }
          return;
        }

        if (isMounted) {
          setSquad(found);
          if (found.userRequestStatus === 'member' || found.userRequestStatus === 'accepted') {
            setRequestStatus('member');
          } else if (found.userRequestStatus === 'pending') {
            setRequestStatus('pending');
          } else if (found.userRequestStatus === 'rejected') {
            setRequestStatus('rejected');
          } else {
            setRequestStatus('none');
          }
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
  }, [isOpen, effectiveCode, currentUserId]);

  if (!isOpen) return null;

  const handleSubmitRequest = async () => {
    if (!squad || !currentUserId) {
      onShowToast('Please sign in first to request squad membership.');
      return;
    }

    if (requestStatus === 'member') {
      onJoined(squad);
      onClose();
      return;
    }

    if (requestStatus === 'pending') {
      onShowToast('Your join request is already pending Super Admin approval.');
      return;
    }

    setSubmitting(true);
    const res = await submitSquadJoinRequest(
      squad.id,
      currentUserId,
      currentUserName,
      currentUserEmail,
      currentUserAvatar
    );
    setSubmitting(false);

    if (res.alreadyMember) {
      setRequestStatus('member');
      onShowToast(`You are already an approved member of "${squad.name}"!`);
      onJoined(squad);
      onClose();
      return;
    }

    if (res.success || res.alreadyPending) {
      setRequestStatus('pending');
      onRequestSent?.(squad);
      onShowToast(
        res.alreadyPending
          ? `Join request for "${squad.name}" is already awaiting Super Admin approval.`
          : `Join request sent to "${squad.name}" Super Admin!`
      );
    } else {
      onShowToast(res.error || 'Failed to submit join request.');
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
              <h3 className="font-semibold text-white tracking-tight">Expedition Squad Verification</h3>
              <p className="text-xs text-slate-400 font-mono">Code: {effectiveCode.toUpperCase()}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          {loading ? (
            <div className="py-8 flex flex-col items-center justify-center gap-3 text-slate-400">
              <Loader2 className="w-6 h-6 animate-spin text-emerald-400" />
              <span className="text-xs">Verifying group code against database...</span>
            </div>
          ) : error ? (
            <div className="p-4 bg-rose-500/10 border border-rose-500/30 rounded-xl text-rose-300 text-xs flex items-start gap-2.5">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-rose-400" />
              <div>
                <div className="font-medium">No Group Available</div>
                <div className="text-rose-300/80 mt-0.5">{error}</div>
              </div>
            </div>
          ) : squad ? (
            <div className="space-y-3">
              <div className="p-4 bg-slate-800/70 border border-slate-700/60 rounded-xl space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] text-emerald-400 font-semibold tracking-wider uppercase flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Verified Expedition Group
                  </span>
                  <span className="text-xs font-mono bg-slate-900 px-2.5 py-0.5 rounded border border-slate-700 text-amber-300 font-bold">
                    {squad.code}
                  </span>
                </div>
                <h4 className="text-base font-bold text-white tracking-tight">{squad.name}</h4>
                <div className="grid grid-cols-2 gap-2 pt-1 text-xs text-slate-300">
                  <div className="flex items-center gap-1.5">
                    <Compass className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                    <span className="truncate">{squad.destination || 'Expedition Trail'}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Users className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                    <span>{squad.memberCount || 1} Active Member(s)</span>
                  </div>
                  {squad.startDate && (
                    <div className="flex items-center gap-1.5 col-span-2 text-slate-400">
                      <Calendar className="w-3.5 h-3.5 text-teal-400 shrink-0" />
                      <span>Departure: {squad.startDate}</span>
                    </div>
                  )}
                </div>
              </div>

              {requestStatus === 'pending' ? (
                <div className="p-3.5 rounded-xl bg-amber-500/15 border border-amber-500/40 text-amber-200 text-xs flex items-start gap-2.5">
                  <Clock className="w-4 h-4 text-amber-400 shrink-0 mt-0.5 animate-pulse" />
                  <div>
                    <div className="font-bold text-amber-300">Request Sent — Awaiting Approval</div>
                    <p className="text-[11px] text-amber-200/80 mt-0.5 leading-relaxed">
                      Your join request has been sent to the group&apos;s Super Admin. You will be notified and granted access as soon as it is approved.
                    </p>
                  </div>
                </div>
              ) : requestStatus === 'member' ? (
                <div className="p-3.5 rounded-xl bg-emerald-500/15 border border-emerald-500/40 text-emerald-200 text-xs flex items-start gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  <div>
                    <div className="font-bold text-emerald-300">Approved Squad Member</div>
                    <p className="text-[11px] text-emerald-200/80 mt-0.5">
                      You are an active member of this expedition group.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="text-xs text-slate-400 bg-slate-950/50 p-3 rounded-xl border border-slate-800/80 space-y-1">
                  {requestStatus === 'rejected' && (
                    <p className="text-rose-400 font-semibold mb-1">
                      Your previous join request was declined. You may submit a new request below.
                    </p>
                  )}
                  <p className="flex items-center gap-1.5 text-slate-300 font-medium">
                    <Shield className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                    <span>Super Admin Approval Required</span>
                  </p>
                  <p className="text-[11px] text-slate-400 leading-relaxed">
                    Submitting a request notifies the group&apos;s Super Admin. Private squad data, live roll call, and vault access unlock immediately upon approval.
                  </p>
                </div>
              )}
            </div>
          ) : null}
        </div>

        <div className="p-4 border-t border-slate-800 bg-slate-950/60 flex items-center justify-end gap-2.5">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-medium text-slate-400 hover:text-white rounded-xl transition-colors cursor-pointer"
          >
            {requestStatus === 'pending' ? 'Close' : 'Cancel'}
          </button>
          {squad && requestStatus !== 'pending' && (
            <button
              type="button"
              onClick={handleSubmitRequest}
              disabled={submitting}
              className="px-4 py-2 text-xs font-semibold bg-emerald-500 hover:bg-emerald-400 text-slate-950 rounded-xl shadow-sm transition-colors flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
            >
              {submitting ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : requestStatus === 'member' ? (
                <ArrowRight className="w-3.5 h-3.5" />
              ) : (
                <Send className="w-3.5 h-3.5" />
              )}
              <span>
                {requestStatus === 'member'
                  ? 'Enter Squad'
                  : requestStatus === 'rejected'
                  ? 'Submit New Join Request'
                  : 'Request to Join Squad'}
              </span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

