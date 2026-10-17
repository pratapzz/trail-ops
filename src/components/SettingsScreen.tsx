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

  const heightM = profileData.heightCm / 100;
  const bmi = (profileData.weightKg / (heightM * heightM)).toFixed(1);
  const paidPercent = tripBudget > 0 ? Math.min(Math.round((amountPaid / tripBudget) * 100), 100) : 0;

  return (
    <div className="w-full max-w-md mx-auto min-h-screen bg-[#f8faf9] text-slate-900 pb-32">
      {/* Top Header */}
      <header className="bg-white/95 backdrop-blur-md sticky top-0 shadow-2xs z-40 border-b border-slate-200">
        <div className="flex items-center justify-between px-4 w-full h-16 max-w-md mx-auto">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-emerald-600 to-teal-800 text-white flex items-center justify-center shadow-xs">
              <Compass className="w-4 h-4" />
            </div>
            <span className="text-xl font-extrabold tracking-tight text-emerald-950">
              Profile &amp; Settings
            </span>
          </div>

          <button
            type="button"
            onClick={() => onNavigate('profile')}
            className="px-3 py-1 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs font-bold flex items-center gap-1 hover:bg-emerald-100 transition-colors cursor-pointer"
          >
            <Edit3 className="w-3.5 h-3.5" />
            <span>Edit Profile</span>
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="px-4 pt-4 space-y-4">
        {/* Profile Card Header */}
        <section className="bg-white rounded-3xl p-5 border border-slate-200 shadow-xs relative overflow-hidden">
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
              <span className="absolute -bottom-1 -right-1 w-4 h-4 bg-emerald-500 rounded-full ring-2 ring-white" />
            </div>

            <div>
              <div className="flex items-center gap-1.5 flex-wrap">
                <h2 className="text-base font-extrabold text-slate-900">{profileData.fullName}</h2>
                <CheckCircle2 className="w-4 h-4 text-emerald-600 fill-emerald-100" />

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
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-slate-100 text-slate-700 border border-slate-200">
                    MEMBER
                  </span>
                )}
              </div>
              <p className="text-xs text-emerald-800 font-semibold">{profileData.experienceLevel} Mountaineer</p>
              <p className="text-[11px] text-slate-500 font-mono mt-0.5">{profileData.phoneNumber}</p>
            </div>
          </div>

          {/* Key Metrics Grid */}
          <div className="grid grid-cols-3 gap-2 pt-2 border-t border-slate-100 text-center">
            <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100">
              <span className="text-[10px] text-slate-500 font-bold block uppercase">Blood Type</span>
              <span className="text-sm font-extrabold text-emerald-800">{profileData.bloodGroup}</span>
            </div>
            <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100">
              <span className="text-[10px] text-slate-500 font-bold block uppercase">Height / Wt</span>
              <span className="text-xs font-bold text-slate-800">
                {profileData.heightCm}cm · {profileData.weightKg}kg
              </span>
            </div>
            <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100">
              <span className="text-[10px] text-slate-500 font-bold block uppercase">Alpine BMI</span>
              <span className="text-sm font-extrabold text-[#0f5238]">{bmi}</span>
            </div>
          </div>
        </section>

        {/* TRIP BUDGET & PAYMENT PROGRESS (Shown after joining a group) */}
        {hasJoinedGroup && (
          <section className="bg-white rounded-3xl p-4.5 border-2 border-emerald-500/30 shadow-xs space-y-3.5 relative overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-emerald-500 via-[#0f5238] to-amber-500" />

            <div className="flex items-center justify-between pt-0.5">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center">
                  <CreditCard className="w-4 h-4" />
                </div>
                <div>
                  <span className="text-[10px] font-extrabold text-emerald-800 uppercase tracking-wider block">
                    Expedition Financial Quota
                  </span>
                  <h3 className="text-sm font-extrabold text-slate-900">
                    Trip Budget: ₹{tripBudget.toLocaleString()}
                  </h3>
                </div>
              </div>

              <span
                className={`text-xs font-black px-2.5 py-0.5 rounded-full ${
                  amountPending === 0
                    ? 'bg-emerald-100 text-emerald-900 border border-emerald-300'
                    : 'bg-amber-100 text-amber-900 border border-amber-300'
                }`}
              >
                {amountPending === 0 ? '✓ Paid in Full' : `₹${amountPending.toLocaleString()} Pending`}
              </span>
            </div>

            {/* Visual Dual-Color Amount Bar (Paid vs Pending) */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs font-bold">
                <span className="text-emerald-800 flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-xs" />
                  Paid: ₹{amountPaid.toLocaleString()} ({paidPercent}%)
                </span>
                <span className="text-amber-800 flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-500 shadow-xs" />
                  Pending: ₹{amountPending.toLocaleString()}
                </span>
              </div>

              <div className="w-full h-3.5 rounded-full bg-slate-100 border border-slate-200 overflow-hidden flex shadow-inner">
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
              className="w-full py-2.5 rounded-xl bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-200 hover:border-emerald-400 text-xs font-bold text-emerald-950 flex items-center justify-center gap-2 transition-all cursor-pointer shadow-2xs active:scale-[0.98]"
            >
              <PieChart className="w-4 h-4 text-emerald-700" />
              <span>Open Splitwise Ledger &amp; Settle Dues</span>
              <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
            </button>
          </section>
        )}

        {/* GROUP HIERARCHY & SUB-GROUP BADGE */}
        {hasJoinedGroup && (
          <section className="bg-white rounded-3xl p-4 border border-slate-200 shadow-xs space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                Group Hierarchy &amp; Sub-Group
              </h3>
              <span className="text-[10px] font-bold text-slate-500">
                Squad Protocol
              </span>
            </div>

            <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 border border-slate-200">
              <div className="flex items-center gap-2.5">
                <div
                  className={`w-9 h-9 rounded-xl flex items-center justify-center ${
                    userRole === 'super_admin'
                      ? 'bg-amber-100 text-amber-900'
                      : userRole === 'subgroup_admin'
                      ? 'bg-sky-100 text-sky-900'
                      : 'bg-emerald-100 text-emerald-900'
                  }`}
                >
                  {userRole === 'super_admin' ? (
                    <Crown className="w-5 h-5 text-amber-800" />
                  ) : userRole === 'subgroup_admin' ? (
                    <Shield className="w-5 h-5 text-sky-800" />
                  ) : (
                    <Users className="w-5 h-5 text-emerald-800" />
                  )}
                </div>
                <div>
                  <span className="text-xs font-bold text-slate-900 block">
                    {userRole === 'super_admin'
                      ? 'Super Admin (Faculty Lead)'
                      : userRole === 'subgroup_admin'
                      ? 'Sub-Group Admin (Team Lead)'
                      : 'Expedition Member'}
                  </span>
                  <span className="text-[10px] text-slate-500 block">
                    {userRole === 'super_admin'
                      ? 'Full Drive Approval & Split Permissions'
                      : userRole === 'subgroup_admin'
                      ? 'Team Split & Excursion Lead'
                      : 'Upload Requests & Settle Dues'}
                  </span>
                </div>
              </div>

              {/* Sub-group name colored badge */}
              {subGroupName && (
                <span
                  className="px-2.5 py-1 rounded-full text-[10px] font-black uppercase text-white shadow-2xs"
                  style={{ backgroundColor: subGroupColor }}
                >
                  {subGroupName}
                </span>
              )}
            </div>

            {/* Interactive Role Switcher for Testing */}
            <div className="pt-1">
              <label className="text-[11px] font-semibold text-slate-600 block mb-1.5">
                Switch Role (Simulate Hierarchy Permissions):
              </label>
              <div className="grid grid-cols-3 gap-1.5">
                {(['member', 'subgroup_admin', 'super_admin'] as const).map((r) => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => {
                      onUpdateRole?.(r);
                      onShowToast(
                        r === 'super_admin'
                          ? 'Switched to Super Admin! Faculty approvals & splits enabled.'
                          : r === 'subgroup_admin'
                          ? 'Switched to Sub-Group Admin!'
                          : 'Switched to Member role!'
                      );
                    }}
                    className={`py-1.5 px-2 rounded-xl text-[10px] font-bold border transition-all cursor-pointer ${
                      userRole === r
                        ? 'bg-slate-900 text-white border-slate-900 shadow-xs'
                        : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    {r === 'super_admin' ? '👑 Super Admin' : r === 'subgroup_admin' ? '⚡ Sub-Admin' : '👤 Member'}
                  </button>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* Medical & Emergency Quick Summary */}
        <section className="bg-white rounded-3xl p-4 border border-slate-200 shadow-xs space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100">
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
              Emergency &amp; Medical Record
            </h3>
            <span className="text-[10px] font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
              Synced to LoRa
            </span>
          </div>

          <div className="space-y-2 text-xs">
            <div className="flex items-center justify-between p-2.5 rounded-xl bg-rose-50/70 border border-rose-200/80">
              <div className="flex items-center gap-2">
                <ShieldAlert className="w-4 h-4 text-rose-600" />
                <span className="font-semibold text-rose-950">24/7 Rapid SOS Relay:</span>
              </div>
              <span className="font-mono font-bold text-rose-700">{profileData.emergencyNumber}</span>
            </div>

            <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 border border-slate-100">
              <span className="text-slate-600">Primary Guardian:</span>
              <span className="font-bold text-slate-900">{profileData.guardianName}</span>
            </div>

            <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100 space-y-1.5">
              <span className="text-[11px] text-slate-500 font-semibold block">Allergies:</span>
              <div className="flex flex-wrap gap-1.5">
                {profileData.allergies.map((allergy) => (
                  <span
                    key={allergy.id}
                    className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-300"
                  >
                    {allergy.name} ({allergy.severity})
                  </span>
                ))}
              </div>
            </div>

            <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 border border-slate-100">
              <span className="text-slate-600">Prescribed Meds:</span>
              <span className="font-semibold text-slate-900">{profileData.medications}</span>
            </div>
          </div>
        </section>

        {/* Trail Hardware & Sync Preferences */}
        <section className="bg-white rounded-3xl p-4 border border-slate-200 shadow-xs space-y-3">
          <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider pb-2 border-b border-slate-100">
            Hardware &amp; Mesh Preferences
          </h3>

          <div className="flex items-center justify-between py-1">
            <div className="space-y-0.5">
              <span className="text-xs font-bold text-slate-900 block">Offline LoRa Mesh Sync</span>
              <span className="text-[11px] text-slate-500 block">
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
                offlineMeshSync ? 'bg-emerald-600' : 'bg-slate-300'
              }`}
            >
              <span
                className={`w-5 h-5 rounded-full bg-white shadow-md transform transition-transform ${
                  offlineMeshSync ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>

          <div className="flex items-center justify-between py-1 border-t border-slate-100 pt-2.5">
            <div className="space-y-0.5">
              <span className="text-xs font-bold text-slate-900 block">Alpine Battery Conservation</span>
              <span className="text-[11px] text-slate-500 block">
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
                batteryOptimization ? 'bg-emerald-600' : 'bg-slate-300'
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

        {/* DISPLAY THEME: DARK MODE / LIGHT MODE / SYSTEM (Request 6) */}
        <section className="bg-white rounded-3xl p-4 border border-slate-200 shadow-xs space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100">
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
              <Sun className="w-4 h-4 text-amber-500" />
              <span>Display Theme Mode</span>
            </h3>
            <span className="text-[10px] font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
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
                      ? 'bg-slate-900 text-white border-slate-900 shadow-md ring-2 ring-emerald-400/40'
                      : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  <Icon className={`w-5 h-5 ${isSelected ? 'text-emerald-400' : t.color}`} />
                  <span className="text-[11px] font-bold">{t.label}</span>
                </button>
              );
            })}
          </div>
        </section>

        {/* DEVELOPER ATTRIBUTION CARD - Designed & Developed by Pratap Paul */}
        <section className="rounded-3xl p-4 bg-gradient-to-br from-slate-900 via-emerald-950 to-slate-950 text-white shadow-lg border border-emerald-500/30 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 rounded-full blur-2xl pointer-events-none" />

          <div className="flex items-start gap-3.5 relative z-10">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-emerald-500 to-teal-400 text-slate-950 flex items-center justify-center shrink-0 shadow-md">
              <Award className="w-6 h-6 stroke-[2.2]" />
            </div>
            <div>
              <div className="flex items-center gap-1.5 mb-0.5">
                <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400 bg-emerald-500/20 px-2 py-0.5 rounded-full border border-emerald-400/30">
                  Creator Credit
                </span>
                <span className="text-[10px] text-slate-400">TrailoPS V1</span>
              </div>
              <h3 className="text-sm font-black text-white tracking-tight">
                Designed &amp; Developed by Pratap Paul
              </h3>
              <p className="text-[11px] text-slate-300 mt-1 leading-relaxed">
                Engineered with tactical precision for mountaineers, high-altitude expeditions, and SAR teams. Powered by React, Tailwind CSS, and LoRa mesh telemetry.
              </p>
            </div>
          </div>

          <div className="mt-3 pt-3 border-t border-white/10 flex items-center justify-between text-[11px] text-emerald-300 font-medium">
            <span className="flex items-center gap-1">
              <Code2 className="w-3.5 h-3.5 text-emerald-400" />
              <span>Full-Stack Alpine Ops</span>
            </span>
            <span className="flex items-center gap-1 text-slate-400">
              <span>Crafted with</span>
              <Heart className="w-3 h-3 text-rose-500 fill-rose-500" />
              <span>for outdoor safety</span>
            </span>
          </div>
        </section>

        {/* Account / Sign Out Action */}
        <div className="pt-2">
          <button
            type="button"
            onClick={onSignOut}
            className="w-full py-3.5 rounded-2xl bg-slate-100 hover:bg-rose-50 text-rose-700 hover:text-rose-800 text-xs font-bold border border-slate-200 hover:border-rose-300 transition-all flex items-center justify-center gap-2 active:scale-95 cursor-pointer"
          >
            <LogOut className="w-4 h-4" />
            <span>Sign Out of TrailoPS</span>
          </button>
        </div>
      </main>
    </div>
  );
};
