import React, { useState } from 'react';
import {
  Users,
  Coins,
  Calendar,
  ArrowRight,
  Compass,
  Wallet,
  CalendarDays,
  Image as ImageIcon,
  ShieldAlert,
  ChevronRight,
  ChevronLeft,
  Lock,
  Database,
  ShieldCheck,
  EyeOff,
  FileText,
  X,
  Code2,
} from 'lucide-react';

interface OnboardingScreenProps {
  onComplete: () => void;
}

const TRAILOPS_LOGO_URL =
  'https://lh3.googleusercontent.com/aida-public/AB6AXuDoOkdufNQ_DUu2V-PxkdtGDSq1PXuvkv_0p1vFU4_nKvhP1enpI5Nk1nw_8mrz-Sb86Pt5lv9A3HVq5DCK6KW8V20HJddzyfFl5XbpsY3hCnTamea_hvx1s8csePi5DaMd4UUFVLJwJEjzJgUA8cDRsjd0gcLF87BgoN7-g4yjfZ6-1LQBbSwhAia7tvdwjnvlkccBjfrfLHFWWjvR9BoqbgT7fDE4KyGBDeqxNn0G8IUW_aJ27bUtZyl9Y3WBseEWR7o';

export const OnboardingScreen: React.FC<OnboardingScreenProps> = ({ onComplete }) => {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [activeLegalModal, setActiveLegalModal] = useState<'privacy' | 'terms' | null>(null);

  const handleSkipToLogin = () => {
    onComplete();
  };

  return (
    <div className="w-full min-h-screen flex items-center justify-center font-sans antialiased select-none">
      {/* =========================================================================
          STEP 1: GREAT JOURNEYS START TOGETHER
         ========================================================================= */}
      {step === 1 && (
        <div className="relative w-full min-h-screen overflow-hidden flex flex-col justify-between bg-gradient-to-br from-[#ea85a9] via-[#d598ea] to-[#fdb58e] p-3.5 sm:p-4 animate-in fade-in duration-300">
          {/* Background Organic Curved Ribbon / Flowing Waves Layer */}
          <div className="absolute inset-0 pointer-events-none overflow-hidden z-0">
            <svg
              className="absolute -left-12 top-[18%] w-[560px] h-[340px] opacity-75 mix-blend-screen"
              fill="none"
              viewBox="0 0 560 340"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M-40 180 C110 90 220 280 380 170 C480 100 560 140 600 160 L600 360 L-40 360 Z"
                fill="url(#pinkWaveGrad)"
              />
              <defs>
                <linearGradient
                  gradientUnits="userSpaceOnUse"
                  id="pinkWaveGrad"
                  x1="0"
                  x2="560"
                  y1="100"
                  y2="300"
                >
                  <stop stopColor="#ffffff" stopOpacity="0.5" />
                  <stop offset="0.5" stopColor="#e9d2ff" stopOpacity="0.6" />
                  <stop offset="1" stopColor="#fbcfe8" stopOpacity="0.3" />
                </linearGradient>
              </defs>
            </svg>
            {/* Circular Ambient Glows */}
            <div className="absolute -top-16 -right-16 w-60 h-60 bg-[#fed7aa]/50 rounded-full blur-2xl" />
            <div className="absolute bottom-10 -left-20 w-64 h-64 bg-[#ec4899]/30 rounded-full blur-3xl" />
          </div>

          {/* Central Floating Clean White Card */}
          <div className="relative z-10 w-full flex-1 bg-white rounded-[32px] sm:rounded-[36px] shadow-[0_20px_45px_rgba(180,60,110,0.16)] flex flex-col justify-between overflow-hidden border border-white/80">
            {/* Top Card Header: Logo Branding & Skip Action */}
            <header className="pt-5 px-6 pb-2 flex items-center justify-between z-20">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl overflow-hidden shadow-sm shadow-slate-900/10 flex-shrink-0 border border-slate-100">
                  <img
                    alt="TrailOPS Logo"
                    className="w-full h-full object-cover"
                    src={TRAILOPS_LOGO_URL}
                  />
                </div>
                <div className="flex flex-col">
                  <span className="text-[15px] font-black tracking-wider leading-none text-slate-800">
                    TRAILOPS
                  </span>
                  <span className="text-[8px] font-bold tracking-[0.2em] text-slate-400 uppercase mt-0.5">
                    Expedition OS
                  </span>
                </div>
              </div>

              {/* Skip Button */}
              <button
                aria-label="Skip introduction"
                onClick={handleSkipToLogin}
                className="text-[12px] font-bold text-slate-400 hover:text-slate-700 tracking-wider uppercase px-2.5 py-1.5 rounded-lg hover:bg-slate-50 transition-colors duration-150 cursor-pointer"
                type="button"
              >
                SKIP
              </button>
            </header>

            {/* Center Upper Artwork Section with Lavender Wave Blob behind Scenic Art */}
            <div className="relative flex-1 flex items-center justify-center min-h-[220px] max-h-[300px] my-1 px-4">
              {/* Flowing Pastel Blob */}
              <div className="absolute inset-x-2 h-44 my-auto bg-gradient-to-r from-[#eddfff] via-[#e5d4ff] to-[#fce4ec] rounded-[48px] rotate-[-2deg] scale-105 pointer-events-none opacity-80" />

              {/* Scenic Expedition Vector Artwork Illustration */}
              <div className="relative w-full max-w-[310px] h-[220px] rounded-2xl overflow-hidden shadow-sm select-none">
                <svg
                  className="w-full h-full object-cover"
                  fill="none"
                  preserveAspectRatio="xMidYMax slice"
                  viewBox="0 0 380 260"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <defs>
                    <linearGradient
                      gradientUnits="userSpaceOnUse"
                      id="skyGrad"
                      x1="190"
                      x2="190"
                      y1="0"
                      y2="200"
                    >
                      <stop offset="0%" stopColor="#EEF5F0" />
                      <stop offset="60%" stopColor="#FFF8EE" />
                      <stop offset="100%" stopColor="#E2ECE5" />
                    </linearGradient>
                    <linearGradient
                      gradientUnits="userSpaceOnUse"
                      id="mntFar"
                      x1="120"
                      x2="220"
                      y1="70"
                      y2="150"
                    >
                      <stop offset="0%" stopColor="#A5C6B7" />
                      <stop offset="100%" stopColor="#80A997" />
                    </linearGradient>
                    <linearGradient
                      gradientUnits="userSpaceOnUse"
                      id="mntMid"
                      x1="200"
                      x2="310"
                      y1="90"
                      y2="200"
                    >
                      <stop offset="0%" stopColor="#5B8E78" />
                      <stop offset="100%" stopColor="#376753" />
                    </linearGradient>
                    <linearGradient
                      gradientUnits="userSpaceOnUse"
                      id="mntLeft"
                      x1="20"
                      x2="150"
                      y1="90"
                      y2="200"
                    >
                      <stop offset="0%" stopColor="#6F9D8B" />
                      <stop offset="100%" stopColor="#325F4D" />
                    </linearGradient>
                    <linearGradient
                      gradientUnits="userSpaceOnUse"
                      id="riverGrad"
                      x1="190"
                      x2="150"
                      y1="130"
                      y2="260"
                    >
                      <stop offset="0%" stopColor="#85C7BF" />
                      <stop offset="100%" stopColor="#4E9990" />
                    </linearGradient>
                    <linearGradient
                      gradientUnits="userSpaceOnUse"
                      id="cliffGrad"
                      x1="0"
                      x2="160"
                      y1="160"
                      y2="260"
                    >
                      <stop offset="0%" stopColor="#3F4D4B" />
                      <stop offset="100%" stopColor="#1E2827" />
                    </linearGradient>
                  </defs>
                  {/* Sky Background */}
                  <rect fill="url(#skyGrad)" height="260" width="380" />
                  {/* Warm Glowing Sun */}
                  <circle cx="230" cy="85" fill="#FDBA74" opacity="0.85" r="28" />
                  {/* Birds in distant flight */}
                  <path
                    d="M150 72 C153 69 157 70 159 73 C161 70 165 69 168 72"
                    fill="none"
                    opacity="0.6"
                    stroke="#48695C"
                    strokeLinecap="round"
                    strokeWidth="1.3"
                  />
                  <path
                    d="M168 62 C170 59 173 60 175 62 C177 60 180 59 182 62"
                    fill="none"
                    opacity="0.45"
                    stroke="#48695C"
                    strokeLinecap="round"
                    strokeWidth="1.1"
                  />
                  {/* Distant & Mid Mountains */}
                  <polygon fill="url(#mntFar)" opacity="0.85" points="100,160 180,80 260,160" />
                  <polygon fill="url(#mntFar)" opacity="0.75" points="170,160 235,90 310,160" />
                  <polygon fill="url(#mntLeft)" points="30,190 125,95 210,190" />
                  <polygon fill="url(#mntMid)" points="160,190 255,100 360,205" />
                  {/* Valley River Flow */}
                  <path
                    d="M210 145 C200 160 220 175 198 190 C175 205 195 225 160 260 L205 260 C235 215 210 195 230 180 C248 165 224 152 220 145 Z"
                    fill="url(#riverGrad)"
                    opacity="0.9"
                  />
                  {/* Evergreen Pines */}
                  <g fill="#173426">
                    <polygon points="320,165 312,185 328,185" />
                    <polygon points="320,178 310,200 330,200" />
                    <polygon points="320,192 306,220 334,220" />
                    <rect fill="#0C1D15" height="12" width="4" x="318" y="220" />
                    <polygon points="345,140 335,165 355,165" />
                    <polygon points="345,157 332,185 358,185" />
                    <polygon points="345,178 328,212 362,212" />
                    <polygon points="345,202 324,242 366,242" />
                    <rect fill="#0C1D15" height="16" width="6" x="342" y="242" />
                  </g>
                  {/* Hiker Cliff Outcrop */}
                  <path
                    d="M-10 185 Q50 185 80 205 Q120 220 155 230 Q180 240 190 260 L-10 260 Z"
                    fill="url(#cliffGrad)"
                  />
                  {/* Seated Hiker Silhouette & Backpack */}
                  <ellipse cx="110" cy="245" fill="#141E1C" opacity="0.6" rx="30" ry="6" />
                  <path
                    d="M78 192 C76 182 87 175 97 178 L100 214 C89 217 78 210 78 192 Z"
                    fill="#0E4434"
                  />
                  <rect fill="#D97706" height="7" rx="1.5" width="14" x="82" y="184" />
                  {/* Body */}
                  <path
                    d="M96 186 C97 176 109 175 116 178 C122 182 123 195 121 206 L105 212 Z"
                    fill="#1B4D3E"
                  />
                  {/* Head */}
                  <circle cx="114" cy="166" fill="#F4B896" r="8" />
                  <path
                    d="M107 164 C107 157 115 155 121 159 C124 161 125 167 120 168 C117 168 115 164 112 166 C109 168 108 167 107 164 Z"
                    fill="#1E293B"
                  />
                  {/* Legs */}
                  <path
                    d="M105 210 C114 210 126 209 135 221 C140 227 139 234 131 236 C122 237 113 227 103 221 Z"
                    fill="#334155"
                  />
                  <path
                    d="M130 224 L152 227 C157 228 159 232 155 236 L136 237 Z"
                    fill="#1E293B"
                  />
                </svg>
              </div>
            </div>

            {/* Typography Copy Section */}
            <div className="px-6 py-2 text-center flex flex-col items-center">
              <h1 className="font-serif text-[27px] sm:text-[30px] font-bold text-slate-900 tracking-tight leading-[1.2] mb-2.5">
                Great Journeys
                <br />
                <span className="italic font-normal text-slate-800">Start Together</span>
              </h1>
              <p className="text-[13px] sm:text-[13.5px] leading-relaxed text-slate-500 font-normal max-w-[290px] mx-auto">
                Plan trips, organise your team, track expenses, share documents, and keep everything
                in one place.
              </p>

              {/* Quick Mini Feature Pill Indicators */}
              <div className="flex items-center justify-center gap-2 mt-4 flex-wrap">
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-800 text-[11px] font-medium border border-emerald-100">
                  <Users className="w-3 h-3 stroke-[2.2]" /> Team
                </span>
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-50 text-amber-800 text-[11px] font-medium border border-amber-100">
                  <Coins className="w-3 h-3 stroke-[2.2]" /> Expenses
                </span>
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-indigo-50 text-indigo-800 text-[11px] font-medium border border-indigo-100">
                  <Calendar className="w-3 h-3 stroke-[2.2]" /> Itinerary
                </span>
              </div>
            </div>

            {/* Card Bottom Actions & Pagination */}
            <footer className="px-6 pt-3 pb-6 sm:pb-7 flex items-center justify-between mt-auto border-t border-slate-50">
              {/* Dot / Diamond Pagination */}
              <div aria-label="Step 1 of 3" className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rotate-45 bg-[#2548e6] rounded-[2px] inline-block shadow-sm" />
                <button
                  type="button"
                  onClick={() => setStep(2)}
                  aria-label="Go to step 2"
                  className="w-2 h-2 rounded-full border border-slate-300 bg-transparent inline-block cursor-pointer"
                />
                <button
                  type="button"
                  onClick={() => setStep(3)}
                  aria-label="Go to step 3"
                  className="w-2 h-2 rounded-full border border-slate-300 bg-transparent inline-block cursor-pointer"
                />
                <span className="text-[11px] font-bold text-slate-400 ml-1 tracking-wider">
                  1 / 3
                </span>
              </div>

              {/* Primary CTA Button */}
              <button
                onClick={() => setStep(2)}
                className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-full sm:rounded-2xl bg-gradient-to-r from-[#2f55f4] to-[#1e42dd] hover:from-[#254be8] hover:to-[#1737c7] active:scale-[0.98] text-white font-bold text-[13.5px] tracking-wide uppercase shadow-md shadow-blue-600/30 transition-all duration-150 cursor-pointer"
                type="button"
              >
                <span>Explore TrailOPS</span>
                <ArrowRight className="w-4 h-4 stroke-[2.5]" />
              </button>
            </footer>
          </div>
        </div>
      )}

      {/* =========================================================================
          STEP 2: YOUR JOURNEY. BETTER ORGANISED.
         ========================================================================= */}
      {step === 2 && (
        <div
          className="w-full min-h-screen relative flex flex-col justify-between overflow-hidden p-3.5 sm:p-4 animate-in fade-in duration-300"
          style={{
            background:
              'linear-gradient(145deg, #fce4ec 0%, #f7d8e8 25%, #eed3f2 50%, #e2c8f8 75%, #f6a5c0 100%)',
          }}
        >
          {/* Organic Wave SVG Ribbons */}
          <div className="absolute inset-0 pointer-events-none overflow-hidden z-0">
            <div className="absolute -top-20 -left-20 w-80 h-80 rounded-full bg-gradient-to-br from-[#ff6b9d]/35 to-[#f06292]/10 blur-2xl" />
            <svg
              className="absolute top-1/4 -left-16 w-[540px] h-80 opacity-60"
              fill="none"
              preserveAspectRatio="none"
              viewBox="0 0 500 200"
            >
              <path
                d="M-20,90 C80,180 180,10 320,110 C420,190 480,80 540,100 L540,220 L-20,220 Z"
                fill="url(#lilacWave)"
              />
              <defs>
                <linearGradient id="lilacWave" x1="0%" x2="100%" y1="0%" y2="0%">
                  <stop offset="0%" stopColor="#d6bbfb" stopOpacity="0.85" />
                  <stop offset="60%" stopColor="#e9d5ff" stopOpacity="0.95" />
                  <stop offset="100%" stopColor="#fbcfe8" stopOpacity="0.7" />
                </linearGradient>
              </defs>
            </svg>
            <div className="absolute -bottom-16 -right-16 w-80 h-80 rounded-full bg-gradient-to-tl from-[#e040fb]/30 via-[#ec4899]/35 to-transparent blur-3xl" />
          </div>

          {/* Foreground Floating Clean White Card */}
          <main className="relative z-10 w-full flex-1 bg-white/95 backdrop-blur-xl rounded-[32px] sm:rounded-[36px] shadow-[0_20px_45px_-12px_rgba(99,43,115,0.18)] flex flex-col justify-between p-5 sm:p-6 border border-white/80 overflow-hidden">
            {/* Header: App Logo, Wordmark, Back & Skip */}
            <header className="flex items-center justify-between pt-1 pb-2">
              <div className="flex items-center gap-2.5">
                <img
                  alt="TrailOps Logo"
                  className="w-9 h-9 rounded-xl object-cover shadow-sm ring-1 ring-black/5"
                  src={TRAILOPS_LOGO_URL}
                />
                <div className="flex flex-col">
                  <span className="text-[13px] font-extrabold tracking-tight text-[#0f241d] leading-none">
                    TRAILOPS
                  </span>
                  <span className="text-[8.5px] font-bold tracking-widest text-[#006242] mt-0.5 uppercase">
                    EXPEDITION OS
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => setStep(1)}
                  className="flex items-center gap-0.5 text-[11.5px] font-bold uppercase tracking-wider text-slate-400 hover:text-slate-700 transition-colors py-1 px-2 rounded-lg hover:bg-slate-100 cursor-pointer"
                  type="button"
                >
                  <ChevronLeft className="w-3.5 h-3.5 stroke-[2.5]" />
                  <span>Back</span>
                </button>
                <button
                  onClick={handleSkipToLogin}
                  className="text-[12px] font-bold tracking-wider text-[#747687] hover:text-[#0a40e2] uppercase transition-colors px-2 py-1 rounded-lg hover:bg-slate-100 cursor-pointer"
                  type="button"
                >
                  SKIP
                </button>
              </div>
            </header>

            {/* Top Visual / Badge & Editorial Headlines */}
            <section className="mt-2 space-y-2.5">
              <div className="flex items-center gap-2">
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-gradient-to-r from-[#eef2ff] to-[#f5f3ff] border border-[#dee1ff] text-[#0a40e2] shadow-2xs">
                  <Compass className="w-3.5 h-3.5" />
                  <span className="text-[11px] font-bold tracking-wide uppercase">
                    All-in-One Toolkit
                  </span>
                </div>
                <div className="h-px flex-1 bg-gradient-to-r from-[#dee1ff] to-transparent" />
              </div>
              <div className="space-y-1">
                <h1 className="text-[26px] sm:text-[29px] font-serif font-bold text-[#141b2b] leading-[1.14] tracking-tight">
                  Your Journey.
                  <br />
                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#0a40e2] via-[#2563eb] to-[#006242]">
                    Better Organised.
                  </span>
                </h1>
                <p className="text-[12.5px] text-[#555a6d] font-normal leading-relaxed pr-2">
                  Less chaos. More adventure. Everything your trip team needs, seamlessly united in
                  one place.
                </p>
              </div>
            </section>

            {/* Feature Stack Cards List (5 Core Features) */}
            <section className="my-auto py-2 space-y-2.5">
              {/* Card 1: Trip & Team Management */}
              <article className="group flex items-center gap-3.5 p-3 rounded-2xl bg-[#f8fafc] hover:bg-[#f1f5f9] border border-[#edf2f7] transition-all duration-200 shadow-2xs">
                <div className="w-10 h-10 rounded-xl bg-emerald-50 text-[#006242] border border-emerald-100/70 flex items-center justify-center shrink-0">
                  <Users className="w-5 h-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <h2 className="text-[13px] font-bold text-[#111827] leading-tight group-hover:text-[#0a40e2] transition-colors">
                    Trip &amp; Team Management
                  </h2>
                  <p className="text-[11px] text-[#64748b] font-normal truncate mt-0.5">
                    Organise members, subgroups and trip information
                  </p>
                </div>
                <ChevronRight className="w-4 h-4 text-[#94a3b8] group-hover:translate-x-0.5 transition-transform shrink-0" />
              </article>

              {/* Card 2: Smart Expense Tracking */}
              <article className="group flex items-center gap-3.5 p-3 rounded-2xl bg-[#f8fafc] hover:bg-[#f1f5f9] border border-[#edf2f7] transition-all duration-200 shadow-2xs">
                <div className="w-10 h-10 rounded-xl bg-amber-50 text-[#d97706] border border-amber-100/70 flex items-center justify-center shrink-0">
                  <Wallet className="w-5 h-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <h2 className="text-[13px] font-bold text-[#111827] leading-tight group-hover:text-[#0a40e2] transition-colors">
                    Smart Expense Tracking
                  </h2>
                  <p className="text-[11px] text-[#64748b] font-normal truncate mt-0.5">
                    Track shared expenses, contributions and settlements
                  </p>
                </div>
                <ChevronRight className="w-4 h-4 text-[#94a3b8] group-hover:translate-x-0.5 transition-transform shrink-0" />
              </article>

              {/* Card 3: Itinerary & Documents */}
              <article className="group flex items-center gap-3.5 p-3 rounded-2xl bg-[#f8fafc] hover:bg-[#f1f5f9] border border-[#edf2f7] transition-all duration-200 shadow-2xs">
                <div className="w-10 h-10 rounded-xl bg-purple-50 text-[#7c3aed] border border-purple-100/70 flex items-center justify-center shrink-0">
                  <CalendarDays className="w-5 h-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <h2 className="text-[13px] font-bold text-[#111827] leading-tight group-hover:text-[#0a40e2] transition-colors">
                    Itinerary &amp; Documents
                  </h2>
                  <p className="text-[11px] text-[#64748b] font-normal truncate mt-0.5">
                    Keep schedules, tickets, forms and important documents
                  </p>
                </div>
                <ChevronRight className="w-4 h-4 text-[#94a3b8] group-hover:translate-x-0.5 transition-transform shrink-0" />
              </article>

              {/* Card 4: Group Updates & Photos */}
              <article className="group flex items-center gap-3.5 p-3 rounded-2xl bg-[#f8fafc] hover:bg-[#f1f5f9] border border-[#edf2f7] transition-all duration-200 shadow-2xs">
                <div className="w-10 h-10 rounded-xl bg-sky-50 text-[#0284c7] border border-sky-100/70 flex items-center justify-center shrink-0">
                  <ImageIcon className="w-5 h-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <h2 className="text-[13px] font-bold text-[#111827] leading-tight group-hover:text-[#0a40e2] transition-colors">
                    Group Updates &amp; Photos
                  </h2>
                  <p className="text-[11px] text-[#64748b] font-normal truncate mt-0.5">
                    Share announcements, photos and trip updates
                  </p>
                </div>
                <ChevronRight className="w-4 h-4 text-[#94a3b8] group-hover:translate-x-0.5 transition-transform shrink-0" />
              </article>

              {/* Card 5: Safety & Emergency Contacts */}
              <article className="group flex items-center gap-3.5 p-3 rounded-2xl bg-[#f8fafc] hover:bg-[#f1f5f9] border border-[#edf2f7] transition-all duration-200 shadow-2xs">
                <div className="w-10 h-10 rounded-xl bg-rose-50 text-[#e11d48] border border-rose-100/70 flex items-center justify-center shrink-0">
                  <ShieldAlert className="w-5 h-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <h2 className="text-[13px] font-bold text-[#111827] leading-tight group-hover:text-[#0a40e2] transition-colors">
                    Safety &amp; Emergency Contacts
                  </h2>
                  <p className="text-[11px] text-[#64748b] font-normal truncate mt-0.5">
                    Access emergency contacts and important safety information
                  </p>
                </div>
                <ChevronRight className="w-4 h-4 text-[#94a3b8] group-hover:translate-x-0.5 transition-transform shrink-0" />
              </article>
            </section>

            {/* Bottom Navigation Bar: Pagination & Vibrant Action Button */}
            <footer className="pt-3 pb-1 flex items-center justify-between border-t border-slate-100">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  aria-label="Go to step 1"
                  className="w-2.5 h-2.5 rounded-full border-[1.5px] border-[#94a3b8] bg-transparent inline-block cursor-pointer"
                />
                <span className="w-2.5 h-2.5 rounded-full bg-[#0a40e2] inline-block shadow-sm shadow-[#0a40e2]/40" />
                <button
                  type="button"
                  onClick={() => setStep(3)}
                  aria-label="Go to step 3"
                  className="w-2.5 h-2.5 rounded-full border-[1.5px] border-[#94a3b8] bg-transparent inline-block cursor-pointer"
                />
                <span className="text-[11px] font-bold text-[#64748b] ml-1.5 tracking-wider">
                  2 / 3
                </span>
              </div>

              <button
                onClick={() => setStep(3)}
                className="inline-flex items-center justify-center gap-2 bg-gradient-to-r from-[#0a40e2] to-[#375dfb] hover:from-[#0835be] hover:to-[#254bdb] text-white text-[13.5px] font-bold px-6 py-3.5 rounded-full shadow-[0_10px_25px_-4px_rgba(10,64,226,0.45)] transition-all transform active:scale-95 cursor-pointer"
                type="button"
              >
                <span>Continue</span>
                <ArrowRight className="w-4 h-4 stroke-[2.5]" />
              </button>
            </footer>
          </main>
        </div>
      )}

      {/* =========================================================================
          STEP 3: YOUR PRIVACY MATTERS + DEVELOPER ATTRIBUTION
         ========================================================================= */}
      {step === 3 && (
        <main className="w-full min-h-screen relative overflow-hidden flex flex-col justify-between bg-gradient-to-br from-[#f8a8b8] via-[#e577aa] to-[#d64a93] p-3.5 sm:p-4 animate-in fade-in duration-300">
          {/* Decorative Organic Wave / Liquid Ribbon Behind the Card */}
          <div className="absolute inset-0 pointer-events-none overflow-hidden z-0">
            <div className="absolute -top-16 -left-16 w-80 h-80 rounded-full bg-[#fdd0c7] opacity-60 blur-3xl" />
            <div className="absolute top-1/3 -right-20 w-72 h-80 rounded-full bg-[#d8b4fe] opacity-50 blur-2xl" />
            <div className="absolute bottom-4 left-1/4 w-80 h-64 rounded-full bg-[#fa86be] opacity-50 blur-2xl" />
            <svg
              className="absolute top-[12%] -left-12 w-[520px] h-[340px] opacity-45 transform rotate-[-8deg]"
              fill="none"
              viewBox="0 0 500 300"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M-40,110 C80,30 200,220 330,120 C420,50 490,140 540,160 L540,290 C470,270 380,210 280,260 C150,320 60,190 -40,240 Z"
                fill="url(#violetWave)"
              />
              <defs>
                <linearGradient id="violetWave" x1="0%" x2="100%" y1="0%" y2="100%">
                  <stop offset="0%" stopColor="#ffffff" stopOpacity="0.85" />
                  <stop offset="50%" stopColor="#dfd0fb" stopOpacity="0.7" />
                  <stop offset="100%" stopColor="#d4b5f9" stopOpacity="0.55" />
                </linearGradient>
              </defs>
            </svg>
          </div>

          {/* Floating Card Container */}
          <div className="relative z-10 flex-1 flex flex-col bg-white rounded-[32px] shadow-[0_20px_45px_-10px_rgba(186,73,142,0.18)] overflow-hidden border border-white/80">
            {/* Card Header (Logo + Brand + Back + Skip) */}
            <header className="px-5 pt-5 pb-3 flex items-center justify-between shrink-0 border-b border-slate-100/70">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl overflow-hidden shadow-sm flex items-center justify-center bg-white border border-slate-100">
                  <img
                    alt="TrailOps Expedition OS Logo"
                    className="w-full h-full object-cover"
                    src={TRAILOPS_LOGO_URL}
                  />
                </div>
                <div className="flex flex-col">
                  <span className="text-[14.5px] font-extrabold tracking-wider text-slate-900 leading-none">
                    TRAILOPS
                  </span>
                  <span className="text-[8.5px] font-bold tracking-[0.18em] text-[#3b66f5] uppercase mt-0.5">
                    Expedition OS
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-1">
                <button
                  aria-label="Go back to previous screen"
                  onClick={() => setStep(2)}
                  className="flex items-center gap-1 text-[11.5px] font-bold uppercase tracking-wider text-slate-400 hover:text-slate-700 transition-colors py-1 px-2 rounded-lg hover:bg-slate-100 cursor-pointer"
                  type="button"
                >
                  <ChevronLeft className="w-3.5 h-3.5 stroke-[2.5]" />
                  <span>Back</span>
                </button>
                <button
                  onClick={handleSkipToLogin}
                  className="text-[11.5px] font-bold uppercase tracking-wider text-slate-400 hover:text-[#3b66f5] transition-colors py-1 px-2 rounded-lg hover:bg-slate-100 cursor-pointer"
                  type="button"
                >
                  SKIP
                </button>
              </div>
            </header>

            {/* Scrollable Content Body */}
            <div className="px-5 py-4 overflow-y-auto flex-1 flex flex-col gap-3.5">
              {/* Title & Subtitle */}
              <div className="text-left pt-0.5">
                <h1 className="font-serif text-[26px] font-bold text-slate-900 tracking-tight leading-[1.2]">
                  Your Privacy Matters
                </h1>
                <p className="text-[13px] text-slate-500 mt-1 leading-relaxed font-normal">
                  We are committed to keeping your data safe, secure and transparent.
                </p>
              </div>

              {/* Security Features Itemized Group */}
              <div className="bg-slate-50/80 rounded-2xl p-3.5 border border-slate-100/90 flex flex-col gap-3.5">
                {/* Item 1: Secure Authentication */}
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-xl bg-blue-50 text-[#3b66f5] flex items-center justify-center shrink-0 mt-0.5 shadow-2xs">
                    <Lock className="w-4 h-4" />
                  </div>
                  <div>
                    <h2 className="text-[12.5px] font-bold text-slate-800 leading-tight">
                      Secure Authentication
                    </h2>
                    <p className="text-[11.5px] text-slate-500 leading-[16px] mt-0.5">
                      We use Supabase Authentication (secure OAuth with Google) to keep your account
                      safe.
                    </p>
                  </div>
                </div>

                {/* Item 2: Secure Database */}
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-xl bg-indigo-50 text-[#4965ea] flex items-center justify-center shrink-0 mt-0.5 shadow-2xs">
                    <Database className="w-4 h-4" />
                  </div>
                  <div>
                    <h2 className="text-[12.5px] font-bold text-slate-800 leading-tight">
                      Secure Database
                    </h2>
                    <p className="text-[11.5px] text-slate-500 leading-[16px] mt-0.5">
                      All your data is stored in Supabase with encrypted connections and row level
                      security (RLS).
                    </p>
                  </div>
                </div>

                {/* Item 3: We Only Use What's Needed */}
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0 mt-0.5 shadow-2xs">
                    <ShieldCheck className="w-4 h-4" />
                  </div>
                  <div>
                    <h2 className="text-[12.5px] font-bold text-slate-800 leading-tight">
                      We Only Use What&apos;s Needed
                    </h2>
                    <p className="text-[11.5px] text-slate-500 leading-[16px] mt-0.5">
                      We collect only the information required to provide app features like trip
                      management, expenses, documents and safety tools.
                    </p>
                  </div>
                </div>

                {/* Item 4: We Do Not Share Your Data */}
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-xl bg-violet-50 text-violet-600 flex items-center justify-center shrink-0 mt-0.5 shadow-2xs">
                    <EyeOff className="w-4 h-4" />
                  </div>
                  <div>
                    <h2 className="text-[12.5px] font-bold text-slate-800 leading-tight">
                      We Do Not Share Your Data
                    </h2>
                    <p className="text-[11.5px] text-slate-500 leading-[16px] mt-0.5">
                      Your personal data is never sold to third parties.
                    </p>
                  </div>
                </div>
              </div>

              {/* Links Section: Policy & Terms in sleek row cards */}
              <div className="flex flex-col gap-2 pt-0.5">
                <button
                  type="button"
                  onClick={() => setActiveLegalModal('privacy')}
                  className="w-full flex items-center justify-between px-3.5 py-2.5 bg-slate-50/70 hover:bg-slate-100/80 rounded-xl border border-slate-200/60 transition-colors group cursor-pointer text-left"
                >
                  <div className="flex items-center gap-2.5">
                    <FileText className="w-4 h-4 text-[#3b66f5]" />
                    <span className="text-[12px] font-semibold text-slate-800">
                      Read Privacy Policy
                    </span>
                  </div>
                  <ChevronRight className="w-3.5 h-3.5 text-slate-400 group-hover:translate-x-0.5 transition-transform" />
                </button>

                <button
                  type="button"
                  onClick={() => setActiveLegalModal('terms')}
                  className="w-full flex items-center justify-between px-3.5 py-2.5 bg-slate-50/70 hover:bg-slate-100/80 rounded-xl border border-slate-200/60 transition-colors group cursor-pointer text-left"
                >
                  <div className="flex items-center gap-2.5">
                    <FileText className="w-4 h-4 text-[#3b66f5]" />
                    <span className="text-[12px] font-semibold text-slate-800">
                      Terms &amp; Conditions
                    </span>
                  </div>
                  <ChevronRight className="w-3.5 h-3.5 text-slate-400 group-hover:translate-x-0.5 transition-transform" />
                </button>
              </div>

              {/* Developer & Maintainer Attribution at the end of Step 3 */}
              <div className="mt-auto pt-2">
                <div className="px-3.5 py-2.5 rounded-2xl bg-gradient-to-r from-slate-50 via-indigo-50/50 to-slate-50 border border-slate-200/80 flex items-center justify-center gap-2 text-center shadow-2xs">
                  <div className="w-6 h-6 rounded-lg bg-[#3b66f5]/10 text-[#3b66f5] flex items-center justify-center shrink-0">
                    <Code2 className="w-3.5 h-3.5" />
                  </div>
                  <div className="text-[11px] leading-snug text-slate-600 font-medium">
                    Developed &amp; Maintained by{' '}
                    <span className="font-extrabold text-slate-900 tracking-tight">
                      Pratap Paul
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Bottom Action Area */}
            <footer className="px-5 py-4 bg-white border-t border-slate-100 flex items-center justify-between gap-3 shrink-0">
              <div aria-label="Step 3 of 3" className="flex items-center gap-2">
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => setStep(1)}
                    aria-label="Go to step 1"
                    className="w-2 h-2 rotate-45 border border-slate-300 inline-block cursor-pointer"
                  />
                  <button
                    type="button"
                    onClick={() => setStep(2)}
                    aria-label="Go to step 2"
                    className="w-2 h-2 rotate-45 border border-slate-300 inline-block cursor-pointer"
                  />
                  <span className="w-2.5 h-2.5 rotate-45 bg-[#3b66f5] inline-block shadow-sm" />
                </div>
                <span className="text-[11px] font-semibold text-slate-400 tracking-tight ml-0.5">
                  3 / 3
                </span>
              </div>

              <button
                onClick={onComplete}
                className="h-11 px-5 sm:px-6 bg-[#3b66f5] hover:bg-[#2f55db] active:scale-[0.98] transition-all rounded-xl text-white font-bold text-[12px] tracking-wider uppercase flex items-center justify-center gap-1.5 shadow-[0_10px_22px_-4px_rgba(59,102,245,0.45)] cursor-pointer"
                type="button"
              >
                <span>I Agree &amp; Get Started</span>
                <ArrowRight className="w-4 h-4 text-white shrink-0" />
              </button>
            </footer>
          </div>
        </main>
      )}

      {/* Privacy Policy & Terms Modal */}
      {activeLegalModal && (
        <div
          onClick={(e) => {
            if (e.target === e.currentTarget) setActiveLegalModal(null);
          }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-in fade-in duration-200"
        >
          <div className="w-full max-w-sm bg-white rounded-3xl p-5 border border-slate-200 shadow-2xl space-y-4 max-h-[82vh] flex flex-col">
            <div className="flex items-center justify-between pb-2.5 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-blue-50 text-[#3b66f5] flex items-center justify-center">
                  <FileText className="w-4 h-4" />
                </div>
                <h3 className="text-sm font-extrabold text-slate-900">
                  {activeLegalModal === 'privacy'
                    ? 'TrailOPS Privacy Policy'
                    : 'Terms & Conditions'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setActiveLegalModal(null)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="overflow-y-auto space-y-3 text-xs text-slate-600 leading-relaxed pr-1">
              {activeLegalModal === 'privacy' ? (
                <>
                  <p className="font-semibold text-slate-800">
                    1. Authentication &amp; Account Security
                  </p>
                  <p>
                    TrailOPS uses Supabase Authentication and Google OAuth 2.0 to verify your
                    identity securely. We never store raw passwords.
                  </p>
                  <p className="font-semibold text-slate-800">
                    2. Expedition Data &amp; Emergency Profile
                  </p>
                  <p>
                    Information you enter—such as blood group, emergency contact numbers, medical
                    notes, shared expenses, and squad attendance—is used solely to coordinate your
                    group expedition and safety operations.
                  </p>
                  <p className="font-semibold text-slate-800">3. Zero Third-Party Selling</p>
                  <p>
                    We never sell, rent, or trade your personal or location data to advertisers or
                    third parties.
                  </p>
                </>
              ) : (
                <>
                  <p className="font-semibold text-slate-800">1. Expedition Responsibility</p>
                  <p>
                    TrailOPS is a trip coordination and safety toolkit. Always follow official
                    local forestry, mountaineering, and emergency authority guidelines during field
                    expeditions.
                  </p>
                  <p className="font-semibold text-slate-800">
                    2. Squad Administration &amp; Conduct
                  </p>
                  <p>
                    Super Admins and Sub-Group Admins manage group rosters, attendance check-ins,
                    shared documents, and expense splits in good faith for all members.
                  </p>
                  <p className="font-semibold text-slate-800">3. Developer Attribution</p>
                  <p>
                    TrailOPS Expedition OS is developed and maintained by{' '}
                    <strong className="text-slate-900">Pratap Paul</strong>.
                  </p>
                </>
              )}
            </div>

            <button
              type="button"
              onClick={() => setActiveLegalModal(null)}
              className="w-full py-2.5 rounded-xl bg-[#3b66f5] hover:bg-[#2f55db] text-white text-xs font-bold transition-colors cursor-pointer"
            >
              Got It
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
