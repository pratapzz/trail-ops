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
  created_by: string;
  created_at?: string;
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
  signed_url?: string;
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
// Authentication Helpers
// -------------------------------------------------------------
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

// -------------------------------------------------------------
// Profile Database Helpers
// -------------------------------------------------------------
export async function fetchProfile(userId: string): Promise<UserProfileRecord | null> {
  const sb = getSupabase();
  if (!sb || !userId) return null;

  const { data, error } = await sb
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single();

  if (error || !data) {
    return null;
  }
  return data as UserProfileRecord;
}

export async function upsertProfile(profile: Partial<UserProfileRecord> & { id: string; email: string }): Promise<{ success: boolean; error?: string }> {
  const sb = getSupabase();
  if (!sb) return { success: false, error: 'Database connection not configured' };

  const payload = {
    ...profile,
    updated_at: new Date().toISOString(),
  };

  const { error } = await sb
    .from('profiles')
    .upsert(payload, { onConflict: 'id' });

  if (error) {
    console.error('Failed to upsert profile:', error);
    return { success: false, error: error.message };
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
// Squad Groups & Membership Helpers
// -------------------------------------------------------------
export function generateSquadCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let result = 'TRK-';
  for (let i = 0; i < 3; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

export async function createSquadGroup(
  arg1:
    | {
        name: string;
        destination: string;
        startDate?: string;
        endDate?: string;
        creatorId: string;
      }
    | string,
  nameArg?: string,
  destArg?: string,
  _budgetArg?: number,
  codeArg?: string
): Promise<{ success: boolean; group?: SquadGroupRecord; error?: string }> {
  const sb = getSupabase();
  if (!sb) return { success: false, error: 'Database connection not configured' };

  let creatorId = '';
  let name = '';
  let destination = '';
  let code = codeArg || generateSquadCode();

  if (typeof arg1 === 'string') {
    creatorId = arg1;
    name = nameArg || 'Expedition Squad';
    destination = destArg || 'Expedition Base';
  } else {
    creatorId = arg1.creatorId;
    name = arg1.name;
    destination = arg1.destination;
    code = generateSquadCode();
  }

  // Create group
  const { data: groupData, error: groupError } = await sb
    .from('squad_groups')
    .insert({
      name,
      code,
      destination,
      created_by: creatorId,
    })
    .select()
    .single();

  if (groupError || !groupData) {
    return { success: false, error: groupError?.message || 'Failed to create squad' };
  }

  // Add creator as super_admin
  const { error: memberError } = await sb
    .from('squad_members')
    .insert({
      group_id: groupData.id,
      user_id: creatorId,
      role: 'super_admin',
      status: 'active',
    });

  if (memberError) {
    return { success: false, error: memberError.message };
  }

  return { success: true, group: groupData as SquadGroupRecord };
}

export async function joinSquadByCode(
  arg1: string,
  arg2: string
): Promise<{ success: boolean; group?: SquadGroupRecord; error?: string }> {
  const sb = getSupabase();
  if (!sb) return { success: false, error: 'Database connection not configured' };

  // Detect whether arg1 is code or userId
  let code = '';
  let userId = '';
  if (arg1.length <= 8 && arg2.length > 8) {
    code = arg1;
    userId = arg2;
  } else if (arg2.length <= 8 && arg1.length > 8) {
    code = arg2;
    userId = arg1;
  } else {
    // Default to code first
    code = arg1;
    userId = arg2;
  }

  const cleanCode = code.trim().toUpperCase();

  // Lookup group by code
  const { data: groupData, error: groupError } = await sb
    .from('squad_groups')
    .select('*')
    .eq('code', cleanCode)
    .single();

  if (groupError || !groupData) {
    return { success: false, error: 'Invalid or expired squad invitation code.' };
  }

  // Check if already a member
  const { data: existingMember } = await sb
    .from('squad_members')
    .select('id, role')
    .eq('group_id', groupData.id)
    .eq('user_id', userId)
    .single();

  if (existingMember) {
    return { success: true, group: groupData as SquadGroupRecord };
  }

  // Join as member (Trigger enforces member role for non-admins)
  const { error: joinError } = await sb
    .from('squad_members')
    .insert({
      group_id: groupData.id,
      user_id: userId,
      role: 'member',
      status: 'active',
    });

  if (joinError) {
    return { success: false, error: joinError.message };
  }

  return { success: true, group: groupData as SquadGroupRecord };
}

export async function fetchUserActiveSquad(userId: string): Promise<{ group: SquadGroupRecord; role: string; status: string } | null> {
  const sb = getSupabase();
  if (!sb || !userId) return null;

  const { data: membership, error } = await sb
    .from('squad_members')
    .select('role, status, group_id, squad_groups (*)')
    .eq('user_id', userId)
    .order('joined_at', { ascending: false })
    .limit(1)
    .single();

  if (error || !membership || !membership.squad_groups) {
    return null;
  }

  let finalRole = membership.role || 'member';

  // Mandatory Super Admin Check: Check all members of this squad
  const { data: squadMembersList } = await sb
    .from('squad_members')
    .select('id, user_id, role')
    .eq('group_id', membership.group_id);

  if (squadMembersList && squadMembersList.length > 0) {
    const hasSuperAdmin = squadMembersList.some((m: any) => m.role === 'super_admin');
    // If there is only 1 member in the squad, OR the squad has no Super Admin, this member MUST be super_admin!
    if (squadMembersList.length === 1 || (!hasSuperAdmin && squadMembersList[0].user_id === userId)) {
      finalRole = 'super_admin';
      if (membership.role !== 'super_admin') {
        // Self-heal the database record immediately
        sb.from('squad_members')
          .update({ role: 'super_admin' })
          .eq('group_id', membership.group_id)
          .eq('user_id', userId)
          .then(() => {}, (err: any) => console.warn('Auto-promote super_admin err:', err));
      }
    }
  } else {
    // If no other members list returned, default sole member to super_admin
    finalRole = 'super_admin';
  }

  return {
    group: membership.squad_groups as any,
    role: finalRole,
    status: membership.status,
  };
}

export async function fetchUserSquad(userId: string): Promise<SquadGroupRecord | null> {
  const res = await fetchUserActiveSquad(userId);
  return res ? res.group : null;
}

export async function fetchSquadMembers(groupId: string): Promise<SquadMemberRecord[]> {
  const sb = getSupabase();
  if (!sb || !groupId) return [];

  const { data: members, error } = await sb
    .from('squad_members')
    .select('id, group_id, user_id, role, status, joined_at, profiles (*)')
    .eq('group_id', groupId)
    .order('joined_at', { ascending: true });

  if (error || !members) {
    return [];
  }

  // Mandatory Super Admin Invariant: If only 1 member exists or zero super admins, the member must be super_admin
  const hasSuperAdmin = members.some((m: any) => m.role === 'super_admin');
  if (members.length === 1 || (!hasSuperAdmin && members.length > 0)) {
    const primary = members[0];
    if (primary && primary.role !== 'super_admin') {
      primary.role = 'super_admin';
      sb.from('squad_members')
        .update({ role: 'super_admin' })
        .eq('id', primary.id)
        .then(() => {}, (err: any) => console.warn('Self-heal super admin err:', err));
    }
  }

  return members.map((m: any) => ({
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
        const currentSuperAdmins = members.filter(m => m.role === 'super_admin');
        const targetMember = members.find(m => m.user_id === targetUserId);

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
      const updated = parsed.map((m: any) => {
        if (m.id === targetUserId || m.name === targetUserId || m.user_id === targetUserId) {
          return { ...m, role: newRole === 'super_admin' ? 'Super Admin' : newRole === 'admin' ? 'Admin' : newRole === 'faculty' ? 'Faculty Lead' : 'Hiker' };
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
      const updated = parsed.map((m: any) => {
        if (m.id === successorUserId || m.name === successorUserId || m.user_id === successorUserId) {
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

  return data.map((d: any) => ({
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
// Media Vault & Private Storage Helpers
// -------------------------------------------------------------
export async function uploadMediaToVault(params: {
  groupId: string;
  uploaderId: string;
  uploaderName: string;
  file: File;
}): Promise<{ success: boolean; error?: string; item?: MediaVaultItemRecord }> {
  const sb = getSupabase();
  if (!sb) return { success: false, error: 'Database connection not configured' };

  // File size limit (50 MB)
  if (params.file.size > 52428800) {
    return { success: false, error: 'File exceeds 50MB maximum upload limit.' };
  }

  const cleanFileName = params.file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
  const storagePath = `${params.groupId}/${Date.now()}_${cleanFileName}`;

  // Upload to private bucket 'trailops-media'
  const { error: uploadError } = await sb.storage
    .from('trailops-media')
    .upload(storagePath, params.file, {
      cacheControl: '3600',
      upsert: false,
    });

  if (uploadError) {
    return { success: false, error: `Storage upload failed: ${uploadError.message}` };
  }

  // Insert metadata into table
  const resolution = params.file.type.startsWith('video') ? '1080p HD Video' : '4K UHD Photo';

  const { data: recordData, error: recordError } = await sb
    .from('media_vault_items')
    .insert({
      group_id: params.groupId,
      uploader_id: params.uploaderId,
      uploader_name: params.uploaderName,
      file_name: params.file.name,
      storage_path: storagePath,
      file_size: params.file.size,
      mime_type: params.file.type,
      resolution,
    })
    .select()
    .single();

  if (recordError || !recordData) {
    return { success: false, error: `Saved to storage, but failed to record metadata: ${recordError?.message}` };
  }

  // Generate signed URL
  const { data: signedData } = await sb.storage
    .from('trailops-media')
    .createSignedUrl(storagePath, 7200);

  return {
    success: true,
    item: {
      ...recordData,
      signed_url: signedData?.signedUrl || '',
    } as MediaVaultItemRecord,
  };
}

export async function fetchGroupMediaVault(groupId: string): Promise<MediaVaultItemRecord[]> {
  const sb = getSupabase();
  if (!sb || !groupId) return [];

  const { data: items, error } = await sb
    .from('media_vault_items')
    .select('*')
    .eq('group_id', groupId)
    .order('created_at', { ascending: false });

  if (error || !items) return [];

  // Generate signed URLs in parallel for authorized viewing
  const itemsWithSignedUrls = await Promise.all(
    items.map(async (item: any) => {
      const { data: signedData } = await sb.storage
        .from('trailops-media')
        .createSignedUrl(item.storage_path, 3600);

      return {
        ...item,
        signed_url: signedData?.signedUrl || '',
      } as MediaVaultItemRecord;
    })
  );

  return itemsWithSignedUrls;
}
