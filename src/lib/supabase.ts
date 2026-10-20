import { createClient, SupabaseClient, User } from '@supabase/supabase-js';

// Configuration storage keys
const STORAGE_KEY_URL = 'trailoPS_supabase_url';
const STORAGE_KEY_KEY = 'trailoPS_supabase_anon_key';

export interface SupabaseConfig {
  url: string;
  anonKey: string;
}

export function getSupabaseConfig(): SupabaseConfig {
  const envUrl = (import.meta.env.VITE_SUPABASE_URL || '').trim();
  const envKey = (import.meta.env.VITE_SUPABASE_ANON_KEY || '').trim();

  const localUrl = (localStorage.getItem(STORAGE_KEY_URL) || '').trim();
  const localKey = (localStorage.getItem(STORAGE_KEY_KEY) || '').trim();

  return {
    url: envUrl || localUrl,
    anonKey: envKey || localKey,
  };
}

export function isSupabaseConfigured(): boolean {
  const cfg = getSupabaseConfig();
  return Boolean(cfg.url && cfg.anonKey && cfg.url.startsWith('http') && cfg.anonKey.length > 20);
}

export function saveCustomSupabaseConfig(url: string, anonKey: string): void {
  localStorage.setItem(STORAGE_KEY_URL, url.trim());
  localStorage.setItem(STORAGE_KEY_KEY, anonKey.trim());
  initSupabaseClient();
}

export function clearCustomSupabaseConfig(): void {
  localStorage.removeItem(STORAGE_KEY_URL);
  localStorage.removeItem(STORAGE_KEY_KEY);
  initSupabaseClient();
}

let supabaseInstance: SupabaseClient | null = null;

export function initSupabaseClient(): SupabaseClient | null {
  const cfg = getSupabaseConfig();
  if (cfg.url && cfg.anonKey && cfg.url.startsWith('http')) {
    try {
      supabaseInstance = createClient(cfg.url, cfg.anonKey, {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
          detectSessionInUrl: true,
        },
      });
      return supabaseInstance;
    } catch (err) {
      console.error('Failed to initialize Supabase client:', err);
      supabaseInstance = null;
      return null;
    }
  }
  supabaseInstance = null;
  return null;
}

export function getSupabase(): SupabaseClient | null {
  if (!supabaseInstance) {
    return initSupabaseClient();
  }
  return supabaseInstance;
}

// Initial initialization
initSupabaseClient();

// Data Models
export interface UserProfileRecord {
  id: string;
  email: string;
  full_name: string;
  avatar_url?: string;
  phone?: string;
  date_of_birth?: string;
  age?: number;
  gender?: string;
  blood_group?: string;
  medical_conditions?: string;
  emergency_contact_name?: string;
  emergency_contact_phone?: string;
  gear_checklist?: any[];
  is_profile_complete: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface SquadGroupRecord {
  id: string;
  name: string;
  code: string;
  destination: string;
  start_date?: string;
  end_date?: string;
  startDate?: string;
  endDate?: string;
  created_by: string;
  creator_id?: string;
  created_at?: string;
  creator_name?: string;
  member_count?: number;
  memberCount?: number;
  userRequestStatus?: 'pending' | 'accepted' | 'rejected' | 'member' | null;
}

export interface SquadMemberRecord {
  id: string;
  group_id: string;
  user_id: string;
  role: 'super_admin' | 'admin' | 'member' | 'faculty';
  status: 'active' | 'standby' | 'distress';
  joined_at?: string;
  profile?: UserProfileRecord;
}

export interface TrainJourneyRecord {
  id: string;
  group_id: string;
  direction: 'onward' | 'return';
  train_name: string;
  train_number: string;
  boarding_station: string;
  destination_station: string;
  departure_time: string;
  arrival_time?: string;
  intermediate_halts: Array<{ station: string; arrival: string; departure: string }>;
  coaches: string[];
  notes?: string;
  created_by?: string;
  updated_at?: string;
}

export interface TrainSeatAssignmentRecord {
  id: string;
  journey_id: string;
  user_id: string;
  coach: string;
  berth_number: string;
  berth_type: 'LB' | 'MB' | 'UB' | 'SL' | 'SU';
  notes?: string;
  member_name?: string;
}

export interface MediaVaultItemRecord {
  id: string;
  group_id: string;
  uploader_id: string;
  uploader_name: string;
  file_name: string;
  storage_path: string;
  file_size: number;
  mime_type: string;
  resolution?: string;
  altitude?: string;
  signed_url?: string;
  url?: string;
  download_url?: string;
  created_at: string;
}

// -------------------------------------------------------------
// Connectivity Test
// -------------------------------------------------------------
export async function testSupabaseConnection(url?: string, key?: string): Promise<{ success: boolean; message: string }> {
  try {
    const testUrl = (url || getSupabaseConfig().url).trim();
    const testKey = (key || getSupabaseConfig().anonKey).trim();

    if (!testUrl || !testKey) {
      return { success: false, message: 'Please provide both Supabase URL and Anon Key.' };
    }

    const client = createClient(testUrl, testKey);
    const { error } = await client.from('profiles').select('id').limit(1);

    if (error && error.code !== 'PGRST116' && !error.message.includes('0 rows')) {
      // If table does not exist or invalid credentials
      if (error.message.includes('relation "public.profiles" does not exist') || error.message.includes('schema cache')) {
        return {
          success: true,
          message: 'Connected to Supabase! (Note: run schema migrations in the SQL Editor to create tables).',
        };
      }
      return { success: false, message: `Connection error: ${error.message}` };
    }

    return { success: true, message: 'Successfully verified connection to Supabase!' };
  } catch (err: any) {
    return { success: false, message: `Failed to connect: ${err.message || 'Unknown network error'}` };
  }
}

// -------------------------------------------------------------
// Authentication & Server API Helpers
// -------------------------------------------------------------
export interface OAuthDiagnosticsResult {
  configured: boolean;
  supabaseUrl: string;
  projectRef: string;
  providers: {
    email: boolean;
    google: boolean;
    apple: boolean;
  };
  mailerAutoconfirm?: boolean;
  tablesMigrated: boolean;
  settingsError?: string | null;
  urls: {
    appUrl: string;
    callbackUrl: string;
    supabaseCallbackUrl: string;
    supabaseDashboardProvidersUrl: string;
    supabaseDashboardUrlConfig: string;
    supabaseSqlEditorUrl?: string;
  };
}

export interface SquadJoinRequestRecord {
  id: string;
  group_id: string;
  user_id: string;
  requester_name: string;
  requester_email: string;
  requester_phone?: string;
  requester_avatar?: string;
  requester_blood_group?: string;
  user_name?: string;
  user_email?: string;
  user_phone?: string;
  user_avatar?: string;
  blood_group?: string;
  status: 'pending' | 'accepted' | 'rejected';
  reviewed_by?: string;
  reviewed_at?: string;
  created_at: string;
  updated_at?: string;
  group_name?: string;
  group_code?: string;
  group_destination?: string;
}

export interface UserNotificationRecord {
  id: string;
  user_id: string;
  group_id?: string;
  type: 'join_accepted' | 'join_rejected' | 'join_requested' | 'join_request_accepted' | 'join_request_rejected' | 'group_notice' | 'info';
  title: string;
  message: string;
  is_read: boolean;
  read?: boolean;
  created_at: string;
}

export interface VerifiedGroupPreview extends SquadGroupRecord {
  creator_name?: string;
  member_count?: number;
}

export async function getCurrentAuthUser(): Promise<User | null> {
  const sb = getSupabase();
  if (!sb) return null;
  const { data } = await sb.auth.getUser();
  return data.user;
}

export async function getCurrentSession() {
  const sb = getSupabase();
  if (!sb) return null;
  const { data } = await sb.auth.getSession();
  return data.session;
}

export async function buildApiHeaders(explicitUserId?: string, explicitEmail?: string): Promise<Record<string, string>> {
  const cfg = getSupabaseConfig();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (cfg.url) headers['x-supabase-url'] = cfg.url;
  if (cfg.anonKey) headers['x-supabase-anon-key'] = cfg.anonKey;

  const sb = getSupabase();
  if (sb) {
    try {
      const { data } = await sb.auth.getSession();
      if (data?.session?.access_token) {
        headers['Authorization'] = `Bearer ${data.session.access_token}`;
      }
      if (data?.session?.user?.id) {
        headers['x-user-id'] = data.session.user.id;
      }
      if (data?.session?.user?.email) {
        headers['x-user-email'] = data.session.user.email;
      }
    } catch {}
  }

  const fallbackId = explicitUserId || localStorage.getItem('trailoPS_currentUserId') || '';
  const fallbackEmail = explicitEmail || localStorage.getItem('trailoPS_currentUserEmail') || '';
  if (!headers['x-user-id'] && fallbackId) {
    headers['x-user-id'] = fallbackId;
  }
  if (!headers['x-user-email'] && fallbackEmail) {
    headers['x-user-email'] = fallbackEmail;
  }

  return headers;
}

export async function fetchOAuthDiagnostics(): Promise<OAuthDiagnosticsResult | null> {
  try {
    const headers = await buildApiHeaders();
    const res = await fetch('/api/auth/diagnostics', { headers });
    if (res.ok) {
      return (await res.json()) as OAuthDiagnosticsResult;
    }
  } catch (e) {
    console.warn('Failed to fetch OAuth diagnostics:', e);
  }
  return null;
}

// -------------------------------------------------------------
// Profile Database Helpers (Strictly Isolated by Supabase User ID)
// -------------------------------------------------------------
export async function fetchProfile(userId: string): Promise<UserProfileRecord | null> {
  if (!userId) return null;

  const sb = getSupabase();
  if (sb && isSupabaseConfigured()) {
    try {
      const { data, error } = await sb
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle();

      if (!error && data) {
        return data as UserProfileRecord;
      }
    } catch {}
  }

  // Fallback to verified server persistent database
  try {
    const headers = await buildApiHeaders(userId);
    const res = await fetch(`/api/profiles/${encodeURIComponent(userId)}`, { headers });
    if (res.ok) {
      const json = await res.json();
      if (json?.profile) {
        return json.profile as UserProfileRecord;
      }
    }
  } catch {}

  return null;
}

export async function upsertProfile(
  profile: Partial<UserProfileRecord> & { id: string; email: string }
): Promise<{ success: boolean; error?: string }> {
  if (!profile.id) {
    return { success: false, error: 'Valid user ID is required to save profile.' };
  }

  const payload = {
    ...profile,
    updated_at: new Date().toISOString(),
  };

  let savedToBackend = false;
  let lastError = '';

  // 1. Save to verified server persistent database (which also syncs to Supabase)
  try {
    const headers = await buildApiHeaders(profile.id, profile.email);
    const res = await fetch('/api/profiles', {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
    });
    if (res.ok) {
      savedToBackend = true;
    } else {
      const errJson = await res.json().catch(() => ({}));
      lastError = errJson.error || `HTTP ${res.status}`;
    }
  } catch (e: any) {
    lastError = e.message || 'Network error';
  }

  // 2. Also attempt direct Supabase upsert when table is migrated
  const sb = getSupabase();
  if (sb && isSupabaseConfigured()) {
    try {
      const { error } = await sb
        .from('profiles')
        .upsert(payload, { onConflict: 'id' });
      if (!error) {
        savedToBackend = true;
      } else if (!savedToBackend) {
        lastError = error.message;
      }
    } catch {}
  }

  if (!savedToBackend) {
    return { success: false, error: lastError || 'Failed to save profile' };
  }
  return { success: true };
}

// Mask sensitive fields if viewer is not the profile owner and does not hold an authorized admin/faculty role
export function filterProfilePrivacy(profile: UserProfileRecord, viewerUserId: string, viewerRole: string): UserProfileRecord {
  const isOwner = viewerUserId === profile.id;
  const isAuthorizedRole = viewerRole === 'super_admin' || viewerRole === 'admin' || viewerRole === 'faculty';

  if (isOwner || isAuthorizedRole) {
    return profile;
  }

  // Mask sensitive fields for ordinary squad members
  return {
    ...profile,
    phone: profile.phone ? `${profile.phone.slice(0, 4)}••••••` : undefined,
    emergency_contact_phone: '•••••••••• (Authorized Staff Only)',
    emergency_contact_name: profile.emergency_contact_name ? 'Confidential' : undefined,
    medical_conditions: profile.medical_conditions ? 'Protected Medical Data (Commanders Only)' : undefined,
    gear_checklist: undefined,
  };
}

// -------------------------------------------------------------
// Squad Groups, Unique Code Lookup & Join Requests Helpers
// -------------------------------------------------------------
export function normalizeSquadCode(raw: string): string {
  return (raw || '').trim().toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6);
}

