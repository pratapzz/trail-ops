import React, { useState } from 'react';
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
} from 'lucide-react';
import { ProfileFormData, ScreenType, UserRole } from '../types';

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
}) => {
  const [offlineMeshSync, setOfflineMeshSync] = useState(true);
  const [batteryOptimization, setBatteryOptimization] = useState(true);

  const heightM = (profileData.heightCm || 175) / 100;
  const bmi = ((profileData.weightKg || 70) / (heightM * heightM)).toFixed(1);
  const paidPercent = tripBudget > 0 ? Math.min(Math.round((amountPaid / tripBudget) * 100), 100) : 0;

  const handleRoleSelection = (targetRole: UserRole) => {
    // Role Security: Prevent ordinary members from promoting themselves to admin or super_admin
    if (userRole === 'member' && targetRole !== 'member') {
      onShowToast('🔒 Self-promotion denied: Elevation to Admin requires assignment by the expedition commander.');
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
                  src={profileData.avatarUrl}
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
                Group Hierarchy &amp; Role Security
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
                    Your Assigned Rank
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
                Role Permission Level:
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
                  <span>Ordinary members cannot elevate their own role (enforced by RLS trigger).</span>
                </p>
              )}
            </div>
          </section>
        )}

        {/* Medical & Emergency Quick Summary */}
        <section className="bg-white dark:bg-slate-900 rounded-3xl p-4 border border-slate-200 dark:border-slate-800 shadow-xs space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
            <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
              Emergency &amp; Medical Record
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
                  Medications &amp; Allergies
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
              Telemetry &amp; Hardware
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
              <span className="text-xs font-bold text-slate-900 dark:text-white block">Alpine Battery Conservation</span>
              <span className="text-[11px] text-slate-500 dark:text-slate-400 block">
                Optimizes GPS polling intervals from 1s to 5s in sub-zero ridge conditions.
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
              <span>Display Theme Mode</span>
            </h3>
            <span className="text-[10px] font-bold text-emerald-800 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950 px-2 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-800">
              {theme === 'dark' ? 'Dark Theme' : theme === 'light' ? 'Light Theme' : 'System Theme'}
            </span>
          </div>

          <div className="grid grid-cols-3 gap-2">
            {[
              { id: 'light', label: 'Light Mode', icon: Sun, color: 'text-amber-500' },
              { id: 'dark', label: 'Dark Mode', icon: Moon, color: 'text-indigo-400' },
              { id: 'system', label: 'Auto System', icon: Monitor, color: 'text-slate-500' },
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
                <span>Architect &amp; Developer:</span>
                <span className="text-white font-extrabold">Pratap Paul</span>
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
          <span>Sign Out of TRAIL OPS</span>
        </button>
      </main>
    </div>
  );
};
