import React, { useState, useRef, useEffect } from 'react';
import {
  AlertOctagon,
  Copy,
  Radio,
  MapPin,
  Shield,
  Battery,
  Phone,
  MessageSquare,
  Navigation,
  Compass,
  ArrowLeft,
  Check,
  ShieldAlert,
  Plus,
  Trash2,
  Minus,
  X,
  Crown,
  Award,
  PhoneCall,
  UserPlus,
} from 'lucide-react';
import { ContactLead, HelplineItem, ScreenType, UserRole } from '../types';
import { CallModal } from './modals/CallModal';
import { ChatModal } from './modals/ChatModal';
import { DistressAlertModal } from './modals/DistressAlertModal';
import { AddEmergencyContactModal } from './modals/AddEmergencyContactModal';
import { InteractiveTrailMap } from './InteractiveTrailMap';
import {
  EmergencyContactRecord,
  fetchEmergencyContacts,
  addEmergencyContact,
  deleteEmergencyContact,
  triggerSquadSOSAlarm,
} from '../lib/supabase';
import { startEmergencySiren, stopEmergencySiren } from '../lib/emergencyAudio';

interface EmergencySOSScreenProps {
  onNavigate: (screen: ScreenType) => void;
  onShowToast: (message: string) => void;
  activeSquadId?: string;
  currentUserId?: string;
  currentUserName?: string;
  userRole?: UserRole;
}

