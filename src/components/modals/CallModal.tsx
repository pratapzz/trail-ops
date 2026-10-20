import React from 'react';
import { Phone, PhoneCall, X, Shield, Lock, AlertCircle, Copy, Check } from 'lucide-react';

interface CallModalProps {
  contactName: string;
  contactTitle: string;
  phoneNumber?: string;
  avatar?: string;
  isOpen: boolean;
  onClose: () => void;
  onShowToast?: (message: string) => void;
}

export const CallModal: React.FC<CallModalProps> = ({
  contactName,
  contactTitle,
  phoneNumber,
  avatar,
  isOpen,
  onClose,
  onShowToast,
}) => {
  const [copied, setCopied] = React.useState(false);

  if (!isOpen) return null;

  const isMaskedOrMissing =
    !phoneNumber ||
    phoneNumber.toLowerCase().includes('protect') ||
    phoneNumber.toLowerCase().includes('mask') ||
    phoneNumber.trim() === '';

  const cleanPhone = phoneNumber ? phoneNumber.replace(/[^0-9+]/g, '') : '';

  const handleCopy = () => {
    if (!phoneNumber) return;
    navigator.clipboard.writeText(phoneNumber);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    if (onShowToast) {
      onShowToast(`Phone number copied to clipboard: ${phoneNumber}`);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-md animate-in fade-in duration-200">
      <div className="w-full max-w-sm bg-gradient-to-b from-slate-900 to-slate-950 text-white rounded-3xl p-6 border border-emerald-500/30 shadow-2xl flex flex-col items-center text-center relative overflow-hidden">
        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition-colors cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Tactical Header Tag */}
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-xs font-bold mb-4">
          <Phone className="w-3.5 h-3.5" />
          <span>Squad Direct Telephony</span>
        </div>

        {/* Avatar or Icon */}
        <div className="relative mb-3">
          <div className="w-20 h-20 rounded-full overflow-hidden border-2 border-emerald-500/40 shadow-xl ring-4 ring-emerald-500/10 flex items-center justify-center bg-slate-800">
            {avatar ? (
              <img src={avatar} alt={contactName} className="w-full h-full object-cover" />
            ) : (
              <Shield className="w-8 h-8 text-emerald-400" />
            )}
          </div>
        </div>

        {/* Contact Info */}
        <h3 className="text-lg font-bold tracking-tight text-white mb-0.5">{contactName}</h3>
        <p className="text-xs text-emerald-400 font-medium mb-1">{contactTitle}</p>

        {isMaskedOrMissing ? (
          <div className="my-4 p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-200 text-xs text-left space-y-1.5 w-full">
            <div className="flex items-center gap-1.5 font-bold text-amber-300">
              <Lock className="w-3.5 h-3.5" />
              <span>Contact Number Protected</span>
            </div>
            <p className="text-[11px] text-amber-200/90 leading-relaxed">
              This member has restricted their direct telephone number according to expedition privacy permissions. Only authorized commanders can view unmasked contact details.
            </p>
          </div>
        ) : (
          <div className="my-4 w-full space-y-3">
            <div className="p-3 rounded-2xl bg-slate-800/80 border border-slate-700/60 flex items-center justify-between">
              <span className="font-mono text-sm text-emerald-300 font-bold">{phoneNumber}</span>
              <button
                type="button"
                onClick={handleCopy}
                className="p-1.5 rounded-lg bg-slate-700 hover:bg-slate-600 text-slate-200 text-xs flex items-center gap-1 transition-colors cursor-pointer"
                title="Copy phone number"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              </button>
            </div>

            <p className="text-[11px] text-slate-400">
              Tapping below will open your device's native dialer to place a call over cellular or satellite.
            </p>

            <a
              href={`tel:${cleanPhone}`}
              onClick={() => {
                if (onShowToast) onShowToast(`Opening device dialer for ${contactName}...`);
                onClose();
              }}
              className="w-full py-3 px-4 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-emerald-950/40 active:scale-95 transition-all cursor-pointer"
            >
              <PhoneCall className="w-4 h-4" />
              <span>Open Device Dialer</span>
            </a>
          </div>
        )}

        <button
          type="button"
          onClick={onClose}
          className="mt-2 py-2 px-5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition-colors cursor-pointer w-full"
        >
          Cancel
        </button>
      </div>
    </div>
  );
};
