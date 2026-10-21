import React, { useState, useEffect } from 'react';
import {
  Compass,
  User,
  Shield,
  Activity,
  Heart,
  Pill,
  WifiOff,
  LogOut,
  Edit3,
  CheckCircle2,
  Bell,
  HardDrive,
  ChevronRight,
  ShieldAlert,
  Code2,
  Sparkles,
  Award,
  Crown,
  CreditCard,
  PieChart,
  Users,
  Sun,
  Moon,
  Monitor,
  Lock,
  GraduationCap,
  Trash2,
  KeyRound,
  AlertOctagon,
  ShieldCheck,
  ArrowRight,
  Smartphone,
  Download,
  GitBranch,
  Copy,
} from 'lucide-react';
import { ProfileFormData, ScreenType, UserRole } from '../types';
import { TransferSuperAdminModal } from './modals/TransferSuperAdminModal';
import { DeleteGroupModal } from './modals/DeleteGroupModal';
import { recoverGroupSuperAdmin } from '../lib/supabase';

interface SettingsScreenProps {
  onNavigate: (screen: ScreenType) => void;
  onShowToast: (message: string) => void;
  profileData: ProfileFormData;
  onSignOut: () => void;
  hasJoinedGroup?: boolean;
  tripBudget?: number;
  amountPaid?: number;
  amountPending?: number;
  userRole?: UserRole;
  onUpdateRole?: (role: UserRole) => void;
  onOpenSplitwise?: () => void;
  theme?: 'light' | 'dark' | 'system';
  onUpdateTheme?: (theme: 'light' | 'dark' | 'system') => void;
  subGroupName?: string;
  subGroupColor?: string;
  activeSquad?: any;
  currentUserId?: string;
  onLeaveSquad?: () => void;
  onSquadDeleted?: () => void;
}

