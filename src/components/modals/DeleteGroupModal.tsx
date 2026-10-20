import React, { useState } from 'react';
import { Trash2, AlertTriangle, X, ShieldAlert, Check, Loader2 } from 'lucide-react';
import { deleteSquadGroupCascade } from '../../lib/supabase';

interface DeleteGroupModalProps {
  isOpen: boolean;
  onClose: () => void;
  groupId: string;
  groupName: string;
  onDeleted: () => void;
  onShowToast: (message: string) => void;
}

export const DeleteGroupModal: React.FC<DeleteGroupModalProps> = ({
  isOpen,
  onClose,
  groupId,
  groupName,
  onDeleted,
  onShowToast,
}) => {
  const [confirmInput, setConfirmInput] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);

  if (!isOpen) return null;

  const isMatch = confirmInput.trim().toLowerCase() === groupName.trim().toLowerCase();

  const handleDelete = async () => {
    if (!isMatch) {
      onShowToast('Please type the exact squad name to verify deletion.');
      return;
    }

    setIsDeleting(true);
    try {
      const res = await deleteSquadGroupCascade(groupId);
      if (!res.success) {
        onShowToast(`Deletion failed: ${res.error || 'Server error'}`);
        setIsDeleting(false);
        return;
      }

      onShowToast(`Expedition group "${groupName}" permanently deleted.`);
      onDeleted();
      onClose();
    } catch (err: any) {
      onShowToast(`Deletion error: ${err.message}`);
      setIsDeleting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-in fade-in duration-200">
      <div className="w-full max-w-sm bg-white dark:bg-slate-900 rounded-3xl p-6 border-2 border-rose-500/80 shadow-2xl shadow-rose-950/50 space-y-4 animate-in zoom-in-95 duration-150">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-rose-100 dark:border-rose-950/60">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-rose-100 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 flex items-center justify-center">
              <Trash2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-extrabold text-slate-900 dark:text-white">
                Delete Expedition Group
              </h3>
              <p className="text-[11px] text-rose-600 dark:text-rose-400 font-semibold">
                Super Admin Danger Zone
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

        {/* Warning Content */}
        <div className="p-3 bg-rose-50 dark:bg-rose-950/40 rounded-2xl border border-rose-200 dark:border-rose-900/60 space-y-2 text-xs text-rose-950 dark:text-rose-200">
          <div className="flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
            <p className="font-bold leading-tight">
              Permanently delete &ldquo;{groupName}&rdquo;?
            </p>
          </div>
          <ul className="list-disc list-inside space-y-1 text-[11px] text-slate-600 dark:text-slate-300 pl-1 leading-relaxed">
            <li>Removes access for all active squad members</li>
            <li>Deletes railway journeys, seat assignments, and packing lists</li>
            <li>Purges group 4K media vault records &amp; files</li>
            <li>Cancels active roll calls and emergency beacons</li>
          </ul>
          <div className="pt-1 border-t border-rose-200/60 dark:border-rose-900/40 text-[10px] text-slate-500 dark:text-slate-400 font-medium">
            Note: Your personal account, profile, and login credentials will <strong>NOT</strong> be deleted.
          </div>
        </div>

        {/* Name Confirmation Input */}
        <div className="space-y-1.5 text-left text-xs">
          <label className="font-bold text-slate-700 dark:text-slate-300 block">
            Type <span className="font-black text-rose-600 dark:text-rose-400 select-all">&ldquo;{groupName}&rdquo;</span> to confirm:
          </label>
          <input
            type="text"
            value={confirmInput}
            onChange={(e) => setConfirmInput(e.target.value)}
            placeholder={groupName}
            className="w-full h-11 px-3.5 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-rose-500 font-medium"
          />
        </div>

        {/* Action Buttons */}
        <div className="pt-2 space-y-2">
          <button
            type="button"
            disabled={!isMatch || isDeleting}
            onClick={handleDelete}
            className="w-full h-12 rounded-2xl bg-rose-600 hover:bg-rose-700 active:scale-[0.98] text-white font-bold text-xs shadow-lg shadow-rose-600/30 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-40 transition-all"
          >
            {isDeleting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Cascading Deletion...</span>
              </>
            ) : (
              <>
                <Trash2 className="w-4 h-4" />
                <span>Permanently Delete Squad Group</span>
              </>
            )}
          </button>

          <button
            type="button"
            onClick={onClose}
            className="w-full py-2.5 rounded-2xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold text-xs transition-colors cursor-pointer"
          >
            Cancel &amp; Keep Group
          </button>
        </div>
      </div>
    </div>
  );
};
