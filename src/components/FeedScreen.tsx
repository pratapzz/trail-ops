import React, { useState, useEffect, useCallback } from 'react';
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
  Camera,
  Users,
  Lock,
  Trash2,
  ArrowRight,
} from 'lucide-react';
import { ScreenType, UserRole } from '../types';
import {
  SquadGroupRecord,
  SquadNoticeRecord,
  fetchGroupNotices,
  createGroupNotice,
  deleteGroupNotice,
  fetchUserSquad,
} from '../lib/supabase';

interface FeedScreenProps {
  onNavigate: (screen: ScreenType) => void;
  onShowToast: (message: string) => void;
  userRole?: UserRole;
  currentUserName?: string;
  currentUserId?: string;
  currentUserAvatar?: string;
  hasJoinedGroup?: boolean;
  activeSquad?: SquadGroupRecord | null;
}

function formatNoticeTimestamp(isoStr?: string): string {
  if (!isoStr) return 'Just now';
  try {
    const diffMs = Date.now() - new Date(isoStr).getTime();
    if (diffMs < 60000) return 'Just now';
    const mins = Math.floor(diffMs / 60000);
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    return new Date(isoStr).toLocaleDateString([], {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return 'Just now';
  }
}

export const FeedScreen: React.FC<FeedScreenProps> = ({
  onNavigate,
  onShowToast,
  userRole = 'member',
  currentUserName = 'Trekker',
  currentUserId,
  hasJoinedGroup = false,
  activeSquad,
}) => {
  const effectiveUserId = currentUserId || localStorage.getItem('trailoPS_currentUserId') || '';

  // Resilient squad resolution across memory, local storage, user-scoped storage, and active trips
  const [resolvedSquad, setResolvedSquad] = useState<SquadGroupRecord | null>(() => {
    if (activeSquad && activeSquad.id) return activeSquad;
    try {
      const raw = localStorage.getItem('trailoPS_active_squad');
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed?.id) return parsed;
      }
      const activeUserId = currentUserId || localStorage.getItem('trailoPS_currentUserId');
      if (activeUserId) {
        const userSquadRaw = localStorage.getItem(`trailoPS_active_squad_${activeUserId}`);
        if (userSquadRaw) {
          const parsed = JSON.parse(userSquadRaw);
          if (parsed?.id) return parsed;
        }
      }
      const rawTrip = localStorage.getItem('trailoPS_activeTrip');
      const savedSquadId = localStorage.getItem('trailoPS_active_squad_id');
      if (rawTrip && savedSquadId) {
        const parsed = JSON.parse(rawTrip);
        return {
          id: savedSquadId,
          code: parsed.code || 'SQUAD1',
          name: parsed.name || 'Expedition Squad',
          destination: parsed.destination || 'Expedition Base',
          created_by: activeUserId || '',
          departureDate: parsed.departureDate || '2026-10-24',
          returnDate: parsed.returnDate || '2026-10-30',
          budgetPerMember: parsed.budgetPerMember || 6000,
          created_at: new Date().toISOString(),
        };
      }
    } catch {}
    return null;
  });

  // Keep resolvedSquad in sync whenever activeSquad changes from parent
  useEffect(() => {
    if (activeSquad?.id) {
      setResolvedSquad(activeSquad);
    }
  }, [activeSquad]);

  // If user is authenticated, query Supabase/server if squad is missing in local cache
  useEffect(() => {
    const fetchSquadIfMissing = async () => {
      const uid = effectiveUserId;
      if (!uid) return;
      try {
        const sq = await fetchUserSquad(uid);
        if (sq?.id) {
          setResolvedSquad(sq);
          localStorage.setItem('trailoPS_active_squad', JSON.stringify(sq));
          localStorage.setItem('trailoPS_active_squad_id', sq.id);
        }
      } catch {}
    };
    if (!resolvedSquad?.id) {
      fetchSquadIfMissing();
    }
  }, [effectiveUserId, resolvedSquad?.id]);

  const effectiveSquad = resolvedSquad || activeSquad;
  const effectiveHasJoinedGroup = hasJoinedGroup || Boolean(effectiveSquad?.id);
  const activeGroupId = effectiveSquad?.id || '';

  const [isPosting, setIsPosting] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoadingNotices, setIsLoadingNotices] = useState(false);
  const [announcementTitle, setAnnouncementTitle] = useState('');
  const [announcementText, setAnnouncementText] = useState('');
  const [announcementImage, setAnnouncementImage] = useState<string | null>(null);
  const [priority, setPriority] = useState<'critical' | 'advisory' | 'info'>('critical');

  // Strictly group-scoped notices list (never global, never visible when not in the group)
  const [groupNotices, setGroupNotices] = useState<SquadNoticeRecord[]>([]);

  const loadGroupNoticesList = useCallback(async () => {
    if (!effectiveHasJoinedGroup || !activeGroupId || !effectiveUserId) {
      setGroupNotices([]);
      return;
    }

    try {
      const res = await fetchGroupNotices(activeGroupId, effectiveUserId);
      if (!res.authorized) {
        setGroupNotices([]);
        return;
      }
      setGroupNotices(res.notices);
    } catch {
      // ignore transient network error
    }
  }, [effectiveHasJoinedGroup, activeGroupId, effectiveUserId]);

  useEffect(() => {
    if (!effectiveHasJoinedGroup || !activeGroupId) {
      setGroupNotices([]);
      return;
    }

    setIsLoadingNotices(true);
    loadGroupNoticesList().finally(() => setIsLoadingNotices(false));

    const pollInterval = setInterval(loadGroupNoticesList, 3500);

    const handleNoticeUpdated = (e: Event) => {
      const custom = e as CustomEvent;
      if (custom.detail?.groupId && custom.detail.groupId !== activeGroupId) {
        return; // Strictly ignore notices from other groups
      }
      loadGroupNoticesList();
    };

    const handleGroupLeft = () => {
      setGroupNotices([]);
    };

    window.addEventListener('trailoPS_group_notices_updated', handleNoticeUpdated);
    window.addEventListener('trailoPS_group_left', handleGroupLeft);

    let bc: BroadcastChannel | null = null;
    if (typeof BroadcastChannel !== 'undefined') {
      try {
        bc = new BroadcastChannel(`trailops_squad_bus_${activeGroupId}`);
        bc.onmessage = (ev) => {
          if (ev.data?.type === 'GROUP_NOTICE_BROADCAST' && ev.data?.groupId === activeGroupId) {
            loadGroupNoticesList();
          }
        };
      } catch {}
    }

    return () => {
      clearInterval(pollInterval);
      window.removeEventListener('trailoPS_group_notices_updated', handleNoticeUpdated);
      window.removeEventListener('trailoPS_group_left', handleGroupLeft);
      if (bc) bc.close();
    };
  }, [effectiveHasJoinedGroup, activeGroupId, loadGroupNoticesList]);

  const handleCreateAnnouncement = async (e: React.FormEvent) => {
    e.preventDefault();

    let targetSquad = effectiveSquad;
    let targetGroupId = activeGroupId;

    if ((!targetGroupId || !targetSquad) && effectiveUserId) {
      try {
        const sq = await fetchUserSquad(effectiveUserId);
        if (sq?.id) {
          targetSquad = sq;
          targetGroupId = sq.id;
          setResolvedSquad(sq);
          localStorage.setItem('trailoPS_active_squad', JSON.stringify(sq));
          localStorage.setItem('trailoPS_active_squad_id', sq.id);
        }
      } catch {}
    }

    if (!targetGroupId || !targetSquad) {
      const savedSquadId = localStorage.getItem('trailoPS_active_squad_id') || 'grp_pelling_trip';
      const rawTrip = localStorage.getItem('trailoPS_activeTrip');
      let tripName = 'Pelling trip';
      let tripCode = 'PEL001';
      let tripDest = 'Pelling, West Sikkim';
      if (rawTrip) {
        try {
          const pt = JSON.parse(rawTrip);
          if (pt.name) tripName = pt.name;
          if (pt.code) tripCode = pt.code;
          if (pt.destination) tripDest = pt.destination;
        } catch {}
      }
      targetGroupId = savedSquadId;
      targetSquad = {
        id: savedSquadId,
        name: tripName,
        code: tripCode,
        destination: tripDest,
        created_by: effectiveUserId || 'user_self',
        created_at: new Date().toISOString(),
      };
      setResolvedSquad(targetSquad);
    }

    if (!announcementText.trim()) return;

    setIsSubmitting(true);
    try {
      const authorRoleLabel =
        userRole === 'super_admin'
          ? 'Super Admin • Command'
          : userRole === 'subgroup_admin'
          ? 'Sub-Group Admin'
          : 'Squad Member';

      const res = await createGroupNotice({
        groupId: targetGroupId,
        userId: effectiveUserId,
        title: announcementTitle.trim() || 'Squad Broadcast Notice',
        text: announcementText.trim(),
        priority,
        authorName: currentUserName,
        authorRole: authorRoleLabel,
        imageUrl: announcementImage || undefined,
        groupName: targetSquad.name,
        groupCode: targetSquad.code,
        groupDestination: targetSquad.destination,
      });

      if (!res.success || !res.notice) {
        onShowToast(res.error || 'Failed to broadcast notice to group.');
        return;
      }

      setGroupNotices((prev) => [
        res.notice!,
        ...prev.filter((n) => n.id !== res.notice!.id),
      ]);

      // Mark seen by creator so creator doesn't get duplicate popup alert
      localStorage.setItem(`trailoPS_seen_notice_${effectiveUserId}_${res.notice.id}`, 'true');

      setAnnouncementTitle('');
      setAnnouncementText('');
      setAnnouncementImage(null);
      setIsPosting(false);
      onShowToast(
        `📢 Notice broadcasted to "${targetSquad.name}" (${targetSquad.code}) members!`
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteNotice = async (noticeId: string) => {
    if (!activeGroupId) return;
    const res = await deleteGroupNotice(activeGroupId, noticeId, effectiveUserId);
    if (res.success) {
      setGroupNotices((prev) => prev.filter((n) => n.id !== noticeId));
      onShowToast('Notice removed from group board.');
    } else {
      onShowToast(res.error || 'Only the author or Super Admin can delete a notice.');
    }
  };

  return (
    <div className="w-full max-w-md mx-auto min-h-screen bg-[#f8faf9] text-slate-900 pb-32">
      {/* Top Header */}
      <header className="bg-white/95 backdrop-blur-md sticky top-0 shadow-2xs z-40 border-b border-emerald-900/10">
        <div className="flex items-center justify-between px-4 w-full h-16 max-w-md mx-auto">
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-amber-500 to-amber-600 text-slate-950 flex items-center justify-center shadow-md shrink-0">
              <Megaphone className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="text-lg font-extrabold tracking-tight text-slate-950 truncate">
                  Group Notices
                </span>
                {effectiveHasJoinedGroup && effectiveSquad ? (
                  <span className="px-1.5 py-0.5 rounded-md text-[10px] font-black bg-emerald-100 text-emerald-900 border border-emerald-300 shrink-0">
                    {effectiveSquad.code}
                  </span>
                ) : (
                  <span className="px-1.5 py-0.5 rounded-md text-[10px] font-black bg-slate-100 text-slate-600 border border-slate-200 shrink-0">
                    NO GROUP
                  </span>
                )}
              </div>
              {effectiveHasJoinedGroup && effectiveSquad && (
                <p className="text-[10px] text-slate-500 font-semibold truncate">
                  {effectiveSquad.name} · Group-Isolated Broadcasts
                </p>
              )}
            </div>
          </div>

          {/* Broadcast button (Active when joined to a group) */}
          {effectiveHasJoinedGroup && effectiveSquad ? (
            <button
              type="button"
              onClick={() => setIsPosting(true)}
              className="px-3.5 py-1.5 rounded-full bg-gradient-to-r from-amber-500 to-orange-500 text-slate-950 text-xs font-black shadow-sm active:scale-95 transition-all flex items-center gap-1.5 cursor-pointer shrink-0"
            >
              <Plus className="w-4 h-4" />
              <span>Broadcast</span>
            </button>
          ) : (
            <div className="flex items-center gap-1 text-[11px] font-bold text-slate-400 bg-slate-100 px-2.5 py-1 rounded-full shrink-0">
              <Lock className="w-3 h-3" />
              <span>Locked</span>
            </div>
          )}
        </div>
      </header>

      {/* Main Content */}
      <main className="px-4 pt-3.5 space-y-3.5">
        {/* NOT IN A GROUP STATE: When user leaves a group or hasn't joined one, group notices are strictly hidden */}
        {!effectiveHasJoinedGroup || !effectiveSquad ? (
          <div className="p-7 rounded-3xl bg-white border-2 border-slate-200 text-center space-y-4 shadow-xs mt-2">
            <div className="w-14 h-14 rounded-2xl bg-amber-50 text-amber-700 border border-amber-200 mx-auto flex items-center justify-center shadow-2xs">
              <Lock className="w-7 h-7" />
            </div>
            <div className="space-y-1.5">
              <h2 className="text-base font-extrabold text-slate-900">
                No Active Group Notices
              </h2>
              <p className="text-xs text-slate-500 max-w-xs mx-auto leading-relaxed">
                Notices and broadcasts are strictly connected to each individual Squad Group. When you leave a group, its broadcasts are hidden until you rejoin that group or join another squad.
              </p>
            </div>
            <div className="pt-1 flex flex-col gap-2">
              <button
                type="button"
                onClick={() => onNavigate('gateway')}
                className="w-full py-3 rounded-2xl bg-[#0f5238] hover:bg-emerald-800 text-white text-xs font-bold flex items-center justify-center gap-2 shadow-md transition-all cursor-pointer"
              >
                <Users className="w-4 h-4" />
                <span>Join or Create a Squad Group</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        ) : (
          <>
            {/* Group Isolation Info Banner */}
            <div className="p-3.5 rounded-2xl bg-gradient-to-r from-emerald-50 via-teal-50 to-amber-50 border border-emerald-200 shadow-2xs relative overflow-hidden">
              <div className="flex items-start gap-2.5">
                <div className="w-7 h-7 rounded-xl bg-[#0f5238] text-white flex items-center justify-center shrink-0 shadow-xs mt-0.5">
                  <Users className="w-3.5 h-3.5" />
                </div>
                <div>
                  <span className="text-[11px] font-extrabold uppercase tracking-wider text-emerald-950 block">
                    {effectiveSquad.name} · Group Broadcast Channel ({effectiveSquad.code})
                  </span>
                  <p className="text-[11px] text-slate-700 mt-0.5 leading-relaxed font-medium">
                    Notices broadcasted here notify and appear <strong>only</strong> for active members of <strong>{effectiveSquad.name}</strong>. Leaving this group hides all its notices until you rejoin.
                  </p>
                </div>
              </div>
            </div>

            {/* Group Authority Status Pill */}
            <div className="flex items-center justify-between text-xs px-1">
              <span className="text-slate-500 font-semibold">
                {groupNotices.length} Group {groupNotices.length === 1 ? 'Notice' : 'Notices'} in {effectiveSquad.code}
              </span>

              <span className="text-[11px] font-bold text-amber-900 flex items-center gap-1 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                {userRole === 'super_admin' ? (
                  <>
                    <Crown className="w-3 h-3 text-amber-700" />
                    <span>Super Admin Channel</span>
                  </>
                ) : userRole === 'subgroup_admin' ? (
                  <>
                    <Shield className="w-3 h-3 text-sky-700" />
                    <span>Sub-Group Admin Channel</span>
                  </>
                ) : (
                  <span>Active Member ({effectiveSquad.code})</span>
                )}
              </span>
            </div>

            {/* Announcements List for Active Group */}
            <div className="space-y-3">
              {isLoadingNotices && groupNotices.length === 0 ? (
                <div className="p-8 rounded-3xl bg-white border border-slate-200 text-center text-xs text-slate-500">
                  Loading notices for {effectiveSquad.name}...
                </div>
              ) : groupNotices.length === 0 ? (
                <div className="p-8 rounded-3xl bg-white border border-slate-200 text-center space-y-3 shadow-xs">
                  <div className="w-12 h-12 rounded-2xl bg-amber-100 text-amber-900 mx-auto flex items-center justify-center">
                    <Megaphone className="w-6 h-6" />
                  </div>
                  <h4 className="text-sm font-bold text-slate-800">
                    No Notices in &ldquo;{effectiveSquad.name}&rdquo; Yet
                  </h4>
                  <p className="text-xs text-slate-500 max-w-xs mx-auto leading-relaxed">
                    No broadcasts have been posted to group <strong>{effectiveSquad.code}</strong> yet. Broadcast a notice below to alert all members of this group.
                  </p>
                  <button
                    type="button"
                    onClick={() => setIsPosting(true)}
                    className="mt-2 inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-amber-600 to-amber-700 text-white text-xs font-bold shadow-md hover:brightness-105 active:scale-95 transition-all cursor-pointer"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Broadcast First Group Notice</span>
                  </button>
                </div>
              ) : (
                groupNotices.map((notice) => {
                  const canDelete =
                    userRole === 'super_admin' ||
                    (effectiveUserId && notice.author_id === effectiveUserId);

                  return (
                    <article
                      key={notice.id}
                      className={`rounded-2xl transition-all shadow-sm overflow-hidden border-2 ${
                        notice.priority === 'critical'
                          ? 'bg-rose-50/40 border-rose-400 ring-2 ring-rose-400/10'
                          : notice.priority === 'advisory'
                          ? 'bg-amber-50/40 border-amber-400 ring-2 ring-amber-400/10'
                          : 'bg-emerald-50/40 border-emerald-400 ring-2 ring-emerald-400/10'
                      }`}
                    >
                      {/* Highlighted Top Banner */}
                      <div
                        className={`px-3.5 py-1.5 text-xs font-black flex items-center justify-between ${
                          notice.priority === 'critical'
                            ? 'bg-rose-600 text-white'
                            : notice.priority === 'advisory'
                            ? 'bg-amber-500 text-slate-950'
                            : 'bg-emerald-700 text-white'
                        }`}
                      >
                        <div className="flex items-center gap-1.5">
                          <AlertTriangle className="w-4 h-4 fill-current" />
                          <span className="uppercase tracking-wider">
                            {notice.priority === 'critical'
                              ? 'CRITICAL SAFETY DIRECTIVE'
                              : notice.priority === 'advisory'
                              ? 'OFFICIAL SQUAD ADVISORY'
                              : 'EXPEDITION BULLETIN'}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="px-1.5 py-0.5 rounded bg-black/20 text-[10px] font-mono">
                            {effectiveSquad.code}
                          </span>
                          {canDelete ? (
                            <button
                              type="button"
                              onClick={() => handleDeleteNotice(notice.id)}
                              className="p-0.5 rounded hover:bg-black/20 transition-colors cursor-pointer"
                              title="Delete group notice"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          ) : (
                            <Pin className="w-3.5 h-3.5" />
                          )}
                        </div>
                      </div>

                      <div className="p-4 space-y-2.5 bg-white">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2.5">
                            <div className="w-9 h-9 rounded-full bg-emerald-100 text-emerald-900 font-extrabold text-xs flex items-center justify-center border border-emerald-300">
                              {(notice.author_name || 'S').charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <h4 className="text-xs font-bold text-slate-900">
                                  {notice.author_name}
                                </h4>
                                <span className="px-1.5 py-0.2 rounded text-[9px] font-black uppercase bg-slate-100 text-slate-700">
                                  {notice.author_role?.includes('Super Admin') ||
                                  notice.author_role?.includes('Commander')
                                    ? '👑 SUPER ADMIN'
                                    : notice.author_role?.includes('Admin') ||
                                      notice.author_role?.includes('Lead')
                                    ? '⚡ ADMIN'
                                    : '✓ MEMBER'}
                                </span>
                              </div>
                              <p className="text-[10px] text-slate-500">
                                {effectiveSquad.name} ({effectiveSquad.code})
                              </p>
                            </div>
                          </div>
                          <span className="text-[10px] text-slate-400 font-mono">
                            {formatNoticeTimestamp(notice.created_at)}
                          </span>
                        </div>

                        {notice.title && (
                          <h3 className="text-xs font-black text-slate-950 uppercase tracking-wide">
                            📢 {notice.title}
                          </h3>
                        )}

                        <p className="text-xs leading-relaxed text-slate-800 whitespace-pre-line font-medium">
                          {notice.text}
                        </p>

                        {notice.image_url && (
                          <div className="rounded-2xl overflow-hidden border border-slate-200 my-2.5 max-h-56 bg-slate-900">
                            <img
                              src={notice.image_url}
                              alt="Notice Attachment"
                              className="w-full h-full object-cover max-h-56"
                            />
                          </div>
                        )}

                        <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-[11px] text-slate-500">
                          <span className="text-emerald-700 font-semibold flex items-center gap-1">
                            <span>✓ Scoped to Group {effectiveSquad.name}</span>
                          </span>
                          <span className="font-mono text-[10px] font-bold text-slate-600">
                            CODE: {effectiveSquad.code}
                          </span>
                        </div>
                      </div>
                    </article>
                  );
                })
              )}
            </div>
          </>
        )}
      </main>

      {/* Group Broadcast Composer Modal */}
      {isPosting && effectiveHasJoinedGroup && effectiveSquad && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-md animate-in fade-in duration-200">
          <div className="w-full max-w-sm bg-white rounded-3xl p-5 border border-amber-500/20 shadow-2xl flex flex-col space-y-3.5">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-amber-100 text-amber-900 flex items-center justify-center">
                  <Megaphone className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-sm">
                    Broadcast to {effectiveSquad.name}
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Notifies only active members of {effectiveSquad.code}
                  </p>
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
                    className={`py-1.5 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
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
                    className={`py-1.5 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
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
                    className={`py-1.5 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
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
                  Subject / Heading
                </label>
                <input
                  type="text"
                  value={announcementTitle}
                  onChange={(e) => setAnnouncementTitle(e.target.value)}
                  placeholder="e.g. RIDGE RETREAT AT 18:00"
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs font-bold text-slate-900 outline-none focus:border-amber-500"
                  required
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
                  placeholder={`Type notice for members of ${effectiveSquad?.name || 'Squad'}...`}
                  className="w-full p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-900 focus:bg-white focus:border-amber-500 outline-none"
                  required
                  autoFocus
                />
              </div>

              {/* Photo Attachment Input */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Attach Photo / Map (Optional)
                </label>
                {announcementImage ? (
                  <div className="relative rounded-2xl overflow-hidden border border-slate-200 bg-slate-900 h-28 group">
                    <img
                      src={announcementImage}
                      alt="Directive Attachment Preview"
                      className="w-full h-full object-cover"
                    />
                    <button
                      type="button"
                      onClick={() => setAnnouncementImage(null)}
                      className="absolute top-2 right-2 p-1.5 rounded-full bg-slate-950/80 text-white hover:bg-rose-600 transition-colors shadow-md cursor-pointer"
                      title="Remove image"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ) : (
                  <label className="flex items-center justify-center gap-2 py-2 px-3 rounded-xl border-2 border-dashed border-slate-200 hover:border-amber-400 bg-slate-50 text-slate-600 text-xs font-semibold cursor-pointer transition-colors">
                    <Camera className="w-4 h-4 text-amber-600" />
                    <span>Upload or Capture Photo</span>
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          if (file.size > 8 * 1024 * 1024) {
                            onShowToast('Please choose an image under 8MB.');
                            return;
                          }
                          const reader = new FileReader();
                          reader.onload = (event) => {
                            setAnnouncementImage(event.target?.result as string);
                            onShowToast('Photo attached to directive!');
                          };
                          reader.readAsDataURL(file);
                        }
                      }}
                    />
                  </label>
                )}
              </div>

              <div className="pt-1 flex gap-2">
                <button
                  type="button"
                  onClick={() => setIsPosting(false)}
                  className="flex-1 py-2.5 rounded-xl border border-slate-200 text-slate-700 text-xs font-semibold hover:bg-slate-100 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 disabled:opacity-50 text-slate-950 text-xs font-black shadow-md active:scale-95 transition-transform flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Send className="w-4 h-4" />
                  <span>{isSubmitting ? 'Sending...' : 'Broadcast Notice'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

