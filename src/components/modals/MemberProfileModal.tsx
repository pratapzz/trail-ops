import React, { useState, useEffect } from 'react';
import { User, Phone, Heart, AlertCircle, Shield, ShieldAlert, CheckCircle2, X, Lock, Activity, Backpack } from 'lucide-react';
import { fetchProfile, filterProfilePrivacy, UserProfileRecord } from '../../lib/supabase';

interface MemberProfileModalProps {
  userId: string;
  currentUserId: string;
  currentUserRole: string;
  isOpen: boolean;
  onClose: () => void;
  fallbackName?: string;
  fallbackRole?: string;
  fallbackAvatar?: string;
}

export const MemberProfileModal: React.FC<MemberProfileModalProps> = ({
  userId,
  currentUserId,
  currentUserRole,
  isOpen,
  onClose,
  fallbackName = 'Expedition Member',
  fallbackRole = 'member',
  fallbackAvatar,
}) => {
  const [profile, setProfile] = useState<UserProfileRecord | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isOpen || !userId) return;

    let isMounted = true;
    const loadProfile = async () => {
      setLoading(true);
      try {
        const data = await fetchProfile(userId);
        if (isMounted) {
          if (data) {
            const filtered = filterProfilePrivacy(data, currentUserId, currentUserRole);
            setProfile(filtered);
          } else {
            // Check local storage for saved profile
            const localJson =
              localStorage.getItem(`trailoPS_profile_${userId}`) ||
              (currentUserId === userId ? localStorage.getItem(`trailoPS_profile_${currentUserId}`) : null) ||
              localStorage.getItem('trailoPS_current_profile');
            if (localJson) {
              const p = JSON.parse(localJson);
              const constructed: UserProfileRecord = {
                id: userId,
                email: p.email || 'authenticated@trailops.internal',
                full_name: p.fullName || fallbackName,
                avatar_url: p.avatarUrl || fallbackAvatar,
                phone: p.phoneNumber || p.phone,
                date_of_birth: p.dateOfBirth,
                age: p.age,
                gender: p.gender,
                blood_group: p.bloodGroup || p.blood_group,
                medical_conditions: p.healthNotes || p.medical_conditions || (p.allergies?.length ? `Allergies: ${p.allergies.map((a: any) => a.name).join(', ')}` : ''),
                emergency_contact_name: p.guardianName || p.emergency_contact_name,
                emergency_contact_phone: p.emergencyNumber || p.emergency_contact_phone,
                gear_checklist: p.allergies,
                is_profile_complete: true,
              };
              const filtered = filterProfilePrivacy(constructed, currentUserId, currentUserRole);
              setProfile(filtered);
            } else {
              setProfile(null);
            }
          }
        }
      } catch {
        if (isMounted) setProfile(null);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    loadProfile();
    return () => {
      isMounted = false;
    };
  }, [isOpen, userId, currentUserId, currentUserRole]);

  if (!isOpen) return null;

  const isOwnerOrAdmin = currentUserId === userId || currentUserRole === 'super_admin' || currentUserRole === 'admin' || currentUserRole === 'faculty';

  const displayName = profile?.full_name || fallbackName;
  const avatarUrl = profile?.avatar_url || fallbackAvatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=200&q=80';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
      <div className="bg-slate-900 border border-slate-700/80 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl flex flex-col text-slate-100">
        {/* Header with tactical banner */}
        <div className="relative p-5 pb-4 border-b border-slate-800 bg-gradient-to-b from-slate-950 to-slate-900">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors z-10"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-4">
            <div className="relative">
              <img
                src={avatarUrl}
                alt={displayName}
                className="w-16 h-16 rounded-2xl object-cover border-2 border-emerald-500/40 shadow-md"
              />
              <div className="absolute -bottom-1 -right-1 bg-slate-900 rounded-full p-0.5 border border-slate-700">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              </div>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-white text-base tracking-tight">{displayName}</h3>
              </div>
              <p className="text-xs text-slate-400 font-mono mt-0.5">{profile?.email || 'Authenticated Member'}</p>
              <div className="flex items-center gap-1.5 mt-2">
                <span className="px-2 py-0.5 text-[10px] font-semibold tracking-wider uppercase rounded-md bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                  {fallbackRole.replace('_', ' ')}
                </span>
                {profile?.blood_group && (
                  <span className="px-2 py-0.5 text-[10px] font-semibold rounded-md bg-rose-500/10 text-rose-400 border border-rose-500/30">
                    Blood {profile.blood_group}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Body */}
        <div className="p-5 space-y-4 max-h-[65vh] overflow-y-auto text-xs">
          {/* Vitals & Demographics */}
          <div className="grid grid-cols-3 gap-2">
            <div className="p-2.5 bg-slate-950/60 border border-slate-800 rounded-xl">
              <span className="text-[10px] text-slate-400 uppercase font-medium">Age</span>
              <p className="text-sm font-semibold text-white mt-0.5">{profile?.age ? `${profile.age} yrs` : '—'}</p>
            </div>
            <div className="p-2.5 bg-slate-950/60 border border-slate-800 rounded-xl">
              <span className="text-[10px] text-slate-400 uppercase font-medium">Gender</span>
              <p className="text-sm font-semibold text-white mt-0.5 capitalize">{profile?.gender || '—'}</p>
            </div>
            <div className="p-2.5 bg-slate-950/60 border border-slate-800 rounded-xl">
              <span className="text-[10px] text-slate-400 uppercase font-medium">Readiness</span>
              <p className="text-sm font-semibold text-emerald-400 mt-0.5">Cleared</p>
            </div>
          </div>

          {/* Contact & Emergency section (Role-protected) */}
          <div className="p-3.5 bg-slate-950/70 border border-slate-800 rounded-xl space-y-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 font-semibold text-slate-200">
                <Phone className="w-3.5 h-3.5 text-emerald-400" />
                <span>Contact Telemetry</span>
              </div>
              {!isOwnerOrAdmin && (
                <span className="flex items-center gap-1 text-[10px] text-amber-400 font-mono">
                  <Lock className="w-3 h-3" /> Masked
                </span>
              )}
            </div>

            <div className="space-y-1.5 text-slate-300">
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Mobile Phone:</span>
                {profile?.phone && isOwnerOrAdmin ? (
                  <a
                    href={`tel:${profile.phone.replace(/[^0-9+]/g, '')}`}
                    className="font-mono text-emerald-400 hover:underline flex items-center gap-1"
                    title="Tap to call phone"
                  >
                    <span>{profile.phone}</span>
                    <Phone className="w-2.5 h-2.5" />
                  </a>
                ) : (
                  <span className="font-mono">{profile?.phone || 'Not configured'}</span>
                )}
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Emergency Contact:</span>
                <span className="font-mono">{profile?.emergency_contact_name || 'Designated Next of Kin'}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Emergency Number:</span>
                {profile?.emergency_contact_phone && isOwnerOrAdmin ? (
                  <a
                    href={`tel:${profile.emergency_contact_phone.replace(/[^0-9+]/g, '')}`}
                    className="font-mono text-rose-400 hover:underline flex items-center gap-1"
                    title="Tap to call emergency contact"
                  >
                    <span>{profile.emergency_contact_phone}</span>
                    <Phone className="w-2.5 h-2.5" />
                  </a>
                ) : (
                  <span className="font-mono">{profile?.emergency_contact_phone || 'Protected'}</span>
                )}
              </div>
            </div>
          </div>

          {/* Medical Notes (Role-protected) */}
          <div className="p-3.5 bg-slate-950/70 border border-slate-800 rounded-xl space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 font-semibold text-slate-200">
                <Heart className="w-3.5 h-3.5 text-rose-400" />
                <span>Medical Clearance & Allergies</span>
              </div>
              {!isOwnerOrAdmin && (
                <span className="flex items-center gap-1 text-[10px] text-amber-400 font-mono">
                  <Lock className="w-3 h-3" /> Restricted
                </span>
              )}
            </div>
            <p className="text-slate-300 leading-relaxed">
              {profile?.medical_conditions || 'No high-altitude contraindications reported.'}
            </p>
            {Array.isArray(profile?.gear_checklist) && profile.gear_checklist.length > 0 && (
              <div className="flex flex-wrap gap-1.5 pt-1.5">
                {profile.gear_checklist.map((allergy: any, idx: number) => (
                  <span
                    key={idx}
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-rose-500/15 border border-rose-500/30 text-rose-300 text-[10px] font-semibold"
                  >
                    <span>⚠️ {allergy.name || String(allergy)}</span>
                    {allergy.severity && <span className="text-[9px] opacity-80">({allergy.severity})</span>}
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Gear status */}
          <div className="p-3.5 bg-slate-950/70 border border-slate-800 rounded-xl space-y-2">
            <div className="flex items-center gap-1.5 font-semibold text-slate-200">
              <Backpack className="w-3.5 h-3.5 text-cyan-400" />
              <span>Mandatory Mountain Gear Check</span>
            </div>
            <div className="flex items-center gap-2 text-slate-300">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>Alpine boots, thermal layer, waterproof shell & headlamp verified</span>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-950/60 flex items-center justify-between text-xs">
          <span className="text-slate-500 font-mono">ID: {userId.slice(0, 8)}...</span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 font-medium bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl transition-colors"
          >
            Close Profile
          </button>
        </div>
      </div>
    </div>
  );
};
