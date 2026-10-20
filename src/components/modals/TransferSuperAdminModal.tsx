import React, { useState } from 'react';
import { Crown, X, ArrowRight, ShieldCheck, AlertTriangle, Users } from 'lucide-react';
import { transferAndLeaveSquad } from '../../lib/supabase';

interface TransferSuperAdminModalProps {
  isOpen: boolean;
  onClose: () => void;
  groupId: string;
  currentUserId: string;
  members: Array<{ id: string; name: string; role?: string; avatar?: string }>;
  actionType: 'leave' | 'demote_to_member';
  onTransferSuccess: () => void;
  onShowToast: (message: string) => void;
}

export const TransferSuperAdminModal: React.FC<TransferSuperAdminModalProps> = ({
  isOpen,
  onClose,
  groupId,
  currentUserId,
  members,
  actionType,
  onTransferSuccess,
  onShowToast,
}) => {
  const [selectedSuccessorId, setSelectedSuccessorId] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  // Eligible members excluding current user
  const eligibleMembers = members.filter(
    (m) => m.id !== currentUserId && m.name !== currentUserId
  );

  const handleConfirmTransfer = async () => {
    if (!selectedSuccessorId) {
      onShowToast('Please select a squad member to appoint as the new Super Admin.');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await transferAndLeaveSquad(groupId, selectedSuccessorId, actionType);
      if (!res.success) {
        onShowToast(`Transfer failed: ${res.error || 'Database error'}`);
        return;
      }

      const successor = eligibleMembers.find(m => m.id === selectedSuccessorId);
      onShowToast(`Leadership transferred to ${successor?.name || 'new commander'} successfully.`);
      onTransferSuccess();
      onClose();
    } catch (err: any) {
      onShowToast(`Transfer error: ${err.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="w-full max-w-sm bg-white dark:bg-slate-900 rounded-3xl p-6 border border-amber-300 dark:border-amber-700/60 shadow-2xl space-y-4 animate-in zoom-in-95 duration-150">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 flex items-center justify-center">
              <Crown className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-extrabold text-slate-900 dark:text-white">
                Appoint Super Admin
              </h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Safe Transfer of Squad Control
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 flex items-center justify-center cursor-pointer transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Warning Banner */}
        <div className="p-3 bg-amber-50 dark:bg-amber-950/40 rounded-2xl border border-amber-200 dark:border-amber-900/60 flex items-start gap-2.5 text-xs text-amber-900 dark:text-amber-200">
          <AlertTriangle className="w-4 h-4 shrink-0 text-amber-600 dark:text-amber-400 mt-0.5" />
          <p className="text-[11px] leading-relaxed">
            Every expedition squad must maintain at least one Super Admin. Before you {actionType === 'leave' ? 'leave the squad' : 'relinquish your role'}, you must appoint an existing member to assume command.
          </p>
        </div>

        {/* Successor Selector List */}
        <div className="space-y-2 text-left">
          <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center justify-between">
            <span>Select Successor Commander</span>
            <span className="text-[10px] text-slate-400 font-normal">{eligibleMembers.length} available</span>
          </label>

          {eligibleMembers.length === 0 ? (
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800 text-center text-xs text-slate-500">
              <Users className="w-6 h-6 mx-auto mb-1 text-slate-400" />
              <p>No other members currently in this squad.</p>
              <p className="text-[10px] mt-1 text-slate-400">
                Invite a member first, or delete the group if you wish to close it permanently.
              </p>
            </div>
          ) : (
            <div className="max-h-48 overflow-y-auto space-y-1.5 pr-1">
              {eligibleMembers.map((member) => (
                <button
                  key={member.id}
                  type="button"
                  onClick={() => setSelectedSuccessorId(member.id)}
                  className={`w-full p-2.5 rounded-2xl border text-left flex items-center justify-between transition-all cursor-pointer ${
                    selectedSuccessorId === member.id
                      ? 'border-amber-500 bg-amber-50/60 dark:bg-amber-950/40 shadow-xs ring-2 ring-amber-500/20'
                      : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 bg-white dark:bg-slate-800/60'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center font-bold text-xs text-slate-700 dark:text-slate-200">
                      {member.name.charAt(0)}
                    </div>
                    <div>
                      <span className="text-xs font-extrabold text-slate-900 dark:text-white block">
                        {member.name}
                      </span>
                      <span className="text-[10px] text-slate-500 dark:text-slate-400">
                        {member.role || 'Member'}
                      </span>
                    </div>
                  </div>
                  {selectedSuccessorId === member.id && (
                    <ShieldCheck className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                  )}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Action Button */}
        <div className="pt-2">
          <button
            type="button"
            disabled={!selectedSuccessorId || isSubmitting || eligibleMembers.length === 0}
            onClick={handleConfirmTransfer}
            className="w-full h-12 rounded-2xl bg-gradient-to-r from-amber-600 via-amber-700 to-emerald-700 hover:brightness-110 active:scale-[0.98] text-white font-bold text-xs shadow-lg shadow-amber-700/20 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
          >
            <span>{isSubmitting ? 'Transferring...' : 'Appoint Super Admin & Proceed'}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