export const EmergencySOSScreen: React.FC<EmergencySOSScreenProps> = ({
  onNavigate,
  onShowToast,
  activeSquadId,
  currentUserId = 'user_self',
  currentUserName = 'Pratap Paul',
  userRole = 'super_admin',
}) => {
  const coordinates = '27.3184° N, 88.2412° E';
  const [copied, setCopied] = useState(false);

  // Hold-to-broadcast state
  const [holdProgress, setHoldProgress] = useState(0);
  const [isHolding, setIsHolding] = useState(false);
  const holdIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Modals state
  const [isDistressModalOpen, setIsDistressModalOpen] = useState(false);
  const [selectedCallContact, setSelectedCallContact] = useState<{
    name: string;
    title: string;
    phone: string;
    avatar?: string;
  } | null>(null);
  const [selectedChatContact, setSelectedChatContact] = useState<{
    name: string;
    title: string;
    avatar?: string;
  } | null>(null);

  // Dedicated Emergency Contacts for active squad (stored locally for that squad)
  const squadKey = activeSquadId || 'default';
  const emergencyContactsStorageKey = `trailoPS_emergency_contacts_${squadKey}`;

  const [emergencyContacts, setEmergencyContacts] = useState<Array<{ id: string; name: string; phone: string; role?: string }>>(() => {
    const saved = localStorage.getItem(emergencyContactsStorageKey);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      } catch {}
    }
    return [
      {
        id: 'ec-default-1',
        name: 'SDRF Mountain Rescue Lead',
        phone: '+91 3592 202022',
        role: 'Rescue',
      },
      {
        id: 'ec-default-2',
        name: 'Pelling Base Emergency Hospital',
        phone: '+91 3595 250102',
        role: 'Medical',
      },
    ];
  });

  const [isAddContactModalOpen, setIsAddContactModalOpen] = useState(false);
  const [newContactName, setNewContactName] = useState('');
  const [newContactPhone, setNewContactPhone] = useState('');
  const [liveCoords, setLiveCoords] = useState({ lat: 27.3184, lng: 88.2412 });

  // Direct phone dialer redirect using tel: protocol
  const handleDirectDial = (phone: string, name?: string) => {
    if (!phone) {
      onShowToast('Phone number is not available.');
      return;
    }
    const clean = phone.replace(/[^\d+]/g, '');
    onShowToast(`Redirecting to phone dialer for ${name || 'contact'}...`);
    window.location.href = `tel:${clean}`;
  };

  useEffect(() => {
    const loadEmergencyContacts = () => {
      const saved = localStorage.getItem(emergencyContactsStorageKey);
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed)) setEmergencyContacts(parsed);
        } catch {}
      }
      fetchEmergencyContacts(squadKey).then((dbContacts) => {
        if (dbContacts && dbContacts.length > 0) {
          setEmergencyContacts((prev) => {
            const existingIds = new Set(prev.map((c) => c.id));
            const newFromDb = dbContacts
              .filter((c) => !existingIds.has(c.id))
              .map((c) => ({ id: c.id, name: c.name, phone: c.phone, role: c.designation || c.role }));
            return [...prev, ...newFromDb];
          });
        }
      });
    };
    loadEmergencyContacts();
    window.addEventListener('storage', loadEmergencyContacts);
    window.addEventListener('trailoPS_emergency_contacts_updated', loadEmergencyContacts);
    return () => {
      window.removeEventListener('storage', loadEmergencyContacts);
      window.removeEventListener('trailoPS_emergency_contacts_updated', loadEmergencyContacts);
    };
  }, [emergencyContactsStorageKey, squadKey]);

  const handleAddEmergencyContact = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newContactName.trim()) {
      onShowToast('Please enter contact name.');
      return;
    }
    const cleanDigits = newContactPhone.replace(/[^\d+]/g, '');
    if (!cleanDigits || cleanDigits.length < 5) {
      onShowToast('Please enter a valid phone number.');
      return;
    }

    const newContact = {
      id: `ec-${Date.now()}`,
      name: newContactName.trim(),
      phone: newContactPhone.trim(),
      role: 'Emergency Contact',
    };

    const updated = [newContact, ...emergencyContacts];
    setEmergencyContacts(updated);
    localStorage.setItem(emergencyContactsStorageKey, JSON.stringify(updated));
    window.dispatchEvent(new CustomEvent('trailoPS_emergency_contacts_updated'));

    // Also persist to Supabase if configured
    addEmergencyContact({
      group_id: squadKey,
      name: newContact.name,
      phone: newContact.phone,
      role: 'admin',
      designation: 'Emergency Contact',
      added_by: currentUserId,
    }).catch(() => {});

    setNewContactName('');
    setNewContactPhone('');
    setIsAddContactModalOpen(false);
    onShowToast(`Emergency contact "${newContact.name}" saved for squad!`);
  };

  const handleDeleteEmergencyContact = (id: string, name: string) => {
    const updated = emergencyContacts.filter((c) => c.id !== id);
    setEmergencyContacts(updated);
    localStorage.setItem(emergencyContactsStorageKey, JSON.stringify(updated));
    window.dispatchEvent(new CustomEvent('trailoPS_emergency_contacts_updated'));
    deleteEmergencyContact(id, squadKey).catch(() => {});
    onShowToast(`Removed emergency contact "${name}".`);
  };

  // Real Squad Leads with actual phone numbers (zero demo records)
  const [leads, setLeads] = useState<ContactLead[]>(() => {
    const saved = localStorage.getItem('trailoPS_squad_members');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          return parsed
            .filter((m: any) => m.phone && m.phone.trim() !== '' && !m.phone.includes('•'))
            .map((m: any) => ({
              id: m.id,
              name: m.name,
              title: m.role || 'Squad Member',
              phone: m.phone,
              avatar: m.avatar,
              online: m.status === 'present',
              type: m.roleHierarchy === 'super_admin' ? 'faculty' : m.roleHierarchy === 'subgroup_admin' ? 'guide' : 'medical',
            }));
        }
      } catch {}
    }
    return [];
  });

  // Shared squad helplines synchronized across devices
  const helplinesStorageKey = `trailoPS_shared_helplines_${squadKey}`;

  const [helplines, setHelplines] = useState<HelplineItem[]>(() => {
    const saved = localStorage.getItem(helplinesStorageKey);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      } catch {}
    }
    return [];
  });

  // Cross-device / tab synchronization listener
  useEffect(() => {
    const syncHelplines = () => {
      const saved = localStorage.getItem(helplinesStorageKey);
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed)) setHelplines(parsed);
        } catch {}
      } else {
        setHelplines([]);
      }
    };

    const syncLeads = () => {
      const saved = localStorage.getItem('trailoPS_squad_members');
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed)) {
            setLeads(
              parsed
                .filter((m: any) => m.phone && m.phone.trim() !== '' && !m.phone.includes('•'))
                .map((m: any) => ({
                  id: m.id,
                  name: m.name,
                  title: m.role || 'Squad Member',
                  phone: m.phone,
                  avatar: m.avatar,
                  online: m.status === 'present',
                  type: m.roleHierarchy === 'super_admin' ? 'faculty' : m.roleHierarchy === 'subgroup_admin' ? 'guide' : 'medical',
                }))
            );
          }
        } catch {}
      }
    };

    window.addEventListener('storage', syncHelplines);
    window.addEventListener('trailoPS_helpline_updated', syncHelplines);
    window.addEventListener('storage', syncLeads);
    window.addEventListener('trailoPS_members_updated', syncLeads);

    return () => {
      window.removeEventListener('storage', syncHelplines);
      window.removeEventListener('trailoPS_helpline_updated', syncHelplines);
      window.removeEventListener('storage', syncLeads);
      window.removeEventListener('trailoPS_members_updated', syncLeads);
    };
  }, [helplinesStorageKey]);

  // Add custom helpline modal state
  const [isAddHelplineModalOpen, setIsAddHelplineModalOpen] = useState(false);
  const [newHelplineName, setNewHelplineName] = useState('');
  const [newHelplinePhone, setNewHelplinePhone] = useState('');
  const [newHelplineSubtext, setNewHelplineSubtext] = useState('');
  const [newHelplineType, setNewHelplineType] = useState<'emergency' | 'police' | 'park' | 'medical'>('emergency');

  const handleAddCustomHelpline = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newHelplineName.trim() || !newHelplinePhone.trim()) return;

    const item: HelplineItem = {
      id: `hl-${Date.now()}`,
      name: newHelplineName.trim(),
      phone: newHelplinePhone.trim(),
      subtext: newHelplineSubtext.trim() || 'Custom Emergency Number',
      iconType: newHelplineType,
    };

    const updated = [...helplines, item];
    setHelplines(updated);
    localStorage.setItem(helplinesStorageKey, JSON.stringify(updated));
    window.dispatchEvent(new CustomEvent('trailoPS_helpline_updated'));

    setIsAddHelplineModalOpen(false);
    setNewHelplineName('');
    setNewHelplinePhone('');
    setNewHelplineSubtext('');
    onShowToast(`Emergency helpline "${item.name}" added and synced with squad!`);
  };

  const handleDeleteHelpline = (id: string, name: string) => {
    const updated = helplines.filter((h) => h.id !== id);
    setHelplines(updated);
    localStorage.setItem(helplinesStorageKey, JSON.stringify(updated));
    window.dispatchEvent(new CustomEvent('trailoPS_helpline_updated'));
    onShowToast(`Removed helpline "${name}" for all squad members.`);
  };

  const handleCopyCoords = () => {
    navigator.clipboard?.writeText(coordinates);
    setCopied(true);
    onShowToast(`GPS Coordinates copied: ${coordinates}`);
    setTimeout(() => setCopied(false), 2000);
  };

  const startHold = () => {
    setIsHolding(true);
    setHoldProgress(0);

    const startTime = Date.now();
    const duration = 3000; // 3 seconds

    holdIntervalRef.current = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min((elapsed / duration) * 100, 100);
      setHoldProgress(progress);

      if (progress >= 100) {
        clearInterval(holdIntervalRef.current!);
        setIsHolding(false);
        setIsDistressModalOpen(true);
        startEmergencySiren();
        triggerSquadSOSAlarm({
          groupId: activeSquadId || 'default',
          distressedUserId: currentUserId,
          distressedUserName: currentUserName,
          distressedUserRole: userRole === 'super_admin' ? 'Super Admin' : userRole === 'admin' ? 'Admin' : userRole === 'faculty' ? 'Faculty Lead' : 'Squad Member',
          phone: leads[0]?.phone || '',
          coordinates: { lat: 27.3184, lng: 88.2412 },
          batteryLevel: 92,
        });
        onShowToast('🚨 SOS DISTRESS BEACON ACTIVE! Continuous siren sounding across squad.');
      }
    }, 50);
  };

  const cancelHold = () => {
    if (holdIntervalRef.current) {
      clearInterval(holdIntervalRef.current);
    }
    setIsHolding(false);
    setHoldProgress(0);
  };

  useEffect(() => {
    return () => {
      if (holdIntervalRef.current) clearInterval(holdIntervalRef.current);
    };
  }, []);

  return (
    <div className="max-w-md mx-auto min-h-screen bg-[#f8faf9] text-slate-900 pb-32">
      {/* Top App Bar */}
      <header className="bg-white/95 backdrop-blur-md border-b border-slate-200 sticky top-0 z-40 shadow-2xs">
        <div className="flex items-center justify-between px-4 w-full h-16 max-w-md mx-auto">
          {/* Back & Logo */}
          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={() => onNavigate('gateway')}
              className="p-2 -ml-1 rounded-full hover:bg-slate-100 active:scale-95 transition-all text-slate-700 flex items-center justify-center cursor-pointer"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-[#0f5238] to-emerald-500 text-white flex items-center justify-center shadow-xs">
                <Compass className="w-4 h-4" />
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-lg font-extrabold tracking-tight text-[#0f5238]">
                  TrailoPS
                </span>
                <span className="bg-emerald-100 text-[#0f5238] text-[10px] font-extrabold tracking-wider px-1.5 py-0.5 rounded-md border border-emerald-300">
                  V1
                </span>
              </div>
            </div>
          </div>

          {/* Active status */}
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 bg-rose-50 text-rose-700 border border-rose-200 px-2.5 py-1 rounded-full">
              <span className="w-2 h-2 rounded-full bg-rose-600 animate-pulse" />
              <span className="text-[11px] font-bold tracking-tight">SOS Ready</span>
            </div>
            <div className="w-9 h-9 rounded-full overflow-hidden border-2 border-emerald-500/20 shadow-xs flex-shrink-0">
              <img
                className="w-full h-full object-cover"
                src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80"
                alt="Profile"
              />
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="px-4 pt-3.5 space-y-4">
        {/* Critical Telemetry & Status Banner */}
        <div className="bg-white rounded-2xl p-3.5 border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between mb-2.5">
            <div className="flex items-center gap-2">
              <span className="relative flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-500 opacity-75" />
                <span className="relative inline-flex rounded-full h-3 w-3 bg-rose-600" />
              </span>
              <span className="text-xs text-rose-600 font-extrabold tracking-wide uppercase">
                SOS Dispatch Hub
              </span>
            </div>

            <div className="flex items-center gap-1 bg-teal-50 text-teal-800 border border-teal-200 px-2.5 py-0.5 rounded-full text-[11px] font-semibold">
              <Radio className="w-3.5 h-3.5 text-teal-600" />
              <span>Mesh 8/8 Peers</span>
            </div>
          </div>

          <div className="flex items-center justify-between bg-gradient-to-r from-emerald-50/70 via-slate-50 to-slate-50 rounded-xl p-3 border border-emerald-500/20">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-emerald-100 text-[#0f5238] flex items-center justify-center flex-shrink-0">
                <MapPin className="w-4 h-4 fill-emerald-700" />
              </div>
              <div>
                <p className="text-xs sm:text-sm text-slate-900 font-bold">{coordinates}</p>
                <p className="text-[11px] text-slate-500 font-medium">
                  Pelling Sector 4, West Sikkim (2,150m ASL)
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={handleCopyCoords}
              className="bg-white hover:bg-slate-100 text-[#0f5238] p-2 rounded-xl border border-slate-200 transition-all shadow-2xs active:scale-90 cursor-pointer"
              title="Copy Coordinates"
            >
              {copied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* 1-Tap Emergency Distress Broadcast Hero Trigger */}
        <div className="bg-gradient-to-b from-rose-50 via-white to-white rounded-3xl p-5 border border-rose-200 text-center relative overflow-hidden shadow-sm">
          <div className="absolute -top-10 -right-10 w-36 h-36 bg-rose-500/10 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute -bottom-10 -left-10 w-36 h-36 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-100 text-rose-700 text-[11px] font-bold mb-2.5 border border-rose-200">
            <Radio className="w-3.5 h-3.5" />
            <span>Instant Dual-Band Beacon</span>
          </div>

          <h2 className="text-xl text-slate-900 font-extrabold mb-1">
            Distress Beacon Protocol
          </h2>
          <p className="text-xs text-slate-600 max-w-xs mx-auto mb-4">
            Hold 3 seconds to broadcast live GPS telemetry to SDRF rescue &amp; command leads.
          </p>

          {/* Tactical Hold Hero Button with Pulsing Rings */}
          <div className="relative flex justify-center items-center py-4 my-1">
            {/* Outer rings */}
            <div className="absolute inset-0 m-auto w-48 h-48 rounded-full bg-rose-500/15 animate-sos-pulse pointer-events-none" />
            <div className="absolute inset-0 m-auto w-40 h-40 rounded-full bg-rose-600/20 pointer-events-none blur-[1px]" />

            <button
              type="button"
              id="sosTriggerButton"
              onMouseDown={startHold}
              onMouseUp={cancelHold}
              onMouseLeave={cancelHold}
              onTouchStart={startHold}
              onTouchEnd={cancelHold}
              onClick={() => {
                if (holdProgress < 100) {
                  onShowToast('Hold down for 3 seconds continuously to activate emergency beacon!');
                }
              }}
              className={`relative z-10 w-36 h-36 rounded-full text-white flex flex-col items-center justify-center p-3 shadow-xl active:scale-95 transition-transform duration-200 select-none border-4 border-white focus:outline-none cursor-pointer ${
                isHolding
                  ? 'bg-gradient-to-br from-red-600 to-rose-900 ring-8 ring-rose-400/50 scale-95 shadow-rose-700/60'
                  : 'bg-gradient-to-br from-rose-600 via-rose-700 to-red-800 hover:from-rose-500 hover:to-rose-700 shadow-rose-600/35'
              }`}
            >
              <AlertOctagon className="w-10 h-10 mb-1 drop-shadow-sm text-white" />
              <span className="text-white text-sm font-extrabold tracking-wide leading-tight">
                {isHolding ? `${(3 - (holdProgress / 100) * 3).toFixed(1)}s` : 'HOLD 3 SEC'}
              </span>
              <span className="text-rose-200 text-[10px] font-bold tracking-widest mt-0.5 uppercase">
                {isHolding ? 'Broadcasting...' : 'Broadcast SOS'}
              </span>

              {/* Circular progress bar on hold */}
              {isHolding && (
                <div
                  className="absolute inset-0 rounded-full border-4 border-amber-300 pointer-events-none"
                  style={{
                    clipPath: `polygon(50% 50%, -50% -50%, ${holdProgress * 2}% -50%)`,
                  }}
                />
              )}
            </button>
          </div>

          <div className="flex items-center justify-around mt-4 pt-3 border-t border-slate-200 text-slate-600 text-xs font-semibold">
            <span className="flex items-center gap-1.5 text-emerald-700">
              <Radio className="w-4 h-4 text-emerald-600" /> LoRa Active
            </span>
            <span className="flex items-center gap-1.5 text-emerald-700">
              <Battery className="w-4 h-4 text-emerald-600" /> 92% Power
            </span>
            <span className="flex items-center gap-1.5 text-emerald-700">
              <Shield className="w-4 h-4 text-emerald-600" /> SAR Synced
            </span>
          </div>
        </div>

        {/* Real-Time Interactive Map & Proximity Mesh Radar Card (Supports 1 & 2-Finger Touch Move/Zoom) */}
        <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs space-y-2.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-teal-100 text-teal-800 flex items-center justify-center">
                <Navigation className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900">
                  Live Trail Map &amp; Proximity Radar
                </h3>
                <p className="text-[11px] text-slate-500">
                  Use 1 or 2 fingers to move &amp; pinch-zoom map
                </p>
              </div>
            </div>
            <span className="text-[10px] bg-teal-50 text-teal-700 border border-teal-200 px-2 py-0.5 rounded-full font-bold">
              Multi-Touch Active
            </span>
          </div>

          <InteractiveTrailMap
            center={{ lat: liveCoords.lat, lng: liveCoords.lng }}
            zoom={13}
            heightClass="h-56"
            markers={[
              {
                id: 'you',
                lat: liveCoords.lat,
                lng: liveCoords.lng,
                label: 'YOU (Live GPS)',
                color: 'rose',
                isUser: true,
              },
              ...(leads[0]
                ? [
                    {
                      id: leads[0].id,
                      lat: liveCoords.lat + 0.0045,
                      lng: liveCoords.lng - 0.0035,
                      label: `${leads[0].name} (Squad)`,
                      color: 'emerald' as const,
                    },
                  ]
                : []),
              ...(leads[1]
                ? [
                    {
                      id: leads[1].id,
                      lat: liveCoords.lat - 0.0038,
                      lng: liveCoords.lng + 0.0042,
                      label: `${leads[1].name} (Squad)`,
                      color: 'blue' as const,
                    },
                  ]
                : []),
            ]}
            onLocateGps={(coords) => {
              setLiveCoords((prev) => ({
                ...prev,
                lat: coords.lat,
                lng: coords.lng,
              }));
              onShowToast('📍 Centered map on your live GPS coordinates!');
            }}
          />
        </div>

        {/* DEDICATED EMERGENCY CONTACTS SECTION */}
        <div className="bg-white rounded-3xl p-4 border border-slate-200 shadow-xs space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-rose-100 text-rose-700 flex items-center justify-center">
                <Phone className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-extrabold text-slate-900">Emergency Contacts</h3>
                <p className="text-[11px] text-slate-500">Stored locally for this squad • 1-tap native dialer</p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setIsAddContactModalOpen(true)}
              className="px-3 py-1.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold flex items-center gap-1.5 transition-all active:scale-95 shadow-xs cursor-pointer"
              title="Add a new emergency contact for this squad"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Contact</span>
            </button>
          </div>

          {/* Emergency Contacts List */}
          <div className="space-y-2">
            {emergencyContacts.length === 0 ? (
              <div className="p-4 rounded-2xl bg-slate-50 border border-dashed border-slate-200 text-center space-y-2">
                <Phone className="w-6 h-6 text-slate-400 mx-auto" />
                <p className="text-xs font-bold text-slate-700">No Emergency Contacts Added</p>
                <p className="text-[11px] text-slate-500 max-w-xs mx-auto">
                  Add local doctors, police, guides, or leaders. Tapping Call opens your phone dialer app directly.
                </p>
                <button
                  type="button"
                  onClick={() => setIsAddContactModalOpen(true)}
                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-emerald-700 text-white text-xs font-bold hover:bg-emerald-800 cursor-pointer shadow-xs"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add First Contact</span>
                </button>
              </div>
            ) : (
              emergencyContacts.map((contact) => (
                <div
                  key={contact.id}
                  className="flex items-center justify-between p-3 rounded-2xl bg-slate-50/80 hover:bg-slate-100/80 border border-slate-200 transition-colors"
                >
                  <div className="min-w-0 pr-2">
                    <div className="flex items-center gap-1.5">
                      <span className="font-extrabold text-xs text-slate-900 truncate">
                        {contact.name}
                      </span>
                      {contact.role && (
                        <span className="px-1.5 py-0.2 rounded-md bg-rose-100 text-rose-700 text-[9px] font-bold uppercase tracking-wider">
                          {contact.role}
                        </span>
                      )}
                    </div>
                    <div
                      onClick={() => handleDirectDial(contact.phone, contact.name)}
                      className="text-[11px] font-mono text-emerald-700 font-semibold flex items-center gap-1 mt-0.5 hover:underline cursor-pointer"
                      title="Tap to trigger native dialer"
                    >
                      <Phone className="w-3 h-3 text-emerald-600" />
                      <span>{contact.phone}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      type="button"
                      onClick={() => handleDirectDial(contact.phone, contact.name)}
                      className="px-3 py-2 rounded-xl bg-gradient-to-r from-emerald-700 to-teal-700 hover:brightness-110 active:scale-95 text-white text-xs font-bold flex items-center gap-1.5 shadow-xs transition-all cursor-pointer"
                      title="Trigger native phone dialer"
                    >
                      <PhoneCall className="w-3.5 h-3.5" />
                      <span>Call</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleDeleteEmergencyContact(contact.id, contact.name)}
                      className="p-2 text-slate-400 hover:text-rose-600 rounded-xl hover:bg-rose-50 transition-colors cursor-pointer"
                      title="Delete contact"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Squad Members Quick Contact */}
        {leads.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center justify-between px-0.5">
              <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider">Squad Teammates</h3>
              <span className="text-[10px] text-slate-400">{leads.length} active units</span>
            </div>
            <div className="flex space-x-2.5 overflow-x-auto no-scrollbar pb-1">
              {leads.map((lead) => (
                <div
                  key={lead.id}
                  className="min-w-[210px] bg-white rounded-2xl p-2.5 border border-slate-200 shadow-2xs flex-shrink-0 flex flex-col justify-between"
                >
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-8 h-8 rounded-full overflow-hidden border border-emerald-500/30 shrink-0">
                      <img src={lead.avatar} alt={lead.name} className="w-full h-full object-cover" />
                    </div>
                    <div className="min-w-0">
                      <h4 className="text-xs font-bold text-slate-900 truncate">{lead.name}</h4>
                      <p className="text-[10px] text-emerald-700 font-medium truncate">{lead.phone}</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleDirectDial(lead.phone, lead.name)}
                    className="w-full py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1 shadow-2xs active:scale-95 transition-all cursor-pointer"
                  >
                    <PhoneCall className="w-3 h-3" /> Call
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Dynamic Route Helplines with Custom User Number Addition */}
        <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Route Helplines: Pelling</h3>
              <p className="text-[11px] text-slate-500">Instant one-tap direct line emergency dispatch</p>
            </div>
            <button
              type="button"
              onClick={() => setIsAddHelplineModalOpen(true)}
              className="px-2.5 py-1 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-[#0f5238] border border-emerald-300 text-xs font-bold flex items-center gap-1 transition-colors cursor-pointer"
              title="Add a custom emergency helpline number"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Line</span>
            </button>
          </div>

          <div className="space-y-2">
            {helplines.length === 0 ? (
              <div className="p-5 rounded-2xl bg-slate-50 border border-dashed border-slate-200 text-center space-y-2">
                <Phone className="w-7 h-7 text-slate-300 mx-auto" />
                <p className="text-xs font-bold text-slate-700">No Emergency Helplines Added</p>
                <p className="text-[11px] text-slate-500 max-w-xs mx-auto">
                  Add local ranger, rescue, doctor, or guide phone numbers. Numbers you add will sync to every squad member's phone.
                </p>
                <button
                  type="button"
                  onClick={() => setIsAddHelplineModalOpen(true)}
                  className="mt-1 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-600 text-white text-xs font-bold hover:bg-rose-700 active:scale-95 transition-all cursor-pointer shadow-xs"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add First Helpline</span>
                </button>
              </div>
            ) : (
              helplines.map((item, idx) => (
                <div
                  key={item.id}
                  className={`flex items-center justify-between py-1 ${
                    idx > 0 ? 'border-t border-slate-100 pt-2.5' : ''
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                        item.iconType === 'emergency'
                          ? 'bg-rose-100 text-rose-700'
                          : item.iconType === 'police'
                          ? 'bg-sky-100 text-sky-700'
                          : 'bg-emerald-100 text-emerald-800'
                      }`}
                    >
                      <Phone className="w-4 h-4" />
                    </div>
                    <div
                      className="min-w-0 cursor-pointer"
                      onClick={() => handleDirectDial(item.phone, item.name)}
                      title="Tap to redirect to dialer"
                    >
                      <p className="text-xs font-bold text-slate-900 truncate hover:text-emerald-700">{item.name}</p>
                      <p className="text-[11px] text-slate-500 truncate">{item.subtext}</p>
                      <p className="text-[10px] font-mono text-emerald-700 font-semibold">{item.phone}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      type="button"
                      onClick={() => handleDirectDial(item.phone, item.name)}
                      className="h-8 px-3 rounded-xl bg-[#0f5238] hover:bg-[#2d6a4f] text-white flex items-center gap-1 text-xs font-bold shadow-2xs active:scale-95 transition-all cursor-pointer"
                      title="Direct phone dialer"
                    >
                      <Phone className="w-3.5 h-3.5" /> Call
                    </button>

                    <button
                      type="button"
                      onClick={() => handleDeleteHelpline(item.id, item.name)}
                      className="w-8 h-8 rounded-xl bg-slate-100 hover:bg-rose-50 hover:text-rose-600 text-slate-400 flex items-center justify-center transition-colors cursor-pointer"
                      title={`Remove ${item.name}`}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Modal: Add Custom Helpline & Description */}
        {isAddHelplineModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-md animate-in fade-in duration-150">
            <div className="w-full max-w-sm bg-white rounded-3xl p-5 border border-slate-200 shadow-2xl space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-emerald-100 text-[#0f5238] flex items-center justify-center">
                    <Phone className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">Add Emergency Helpline</h3>
                    <p className="text-[10px] text-slate-500">Every user can add custom contacts &amp; purpose</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsAddHelplineModalOpen(false)}
                  className="w-7 h-7 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleAddCustomHelpline} className="space-y-3">
                <div>
                  <label className="text-[11px] font-bold text-slate-700 block mb-1">
                    What is this number? (Name / Title)
                  </label>
                  <input
                    type="text"
                    value={newHelplineName}
                    onChange={(e) => setNewHelplineName(e.target.value)}
                    placeholder="e.g. Camp Doctor Dr. Verma / Local Guide"
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs font-semibold text-slate-900 outline-none focus:border-emerald-600"
                    required
                  />
                </div>

                <div>
                  <label className="text-[11px] font-bold text-slate-700 block mb-1">
                    Phone / Helpline Number
                  </label>
                  <input
                    type="text"
                    value={newHelplinePhone}
                    onChange={(e) => setNewHelplinePhone(e.target.value)}
                    placeholder="e.g. +91 98765 43210 or 112"
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs font-semibold text-slate-900 outline-none focus:border-emerald-600"
                    required
                  />
                </div>

                <div>
                  <label className="text-[11px] font-bold text-slate-700 block mb-1">
                    Description &amp; Purpose (What the number is for)
                  </label>
                  <input
                    type="text"
                    value={newHelplineSubtext}
                    onChange={(e) => setNewHelplineSubtext(e.target.value)}
                    placeholder="e.g. 24/7 Oxygen Station / Basecamp Medic"
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs font-semibold text-slate-900 outline-none focus:border-emerald-600"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-bold text-slate-700 block mb-1">
                    Category Type
                  </label>
                  <div className="grid grid-cols-3 gap-1.5">
                    {[
                      { id: 'emergency', label: 'Emergency' },
                      { id: 'police', label: 'Police/Ranger' },
                      { id: 'park', label: 'Forest/Guide' },
                    ].map((c) => (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => setNewHelplineType(c.id as any)}
                        className={`py-1.5 rounded-xl text-[11px] font-bold transition-all cursor-pointer ${
                          newHelplineType === c.id
                            ? 'bg-[#0f5238] text-white shadow-2xs'
                            : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                        }`}
                      >
                        {c.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setIsAddHelplineModalOpen(false)}
                    className="w-1/3 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-100"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={!newHelplineName.trim() || !newHelplinePhone.trim()}
                    className="flex-1 py-2.5 rounded-xl bg-[#0f5238] hover:bg-[#1b5e3f] disabled:opacity-40 text-white text-xs font-bold transition-all shadow-md cursor-pointer"
                  >
                    Add Helpline
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Tactical Advisory Note */}
        <div className="flex items-start gap-2.5 bg-gradient-to-r from-emerald-500/10 via-slate-50 to-slate-50 p-3.5 rounded-2xl border border-emerald-600/20 text-slate-700">
          <Shield className="w-5 h-5 text-[#0f5238] mt-0.5 shrink-0" />
          <p className="text-xs leading-relaxed">
            Distress signals transmit via peer-to-peer LoRa mesh even if cellular connectivity drops to 0 bars. Keep your device elevated.
          </p>
        </div>
      </main>

      {/* Distress Alert Modal */}
      <DistressAlertModal
        isOpen={isDistressModalOpen}
        onClose={() => setIsDistressModalOpen(false)}
        coordinates={coordinates}
      />

      {/* Call Simulator Modal */}
      {selectedCallContact && (
        <CallModal
          isOpen={true}
          onClose={() => setSelectedCallContact(null)}
          contactName={selectedCallContact.name}
          contactTitle={selectedCallContact.title}
          phoneNumber={selectedCallContact.phone}
          avatar={selectedCallContact.avatar}
        />
      )}

      {/* Chat Simulator Modal */}
      {selectedChatContact && (
        <ChatModal
          isOpen={true}
          onClose={() => setSelectedChatContact(null)}
          contactName={selectedChatContact.name}
          contactTitle={selectedChatContact.title}
          avatar={selectedChatContact.avatar}
        />
      )}

      {/* Add Emergency Contact Line Modal */}
      <AddEmergencyContactModal
        isOpen={isAddContactModalOpen}
        onClose={() => setIsAddContactModalOpen(false)}
        groupId={activeSquadId || 'default'}
        currentUserId={currentUserId}
        onContactAdded={async (contactData) => {
          const newContact = {
            id: `ec-${Date.now()}`,
            name: contactData.name,
            phone: contactData.phone,
            role: 'Emergency Contact',
          };
          const updated = [newContact, ...emergencyContacts];
          setEmergencyContacts(updated);
          localStorage.setItem(emergencyContactsStorageKey, JSON.stringify(updated));
          window.dispatchEvent(new CustomEvent('trailoPS_emergency_contacts_updated'));
          addEmergencyContact(contactData).catch(() => {});
        }}
        onShowToast={onShowToast}
      />
    </div>
  );
};