function saveGroupToUserLocalCache(userId: string, group: SquadGroupRecord, role?: string): void {
  try {
    if (userId) {
      localStorage.setItem(`trailoPS_active_squad_${userId}`, JSON.stringify(group));
      localStorage.setItem(`trailoPS_active_squad_id_${userId}`, group.id);
      if (role) {
        localStorage.setItem(`trailoPS_userRole_${userId}`, role);
      }
    }
    localStorage.setItem('trailoPS_active_squad', JSON.stringify(group));
    localStorage.setItem('trailoPS_active_squad_id', group.id);
  } catch {}
}

export async function verifyGroupByCode(
  rawCode: string,
  currentUserId?: string
): Promise<{
  found: boolean;
  group?: VerifiedGroupPreview;
  membership?: {
    is_member: boolean;
    role: string | null;
    pending_request: SquadJoinRequestRecord | null;
    latest_request_status: string | null;
  };
  error?: string;
}> {
  const cleanCode = normalizeSquadCode(rawCode);
  if (!cleanCode || cleanCode.length < 4) {
    return {
      found: false,
      error: 'Please enter a valid 6-character group invitation code.',
    };
  }

  const effectiveUserId = currentUserId || localStorage.getItem('trailoPS_currentUserId') || '';

  // 1. Query verified backend database (which checks both Supabase PostgreSQL and persistent DB)
  try {
    const headers = await buildApiHeaders(effectiveUserId);
    const url = `/api/groups/lookup?code=${encodeURIComponent(cleanCode)}&userId=${encodeURIComponent(effectiveUserId)}`;
    const res = await fetch(url, { headers });
    const data = await res.json().catch(() => null);

    if (res.ok && data?.found && data?.group) {
      return {
        found: true,
        group: data.group as VerifiedGroupPreview,
        membership: data.membership,
      };
    }

    if (res.status === 404 && data?.error) {
      // Also check direct Supabase RPC/table in case group was inserted directly in Supabase
      const sb = getSupabase();
      if (sb && isSupabaseConfigured()) {
        try {
          const { data: rpcData, error: rpcErr } = await sb.rpc('lookup_squad_by_code', {
            p_code: cleanCode,
          });
          if (!rpcErr && rpcData && rpcData.id) {
            return {
              found: true,
              group: {
                id: rpcData.id,
                name: rpcData.name,
                code: normalizeSquadCode(rpcData.code),
                destination: rpcData.destination || 'Expedition Base',
                start_date: rpcData.start_date,
                end_date: rpcData.end_date,
                created_by: rpcData.created_by,
                created_at: rpcData.created_at,
                creator_name: rpcData.creator_name || 'Squad Commander',
                member_count: rpcData.member_count || 1,
              },
              membership: {
                is_member: Boolean(rpcData.is_member),
                role: rpcData.my_role || null,
                pending_request: rpcData.latest_request_status === 'pending'
                  ? ({ id: rpcData.latest_request_id, status: 'pending' } as any)
                  : null,
                latest_request_status: rpcData.latest_request_status || null,
              },
            };
          }

          const { data: sbGroup } = await sb
            .from('squad_groups')
            .select('*')
            .ilike('code', cleanCode)
            .limit(1)
            .maybeSingle();

          if (sbGroup) {
            return {
              found: true,
              group: sbGroup as VerifiedGroupPreview,
              membership: {
                is_member: false,
                role: null,
                pending_request: null,
                latest_request_status: null,
              },
            };
          }
        } catch {}
      }

      return {
        found: false,
        error: data.error,
      };
    }
  } catch (err: any) {
    console.warn('verifyGroupByCode error:', err);
  }

  return {
    found: false,
    error: `No group found with invitation code "${cleanCode}". Please check the 6-character code with your group Super Admin.`,
  };
}

