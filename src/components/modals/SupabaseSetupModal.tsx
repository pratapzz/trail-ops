import React, { useState } from 'react';
import { Database, Key, ShieldCheck, CheckCircle2, AlertCircle, RefreshCw, X, ExternalLink } from 'lucide-react';
import { getSupabaseConfig, saveCustomSupabaseConfig, testSupabaseConnection, isSupabaseConfigured } from '../../lib/supabase';

interface SupabaseSetupModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfigured?: () => void;
  onSaved?: () => void;
}

export const SupabaseSetupModal: React.FC<SupabaseSetupModalProps> = ({
  isOpen,
  onClose,
  onConfigured,
  onSaved,
}) => {
  const current = getSupabaseConfig();
  const [url, setUrl] = useState(current.url);
  const [anonKey, setAnonKey] = useState(current.anonKey);
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);

  if (!isOpen) return null;

  const handleTest = async () => {
    setIsTesting(true);
    setTestResult(null);
    const res = await testSupabaseConnection(url, anonKey);
    setIsTesting(false);
    setTestResult(res);
  };

  const handleSave = async () => {
    setIsTesting(true);
    const res = await testSupabaseConnection(url, anonKey);
    setIsTesting(false);
    setTestResult(res);

    if (res.success || (url.startsWith('http') && anonKey.length > 20)) {
      saveCustomSupabaseConfig(url, anonKey);
      onConfigured?.();
      onSaved?.();
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fade-in">
      <div className="bg-slate-900 border border-slate-700/80 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl flex flex-col text-slate-100">
        {/* Header */}
        <div className="p-5 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-semibold text-white tracking-tight">Supabase Backend Configuration</h3>
              <p className="text-xs text-slate-400">Real authentication, persistent groups & private media</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 space-y-4 text-sm">
          <div className="p-3 bg-slate-800/60 border border-slate-700/50 rounded-xl text-xs text-slate-300 space-y-1">
            <div className="font-medium text-emerald-400 flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4" /> Production Backend Connection
            </div>
            <p>
              Provide your Supabase Project URL and public Anon Key from your Supabase Dashboard (Project Settings &rarr; API).
            </p>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-slate-300 flex items-center gap-1.5">
              <Database className="w-3.5 h-3.5 text-slate-400" /> Supabase Project URL
            </label>
            <input
              type="url"
              placeholder="https://your-project-id.supabase.co"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 focus:border-emerald-500 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none transition-colors"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-slate-300 flex items-center gap-1.5">
              <Key className="w-3.5 h-3.5 text-slate-400" /> Anon Public Key
            </label>
            <textarea
              rows={2}
              placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
              value={anonKey}
              onChange={(e) => setAnonKey(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 focus:border-emerald-500 rounded-xl px-3.5 py-2 text-xs font-mono text-white placeholder-slate-500 focus:outline-none transition-colors resize-none"
            />
          </div>

          {testResult && (
            <div
              className={`p-3 rounded-xl border flex items-start gap-2 text-xs ${
                testResult.success
                  ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                  : 'bg-rose-500/10 border-rose-500/30 text-rose-300'
              }`}
            >
              {testResult.success ? (
                <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5 text-emerald-400" />
              ) : (
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-400" />
              )}
              <span>{testResult.message}</span>
            </div>
          )}

          <div className="text-xs text-slate-400 pt-1">
            Need to run SQL migrations? Refer to <span className="text-slate-200 font-mono">supabase/README.md</span> in this project for the full schema and RLS policies.
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-950/60 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={handleTest}
            disabled={isTesting || !url || !anonKey}
            className="px-3.5 py-2 text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl border border-slate-700 transition-colors flex items-center gap-1.5 disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isTesting ? 'animate-spin' : ''}`} />
            Test Connection
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-2 text-xs font-medium text-slate-400 hover:text-white rounded-xl transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={isTesting || !url || !anonKey}
              className="px-4 py-2 text-xs font-semibold bg-emerald-500 hover:bg-emerald-400 text-slate-950 rounded-xl shadow-sm transition-colors disabled:opacity-50"
            >
              Save & Apply
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
