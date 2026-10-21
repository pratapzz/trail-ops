import React, { useState, useEffect, useCallback } from 'react';
import {
  Compass,
  Mail,
  Lock,
  Eye,
  EyeOff,
  ArrowRight,
  TreePine,
  Sparkles,
  X,
  User,
  CheckCircle2,
  Database,
  AlertCircle,
  Loader2,
  GraduationCap,
  Code2,
  Copy,
  ExternalLink,
  ShieldAlert,
} from 'lucide-react';
import { ScreenType } from '../types';
import {
  getSupabase,
  isSupabaseConfigured,
  fetchProfile,
  upsertProfile,
  fetchOAuthDiagnostics,
  OAuthDiagnosticsResult,
} from '../lib/supabase';
import { SupabaseSetupModal } from './modals/SupabaseSetupModal';

interface SignInScreenProps {
  onNavigate: (screen: ScreenType) => void;
  onShowToast: (message: string) => void;
  onSocialSignIn?: (user: { id: string; name: string; email: string; avatar?: string; phone?: string }) => void;
}

export const SignInScreen: React.FC<SignInScreenProps> = ({
  onNavigate,
  onShowToast,
  onSocialSignIn,
}) => {
  const [isSignUp, setIsSignUp] = useState(false);
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [offlineSync, setOfflineSync] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [oauthProviderLoading, setOauthProviderLoading] = useState<'google' | 'apple' | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Setup modal
  const [showSetupModal, setShowSetupModal] = useState(false);

  // OAuth Provider Diagnostics & Setup Instructions Modal
  const [oauthSetupModal, setOauthSetupModal] = useState<{
    isOpen: boolean;
    provider: 'google' | 'apple';
    reason: string;
    diagnostics: OAuthDiagnosticsResult | null;
  }>({
    isOpen: false,
    provider: 'google',
    reason: '',
    diagnostics: null,
  });

  const completeAuthenticatedUser = useCallback(
    async (authUser: { id: string; email?: string; user_metadata?: any }) => {
      const realUserId = authUser.id;
      const realEmail = (authUser.email || '').trim().toLowerCase();
      const metaName =
        authUser.user_metadata?.full_name ||
        authUser.user_metadata?.name ||
        (realEmail ? realEmail.split('@')[0] : 'Trekker');
      const metaAvatar =
        authUser.user_metadata?.avatar_url || authUser.user_metadata?.picture || '';

      // Load existing persistent profile or create initial row for first-time user without overwriting existing profile
      const existingProf = await fetchProfile(realUserId);
      if (!existingProf) {
        await upsertProfile({
          id: realUserId,
          email: realEmail,
          full_name: metaName,
          avatar_url: metaAvatar,
          is_profile_complete: false,
        });
      }

      const resolvedName = existingProf?.full_name || metaName;
      setIsLoading(false);
      setOauthProviderLoading(null);
      onShowToast(`Signed in as ${resolvedName}`);
      if (onSocialSignIn) {
        onSocialSignIn({
          id: realUserId,
          name: resolvedName,
          email: realEmail,
          avatar: existingProf?.avatar_url || metaAvatar,
          phone: existingProf?.phone,
        });
      }
    },
    [onShowToast, onSocialSignIn]
  );

  // Process OAuth callback payloads from popup postMessage, localStorage, or URL redirect
  const processOAuthCallbackPayload = useCallback(
    async (payload: {
      code?: string;
      accessToken?: string;
      refreshToken?: string;
      error?: string;
      errorCode?: string;
      errorDescription?: string;
    }) => {
      if (payload.error) {
        setIsLoading(false);
        setOauthProviderLoading(null);
        const decodedDesc = decodeURIComponent(
          (payload.errorDescription || payload.error).replace(/\+/g, ' ')
        );
        if (
          payload.error === 'access_denied' ||
          decodedDesc.toLowerCase().includes('cancel') ||
          decodedDesc.toLowerCase().includes('denied')
        ) {
          setErrorMessage('Sign-in was cancelled. No account changes were made.');
          onShowToast('OAuth sign-in cancelled.');
        } else {
          setErrorMessage(`OAuth authentication error: ${decodedDesc}`);
          onShowToast(`OAuth error: ${decodedDesc}`);
        }
        return;
      }

      const sb = getSupabase();
      if (!sb) return;

      try {
        setIsLoading(true);
        if (payload.accessToken && payload.refreshToken) {
          const { data, error } = await sb.auth.setSession({
            access_token: payload.accessToken,
            refresh_token: payload.refreshToken,
          });
          if (error) throw error;
          if (data?.user) {
            await completeAuthenticatedUser(data.user);
            return;
          }
        } else if (payload.code) {
          const { data, error } = await sb.auth.exchangeCodeForSession(payload.code);
          if (error) throw error;
          if (data?.user) {
            await completeAuthenticatedUser(data.user);
            return;
          }
        }

        const { data: userResp } = await sb.auth.getUser();
        if (userResp?.user) {
          await completeAuthenticatedUser(userResp.user);
        } else {
          setIsLoading(false);
          setOauthProviderLoading(null);
        }
      } catch (err: any) {
        setIsLoading(false);
        setOauthProviderLoading(null);
        setErrorMessage(err.message || 'Failed to complete OAuth session exchange.');
        onShowToast(err.message || 'OAuth session exchange failed.');
      }
    },
    [completeAuthenticatedUser, onShowToast]
  );

  // Check URL parameters on mount (for top-level redirect callbacks or OAuth error query strings)
  useEffect(() => {
    const searchParams = new URLSearchParams(window.location.search);
    const hashStr = window.location.hash ? window.location.hash.substring(1) : '';
    const hashParams = new URLSearchParams(hashStr);

    const error = searchParams.get('error') || hashParams.get('error');
    const errorDescription =
      searchParams.get('error_description') || hashParams.get('error_description');
    const code = searchParams.get('code') || hashParams.get('code');
    const accessToken = hashParams.get('access_token') || searchParams.get('access_token');
    const refreshToken = hashParams.get('refresh_token') || searchParams.get('refresh_token');

    if (error || code || accessToken) {
      // Clean URL parameters so reload doesn't re-trigger
      const cleanUrl = new URL(window.location.href);
      cleanUrl.searchParams.delete('error');
      cleanUrl.searchParams.delete('error_code');
      cleanUrl.searchParams.delete('error_description');
      cleanUrl.searchParams.delete('code');
      cleanUrl.searchParams.delete('oauth_callback');
      cleanUrl.hash = '';
      window.history.replaceState({}, '', cleanUrl.toString());

      processOAuthCallbackPayload({
        code: code || undefined,
        accessToken: accessToken || undefined,
        refreshToken: refreshToken || undefined,
        error: error || undefined,
        errorDescription: errorDescription || undefined,
      });
    }

    const handleWindowMessage = (event: MessageEvent) => {
      if (event.data && event.data.type === 'TRAILOPS_OAUTH_CALLBACK') {
        processOAuthCallbackPayload(event.data);
      }
    };

    const handleStorageOAuth = (event: StorageEvent) => {
      if (event.key === 'trailoPS_oauth_callback_result' && event.newValue) {
        try {
          const parsed = JSON.parse(event.newValue);
          localStorage.removeItem('trailoPS_oauth_callback_result');
          processOAuthCallbackPayload(parsed);
        } catch {}
      }
    };

    window.addEventListener('message', handleWindowMessage);
    window.addEventListener('storage', handleStorageOAuth);
    return () => {
      window.removeEventListener('message', handleWindowMessage);
      window.removeEventListener('storage', handleStorageOAuth);
    };
  }, [processOAuthCallbackPayload]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!email.trim()) {
      onShowToast('Please enter your email address.');
      return;
    }
    if (!password) {
      onShowToast('Please enter your password.');
      return;
    }
    if (isSignUp && !fullName.trim()) {
      onShowToast('Please enter your full name for expedition registration.');
      return;
    }

    const sb = getSupabase();
    if (!sb || !isSupabaseConfigured()) {
      setShowSetupModal(true);
      onShowToast('Please configure your Supabase backend to enable real authentication.');
      return;
    }

    setIsLoading(true);

    try {
      if (isSignUp) {
        // Sign Up with real Supabase Auth
        const { data, error } = await sb.auth.signUp({
          email: email.trim(),
          password,
          options: {
            data: {
              full_name: fullName.trim(),
            },
          },
        });

        if (error) {
          setIsLoading(false);
          setErrorMessage(error.message);
          onShowToast(`Sign up failed: ${error.message}`);
          return;
        }

        if (data.user) {
          // Initialize persistent profile row isolated by data.user.id
          await upsertProfile({
            id: data.user.id,
            email: (data.user.email || email.trim()).toLowerCase(),
            full_name: fullName.trim(),
            is_profile_complete: false,
          });

          setIsLoading(false);
          onShowToast('Account registered successfully! Complete your expedition profile.');
          if (onSocialSignIn) {
            onSocialSignIn({
              id: data.user.id,
              name: fullName.trim(),
              email: (data.user.email || email.trim()).toLowerCase(),
            });
          }
        }
      } else {
        // Real Sign In with Supabase Auth
        const { data, error } = await sb.auth.signInWithPassword({
          email: email.trim(),
          password,
        });

        if (error) {
          setIsLoading(false);
          setErrorMessage(error.message || 'Invalid login credentials.');
          onShowToast(`Authentication failed: ${error.message}`);
          return;
        }

        if (data.user) {
          await completeAuthenticatedUser(data.user);
        }
      }
    } catch (err: any) {
      setIsLoading(false);
      setErrorMessage(err.message || 'Unexpected authentication error');
      onShowToast(err.message || 'Authentication error');
    }
  };

  const handleStartOAuth = async (provider: 'google' | 'apple', forceAttempt = false) => {
    setErrorMessage(null);
    const sb = getSupabase();
    if (!sb || !isSupabaseConfigured()) {
      setShowSetupModal(true);
      onShowToast(`Configure your Supabase backend to enable ${provider === 'google' ? 'Google' : 'Apple'} OAuth.`);
      return;
    }

    setOauthProviderLoading(provider);

    try {
      // 1. Inspect live Supabase OAuth provider settings first so we don't dump user onto a raw 400 JSON page if disabled
      const diag = await fetchOAuthDiagnostics();
      if (diag && diag.configured && !diag.providers[provider] && !forceAttempt) {
        setOauthProviderLoading(null);
        const providerLabel = provider === 'google' ? 'Google' : 'Apple';
        const reason = `Supabase Auth returned 400 (validation_failed): "Unsupported provider: provider is not enabled". ${providerLabel} OAuth is currently turned OFF in your Supabase project (${diag.projectRef}).`;
        setErrorMessage(reason);
        setOauthSetupModal({
          isOpen: true,
          provider,
          reason,
          diagnostics: diag,
        });
        return;
      }

      const callbackUrl = `${window.location.origin}/auth/callback`;
      const { data, error } = await sb.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: callbackUrl,
          skipBrowserRedirect: true,
          queryParams:
            provider === 'google'
              ? {
                  access_type: 'offline',
                  prompt: 'select_account',
                }
              : undefined,
        },
      });

      if (error || !data?.url) {
        setOauthProviderLoading(null);
        const msg = error?.message || `Failed to initialize ${provider} OAuth flow.`;
        setErrorMessage(msg);
        onShowToast(msg);
        return;
      }

      // Open OAuth provider authorization URL directly in a popup (required in iframe environments because Google/Apple send X-Frame-Options: DENY)
      const width = 520;
      const height = 680;
      const left = Math.max(0, Math.round(window.screenX + (window.outerWidth - width) / 2));
      const top = Math.max(0, Math.round(window.screenY + (window.outerHeight - height) / 2));
      const popup = window.open(
        data.url,
        `trailops_${provider}_oauth`,
        `width=${width},height=${height},left=${left},top=${top},menubar=no,toolbar=no,location=yes,status=no`
      );

      if (!popup) {
        // If popup blocked and not in iframe, fallback to top-level navigation
        if (window.self === window.top) {
          window.location.assign(data.url);
          return;
        }
        setOauthProviderLoading(null);
        setErrorMessage('Popup was blocked by your browser. Please allow popups for this site to sign in with OAuth.');
        onShowToast('Please allow popups for this site to complete OAuth sign-in.');
        return;
      }

      // Monitor popup closure in case user closes window manually (cancelled authentication)
      const pollTimer = setInterval(async () => {
        if (popup.closed) {
          clearInterval(pollTimer);
          // Give message/storage event 400ms to arrive first
          setTimeout(async () => {
            const { data: sessionData } = await sb.auth.getSession();
            if (sessionData?.session?.user) {
              await completeAuthenticatedUser(sessionData.session.user);
            } else {
              setOauthProviderLoading((prev) => {
                if (prev === provider) {
                  onShowToast('OAuth sign-in window closed.');
                  return null;
                }
                return prev;
              });
            }
          }, 400);
        }
      }, 600);
    } catch (err: any) {
      setOauthProviderLoading(null);
      setErrorMessage(err.message || `${provider} OAuth failed`);
      onShowToast(err.message || `${provider} OAuth failed`);
    }
  };

  return (
    <div className="w-full max-w-md mx-auto min-h-screen bg-slate-50 flex flex-col justify-center items-center pb-24 sm:py-6 selection:bg-emerald-300 selection:text-emerald-950">
      <main className="w-full min-h-screen sm:min-h-0 sm:rounded-[38px] bg-[#f8faf9] shadow-2xl shadow-emerald-900/15 flex flex-col overflow-hidden relative border border-emerald-900/10">
        {/* Top Vibrant Scenic Alpine Header */}
        <header className="relative w-full h-[285px] overflow-hidden bg-gradient-to-b from-[#7dd3fc] via-[#99f6e4] to-[#f0fdf4] flex flex-col justify-between p-5 pt-6">
          {/* Top-Left Prominent Branding: TrailoPS v1 */}
          <div className="relative z-10 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-[#065f46] via-[#047857] to-[#10b981] flex items-center justify-center text-white shadow-lg shadow-emerald-900/25 ring-2 ring-white/80 transition-transform duration-300 hover:scale-105">
                <Compass className="w-5 h-5 text-white" />
              </div>
              <div className="flex items-center gap-2">
                <span className="text-2xl font-extrabold tracking-tight text-emerald-950">
                  TrailoPS
                </span>
                <span className="px-2 py-0.5 rounded-full bg-emerald-700/15 border border-emerald-700/25 text-emerald-900 text-[11px] font-extrabold tracking-wide uppercase shadow-2xs">
                  v1
                </span>
              </div>
            </div>

            {/* Supabase backend status indicator button */}
            <button
              onClick={() => setShowSetupModal(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/80 backdrop-blur-md border border-white/70 shadow-xs hover:bg-white transition-colors cursor-pointer"
            >
              <Database className={`w-3.5 h-3.5 ${isSupabaseConfigured() ? 'text-emerald-600' : 'text-amber-500'}`} />
              <span className="text-[11px] font-bold text-slate-800 tracking-wider">
                {isSupabaseConfigured() ? 'Backend Live' : 'Connect DB'}
              </span>
            </button>
          </div>

          {/* Scenery Rich Vector Graphic Layer */}
          <div className="absolute inset-0 pointer-events-none select-none z-0">
            <svg
              className="w-full h-full object-cover"
              fill="none"
              preserveAspectRatio="none"
              viewBox="0 0 390 290"
              xmlns="http://www.w3.org/2000/svg"
            >
              <defs>
                <linearGradient id="skyGrad" x1="0" x2="0" y1="0" y2="1">
                  <stop offset="0%" stopColor="#38bdf8" />
                  <stop offset="50%" stopColor="#a7f3d0" />
                  <stop offset="100%" stopColor="#f8faf9" />
                </linearGradient>
                <linearGradient id="sunGrad" x1="0" x2="1" y1="0" y2="1">
                  <stop offset="0%" stopColor="#fbbf24" />
                  <stop offset="50%" stopColor="#f59e0b" />
                  <stop offset="100%" stopColor="#fb923c" />
                </linearGradient>
                <linearGradient id="farPeaks" x1="0" x2="0" y1="0" y2="1">
                  <stop offset="0%" stopColor="#7dd3fc" />
                  <stop offset="100%" stopColor="#93c5fd" />
                </linearGradient>
                <linearGradient id="midPeaks" x1="0" x2="0" y1="0" y2="1">
                  <stop offset="0%" stopColor="#34d399" />
                  <stop offset="100%" stopColor="#059669" />
                </linearGradient>
                <linearGradient id="forePeaks" x1="0" x2="0" y1="0" y2="1">
                  <stop offset="0%" stopColor="#059669" />
                  <stop offset="100%" stopColor="#064e3b" />
                </linearGradient>
              </defs>

              <rect fill="url(#skyGrad)" height="290" width="390" />

              <g className="animate-sun">
                <circle cx="305" cy="78" fill="#fed7aa" fillOpacity="0.4" r="44" />
                <circle cx="305" cy="78" fill="#fde68a" fillOpacity="0.65" r="33" />
                <circle cx="305" cy="78" fill="url(#sunGrad)" r="23" />
              </g>

              <g className="animate-float-clouds">
                <path
                  d="M25 62C45 62 60 66 85 66C110 66 125 60 145 60C165 60 175 64 190 64"
                  stroke="#ffffff"
                  strokeLinecap="round"
                  strokeOpacity="0.85"
                  strokeWidth="4.5"
                />
                <path
                  d="M190 88C208 88 220 91 238 91C255 91 268 87 285 87"
                  stroke="#ffffff"
                  strokeLinecap="round"
                  strokeOpacity="0.7"
                  strokeWidth="3.5"
                />
                <circle cx="95" cy="58" r="10" fill="#ffffff" fillOpacity="0.4" />
                <circle cx="215" cy="85" r="8" fill="#ffffff" fillOpacity="0.4" />
              </g>

              <path
                d="M-20 230L65 145L145 210L230 135L330 220L420 150L430 290L-30 290Z"
                fill="url(#farPeaks)"
                opacity="0.6"
              />
              <path
                d="M-30 260L55 180L135 240L215 170L305 245L400 175L420 290L-40 290Z"
                fill="url(#midPeaks)"
                opacity="0.85"
              />
              <path
                d="M-10 275L80 205L160 265L245 195L340 270L410 215L430 290L-20 290Z"
                fill="url(#forePeaks)"
              />
            </svg>
          </div>

          <div className="relative z-10 space-y-1">
            {isSignUp && (
              <>
                <h1 className="text-2xl sm:text-3xl font-black text-emerald-950 tracking-tight leading-tight">
                  Create Expedition Account
                </h1>
                <p className="text-xs sm:text-sm font-semibold text-emerald-900/80">
                  Register to join alpine squads and track telemetry
                </p>
              </>
            )}
          </div>
        </header>

        {/* Card Body & Form */}
        <div className="flex-1 px-5 pt-5 pb-6 flex flex-col justify-between bg-white/95">
          <div>
            {/* Mode Switch Tabs (Sign In vs Sign Up) */}
            <div className="grid grid-cols-2 p-1 bg-slate-100 rounded-2xl mb-4 border border-slate-200/60">
              <button
                type="button"
                onClick={() => {
                  setIsSignUp(false);
                  setErrorMessage(null);
                }}
                className={`py-2 text-xs font-bold rounded-xl transition-all cursor-pointer ${
                  !isSignUp
                    ? 'bg-white text-emerald-950 shadow-xs border border-slate-200/50'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Sign In
              </button>
              <button
                type="button"
                onClick={() => {
                  setIsSignUp(true);
                  setErrorMessage(null);
                }}
                className={`py-2 text-xs font-bold rounded-xl transition-all cursor-pointer ${
                  isSignUp
                    ? 'bg-white text-emerald-950 shadow-xs border border-slate-200/50'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Create Account
              </button>
            </div>

            {errorMessage && (
              <div className="mb-4 p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl flex items-start gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-600" />
                <span>{errorMessage}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-3.5">
              {/* Field: Full Name (Sign Up only) */}
              {isSignUp && (
                <div className="space-y-1 text-left animate-in fade-in duration-200">
                  <label className="text-slate-700 text-xs font-semibold ml-1" htmlFor="fullName">
                    Full Legal Name
                  </label>
                  <div className="relative rounded-2xl border border-slate-200 bg-white focus-within:border-emerald-600 focus-within:ring-4 focus-within:ring-emerald-500/15 transition-all duration-200 flex items-center px-3.5 h-12 shadow-xs">
                    <User className="w-4 h-4 text-emerald-700/80 mr-2.5 shrink-0" />
                    <input
                      id="fullName"
                      type="text"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      required={isSignUp}
                      placeholder="e.g. Alex Walker"
                      className="w-full bg-transparent border-none p-0 text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-0"
                    />
                  </div>
                </div>
              )}

              {/* Field: Email */}
              <div className="space-y-1 text-left">
                <label className="text-slate-700 text-xs font-semibold ml-1" htmlFor="email">
                  Expedition Email
                </label>
                <div className="relative rounded-2xl border border-slate-200 bg-white focus-within:border-emerald-600 focus-within:ring-4 focus-within:ring-emerald-500/15 transition-all duration-200 flex items-center px-3.5 h-12 shadow-xs">
                  <Mail className="w-4 h-4 text-emerald-700/80 mr-2.5 shrink-0" />
                  <input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    placeholder="you@example.com"
                    className="w-full bg-transparent border-none p-0 text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-0"
                  />
                </div>
              </div>

              {/* Field: Password */}
              <div className="space-y-1 text-left">
                <div className="flex items-center justify-between ml-1 pr-1">
                  <label className="text-slate-700 text-xs font-semibold" htmlFor="password">
                    Password
                  </label>
                  {!isSignUp && (
                    <button
                      type="button"
                      onClick={() =>
                        onShowToast('Enter your registered email and submit password reset.')
                      }
                      className="text-xs text-emerald-700 hover:text-emerald-900 font-bold transition-colors cursor-pointer"
                    >
                      Forgot?
                    </button>
                  )}
                </div>
                <div className="relative rounded-2xl border border-slate-200 bg-white focus-within:border-emerald-600 focus-within:ring-4 focus-within:ring-emerald-500/15 transition-all duration-200 flex items-center px-3.5 h-12 shadow-xs">
                  <Lock className="w-4 h-4 text-emerald-700/80 mr-2.5 shrink-0" />
                  <input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    placeholder={isSignUp ? 'Create a secure password (min 6 chars)' : 'Enter your password'}
                    className="w-full bg-transparent border-none p-0 text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-0"
                  />
                  <button
                    type="button"
                    aria-label="Toggle password visibility"
                    onClick={() => setShowPassword(!showPassword)}
                    className="text-slate-400 hover:text-emerald-900 transition-colors p-1 flex items-center justify-center cursor-pointer"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Offline Preference & Sync */}
              <div className="flex items-center justify-between pt-0.5 pb-1 px-1">
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={offlineSync}
                    onChange={(e) => setOfflineSync(e.target.checked)}
                    className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 border-slate-300 cursor-pointer"
                  />
                  <span className="text-xs text-slate-600 font-medium">
                    Keep offline cache active
                  </span>
                </label>
                <span className="inline-flex items-center gap-1 text-[11px] text-emerald-800 font-semibold bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200/60">
                  <TreePine className="w-3 h-3 text-emerald-600" />
                  Trail Ready
                </span>
              </div>

              {/* Primary Submit Button */}
              <button
                type="submit"
                disabled={isLoading}
                className="w-full h-12 py-3 px-6 rounded-2xl bg-gradient-to-r from-emerald-700 via-emerald-600 to-teal-600 hover:from-emerald-800 hover:to-teal-700 active:scale-[0.98] text-white text-xs sm:text-sm font-bold shadow-lg shadow-emerald-700/25 transition-all duration-300 flex items-center justify-center gap-2 cursor-pointer group disabled:opacity-50"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Verifying...</span>
                  </>
                ) : (
                  <>
                    <span>{isSignUp ? 'Create Account' : 'Sign In'}</span>
                    <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform duration-200" />
                  </>
                )}
              </button>
            </form>

            {/* Separation Line */}
            <div className="relative my-4 flex items-center justify-center">
              <div className="w-full border-t border-slate-200" />
              <span className="absolute px-3 bg-white text-[11px] text-slate-400 uppercase tracking-wider font-semibold">
                or continue with
              </span>
            </div>

            {/* Social Auth Buttons */}
            <div className="grid grid-cols-2 gap-3">
              {/* Google Button */}
              <button
                type="button"
                disabled={isLoading || oauthProviderLoading !== null}
                onClick={() => handleStartOAuth('google')}
                className="h-11 px-3 rounded-2xl border border-slate-200 hover:border-emerald-600/40 hover:bg-emerald-50/40 active:scale-95 transition-all flex items-center justify-center gap-2.5 bg-white shadow-2xs cursor-pointer group disabled:opacity-50"
              >
                {oauthProviderLoading === 'google' ? (
                  <Loader2 className="w-4 h-4 animate-spin text-emerald-700" />
                ) : (
                  <svg className="w-4 h-4 flex-shrink-0" viewBox="0 0 24 24">
                    <path
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                      fill="#4285F4"
                    />
                    <path
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                      fill="#34A853"
                    />
                    <path
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                      fill="#FBBC05"
                    />
                    <path
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                      fill="#EA4335"
                    />
                  </svg>
                )}
                <span className="text-xs text-slate-800 font-semibold group-hover:text-emerald-950">
                  Google
                </span>
              </button>

              {/* Apple Button */}
              <button
                type="button"
                disabled={isLoading || oauthProviderLoading !== null}
                onClick={() => handleStartOAuth('apple')}
                className="h-11 px-3 rounded-2xl border border-slate-200 hover:border-emerald-600/40 hover:bg-emerald-50/40 active:scale-95 transition-all flex items-center justify-center gap-2.5 bg-white shadow-2xs cursor-pointer group disabled:opacity-50"
              >
                {oauthProviderLoading === 'apple' ? (
                  <Loader2 className="w-4 h-4 animate-spin text-slate-900" />
                ) : (
                  <svg
                    className="w-4 h-4 flex-shrink-0 fill-slate-900 group-hover:fill-emerald-950 transition-colors"
                    viewBox="0 0 170 170"
                  >
                    <path d="M150.37 130.25c-2.45 5.66-5.35 10.87-8.71 15.66-4.58 6.53-8.33 11.05-11.22 13.56-4.48 4.12-9.28 6.23-14.42 6.35-3.69 0-8.14-1.05-13.32-3.18-5.19-2.12-9.97-3.17-14.34-3.17-4.58 0-9.49 1.05-14.75 3.17-5.26 2.13-9.5 3.24-12.74 3.35-4.35.13-9.16-1.9-14.42-6.08-3.7-3.04-7.66-7.85-11.9-14.42-6.09-9.35-10.8-19.89-14.13-31.62-3.34-11.73-5.01-23.06-5.01-34 0-14.24 3.58-26.06 10.74-35.46 7.16-9.4 16.03-14.19 26.6-14.38 5.43 0 11.19 1.41 17.27 4.23 6.09 2.83 10.11 4.3 12.07 4.42 1.52 0 5.76-1.52 12.72-4.56 6.96-3.04 12.83-4.35 17.61-3.91 13.26.87 23.8 5.76 31.62 14.67-11.52 6.96-17.18 16.63-16.96 29.02.22 9.78 3.91 18.04 11.08 24.78 7.17 6.74 15.65 10.54 25.43 11.41-2.17 6.52-4.78 13.04-7.82 19.56zM119.22 31.09c0-7.39 2.61-14.35 7.82-20.87C132.25 3.7 139.64 0 149.21 0c.22 1.09.33 2.17.33 3.26 0 7.39-2.72 14.46-8.15 21.2-5.44 6.74-12.61 10.65-21.52 11.74-.22-1.74-.65-3.44-.65-5.11z" />
                  </svg>
                )}
                <span className="text-xs text-slate-800 font-semibold group-hover:text-emerald-950">
                  Apple
                </span>
              </button>
            </div>
          </div>

          {/* Friendly Footer Invitation */}
          <div className="mt-4 text-center space-y-3">
            <p className="text-xs text-slate-500">
              {isSignUp ? 'Already registered?' : 'New to TrailoPS?'}
              <button
                type="button"
                onClick={() => {
                  setIsSignUp(!isSignUp);
                  setErrorMessage(null);
                }}
                className="text-xs text-emerald-700 font-bold hover:underline ml-1 cursor-pointer"
              >
                {isSignUp ? 'Sign in instead' : 'Create an account'}
              </button>
            </p>
            <p className="text-slate-400 text-[10px] tracking-wide">
              Secure Cloud Storage &amp; Data Protection
            </p>

            {/* Developer Credit & College Attribution */}
            <div className="pt-3 border-t border-slate-200/80 flex flex-col items-center justify-center gap-1.5">
              <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-50 border border-emerald-300/80 shadow-2xs">
                <Code2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                <span className="text-[11px] font-medium text-slate-700">
                  Developed &amp; Maintained by:
                </span>
                <span className="text-[11px] font-extrabold text-emerald-950">
                  Pratap Paul
                </span>
              </div>
              <div className="inline-flex items-center gap-1.5 text-[11px] text-slate-600 font-medium">
                <GraduationCap className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                <span>CS Student,</span>
                <span className="font-bold text-slate-800">Sri Krishna College, Nadia</span>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Supabase Connection Setup Modal */}
      <SupabaseSetupModal
        isOpen={showSetupModal}
        onClose={() => setShowSetupModal(false)}
        onConfigured={() => {
          onShowToast('Supabase backend connected successfully!');
        }}
      />

      {/* OAUTH PROVIDER DIAGNOSTICS & REQUIRED CONFIGURATION MODAL */}
      {oauthSetupModal.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-md animate-in fade-in duration-200">
          <div className="w-full max-w-md bg-white rounded-3xl p-5 border border-slate-200 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <ShieldAlert className="w-5 h-5 text-amber-600 shrink-0" />
                <span className="font-extrabold text-sm text-slate-900">
                  {oauthSetupModal.provider === 'google' ? 'Google' : 'Apple'} OAuth Provider Setup Required
                </span>
              </div>
              <button
                type="button"
                onClick={() => setOauthSetupModal((prev) => ({ ...prev, isOpen: false }))}
                className="w-7 h-7 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-3 rounded-2xl bg-amber-50 border border-amber-200 text-amber-950 text-xs space-y-1">
              <p className="font-bold">Diagnostic Result from Supabase Auth:</p>
              <p className="text-[11px] leading-relaxed">{oauthSetupModal.reason}</p>
            </div>

            <div className="space-y-3 text-xs text-slate-700">
              <p className="font-bold text-slate-900">
                Complete these 3 steps in your Supabase &amp; {oauthSetupModal.provider === 'google' ? 'Google Cloud' : 'Apple Developer'} Console:
              </p>

              {/* Step 1 */}
              <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200 space-y-1.5">
                <span className="font-extrabold text-slate-900 block">
                  1. Enable {oauthSetupModal.provider === 'google' ? 'Google' : 'Apple'} Provider in Supabase
                </span>
                <p className="text-[11px] text-slate-600">
                  Open your Supabase Authentication Providers settings and toggle{' '}
                  <strong>{oauthSetupModal.provider === 'google' ? 'Google' : 'Apple'}</strong> ON with your Client ID and Client Secret:
                </p>
                {oauthSetupModal.diagnostics?.urls.supabaseDashboardProvidersUrl && (
                  <a
                    href={oauthSetupModal.diagnostics.urls.supabaseDashboardProvidersUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 hover:underline"
                  >
                    <span>Open Supabase Auth Providers</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                )}
              </div>

              {/* Step 2 */}
              <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200 space-y-1.5">
                <span className="font-extrabold text-slate-900 block">
                  2. Authorized Redirect URI (for {oauthSetupModal.provider === 'google' ? 'Google Cloud Console' : 'Apple Services ID'})
                </span>
                <div className="flex items-center justify-between gap-2 bg-white p-2 rounded-xl border border-slate-200">
                  <code className="text-[10px] font-mono text-slate-800 break-all">
                    {oauthSetupModal.diagnostics?.urls.supabaseCallbackUrl ||
                      'https://ejjyhonidxafscixbiap.supabase.co/auth/v1/callback'}
                  </code>
                  <button
                    type="button"
                    onClick={() => {
                      const val =
                        oauthSetupModal.diagnostics?.urls.supabaseCallbackUrl ||
                        'https://ejjyhonidxafscixbiap.supabase.co/auth/v1/callback';
                      navigator.clipboard.writeText(val);
                      onShowToast('Supabase Callback URL copied!');
                    }}
                    className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 shrink-0 cursor-pointer"
                    title="Copy URL"
                  >
                    <Copy className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Step 3 */}
              <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200 space-y-1.5">
                <span className="font-extrabold text-slate-900 block">
                  3. Add App Callback URL in Supabase URL Configuration
                </span>
                <p className="text-[11px] text-slate-600">
                  Add this Redirect URL in Supabase &rarr; Authentication &rarr; URL Configuration:
                </p>
                <div className="flex items-center justify-between gap-2 bg-white p-2 rounded-xl border border-slate-200">
                  <code className="text-[10px] font-mono text-slate-800 break-all">
                    {`${window.location.origin}/auth/callback`}
                  </code>
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText(`${window.location.origin}/auth/callback`);
                      onShowToast('App Redirect URL copied!');
                    }}
                    className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 shrink-0 cursor-pointer"
                    title="Copy Redirect URL"
                  >
                    <Copy className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => setOauthSetupModal((prev) => ({ ...prev, isOpen: false }))}
                className="flex-1 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold cursor-pointer"
              >
                Close
              </button>
              <button
                type="button"
                onClick={() => {
                  const prov = oauthSetupModal.provider;
                  setOauthSetupModal((prev) => ({ ...prev, isOpen: false }));
                  handleStartOAuth(prov, true);
                }}
                className="flex-1 py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-600 text-white text-xs font-bold cursor-pointer flex items-center justify-center gap-1.5"
              >
                <ArrowRight className="w-3.5 h-3.5" />
                <span>Test OAuth Now</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
