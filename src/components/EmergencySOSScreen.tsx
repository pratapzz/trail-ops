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
} from 'lucide-react';
import { ContactLead, HelplineItem, ScreenType } from '../types';
import { CallModal } from './modals/CallModal';
import { ChatModal } from './modals/ChatModal';
import { DistressAlertModal } from './modals/DistressAlertModal';

interface EmergencySOSScreenProps {
  onNavigate: (screen: ScreenType) => void;
  onShowToast: (message: string) => void;
}

export const EmergencySOSScreen: React.FC<EmergencySOSScreenProps> = ({
  onNavigate,
  onShowToast,
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

  const leads: ContactLead[] = [
    {
      id: '1',
      name: 'Prof. Roy',
      title: 'Faculty Lead',
      phone: '+91 98000 00001',
      avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=150&q=80',
      online: true,
      type: 'faculty',
    },
    {
      id: '2',
      name: 'Dr. Anita',
      title: 'Medical Lead',
      phone: '+91 98000 00002',
      avatar: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=150&q=80',
      online: true,
      type: 'medical',
    },
    {
      id: '3',
      name: 'Tenzing',
      title: 'Squad A Guide',
      phone: '+91 98000 00003',
      avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=150&q=80',
      online: true,
      type: 'guide',
    },
  ];

  const [helplines, setHelplines] = useState<HelplineItem[]>([
    {
      id: '1',
      name: 'State Disaster Mgmt (SSDMA)',
      subtext: 'Toll-Free Control: 1077',
      phone: '1077',
      iconType: 'emergency',
    },
    {
      id: '2',
      name: 'Himalayan Police Outpost',
      subtext: 'Local Pelling: 03595-258222',
      phone: '03595-258222',
      iconType: 'police',
    },
    {
      id: '3',
      name: 'Khangchendzonga Rangers',
      subtext: 'Wildlife & Rescue: 03592-2024',
      phone: '03592-2024',
      iconType: 'park',
    },
  ]);

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

    setHelplines((prev) => [...prev, item]);
    setIsAddHelplineModalOpen(false);
    setNewHelplineName('');
    setNewHelplinePhone('');
    setNewHelplineSubtext('');
    onShowToast(`Emergency helpline "${item.name}" added successfully!`);
  };

  const handleDeleteHelpline = (id: string, name: string) => {
    setHelplines((prev) => prev.filter((h) => h.id !== id));
    onShowToast(`Removed helpline "${name}".`);
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
        onShowToast('🚨 SOS DISTRESS BEACON ACTIVE!');
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

        {/* Real-Time Mini Radar Map Card */}
        <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-teal-100 text-teal-800 flex items-center justify-center">
                <Navigation className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900">Proximity Mesh Radar</h3>
                <p className="text-[11px] text-slate-500">4 active units within 1.2km</p>
              </div>
            </div>
            <span className="text-[10px] bg-teal-50 text-teal-700 border border-teal-200 px-2 py-0.5 rounded-full font-bold">
              10 Hz Scan
            </span>
          </div>

          {/* Map Display Container with Animated Radar Sweep Overlay */}
          <div className="relative w-full h-44 rounded-xl overflow-hidden border border-slate-200 bg-slate-900">
            {/* Topographic background simulation */}
            <div className="absolute inset-0 bg-gradient-to-tr from-slate-900 via-emerald-950 to-slate-900 opacity-90" />
            <svg
              className="absolute inset-0 w-full h-full opacity-25"
              viewBox="0 0 300 180"
              fill="none"
              stroke="#10b981"
            >
              <path d="M10 40 Q 60 20 120 50 T 250 30" strokeWidth="1" />
              <path d="M10 80 Q 80 50 150 90 T 290 70" strokeWidth="1" />
              <path d="M10 120 Q 90 90 180 130 T 290 110" strokeWidth="1" />
              <path d="M10 160 Q 110 140 200 160 T 290 150" strokeWidth="1" />
            </svg>

            {/* Rotating Radar Sweep Line */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="w-44 h-44 rounded-full border border-teal-400/30" />
              <div className="w-28 h-28 rounded-full border border-teal-400/40" />
              <div className="absolute w-44 h-44 rounded-full overflow-hidden animate-radar-sweep">
                <div className="w-1/2 h-1/2 bg-gradient-to-br from-teal-400/35 to-transparent origin-bottom-right" />
              </div>
            </div>

            {/* Current User Beacon */}
            <div className="absolute top-[52%] left-[48%] -translate-x-1/2 -translate-y-1/2 flex items-center justify-center">
              <span className="animate-ping absolute h-8 w-8 rounded-full bg-rose-500 opacity-75" />
              <span className="relative flex items-center justify-center h-6 w-6 rounded-full bg-rose-600 text-white shadow-md">
                <MapPin className="w-3.5 h-3.5 fill-current" />
              </span>
              <span className="absolute -bottom-5 bg-rose-600 text-white text-[9px] px-1.5 py-0.5 rounded-full font-bold shadow-xs whitespace-nowrap">
                YOU
              </span>
            </div>

            {/* Squad Lead A Marker */}
            <div
              onClick={() => {
                setSelectedCallContact({
                  name: 'Tenzing',
                  title: 'Squad A Guide',
                  phone: '+91 98000 00003',
                  avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=150&q=80',
                });
              }}
              className="absolute top-[28%] left-[26%] flex flex-col items-center cursor-pointer hover:scale-110 transition-transform"
            >
              <span className="h-4 w-4 rounded-full bg-emerald-500 border-2 border-white shadow-sm flex items-center justify-center" />
              <span className="bg-white/95 text-emerald-800 text-[9px] px-1.5 py-0.5 rounded-md shadow-xs mt-0.5 font-bold border border-emerald-100">
                Tenzing (350m)
              </span>
            </div>

            {/* Medical Officer Marker */}
            <div
              onClick={() => {
                setSelectedCallContact({
                  name: 'Dr. Anita',
                  title: 'Medical Lead',
                  phone: '+91 98000 00002',
                  avatar: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=150&q=80',
                });
              }}
              className="absolute top-[65%] right-[22%] flex flex-col items-center cursor-pointer hover:scale-110 transition-transform"
            >
              <span className="h-4 w-4 rounded-full bg-sky-500 border-2 border-white shadow-sm" />
              <span className="bg-white/95 text-sky-800 text-[9px] px-1.5 py-0.5 rounded-md shadow-xs mt-0.5 font-bold border border-sky-100">
                Dr. Anita (710m)
              </span>
            </div>

            {/* Compass Heading */}
            <div className="absolute top-2 right-2 bg-white/95 backdrop-blur-xs border border-slate-200 rounded-full px-2 py-0.5 flex items-center gap-1 text-[10px] font-extrabold text-slate-800 shadow-2xs">
              <span className="text-rose-600">▲</span> N 014°
            </div>
          </div>
        </div>

        {/* Quick Dial Admin & Incident Leads Shortcuts */}
        <div>
          <div className="flex items-center justify-between mb-2 px-0.5">
            <h3 className="text-sm font-bold text-slate-900">Expedition Leads Direct Dial</h3>
            <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
              Priority Ring
            </span>
          </div>

          <div className="flex space-x-3 overflow-x-auto no-scrollbar pb-1">
            {leads.map((lead) => (
              <div
                key={lead.id}
                className="min-w-[230px] bg-white rounded-2xl p-3 border border-slate-200 shadow-xs flex-shrink-0 hover:shadow-md transition-shadow"
              >
                <div className="flex items-center gap-2.5 mb-2.5">
                  <div className="w-10 h-10 rounded-full overflow-hidden border-2 border-emerald-500/30 flex-shrink-0">
                    <img
                      src={lead.avatar}
                      alt={lead.name}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="overflow-hidden">
                    <h4 className="text-xs font-bold text-slate-900 truncate">{lead.name}</h4>
                    <p className="text-[10px] text-emerald-700 font-semibold flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block" />
                      {lead.title}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-1.5">
                  <button
                    type="button"
                    onClick={() =>
                      setSelectedCallContact({
                        name: lead.name,
                        title: lead.title,
                        phone: lead.phone,
                        avatar: lead.avatar,
                      })
                    }
                    className="flex items-center justify-center gap-1 py-1.5 px-2 bg-[#0f5238] hover:bg-[#2d6a4f] text-white rounded-xl text-xs font-bold active:scale-95 transition-all shadow-2xs cursor-pointer"
                  >
                    <Phone className="w-3.5 h-3.5" /> Call
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      setSelectedChatContact({
                        name: lead.name,
                        title: lead.title,
                        avatar: lead.avatar,
                      })
                    }
                    className="flex items-center justify-center gap-1 py-1.5 px-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold active:scale-95 transition-all border border-slate-200 cursor-pointer"
                  >
                    <MessageSquare className="w-3.5 h-3.5" /> Chat
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

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
              <span>Add Number</span>
            </button>
          </div>

          <div className="space-y-2">
            {helplines.map((item, idx) => (
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
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-slate-900 truncate">{item.name}</p>
                    <p className="text-[11px] text-slate-500 truncate">{item.subtext}</p>
                    <p className="text-[10px] font-mono text-emerald-700 font-semibold">{item.phone}</p>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    type="button"
                    onClick={() =>
                      setSelectedCallContact({
                        name: item.name,
                        title: item.subtext,
                        phone: item.phone,
                      })
                    }
                    className="h-8 px-3 rounded-xl bg-[#0f5238] hover:bg-[#2d6a4f] text-white flex items-center gap-1 text-xs font-bold shadow-2xs active:scale-95 transition-all cursor-pointer"
                  >
                    <Phone className="w-3.5 h-3.5" /> Call
                  </button>

                  <button
                    type="button"
                    onClick={() => handleDeleteHelpline(item.id, item.name)}
                    className="w-8 h-8 rounded-xl bg-slate-100 hover:bg-rose-50 hover:text-rose-600 text-slate-400 flex items-center justify-center transition-colors cursor-pointer"
                    title={`Remove ${item.name}`}
                  >
                    <Minus className="w-3.5 h-3.5 stroke-[2.5]" />
                  </button>
                </div>
              </div>
            ))}
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
    </div>
  );
};
