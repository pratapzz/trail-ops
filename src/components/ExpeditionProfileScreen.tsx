import React, { useState, useRef } from 'react';
import {
  User,
  Users,
  Phone,
  AlertOctagon,
  CheckCircle2,
  Bookmark,
  ArrowRight,
  ArrowLeft,
  Activity,
  Pill,
  ShieldCheck,
  ChevronDown,
  Plus,
  X,
  Stethoscope,
  Camera,
  Upload,
  Sparkles,
  Calendar,
} from 'lucide-react';
import { ProfileFormData, AllergyItem, ScreenType } from '../types';
import { AddAllergyModal } from './modals/AddAllergyModal';

interface ExpeditionProfileScreenProps {
  onNavigate: (screen: ScreenType) => void;
  onShowToast: (message: string) => void;
  onCompleteProfile: (data: ProfileFormData) => void;
  initialData?: ProfileFormData;
}

export const ExpeditionProfileScreen: React.FC<ExpeditionProfileScreenProps> = ({
  onNavigate,
  onShowToast,
  onCompleteProfile,
  initialData,
}) => {
  const [activeStep, setActiveStep] = useState<1 | 2 | 3>(1);
  const [isAddAllergyOpen, setIsAddAllergyOpen] = useState(false);
  const [isAvatarPickerOpen, setIsAvatarPickerOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [formData, setFormData] = useState<ProfileFormData>(() => {
    return (
      initialData || {
        fullName: 'Pratap Paul',
        guardianName: '',
        dateOfBirth: '',
        age: undefined,
        gender: undefined,
        countryCode: '🇮🇳 +91',
        phoneNumber: '',
        emergencyNumber: '',
        bloodGroup: 'O+',
        allergies: [],
        medications: '',
        medsPacked: false,
        heightCm: 175,
        weightKg: 70,
        experienceLevel: 'Intermediate',
        healthNotes: '',
        avatarUrl:
          'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80',
      }
    );
  });

  React.useEffect(() => {
    if (initialData) {
      setFormData(initialData);
    }
  }, [initialData]);

  const calculateAge = (dobString: string): number => {
    if (!dobString) return 25;
    const birthDate = new Date(dobString);
    const today = new Date();
    let ageVal = today.getFullYear() - birthDate.getFullYear();
    const m = today.getMonth() - birthDate.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
      ageVal--;
    }
    return Math.max(1, ageVal);
  };

  const bloodGroups = ['A+', 'B+', 'O+', 'AB+', 'A-', 'B-', 'O-', 'AB-'];
  const countryCodes = ['🇺🇸 +1', '🇮🇳 +91', '🇬🇧 +44', '🇨🇭 +41', '🇦🇺 +61', '🇩🇪 +49'];
  const [showCountryMenu, setShowCountryMenu] = useState(false);

  const presetAvatars = [
    'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80',
    'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=200&q=80',
    'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=200&q=80',
    'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=200&q=80',
    'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=200&q=80',
    'https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?auto=format&fit=crop&w=200&q=80',
  ];

  // Dynamic calculations for sliders
  const heightPercent = Math.min(
    Math.max(((formData.heightCm - 140) / (215 - 140)) * 100, 0),
    100
  );
  const weightPercent = Math.min(
    Math.max(((formData.weightKg - 45) / (130 - 45)) * 100, 0),
    100
  );

  // Compute progress percent for header bar
  const progressPercent = activeStep === 1 ? 33 : activeStep === 2 ? 66 : 100;

  // Calculate BMI
  const heightM = formData.heightCm / 100;
  const bmi = (formData.weightKg / (heightM * heightM)).toFixed(1);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          setFormData((prev) => ({
            ...prev,
            avatarUrl: event.target!.result as string,
          }));
          onShowToast('Custom profile photo updated!');
          setIsAvatarPickerOpen(false);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleNext = () => {
    if (activeStep === 1) {
      if (!formData.fullName.trim()) {
        onShowToast('Please provide your full legal name.');
        return;
      }
      setActiveStep(2);
      onShowToast('Personal details confirmed! Now entering Step 2: Medical Information.');
    } else if (activeStep === 2) {
      setActiveStep(3);
      onShowToast('Medical data recorded! Now entering Step 3: Physical Fitness.');
    } else {
      onShowToast('🎉 Expedition Profile completed successfully! Entering Home Base.');
      onCompleteProfile(formData);
      onNavigate('gateway');
    }
  };

  const handlePrev = () => {
    if (activeStep === 3) {
      setActiveStep(2);
    } else if (activeStep === 2) {
      setActiveStep(1);
    } else {
      onNavigate('signin');
    }
  };

  const removeAllergy = (id: string) => {
    setFormData((prev) => ({
      ...prev,
      allergies: prev.allergies.filter((a) => a.id !== id),
    }));
    onShowToast('Allergy removed');
  };

  const addAllergy = (allergy: AllergyItem) => {
    setFormData((prev) => ({
      ...prev,
      allergies: [...prev.allergies, allergy],
    }));
    onShowToast(`Added ${allergy.name} to medical record`);
  };

  return (
    <div className="relative max-w-md mx-auto min-h-screen flex flex-col bg-[#f8faf9] pb-28">
      {/* Top Header with TrailoPS V1 Brand & Step Indicator */}
      <div className="relative w-full bg-gradient-to-b from-slate-100/80 to-white pt-4 pb-5 px-4 border-b border-slate-200/60 shadow-xs">
        <header className="flex items-center justify-between w-full h-14 z-40">
          {/* Back Button */}
          <button
            type="button"
            aria-label="Go Back"
            onClick={handlePrev}
            className="w-10 h-10 rounded-full flex items-center justify-center bg-white text-slate-800 border border-slate-200 shadow-2xs hover:bg-slate-50 active:scale-95 transition-all cursor-pointer"
          >
            <ArrowLeft className="w-5 h-5 text-slate-700" />
          </button>

          {/* Prominent TrailoPS Logo with Compass & V1 Badge */}
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-[#0f5238] to-[#10b981] flex items-center justify-center text-white shadow-md shadow-emerald-900/20">
              <span className="font-bold text-base">⌖</span>
            </div>
            <span className="text-xl font-extrabold tracking-tight text-[#0f5238]">TrailoPS</span>
            <span className="px-2 py-0.5 rounded-md bg-emerald-100 text-[#0f5238] text-[10px] font-extrabold tracking-wider border border-emerald-300">
              V1
            </span>
          </div>

          {/* Profile Avatar with Photo Picker Trigger */}
          <div
            onClick={() => setIsAvatarPickerOpen(true)}
            className="relative cursor-pointer group"
            title="Change Profile Photo"
          >
            <div className="w-10 h-10 rounded-full overflow-hidden ring-2 ring-emerald-500/40 bg-slate-200 flex items-center justify-center shadow-2xs group-hover:ring-emerald-600 transition-all">
              <img
                className="w-full h-full object-cover"
                src={formData.avatarUrl}
                alt={formData.fullName}
              />
            </div>
            <span className="absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full bg-[#0f5238] text-white flex items-center justify-center shadow-xs">
              <Camera className="w-2.5 h-2.5" />
            </span>
          </div>
        </header>

        {/* Step Headline & Completion Pill */}
        <div className="mt-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-extrabold tracking-wide uppercase bg-emerald-100 text-[#0f5238] px-3 py-1 rounded-full border border-emerald-300 shadow-2xs">
              Step {activeStep} of 3
            </span>
            <h1 className="text-lg font-bold text-slate-900">
              {activeStep === 1 && 'Your Details'}
              {activeStep === 2 && 'Medical Info'}
              {activeStep === 3 && 'Physical Fitness'}
            </h1>
          </div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-xs text-emerald-800 font-bold">{progressPercent}% Done</span>
          </div>
        </div>

        {/* Clear Smooth Step Completion Bar */}
        <div className="mt-3.5 relative w-full h-2 rounded-full bg-slate-200 overflow-hidden">
          <div
            className="absolute left-0 top-0 bottom-0 bg-gradient-to-r from-emerald-500 via-[#0f5238] to-[#2d6a4f] rounded-full shadow-xs transition-all duration-500"
            style={{ width: `${progressPercent}%` }}
          >
            <div className="w-16 h-full bg-white/40 blur-[2px] animate-gleam" />
          </div>
        </div>

        {/* Multi-step Indicator Pills */}
        <div className="grid grid-cols-3 gap-2 mt-4">
          <div
            onClick={() => setActiveStep(1)}
            className={`flex items-center justify-center gap-1.5 py-1.5 rounded-xl text-center transition-all cursor-pointer ${
              activeStep === 1
                ? 'bg-gradient-to-r from-[#0f5238] to-[#2d6a4f] text-white font-bold shadow-md shadow-emerald-900/20'
                : activeStep > 1
                ? 'bg-emerald-100 text-emerald-900 font-bold border border-emerald-300'
                : 'bg-white text-slate-400 border border-slate-200'
            }`}
          >
            <span className="w-4 h-4 rounded-full bg-white/20 text-[10px] flex items-center justify-center">
              1
            </span>
            <span className="text-[11px] truncate">1. Details</span>
          </div>

          <div
            onClick={() => setActiveStep(2)}
            className={`flex items-center justify-center gap-1.5 py-1.5 rounded-xl text-center transition-all cursor-pointer ${
              activeStep === 2
                ? 'bg-gradient-to-r from-[#0f5238] to-[#2d6a4f] text-white font-bold shadow-md shadow-emerald-900/20'
                : activeStep > 2
                ? 'bg-emerald-100 text-emerald-900 font-bold border border-emerald-300'
                : 'bg-white text-slate-400 border border-slate-200'
            }`}
          >
            <span className="w-4 h-4 rounded-full bg-white/20 text-[10px] flex items-center justify-center">
              2
            </span>
            <span className="text-[11px] truncate">2. Medical</span>
          </div>

          <div
            onClick={() => setActiveStep(3)}
            className={`flex items-center justify-center gap-1.5 py-1.5 rounded-xl text-center transition-all cursor-pointer ${
              activeStep === 3
                ? 'bg-gradient-to-r from-[#0f5238] to-[#2d6a4f] text-white font-bold shadow-md shadow-emerald-900/20'
                : 'bg-white text-slate-400 border border-slate-200'
            }`}
          >
            <span className="w-4 h-4 rounded-full bg-white/20 text-[10px] flex items-center justify-center">
              3
            </span>
            <span className="text-[11px] truncate">3. Fitness</span>
          </div>
        </div>

        {/* CORE-PURPOSE ANIMATED ILLUSTRATION BANNERS (Dedicated to each step's specific function) */}
        <div className="mt-4 rounded-2xl overflow-hidden border border-slate-200/80 shadow-sm bg-slate-950 relative transition-all duration-500">
          {/* STEP 1: Simple Focused Camera & Profile Photo Snap Animation */}
          {activeStep === 1 && (
            <div key="step-1-illustration" className="relative h-32 sm:h-36 w-full overflow-hidden animate-in fade-in zoom-in-95 duration-300 bg-gradient-to-r from-slate-900 via-emerald-950 to-slate-900 flex items-center justify-center">
              <svg
                viewBox="0 0 390 140"
                className="w-full h-full object-contain"
              >
                <defs>
                  <linearGradient id="photoGrad" x1="0" x2="1" y1="0" y2="1">
                    <stop offset="0%" stopColor="#059669" />
                    <stop offset="100%" stopColor="#0d9488" />
                  </linearGradient>
                  <linearGradient id="polaroidGleam" x1="0" x2="0" y1="0" y2="1">
                    <stop offset="0%" stopColor="#ffffff" />
                    <stop offset="100%" stopColor="#f1f5f9" />
                  </linearGradient>
                </defs>

                {/* Left: Vintage / Tactical SLR Camera with Shutter & Flash */}
                <g transform="translate(60, 20)">
                  {/* Camera Body */}
                  <rect x="0" y="20" width="120" height="75" rx="14" fill="#1e293b" stroke="#334155" strokeWidth="2.5" />
                  <rect x="0" y="20" width="120" height="15" rx="4" fill="#0f172a" />
                  
                  {/* Viewfinder Pentaprism Top */}
                  <polygon points="40,20 50,8 70,8 80,20" fill="#334155" />
                  <rect x="52" y="10" width="16" height="6" rx="1.5" fill="#0284c7" />

                  {/* Red Shutter Button with Bounce */}
                  <rect x="18" y="14" width="12" height="6" rx="2" fill="#ef4444" className="animate-bounce" />
                  {/* Top Mode Dial */}
                  <rect x="90" y="15" width="14" height="5" rx="1.5" fill="#64748b" />

                  {/* Camera Flash Element with Pulsing Glow */}
                  <g transform="translate(85, 26)">
                    <rect x="0" y="0" width="22" height="12" rx="3" fill="#38bdf8" fillOpacity="0.3" stroke="#38bdf8" strokeWidth="1" />
                    <circle cx="11" cy="6" r="4" fill="#ffffff" className="animate-ping" />
                  </g>

                  {/* Big Circular Camera Lens with Aperture */}
                  <circle cx="60" cy="58" r="28" fill="#0f172a" stroke="#64748b" strokeWidth="3" />
                  <circle cx="60" cy="58" r="22" fill="#0284c7" fillOpacity="0.4" stroke="#38bdf8" strokeWidth="1.5" />
                  <circle cx="60" cy="58" r="14" fill="#0369a1" />
                  <circle cx="60" cy="58" r="7" fill="#ffffff" className="animate-pulse" />
                  {/* Glint on Lens Glass */}
                  <path d="M46 48 Q56 40 66 44" stroke="#ffffff" strokeWidth="2" strokeLinecap="round" fill="none" opacity="0.8" />
                </g>

                {/* Center: Flash Beams & Arrow Indicator */}
                <g transform="translate(195, 62)">
                  <line x1="0" y1="0" x2="20" y2="0" stroke="#34d399" strokeWidth="2.5" strokeDasharray="3 3" className="animate-pulse" />
                  <polygon points="20,-5 28,0 20,5" fill="#34d399" />
                </g>

                {/* Right: Instant Photo Frame / ID Snapshot Snapping Out */}
                <g transform="translate(235, 16)">
                  {/* Polaroid Outer Card */}
                  <rect x="0" y="0" width="88" height="106" rx="10" fill="url(#polaroidGleam)" stroke="#cbd5e1" strokeWidth="2" className="shadow-2xl" />
                  
                  {/* Photo Canvas Frame with Trekker Silhouette */}
                  <rect x="8" y="8" width="72" height="72" rx="6" fill="url(#photoGrad)" />
                  {/* Head & Shoulders Portrait */}
                  <circle cx="44" cy="38" r="14" fill="#ffffff" fillOpacity="0.95" />
                  <path d="M22 76 C22 58 30 56 44 56 C58 56 66 58 66 76 Z" fill="#ffffff" fillOpacity="0.95" />

                  {/* Verification Check Badge on Corner */}
                  <g transform="translate(60, 60)">
                    <circle cx="10" cy="10" r="10" fill="#10b981" stroke="#ffffff" strokeWidth="1.5" />
                    <path d="M6 10 L9 13 L14 7" stroke="#ffffff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none" />
                  </g>

                  {/* Signature Bar at Bottom of Polaroid */}
                  <rect x="14" y="88" width="46" height="4" rx="2" fill="#94a3b8" />
                  <rect x="14" y="94" width="28" height="3" rx="1.5" fill="#cbd5e1" />
                </g>
              </svg>
            </div>
          )}

          {/* STEP 2: Emergency First-Aid Trauma Kit OPENING ANIMATION with Full Medical Contents */}
          {activeStep === 2 && (
            <div key="step-2-illustration" className="relative h-32 sm:h-36 w-full overflow-hidden animate-in fade-in zoom-in-95 duration-400">
              <svg
                viewBox="0 0 390 140"
                className="w-full h-full object-cover"
                preserveAspectRatio="none"
              >
                <defs>
                  <linearGradient id="bgMedTrauma" x1="0" x2="1" y1="0" y2="1">
                    <stop offset="0%" stopColor="#4c0519" />
                    <stop offset="50%" stopColor="#881337" />
                    <stop offset="100%" stopColor="#1e1b4b" />
                  </linearGradient>
                  <linearGradient id="kitBodyGrad" x1="0" x2="0" y1="0" y2="1">
                    <stop offset="0%" stopColor="#e11d48" />
                    <stop offset="100%" stopColor="#9f1239" />
                  </linearGradient>
                  <linearGradient id="foilGrad" x1="0" x2="1" y1="0" y2="1">
                    <stop offset="0%" stopColor="#f1f5f9" />
                    <stop offset="50%" stopColor="#cbd5e1" />
                    <stop offset="100%" stopColor="#94a3b8" />
                  </linearGradient>
                </defs>

                {/* Emergency Room / Rescue Backdrop */}
                <rect width="390" height="140" fill="url(#bgMedTrauma)" />

                {/* Animated Pulsing EKG Heart Telemetry Line Across the Top */}
                <g className="animate-ekg-line drop-shadow-md">
                  <path
                    d="M0 24 L70 24 L85 24 L95 8 L105 40 L115 14 L125 30 L135 24 L220 24 L235 24 L245 4 L255 44 L265 10 L275 32 L285 24 L390 24"
                    stroke="#fb7185"
                    strokeWidth="2.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    fill="none"
                  />
                </g>

                {/* Vitals Telemetry Header Indicators */}
                <g transform="translate(14, 10)">
                  <rect x="0" y="0" width="76" height="18" rx="6" fill="#1e1b4b" fillOpacity="0.8" stroke="#f43f5e" strokeWidth="1" />
                  <circle cx="8" cy="9" r="3" fill="#f43f5e" className="animate-ping" />
                  <text x="16" y="12.5" fill="#ffe4e6" fontSize="7" fontWeight="900" letterSpacing="0.5">SPO2: 98% • O+</text>
                </g>

                <g transform="translate(296, 10)">
                  <rect x="0" y="0" width="80" height="18" rx="6" fill="#1e1b4b" fillOpacity="0.8" stroke="#fbbf24" strokeWidth="1" />
                  <text x="8" y="12.5" fill="#fef3c7" fontSize="7" fontWeight="900" letterSpacing="0.5">MED KIT LOADED</text>
                </g>

                {/* CENTERPIECE: FIRST AID EMERGENCY TRAUMA BOX WITH FULL OPENING ANIMATION */}
                <g transform="translate(65, 34)">
                  {/* Box Lower Base Container (Inside Interior visible when lid opens) */}
                  <rect x="0" y="24" width="260" height="74" rx="12" fill="#18181b" stroke="#e11d48" strokeWidth="3" />
                  
                  {/* Inside Compartment Separators */}
                  <line x1="88" y1="26" x2="88" y2="96" stroke="#3f3f46" strokeWidth="2" strokeDasharray="3 3" />
                  <line x1="172" y1="26" x2="172" y2="96" stroke="#3f3f46" strokeWidth="2" strokeDasharray="3 3" />

                  {/* CONTENTS INSIDE THE BOX: */}
                  {/* ITEM 1 (Left Compartment): Clinical Stethoscope */}
                  <g transform="translate(10, 32)">
                    {/* Metal Bell / Chest Piece */}
                    <circle cx="34" cy="48" r="11" fill="url(#foilGrad)" stroke="#64748b" strokeWidth="1.5" />
                    <circle cx="34" cy="48" r="5" fill="#0f172a" />
                    {/* Flexible Rubber Tubing */}
                    <path d="M34 37 Q25 25 38 10 Q50 -4 60 12 Q68 25 58 40" fill="none" stroke="#f43f5e" strokeWidth="3" strokeLinecap="round" />
                    {/* Binaural Ear Tubes & Earpieces */}
                    <path d="M56 10 L68 2 M62 14 L74 6" stroke="#cbd5e1" strokeWidth="2" strokeLinecap="round" />
                    <circle cx="69" cy="1.5" r="2.5" fill="#1e293b" />
                    <circle cx="75" cy="5.5" r="2.5" fill="#1e293b" />
                    <text x="8" y="62" fill="#fda4af" fontSize="6.5" fontWeight="800">STETHOSCOPE</text>
                  </g>

                  {/* ITEM 2 (Center-Left): High-Altitude Asthma Inhaler (Albuterol) */}
                  <g transform="translate(94, 32)">
                    {/* Plastic L-Body */}
                    <path d="M6 14 H22 V36 H38 V48 H6 Z" fill="#ffffff" stroke="#94a3b8" strokeWidth="1.2" />
                    {/* Press Canister (Blue) */}
                    <rect x="8" y="2" width="12" height="14" rx="3" fill="#0284c7" />
                    <rect x="10" y="0" width="8" height="3" rx="1" fill="#cbd5e1" />
                    {/* Mouthpiece cap */}
                    <rect x="36" y="38" width="6" height="8" rx="1.5" fill="#38bdf8" />
                    <text x="3" y="60" fill="#e0f2fe" fontSize="6" fontWeight="800">INHALER</text>
                  </g>

                  {/* ITEM 3 (Center-Right): Sterile Gauze Roll & Antiseptic */}
                  <g transform="translate(136, 34)">
                    {/* Rolled Cylinder Gauze */}
                    <ellipse cx="16" cy="24" rx="12" ry="16" fill="#f8fafc" stroke="#cbd5e1" strokeWidth="1.5" />
                    <ellipse cx="16" cy="24" rx="5" ry="8" fill="#e2e8f0" />
                    {/* Bandage Tail with Medical Red Cross Tape */}
                    <path d="M22 36 Q32 38 34 26" fill="none" stroke="#f8fafc" strokeWidth="7" strokeLinecap="round" />
                    <rect x="25" y="29" width="4" height="4" rx="1" fill="#ef4444" />
                    <text x="4" y="58" fill="#e2e8f0" fontSize="6" fontWeight="800">GAUZE</text>
                  </g>

                  {/* ITEM 4 (Right Compartment): Blister Strip Pills (Diamox) & ORS Packet */}
                  <g transform="translate(180, 32)">
                    {/* Diamox Foil Blister Strip */}
                    <rect x="6" y="4" width="34" height="46" rx="4" fill="url(#foilGrad)" stroke="#64748b" strokeWidth="1" />
                    {/* 6 Foil Pill Pockets */}
                    <circle cx="15" cy="14" r="4.5" fill="#f8fafc" stroke="#38bdf8" strokeWidth="1" />
                    <circle cx="31" cy="14" r="4.5" fill="#f8fafc" stroke="#38bdf8" strokeWidth="1" />
                    <circle cx="15" cy="27" r="4.5" fill="#f8fafc" stroke="#38bdf8" strokeWidth="1" />
                    <circle cx="31" cy="27" r="4.5" fill="#f8fafc" stroke="#38bdf8" strokeWidth="1" />
                    <circle cx="15" cy="40" r="4.5" fill="#f8fafc" stroke="#38bdf8" strokeWidth="1" />
                    <circle cx="31" cy="40" r="4.5" fill="#f8fafc" stroke="#38bdf8" strokeWidth="1" />

                    {/* ORS Electrolyte Sachet */}
                    <rect x="44" y="10" width="26" height="40" rx="3" fill="#ea580c" stroke="#fed7aa" strokeWidth="1" />
                    <rect x="44" y="10" width="26" height="10" rx="2" fill="#ffffff" />
                    <text x="48" y="17" fill="#c2410c" fontSize="5.5" fontWeight="900">ORS</text>
                    <circle cx="57" cy="30" r="4" fill="#ffedd5" />
                    <path d="M57 28 Q59 31 57 33 Q55 31 57 28" fill="#ea580c" />
                    <text x="14" y="60" fill="#fde047" fontSize="6" fontWeight="800">DIAMOX + ORS</text>
                  </g>

                  {/* Exterior Box Latches */}
                  <rect x="-4" y="45" width="8" height="14" rx="2" fill="#d4d4d8" stroke="#71717a" strokeWidth="1" />
                  <rect x="256" y="45" width="8" height="14" rx="2" fill="#d4d4d8" stroke="#71717a" strokeWidth="1" />

                  {/* THE ANIMATED OPENING LID (Hinges upward to display open box) */}
                  <g className="animate-firstaid-lid origin-[130px_24px]">
                    {/* Lid Main Hard Shell */}
                    <rect x="0" y="2" width="260" height="26" rx="8" fill="url(#kitBodyGrad)" stroke="#fda4af" strokeWidth="2" />
                    {/* Metal Handle on Top */}
                    <path d="M105 2 V-8 C105 -12 110 -15 116 -15 H144 C150 -15 155 -12 155 -8 V2" fill="none" stroke="#f1f5f9" strokeWidth="4" strokeLinecap="round" />
                    {/* Prominent Emergency Red Cross Badge on Lid */}
                    <circle cx="130" cy="15" r="9" fill="#ffffff" />
                    <rect x="127.5" y="9" width="5" height="12" rx="1" fill="#e11d48" />
                    <rect x="124" y="12.5" width="12" height="5" rx="1" fill="#e11d48" />
                  </g>
                </g>
              </svg>
            </div>
          )}

          {/* STEP 3: Alpine Fitness Matrix, Smart Expedition Watch & VO2 Cardio Engine */}
          {activeStep === 3 && (
            <div key="step-3-illustration" className="relative h-32 sm:h-36 w-full overflow-hidden animate-in fade-in zoom-in-95 duration-400">
              <svg
                viewBox="0 0 390 140"
                className="w-full h-full object-cover"
                preserveAspectRatio="none"
              >
                <defs>
                  <linearGradient id="bgFitSport" x1="0" x2="1" y1="0" y2="1">
                    <stop offset="0%" stopColor="#064e3b" />
                    <stop offset="50%" stopColor="#0f766e" />
                    <stop offset="100%" stopColor="#022c22" />
                  </linearGradient>
                  <linearGradient id="gaugeArcGrad" x1="0" x2="1" y1="0" y2="0">
                    <stop offset="0%" stopColor="#38bdf8" />
                    <stop offset="50%" stopColor="#10b981" />
                    <stop offset="100%" stopColor="#f59e0b" />
                  </linearGradient>
                </defs>

                {/* High-Performance Athletic Grid */}
                <rect width="390" height="140" fill="url(#bgFitSport)" />

                {/* Incline Elevation Contour in Background */}
                <path d="M0 135 L120 115 L240 85 L390 55 V140 H0 Z" fill="#042f2e" fillOpacity="0.5" />
                <line x1="0" y1="135" x2="390" y2="55" stroke="#34d399" strokeWidth="2" strokeDasharray="6 4" strokeOpacity="0.4" />

                {/* Left: Alpine Smart Biometric Watch */}
                <g transform="translate(18, 12)">
                  {/* Silicone Sports Strap (Top & Bottom) */}
                  <rect x="22" y="0" width="46" height="116" rx="8" fill="#1e293b" stroke="#334155" strokeWidth="1" />
                  
                  {/* Watch Digital Casing */}
                  <rect x="8" y="18" width="74" height="80" rx="20" fill="#020617" stroke="#10b981" strokeWidth="2.2" />

                  {/* Watch Display Content */}
                  {/* Heart Pulse Icon with Dynamic Heart-Throb */}
                  <g className="animate-heart-throb origin-[45px_42px]">
                    <path
                      d="M45 46 C45 46 36 38 36 32 C36 28 39 25 43 25 C45 25 47 27 48 29 C49 27 51 25 53 25 C57 25 60 28 60 32 C60 38 51 46 51 46 Z"
                      fill="#ef4444"
                      transform="translate(-3, -2)"
                    />
                  </g>

                  {/* Live BPM Digits */}
                  <text x="45" y="66" fill="#ffffff" fontSize="18" fontWeight="900" textAnchor="middle" letterSpacing="-0.5">128</text>
                  <text x="45" y="76" fill="#34d399" fontSize="6.5" fontWeight="900" textAnchor="middle" letterSpacing="0.8">BPM • VITAL OK</text>
                  
                  {/* Miniature Cardio Wave under text */}
                  <path d="M22 84 L34 84 L38 80 L42 88 L46 82 L50 86 L54 84 L68 84" stroke="#ef4444" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
                </g>

                {/* Center: Dynamic VO2 Max Calibrated Gauge Meter */}
                <g transform="translate(142, 14)">
                  <rect x="0" y="0" width="106" height="112" rx="18" fill="#0f172a" stroke="#0d9488" strokeWidth="1.5" strokeOpacity="0.7" />
                  
                  {/* Gauge Arc Backing */}
                  <path d="M20 78 A38 38 0 0 1 86 78" fill="none" stroke="#334155" strokeWidth="8" strokeLinecap="round" />
                  {/* Glowing Colored Progress Arc */}
                  <path d="M20 78 A38 38 0 0 1 80 62" fill="none" stroke="url(#gaugeArcGrad)" strokeWidth="8" strokeLinecap="round" />

                  {/* Calibration Ticks */}
                  <circle cx="20" cy="78" r="2" fill="#38bdf8" />
                  <circle cx="53" cy="40" r="2" fill="#10b981" />
                  <circle cx="86" cy="78" r="2" fill="#f59e0b" />

                  {/* Center Gauge Hub */}
                  <circle cx="53" cy="78" r="7" fill="#1e293b" stroke="#34d399" strokeWidth="2" />
                  
                  {/* Animated Swinging Gauge Needle */}
                  <g className="animate-gauge-needle origin-[53px_78px]">
                    <line x1="53" y1="78" x2="53" y2="46" stroke="#f43f5e" strokeWidth="2.5" strokeLinecap="round" />
                    <circle cx="53" cy="78" r="3" fill="#ffffff" />
                  </g>

                  {/* VO2 Max Metrics readout */}
                  <text x="53" y="94" fill="#ffffff" fontSize="13" fontWeight="900" textAnchor="middle">54.2</text>
                  <text x="53" y="103" fill="#2dd4bf" fontSize="6.5" fontWeight="900" textAnchor="middle" letterSpacing="0.6">VO2 MAX (ml/kg)</text>
                </g>

                {/* Right: Triple Activity Rings & Incline Summit Trekker */}
                <g transform="translate(262, 14)">
                  <rect x="0" y="0" width="112" height="112" rx="18" fill="#0f172a" stroke="#059669" strokeWidth="1.5" strokeOpacity="0.7" />

                  {/* Triple Concentric Athletic Rings */}
                  <g transform="translate(36, 42)">
                    {/* Ring 1 (Outer - Elevation Climb) */}
                    <circle cx="0" cy="0" r="28" fill="none" stroke="#334155" strokeWidth="5" />
                    <circle cx="0" cy="0" r="28" fill="none" stroke="#ef4444" strokeWidth="5" strokeDasharray="135 180" strokeLinecap="round" className="animate-pulse" />

                    {/* Ring 2 (Middle - Cardio Endurance) */}
                    <circle cx="0" cy="0" r="20" fill="none" stroke="#334155" strokeWidth="5" />
                    <circle cx="0" cy="0" r="20" fill="none" stroke="#10b981" strokeWidth="5" strokeDasharray="95 130" strokeLinecap="round" />

                    {/* Ring 3 (Inner - Breath & Hydration) */}
                    <circle cx="0" cy="0" r="12" fill="none" stroke="#334155" strokeWidth="5" />
                    <circle cx="0" cy="0" r="12" fill="none" stroke="#06b6d4" strokeWidth="5" strokeDasharray="60 80" strokeLinecap="round" />
                  </g>

                  {/* Animated Climbing Athlete on Altitude Stepper */}
                  <g transform="translate(74, 30)" className="animate-climber-bounce">
                    <circle cx="16" cy="12" r="4" fill="#ffffff" />
                    <path d="M16 16 L16 28 M16 20 L10 26 M16 20 L22 24 M16 28 L11 38 M16 28 L21 37" stroke="#ffffff" strokeWidth="2.2" strokeLinecap="round" />
                    <line x1="8" y1="24" x2="6" y2="38" stroke="#fbbf24" strokeWidth="1.5" strokeLinecap="round" />
                  </g>

                  {/* Elevation & Endurance Stat Badge */}
                  <g transform="translate(10, 80)">
                    <rect x="0" y="0" width="92" height="22" rx="6" fill="#064e3b" fillOpacity="0.5" stroke="#10b981" strokeWidth="1" />
                    <text x="8" y="10" fill="#a7f3d0" fontSize="6.5" fontWeight="900">ALTITUDE ASL TARGET</text>
                    <text x="8" y="18" fill="#ffffff" fontSize="7.5" fontWeight="900" fontFamily="monospace">+2,850m READY</text>
                  </g>
                </g>
              </svg>
            </div>
          )}
        </div>
      </div>

      {/* Main Form Content Area - Isolated per step */}
      <main className="flex-1 px-4 py-4 space-y-4">
        {/* STEP 1 FORMAT: Your Details & Emergency Contacts */}
        {activeStep === 1 && (
          <section className="bg-white rounded-[24px] p-5 border-2 border-emerald-500/30 card-vibrant relative overflow-hidden transition-all duration-200">
            <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-emerald-500 via-[#0f5238] to-emerald-400" />

            {/* Profile Avatar Upload Centerpiece */}
            <div className="flex flex-col items-center justify-center mb-5 pt-1">
              <div
                onClick={() => setIsAvatarPickerOpen(true)}
                className="relative cursor-pointer group"
              >
                <div className="w-20 h-20 rounded-2xl overflow-hidden ring-4 ring-emerald-500/20 shadow-md group-hover:scale-105 transition-transform bg-slate-100">
                  <img
                    src={formData.avatarUrl}
                    alt={formData.fullName}
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 rounded-2xl flex items-center justify-center text-white transition-opacity">
                  <Camera className="w-6 h-6" />
                </div>
                <button
                  type="button"
                  onClick={() => setIsAvatarPickerOpen(true)}
                  className="absolute -bottom-1 -right-1 px-2 py-0.5 rounded-full bg-[#0f5238] text-white text-[10px] font-bold flex items-center gap-1 shadow-sm border border-white"
                >
                  <Camera className="w-3 h-3" />
                  <span>Change</span>
                </button>
              </div>
              <p className="text-[11px] text-slate-500 mt-2 font-medium">
                Tap to change your expedition profile photo
              </p>
            </div>

            <div className="space-y-4">
              {/* Full Name */}
              <div>
                <label className="block text-xs text-slate-700 mb-1 font-semibold">
                  Your Full Legal Name
                </label>
                <div className="relative flex items-center">
                  <User className="w-4 h-4 text-[#0f5238] absolute left-3.5" />
                  <input
                    type="text"
                    value={formData.fullName}
                    onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                    className="w-full pl-10 pr-10 py-3 bg-slate-50/80 rounded-xl text-slate-900 text-xs sm:text-sm border border-slate-200 focus:border-emerald-600 focus:bg-white focus:ring-2 focus:ring-emerald-500/20 outline-none transition-all shadow-2xs"
                    placeholder="e.g. Christian Pulisic"
                  />
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 absolute right-3.5 fill-emerald-100" />
                </div>
              </div>

              {/* Question 1: Date of Birth / Age (Request 8) */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs text-slate-700 font-semibold flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-emerald-700" />
                    <span>Date of Birth / Age</span>
                  </label>
                  {formData.dateOfBirth && (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-100 text-emerald-900 border border-emerald-300">
                      {formData.age ? `${formData.age} Years Old` : 'Age Verified'}
                    </span>
                  )}
                </div>
                <div className="flex gap-2">
                  <input
                    type="date"
                    value={formData.dateOfBirth || ''}
                    onChange={(e) => {
                      const newDob = e.target.value;
                      const calculatedAge = calculateAge(newDob);
                      setFormData({
                        ...formData,
                        dateOfBirth: newDob,
                        age: calculatedAge,
                      });
                    }}
                    className="flex-1 px-3.5 py-3 bg-slate-50/80 rounded-xl text-slate-900 text-xs sm:text-sm border border-slate-200 focus:border-emerald-600 focus:bg-white focus:ring-2 focus:ring-emerald-500/20 outline-none transition-all shadow-2xs font-mono font-medium cursor-pointer"
                  />
                  <div className="w-20 px-2 py-3 bg-slate-100 rounded-xl border border-slate-200 flex items-center justify-center">
                    <span className="text-xs font-bold text-slate-700">
                      {formData.age ? `${formData.age} yrs` : 'Age'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Question 2: Gender (Request 8) */}
              <div>
                <label className="block text-xs text-slate-700 mb-1.5 font-semibold">
                  Gender Identification
                </label>
                <div className="grid grid-cols-4 gap-1.5">
                  {(['Male', 'Female', 'Other', 'Prefer not to say'] as const).map((g) => {
                    const isSelected = formData.gender === g;
                    return (
                      <button
                        key={g}
                        type="button"
                        onClick={() => setFormData({ ...formData, gender: g })}
                        className={`py-2 px-1 rounded-xl text-[11px] font-bold border transition-all cursor-pointer text-center truncate ${
                          isSelected
                            ? 'bg-slate-900 text-white border-slate-900 shadow-xs ring-2 ring-emerald-500/30'
                            : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                        }`}
                        title={g}
                      >
                        {g === 'Prefer not to say' ? 'Private' : g}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Guardian Name */}
              <div>
                <label className="block text-xs text-slate-700 mb-1 font-semibold">
                  Primary Contact / Guardian Name
                </label>
                <div className="relative flex items-center">
                  <Users className="w-4 h-4 text-slate-400 absolute left-3.5" />
                  <input
                    type="text"
                    value={formData.guardianName}
                    onChange={(e) => setFormData({ ...formData, guardianName: e.target.value })}
                    className="w-full pl-10 pr-4 py-3 bg-slate-50/80 rounded-xl text-slate-900 text-xs sm:text-sm border border-slate-200 focus:border-emerald-600 focus:bg-white focus:ring-2 focus:ring-emerald-500/20 outline-none transition-all shadow-2xs"
                    placeholder="e.g. Mark Pulisic"
                  />
                </div>
              </div>

              {/* Mobile Phone Number */}
              <div>
                <label className="block text-xs text-slate-700 mb-1 font-semibold">
                  Mobile Phone Number
                </label>
                <div className="flex gap-2">
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => setShowCountryMenu(!showCountryMenu)}
                      className="flex items-center gap-1 px-3 py-3 bg-slate-50/80 border border-slate-200 rounded-xl hover:bg-slate-100 transition-colors cursor-pointer text-xs font-bold text-slate-800"
                    >
                      <span>{formData.countryCode}</span>
                      <ChevronDown className="w-3.5 h-3.5 text-slate-500" />
                    </button>

                    {showCountryMenu && (
                      <div className="absolute left-0 top-12 z-20 w-32 bg-white rounded-xl shadow-lg border border-slate-200 py-1">
                        {countryCodes.map((code) => (
                          <button
                            key={code}
                            type="button"
                            onClick={() => {
                              setFormData({ ...formData, countryCode: code });
                              setShowCountryMenu(false);
                            }}
                            className="w-full text-left px-3 py-1.5 text-xs text-slate-700 hover:bg-emerald-50 hover:text-emerald-900 cursor-pointer"
                          >
                            {code}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="relative flex-1 flex items-center">
                    <Phone className="w-4 h-4 text-slate-400 absolute left-3.5" />
                    <input
                      type="tel"
                      value={formData.phoneNumber}
                      onChange={(e) => setFormData({ ...formData, phoneNumber: e.target.value })}
                      className="w-full pl-10 pr-3 py-3 bg-slate-50/80 rounded-xl text-slate-900 text-xs sm:text-sm border border-slate-200 focus:border-emerald-600 focus:bg-white focus:ring-2 focus:ring-emerald-500/20 outline-none transition-all shadow-2xs"
                    />
                  </div>
                </div>
              </div>

              {/* Emergency Contact Number */}
              <div className="pt-2">
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs text-slate-700 font-semibold">
                    Emergency Contact Number
                  </label>
                  <span className="inline-flex items-center gap-1.5 text-[10px] font-bold tracking-wider px-2.5 py-0.5 rounded-full bg-rose-600 text-white uppercase glow-emergency">
                    <span className="w-1.5 h-1.5 rounded-full bg-white animate-ping" />
                    24/7 Rapid SOS
                  </span>
                </div>
                <div className="relative flex items-center">
                  <AlertOctagon className="w-4 h-4 text-rose-500 absolute left-3.5" />
                  <input
                    type="tel"
                    value={formData.emergencyNumber}
                    onChange={(e) => setFormData({ ...formData, emergencyNumber: e.target.value })}
                    className="w-full pl-10 pr-10 py-3 bg-rose-50/40 rounded-xl text-slate-900 text-xs sm:text-sm border-2 border-rose-300 focus:border-rose-500 focus:bg-white focus:ring-2 focus:ring-rose-400/20 outline-none transition-all shadow-2xs font-mono"
                  />
                  <span className="text-[10px] font-extrabold text-rose-600 absolute right-3.5 uppercase tracking-wider">
                    SOS
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 mt-2 flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-rose-500 shrink-0" />
                  Instantly notified via SMS &amp; satellite in case of an emergency alert.
                </p>
              </div>
            </div>
          </section>
        )}

        {/* STEP 2 FORMAT: Medical Information */}
        {activeStep === 2 && (
          <section className="bg-white rounded-[24px] p-5 border-2 border-emerald-500/30 card-vibrant relative overflow-hidden transition-all duration-200">
            <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-sky-500 via-teal-600 to-emerald-500" />

            <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-100 pt-1">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-sky-100 text-sky-800 flex items-center justify-center">
                  <Stethoscope className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-sm font-bold text-slate-900">2. Medical Information</h2>
                  <p className="text-[11px] text-slate-500">Allergies, Blood Type &amp; Medication</p>
                </div>
              </div>
              <span className="text-[10px] px-2.5 py-0.5 rounded-full font-bold uppercase tracking-wider text-sky-800 bg-sky-100 border border-sky-300">
                STEP 2 OF 3
              </span>
            </div>

            {/* Blood Group Grid Selector */}
            <div className="mb-5">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-slate-700 font-semibold">Blood Group</span>
                <span className="text-[11px] text-emerald-800 bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded-md font-bold">
                  Selected: {formData.bloodGroup} (Universal RBC)
                </span>
              </div>
              <div className="grid grid-cols-4 gap-2">
                {bloodGroups.map((bg) => (
                  <button
                    type="button"
                    key={bg}
                    onClick={() => setFormData({ ...formData, bloodGroup: bg })}
                    className={`py-2.5 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                      formData.bloodGroup === bg
                        ? 'bg-gradient-to-br from-[#0f5238] to-emerald-600 text-white ring-2 ring-emerald-500 glow-primary active:scale-95'
                        : 'border-slate-200 text-slate-700 hover:border-emerald-400 hover:text-[#0f5238] active:scale-95 bg-slate-50'
                    }`}
                  >
                    {bg}
                  </button>
                ))}
              </div>
            </div>

            {/* Allergies & Reactions with Badges */}
            <div className="mb-5">
              <label className="block text-xs text-slate-700 mb-2 font-semibold">
                Allergies &amp; Dietary Reactions
              </label>
              <div className="flex flex-wrap gap-2">
                {formData.allergies.map((allergy) => (
                  <div
                    key={allergy.id}
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold shadow-2xs border ${
                      allergy.color === 'rose'
                        ? 'bg-rose-50 border-rose-300 text-rose-800'
                        : allergy.color === 'amber'
                        ? 'bg-amber-50 border-amber-300 text-amber-900'
                        : 'bg-blue-50 border-blue-300 text-blue-900'
                    }`}
                  >
                    <span
                      className={`w-2 h-2 rounded-full animate-pulse ${
                        allergy.color === 'rose' ? 'bg-rose-500' : 'bg-amber-500'
                      }`}
                    />
                    <span>{allergy.name}</span>
                    <button
                      type="button"
                      onClick={() => removeAllergy(allergy.id)}
                      className="p-0.5 hover:opacity-75 transition-opacity cursor-pointer"
                      title="Remove allergy"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}

                <button
                  type="button"
                  onClick={() => setIsAddAllergyOpen(true)}
                  className="inline-flex items-center gap-1 px-3.5 py-1.5 rounded-full border-2 border-dashed border-emerald-500/60 bg-emerald-50/50 text-[#0f5238] text-xs font-bold hover:bg-emerald-100/60 active:scale-95 transition-all cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Allergy</span>
                </button>
              </div>
            </div>

            {/* Prescribed / Rescue Meds Box */}
            <div className="p-3.5 bg-gradient-to-r from-emerald-50/70 to-slate-50 rounded-2xl border border-emerald-200/80 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#0f5238] text-white flex items-center justify-center shadow-xs">
                  <Pill className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-xs font-bold text-slate-900 block">
                    Prescribed / Rescue Meds
                  </span>
                  <span className="text-[11px] text-slate-600">{formData.medications}</span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setFormData({ ...formData, medsPacked: !formData.medsPacked });
                  onShowToast(
                    formData.medsPacked
                      ? 'Marked meds as Pending confirmation'
                      : 'Marked meds as Packed in kit'
                  );
                }}
                className={`text-xs font-bold px-3 py-1.5 rounded-lg border transition-all cursor-pointer ${
                  formData.medsPacked
                    ? 'text-emerald-900 bg-emerald-200 border-emerald-300'
                    : 'text-amber-900 bg-amber-100 border-amber-300'
                }`}
              >
                {formData.medsPacked ? 'Packed' : 'Pending'}
              </button>
            </div>
          </section>
        )}

        {/* STEP 3 FORMAT: Physical Fitness & Final Completion */}
        {activeStep === 3 && (
          <section className="bg-white rounded-[24px] p-5 border-2 border-emerald-500/30 card-vibrant relative overflow-hidden transition-all duration-200">
            <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-teal-500 via-[#0f5238] to-emerald-500" />

            <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-100 pt-1">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-teal-100 text-teal-800 flex items-center justify-center">
                  <Activity className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-sm font-bold text-slate-900">3. Physical Fitness</h2>
                  <p className="text-[11px] text-slate-500">Alpine Endurance &amp; Health Metrics</p>
                </div>
              </div>
              <span className="text-[10px] px-2.5 py-0.5 rounded-full font-bold uppercase tracking-wider text-teal-800 bg-teal-100 border border-teal-300">
                FINAL STEP
              </span>
            </div>

            {/* Sliders with Height & Weight WITH WORKING DYNAMIC GREEN PROGRESS FILL */}
            <div className="grid grid-cols-2 gap-3 mb-4">
              {/* Height Slider Card */}
              <div className="p-3.5 bg-gradient-to-br from-emerald-50/40 to-slate-50 rounded-2xl border border-slate-200 shadow-2xs">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">
                    Height
                  </span>
                  <span className="text-xs text-[#0f5238] font-bold">cm</span>
                </div>
                <div className="flex items-baseline gap-1 my-1">
                  <span className="text-2xl font-extrabold text-[#0f5238]">
                    {formData.heightCm}
                  </span>
                  <span className="text-xs text-slate-500 font-semibold">cm</span>
                </div>
                {/* Dynamic green progress bar fill */}
                <input
                  type="range"
                  min="140"
                  max="215"
                  value={formData.heightCm}
                  onChange={(e) =>
                    setFormData({ ...formData, heightCm: Number(e.target.value) })
                  }
                  style={{
                    background: `linear-gradient(to right, #10b981 0%, #0f5238 ${heightPercent}%, #e2e8e5 ${heightPercent}%, #e2e8e5 100%)`,
                  }}
                  className="w-full mt-2 cursor-pointer transition-all"
                />
              </div>

              {/* Weight Slider Card */}
              <div className="p-3.5 bg-gradient-to-br from-emerald-50/40 to-slate-50 rounded-2xl border border-slate-200 shadow-2xs">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">
                    Weight
                  </span>
                  <span className="text-xs text-[#0f5238] font-bold">kg</span>
                </div>
                <div className="flex items-baseline gap-1 my-1">
                  <span className="text-2xl font-extrabold text-[#0f5238]">
                    {formData.weightKg}
                  </span>
                  <span className="text-xs text-slate-500 font-semibold">kg</span>
                </div>
                {/* Dynamic green progress bar fill */}
                <input
                  type="range"
                  min="45"
                  max="130"
                  value={formData.weightKg}
                  onChange={(e) =>
                    setFormData({ ...formData, weightKg: Number(e.target.value) })
                  }
                  style={{
                    background: `linear-gradient(to right, #10b981 0%, #0f5238 ${weightPercent}%, #e2e8e5 ${weightPercent}%, #e2e8e5 100%)`,
                  }}
                  className="w-full mt-2 cursor-pointer transition-all"
                />
              </div>
            </div>

            {/* BMI Pill */}
            <div className="mb-4 flex items-center justify-between bg-emerald-50/70 p-3 rounded-2xl border border-emerald-200/70 text-xs">
              <span className="font-semibold text-slate-700">Calculated Alpine BMI:</span>
              <div className="flex items-center gap-1.5">
                <span className="font-mono font-bold text-[#0f5238] text-sm">{bmi}</span>
                <span className="px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 text-[10px] font-bold">
                  Normal Range
                </span>
              </div>
            </div>

            {/* Trek Endurance Level */}
            <div className="mb-4">
              <label className="block text-xs text-slate-700 mb-2 font-semibold">
                Hiking Experience Level
              </label>
              <div className="grid grid-cols-3 gap-2">
                {(['Beginner', 'Intermediate', 'Advanced'] as const).map((level) => (
                  <button
                    key={level}
                    type="button"
                    onClick={() => setFormData({ ...formData, experienceLevel: level })}
                    className={`py-2 px-2 rounded-xl text-xs font-semibold text-center transition-all cursor-pointer ${
                      formData.experienceLevel === level
                        ? 'text-white bg-gradient-to-r from-[#0f5238] to-emerald-600 shadow-md shadow-emerald-900/20 ring-2 ring-emerald-500/40 font-bold'
                        : 'text-slate-700 bg-slate-50 border border-slate-200 hover:border-emerald-400'
                    }`}
                  >
                    {level}
                  </button>
                ))}
              </div>
            </div>

            {/* Altitude / Health Notes */}
            <div>
              <label className="block text-xs text-slate-700 mb-1 font-semibold">
                Altitude &amp; Health Notes (Optional)
              </label>
              <textarea
                rows={2}
                value={formData.healthNotes}
                onChange={(e) => setFormData({ ...formData, healthNotes: e.target.value })}
                placeholder="e.g. Occasional mild headache above 3,500m, responds quickly to hydration."
                className="w-full p-3 bg-slate-50/80 rounded-xl text-slate-900 text-xs border border-slate-200 focus:border-emerald-600 focus:bg-white focus:ring-2 focus:ring-emerald-500/20 outline-none transition-all shadow-2xs"
              />
            </div>
          </section>
        )}

        {/* Team Guide Connected Status */}
        <div className="p-3.5 rounded-2xl bg-gradient-to-r from-emerald-50 to-sky-50 border border-emerald-200/80 flex items-center justify-between shadow-2xs">
          <div className="flex items-center gap-3">
            <div className="flex -space-x-2">
              <div className="w-8 h-8 rounded-full border-2 border-white overflow-hidden bg-slate-200 shadow-xs">
                <img
                  className="w-full h-full object-cover"
                  src="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=120&q=80"
                  alt="Guide Alex"
                />
              </div>
              <div className="w-8 h-8 rounded-full border-2 border-white overflow-hidden bg-slate-200 shadow-xs">
                <img
                  className="w-full h-full object-cover"
                  src="https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=120&q=80"
                  alt="Medic Anita"
                />
              </div>
              <div className="w-8 h-8 rounded-full border-2 border-white bg-[#0f5238] text-white text-[10px] flex items-center justify-center font-bold shadow-xs">
                +12
              </div>
            </div>
            <div>
              <span className="text-xs font-bold text-slate-900 block">
                Denali Base Team Connected
              </span>
              <span className="text-[11px] text-emerald-800 font-medium">
                Lead Guide: Alex V. • Verified
              </span>
            </div>
          </div>
          <ShieldCheck className="w-5 h-5 text-emerald-600" />
        </div>
      </main>

      {/* Dedicated Bottom Navigation Bar for Profile Creation */}
      <div className="fixed bottom-0 left-0 right-0 z-40 max-w-md mx-auto p-4 bg-white/95 backdrop-blur-md border-t border-slate-200/80 shadow-lg flex items-center gap-3">
        {/* Previous Button */}
        <button
          type="button"
          onClick={handlePrev}
          className="h-[52px] px-4 rounded-2xl border-2 border-slate-200 bg-white text-slate-700 text-xs font-bold hover:bg-slate-50 active:scale-95 transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>{activeStep === 1 ? 'Login' : 'Back'}</span>
        </button>

        {/* Primary Action Button */}
        <button
          type="button"
          onClick={handleNext}
          className="flex-1 h-[52px] rounded-2xl bg-gradient-to-r from-[#0f5238] via-[#166534] to-emerald-600 hover:brightness-110 text-white text-xs sm:text-sm font-bold flex items-center justify-center gap-2 glow-primary active:scale-[0.98] transition-all duration-150 cursor-pointer shadow-lg group"
        >
          <span>
            {activeStep === 1 && 'Next: Medical Information'}
            {activeStep === 2 && 'Next: Physical Fitness'}
            {activeStep === 3 && 'Complete Profile & Enter Home'}
          </span>
          {activeStep === 3 ? (
            <CheckCircle2 className="w-5 h-5" />
          ) : (
            <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
          )}
        </button>
      </div>

      {/* Profile Photo Picker Modal */}
      {isAvatarPickerOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-md animate-in fade-in duration-200">
          <div className="w-full max-w-sm bg-white rounded-3xl p-5 border border-emerald-900/10 shadow-2xl flex flex-col">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-emerald-100 text-[#0f5238] flex items-center justify-center">
                  <Camera className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-sm">Profile Avatar</h3>
                  <p className="text-[11px] text-slate-500">Pick an avatar or upload photo</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsAvatarPickerOpen(false)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-2">
                  Select Alpine Mountaineer Avatar
                </label>
                <div className="grid grid-cols-3 gap-2.5">
                  {presetAvatars.map((url, idx) => (
                    <div
                      key={idx}
                      onClick={() => {
                        setFormData((prev) => ({ ...prev, avatarUrl: url }));
                        onShowToast('Avatar updated!');
                        setIsAvatarPickerOpen(false);
                      }}
                      className={`relative rounded-xl overflow-hidden aspect-square border-2 cursor-pointer hover:scale-105 transition-all shadow-2xs ${
                        formData.avatarUrl === url
                          ? 'border-emerald-600 ring-2 ring-emerald-500/40'
                          : 'border-slate-200 hover:border-emerald-400'
                      }`}
                    >
                      <img src={url} alt={`Preset ${idx}`} className="w-full h-full object-cover" />
                      {formData.avatarUrl === url && (
                        <span className="absolute bottom-1 right-1 w-4 h-4 rounded-full bg-emerald-600 text-white flex items-center justify-center shadow-xs">
                          <CheckCircle2 className="w-3 h-3 fill-current" />
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Upload Custom File */}
              <div className="pt-2">
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileUpload}
                  accept="image/*"
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full py-2.5 rounded-xl border border-dashed border-emerald-600 bg-emerald-50/60 hover:bg-emerald-100 text-[#0f5238] text-xs font-bold flex items-center justify-center gap-2 cursor-pointer transition-colors"
                >
                  <Upload className="w-4 h-4" />
                  <span>Upload from Device Gallery</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add Allergy Modal */}
      <AddAllergyModal
        isOpen={isAddAllergyOpen}
        onClose={() => setIsAddAllergyOpen(false)}
        onAdd={addAllergy}
      />
    </div>
  );
};