export const SettingsScreen: React.FC<SettingsScreenProps> = ({
  onNavigate,
  onShowToast,
  profileData,
  onSignOut,
  hasJoinedGroup = true,
  tripBudget = 6000,
  amountPaid = 4200,
  amountPending = 1800,
  userRole = 'member',
  onUpdateRole,
  onOpenSplitwise,
  theme = 'light',
  onUpdateTheme,
  subGroupName = 'Scout Team Alpha',
  subGroupColor = '#ef4444',
  activeSquad,
  currentUserId = 'user_self',
  onLeaveSquad,
  onSquadDeleted,
}) => {
  const [offlineMeshSync, setOfflineMeshSync] = useState(true);
  const [batteryOptimization, setBatteryOptimization] = useState(true);

  // Super Admin & Group Management Modal States
  const [isTransferModalOpen, setIsTransferModalOpen] = useState(false);
  const [transferActionType, setTransferActionType] = useState<'leave' | 'demote_to_member'>('leave');
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isRecoveryOpen, setIsRecoveryOpen] = useState(false);
  const [recoveryKey, setRecoveryKey] = useState('');
  const [recoveryMemberId, setRecoveryMemberId] = useState('');
  const [isRecovering, setIsRecovering] = useState(false);

  // Load squad members for transfer
  const [squadMembers, setSquadMembers] = useState<any[]>(() => {
    try {
      const saved = localStorage.getItem('trailoPS_squad_members');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    const handleSync = () => {
      try {
        const saved = localStorage.getItem('trailoPS_squad_members');
        if (saved) setSquadMembers(JSON.parse(saved));
      } catch {}
    };
    window.addEventListener('trailoPS_squad_members_updated', handleSync);
    return () => window.removeEventListener('trailoPS_squad_members_updated', handleSync);
  }, []);

  const superAdminCount = squadMembers.filter(
    (m) => m.roleHierarchy === 'super_admin' || m.role === 'Super Admin' || m.role === 'super_admin'
  ).length || (userRole === 'super_admin' ? 1 : 0);

  const handleLeaveSquadClick = () => {
    if (userRole === 'super_admin' && superAdminCount <= 1) {
      onShowToast('⚠️ Sole Super Admin: You must appoint an active successor before leaving.');
      setTransferActionType('leave');
      setIsTransferModalOpen(true);
      return;
    }
    onLeaveSquad?.();
    onShowToast('Left expedition squad.');
    onNavigate('gateway');
  };

  const handleExecuteRecovery = async () => {
    if (!recoveryKey.trim() || !recoveryMemberId.trim()) {
      onShowToast('Please provide both the master key and the target member ID.');
      return;
    }
    setIsRecovering(true);
    try {
      const res = await recoverGroupSuperAdmin(
        activeSquad?.id || 'default',
        recoveryMemberId.trim(),
        recoveryKey.trim()
      );
      if (res.success) {
        onShowToast('Platform Recovery: Super Admin restored successfully!');
        setIsRecoveryOpen(false);
        setRecoveryKey('');
        setRecoveryMemberId('');
      } else {
        onShowToast(`Recovery failed: ${res.error || 'Invalid authorization key'}`);
      }
    } catch (err: any) {
      onShowToast(`Recovery error: ${err.message}`);
    } finally {
      setIsRecovering(false);
    }
  };

  const heightM = (profileData.heightCm || 175) / 100;
  const bmi = ((profileData.weightKg || 70) / (heightM * heightM)).toFixed(1);
  const paidPercent = tripBudget > 0 ? Math.min(Math.round((amountPaid / tripBudget) * 100), 100) : 0;

  const handleRoleSelection = (targetRole: UserRole) => {
    // Role Security: Prevent ordinary members from promoting themselves to admin or super_admin
    if (userRole === 'member' && targetRole !== 'member') {
      onShowToast('🔒 Self-promotion denied: Elevation to Admin requires assignment by the expedition commander.');
      return;
    }

    // Mandatory Super Admin Check: Prevent sole Super Admin from demoting themselves without transferring
    if (userRole === 'super_admin' && targetRole !== 'super_admin' && superAdminCount <= 1) {
      onShowToast('⚠️ Constraint: You are the sole Super Admin. Please transfer leadership first.');
      setTransferActionType('demote_to_member');
      setIsTransferModalOpen(true);
      return;
    }

    onUpdateRole?.(targetRole);
    onShowToast(`Role updated to ${targetRole.replace('_', ' ').toUpperCase()}`);
  };

  return (
    <div className="w-full max-w-md mx-auto min-h-screen bg-[#f8faf9] dark:bg-slate-950 text-slate-900 dark:text-slate-100 pb-32 transition-colors duration-200">
      {/* Top Header */}
      <header className="bg-white/95 dark:bg-slate-900/95 backdrop-blur-md sticky top-0 shadow-2xs z-40 border-b border-slate-200 dark:border-slate-800">
        <div className="flex items-center justify-between px-4 w-full h-16 max-w-md mx-auto">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-emerald-600 to-teal-800 text-white flex items-center justify-center shadow-xs">
              <Compass className="w-4 h-4" />
            </div>
            <span className="text-xl font-extrabold tracking-tight text-emerald-950 dark:text-emerald-400">
              Profile &amp; Settings
            </span>
          </div>

          <button
            type="button"
            onClick={() => onNavigate('profile')}
            className="px-3 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 text-xs font-bold flex items-center gap-1 hover:bg-emerald-100 dark:hover:bg-emerald-900 transition-colors cursor-pointer"
          >
            <Edit3 className="w-3.5 h-3.5" />
            <span>Edit Profile</span>
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="px-4 pt-4 space-y-4">
        {/* Profile Card Header */}
        <section className="bg-white dark:bg-slate-900 rounded-3xl p-5 border border-slate-200 dark:border-slate-800 shadow-xs relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-r from-emerald-600 to-teal-600" />
          <div className="flex items-center gap-3.5 mb-4 pt-1">
            <div className="relative">
              <div className="w-16 h-16 rounded-2xl overflow-hidden ring-4 ring-emerald-500/20 shadow-md">
                <img
                  src={
                    profileData.avatarUrl ||
                    'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=200&q=80'
                  }
                  alt={profileData.fullName}
                  className="w-full h-full object-cover"
                />
              </div>
              <span className="absolute -bottom-1 -right-1 w-4 h-4 bg-emerald-500 rounded-full ring-2 ring-white dark:ring-slate-900" />
            </div>

            <div>
              <div className="flex items-center gap-1.5 flex-wrap">
                <h2 className="text-base font-extrabold text-slate-900 dark:text-white">{profileData.fullName}</h2>
                <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 fill-emerald-100 dark:fill-emerald-950" />

                {/* ROLE TAG NEXT TO NAME */}
                {userRole === 'super_admin' ? (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-gradient-to-r from-amber-400 to-amber-500 text-slate-950 shadow-xs flex items-center gap-1 border border-amber-300">
                    <Crown className="w-3 h-3 text-slate-950 fill-current" />
                    <span>SUPER ADMIN</span>
                  </span>
                ) : userRole === 'subgroup_admin' ? (
                  <span
                    className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider text-white shadow-xs flex items-center gap-1"
                    style={{ backgroundColor: subGroupColor || '#ef4444' }}
                  >
                    <Shield className="w-3 h-3 fill-current" />
                    <span>{subGroupName ? `${subGroupName.toUpperCase()} ADMIN` : 'SUB ADMIN'}</span>
                  </span>
                ) : (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                    MEMBER
                  </span>
                )}
              </div>
              <p className="text-xs text-emerald-800 dark:text-emerald-400 font-semibold">{profileData.experienceLevel || 'Intermediate'} Mountaineer</p>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 font-mono mt-0.5">{profileData.phoneNumber || 'Phone not set'}</p>
            </div>
          </div>

          {/* Key Metrics Grid */}
          <div className="grid grid-cols-3 gap-2 pt-2 border-t border-slate-100 dark:border-slate-800 text-center">
            <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-700">
              <span className="text-[10px] text-slate-500 dark:text-slate-400 font-bold block uppercase">Blood Type</span>
              <span className="text-sm font-extrabold text-emerald-800 dark:text-emerald-400">{profileData.bloodGroup || 'O+'}</span>
            </div>
            <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-700">
              <span className="text-[10px] text-slate-500 dark:text-slate-400 font-bold block uppercase">Height / Wt</span>
              <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                {profileData.heightCm || 175}cm · {profileData.weightKg || 70}kg
              </span>
            </div>
            <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-700">
              <span className="text-[10px] text-slate-500 dark:text-slate-400 font-bold block uppercase">Alpine BMI</span>
              <span className="text-sm font-extrabold text-[#0f5238] dark:text-emerald-400">{bmi}</span>
            </div>
          </div>
        </section>

        {/* TRIP BUDGET & PAYMENT PROGRESS */}
        {hasJoinedGroup && (
          <section className="bg-white dark:bg-slate-900 rounded-3xl p-4.5 border-2 border-emerald-500/30 dark:border-emerald-500/40 shadow-xs space-y-3.5 relative overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-emerald-500 via-[#0f5238] to-amber-500" />

            <div className="flex items-center justify-between pt-0.5">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 flex items-center justify-center">
                  <CreditCard className="w-4 h-4" />
                </div>
                <div>
                  <span className="text-[10px] font-extrabold text-emerald-800 dark:text-emerald-400 uppercase tracking-wider block">
                    Expedition Financial Quota
                  </span>
                  <h3 className="text-sm font-extrabold text-slate-900 dark:text-white">
                    Trip Budget: ₹{tripBudget.toLocaleString()}
                  </h3>
                </div>
              </div>

              <span
                className={`text-xs font-black px-2.5 py-0.5 rounded-full ${
                  amountPending === 0
                    ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-900 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700'
                    : 'bg-amber-100 dark:bg-amber-950/60 text-amber-900 dark:text-amber-300 border border-amber-300 dark:border-amber-700'
                }`}
              >
                {amountPending === 0 ? '✓ Paid in Full' : `₹${amountPending.toLocaleString()} Pending`}
              </span>
            </div>

            {/* Visual Dual-Color Amount Bar (Paid vs Pending) */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs font-bold">
                <span className="text-emerald-800 dark:text-emerald-400 flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-xs" />
                  Paid: ₹{amountPaid.toLocaleString()} ({paidPercent}%)
                </span>
                <span className="text-amber-800 dark:text-amber-400 flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-500 shadow-xs" />
                  Pending: ₹{amountPending.toLocaleString()}
                </span>
              </div>

              <div className="w-full h-3.5 rounded-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 overflow-hidden flex shadow-inner">
                <div
                  className="bg-gradient-to-r from-emerald-600 to-[#0f5238] h-full transition-all duration-700"
                  style={{ width: `${paidPercent}%` }}
                />
                <div
                  className="bg-gradient-to-r from-amber-400 to-amber-500 h-full transition-all duration-700"
                  style={{ width: `${100 - paidPercent}%` }}
                />
              </div>
            </div>

            {/* Quick Settle / Splitwise Access */}
            <button
              type="button"
              onClick={onOpenSplitwise}
              className="w-full py-2.5 rounded-xl bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-slate-800 dark:to-slate-800/80 border border-emerald-200 dark:border-slate-700 hover:border-emerald-400 text-xs font-bold text-emerald-950 dark:text-emerald-300 flex items-center justify-center gap-2 transition-all cursor-pointer shadow-2xs active:scale-[0.98]"
            >
              <PieChart className="w-4 h-4 text-emerald-700 dark:text-emerald-400" />
              <span>Open Splitwise Ledger &amp; Settle Dues</span>
              <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
            </button>
          </section>
        )}

        {/* GROUP HIERARCHY & ROLE SECURITY ENFORCEMENT */}
        {hasJoinedGroup && (
          <section className="bg-white dark:bg-slate-900 rounded-3xl p-4 border border-slate-200 dark:border-slate-800 shadow-xs space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
              <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                GROUP ROLES &amp; PERMISSIONS
              </h3>
              <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400">
                Anti Self-Promotion Active
              </span>
            </div>

            <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
              <div className="flex items-center gap-2.5">
                <div
                  className={`w-9 h-9 rounded-xl flex items-center justify-center ${
                    userRole === 'super_admin'
                      ? 'bg-amber-100 dark:bg-amber-950 text-amber-900 dark:text-amber-300'
                      : userRole === 'subgroup_admin'
                      ? 'text-white'
                      : 'bg-emerald-100 dark:bg-emerald-950 text-emerald-900 dark:text-emerald-300'
                  }`}
                  style={userRole === 'subgroup_admin' ? { backgroundColor: subGroupColor } : {}}
                >
                  {userRole === 'super_admin' ? (
                    <Crown className="w-5 h-5 fill-current" />
                  ) : userRole === 'subgroup_admin' ? (
                    <Shield className="w-5 h-5 fill-current" />
                  ) : (
                    <Users className="w-5 h-5" />
                  )}
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 dark:text-slate-400 uppercase font-bold tracking-wide block">
                    YOUR ROLE
                  </span>
                  <h4 className="text-xs font-extrabold text-slate-900 dark:text-white">
                    {userRole === 'super_admin'
                      ? 'Super Admin (Lead Faculty)'
                      : userRole === 'subgroup_admin'
                      ? `${subGroupName} Admin`
                      : 'Expedition Member'}
                  </h4>
                </div>
              </div>

              <span className="text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
                Verified
              </span>
            </div>

            {/* Role Security Enforced Switcher */}
            <div className="pt-1">
              <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-400 block mb-1.5">
                Account Role:
              </label>
              <div className="grid grid-cols-3 gap-1.5">
                {(['member', 'subgroup_admin', 'super_admin'] as const).map((r) => {
                  const isLocked = userRole === 'member' && r !== 'member';
                  return (
                    <button
                      key={r}
                      type="button"
                      onClick={() => handleRoleSelection(r)}
                      className={`py-1.5 px-2 rounded-xl text-[10px] font-bold border transition-all cursor-pointer flex items-center justify-center gap-1 ${
                        userRole === r
                          ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 border-slate-900 dark:border-white shadow-xs'
                          : isLocked
                          ? 'bg-slate-50 dark:bg-slate-800/40 text-slate-400 dark:text-slate-500 border-slate-200 dark:border-slate-800 opacity-70'
                          : 'bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100'
                      }`}
                    >
                      {isLocked && <Lock className="w-2.5 h-2.5 shrink-0" />}
                      <span>{r === 'super_admin' ? 'Super Admin' : r === 'subgroup_admin' ? 'Sub-Admin' : 'Member'}</span>
                    </button>
                  );
                })}
              </div>
              {userRole === 'member' && (
                <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-1.5 flex items-center gap-1">
                  <Lock className="w-3 h-3 text-amber-500 shrink-0" />
                  <span>Only Super Admins can assign group roles.</span>
                </p>
              )}
            </div>
          </section>
        )}

        {/* Medical & Emergency Quick Summary */}
        <section className="bg-white dark:bg-slate-900 rounded-3xl p-4 border border-slate-200 dark:border-slate-800 shadow-xs space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
            <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
              EMERGENCY INFORMATION
            </h3>
            <span className="text-[10px] font-bold text-emerald-800 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950 px-2 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-800">
              Encrypted
            </span>
          </div>

          <div className="space-y-2">
            <div className="flex items-start gap-2.5 p-2.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-700">
              <Heart className="w-4 h-4 text-rose-600 mt-0.5 shrink-0" />
              <div className="flex-1">
                <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase">Emergency Contact</span>
                <p className="text-xs font-extrabold text-slate-900 dark:text-slate-100">
                  {profileData.guardianName || 'Guardian'} · {profileData.emergencyNumber || 'Not provided'}
                </p>
              </div>
            </div>

            <div className="flex items-start gap-2.5 p-2.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-700">
              <Pill className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" />
              <div className="flex-1">
                <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase">
                  Medicines &amp; Allergies
                </span>
                <p className="text-xs font-extrabold text-slate-900 dark:text-slate-100">
                  {profileData.medications || 'No critical medications recorded'}
                </p>
                {profileData.allergies && profileData.allergies.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-1">
                    {profileData.allergies.map((a: any) => (
                      <span
                        key={a.id || a.name}
                        className="text-[9px] font-bold px-1.5 py-0.5 rounded-md bg-rose-100 dark:bg-rose-950 text-rose-800 dark:text-rose-300 border border-rose-200 dark:border-rose-800"
                      >
                        {a.name}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </section>

        {/* Alpine Mesh & Battery Sync */}
        <section className="bg-white dark:bg-slate-900 rounded-3xl p-4 border border-slate-200 dark:border-slate-800 shadow-xs space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
            <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
              DEVICE SETTINGS
            </h3>
            <span className="text-[10px] font-bold text-emerald-800 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950 px-2 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-800">
              Mesh Active
            </span>
          </div>

          <div className="flex items-center justify-between py-1">
            <div className="space-y-0.5">
              <span className="text-xs font-bold text-slate-900 dark:text-white block">Offline LoRa Mesh Sync</span>
              <span className="text-[11px] text-slate-500 dark:text-slate-400 block">
                Automatically transmits telemetry across nearby units without cellular towers.
              </span>
            </div>
            <button
              type="button"
              onClick={() => {
                setOfflineMeshSync(!offlineMeshSync);
                onShowToast(offlineMeshSync ? 'LoRa sync paused' : 'LoRa sync active');
              }}
              className={`w-11 h-6 rounded-full transition-colors relative flex items-center px-0.5 cursor-pointer ${
                offlineMeshSync ? 'bg-emerald-600' : 'bg-slate-300 dark:bg-slate-700'
              }`}
            >
              <span
                className={`w-5 h-5 rounded-full bg-white shadow-md transform transition-transform ${
                  offlineMeshSync ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>

          <div className="flex items-center justify-between py-1 border-t border-slate-100 dark:border-slate-800 pt-2.5">
            <div className="space-y-0.5">
              <span className="text-xs font-bold text-slate-900 dark:text-white block">Battery Saver</span>
              <span className="text-[11px] text-slate-500 dark:text-slate-400 block">
                Reduces GPS updates to save battery in cold conditions.
              </span>
            </div>
            <button
              type="button"
              onClick={() => {
                setBatteryOptimization(!batteryOptimization);
                onShowToast(
                  batteryOptimization
                    ? 'Standard polling active'
                    : 'Battery conservation mode active'
                );
              }}
              className={`w-11 h-6 rounded-full transition-colors relative flex items-center px-0.5 cursor-pointer ${
                batteryOptimization ? 'bg-emerald-600' : 'bg-slate-300 dark:bg-slate-700'
              }`}
            >
              <span
                className={`w-5 h-5 rounded-full bg-white shadow-md transform transition-transform ${
                  batteryOptimization ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>
        </section>

        {/* DISPLAY THEME: DARK MODE / LIGHT MODE / SYSTEM */}
        <section className="bg-white dark:bg-slate-900 rounded-3xl p-4 border border-slate-200 dark:border-slate-800 shadow-xs space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
            <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-1.5">
              <Sun className="w-4 h-4 text-amber-500" />
              <span>THEME</span>
            </h3>
            <span className="text-[10px] font-bold text-emerald-800 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950 px-2 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-800">
              {theme === 'dark' ? 'Dark Theme' : theme === 'light' ? 'Light Theme' : 'System Theme'}
            </span>
          </div>

          <div className="grid grid-cols-3 gap-2">
            {[
              { id: 'light', label: 'Light Mode', icon: Sun, color: 'text-amber-500' },
              { id: 'dark', label: 'Dark Mode', icon: Moon, color: 'text-indigo-400' },
              { id: 'system', label: 'System Default', icon: Monitor, color: 'text-slate-500' },
            ].map((t) => {
              const Icon = t.icon;
              const isSelected = theme === t.id;
              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => {
                    onUpdateTheme?.(t.id as any);
                    onShowToast(`Theme switched to ${t.label}!`);
                  }}
                  className={`p-3 rounded-2xl border flex flex-col items-center justify-center gap-1.5 transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-slate-900 dark:bg-emerald-600 text-white border-slate-900 dark:border-emerald-500 shadow-md ring-2 ring-emerald-400/40'
                      : 'bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-750'
                  }`}
                >
                  <Icon className={`w-5 h-5 ${isSelected ? 'text-emerald-400 dark:text-white' : t.color}`} />
                  <span className="text-[11px] font-bold">{t.label}</span>
                </button>
              );
            })}
          </div>
        </section>

        {/* EXPEDITION SQUAD MANAGEMENT & DANGER ZONE */}
        {hasJoinedGroup && (
          <section className="bg-white dark:bg-slate-900 rounded-3xl p-5 border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 flex items-center justify-center">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-extrabold text-slate-900 dark:text-white">
                    {activeSquad?.name || 'Active Expedition Squad'}
                  </h3>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    Role: <span className="font-bold uppercase text-emerald-700 dark:text-emerald-400">{userRole.replace('_', ' ')}</span> · {superAdminCount} Super Admin(s)
                  </p>
                </div>
              </div>

              {userRole === 'super_admin' && (
                <span className="px-2.5 py-1 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-700 dark:text-amber-300 text-[10px] font-black uppercase flex items-center gap-1">
                  <Crown className="w-3 h-3 text-amber-600" />
                  Commander
                </span>
              )}
            </div>

            {/* Leadership Actions */}
            <div className="space-y-2">
              {userRole === 'super_admin' && (
                <button
                  type="button"
                  onClick={() => {
                    setTransferActionType('demote_to_member');
                    setIsTransferModalOpen(true);
                  }}
                  className="w-full py-2.5 px-3.5 rounded-2xl bg-amber-50 dark:bg-amber-950/40 hover:bg-amber-100 text-amber-800 dark:text-amber-200 border border-amber-200 dark:border-amber-800/60 font-bold text-xs flex items-center justify-between transition-all cursor-pointer"
                >
                  <span className="flex items-center gap-2">
                    <Crown className="w-4 h-4 text-amber-600" />
                    <span>Transfer Group Ownership</span>
                  </span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              )}

              <button
                type="button"
                onClick={handleLeaveSquadClick}
                className="w-full py-2.5 px-3.5 rounded-2xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 font-bold text-xs flex items-center justify-between transition-all cursor-pointer"
              >
                <span>Leave Group</span>
                <span className="text-[10px] text-slate-400 font-normal">
                  {userRole === 'super_admin' && superAdminCount <= 1 ? '(Requires successor transfer)' : ''}
                </span>
              </button>
            </div>

            {/* SUPER ADMIN DANGER ZONE: DELETE GROUP */}
            {userRole === 'super_admin' && (
              <div className="p-4 bg-rose-50/70 dark:bg-rose-950/30 rounded-2xl border border-rose-200 dark:border-rose-900/60 space-y-2.5 mt-2">
                <div className="flex items-center gap-2 text-rose-700 dark:text-rose-300">
                  <AlertOctagon className="w-4 h-4 shrink-0" />
                  <span className="text-xs font-black uppercase tracking-wider">DANGER ZONE</span>
                </div>
                <p className="text-[11px] text-slate-600 dark:text-slate-300 leading-relaxed">
                  Permanently delete this group and its shared data for all members.
                </p>
                <button
                  type="button"
                  onClick={() => setIsDeleteModalOpen(true)}
                  className="w-full py-2.5 px-3 rounded-xl bg-rose-600 hover:bg-rose-700 active:scale-[0.98] text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-sm transition-all cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Delete Expedition Group Permanently</span>
                </button>
              </div>
            )}
          </section>
        )}

        {/* PLATFORM EMERGENCY RECOVERY CONSOLE */}
        <section className="bg-white dark:bg-slate-900 rounded-3xl p-4 border border-slate-200 dark:border-slate-800 shadow-xs space-y-3">
          <button
            type="button"
            onClick={() => setIsRecoveryOpen(!isRecoveryOpen)}
            className="w-full flex items-center justify-between text-left cursor-pointer"
          >
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 flex items-center justify-center">
                <KeyRound className="w-4 h-4 text-emerald-600" />
              </div>
              <div>
                <h3 className="text-xs font-extrabold text-slate-900 dark:text-white">
                  Admin Recovery
                </h3>
                <p className="text-[10px] text-slate-500">
                  Restore admin access to groups without an admin
                </p>
              </div>
            </div>
            <span className="text-[10px] font-bold text-slate-400">
              {isRecoveryOpen ? 'Hide' : 'Open'}
            </span>
          </button>

          {isRecoveryOpen && (
            <div className="pt-2 border-t border-slate-100 dark:border-slate-800 space-y-2.5 text-xs">
              <p className="text-[11px] text-slate-600 dark:text-slate-400">
                In the event that legacy data or an administrative error leaves a squad with zero Super Admins, an authorized platform administrator can assign a Super Admin using the master recovery key.
              </p>

              <div className="space-y-1 text-left">
                <label className="font-bold text-slate-700 dark:text-slate-300">
                  Platform Master Key
                </label>
                <input
                  type="password"
                  placeholder="Enter Platform Master Key"
                  value={recoveryKey}
                  onChange={(e) => setRecoveryKey(e.target.value)}
                  className="w-full h-10 px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-900 dark:text-white"
                />
              </div>

              <div className="space-y-1 text-left">
                <label className="font-bold text-slate-700 dark:text-slate-300">
                  Target Member ID to Promote
                </label>
                <input
                  type="text"
                  placeholder="e.g. Member ID or Name"
                  value={recoveryMemberId}
                  onChange={(e) => setRecoveryMemberId(e.target.value)}
                  className="w-full h-10 px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-900 dark:text-white"
                />
              </div>

              <button
                type="button"
                disabled={isRecovering}
                onClick={handleExecuteRecovery}
                className="w-full py-2.5 rounded-xl bg-slate-900 dark:bg-emerald-600 hover:bg-slate-800 text-white font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                <span>{isRecovering ? 'Restoring Authority...' : 'Verify Key & Restore Super Admin'}</span>
              </button>
            </div>
          )}
        </section>



        {/* DEVELOPER ATTRIBUTION CARD */}
        <section className="rounded-3xl p-4 bg-gradient-to-br from-slate-900 via-emerald-950 to-slate-950 text-white shadow-lg border border-emerald-500/30 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 rounded-full blur-2xl pointer-events-none" />

          <div className="flex items-start gap-3.5 relative z-10">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-emerald-500 to-teal-400 text-slate-950 flex items-center justify-center shrink-0 shadow-md">
              <Sparkles className="w-6 h-6" />
            </div>

            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-extrabold uppercase tracking-widest text-emerald-400">
                  Expedition Command
                </span>
                <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-[10px] font-bold border border-emerald-500/30">
                  Production V1
                </span>
              </div>
              <h3 className="text-base font-black text-white tracking-tight">TRAIL OPS</h3>
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-500/20 border border-emerald-400/30 text-emerald-300 text-xs font-bold">
                <Code2 className="w-3.5 h-3.5 text-emerald-400" />
                <span>Developed &amp; Maintained by:</span>
                <span className="text-white font-extrabold">Pratap Paul</span>
              </div>
              <div className="flex items-center gap-1.5 text-xs text-emerald-200/90 font-semibold pt-0.5">
                <GraduationCap className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span>CS Student,</span>
                <span className="text-white font-bold">Sri Krishna College, Nadia</span>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed mt-1">
                Expedition management platform with secure group authentication, live attendance roll call, private 4K media vault, and real-time offline sync.
              </p>
            </div>
          </div>
        </section>

        {/* Sign Out Action Button */}
        <button
          type="button"
          onClick={onSignOut}
          className="w-full py-3.5 rounded-2xl bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 dark:hover:bg-rose-950/70 border border-rose-200 dark:border-rose-900/60 text-rose-700 dark:text-rose-300 font-bold text-xs flex items-center justify-center gap-2 transition-all active:scale-[0.98] cursor-pointer shadow-xs"
        >
          <LogOut className="w-4 h-4" />
          <span>Sign Out</span>
        </button>
      </main>

      {/* Transfer Super Admin Modal */}
      <TransferSuperAdminModal
        isOpen={isTransferModalOpen}
        onClose={() => setIsTransferModalOpen(false)}
        groupId={activeSquad?.id || 'default'}
        currentUserId={currentUserId}
        members={squadMembers}
        actionType={transferActionType}
        onTransferSuccess={() => {
          if (transferActionType === 'leave') {
            onLeaveSquad?.();
            onNavigate('gateway');
          } else {
            onUpdateRole?.('member');
          }
        }}
        onShowToast={onShowToast}
      />

      {/* Delete Group Modal */}
      <DeleteGroupModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        groupId={activeSquad?.id || 'default'}
        groupName={activeSquad?.name || 'Alpine Expedition Squad'}
        onDeleted={() => {
          onSquadDeleted?.();
          onNavigate('gateway');
        }}
        onShowToast={onShowToast}
      />
    </div>
  );
};
