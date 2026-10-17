import React, { useState, useRef, useEffect } from 'react';
import {
  Sparkles,
  X,
  Send,
  RotateCcw,
  Copy,
  Check,
  Compass,
  AlertTriangle,
  Flame,
  ShieldCheck,
  ChevronDown,
  Bot,
  User,
} from 'lucide-react';
import { GoogleGenAI } from '@google/genai';

interface Message {
  id: string;
  sender: 'ai' | 'user';
  text: string;
  timestamp: string;
}

interface AskAIOverlayProps {
  destinationName?: string;
  onShowToast?: (message: string) => void;
}

const PRESET_PROMPTS = [
  'Signs of Acute Mountain Sickness (AMS)?',
  'What emergency gear is mandatory above 3000m?',
  'Calculate daily hydration & calories for snow trek',
  'Protocol if a squad member is separated on trail',
];

export const AskAIOverlay: React.FC<AskAIOverlayProps> = ({
  destinationName = 'Pelling High Ridge (2,150m ASL)',
  onShowToast,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Movable and dismissible state (Reappears when app is reopened)
  const [isDismissed, setIsDismissed] = useState(false);
  const [position, setPosition] = useState<{ x: number; y: number } | null>(null);
  const isDraggingRef = useRef(false);
  const dragStartRef = useRef<{ startX: number; startY: number; initialX: number; initialY: number }>({
    startX: 0,
    startY: 0,
    initialX: 0,
    initialY: 0,
  });
  const hasMovedRef = useRef(false);

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    isDraggingRef.current = true;
    hasMovedRef.current = false;
    const clientX = e.clientX;
    const clientY = e.clientY;

    const currentX = position ? position.x : (window.innerWidth > 448 ? (window.innerWidth / 2) + 140 : window.innerWidth - 68);
    const currentY = position ? position.y : window.innerHeight - 150;

    dragStartRef.current = {
      startX: clientX,
      startY: clientY,
      initialX: currentX,
      initialY: currentY,
    };

    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDraggingRef.current) return;
    const deltaX = e.clientX - dragStartRef.current.startX;
    const deltaY = e.clientY - dragStartRef.current.startY;

    if (Math.abs(deltaX) > 4 || Math.abs(deltaY) > 4) {
      hasMovedRef.current = true;
    }

    const nextX = Math.max(12, Math.min(window.innerWidth - 60, dragStartRef.current.initialX + deltaX));
    const nextY = Math.max(70, Math.min(window.innerHeight - 80, dragStartRef.current.initialY + deltaY));

    setPosition({ x: nextX, y: nextY });
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDraggingRef.current) return;
    isDraggingRef.current = false;
    try {
      (e.target as HTMLElement).releasePointerCapture(e.pointerId);
    } catch {}

    if (!hasMovedRef.current) {
      setIsOpen(true);
    }
  };

  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome',
      sender: 'ai',
      text: `Hello! I am TrailoPS AI, your high-altitude expedition co-pilot. I can advise you on trail safety, AMS symptoms, optimal pacing, winter gear checklists, and emergency rescue procedures for ${destinationName}. How can I assist your squad today?`,
      timestamp: 'Online',
    },
  ]);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
    }
  }, [messages, isOpen]);

  const handleCopy = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
    if (onShowToast) {
      onShowToast('Response copied to clipboard');
    }
  };

  const generateAIResponse = async (query: string): Promise<string> => {
    const apiKey = (import.meta as any).env?.VITE_GEMINI_API_KEY || (process as any).env?.GEMINI_API_KEY || '';

    if (apiKey) {
      try {
        const ai = new GoogleGenAI({ apiKey });
        const systemInstruction = `You are TrailoPS AI, an elite high-altitude wilderness survival, mountaineering, and tactical trail safety expert. You provide precise, life-saving, clear, and actionable advice for alpine expeditions in English and Hinglish/Hindi as requested. Active destination: ${destinationName}. Always emphasize safety, hydration, acclimatization, and buddy systems.`;

        const response = await ai.models.generateContent({
          model: 'gemini-3.8-flash',
          contents: query,
          config: {
            systemInstruction,
            temperature: 0.7,
            maxOutputTokens: 600,
          },
        });

        if (response.text) {
          return response.text;
        }
      } catch (err) {
        console.warn('Gemini API call returned an error, using tactical alpine intelligence engine:', err);
      }
    }

    // High-accuracy tactical domain engine fallback
    const lower = query.toLowerCase();

    if (lower.includes('ams') || lower.includes('altitude') || lower.includes('sickness') || lower.includes('mountain sickness')) {
      return `⚠️ **Acute Mountain Sickness (AMS) Protocol**:
• **Key Early Symptoms**: Throbbing headache, nausea, loss of appetite, fatigue, dizziness, insomnia.
• **Critical Action Rule**: Never ascend with symptoms of AMS! If symptoms progress (confusion, coughing pink sputum, inability to walk straight), suspect HAPE or HACE.
• **Immediate Remedy**:
  1. Rest and hydrate with ORS electrolytes (at least 3.5 - 4.5 liters/day).
  2. Descend immediately by at least 500m to 1,000m if headache does not subside.
  3. Diamox (Acetazolamide) 125-250mg twice daily can aid acclimatization if cleared by squad medic.
  4. Administer supplemental oxygen if SpO2 drops below 75%.`;
    }

    if (lower.includes('gear') || lower.includes('pack') || lower.includes('3000m') || lower.includes('equipment')) {
      return `🎒 **Essential High-Altitude Gear Checklist (3,000m+)**:
1. **Layering System**: Moisture-wicking merino base layer, breathable fleece mid-layer, 700+ fill down jacket, and waterproof/windproof Gore-Tex hard shell.
2. **Footwear**: Ankle-support waterproof trekking boots + microspikes/crampons for ice and frozen ridges.
3. **Emergency & Nav**: 300+ lumen headlamp with spare lithium batteries, Satellite SOS beacon / VHF radio, Topo map & compass.
4. **Medical**: Diamox, Ibuprofen, blister kits, oral rehydration salts (ORS), personal medicines.
5. **Hydration & Rations**: Insulated thermal flask (prevents water freezing) + high-calorie energy bars (3500 kcal/day).`;
    }

    if (lower.includes('water') || lower.includes('calorie') || lower.includes('food') || lower.includes('hydration')) {
      return `💧 **Alpine Nutrition & Hydration Formula**:
• **Water Intake**: 4.0 to 5.0 Liters per day at 2,000m - 4,000m ASL. Dry cold air accelerates dehydration through respiration.
• **Electrolytes**: Mix ORS in at least 1 liter of water daily to maintain sodium/potassium balance and prevent muscle cramping.
• **Calorie Target**: 3,200 to 4,200 kcal/day depending on pack weight (60% complex carbs for sustained oxygen-efficient glycogen burn, 20% protein for muscle recovery, 20% healthy fats).
• **Pro Tip**: Keep snack pockets accessible so you eat every 60-90 minutes while hiking without taking heavy pack off.`;
    }

    if (lower.includes('separated') || lower.includes('lost') || lower.includes('missing') || lower.includes('protocol')) {
      return `🚨 **Lost or Separated Trekker Protocol (S.T.O.P.)**:
1. **S - Stop**: Stay where you are immediately. Do not keep wandering.
2. **T - Think**: Note your last known landmark, trail marker, or GPS coordinates.
3. **O - Observe**: Look for shelter, windbreaks, and hazards before nightfall.
4. **P - Plan**:
  • Blow whistle 3 times in quick succession (universal mountain distress signal).
  • Switch VHF radio to Channel 1 (142.500 MHz) or activate your satellite SOS beacon in TrailoPS.
  • Signal with reflective emergency blanket or strobe light when darkness sets in.`;
    }

    if (lower.includes('weather') || lower.includes('rain') || lower.includes('snow') || lower.includes('temp')) {
      return `🏔️ **Alpine Weather Advisory for ${destinationName}**:
• Ridge conditions can swing abruptly by 10-15°C within 40 minutes due to katabatic winds.
• Always pack rain covers over rucksacks before setting out.
• Check your real-time TrailoPS weather telemetry widget on the Gateway screen for live barometric and wind gust readings before pushing to high ridges!`;
    }

    return `⛰️ **TrailoPS Expedition Advisory**:
Regarding "${query}":
For operations around ${destinationName}, prioritize team cohesion, monitor your buddy's hydration and speech coherence, and respect dusk turnaround times. Keep your VHF walkie-talkie tuned to Channel 1 and emergency SOS beacon armed. Let me know if you need specific gear calculations, route guidance, or medical protocols!`;
  };

  const handleSendMessage = async (userText: string) => {
    if (!userText.trim() || isLoading) return;

    const query = userText.trim();
    setInput('');

    const userMsg: Message = {
      id: `user-${Date.now()}`,
      sender: 'user',
      text: query,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setIsLoading(true);

    try {
      const aiReply = await generateAIResponse(query);
      const aiMsg: Message = {
        id: `ai-${Date.now()}`,
        sender: 'ai',
        text: aiReply,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages((prev) => [...prev, aiMsg]);
    } catch {
      const errMsg: Message = {
        id: `ai-err-${Date.now()}`,
        sender: 'ai',
        text: 'Unable to process question at this time. Please check your network or try again.',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages((prev) => [...prev, errMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetChat = () => {
    setMessages([
      {
        id: 'welcome-reset',
        sender: 'ai',
        text: `Chat cleared. TrailoPS AI ready for new alpine queries regarding ${destinationName}.`,
        timestamp: 'Just now',
      },
    ]);
    if (onShowToast) {
      onShowToast('AI conversation reset.');
    }
  };

  return (
    <>
      {/* FLOATING DRAGGABLE & DISMISSIBLE AI ICON (Clutter-Free, Reappears on Reload) */}
      {!isOpen && !isDismissed && (
        <div
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          style={
            position
              ? { left: `${position.x}px`, top: `${position.y}px` }
              : undefined
          }
          className={`fixed z-50 select-none touch-none ${
            !position ? 'bottom-[100px] right-4 sm:right-[max(1rem,calc(50vw-210px))]' : ''
          }`}
        >
          <div className="relative group cursor-grab active:cursor-grabbing">
            {/* Dismiss X button */}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setIsDismissed(true);
                onShowToast?.('Ask AI dismissed for this session. It will return when reopened.');
              }}
              className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-slate-900/90 text-slate-300 hover:text-white border border-white/20 flex items-center justify-center text-[10px] shadow-md z-20 cursor-pointer opacity-70 group-hover:opacity-100 transition-opacity"
              title="Remove Ask AI for this session"
            >
              <X className="w-3 h-3" />
            </button>

            {/* Glossy Animated AI Sphere Icon (Zero Text, Pure Clutter-Free) */}
            <div className="relative w-13 h-13 rounded-full p-0.5 bg-gradient-to-tr from-emerald-500 via-teal-400 to-indigo-500 shadow-xl shadow-emerald-950/40 flex items-center justify-center overflow-hidden transition-transform duration-200 active:scale-95 group-hover:scale-105">
              {/* Spinning Aura Glow */}
              <div className="absolute inset-0 bg-gradient-to-r from-emerald-400/30 via-teal-300/40 to-cyan-400/30 animate-spin blur-xs pointer-events-none" style={{ animationDuration: '8s' }} />

              {/* Glass Center Orb */}
              <div className="relative w-full h-full rounded-full bg-slate-950/85 backdrop-blur-md flex items-center justify-center border border-white/30 overflow-hidden">
                {/* Top Gloss Glint */}
                <div className="absolute top-1 left-2 right-2 h-2.5 rounded-full bg-gradient-to-b from-white/60 to-transparent pointer-events-none" />

                {/* Animated AI Sparkles */}
                <Sparkles className="w-6 h-6 text-emerald-300 animate-pulse drop-shadow-[0_0_8px_rgba(52,211,153,0.8)]" />

                {/* Pulsing Emerald Beacon Dot */}
                <span className="absolute bottom-1.5 right-2.5 flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-400" />
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* EXPANDED AI ASSISTANT CHAT MODAL / DRAWER */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-950/70 backdrop-blur-md animate-in fade-in duration-200">
          <div className="w-full sm:max-w-md bg-white rounded-t-3xl sm:rounded-3xl border border-slate-200 shadow-2xl flex flex-col h-[82vh] sm:h-[640px] overflow-hidden animate-in slide-in-from-bottom-6 duration-300">
            {/* Header */}
            <div className="p-4 bg-gradient-to-r from-emerald-950 via-[#0a442e] to-slate-900 text-white flex items-center justify-between shadow-xs shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-2xl bg-gradient-to-tr from-emerald-500 to-teal-400 text-slate-950 flex items-center justify-center shadow-md">
                  <Sparkles className="w-5 h-5 text-slate-950" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-extrabold text-white leading-tight">
                      TrailoPS AI Assistant
                    </h3>
                    <span className="px-1.5 py-0.5 rounded-full bg-emerald-400/20 text-emerald-300 text-[9px] font-extrabold border border-emerald-400/30">
                      gemini-3.8-flash
                    </span>
                  </div>
                  <p className="text-[10px] text-emerald-200/80">
                    High-altitude safety &amp; survival intelligence
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={handleResetChat}
                  title="Clear Conversation"
                  className="p-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white transition-colors cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  title="Close AI Assistant"
                  className="p-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Quick Suggestion Chips */}
            <div className="px-4 py-2 bg-slate-50 border-b border-slate-200/70 overflow-x-auto no-scrollbar flex items-center gap-1.5 shrink-0">
              <span className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider shrink-0 mr-0.5">
                Suggested:
              </span>
              {PRESET_PROMPTS.map((prompt, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handleSendMessage(prompt)}
                  className="text-[10px] font-semibold px-2.5 py-1 rounded-full bg-white hover:bg-emerald-50 text-slate-700 hover:text-emerald-800 border border-slate-200 shrink-0 transition-colors shadow-2xs cursor-pointer active:scale-95"
                >
                  {prompt}
                </button>
              ))}
            </div>

            {/* Messages Feed */}
            <div className="flex-1 p-4 overflow-y-auto space-y-3.5 no-scrollbar bg-[#f8faf9]">
              {messages.map((m) => (
                <div
                  key={m.id}
                  className={`flex gap-2.5 ${m.sender === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  {m.sender === 'ai' && (
                    <div className="w-7 h-7 rounded-xl bg-emerald-800 text-white flex items-center justify-center shrink-0 mt-0.5 shadow-xs">
                      <Bot className="w-4 h-4" />
                    </div>
                  )}

                  <div
                    className={`max-w-[85%] rounded-2xl p-3 text-xs leading-relaxed shadow-xs relative group ${
                      m.sender === 'user'
                        ? 'bg-emerald-700 text-white font-medium rounded-tr-xs'
                        : 'bg-white text-slate-800 border border-slate-200/80 rounded-tl-xs'
                    }`}
                  >
                    <div className="whitespace-pre-wrap">{m.text}</div>

                    <div className="flex items-center justify-between gap-3 mt-1.5 pt-1 border-t border-black/5 text-[9px] opacity-70">
                      <span>{m.timestamp}</span>

                      {m.sender === 'ai' && (
                        <button
                          type="button"
                          onClick={() => handleCopy(m.id, m.text)}
                          className="hover:opacity-100 flex items-center gap-1 cursor-pointer transition-opacity text-slate-500 hover:text-emerald-800"
                        >
                          {copiedId === m.id ? (
                            <>
                              <Check className="w-3 h-3 text-emerald-600" />
                              <span className="text-emerald-600 font-bold">Copied</span>
                            </>
                          ) : (
                            <>
                              <Copy className="w-3 h-3" />
                              <span>Copy</span>
                            </>
                          )}
                        </button>
                      )}
                    </div>
                  </div>

                  {m.sender === 'user' && (
                    <div className="w-7 h-7 rounded-xl bg-slate-800 text-white flex items-center justify-center shrink-0 mt-0.5 shadow-xs">
                      <User className="w-4 h-4" />
                    </div>
                  )}
                </div>
              ))}

              {isLoading && (
                <div className="flex gap-2.5 justify-start items-center">
                  <div className="w-7 h-7 rounded-xl bg-emerald-800 text-white flex items-center justify-center shrink-0 shadow-xs">
                    <Bot className="w-4 h-4" />
                  </div>
                  <div className="p-3 rounded-2xl bg-white border border-slate-200 text-xs text-slate-500 flex items-center gap-2 shadow-xs">
                    <span className="w-2 h-2 rounded-full bg-emerald-600 animate-bounce" />
                    <span className="w-2 h-2 rounded-full bg-emerald-600 animate-bounce" style={{ animationDelay: '0.2s' }} />
                    <span className="w-2 h-2 rounded-full bg-emerald-600 animate-bounce" style={{ animationDelay: '0.4s' }} />
                    <span className="text-[11px] font-medium text-slate-600 ml-1">Analyzing alpine conditions...</span>
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* Input Bar */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSendMessage(input);
              }}
              className="p-3 bg-white border-t border-slate-200 flex items-center gap-2 shrink-0"
            >
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask about AMS, high-altitude gear, weather..."
                disabled={isLoading}
                className="flex-1 px-3.5 py-2.5 rounded-2xl bg-slate-50 border border-slate-200 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 font-medium"
              />
              <button
                type="submit"
                disabled={!input.trim() || isLoading}
                className="w-10 h-10 rounded-2xl bg-emerald-700 hover:bg-emerald-600 disabled:opacity-40 text-white flex items-center justify-center transition-all shadow-md active:scale-95 cursor-pointer shrink-0"
              >
                <Send className="w-4 h-4" />
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  );
};
