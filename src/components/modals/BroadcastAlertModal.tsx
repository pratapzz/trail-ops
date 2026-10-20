import React from 'react';
import { Bell, Radio, AlertOctagon, Info, AlertTriangle, X, Check, Image as ImageIcon } from 'lucide-react';

interface BroadcastAlertModalProps {
  isOpen: boolean;
  onClose: () => void;
  broadcast: {
    id: string;
    title: string;
    text: string;
    imageUrl?: string;
    priority: 'critical' | 'advisory' | 'info';
    author: string;
    timestamp: string;
  } | null;
}

export const BroadcastAlertModal: React.FC<BroadcastAlertModalProps> = ({
  isOpen,
  onClose,
  broadcast,
}) => {
  if (!isOpen || !broadcast) return null;

  const priorityStyles = {
    critical: {
      border: 'border-rose-500',
      badgeBg: 'bg-rose-100 text-rose-800 border-rose-300',
      icon: <AlertOctagon className="w-5 h-5 text-rose-600 animate-pulse" />,
      label: 'Critical Alert',
      btnBg: 'bg-rose-600 hover:bg-rose-700 shadow-rose-600/30',
    },
    advisory: {
      border: 'border-amber-500',
      badgeBg: 'bg-amber-100 text-amber-800 border-amber-300',
      icon: <AlertTriangle className="w-5 h-5 text-amber-600" />,
      label: 'Advisory Warning',
      btnBg: 'bg-amber-600 hover:bg-amber-700 shadow-amber-600/30',
    },
    info: {
      border: 'border-sky-500',
      badgeBg: 'bg-sky-100 text-sky-800 border-sky-300',
      icon: <Info className="w-5 h-5 text-sky-600" />,
      label: 'Squad Notice',
      btnBg: 'bg-emerald-700 hover:bg-emerald-800 shadow-emerald-700/30',
    },
  }[broadcast.priority] || {
    border: 'border-emerald-500',
    badgeBg: 'bg-emerald-100 text-emerald-800 border-emerald-300',
    icon: <Bell className="w-5 h-5 text-emerald-600" />,
    label: 'Squad Broadcast',
    btnBg: 'bg-emerald-700 hover:bg-emerald-800 shadow-emerald-700/30',
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className={`w-full max-w-sm bg-white text-slate-900 rounded-3xl p-5 border-2 ${priorityStyles.border} shadow-2xl flex flex-col relative overflow-hidden`}>
        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 text-slate-400 hover:text-slate-700 rounded-xl hover:bg-slate-100 transition-colors cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Priority Badge */}
        <div className="flex items-center gap-2 mb-3">
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border shadow-2xs">
            {priorityStyles.icon}
            <span className={priorityStyles.badgeBg}>{priorityStyles.label}</span>
          </div>
          <span className="text-[10px] text-slate-500 font-mono font-medium">{broadcast.timestamp}</span>
        </div>

        {/* Title */}
        <h3 className="text-lg font-black text-slate-900 leading-snug mb-1">
          {broadcast.title}
        </h3>

        {/* Author */}
        <p className="text-[11px] text-emerald-800 font-bold mb-3 flex items-center gap-1">
          <span>By:</span>
          <span>{broadcast.author}</span>
        </p>

        {/* Attached Photo Preview (if present) */}
        {broadcast.imageUrl && (
          <div className="mb-3 rounded-2xl overflow-hidden border border-slate-200 bg-slate-900 max-h-56 relative group">
            <img
              src={broadcast.imageUrl}
              alt={broadcast.title}
              className="w-full h-full object-cover max-h-56"
            />
            <div className="absolute top-2 left-2 px-2 py-0.5 rounded-full bg-black/60 backdrop-blur-xs text-white text-[9px] font-bold flex items-center gap-1">
              <ImageIcon className="w-3 h-3 text-emerald-400" />
              <span>Attached Photo / Trail Map</span>
            </div>
          </div>
        )}

        {/* Message Body */}
        <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 text-xs text-slate-700 leading-relaxed mb-4 max-h-36 overflow-y-auto whitespace-pre-wrap">
          {broadcast.text}
        </div>

        {/* Action Button */}
        <button
          type="button"
          onClick={onClose}
          className={`w-full py-3.5 px-4 rounded-2xl text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-md active:scale-95 transition-all cursor-pointer ${priorityStyles.btnBg}`}
        >
          <Check className="w-4 h-4" />
          <span>I Have Read &amp; Understood</span>
        </button>
      </div>
    </div>
  );
};
