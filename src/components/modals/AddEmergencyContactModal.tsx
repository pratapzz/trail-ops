import React, { useState } from 'react';
import { X, UserPlus, Phone, Shield, Award, Crown, CheckCircle2 } from 'lucide-react';
import { EmergencyContactRecord } from '../../lib/supabase';

interface AddEmergencyContactModalProps {
  isOpen: boolean;
  onClose: () => void;
  groupId: string;
  currentUserId: string;
  onContactAdded: (contact: Omit<EmergencyContactRecord, 'id' | 'created_at'>) => Promise<void>;
  onShowToast: (message: string) => void;
}

export const AddEmergencyContactModal: React.FC<AddEmergencyContactModalProps> = ({
  isOpen,
  onClose,
  groupId,
  currentUserId,
  onContactAdded,
  onShowToast,
}) => {
  const [name, setName] = useState('');
  const [role, setRole] = useState<'faculty' | 'super_admin' | 'admin'>('faculty');
  const [phone, setPhone] = useState('');
  const [designation, setDesignation] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      onShowToast('Please provide a full contact name.');
      return;
    }
    if (!phone.trim() || phone.replace(/\D/g, '').length < 8) {
      onShowToast('Please enter a valid phone number with dialer code.');
      return;
    }

    setIsSubmitting(true);
    try {
      await onContactAdded({
        group_id: groupId,
        name: name.trim(),
        role,
        phone: phone.trim(),
        designation: designation.trim() || (role === 'faculty' ? 'Faculty Lead' : role === 'super_admin' ? 'Super Admin' : 'Admin'),
        added_by: currentUserId,
      });
      onShowToast(`Emergency line for "${name}" added to squad!`);
      setName('');
      setPhone('');
      setDesignation('');
      onClose();
    } catch (err: any) {
      onShowToast(`Failed to add contact: ${err.message || 'Error'}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-md animate-in fade-in duration-200">
      <div className="w-full max-w-sm bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200 dark:border-slate-800 shadow-2xl space-y-4 animate-in zoom-in-95 duration-150">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 flex items-center justify-center">
              <UserPlus className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-extrabold text-slate-900 dark:text-white">
                Add Leadership Line
              </h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Direct phone dialer contact for squad
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

        <form onSubmit={handleSubmit} className="space-y-3.5 text-left text-xs">
          {/* Contact Full Name */}
          <div className="space-y-1">
            <label className="font-bold text-slate-700 dark:text-slate-300">
              Contact Name <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              autoFocus
              placeholder="e.g. Dr. Roy / Mountain Guide / Station Police"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full h-11 px-3.5 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium"
            />
          </div>

          {/* Phone Number */}
          <div className="space-y-1">
            <label className="font-bold text-slate-700 dark:text-slate-300">
              Phone Number (Native Dialer) <span className="text-rose-500">*</span>
            </label>
            <div className="relative flex items-center">
              <Phone className="w-4 h-4 text-emerald-600 absolute left-3.5 pointer-events-none" />
              <input
                type="tel"
                required
                placeholder="e.g. +91 98765 43210"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full h-11 pl-10 pr-3.5 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono font-medium"
              />
            </div>
            <p className="text-[10px] text-slate-400">
              Stored for this expedition squad. Tapping Call opens your phone dialer app directly.
            </p>
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full h-12 rounded-2xl bg-gradient-to-r from-emerald-700 via-emerald-600 to-teal-600 hover:from-emerald-800 hover:to-teal-700 active:scale-[0.98] text-white font-bold text-xs shadow-lg shadow-emerald-700/20 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>{isSubmitting ? 'Saving Contact...' : 'Save & Sync Direct Line'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
