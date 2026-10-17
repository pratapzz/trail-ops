import React, { useState } from 'react';
import { X, Send, Radio, CheckCheck } from 'lucide-react';

interface ChatModalProps {
  contactName: string;
  contactTitle: string;
  avatar?: string;
  isOpen: boolean;
  onClose: () => void;
}

interface Message {
  id: string;
  sender: 'user' | 'lead';
  text: string;
  time: string;
}

export const ChatModal: React.FC<ChatModalProps> = ({
  contactName,
  contactTitle,
  avatar,
  isOpen,
  onClose,
}) => {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      sender: 'lead',
      text: `Tactical link active. I'm monitoring Pelling Sector 4 perimeter. Let me know your current waypoint status.`,
      time: '14:20',
    },
    {
      id: '2',
      sender: 'user',
      text: 'All squad members accounted for at ridge marker #3.',
      time: '14:22',
    },
  ]);
  const [inputText, setInputText] = useState('');

  if (!isOpen) return null;

  const handleSend = () => {
    if (!inputText.trim()) return;
    const newMsg: Message = {
      id: Date.now().toString(),
      sender: 'user',
      text: inputText.trim(),
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };
    setMessages((prev) => [...prev, newMsg]);
    setInputText('');

    // Simulate reply from lead
    setTimeout(() => {
      setMessages((prev) => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          sender: 'lead',
          text: `Acknowledged, message received loud and clear over LoRa mesh. Proceed along trail line.`,
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      ]);
    }, 1200);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-md animate-in fade-in duration-200">
      <div className="w-full max-w-sm bg-white rounded-3xl border border-emerald-900/10 shadow-2xl flex flex-col h-[520px] overflow-hidden">
        {/* Header */}
        <div className="px-4 py-3.5 bg-gradient-to-r from-emerald-800 to-emerald-950 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="relative">
              <img
                src={avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=120&q=80'}
                alt={contactName}
                className="w-10 h-10 rounded-full object-cover border-2 border-emerald-400"
              />
              <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-emerald-400 rounded-full ring-2 ring-emerald-900" />
            </div>
            <div>
              <h3 className="font-bold text-sm tracking-tight">{contactName}</h3>
              <p className="text-[11px] text-emerald-200 flex items-center gap-1 font-medium">
                <Radio className="w-3 h-3 text-emerald-400 animate-pulse" />
                {contactTitle}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tactical Mesh Subheader */}
        <div className="bg-emerald-50 px-3.5 py-1.5 border-b border-emerald-100 flex items-center justify-between text-[11px] text-emerald-800 font-semibold">
          <span>Mesh Channel: Pelling-Tactical-1</span>
          <span className="text-emerald-600 font-bold">100% Signal</span>
        </div>

        {/* Message Log */}
        <div className="flex-1 p-3.5 overflow-y-auto space-y-3 bg-[#f8faf9]">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex flex-col ${msg.sender === 'user' ? 'items-end' : 'items-start'}`}
            >
              <div
                className={`max-w-[82%] px-3.5 py-2.5 rounded-2xl text-xs leading-relaxed shadow-sm ${
                  msg.sender === 'user'
                    ? 'bg-gradient-to-r from-emerald-700 to-emerald-800 text-white rounded-br-xs'
                    : 'bg-white text-slate-800 border border-slate-200 rounded-bl-xs'
                }`}
              >
                {msg.text}
              </div>
              <div className="flex items-center gap-1 text-[10px] text-slate-400 mt-1 px-1">
                <span>{msg.time}</span>
                {msg.sender === 'user' && <CheckCheck className="w-3 h-3 text-emerald-600" />}
              </div>
            </div>
          ))}
        </div>

        {/* Quick Suggestion Pills */}
        <div className="px-3 py-1.5 bg-slate-50 border-t border-slate-100 flex gap-1.5 overflow-x-auto no-scrollbar text-[11px]">
          <button
            type="button"
            onClick={() => setInputText('Position confirmed at waypoint.')}
            className="px-2.5 py-1 rounded-full bg-white border border-slate-200 text-slate-700 font-medium whitespace-nowrap hover:bg-slate-100"
          >
            Position confirmed
          </button>
          <button
            type="button"
            onClick={() => setInputText('All 42 hikers accounted for.')}
            className="px-2.5 py-1 rounded-full bg-white border border-slate-200 text-slate-700 font-medium whitespace-nowrap hover:bg-slate-100"
          >
            Hikers accounted for
          </button>
          <button
            type="button"
            onClick={() => setInputText('Weather clear, heading out.')}
            className="px-2.5 py-1 rounded-full bg-white border border-slate-200 text-slate-700 font-medium whitespace-nowrap hover:bg-slate-100"
          >
            Weather clear
          </button>
        </div>

        {/* Input Bar */}
        <div className="p-3 bg-white border-t border-slate-200 flex items-center gap-2">
          <input
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            placeholder="Type tactical transmission..."
            className="flex-1 bg-slate-100 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 placeholder:text-slate-400 outline-none focus:ring-2 focus:ring-emerald-500/20 focus:bg-white border border-transparent focus:border-emerald-500 transition-all"
          />
          <button
            type="button"
            onClick={handleSend}
            disabled={!inputText.trim()}
            className="w-10 h-10 rounded-xl bg-emerald-700 hover:bg-emerald-800 disabled:opacity-50 text-white flex items-center justify-center transition-all cursor-pointer shadow-sm active:scale-95"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
