import React, { useState, useEffect } from 'react';
import { PhoneOff, Mic, MicOff, Volume2, Shield, Radio } from 'lucide-react';

interface CallModalProps {
  contactName: string;
  contactTitle: string;
  phoneNumber: string;
  avatar?: string;
  isOpen: boolean;
  onClose: () => void;
}

export const CallModal: React.FC<CallModalProps> = ({
  contactName,
  contactTitle,
  phoneNumber,
  avatar,
  isOpen,
  onClose,
}) => {
  const [duration, setDuration] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [isSpeaker, setIsSpeaker] = useState(true);
  const [callStatus, setCallStatus] = useState<'connecting' | 'connected'>('connecting');

  useEffect(() => {
    if (!isOpen) {
      setDuration(0);
      setCallStatus('connecting');
      return;
    }

    const connectTimeout = setTimeout(() => {
      setCallStatus('connected');
    }, 1500);

    const interval = setInterval(() => {
      if (callStatus === 'connected') {
        setDuration((prev) => prev + 1);
      }
    }, 1000);

    return () => {
      clearTimeout(connectTimeout);
      clearInterval(interval);
    };
  }, [isOpen, callStatus]);

  if (!isOpen) return null;

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-md animate-in fade-in duration-200">
      <div className="w-full max-w-sm bg-gradient-to-b from-slate-900 to-slate-950 text-white rounded-3xl p-6 border border-emerald-500/30 shadow-2xl flex flex-col items-center text-center relative overflow-hidden">
        {/* Ambient glow */}
        <div className="absolute -top-12 left-1/2 -translate-x-1/2 w-48 h-48 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

        {/* Tactical Mesh Tag */}
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-xs font-bold mb-5">
          <Radio className="w-3.5 h-3.5 animate-pulse" />
          <span>Encrypted Tactical VoIP • LoRa Relay</span>
        </div>

        {/* Avatar or Icon */}
        <div className="relative mb-4">
          <div className="w-24 h-24 rounded-full overflow-hidden border-4 border-emerald-500/40 shadow-xl ring-4 ring-emerald-500/10 flex items-center justify-center bg-slate-800">
            {avatar ? (
              <img src={avatar} alt={contactName} className="w-full h-full object-cover" />
            ) : (
              <Shield className="w-10 h-10 text-emerald-400" />
            )}
          </div>
          {callStatus === 'connected' && (
            <span className="absolute bottom-1 right-1 w-5 h-5 rounded-full bg-emerald-500 border-2 border-slate-900 flex items-center justify-center">
              <span className="w-2 h-2 rounded-full bg-white animate-ping" />
            </span>
          )}
        </div>

        {/* Contact Info */}
        <h3 className="text-xl font-bold tracking-tight text-white mb-0.5">{contactName}</h3>
        <p className="text-xs text-emerald-400 font-medium mb-1">{contactTitle}</p>
        <p className="text-xs text-slate-400 font-mono mb-4">{phoneNumber}</p>

        {/* Status / Timer */}
        <div className="py-1 px-4 rounded-full bg-slate-800/80 border border-slate-700/60 mb-6">
          {callStatus === 'connecting' ? (
            <span className="text-xs text-amber-400 font-semibold animate-pulse">Connecting satellite uplink...</span>
          ) : (
            <span className="text-sm font-mono text-emerald-300 font-bold">{formatTime(duration)}</span>
          )}
        </div>

        {/* Audio Wave Simulation */}
        {callStatus === 'connected' && (
          <div className="flex items-center justify-center gap-1 h-6 mb-6">
            <span className="w-1 h-3 bg-emerald-400 rounded-full animate-pulse" />
            <span className="w-1 h-5 bg-emerald-300 rounded-full animate-pulse delay-75" />
            <span className="w-1 h-6 bg-emerald-500 rounded-full animate-pulse delay-150" />
            <span className="w-1 h-4 bg-emerald-400 rounded-full animate-pulse delay-100" />
            <span className="w-1 h-2 bg-emerald-300 rounded-full animate-pulse" />
          </div>
        )}

        {/* Call Controls */}
        <div className="flex items-center justify-center gap-5 w-full pt-2">
          {/* Mute */}
          <button
            type="button"
            onClick={() => setIsMuted(!isMuted)}
            className={`w-12 h-12 rounded-full flex items-center justify-center transition-all ${
              isMuted ? 'bg-amber-500 text-white shadow-md' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
            }`}
          >
            {isMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
          </button>

          {/* End Call */}
          <button
            type="button"
            onClick={onClose}
            className="w-16 h-16 rounded-full bg-rose-600 hover:bg-rose-500 active:scale-95 text-white flex items-center justify-center shadow-lg shadow-rose-600/40 transition-all cursor-pointer"
          >
            <PhoneOff className="w-7 h-7" />
          </button>

          {/* Speaker */}
          <button
            type="button"
            onClick={() => setIsSpeaker(!isSpeaker)}
            className={`w-12 h-12 rounded-full flex items-center justify-center transition-all ${
              isSpeaker ? 'bg-emerald-600 text-white shadow-md' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
            }`}
          >
            <Volume2 className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
};