export async function lookupSquadByCode(rawCode: string, currentUserId?: string): Promise<VerifiedGroupPreview | null> {
  const result = await verifyGroupByCode(rawCode, currentUserId);
  if (!result.found || !result.group) return null;

  const g = result.group;
  const m = result.membership;
  let userRequestStatus: 'pending' | 'accepted' | 'rejected' | 'member' | null = null;
  if (m?.is_member) {
    userRequestStatus = 'member';
  } else if (m?.pending_request || m?.latest_request_status === 'pending') {
    userRequestStatus = 'pending';
  } else if (m?.latest_request_status === 'accepted') {
    userRequestStatus = 'accepted';
  } else if (m?.latest_request_status === 'rejected') {
    userRequestStatus = 'rejected';
  }

  return {
    ...g,
    startDate: g.start_date || g.startDate,
    endDate: g.end_date || g.endDate,
    creator_id: g.created_by || g.creator_id,
    memberCount: g.member_count ?? g.memberCount ?? 1,
    userRequestStatus,
  };
}

export async function createSquadGroup(
  arg1:
    | {
        name: string;
        destination: string;
        startDate?: string;
        endDate?: string;
        creatorId: string;
        code?: string;
      }
    | string,
  nameArg?: string,
  destArg?: string,
  _budgetArg?: number,
  _codeArg?: string,
  startDateArg?: string,
  endDateArg?: string,
  _creatorNameArg?: string,
  _creatorEmailArg?: string,
  _creatorAvatarArg?: string
): Promise<{ success: boolean; group?: SquadGroupRecord; error?: string }> {
  let creatorId = '';
  let name = '';
  let destination = '';
  let startDate: string | undefined;
  let endDate: string | undefined;

  if (typeof arg1 === 'string') {
    creatorId = arg1;
    name = nameArg || 'Expedition Squad';
    destination = destArg || 'Expedition Base';
    startDate = startDateArg;
    endDate = endDateArg;
  } else {
    creatorId = arg1.creatorId;
    name = arg1.name;
    destination = arg1.destination;
    startDate = arg1.startDate;
    endDate = arg1.endDate;
  }

  const sb = getSupabase();
  let effectiveCreatorId = creatorId || localStorage.getItem('trailoPS_currentUserId') || '';

  if (sb && isSupabaseConfigured()) {
    try {
      const { data: authData } = await sb.auth.getUser();
      if (authData?.user?.id) {
        effectiveCreatorId = authData.user.id;
      }
    } catch {}
  }

  if (!effectiveCreatorId) {
    return {
      success: false,
      error: 'You must be signed in with a valid account to create a group.',
    };
  }

  try {
    const headers = await buildApiHeaders(effectiveCreatorId);
    const res = await fetch('/api/groups', {
      method: 'POST',
      headers,
      body: JSON.stringify({
        creatorId: effectiveCreatorId,
        name: name.trim(),
        destination: destination.trim(),
        startDate,
        endDate,
      }),
    });

    const data = await res.json().catch(() => null);
    if (res.ok && data?.success && data?.group) {
      const rawGroup = data.group as SquadGroupRecord;
      const groupRecord: SquadGroupRecord = {
        ...rawGroup,
        creator_id: rawGroup.created_by || rawGroup.creator_id,
        startDate: rawGroup.start_date || rawGroup.startDate,
        endDate: rawGroup.end_date || rawGroup.endDate,
      };
      saveGroupToUserLocalCache(effectiveCreatorId, groupRecord, 'super_admin');
      return { success: true, group: groupRecord };
    }

    return {
      success: false,
      error: data?.error || 'Failed to create group in database.',
    };
  } catch (err: any) {
    return {
      success: false,
      error: err.message || 'Network error while creating group.',
    };
  }
}

function normalizeJoinRequestRecord(r: any): SquadJoinRequestRecord {
  if (!r || typeof r !== 'object') {
    return {
      id: '',
      group_id: '',
      user_id: '',
      requester_name: 'Trekker Applicant',
      requester_email: '',
      requester_phone: '',
      requester_avatar: '',
      requester_blood_group: '',
      user_name: 'Trekker Applicant',
      user_email: '',
      user_phone: '',
      user_avatar: '',
      blood_group: '',
      status: 'pending',
      created_at: new Date().toISOString(),
    };
  }
  return {
    ...r,
    user_id: r.user_id || '',
    requester_name: r.requester_name || r.user_name || 'Trekker Applicant',
    requester_email: r.requester_email || r.user_email || '',
    requester_phone: r.requester_phone || r.user_phone || '',
    requester_avatar: r.requester_avatar || r.user_avatar || '',
    requester_blood_group: r.requester_blood_group || r.blood_group || '',
    user_name: r.user_name || r.requester_name || 'Trekker Applicant',
    user_email: r.user_email || r.requester_email || '',
    user_phone: r.user_phone || r.requester_phone || '',
    user_avatar: r.user_avatar || r.requester_avatar || '',
    blood_group: r.blood_group || r.requester_blood_group || '',
  };
}

export async function submitSquadJoinRequest(
  arg1:
    | {
        groupId: string;
        userId: string;
        requesterName?: string;
        requesterEmail?: string;
        requesterPhone?: string;
        requesterAvatar?: string;
        requesterBloodGroup?: string;
      }
    | string,
  userIdArg?: string,
  requesterNameArg?: string,
  requesterEmailArg?: string,
  requesterAvatarArg?: string
): Promise<{
  success: boolean;
  duplicate?: boolean;
  alreadyPending?: boolean;
  alreadyMember?: boolean;
  request?: SquadJoinRequestRecord;
  message?: string;
  error?: string;
}> {
  const params =
    typeof arg1 === 'string'
      ? {
          groupId: arg1,
          userId: userIdArg || '',
          requesterName: requesterNameArg,
          requesterEmail: requesterEmailArg,
          requesterAvatar: requesterAvatarArg,
        }
      : arg1;

  if (!params.groupId || !params.userId) {
    return {
      success: false,
      error: 'Valid group and authenticated user are required to submit a join request.',
    };
  }

  try {
    const headers = await buildApiHeaders(params.userId, params.requesterEmail);
    const res = await fetch(`/api/groups/${encodeURIComponent(params.groupId)}/join-requests`, {
      method: 'POST',
      headers,
      body: JSON.stringify(params),
    });

    const data = await res.json().catch(() => null);
    if (!res.ok || !data?.success) {
      return {
        success: false,
        alreadyMember: Boolean(data?.already_member),
        alreadyPending: Boolean(data?.duplicate),
        error: data?.error || 'Failed to submit join request.',
      };
    }

    const normalizedReq = data.request ? normalizeJoinRequestRecord(data.request) : undefined;

    // Notify tabs/devices via BroadcastChannel and window event
    try {
      window.dispatchEvent(new CustomEvent('trailoPS_join_requests_updated', { detail: { groupId: params.groupId } }));
      if (typeof BroadcastChannel !== 'undefined') {
        const bc = new BroadcastChannel(`trailops_squad_bus_${params.groupId}`);
        bc.postMessage({ type: 'JOIN_REQUEST_SUBMITTED', groupId: params.groupId, request: normalizedReq });
        bc.close();
      }
    } catch {}

    return {
      success: true,
      duplicate: Boolean(data.duplicate),
      alreadyPending: Boolean(data.duplicate),
      request: normalizedReq,
      message: data.message || 'Request Sent — Awaiting Approval',
    };
  } catch (err: any) {
    return {
      success: false,
      error: err.message || 'Network error submitting join request.',
    };
  }
}

export async function fetchGroupJoinRequests(
  groupId: string,
  callerUserId?: string
): Promise<SquadJoinRequestRecord[]> {
  if (!groupId) return [];
  const effectiveUserId = callerUserId || localStorage.getItem('trailoPS_currentUserId') || '';

  try {
    const headers = await buildApiHeaders(effectiveUserId);
    const res = await fetch(
      `/api/groups/${encodeURIComponent(groupId)}/join-requests?userId=${encodeURIComponent(effectiveUserId)}`,
      { headers }
    );
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data?.requests)) {
        return data.requests.filter((r: any) => Boolean(r && r.user_id)).map(normalizeJoinRequestRecord);
      }
    }
  } catch (e) {
    console.warn('fetchGroupJoinRequests error:', e);
  }

  // Also check Supabase directly if migrated
  const sb = getSupabase();
  if (sb && isSupabaseConfigured()) {
    try {
      const { data, error } = await sb
        .from('squad_join_requests')
        .select('*')
        .eq('group_id', groupId)
        .eq('status', 'pending')
        .order('created_at', { ascending: false });
      if (!error && Array.isArray(data)) {
        return data.filter((r: any) => Boolean(r && r.user_id)).map(normalizeJoinRequestRecord);
      }
    } catch {}
  }

  return [];
}

