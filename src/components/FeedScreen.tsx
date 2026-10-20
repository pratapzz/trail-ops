import React, { useState } from 'react';
import {
  Compass,
  Megaphone,
  AlertTriangle,
  Pin,
  Clock,
  Plus,
  X,
  Send,
  Sparkles,
  ShieldAlert,
  Crown,
  Shield,
  BellRing,
  Info,
} from 'lucide-react';
import { FeedPost, ScreenType, UserRole } from '../types';

interface FeedScreenProps {
  onNavigate: (screen: ScreenType) => void;
  onShowToast: (message: string) => void;
  userRole?: UserRole;
}

export const FeedScreen: React.FC<FeedScreenProps> = ({
  onNavigate,
  onShowToast,
  userRole = 'super_admin',
}) => {
  const [isPosting, setIsPosting] = useState(false);
  const [announcementTitle, setAnnouncementTitle] = useState('');
  const [announcementText, setAnnouncementText] = useState('');
  const [priority, setPriority] = useState<'critical' | 'advisory' | 'info'>('critical');

  const isAuthorizedAdmin = userRole === 'super_admin' || userRole === 'subgroup_admin';

  const [announcements, setAnnouncements] = useState<FeedPost[]>(() => {
    const saved = localStorage.getItem('trailoPS_feed_announcements');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      } catch {}
    }
    return [];
  });

  React.useEffect(() => {
    localStorage.setItem('trailoPS_feed_announcements', JSON.stringify(announcements));
  }, [announcements]);

  const handleCreateAnnouncement = (e: React.FormEvent) => {
    e.preventDefault();
    if (!announcementText.trim()) return;

    const authorRoleLabel = userRole === 'super_admin' ? 'Squad Commander (You)' : 'Sub-Group Lead (You)';
    const newPost: FeedPost = {
      id: `ann-${Date.now()}`,
      author: authorRoleLabel,
      role: userRole === 'super_admin' ? 'Super Admin • Command' : 'Sub-Group Admin',
      avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80',
      timestamp: 'Just now',
      content: announcementTitle ? `📢 ${announcementTitle.toUpperCase()}\n${announcementText}` : announcementText,
      type: 'text',
      isAnnouncement: true,
      announcementPriority: priority,
      likes: 0,
      commentsCount: 0,
    };

    setAnnouncements([newPost, ...announcements]);
    setAnnouncementTitle('');
    setAnnouncementText('');
    setIsPosting(false);
    onShowToast('Official announcement broadcasted to all squad members!');
  };

  return (
    <div className="w-full max-w-md mx-auto min-h-screen bg-[#f8faf9] text-slate-900 pb-32">
      {/* Top Header */}
      <header className="bg-white/95 backdrop-blur-md sticky top-0 shadow-2xs z-40 border-b border-emerald-900/10">
        <div className="flex items-center justify-between px-4 w-full h-16 max-w-md mx-auto">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-amber-500 to-amber-600 text-slate-950 flex items-center justify-center shadow-md">
              <Megaphone className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-lg font-extrabold tracking-tight text-slate-950">
                  Announcements
                </span>
                <span className="px-1.5 py-0.5 rounded-md text-[10px] font-black bg-amber-100 text-amber-950 border border-amber-300">
                  OFFICIAL
                </span>
              </div>
            </div>
          </div>

          {/* Broadcast button (Only active for Super Admin and Sub-Group Admins) */}
          {isAuthorizedAdmin ? (
            <button
              type="button"
              onClick={() => setIsPosting(true)}
              className="px-3.5 py-1.5 rounded-full bg-gradient-to-r from-amber-500 to-orange-500 text-slate-950 text-xs font-black shadow-sm active:scale-95 transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Broadcast</span>
            </button>
          ) : (
            <div className="flex items-center gap-1 text-[11px] font-bold text-slate-400 bg-slate-100 px-2.5 py-1 rounded-full">
              <span>Read Only</span>
            </div>
          )}
        </div>
      </header>

      {/* Main Content */}
      <main className="px-4 pt-3.5 space-y-3.5">
        {/* COMING SOON NOTIFICATION BANNER (Requested by user) */}
        <div className="p-3.5 rounded-2xl bg-gradient-to-r from-purple-50 via-indigo-50 to-teal-50 border border-purple-200 shadow-2xs relative overflow-hidden">
          <div className="flex items-start gap-2.5">
            <div className="w-7 h-7 rounded-xl bg-purple-600 text-white flex items-center justify-center shrink-0 shadow-xs mt-0.5">
              <Sparkles className="w-3.5 h-3.5" />
            </div>
            <div>
              <span className="text-[11px] font-extrabold uppercase tracking-wider text-purple-900 block">
                Community Media Feed · Coming Soon in V2!
              </span>
              <p className="text-[11px] text-purple-800/90 mt-0.5 leading-relaxed font-medium">
                Photo uploads, trail dispatch videos, and public trekker posts are currently in testing and will launch in V2. At present, this board is strictly reserved for verified <strong>Super Admin &amp; Admin directives</strong>.
              </p>
            </div>
          </div>
        </div>

        {/* Admin Authority Status Pill */}
        <div className="flex items-center justify-between text-xs px-1">
          <span className="text-slate-500 font-semibold">
            {announcements.length} Verified Squad Directives
          </span>

          <span className="text-[11px] font-bold text-amber-900 flex items-center gap-1 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
            {userRole === 'super_admin' ? (
              <>
                <Crown className="w-3 h-3 text-amber-700" />
                <span>Super Admin Broadcast Enabled</span>
              </>
            ) : userRole === 'subgroup_admin' ? (
              <>
                <Shield className="w-3 h-3 text-sky-700" />
                <span>Sub-Group Admin Broadcast Enabled</span>
              </>
            ) : (
              <span>Member View (Alerts Active)</span>
            )}
          </span>
        </div>

        {/* Announcements List */}
        <div className="space-y-3">
          {announcements.length === 0 ? (
            <div className="p-8 rounded-3xl bg-white border border-slate-200 text-center space-y-3 shadow-xs">
              <div className="w-12 h-12 rounded-2xl bg-amber-100 text-amber-900 mx-auto flex items-center justify-center">
                <Megaphone className="w-6 h-6" />
              </div>
              <h4 className="text-sm font-bold text-slate-800">No Announcements Yet</h4>
              <p className="text-xs text-slate-500 max-w-xs mx-auto leading-relaxed">
                Squad commanders and leads have not issued any official bulletins or safety advisories yet.
              </p>
              {isAuthorizedAdmin && (
                <button
                  type="button"
                  onClick={() => setIsPosting(true)}
                  className="mt-2 inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-amber-600 to-amber-700 text-white text-xs font-bold shadow-md hover:brightness-105 active:scale-95 transition-all cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>Broadcast Directive</span>
                </button>
              )}
            </div>
          ) : (
            announcements.map((post) => (
              <article
                key={post.id}
                className={`rounded-2xl transition-all shadow-sm overflow-hidden border-2 ${
                  post.announcementPriority === 'critical'
                    ? 'bg-rose-50/40 border-rose-400 ring-2 ring-rose-400/10'
                    : post.announcementPriority === 'advisory'
                    ? 'bg-amber-50/40 border-amber-400 ring-2 ring-amber-400/10'
                    : 'bg-emerald-50/40 border-emerald-400 ring-2 ring-emerald-400/10'
                }`}
              >
              {/* Highlighted Top Banner */}
              <div
                className={`px-3.5 py-1.5 text-xs font-black flex items-center justify-between ${
                  post.announcementPriority === 'critical'
                    ? 'bg-rose-600 text-white'
                    : post.announcementPriority === 'advisory'
                    ? 'bg-amber-500 text-slate-950'
                    : 'bg-emerald-700 text-white'
                }`}
              >
                <div className="flex items-center gap-1.5">
                  <AlertTriangle className="w-4 h-4 fill-current" />
                  <span className="uppercase tracking-wider">
                    {post.announcementPriority === 'critical'
                      ? 'CRITICAL SAFETY DIRECTIVE'
                      : post.announcementPriority === 'advisory'
                      ? 'OFFICIAL SQUAD ADVISORY'
                      : 'EXPEDITION BULLETIN'}
                  </span>
                </div>
                <Pin className="w-3.5 h-3.5" />
              </div>

              <div className="p-4 space-y-2.5 bg-white">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <img
                      src={post.avatar}
                      alt={post.author}
                      className="w-9 h-9 rounded-full object-cover border border-slate-200"
                    />
                    <div>
                      <div className="flex items-center gap-1.5">
                        <h4 className="text-xs font-bold text-slate-900">{post.author}</h4>
                        <span className="px-1.5 py-0.2 rounded text-[9px] font-black uppercase bg-slate-100 text-slate-700">
                          {post.role.includes('Super Admin') ? '👑 SUPER ADMIN' : '⚡ ADMIN'}
                        </span>
                      </div>
                      <p className="text-[10px] text-slate-500">{post.role}</p>
                    </div>
                  </div>
                  <span className="text-[10px] text-slate-400 font-mono">{post.timestamp}</span>
                </div>

                <p className="text-xs leading-relaxed text-slate-900 whitespace-pre-line font-medium">
                  {post.content}
                </p>

                <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-[11px] text-slate-500">
                  <span className="text-emerald-700 font-semibold flex items-center gap-1">
                    <span>✓ Broadcasted via LoRa &amp; Push</span>
                  </span>
                  <span className="font-semibold text-slate-700">{post.likes} Acknowledged</span>
                </div>
              </div>
            </article>
          )))}
        </div>
      </main>

      {/* Admin Broadcast Composer Modal */}
      {isPosting && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-md animate-in fade-in duration-200">
          <div className="w-full max-w-sm bg-white rounded-3xl p-5 border border-amber-500/20 shadow-2xl flex flex-col space-y-3.5">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-amber-100 text-amber-900 flex items-center justify-center">
                  <Megaphone className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-sm">Broadcast Announcement</h3>
                  <p className="text-[11px] text-slate-500">Authorized Admin Priority Channel</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsPosting(false)}
                className="w-7 h-7 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateAnnouncement} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Directive Priority
                </label>
                <div className="grid grid-cols-3 gap-1.5">
                  <button
                    type="button"
                    onClick={() => setPriority('critical')}
                    className={`py-1.5 rounded-xl text-xs font-bold border transition-all ${
                      priority === 'critical'
                        ? 'bg-rose-600 text-white border-rose-600 shadow-xs'
                        : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    Critical
                  </button>
                  <button
                    type="button"
                    onClick={() => setPriority('advisory')}
                    className={`py-1.5 rounded-xl text-xs font-bold border transition-all ${
                      priority === 'advisory'
                        ? 'bg-amber-500 text-slate-950 border-amber-500 shadow-xs font-extrabold'
                        : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    Advisory
                  </button>
                  <button
                    type="button"
                    onClick={() => setPriority('info')}
                    className={`py-1.5 rounded-xl text-xs font-bold border transition-all ${
                      priority === 'info'
                        ? 'bg-emerald-700 text-white border-emerald-700 shadow-xs'
                        : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    Routine
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Subject / Heading (Optional)
                </label>
                <input
                  type="text"
                  value={announcementTitle}
                  onChange={(e) => setAnnouncementTitle(e.target.value)}
                  placeholder="e.g. RIDGE RETREAT AT 18:00"
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs font-bold text-slate-900 outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Official Directive Content
                </label>
                <textarea
                  rows={4}
                  value={announcementText}
                  onChange={(e) => setAnnouncementText(e.target.value)}
                  placeholder="Type official directive for all squad members..."
                  className="w-full p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-900 focus:bg-white focus:border-amber-500 outline-none"
                  required
                  autoFocus
                />
              </div>

              <div className="pt-1 flex gap-2">
                <button
                  type="button"
                  onClick={() => setIsPosting(false)}
                  className="flex-1 py-2.5 rounded-xl border border-slate-200 text-slate-700 text-xs font-semibold hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 text-slate-950 text-xs font-black shadow-md active:scale-95 transition-transform flex items-center justify-center gap-1.5"
                >
                  <Send className="w-4 h-4" />
                  <span>Broadcast Notice</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