export async function respondToJoinRequest(
  arg1: string,
  arg2: string,
  arg3: string,
  arg4?: string
): Promise<{ success: boolean; error?: string; request?: SquadJoinRequestRecord }> {
  // Support both (requestId, groupId, callerUserId, 'accept'|'reject') and (groupId, requestId, 'accepted'|'rejected', callerUserId)
  let groupId = '';
  let requestId = '';
  let decision: 'accepted' | 'rejected' = 'accepted';
  let callerUserId = '';

  const isDecision = (v?: string) =>
    v === 'accept' || v === 'reject' || v === 'accepted' || v === 'rejected';

  if (isDecision(arg3)) {
    groupId = arg1;
    requestId = arg2;
    decision = arg3 === 'accept' || arg3 === 'accepted' ? 'accepted' : 'rejected';
    callerUserId = arg4 || localStorage.getItem('trailoPS_currentUserId') || '';
  } else {
    requestId = arg1;
    groupId = arg2;
    callerUserId = arg3 || localStorage.getItem('trailoPS_currentUserId') || '';
    decision = arg4 === 'accept' || arg4 === 'accepted' ? 'accepted' : 'rejected';
  }

  if (!groupId || !requestId || !callerUserId) {
    return { success: false, error: 'Missing required parameters.' };
  }

  try {
    const headers = await buildApiHeaders(callerUserId);
    const res = await fetch(
      `/api/groups/${encodeURIComponent(groupId)}/join-requests/${encodeURIComponent(requestId)}/respond`,
      {
        method: 'POST',
        headers,
        body: JSON.stringify({
          decision,
          callerUserId,
        }),
      }
    );

    const data = await res.json().catch(() => null);
    if (!res.ok || !data?.success) {
      return {
        success: false,
        error: data?.error || `Failed to ${decision === 'accepted' ? 'approve' : 'reject'} join request.`,
      };
    }

    const normalizedReq = data.request ? normalizeJoinRequestRecord(data.request) : undefined;

    // Broadcast real-time update to both Super Admin roster and requester device
    try {
      window.dispatchEvent(new CustomEvent('trailoPS_join_requests_updated', { detail: { groupId } }));
      window.dispatchEvent(new CustomEvent('trailoPS_members_updated'));
      if (typeof BroadcastChannel !== 'undefined') {
        const bc = new BroadcastChannel(`trailops_squad_bus_${groupId}`);
        bc.postMessage({
          type: 'JOIN_REQUEST_RESPONDED',
          groupId,
          requestId,
          decision,
          userId: normalizedReq?.user_id,
        });
        bc.close();
      }
    } catch {}

    return {
      success: true,
      request: normalizedReq,
    };
  } catch (err: any) {
    return {
      success: false,
      error: err.message || 'Network error responding to join request.',
    };
  }
}

export async function fetchUserJoinRequestsAndNotifications(userId: string): Promise<{
  activeSquad: { group: SquadGroupRecord; role: string; status: string } | null;
  joinRequests: SquadJoinRequestRecord[];
  requests: SquadJoinRequestRecord[];
  notifications: UserNotificationRecord[];
  joinedGroups: SquadGroupRecord[];
}> {
  if (!userId) {
    return { activeSquad: null, joinRequests: [], requests: [], notifications: [], joinedGroups: [] };
  }

  const preferredGroupId = localStorage.getItem(`trailoPS_active_squad_id_${userId}`) || '';

  try {
    const headers = await buildApiHeaders(userId);
    const res = await fetch(
      `/api/users/${encodeURIComponent(userId)}/status?preferredGroupId=${encodeURIComponent(preferredGroupId)}`,
      { headers }
    );
    if (res.ok) {
      const data = await res.json();
      const rawRequests = Array.isArray(data.joinRequests) ? data.joinRequests.filter(Boolean) : [];
      const mappedRequests = rawRequests.map(normalizeJoinRequestRecord);
      const rawNotifs = Array.isArray(data.notifications) ? data.notifications.filter(Boolean) : [];
      const mappedNotifs: UserNotificationRecord[] = rawNotifs.map((n: any) => ({
        ...n,
        read: Boolean(n.is_read ?? n.read),
        is_read: Boolean(n.is_read ?? n.read),
        type:
          n.type === 'join_accepted'
            ? 'join_request_accepted'
            : n.type === 'join_rejected'
            ? 'join_request_rejected'
            : n.type,
      }));
      const joinedGroups: SquadGroupRecord[] = data.activeSquad?.group
        ? [
            {
              ...data.activeSquad.group,
              creator_id: data.activeSquad.group.created_by,
              startDate: data.activeSquad.group.start_date,
              endDate: data.activeSquad.group.end_date,
            },
          ]
        : [];
      return {
        activeSquad: data.activeSquad || null,
        joinRequests: mappedRequests,
        requests: mappedRequests,
        notifications: mappedNotifs,
        joinedGroups,
      };
    }
  } catch {}

  return { activeSquad: null, joinRequests: [], requests: [], notifications: [], joinedGroups: [] };
}

export async function markNotificationsRead(userId: string, notificationId?: string): Promise<void> {
  if (!userId) return;
  try {
    const headers = await buildApiHeaders(userId);
    await fetch('/api/notifications/mark-read', {
      method: 'POST',
      headers,
      body: JSON.stringify({ userId, notificationId }),
    });
  } catch {}
}

export async function markNotificationRead(notificationId: string): Promise<void> {
  const userId = localStorage.getItem('trailoPS_currentUserId') || '';
  if (!userId) return;
  await markNotificationsRead(userId, notificationId);
}

// Legacy compatibility wrapper: instead of joining immediately, submits a pending join request unless already a member
export async function joinSquadByCode(
  arg1: string,
  arg2: string
): Promise<{
  success: boolean;
  pendingApproval?: boolean;
  duplicate?: boolean;
  group?: SquadGroupRecord;
  role?: string;
  error?: string;
}> {
  const isUuidOrUserPrefix = (val: string) =>
    /^[0-9a-f]{8}-[0-9a-f]{4}/i.test(val) ||
    val.startsWith('usr_') ||
    val.startsWith('user_') ||
    val.includes('@');

  let code = '';
  let userId = '';

  if (isUuidOrUserPrefix(arg1) && !isUuidOrUserPrefix(arg2)) {
    userId = arg1;
    code = arg2;
  } else if (isUuidOrUserPrefix(arg2) && !isUuidOrUserPrefix(arg1)) {
    userId = arg2;
    code = arg1;
  } else if (arg1.length > 8 && arg2.length <= 8) {
    userId = arg1;
    code = arg2;
  } else if (arg2.length > 8 && arg1.length <= 8) {
    userId = arg2;
    code = arg1;
  } else {
    userId = arg1;
    code = arg2;
  }

  const cleanCode = normalizeSquadCode(code);
  if (!cleanCode || cleanCode.length < 4) {
    return { success: false, error: 'Please enter a valid 6-character squad invitation code.' };
  }

  const verification = await verifyGroupByCode(cleanCode, userId);
  if (!verification.found || !verification.group) {
    return {
      success: false,
      error: verification.error || `No group found with invitation code "${cleanCode}".`,
    };
  }

  if (verification.membership?.is_member) {
    saveGroupToUserLocalCache(userId, verification.group, verification.membership.role || 'member');
    return {
      success: true,
      pendingApproval: false,
      group: verification.group,
      role: verification.membership.role || 'member',
    };
  }

  const reqResult = await submitSquadJoinRequest({
    groupId: verification.group.id,
    userId,
  });

  if (!reqResult.success) {
    return {
      success: false,
      error: reqResult.error || 'Failed to submit join request.',
    };
  }

  return {
    success: true,
    pendingApproval: true,
    duplicate: reqResult.duplicate,
    group: verification.group,
    role: 'member',
  };
}

export async function fetchUserActiveSquad(userId: string): Promise<{ group: SquadGroupRecord; role: string; status: string } | null> {
  if (!userId) return null;

  // 1. Check verified server status endpoint first
  try {
    const statusData = await fetchUserJoinRequestsAndNotifications(userId);
    if (statusData.activeSquad?.group) {
      saveGroupToUserLocalCache(
        userId,
        statusData.activeSquad.group,
        statusData.activeSquad.role
      );
      return statusData.activeSquad;
    }
  } catch {}

  // 2. Also check Supabase squad_members directly when migrated
  const sb = getSupabase();
  const preferredGroupId = localStorage.getItem(`trailoPS_active_squad_id_${userId}`);

  if (sb && isSupabaseConfigured()) {
    try {
      const { data: memberships, error } = await sb
        .from('squad_members')
        .select('role, status, group_id, joined_at, squad_groups (*)')
        .eq('user_id', userId)
        .order('joined_at', { ascending: false });

      if (!error && memberships && memberships.length > 0) {
        const chosen =
          (preferredGroupId && memberships.find((m: any) => m.group_id === preferredGroupId)) ||
          memberships[0];

        const groupObj = Array.isArray(chosen.squad_groups)
          ? chosen.squad_groups[0]
          : chosen.squad_groups;

        if (groupObj) {
          let finalRole = chosen.role || 'member';
          saveGroupToUserLocalCache(userId, groupObj as SquadGroupRecord, finalRole);
          return {
            group: groupObj as SquadGroupRecord,
            role: finalRole,
            status: chosen.status,
          };
        }
      }
    } catch {}
  }

  return null;
}

export async function fetchUserSquad(userId: string): Promise<SquadGroupRecord | null> {
  const res = await fetchUserActiveSquad(userId);
  return res ? res.group : null;
}

export async function fetchSquadMembers(groupId: string, callerUserId?: string): Promise<SquadMemberRecord[]> {
  if (!groupId) return [];
  const effectiveCallerId = callerUserId || localStorage.getItem('trailoPS_currentUserId') || '';

  // 1. Fetch from verified server endpoint (enforces approved group membership)
  try {
    const headers = await buildApiHeaders(effectiveCallerId);
    const res = await fetch(
      `/api/groups/${encodeURIComponent(groupId)}/members?userId=${encodeURIComponent(effectiveCallerId)}`,
      { headers }
    );
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data?.members)) {
        const validMembers = data.members.filter((m: any): m is SquadMemberRecord => Boolean(m && m.user_id));
        if (validMembers.length > 0) {
          return validMembers;
        }
      }
    } else if (res.status === 403) {
      // Unauthorized non-member prevented from reading private group roster
      return [];
    }
  } catch {}

  // 2. Fallback to direct Supabase query if migrated
  const sb = getSupabase();
  if (!sb) return [];

  const { data: members, error } = await sb
    .from('squad_members')
    .select('id, group_id, user_id, role, status, joined_at, profiles (*)')
    .eq('group_id', groupId)
    .order('joined_at', { ascending: true });

  if (error || !members) {
    return [];
  }

  const validSbMembers = members.filter((m: any) => Boolean(m && m.user_id));
  const hasSuperAdmin = validSbMembers.some((m: any) => m.role === 'super_admin');
  if (validSbMembers.length === 1 || (!hasSuperAdmin && validSbMembers.length > 0)) {
    const primary = validSbMembers[0];
    if (primary && primary.role !== 'super_admin') {
      primary.role = 'super_admin';
    }
  }

  return validSbMembers.map((m: any) => ({
    id: m.id,
    group_id: m.group_id,
    user_id: m.user_id,
    role: m.role,
    status: m.status,
    joined_at: m.joined_at,
    profile: m.profiles || undefined,
  }));
}

export async function updateMemberRole(groupId: string, targetUserId: string, newRole: string): Promise<{ success: boolean; error?: string }> {
  return manageMemberRole(groupId, targetUserId, newRole as any);
}

export async function manageMemberRole(
  groupId: string,
  targetUserId: string,
  newRole: 'super_admin' | 'admin' | 'member' | 'faculty'
): Promise<{ success: boolean; error?: string }> {
  const sb = getSupabase();
  if (sb && isSupabaseConfigured()) {
    try {
      // Call secure transactional RPC first
      const { data, error } = await sb.rpc('manage_member_role', {
        p_group_id: groupId,
        p_target_user_id: targetUserId,
        p_new_role: newRole,
      });

      if (error) {
        // Fallback to direct table update with check if RPC not migrated yet
        const members = await fetchSquadMembers(groupId);
        const currentSuperAdmins = members.filter(m => m && m.role === 'super_admin');
        const targetMember = members.find(m => m && m.user_id === targetUserId);

        if (targetMember?.role === 'super_admin' && newRole !== 'super_admin' && currentSuperAdmins.length <= 1) {
          return { success: false, error: 'Constraint Violation: Every squad must maintain at least one Super Admin.' };
        }

        const { error: directErr } = await sb
          .from('squad_members')
          .update({ role: newRole })
          .eq('group_id', groupId)
          .eq('user_id', targetUserId);

        if (directErr) return { success: false, error: directErr.message };
      }
    } catch (err: any) {
      console.warn('RPC manage_member_role error:', err);
    }
  }

  // Local/Offline state synchronization
  try {
    const localKey = 'trailoPS_squad_members';
    const local = localStorage.getItem(localKey);
    if (local) {
      const parsed = JSON.parse(local);
      if (Array.isArray(parsed)) {
        const updated = parsed.filter(Boolean).map((m: any) => {
          if (m.id === targetUserId || m.name === targetUserId || m.user_id === targetUserId) {
            return { ...m, role: newRole === 'super_admin' ? 'Super Admin' : newRole === 'admin' ? 'Admin' : newRole === 'faculty' ? 'Faculty Lead' : 'Hiker' };
          }
          return m;
        });
        localStorage.setItem(localKey, JSON.stringify(updated));
        window.dispatchEvent(new CustomEvent('trailoPS_squad_members_updated'));
      }
    }
  } catch (e) {
    // ignore
  }

  return { success: true };
}

export async function transferAndLeaveSquad(
  groupId: string,
  successorUserId: string,
  action: 'leave' | 'demote_to_member' = 'leave'
): Promise<{ success: boolean; error?: string }> {
  const sb = getSupabase();
  if (sb && isSupabaseConfigured()) {
    try {
      const { error } = await sb.rpc('transfer_and_leave_squad', {
        p_group_id: groupId,
        p_successor_user_id: successorUserId,
        p_action: action,
      });

      if (!error) {
        return { success: true };
      }

      // Fallback: Two-step transaction
      const { error: promErr } = await sb
        .from('squad_members')
        .update({ role: 'super_admin' })
        .eq('group_id', groupId)
        .eq('user_id', successorUserId);

      if (promErr) return { success: false, error: `Failed to promote successor: ${promErr.message}` };

      const { data: userResp } = await sb.auth.getUser();
      if (userResp?.user) {
        if (action === 'leave') {
          await sb
            .from('squad_members')
            .delete()
            .eq('group_id', groupId)
            .eq('user_id', userResp.user.id);
        } else {
          await sb
            .from('squad_members')
            .update({ role: 'member' })
            .eq('group_id', groupId)
            .eq('user_id', userResp.user.id);
        }
      }
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  }

  // Local/Offline state transfer
  try {
    const localKey = 'trailoPS_squad_members';
    const local = localStorage.getItem(localKey);
    if (local) {
      const parsed = JSON.parse(local);
      if (Array.isArray(parsed)) {
        const updated = parsed.filter(Boolean).map((m: any) => {
          if (m.id === successorUserId || m.name === successorUserId || m.user_id === successorUserId) {
            return { ...m, role: 'Super Admin' };
          }
          return m;
        });
        localStorage.setItem(localKey, JSON.stringify(updated));
        window.dispatchEvent(new CustomEvent('trailoPS_squad_members_updated'));
      }
    }
  } catch (e) {
    // ignore
  }

  return { success: true };
}

export async function deleteSquadGroupCascade(
  groupId: string
): Promise<{ success: boolean; error?: string }> {
  const sb = getSupabase();
  if (sb && isSupabaseConfigured()) {
    try {
      // 1. Clean up storage files in trailops-media bucket
      try {
        const { data: mediaItems } = await sb
          .from('media_vault_items')
          .select('storage_path')
          .eq('group_id', groupId);

        if (mediaItems && mediaItems.length > 0) {
          const filePaths = mediaItems.map((m: any) => m.storage_path).filter(Boolean);
          if (filePaths.length > 0) {
            await sb.storage.from('trailops-media').remove(filePaths);
          }
        }
      } catch (storageErr) {
        console.warn('Storage cleanup notice:', storageErr);
      }

      // 2. Cascade delete from squad_groups via RPC or direct delete
      const { error: rpcErr } = await sb.rpc('delete_squad_group_cascade', {
        p_group_id: groupId,
      });

      if (rpcErr) {
        // Direct delete fallback (foreign keys ON DELETE CASCADE handle relations)
        const { error: delErr } = await sb
          .from('squad_groups')
          .delete()
          .eq('id', groupId);

        if (delErr) {
          return { success: false, error: delErr.message };
        }
      }
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  }

  // Clean local state & dispatch deletion event across all tabs/devices
  try {
    localStorage.removeItem('trailoPS_active_squad');
    localStorage.removeItem('trailoPS_joined_group');
    localStorage.removeItem(`trailoPS_squad_sos_alarm_${groupId}`);
    localStorage.removeItem(`trailoPS_emergency_contacts_${groupId}`);
    window.dispatchEvent(new CustomEvent('trailoPS_group_deleted', { detail: { groupId } }));

    if (typeof BroadcastChannel !== 'undefined') {
      const bc = new BroadcastChannel(`trailops_squad_bus_${groupId}`);
      bc.postMessage({ type: 'GROUP_DELETED', groupId });
      bc.close();
    }

    const sb = getSupabase();
    if (sb && isSupabaseConfigured()) {
      const channel = sb.channel(`squad_realtime_${groupId}`);
      channel.subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          channel.send({
            type: 'broadcast',
            event: 'group_deleted',
            payload: { groupId },
          });
        }
      });
    }
  } catch (e) {
    // ignore
  }

  return { success: true };
}

export async function recoverGroupSuperAdmin(
  groupId: string,
  newAdminUserId: string,
  recoveryKey: string
): Promise<{ success: boolean; error?: string }> {
  if (recoveryKey.trim() !== 'TRAIL-OPS-MASTER-2026') {
    return { success: false, error: 'Invalid platform recovery authorization key.' };
  }

  const sb = getSupabase();
  if (sb && isSupabaseConfigured()) {
    try {
      const { error } = await sb.rpc('recover_group_super_admin', {
        p_group_id: groupId,
        p_new_admin_user_id: newAdminUserId,
        p_recovery_key: recoveryKey.trim(),
      });

      if (error) {
        // Fallback direct promote
        await sb
          .from('squad_members')
          .update({ role: 'super_admin' })
          .eq('group_id', groupId)
          .eq('user_id', newAdminUserId);
      }
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  }

  // Local promote
  try {
    const localKey = 'trailoPS_squad_members';
    const local = localStorage.getItem(localKey);
    if (local) {
      const parsed = JSON.parse(local);
      const updated = parsed.map((m: any) => {
        if (m.id === newAdminUserId || m.name === newAdminUserId) {
          return { ...m, role: 'Super Admin' };
        }
        return m;
      });
      localStorage.setItem(localKey, JSON.stringify(updated));
      window.dispatchEvent(new CustomEvent('trailoPS_squad_members_updated'));
    }
  } catch (e) {
    // ignore
  }

  return { success: true };
}

// -------------------------------------------------------------
// Emergency Leadership & Faculty Contacts
// -------------------------------------------------------------
export interface EmergencyContactRecord {
  id: string;
  group_id: string;
  name: string;
  role: 'faculty' | 'super_admin' | 'admin';
  phone: string;
  designation?: string;
  added_by: string;
  created_at?: string;
}

export async function fetchEmergencyContacts(groupId: string): Promise<EmergencyContactRecord[]> {
  const sb = getSupabase();
  if (sb && isSupabaseConfigured() && groupId) {
    try {
      const { data, error } = await sb
        .from('squad_emergency_contacts')
        .select('*')
        .eq('group_id', groupId)
        .order('created_at', { ascending: true });

      if (!error && data && data.length > 0) {
        // Cache locally
        localStorage.setItem(`trailoPS_emergency_contacts_${groupId}`, JSON.stringify(data));
        return data as EmergencyContactRecord[];
      }
    } catch (e) {
      console.warn('Error fetching emergency contacts from Supabase:', e);
    }
  }

  // Load from local storage
  try {
    const cached = localStorage.getItem(`trailoPS_emergency_contacts_${groupId}`);
    if (cached) {
      return JSON.parse(cached);
    }
  } catch (e) {
    // ignore
  }

  return [];
}

export async function addEmergencyContact(
  contact: Omit<EmergencyContactRecord, 'id' | 'created_at'>
): Promise<{ success: boolean; contact?: EmergencyContactRecord; error?: string }> {
  const sb = getSupabase();
  let created: EmergencyContactRecord | null = null;

  if (sb && isSupabaseConfigured()) {
    try {
      const { data, error } = await sb
        .from('squad_emergency_contacts')
        .insert({
          group_id: contact.group_id,
          name: contact.name,
          role: contact.role,
          phone: contact.phone,
          designation: contact.designation || '',
          added_by: contact.added_by,
        })
        .select()
        .single();

      if (error) {
        console.warn('Supabase insert emergency contact error:', error);
      } else if (data) {
        created = data as EmergencyContactRecord;
      }
    } catch (e) {
      console.warn('Supabase emergency contact error:', e);
    }
  }

  if (!created) {
    created = {
      ...contact,
      id: `ec_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
      created_at: new Date().toISOString(),
    };
  }

  // Synchronize local cache
  try {
    const cachedKey = `trailoPS_emergency_contacts_${contact.group_id}`;
    const existing = JSON.parse(localStorage.getItem(cachedKey) || '[]');
    const updated = [...existing.filter((c: any) => c.phone !== created!.phone), created];
    localStorage.setItem(cachedKey, JSON.stringify(updated));
    window.dispatchEvent(new CustomEvent('trailoPS_emergency_contacts_updated', { detail: { groupId: contact.group_id } }));
  } catch (e) {
    // ignore
  }

  return { success: true, contact: created };
}

export async function deleteEmergencyContact(
  contactId: string,
  groupId: string
): Promise<{ success: boolean; error?: string }> {
  const sb = getSupabase();
  if (sb && isSupabaseConfigured()) {
    try {
      await sb
        .from('squad_emergency_contacts')
        .delete()
        .eq('id', contactId);
    } catch (e) {
      console.warn('Error deleting contact from Supabase:', e);
    }
  }

  try {
    const cachedKey = `trailoPS_emergency_contacts_${groupId}`;
    const existing = JSON.parse(localStorage.getItem(cachedKey) || '[]');
    const updated = existing.filter((c: any) => c.id !== contactId);
    localStorage.setItem(cachedKey, JSON.stringify(updated));
    window.dispatchEvent(new CustomEvent('trailoPS_emergency_contacts_updated', { detail: { groupId } }));
  } catch (e) {
    // ignore
  }

  return { success: true };
}

// -------------------------------------------------------------
// Group-Wide SOS Alarm Synchronization
// -------------------------------------------------------------
export interface SquadSOSAlarmData {
  groupId: string;
  distressedUserId: string;
  distressedUserName: string;
  distressedUserRole: string;
  phone?: string;
  coordinates?: { lat: number; lng: number };
  batteryLevel?: number;
  timestamp: string;
}

export function triggerSquadSOSAlarm(data: Omit<SquadSOSAlarmData, 'timestamp'>): void {
  const payload: SquadSOSAlarmData = {
    ...data,
    timestamp: new Date().toISOString(),
  };

  const storageKey = `trailoPS_squad_sos_alarm_${data.groupId}`;
  localStorage.setItem(storageKey, JSON.stringify(payload));

  // Update member status in Supabase if configured
  const sb = getSupabase();
  if (sb && isSupabaseConfigured() && data.distressedUserId) {
    sb.from('squad_members')
      .update({ status: 'distress' })
      .eq('group_id', data.groupId)
      .eq('user_id', data.distressedUserId)
      .then(
        () => {},
        (err: any) => console.warn('Status update error:', err)
      );
  }

  // Dispatch local & window broadcast
  window.dispatchEvent(new CustomEvent('trailoPS_squad_sos_alarm', { detail: payload }));

  // Broadcast to all other open tabs/windows on device immediately
  try {
    if (typeof BroadcastChannel !== 'undefined') {
      const bc = new BroadcastChannel(`trailops_squad_bus_${data.groupId}`);
      bc.postMessage({ type: 'SOS_TRIGGERED', payload });
      bc.close();
    }
  } catch (e) {}

  // Broadcast to all other connected phones/devices via Supabase Realtime
  if (sb && isSupabaseConfigured()) {
    try {
      const channel = sb.channel(`squad_realtime_${data.groupId}`);
      channel.subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          channel.send({
            type: 'broadcast',
            event: 'sos_trigger',
            payload,
          });
        }
      });
    } catch (err) {
      console.warn('Realtime SOS broadcast error:', err);
    }
  }
}

export function clearSquadSOSAlarm(groupId: string): void {
  const storageKey = `trailoPS_squad_sos_alarm_${groupId}`;
  localStorage.removeItem(storageKey);
  window.dispatchEvent(new CustomEvent('trailoPS_squad_sos_alarm_cleared', { detail: { groupId } }));

  try {
    if (typeof BroadcastChannel !== 'undefined') {
      const bc = new BroadcastChannel(`trailops_squad_bus_${groupId}`);
      bc.postMessage({ type: 'SOS_CLEARED', groupId });
      bc.close();
    }
  } catch (e) {}

  const sb = getSupabase();
  if (sb && isSupabaseConfigured()) {
    try {
      const channel = sb.channel(`squad_realtime_${groupId}`);
      channel.subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          channel.send({
            type: 'broadcast',
            event: 'sos_cleared',
            payload: { groupId },
          });
        }
      });
    } catch (err) {
      console.warn('Realtime SOS clear error:', err);
    }
  }
}

export async function updateMemberStatus(groupId: string, userId: string, status: 'active' | 'standby' | 'distress'): Promise<{ success: boolean; error?: string }> {
  const sb = getSupabase();
  if (!sb) return { success: false, error: 'Database connection not configured' };

  const { error } = await sb
    .from('squad_members')
    .update({ status })
    .eq('group_id', groupId)
    .eq('user_id', userId);

  if (error) {
    return { success: false, error: error.message };
  }
  return { success: true };
}

// -------------------------------------------------------------
// Train Journeys & Seat Assignment Helpers
// -------------------------------------------------------------
export async function fetchTrainJourney(groupId: string, direction: 'onward' | 'return'): Promise<TrainJourneyRecord | null> {
  const sb = getSupabase();
  if (!sb || !groupId) return null;

  const { data, error } = await sb
    .from('train_journeys')
    .select('*')
    .eq('group_id', groupId)
    .eq('direction', direction)
    .single();

  if (error || !data) return null;
  return data as TrainJourneyRecord;
}

export async function upsertTrainJourney(journey: Partial<TrainJourneyRecord> & { group_id: string; direction: 'onward' | 'return' }): Promise<{ success: boolean; error?: string; journey?: TrainJourneyRecord }> {
  const sb = getSupabase();
  if (!sb) return { success: false, error: 'Database connection not configured' };

  const { data, error } = await sb
    .from('train_journeys')
    .upsert({
      ...journey,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'group_id,direction' })
    .select()
    .single();

  if (error) {
    return { success: false, error: error.message };
  }
  return { success: true, journey: data as TrainJourneyRecord };
}

export async function fetchSeatAssignments(journeyId: string): Promise<TrainSeatAssignmentRecord[]> {
  const sb = getSupabase();
  if (!sb || !journeyId) return [];

  const { data, error } = await sb
    .from('train_seat_assignments')
    .select('*, profiles (full_name)')
    .eq('journey_id', journeyId);

  if (error || !data) return [];

  return data.filter((d: any) => Boolean(d && d.user_id)).map((d: any) => ({
    id: d.id,
    journey_id: d.journey_id,
    user_id: d.user_id,
    coach: d.coach,
    berth_number: d.berth_number,
    berth_type: d.berth_type,
    notes: d.notes,
    member_name: d.profiles?.full_name || 'Member',
  }));
}

export async function assignSeat(assignment: {
  journey_id: string;
  user_id: string;
  coach: string;
  berth_number: string;
  berth_type: 'LB' | 'MB' | 'UB' | 'SL' | 'SU';
  notes?: string;
}): Promise<{ success: boolean; error?: string }> {
  const sb = getSupabase();
  if (!sb) return { success: false, error: 'Database connection not configured' };

  const { error } = await sb
    .from('train_seat_assignments')
    .upsert({
      ...assignment,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'journey_id,user_id' });

  if (error) {
    return { success: false, error: error.message };
  }
  return { success: true };
}

// -------------------------------------------------------------
// Group Leave & Membership Reset Helper
// -------------------------------------------------------------
export async function leaveSquadGroup(
  groupId: string,
  userId?: string
): Promise<{ success: boolean; error?: string }> {
  const effectiveUserId = userId || localStorage.getItem('trailoPS_currentUserId') || '';
  if (!groupId || !effectiveUserId) {
    return { success: false, error: 'Valid group ID and user ID are required to leave group.' };
  }

  try {
    const headers = await buildApiHeaders(effectiveUserId);
    const res = await fetch(`/api/groups/${encodeURIComponent(groupId)}/leave`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ userId: effectiveUserId }),
    });
    const data = await res.json().catch(() => null);
    if (!res.ok || !data?.success) {
      return {
        success: false,
        error: data?.error || 'Unable to leave squad group.',
      };
    }
  } catch (err: any) {
    console.warn('Server leave group warning:', err);
  }

  // Also remove from Supabase squad_members if configured
  const sb = getSupabase();
  if (sb && isSupabaseConfigured()) {
    try {
      await sb
        .from('squad_members')
        .delete()
        .eq('group_id', groupId)
        .eq('user_id', effectiveUserId);
    } catch {}
  }

  // Clear local cache for this user so they are cleanly disconnected from the group and its notices
  try {
    localStorage.removeItem('trailoPS_active_squad');
    localStorage.removeItem('trailoPS_active_squad_id');
    localStorage.removeItem(`trailoPS_active_squad_id_${effectiveUserId}`);
    localStorage.removeItem(`trailoPS_hasJoinedGroup_${effectiveUserId}`);
    const email = localStorage.getItem('trailoPS_currentUserEmail') || '';
    if (email) {
      localStorage.removeItem(`trailoPS_hasJoinedGroup_${email}`);
    }
    window.dispatchEvent(new CustomEvent('trailoPS_group_left', { detail: { groupId, userId: effectiveUserId } }));
    window.dispatchEvent(new CustomEvent('trailoPS_members_updated'));
  } catch {}

  return { success: true };
}

// -------------------------------------------------------------
// Group-Scoped Notices & Broadcast System
// -------------------------------------------------------------
export interface SquadNoticeRecord {
  id: string;
  group_id: string;
  title: string;
  text: string;
  priority: 'critical' | 'advisory' | 'info';
  author_id: string;
  author_name: string;
  author_role: string;
  image_url?: string;
  created_at: string;
}

export async function fetchGroupNotices(
  groupId: string,
  userId?: string
): Promise<{ authorized: boolean; notices: SquadNoticeRecord[] }> {
  const effectiveUserId = userId || localStorage.getItem('trailoPS_currentUserId') || '';
  if (!groupId || !effectiveUserId) {
    return { authorized: false, notices: [] };
  }

  try {
    const headers = await buildApiHeaders(effectiveUserId);
    const res = await fetch(
      `/api/groups/${encodeURIComponent(groupId)}/notices?userId=${encodeURIComponent(effectiveUserId)}`,
      { headers }
    );
    if (res.status === 403 || res.status === 404) {
      return { authorized: false, notices: [] };
    }
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data?.notices)) {
        return { authorized: true, notices: data.notices as SquadNoticeRecord[] };
      }
    }
  } catch (err) {
    console.warn('Error fetching group notices:', err);
  }

  return { authorized: false, notices: [] };
}

export async function createGroupNotice(params: {
  groupId: string;
  userId?: string;
  title: string;
  text: string;
  priority: 'critical' | 'advisory' | 'info';
  authorName: string;
  authorRole: string;
  imageUrl?: string;
}): Promise<{ success: boolean; notice?: SquadNoticeRecord; error?: string }> {
  const effectiveUserId = params.userId || localStorage.getItem('trailoPS_currentUserId') || '';
  if (!params.groupId || !effectiveUserId) {
    return { success: false, error: 'You must be an active member of this squad group to broadcast a notice.' };
  }

  try {
    const headers = await buildApiHeaders(effectiveUserId);
    const res = await fetch(`/api/groups/${encodeURIComponent(params.groupId)}/notices`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        userId: effectiveUserId,
        title: params.title,
        text: params.text,
        priority: params.priority,
        authorName: params.authorName,
        authorRole: params.authorRole,
        imageUrl: params.imageUrl,
      }),
    });

    const data = await res.json().catch(() => null);
    if (!res.ok || !data?.success) {
      return {
        success: false,
        error: data?.error || 'Failed to broadcast notice to group.',
      };
    }

    const notice = data.notice as SquadNoticeRecord;

    // Dispatch local & cross-tab events scoped strictly to this groupId
    try {
      window.dispatchEvent(
        new CustomEvent('trailoPS_group_notices_updated', {
          detail: { groupId: params.groupId, notice },
        })
      );
      if (typeof BroadcastChannel !== 'undefined') {
        const bc = new BroadcastChannel(`trailops_squad_bus_${params.groupId}`);
        bc.postMessage({ type: 'GROUP_NOTICE_BROADCAST', groupId: params.groupId, notice });
        bc.close();
      }
    } catch {}

    return { success: true, notice };
  } catch (err: any) {
    return {
      success: false,
      error: err.message || 'Network error broadcasting notice.',
    };
  }
}

export async function deleteGroupNotice(
  groupId: string,
  noticeId: string,
  userId?: string
): Promise<{ success: boolean; error?: string }> {
  const effectiveUserId = userId || localStorage.getItem('trailoPS_currentUserId') || '';
  if (!groupId || !noticeId || !effectiveUserId) {
    return { success: false, error: 'Missing required parameters.' };
  }

  try {
    const headers = await buildApiHeaders(effectiveUserId);
    const res = await fetch(
      `/api/groups/${encodeURIComponent(groupId)}/notices/${encodeURIComponent(noticeId)}?userId=${encodeURIComponent(effectiveUserId)}`,
      {
        method: 'DELETE',
        headers,
      }
    );
    const data = await res.json().catch(() => null);
    if (!res.ok || !data?.success) {
      return { success: false, error: data?.error || 'Failed to delete notice.' };
    }
    window.dispatchEvent(
      new CustomEvent('trailoPS_group_notices_updated', { detail: { groupId } })
    );
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message || 'Network error deleting notice.' };
  }
}

// -------------------------------------------------------------
// Media HD Vault & Cross-Device Storage Helpers
// -------------------------------------------------------------
function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = (err) => reject(err);
    reader.readAsDataURL(file);
  });
}

export async function uploadMediaToVault(params: {
  groupId: string;
  uploaderId: string;
  uploaderName: string;
  file: File;
  resolution?: string;
  altitude?: string;
}): Promise<{ success: boolean; error?: string; item?: MediaVaultItemRecord }> {
  if (!params.groupId || !params.uploaderId) {
    return { success: false, error: 'You must be an active squad member to upload media.' };
  }

  // File size limit (50 MB)
  if (params.file.size > 52428800) {
    return { success: false, error: 'File exceeds 50MB maximum upload limit.' };
  }

  const isVideo =
    params.file.type.startsWith('video') ||
    params.file.name.toLowerCase().endsWith('.mov') ||
    params.file.name.toLowerCase().endsWith('.mp4');
  const resolution =
    params.resolution || (isVideo ? '4K 60fps HDR Video' : '48MP ProRAW (8064×6048)');

  try {
    const dataUrl = await fileToDataUrl(params.file);
    const headers = await buildApiHeaders(params.uploaderId);
    const res = await fetch(`/api/groups/${encodeURIComponent(params.groupId)}/media`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        userId: params.uploaderId,
        uploaderName: params.uploaderName,
        fileName: params.file.name,
        mimeType: params.file.type || (isVideo ? 'video/mp4' : 'image/jpeg'),
        fileSize: params.file.size,
        resolution,
        altitude: params.altitude || '2,150m ASL',
        base64Data: dataUrl,
      }),
    });

    const data = await res.json().catch(() => null);
    if (res.ok && data?.success && data?.item) {
      const item: MediaVaultItemRecord = {
        ...data.item,
        signed_url: data.item.url || `/api/groups/${encodeURIComponent(params.groupId)}/media/${encodeURIComponent(data.item.id)}/file`,
      };

      try {
        window.dispatchEvent(
          new CustomEvent('trailoPS_media_vault_updated', {
            detail: { groupId: params.groupId, item },
          })
        );
        if (typeof BroadcastChannel !== 'undefined') {
          const bc = new BroadcastChannel(`trailops_squad_bus_${params.groupId}`);
          bc.postMessage({ type: 'MEDIA_VAULT_UPLOADED', groupId: params.groupId, item });
          bc.close();
        }
      } catch {}

      return { success: true, item };
    }

    return {
      success: false,
      error: data?.error || 'Upload to Squad Media Vault failed.',
    };
  } catch (err: any) {
    return {
      success: false,
      error: err.message || 'Network error while uploading media file.',
    };
  }
}

export async function fetchGroupMediaVault(
  groupId: string,
  userId?: string
): Promise<MediaVaultItemRecord[]> {
  if (!groupId) return [];
  const effectiveUserId = userId || localStorage.getItem('trailoPS_currentUserId') || '';

  try {
    const headers = await buildApiHeaders(effectiveUserId);
    const res = await fetch(
      `/api/groups/${encodeURIComponent(groupId)}/media?userId=${encodeURIComponent(effectiveUserId)}`,
      { headers }
    );
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data?.items)) {
        return data.items.map((item: any) => ({
          ...item,
          signed_url:
            item.url ||
            `/api/groups/${encodeURIComponent(groupId)}/media/${encodeURIComponent(item.id)}/file`,
        })) as MediaVaultItemRecord[];
      }
    }
  } catch (err) {
    console.warn('Error fetching group media vault:', err);
  }

  return [];
}

export async function deleteMediaFromVault(
  groupId: string,
  mediaId: string,
  userId?: string
): Promise<{ success: boolean; error?: string }> {
  const effectiveUserId = userId || localStorage.getItem('trailoPS_currentUserId') || '';
  if (!groupId || !mediaId || !effectiveUserId) {
    return { success: false, error: 'Missing parameters.' };
  }

  try {
    const headers = await buildApiHeaders(effectiveUserId);
    const res = await fetch(
      `/api/groups/${encodeURIComponent(groupId)}/media/${encodeURIComponent(mediaId)}?userId=${encodeURIComponent(effectiveUserId)}`,
      {
        method: 'DELETE',
        headers,
      }
    );
    const data = await res.json().catch(() => null);
    if (!res.ok || !data?.success) {
      return { success: false, error: data?.error || 'Failed to delete media.' };
    }
    window.dispatchEvent(
      new CustomEvent('trailoPS_media_vault_updated', { detail: { groupId } })
    );
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message || 'Network error deleting media.' };
  }
}

export async function downloadMediaVaultFile(params: {
  url: string;
  downloadUrl?: string;
  fileName: string;
}): Promise<{ success: boolean; error?: string }> {
  const targetUrl = params.downloadUrl || (params.url.startsWith('/api/') ? `${params.url}${params.url.includes('?') ? '&' : '?'}download=1` : params.url);
  const safeName = params.fileName || `TRAILOPS_MEDIA_${Date.now()}`;

  try {
    const res = await fetch(targetUrl);
    if (!res.ok) {
      throw new Error(`HTTP ${res.status}`);
    }
    const blob = await res.blob();
    const blobUrl = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = blobUrl;
    a.download = safeName;
    a.style.display = 'none';
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
      document.body.removeChild(a);
      URL.revokeObjectURL(blobUrl);
    }, 600);
    return { success: true };
  } catch {
    try {
      const a = document.createElement('a');
      a.href = targetUrl;
      a.download = safeName;
      a.target = '_blank';
      a.rel = 'noopener noreferrer';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message || 'Download failed.' };
    }
  }
}

