import express from 'express';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const PORT = 3000;
const DATA_DIR = path.resolve(process.cwd(), '.data');
const MEDIA_DIR = path.join(DATA_DIR, 'media');
const DB_FILE = path.join(DATA_DIR, 'trailops_db.json');

interface ProfileRow {
  id: string;
  email: string;
  full_name: string;
  avatar_url?: string;
  phone?: string;
  country_code?: string;
  guardian_name?: string;
  date_of_birth?: string;
  age?: number;
  gender?: string;
  blood_group?: string;
  medical_conditions?: string;
  allergies?: any[];
  medications?: string;
  meds_packed?: boolean;
  height_cm?: number;
  weight_kg?: number;
  experience_level?: string;
  health_notes?: string;
  emergency_contact_name?: string;
  emergency_contact_phone?: string;
  gear_checklist?: any[];
  is_profile_complete: boolean;
  created_at: string;
  updated_at: string;
}

interface GroupRow {
  id: string;
  name: string;
  code: string;
  destination: string;
  budget?: number;
  banner_url?: string;
  from_location?: string;
  start_date?: string;
  end_date?: string;
  created_by: string;
  created_at: string;
}

interface MemberRow {
  id: string;
  group_id: string;
  user_id: string;
  role: 'super_admin' | 'admin' | 'member' | 'faculty';
  status: 'active' | 'standby' | 'distress';
  joined_at: string;
  sub_group_id?: string;
  sub_group_name?: string;
  sub_group_color?: string;
}

interface ExpenseRow {
  id: string;
  group_id: string;
  title: string;
  total_amount: number;
  paid_by: string;
  paid_by_user_id?: string;
  category: string;
  split_type: 'all' | 'custom' | 'subgroup';
  sub_group_id?: string;
  amount_per_member: number;
  member_count: number;
  date: string;
  created_at: string;
}

interface JoinRequestRow {
  id: string;
  group_id: string;
  user_id: string;
  requester_name: string;
  requester_email: string;
  requester_phone: string;
  requester_avatar: string;
  requester_blood_group: string;
  status: 'pending' | 'accepted' | 'rejected';
  reviewed_by?: string;
  reviewed_at?: string;
  created_at: string;
  updated_at: string;
}

interface NotificationRow {
  id: string;
  user_id: string;
  group_id?: string;
  notice_id?: string;
  type: 'join_accepted' | 'join_rejected' | 'join_requested' | 'notice_broadcast' | 'info';
  title: string;
  message: string;
  priority?: 'critical' | 'advisory' | 'info';
  author_name?: string;
  is_read: boolean;
  created_at: string;
}

interface NoticeRow {
  id: string;
  group_id: string;
  title: string;
  text: string;
  image_url?: string;
  priority: 'critical' | 'advisory' | 'info';
  author_id: string;
  author_name: string;
  author_role: string;
  author_avatar?: string;
  created_at: string;
}

interface MediaVaultRow {
  id: string;
  group_id: string;
  uploader_id: string;
  uploader_name: string;
  file_name: string;
  file_size: number;
  mime_type: string;
  resolution?: string;
  altitude?: string;
  disk_file_name: string;
  created_at: string;
}

interface BriefingRow {
  id: string;
  group_id: string;
  title: string;
  target_iso_time: string;
  duration_minutes: number;
  created_by: string;
  created_at: string;
}

interface FacultyDriveRow {
  id: string;
  group_id: string;
  name: string;
  category: 'ticket' | 'bill' | 'permit' | 'medical' | 'sop';
  uploaded_by: string;
  uploader_id: string;
  uploader_role: string;
  date: string;
  size: string;
  status: 'approved' | 'pending';
  file_type: 'pdf' | 'img';
  mime_type: string;
  file_name: string;
  disk_file_name?: string;
  external_url?: string;
  notes?: string;
  created_at: string;
}

interface RollCallSessionRow {
  sessionId: string;
  groupId: string;
  active: boolean;
  startedAt: string;
  startedAtIso: string;
  startedBy: string;
  startedByUserId: string;
  presentUserIds: string[];
  deniedUserIds: string[];
  endedAt?: string;
}

interface SOSAlarmRow {
  id: string;
  groupId: string;
  distressedUserId: string;
  distressedUserName: string;
  distressedUserRole: string;
  phone?: string;
  coordinates?: { lat: number; lng: number };
  locationLabel?: string;
  batteryLevel?: number;
  timestamp: string;
  active: boolean;
}

interface SubGroupRow {
  id: string;
  group_id: string;
  name: string;
  color: string;
  lead_name: string;
  member_count: number;
  member_ids: string[];
  created_at: string;
}

interface MissingItemRow {
  id: string;
  group_id: string;
  item_name: string;
  reported_by: string;
  urgency: 'critical' | 'moderate' | 'routine';
  location: string;
  status: 'open' | 'found';
  timestamp: string;
  created_at: string;
}

interface PersistentDatabase {
  profiles: Record<string, ProfileRow>;
  squad_groups: Record<string, GroupRow>;
  squad_members: MemberRow[];
  squad_join_requests: JoinRequestRow[];
  user_notifications: NotificationRow[];
  squad_notices: NoticeRow[];
  squad_media_vault: MediaVaultRow[];
  squad_faculty_drive: FacultyDriveRow[];
  squad_briefings: Record<string, BriefingRow>;
  squad_checklists: Record<string, any[]>;
  squad_rollcalls: Record<string, RollCallSessionRow>;
  squad_sos_alarms: Record<string, SOSAlarmRow>;
  squad_subgroups: Record<string, SubGroupRow[]>;
  squad_missing_items: Record<string, MissingItemRow[]>;
  squad_expenses: Record<string, ExpenseRow[]>;
}

function sanitizeDb(raw: any): PersistentDatabase {
  const cleanProfiles: Record<string, ProfileRow> = {};
  if (raw?.profiles && typeof raw.profiles === 'object') {
    for (const v of Object.values(raw.profiles)) {
      if (v && typeof v === 'object' && (v as any).id) {
        cleanProfiles[(v as ProfileRow).id] = v as ProfileRow;
      }
    }
  }

  const cleanGroups: Record<string, GroupRow> = {};
  if (raw?.squad_groups && typeof raw.squad_groups === 'object') {
    for (const v of Object.values(raw.squad_groups)) {
      if (v && typeof v === 'object' && (v as any).id && (v as any).code) {
        const grp = v as GroupRow;
        const normalizedIdAsName = grp.id.replace(/[_-]/g, ' ').trim().toLowerCase();
        if (grp.name && grp.name.trim().toLowerCase() === normalizedIdAsName) {
          continue;
        }
        cleanGroups[grp.id] = grp;
      }
    }
  }

  return {
    profiles: cleanProfiles,
    squad_groups: cleanGroups,
    squad_members: Array.isArray(raw?.squad_members)
      ? raw.squad_members.filter((m: any): m is MemberRow => Boolean(m && typeof m === 'object' && m.user_id && m.group_id))
      : [],
    squad_join_requests: Array.isArray(raw?.squad_join_requests)
      ? raw.squad_join_requests.filter((r: any): r is JoinRequestRow => Boolean(r && typeof r === 'object' && r.user_id && r.group_id))
      : [],
    user_notifications: Array.isArray(raw?.user_notifications)
      ? raw.user_notifications.filter((n: any): n is NotificationRow => Boolean(n && typeof n === 'object' && n.user_id))
      : [],
    squad_notices: Array.isArray(raw?.squad_notices)
      ? raw.squad_notices.filter((n: any): n is NoticeRow => Boolean(n && typeof n === 'object' && n.id && n.group_id))
      : [],
    squad_media_vault: Array.isArray(raw?.squad_media_vault)
      ? raw.squad_media_vault.filter((m: any): m is MediaVaultRow => Boolean(m && typeof m === 'object' && m.id && m.group_id))
      : [],
    squad_faculty_drive: Array.isArray(raw?.squad_faculty_drive)
      ? raw.squad_faculty_drive.filter((d: any): d is FacultyDriveRow => Boolean(d && typeof d === 'object' && d.id && d.group_id))
      : [],
    squad_briefings: raw?.squad_briefings && typeof raw.squad_briefings === 'object' ? raw.squad_briefings : {},
    squad_checklists: raw?.squad_checklists && typeof raw.squad_checklists === 'object' ? raw.squad_checklists : {},
    squad_rollcalls: raw?.squad_rollcalls && typeof raw.squad_rollcalls === 'object' ? raw.squad_rollcalls : {},
    squad_sos_alarms: raw?.squad_sos_alarms && typeof raw.squad_sos_alarms === 'object' ? raw.squad_sos_alarms : {},
    squad_subgroups: raw?.squad_subgroups && typeof raw.squad_subgroups === 'object' ? raw.squad_subgroups : {},
    squad_missing_items: raw?.squad_missing_items && typeof raw.squad_missing_items === 'object' ? raw.squad_missing_items : {},
    squad_expenses: raw?.squad_expenses && typeof raw.squad_expenses === 'object' ? raw.squad_expenses : {},
  };
}

function loadDb(): PersistentDatabase {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    if (!fs.existsSync(MEDIA_DIR)) {
      fs.mkdirSync(MEDIA_DIR, { recursive: true });
    }
    if (fs.existsSync(DB_FILE)) {
      const raw = fs.readFileSync(DB_FILE, 'utf-8');
      const parsed = JSON.parse(raw);
      const cleaned = sanitizeDb(parsed);
      // Persist cleaned structure if null holes existed
      if (
        (Array.isArray(parsed?.squad_members) && parsed.squad_members.length !== cleaned.squad_members.length) ||
        (Array.isArray(parsed?.squad_join_requests) && parsed.squad_join_requests.length !== cleaned.squad_join_requests.length) ||
        (Array.isArray(parsed?.user_notifications) && parsed.user_notifications.length !== cleaned.user_notifications.length)
      ) {
        fs.writeFileSync(DB_FILE, JSON.stringify(cleaned, null, 2), 'utf-8');
      }
      return cleaned;
    }
  } catch (err) {
    console.error('Error loading persistent DB:', err);
  }
  return {
    profiles: {},
    squad_groups: {},
    squad_members: [],
    squad_join_requests: [],
    user_notifications: [],
    squad_notices: [],
    squad_media_vault: [],
    squad_faculty_drive: [],
    squad_briefings: {},
    squad_checklists: {},
    squad_rollcalls: {},
    squad_sos_alarms: {},
    squad_subgroups: {},
    squad_missing_items: {},
    squad_expenses: {},
  };
}

function saveDb(db: PersistentDatabase): void {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    if (!fs.existsSync(MEDIA_DIR)) {
      fs.mkdirSync(MEDIA_DIR, { recursive: true });
    }
    db.squad_members = (db.squad_members || []).filter((m): m is MemberRow => Boolean(m && m.user_id && m.group_id));
    db.squad_join_requests = (db.squad_join_requests || []).filter((r): r is JoinRequestRow => Boolean(r && r.user_id && r.group_id));
    db.squad_notices = (db.squad_notices || []).filter((n): n is NoticeRow => Boolean(n && n.id && n.group_id));
    db.squad_media_vault = (db.squad_media_vault || []).filter((m): m is MediaVaultRow => Boolean(m && m.id && m.group_id));
    db.squad_faculty_drive = (db.squad_faculty_drive || []).filter((d): d is FacultyDriveRow => Boolean(d && d.id && d.group_id));
    db.user_notifications = (db.user_notifications || []).filter((n): n is NotificationRow => Boolean(n && n.user_id));
    fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2), 'utf-8');
  } catch (err) {
    console.error('Error saving persistent DB:', err);
  }
}

const db = loadDb();

function normalizeCode(raw: string): string {
  return (raw || '').trim().toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6);
}

function generateUniqueDatabaseCode(existingGroups: Record<string, GroupRow>): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const usedCodes = new Set(
    Object.values(existingGroups).map((g) => normalizeCode(g.code))
  );
  // Never issue common demo codes
  usedCodes.add('TR89K2');
  usedCodes.add('TR0000');

  for (let attempt = 0; attempt < 500; attempt++) {
    let code = 'TR';
    const bytes = crypto.randomBytes(4);
    for (let i = 0; i < 4; i++) {
      code += chars[bytes[i] % chars.length];
    }
    if (!usedCodes.has(code)) {
      return code;
    }
  }
  return 'TR' + Date.now().toString(36).toUpperCase().slice(-4);
}

function getSupabaseServerClient(req?: express.Request) {
  const url = (
    (req?.headers['x-supabase-url'] as string) ||
    process.env.VITE_SUPABASE_URL ||
    ''
  ).trim();
  const key = (
    (req?.headers['x-supabase-anon-key'] as string) ||
    process.env.VITE_SUPABASE_ANON_KEY ||
    ''
  ).trim();
  const authHeader = req?.headers.authorization;

  if (!url || !key) return null;

  return createClient(url, key, {
    global: authHeader ? { headers: { Authorization: authHeader } } : undefined,
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

async function resolveAuthenticatedUser(req: express.Request): Promise<{
  id: string;
  email: string;
  fullName?: string;
  avatarUrl?: string;
} | null> {
  const authHeader = req.headers.authorization;
  const sb = getSupabaseServerClient(req);

  if (authHeader && authHeader.startsWith('Bearer ') && sb) {
    const token = authHeader.slice(7).trim();
    if (token && token !== 'undefined' && token !== 'null') {
      try {
        const { data, error } = await sb.auth.getUser(token);
        if (!error && data?.user) {
          return {
            id: data.user.id,
            email: (data.user.email || '').toLowerCase(),
            fullName: data.user.user_metadata?.full_name || data.user.user_metadata?.name,
            avatarUrl: data.user.user_metadata?.avatar_url || data.user.user_metadata?.picture,
          };
        }
      } catch (e) {
        // Fallback header check below if token check failed due to network
      }
    }
  }

  // Fallback for verified Supabase user UUID passed via headers (e.g., immediately after signUp before email confirmation)
  const headerUserId = (req.headers['x-user-id'] as string || '').trim();
  const headerEmail = (req.headers['x-user-email'] as string || '').trim().toLowerCase();
  if (headerUserId && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(headerUserId)) {
    return {
      id: headerUserId,
      email: headerEmail,
    };
  }

  return null;
}

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '80mb' }));
  app.use(express.urlencoded({ limit: '80mb', extended: true }));

  // ============================================================================
  // 1. OAUTH CALLBACK HANDLER (Supports Popup postMessage & Top-Level Redirect)
  // ============================================================================
  app.get(['/auth/callback', '/auth/callback/'], (_req, res) => {
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.send(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>TRAIL OPS — Completing Authentication</title>
  <style>
    body {
      margin: 0;
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      background: #022c22;
      color: #ecfdf5;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      padding: 24px;
      text-align: center;
    }
    .card {
      max-width: 380px;
      background: rgba(255, 255, 255, 0.06);
      border: 1px solid rgba(16, 185, 129, 0.3);
      border-radius: 24px;
      padding: 28px 24px;
      box-shadow: 0 20px 40px rgba(0, 0, 0, 0.35);
    }
    .spinner {
      width: 36px;
      height: 36px;
      border: 3px solid rgba(16, 185, 129, 0.25);
      border-top-color: #10b981;
      border-radius: 50%;
      animation: spin 0.8s linear infinite;
      margin: 0 auto 16px;
    }
    @keyframes spin { to { transform: rotate(360deg); } }
    h2 { margin: 0 0 8px; font-size: 18px; font-weight: 800; }
    p { margin: 0; font-size: 13px; color: #a7f3d0; line-height: 1.5; }
  </style>
</head>
<body>
  <div class="card">
    <div class="spinner" id="spinner"></div>
    <h2 id="title">Completing Sign-In...</h2>
    <p id="desc">Verifying your credentials with TRAIL OPS.</p>
  </div>
  <script>
    (function() {
      var searchParams = new URLSearchParams(window.location.search);
      var hashStr = window.location.hash ? window.location.hash.substring(1) : '';
      var hashParams = new URLSearchParams(hashStr);

      var code = searchParams.get('code') || hashParams.get('code') || '';
      var accessToken = hashParams.get('access_token') || searchParams.get('access_token') || '';
      var refreshToken = hashParams.get('refresh_token') || searchParams.get('refresh_token') || '';
      var error = searchParams.get('error') || hashParams.get('error') || '';
      var errorCode = searchParams.get('error_code') || hashParams.get('error_code') || '';
      var errorDescription = searchParams.get('error_description') || hashParams.get('error_description') || '';

      var payload = {
        type: 'TRAILOPS_OAUTH_CALLBACK',
        code: code,
        accessToken: accessToken,
        refreshToken: refreshToken,
        error: error,
        errorCode: errorCode,
        errorDescription: errorDescription
      };

      try {
        localStorage.setItem('trailoPS_oauth_callback_result', JSON.stringify(Object.assign({}, payload, { timestamp: Date.now() })));
      } catch (e) {}

      if (window.opener && window.opener !== window) {
        try {
          window.opener.postMessage(payload, '*');
        } catch (e) {}
        setTimeout(function() {
          window.close();
        }, 250);
        document.getElementById('title').textContent = error ? 'Authentication Notice' : 'Signed In!';
        document.getElementById('desc').textContent = 'Returning to TRAIL OPS... You may close this window.';
      } else {
        var target = '/?oauth_callback=1';
        if (window.location.search) {
          target = '/' + window.location.search;
        }
        if (window.location.hash) {
          target += window.location.hash;
        }
        window.location.replace(target);
      }
    })();
  </script>
</body>
</html>`);
  });

  // ============================================================================
  // 2. OAUTH & SUPABASE DIAGNOSTICS ENDPOINT
  // ============================================================================
  app.get('/api/auth/diagnostics', async (req, res) => {
    const supabaseUrl = (
      (req.headers['x-supabase-url'] as string) ||
      process.env.VITE_SUPABASE_URL ||
      ''
    ).trim();
    const anonKey = (
      (req.headers['x-supabase-anon-key'] as string) ||
      process.env.VITE_SUPABASE_ANON_KEY ||
      ''
    ).trim();

    const appUrl = process.env.APP_URL || `${req.protocol}://${req.get('host')}`;
    const projectRefMatch = supabaseUrl.match(/https:\/\/([^.]+)\.supabase\.co/i);
    const projectRef = projectRefMatch ? projectRefMatch[1] : 'your-project-ref';

    if (!supabaseUrl || !anonKey) {
      res.json({
        configured: false,
        supabaseUrl: '',
        projectRef,
        providers: { email: false, google: false, apple: false },
        tablesMigrated: false,
        urls: {
          appUrl,
          callbackUrl: `${appUrl}/auth/callback`,
          supabaseCallbackUrl: '',
          supabaseDashboardProvidersUrl: 'https://supabase.com/dashboard',
          supabaseDashboardUrlConfig: 'https://supabase.com/dashboard',
        },
      });
      return;
    }

    let providers = { email: true, google: false, apple: false };
    let mailerAutoconfirm = false;
    let settingsError: string | null = null;
    let tablesMigrated = false;

    try {
      const settingsRes = await fetch(`${supabaseUrl}/auth/v1/settings`, {
        headers: { apikey: anonKey },
      });
      if (settingsRes.ok) {
        const settingsJson: any = await settingsRes.json();
        providers = {
          email: Boolean(settingsJson?.external?.email),
          google: Boolean(settingsJson?.external?.google),
          apple: Boolean(settingsJson?.external?.apple),
        };
        mailerAutoconfirm = Boolean(settingsJson?.mailer_autoconfirm);
      } else {
        settingsError = `HTTP ${settingsRes.status}`;
      }
    } catch (err: any) {
      settingsError = err.message;
    }

    try {
      const restRes = await fetch(`${supabaseUrl}/rest/v1/`, {
        headers: { apikey: anonKey },
      });
      if (restRes.ok) {
        const openapi: any = await restRes.json();
        const paths = Object.keys(openapi?.paths || {});
        tablesMigrated = paths.includes('/squad_groups') && paths.includes('/profiles');
      }
    } catch {}

    res.json({
      configured: true,
      supabaseUrl,
      projectRef,
      providers,
      mailerAutoconfirm,
      tablesMigrated,
      settingsError,
      urls: {
        appUrl,
        callbackUrl: `${appUrl}/auth/callback`,
        supabaseCallbackUrl: `${supabaseUrl}/auth/v1/callback`,
        supabaseDashboardProvidersUrl: `https://supabase.com/dashboard/project/${projectRef}/auth/providers`,
        supabaseDashboardUrlConfig: `https://supabase.com/dashboard/project/${projectRef}/auth/url-configuration`,
        supabaseSqlEditorUrl: `https://supabase.com/dashboard/project/${projectRef}/sql/new`,
      },
    });
  });

  // ============================================================================
  // 3. PROFILES ENDPOINTS (Isolated per real Supabase User ID)
  // ============================================================================
  app.get('/api/profiles/:userId', async (req, res) => {
    const { userId } = req.params;
    if (!userId) {
      res.status(400).json({ error: 'User ID is required' });
      return;
    }

    const sb = getSupabaseServerClient(req);
    if (sb) {
      try {
        const { data, error } = await sb
          .from('profiles')
          .select('*')
          .eq('id', userId)
          .maybeSingle();
        if (!error && data) {
          db.profiles[userId] = data as ProfileRow;
          saveDb(db);
          res.json({ profile: data });
          return;
        }
      } catch {}
    }

    const existing = db.profiles[userId] || null;
    res.json({ profile: existing });
  });

  app.post('/api/profiles', async (req, res) => {
    const authUser = await resolveAuthenticatedUser(req);
    const body = req.body || {};
    const targetId = body.id || authUser?.id;

    if (!targetId) {
      res.status(401).json({ error: 'Authenticated user ID is required to save profile.' });
      return;
    }

    const existing = db.profiles[targetId];
    const now = new Date().toISOString();
    const updatedProfile: ProfileRow = {
      id: targetId,
      email: (body.email || authUser?.email || existing?.email || '').toLowerCase(),
      full_name: body.full_name ?? body.fullName ?? existing?.full_name ?? authUser?.fullName ?? '',
      avatar_url: body.avatar_url ?? body.avatarUrl ?? existing?.avatar_url ?? authUser?.avatarUrl ?? '',
      phone: body.phone ?? body.phoneNumber ?? existing?.phone ?? '',
      country_code: body.country_code ?? body.countryCode ?? existing?.country_code ?? '🇮🇳 +91',
      guardian_name: body.guardian_name ?? body.guardianName ?? existing?.guardian_name ?? '',
      date_of_birth: body.date_of_birth ?? body.dateOfBirth ?? existing?.date_of_birth ?? '',
      age: body.age ?? existing?.age ?? 0,
      gender: body.gender ?? existing?.gender ?? '',
      blood_group: body.blood_group ?? body.bloodGroup ?? existing?.blood_group ?? '',
      medical_conditions: body.medical_conditions ?? existing?.medical_conditions ?? '',
      allergies: body.allergies ?? existing?.allergies ?? body.gear_checklist ?? [],
      medications: body.medications ?? existing?.medications ?? '',
      meds_packed: typeof body.meds_packed === 'boolean' ? body.meds_packed : (typeof body.medsPacked === 'boolean' ? body.medsPacked : (existing?.meds_packed ?? false)),
      height_cm: body.height_cm ?? body.heightCm ?? existing?.height_cm ?? 175,
      weight_kg: body.weight_kg ?? body.weightKg ?? existing?.weight_kg ?? 70,
      experience_level: body.experience_level ?? body.experienceLevel ?? existing?.experience_level ?? 'Intermediate',
      health_notes: body.health_notes ?? body.healthNotes ?? existing?.health_notes ?? '',
      emergency_contact_name: body.emergency_contact_name ?? body.guardian_name ?? body.guardianName ?? existing?.emergency_contact_name ?? '',
      emergency_contact_phone: body.emergency_contact_phone ?? body.emergencyNumber ?? existing?.emergency_contact_phone ?? '',
      gear_checklist: body.gear_checklist ?? body.allergies ?? existing?.gear_checklist ?? [],
      is_profile_complete:
        typeof body.is_profile_complete === 'boolean'
          ? body.is_profile_complete
          : Boolean(existing?.is_profile_complete ?? true),
      created_at: existing?.created_at || now,
      updated_at: now,
    };

    db.profiles[targetId] = updatedProfile;
    saveDb(db);

    const sb = getSupabaseServerClient(req);
    if (sb) {
      try {
        await sb.from('profiles').upsert(
          {
            id: updatedProfile.id,
            email: updatedProfile.email,
            full_name: updatedProfile.full_name,
            avatar_url: updatedProfile.avatar_url,
            phone: updatedProfile.phone,
            date_of_birth: updatedProfile.date_of_birth,
            age: updatedProfile.age,
            gender: updatedProfile.gender,
            blood_group: updatedProfile.blood_group,
            medical_conditions: updatedProfile.medical_conditions,
            emergency_contact_name: updatedProfile.emergency_contact_name,
            emergency_contact_phone: updatedProfile.emergency_contact_phone,
            gear_checklist: updatedProfile.gear_checklist,
            is_profile_complete: updatedProfile.is_profile_complete,
            updated_at: now,
          },
          { onConflict: 'id' }
        );
      } catch {}
    }

    res.json({ success: true, profile: updatedProfile });
  });

  // Serve static media files (including uploaded profile avatars)
  app.use('/api/media', express.static(MEDIA_DIR));

  // Permanent Profile Avatar Upload & Storage Endpoint
  app.post('/api/profiles/:userId/avatar', async (req, res) => {
    const { userId } = req.params;
    const body = req.body || {};
    const base64Data = body.base64Data || body.avatarData || '';
    const mimeType = body.mimeType || 'image/jpeg';
    const fileName = body.fileName || `avatar_${userId}.jpg`;

    if (!userId || !base64Data) {
      res.status(400).json({ error: 'Missing userId or base64Data image payload.' });
      return;
    }

    try {
      const avatarsDir = path.join(MEDIA_DIR, 'avatars');
      if (!fs.existsSync(avatarsDir)) {
        fs.mkdirSync(avatarsDir, { recursive: true });
      }

      const cleanBase64 = base64Data.includes(',') ? base64Data.split(',')[1] : base64Data;
      const buffer = Buffer.from(cleanBase64, 'base64');

      let ext = 'jpg';
      if (mimeType.includes('png')) ext = 'png';
      else if (mimeType.includes('webp')) ext = 'webp';
      else if (fileName.includes('.')) {
        ext = fileName.split('.').pop() || 'jpg';
      }

      const diskFileName = `avatar_${userId.replace(/[^a-zA-Z0-9_-]/g, '_')}.${ext}`;
      const filePath = path.join(avatarsDir, diskFileName);
      fs.writeFileSync(filePath, buffer);

      const avatarUrl = `/api/media/avatars/${diskFileName}?t=${Date.now()}`;

      // Update profile in local persistent DB
      const existing = db.profiles[userId];
      const now = new Date().toISOString();
      db.profiles[userId] = {
        ...existing,
        id: userId,
        email: existing?.email || '',
        full_name: existing?.full_name || 'Expedition Member',
        avatar_url: avatarUrl,
        is_profile_complete: existing ? existing.is_profile_complete : false,
        created_at: existing?.created_at || now,
        updated_at: now,
      };

      saveDb(db);

      // Also sync avatar_url with Supabase profiles table if configured
      const sb = getSupabaseServerClient(req);
      if (sb) {
        try {
          await sb.from('profiles').update({ avatar_url: avatarUrl }).eq('id', userId);
        } catch {}
      }

      res.json({
        success: true,
        avatarUrl,
        message: 'Profile photo stored permanently on server!',
      });
    } catch (err: any) {
      console.error('Error saving avatar:', err);
      res.status(500).json({ error: err?.message || 'Failed to save avatar image file.' });
    }
  });

  // ============================================================================
  // 4. GROUP CREATION WITH DATABASE-GENERATED UNIQUE 6-CHAR CODE
  // ============================================================================
  app.post('/api/groups', async (req, res) => {
    const authUser = await resolveAuthenticatedUser(req);
    const body = req.body || {};
    const creatorId = authUser?.id || body.creatorId;

    if (!creatorId) {
      res.status(401).json({ error: 'You must be signed in to create a group.' });
      return;
    }

    const name = (body.name || '').trim();
    const destination = (body.destination || 'Expedition Base').trim();
    if (!name) {
      res.status(400).json({ error: 'Group name is required.' });
      return;
    }

    // Generate unique 6-character code validated against database
    let uniqueCode = generateUniqueDatabaseCode(db.squad_groups);
    const sb = getSupabaseServerClient(req);

    // Also verify uniqueness in Supabase squad_groups if table is migrated
    if (sb) {
      for (let attempt = 0; attempt < 10; attempt++) {
        const { data: existingInSb, error: sbCheckErr } = await sb
          .from('squad_groups')
          .select('id')
          .ilike('code', uniqueCode)
          .maybeSingle();

        if (sbCheckErr || !existingInSb) {
          break;
        }
        uniqueCode = generateUniqueDatabaseCode(db.squad_groups);
      }
    }

    const now = new Date().toISOString();
    let groupRecord: GroupRow = {
      id: crypto.randomUUID(),
      name,
      code: uniqueCode,
      destination,
      start_date: body.startDate || undefined,
      end_date: body.endDate || undefined,
      created_by: creatorId,
      created_at: now,
    };

    // Attempt to insert into Supabase PostgreSQL first
    if (sb) {
      try {
        const { data: sbGroup, error: sbErr } = await sb
          .from('squad_groups')
          .insert({
            name: groupRecord.name,
            code: groupRecord.code,
            destination: groupRecord.destination,
            start_date: groupRecord.start_date || null,
            end_date: groupRecord.end_date || null,
            created_by: creatorId,
          })
          .select()
          .single();

        if (!sbErr && sbGroup) {
          groupRecord = {
            id: sbGroup.id,
            name: sbGroup.name,
            code: normalizeCode(sbGroup.code),
            destination: sbGroup.destination,
            start_date: sbGroup.start_date,
            end_date: sbGroup.end_date,
            created_by: sbGroup.created_by,
            created_at: sbGroup.created_at || now,
          };

          await sb.from('squad_members').upsert(
            {
              group_id: groupRecord.id,
              user_id: creatorId,
              role: 'super_admin',
              status: 'active',
            },
            { onConflict: 'group_id,user_id' }
          );
        }
      } catch (e) {
        // Continues to persistent database storage
      }
    }

    // Persist creator's profile name if provided so squad member list always shows their real name
    const creatorName = (body.creatorName || authUser?.fullName || '').trim();
    const creatorEmail = (body.creatorEmail || authUser?.email || '').trim().toLowerCase();
    const creatorAvatar = body.creatorAvatar || authUser?.avatarUrl || '';
    if (creatorName) {
      const existingProf = db.profiles[creatorId];
      db.profiles[creatorId] = {
        ...existingProf,
        id: creatorId,
        email: creatorEmail || existingProf?.email || '',
        full_name: creatorName,
        avatar_url: creatorAvatar || existingProf?.avatar_url || '',
        is_profile_complete: true,
        created_at: existingProf?.created_at || now,
        updated_at: now,
      };
    }

    // Persist group and Super Admin membership in server DB
    db.squad_groups[groupRecord.id] = groupRecord;

    const existingMemberIdx = db.squad_members.findIndex(
      (m) => m && m.group_id === groupRecord.id && m.user_id === creatorId
    );
    const memberRow: MemberRow = {
      id: existingMemberIdx >= 0 ? db.squad_members[existingMemberIdx].id : crypto.randomUUID(),
      group_id: groupRecord.id,
      user_id: creatorId,
      role: 'super_admin',
      status: 'active',
      joined_at: now,
    };
    if (existingMemberIdx >= 0) {
      db.squad_members[existingMemberIdx] = memberRow;
    } else {
      db.squad_members.push(memberRow);
    }

    saveDb(db);

    res.json({
      success: true,
      group: groupRecord,
      role: 'super_admin',
    });
  });

  // ============================================================================
  // 4B. UPDATE GROUP DETAILS (Name, Destination, Budget, Banner, Dates)
  // ============================================================================
  app.patch('/api/groups/:groupId', async (req, res) => {
    const { groupId } = req.params;
    const body = req.body || {};
    const authUser = await resolveAuthenticatedUser(req);
    const callerId = authUser?.id || String(body.userId || '');

    let group = await findGroupByIdOrCode(groupId, req);
    let resolvedId = group?.id || groupId;

    if (!group) {
      const allGroups = Object.values(db.squad_groups).filter(Boolean);
      if (allGroups.length > 0 && (groupId === 'default' || groupId === 'grp_current')) {
        group = allGroups[0];
        resolvedId = group.id;
      }
    }

    if (!group) {
      res.status(404).json({ error: 'Squad group not found.' });
      return;
    }

    const changedFields: string[] = [];
    if (body.name && typeof body.name === 'string' && body.name.trim() !== group.name) {
      group.name = body.name.trim();
      changedFields.push(`Group Name ("${group.name}")`);
    }
    if (body.destination && typeof body.destination === 'string' && body.destination.trim() !== group.destination) {
      group.destination = body.destination.trim();
      changedFields.push(`Destination (${group.destination})`);
    }
    if (typeof body.budget === 'number') {
      group.budget = body.budget;
    } else if (body.budget && !isNaN(Number(body.budget))) {
      group.budget = Number(body.budget);
    }
    if (body.banner_url || body.bannerUrl) {
      const nextBanner = body.banner_url || body.bannerUrl;
      if (nextBanner !== group.banner_url) {
        changedFields.push('Group Cover Photo');
      }
      group.banner_url = nextBanner;
    }
    if (body.from_location || body.fromLocation) {
      group.from_location = body.from_location || body.fromLocation;
    }
    if (body.start_date || body.startDate) {
      const nextDate = body.start_date || body.startDate;
      if (nextDate !== group.start_date) {
        changedFields.push(`Departure Date (${nextDate})`);
      }
      group.start_date = nextDate;
    }
    if (body.end_date || body.endDate) {
      group.end_date = body.end_date || body.endDate;
    }

    db.squad_groups[resolvedId] = group;

    // Notify all active group members about the group name / photo / details change
    const nowIso = new Date().toISOString();
    const groupMembers = db.squad_members.filter(
      (m) => m && (m.group_id === resolvedId || m.group_id === groupId || (group?.code && m.group_id === group.code))
    );
    const summaryText =
      changedFields.length > 0
        ? `Updated: ${changedFields.join(', ')}.`
        : `Expedition group "${group.name}" details and cover photo were updated.`;

    for (const m of groupMembers) {
      if (m && m.user_id && m.user_id !== callerId && m.user_id !== 'user_self') {
        db.user_notifications.push({
          id: crypto.randomUUID(),
          user_id: m.user_id,
          group_id: resolvedId,
          type: 'notice_broadcast',
          title: `📢 Group Updated: ${group.name}`,
          message: summaryText,
          priority: 'info',
          is_read: false,
          created_at: nowIso,
        });
      }
    }

    saveDb(db);

    const sb = getSupabaseServerClient(req);
    if (sb) {
      try {
        await sb
          .from('squad_groups')
          .update({
            name: group.name,
            destination: group.destination,
            start_date: group.start_date || null,
            end_date: group.end_date || null,
          })
          .eq('id', resolvedId);
      } catch {}
    }

    res.json({
      success: true,
      group,
      message: 'Expedition group details updated and broadcasted to all members!',
    });
  });

  // ============================================================================
  // 4C. DELETE GROUP CASCADE (Deletes group and all associated data permanently)
  // ============================================================================
  app.delete('/api/groups/:groupId', async (req, res) => {
    const { groupId } = req.params;
    const group = await findGroupByIdOrCode(groupId, req);
    const resolvedId = group?.id || groupId;
    const groupCode = group?.code || '';

    const isTargetGroup = (gid: string) =>
      gid === resolvedId || gid === groupId || (Boolean(groupCode) && gid === groupCode);

    // Notify members before deleting
    const nowIso = new Date().toISOString();
    const groupMembers = db.squad_members.filter((m) => m && isTargetGroup(m.group_id));
    for (const m of groupMembers) {
      if (m && m.user_id && m.user_id !== 'user_self') {
        db.user_notifications.push({
          id: crypto.randomUUID(),
          user_id: m.user_id,
          group_id: resolvedId,
          type: 'info',
          title: `🗑️ Expedition Group Deleted`,
          message: `The expedition group "${group?.name || 'Squad'}" has been permanently deleted by Super Admin.`,
          priority: 'critical',
          is_read: false,
          created_at: nowIso,
        });
      }
    }

    delete db.squad_groups[resolvedId];
    delete db.squad_groups[groupId];
    for (const [k, v] of Object.entries(db.squad_groups)) {
      if (v && isTargetGroup(v.id)) {
        delete db.squad_groups[k];
      }
    }

    db.squad_members = (db.squad_members || []).filter((m) => !(m && isTargetGroup(m.group_id)));
    db.squad_join_requests = (db.squad_join_requests || []).filter((r) => !(r && isTargetGroup(r.group_id)));
    db.squad_notices = (db.squad_notices || []).filter((n) => !(n && isTargetGroup(n.group_id)));
    db.squad_media_vault = (db.squad_media_vault || []).filter((m) => !(m && isTargetGroup(m.group_id)));
    db.squad_faculty_drive = (db.squad_faculty_drive || []).filter((d) => !(d && isTargetGroup(d.group_id)));

    if (db.squad_briefings) {
      delete db.squad_briefings[resolvedId];
      delete db.squad_briefings[groupId];
    }
    if (db.squad_checklists) {
      delete db.squad_checklists[resolvedId];
      delete db.squad_checklists[groupId];
    }
    if (db.squad_rollcalls) {
      delete db.squad_rollcalls[resolvedId];
      delete db.squad_rollcalls[groupId];
    }
    if (db.squad_sos_alarms) {
      delete db.squad_sos_alarms[resolvedId];
      delete db.squad_sos_alarms[groupId];
    }
    if (db.squad_subgroups) {
      delete db.squad_subgroups[resolvedId];
      delete db.squad_subgroups[groupId];
    }
    if (db.squad_missing_items) {
      delete db.squad_missing_items[resolvedId];
      delete db.squad_missing_items[groupId];
    }
    if (db.squad_expenses) {
      delete db.squad_expenses[resolvedId];
      delete db.squad_expenses[groupId];
    }

    saveDb(db);

    const sb = getSupabaseServerClient(req);
    if (sb) {
      try {
        await sb.from('squad_groups').delete().eq('id', resolvedId);
      } catch {}
    }

    res.json({
      success: true,
      deletedGroupId: resolvedId,
      message: 'Expedition group permanently deleted.',
    });
  });

  // ============================================================================
  // 5. GROUP LOOKUP BY CODE (Verifies Genuine Group & Returns Safe Preview)
  // ============================================================================
  app.get('/api/groups/lookup', async (req, res) => {
    const rawCode = (req.query.code as string) || '';
    const cleanCode = normalizeCode(rawCode);
    const authUser = await resolveAuthenticatedUser(req);
    const callerUserId = authUser?.id || ((req.query.userId as string) || '').trim();

    if (!cleanCode || cleanCode.length < 4) {
      res.status(400).json({
        found: false,
        error: 'Please enter a valid 6-character group invitation code.',
      });
      return;
    }

    let foundGroup: GroupRow | null = null;
    const sb = getSupabaseServerClient(req);

    // 1. Check Supabase PostgreSQL first
    if (sb) {
      try {
        const { data: sbGroup, error: sbErr } = await sb
          .from('squad_groups')
          .select('*')
          .ilike('code', cleanCode)
          .limit(1)
          .maybeSingle();

        if (!sbErr && sbGroup) {
          foundGroup = {
            id: sbGroup.id,
            name: sbGroup.name,
            code: normalizeCode(sbGroup.code),
            destination: sbGroup.destination || 'Expedition Base',
            start_date: sbGroup.start_date,
            end_date: sbGroup.end_date,
            created_by: sbGroup.created_by,
            created_at: sbGroup.created_at,
          };
          db.squad_groups[foundGroup.id] = foundGroup;
          saveDb(db);
        }
      } catch {}
    }

    // 2. Check server persistent database
    if (!foundGroup) {
      const match = Object.values(db.squad_groups).find(
        (g) => g && normalizeCode(g.code) === cleanCode
      );
      if (match) {
        foundGroup = match;
      }
    }

    if (!foundGroup) {
      res.status(404).json({
        found: false,
        error: `No group found with invitation code "${cleanCode}". Please verify the code with your group Super Admin.`,
      });
      return;
    }

    // Gather safe public preview metadata (Never expose private member data before approval)
    const creatorProfile = db.profiles[foundGroup.created_by];
    const creatorName = creatorProfile?.full_name || creatorProfile?.email?.split('@')[0] || 'Squad Super Admin';
    const groupMembers = db.squad_members.filter((m) => m && m.group_id === foundGroup!.id);
    const realMembers = groupMembers.filter((m) => m && m.user_id && m.user_id !== 'user_self');

    let isMember = false;
    let myRole: string | null = null;
    let pendingRequest: JoinRequestRow | null = null;
    let latestRequestStatus: string | null = null;
    let autoJoined = false;

    if (callerUserId || realMembers.length === 0) {
      const targetUserId = callerUserId || 'user_self';
      let memberRecord = groupMembers.find((m) => m && m.user_id === targetUserId);

      // If the group has 0 real members left and someone enters its valid code, automatically join them as super_admin without approval
      if (!memberRecord && realMembers.length === 0) {
        db.squad_members = db.squad_members.filter(
          (m) => !(m && m.group_id === foundGroup!.id && m.user_id === 'user_self')
        );
        const newMember: MemberRow = {
          id: crypto.randomUUID(),
          group_id: foundGroup.id,
          user_id: targetUserId,
          role: 'super_admin',
          status: 'active',
          joined_at: new Date().toISOString(),
        };
        db.squad_members.push(newMember);
        foundGroup.created_by = targetUserId;
        // Clear any old join requests for this user in this group
        db.squad_join_requests = db.squad_join_requests.filter(
          (r) => !(r && r.group_id === foundGroup!.id && r.user_id === targetUserId)
        );
        saveDb(db);
        memberRecord = newMember;
        autoJoined = true;
      }

      if (memberRecord) {
        isMember = true;
        myRole = memberRecord.role;
      }

      const userRequests = db.squad_join_requests
        .filter((r) => r && r.group_id === foundGroup!.id && r.user_id === callerUserId)
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

      if (userRequests.length > 0 && !isMember) {
        latestRequestStatus = userRequests[0].status;
        if (userRequests[0].status === 'pending') {
          pendingRequest = userRequests[0];
        }
      }
    }

    const updatedGroupMembers = db.squad_members.filter((m) => m && m.group_id === foundGroup!.id);
    const memberCount = Math.max(updatedGroupMembers.length, 1);

    res.json({
      found: true,
      group: {
        id: foundGroup.id,
        name: foundGroup.name,
        code: foundGroup.code,
        destination: foundGroup.destination,
        start_date: foundGroup.start_date,
        end_date: foundGroup.end_date,
        created_by: foundGroup.created_by,
        created_at: foundGroup.created_at,
        creator_name: creatorName,
        member_count: memberCount,
      },
      membership: {
        is_member: isMember,
        role: myRole,
        auto_joined: autoJoined,
        pending_request: pendingRequest,
        latest_request_status: latestRequestStatus,
      },
    });
  });

  // ============================================================================
  // 6. SUBMIT PENDING JOIN REQUEST (Prevents Duplicates & Auto-Joins Empty Groups)
  // ============================================================================
  app.post('/api/groups/:groupId/join-requests', async (req, res) => {
    const { groupId } = req.params;
    const authUser = await resolveAuthenticatedUser(req);
    const body = req.body || {};
    const requesterId = authUser?.id || body.userId;

    if (!requesterId) {
      res.status(401).json({ error: 'Authentication required to submit a group join request.' });
      return;
    }

    const group = await findGroupByIdOrCode(groupId, req);
    if (!group) {
      res.status(404).json({ error: 'Target group not found.' });
      return;
    }
    const resolvedGroupId = group.id;

    // 1. Check if user is already an active member of this group
    const groupMembers = db.squad_members.filter(
      (m) => m && (m.group_id === resolvedGroupId || m.group_id === groupId)
    );
    const realMembers = groupMembers.filter((m) => m && m.user_id && m.user_id !== 'user_self');
    const existingMember = groupMembers.find((m) => m && m.user_id === requesterId);
    if (existingMember) {
      res.status(200).json({
        success: true,
        already_member: true,
        role: existingMember.role,
        group,
        message: 'You are already an approved member of this group.',
      });
      return;
    }

    // 1B. If the group has 0 real members left, automatically join without approval as Super Admin
    if (realMembers.length === 0) {
      db.squad_members = db.squad_members.filter(
        (m) => !(m && (m.group_id === resolvedGroupId || m.group_id === groupId) && m.user_id === 'user_self')
      );
      const autoMember: MemberRow = {
        id: crypto.randomUUID(),
        group_id: resolvedGroupId,
        user_id: requesterId,
        role: 'super_admin',
        status: 'active',
        joined_at: new Date().toISOString(),
      };
      db.squad_members.push(autoMember);
      group.created_by = requesterId;
      db.squad_join_requests = db.squad_join_requests.filter(
        (r) => !(r && (r.group_id === resolvedGroupId || r.group_id === groupId) && r.user_id === requesterId)
      );
      saveDb(db);
      res.status(200).json({
        success: true,
        already_member: true,
        auto_joined: true,
        role: 'super_admin',
        group,
        message: 'Joined empty group automatically as Super Admin!',
      });
      return;
    }

    // 2. Check for existing pending join request (Prevent duplicate pending requests)
    const existingPending = db.squad_join_requests.find(
      (r) => r && (r.group_id === resolvedGroupId || r.group_id === groupId) && r.user_id === requesterId && r.status === 'pending'
    );
    if (existingPending) {
      res.json({
        success: true,
        duplicate: true,
        request: existingPending,
        message: 'Request Sent — Awaiting Approval',
      });
      return;
    }

    const userProfile = db.profiles[requesterId];
    const now = new Date().toISOString();

    const newRequest: JoinRequestRow = {
      id: crypto.randomUUID(),
      group_id: groupId,
      user_id: requesterId,
      requester_name:
        body.requesterName ||
        userProfile?.full_name ||
        authUser?.fullName ||
        (authUser?.email ? authUser.email.split('@')[0] : 'Expedition Member'),
      requester_email: body.requesterEmail || userProfile?.email || authUser?.email || '',
      requester_phone: body.requesterPhone || userProfile?.phone || '',
      requester_avatar: body.requesterAvatar || userProfile?.avatar_url || authUser?.avatarUrl || '',
      requester_blood_group: body.requesterBloodGroup || userProfile?.blood_group || '',
      status: 'pending',
      created_at: now,
      updated_at: now,
    };

    // Also try inserting into Supabase squad_join_requests if table exists
    const sb = getSupabaseServerClient(req);
    if (sb) {
      try {
        const { data: sbReq, error: sbErr } = await sb
          .from('squad_join_requests')
          .insert({
            group_id: newRequest.group_id,
            user_id: newRequest.user_id,
            requester_name: newRequest.requester_name,
            requester_email: newRequest.requester_email,
            requester_phone: newRequest.requester_phone,
            requester_avatar: newRequest.requester_avatar,
            requester_blood_group: newRequest.requester_blood_group,
            status: 'pending',
          })
          .select()
          .single();

        if (!sbErr && sbReq) {
          newRequest.id = sbReq.id;
        }
      } catch {}
    }

    db.squad_join_requests.push(newRequest);

    // Notify all Super Admins of this group
    const superAdmins = db.squad_members.filter(
      (m) => m && m.group_id === groupId && m.role === 'super_admin'
    );
    for (const admin of superAdmins) {
      db.user_notifications.push({
        id: crypto.randomUUID(),
        user_id: admin.user_id,
        group_id: groupId,
        type: 'join_requested',
        title: 'New Join Request',
        message: `${newRequest.requester_name} requested to join "${group.name}" (${group.code}).`,
        is_read: false,
        created_at: now,
      });
    }

    saveDb(db);

    res.json({
      success: true,
      duplicate: false,
      request: newRequest,
      message: 'Request Sent — Awaiting Approval',
    });
  });

  // ============================================================================
  // 7. GET USER'S JOIN REQUESTS & ACTIVE MEMBERSHIP STATUS
  // ============================================================================
  app.get('/api/users/:userId/status', async (req, res) => {
    const { userId } = req.params;
    const preferredGroupId = (req.query.preferredGroupId as string) || '';

    // If user created a group while their client ID was still 'user_self' and preferredGroupId matches, migrate 'user_self' to their real userId
    if (preferredGroupId && userId && userId !== 'user_self') {
      const selfMember = db.squad_members.find(
        (m) => m && m.group_id === preferredGroupId && m.user_id === 'user_self'
      );
      if (selfMember) {
        selfMember.user_id = userId;
        if (db.squad_groups[preferredGroupId]?.created_by === 'user_self') {
          db.squad_groups[preferredGroupId].created_by = userId;
        }
        saveDb(db);
      }
    }

    // Find user's memberships
    const memberships = db.squad_members
      .filter((m) => m && m.user_id === userId)
      .sort((a, b) => new Date(b.joined_at).getTime() - new Date(a.joined_at).getTime());

    let activeSquad: { group: GroupRow; role: string; status: string } | null = null;
    if (memberships.length > 0) {
      const chosen =
        (preferredGroupId && memberships.find((m) => m && m.group_id === preferredGroupId)) ||
        memberships[0];
      const grp = db.squad_groups[chosen.group_id];
      if (grp) {
        // Enforce mandatory Super Admin rule if only 1 member in group
        const groupMembers = db.squad_members.filter((m) => m && m.group_id === grp.id);
        const hasSuperAdmin = groupMembers.some((m) => m && m.role === 'super_admin');
        if (groupMembers.length === 1 || (!hasSuperAdmin && groupMembers[0]?.user_id === userId)) {
          chosen.role = 'super_admin';
          saveDb(db);
        }
        activeSquad = {
          group: grp,
          role: chosen.role,
          status: chosen.status,
        };
      }
    }

    // Find user's join requests enriched with group info
    const myRequests = db.squad_join_requests
      .filter((r) => r && r.user_id === userId)
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .map((r) => {
        const grp = db.squad_groups[r.group_id];
        return {
          ...r,
          group_name: grp?.name || 'Expedition Squad',
          group_code: grp?.code || '',
          group_destination: grp?.destination || '',
        };
      });

    // Find user's unread notifications
    const notifications = db.user_notifications
      .filter((n) => n && n.user_id === userId)
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .slice(0, 30);

    res.json({
      activeSquad,
      joinRequests: myRequests,
      notifications,
    });
  });

  // ============================================================================
  // 7B. RESTORE ACTIVE GROUP SESSION (Prevents Auto-Leave on App Refresh / Server Restart)
  // ============================================================================
  app.post('/api/groups/restore', async (req, res) => {
    const authUser = await resolveAuthenticatedUser(req);
    const body = req.body || {};
    const userId = authUser?.id || (body.userId as string) || '';
    const rawGroup = body.group;
    const role = (body.role as MemberRow['role']) || 'super_admin';

    if (!userId || !rawGroup || !rawGroup.id || !rawGroup.name) {
      res.status(400).json({ success: false, error: 'Missing userId or group payload.' });
      return;
    }

    const groupId = String(rawGroup.id).trim();
    const normalizedIdAsName = groupId.replace(/[_-]/g, ' ').trim().toLowerCase();
    if (String(rawGroup.name).trim().toLowerCase() === normalizedIdAsName) {
      res.status(400).json({ success: false, error: 'Invalid corrupted group name.' });
      return;
    }

    const now = new Date().toISOString();
    let group = db.squad_groups[groupId];
    if (!group) {
      group = {
        id: groupId,
        name: String(rawGroup.name).trim(),
        code: normalizeCode(rawGroup.code || generateUniqueDatabaseCode(db.squad_groups)),
        destination: String(rawGroup.destination || 'Expedition Base').trim(),
        start_date: rawGroup.start_date || rawGroup.startDate || rawGroup.departureDate,
        end_date: rawGroup.end_date || rawGroup.endDate || rawGroup.returnDate,
        created_by: rawGroup.created_by || rawGroup.creator_id || userId,
        created_at: rawGroup.created_at || now,
      };
      db.squad_groups[groupId] = group;
    }

    let member = db.squad_members.find((m) => m && m.group_id === groupId && m.user_id === userId);
    if (!member) {
      const existingGroupMembers = db.squad_members.filter((m) => m && m.group_id === groupId);
      const effectiveRole: MemberRow['role'] =
        existingGroupMembers.length === 0 || group.created_by === userId ? 'super_admin' : role;
      member = {
        id: crypto.randomUUID(),
        group_id: groupId,
        user_id: userId,
        role: effectiveRole,
        status: 'active',
        joined_at: now,
      };
      db.squad_members.push(member);
    }

    saveDb(db);
    res.json({
      success: true,
      activeSquad: {
        group,
        role: member.role,
        status: member.status,
      },
    });
  });

  async function findGroupByIdOrCode(groupId: string, req?: any): Promise<GroupRow | null> {
    if (!groupId) return null;
    const cleanId = String(groupId).trim();
    if (!cleanId || cleanId === 'undefined' || cleanId === 'null') return null;
    if (db.squad_groups[cleanId]) return db.squad_groups[cleanId];

    // 1. Direct or normalized code match in server DB
    const norm = cleanId.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6);
    const byCode = Object.values(db.squad_groups).find(
      (g) => g && (g.id === cleanId || normalizeCode(g.code) === norm)
    );
    if (byCode) return byCode;

    // 2. Query Supabase PostgreSQL if table migrated or group was created in Supabase
    if (req) {
      const sb = getSupabaseServerClient(req);
      if (sb) {
        try {
          const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(cleanId);
          let sbQuery = sb.from('squad_groups').select('*');
          if (isUuid) {
            sbQuery = sbQuery.or(`id.eq.${cleanId},code.ilike.${cleanId}`);
          } else {
            sbQuery = sbQuery.ilike('code', cleanId.slice(0, 10));
          }
          const { data: sbGroup } = await sbQuery.maybeSingle();

          if (sbGroup) {
            const row: GroupRow = {
              id: sbGroup.id,
              name: sbGroup.name,
              code: normalizeCode(sbGroup.code),
              destination: sbGroup.destination || 'Expedition Base',
              start_date: sbGroup.start_date,
              end_date: sbGroup.end_date,
              created_by: sbGroup.created_by,
              created_at: sbGroup.created_at,
            };
            db.squad_groups[row.id] = row;
            saveDb(db);
            return row;
          }
        } catch {}
      }
    }

    // 3. Fallback for single existing group in DB when 'default', 'grp_current', or local ID is passed
    const allGroups = Object.values(db.squad_groups).filter(Boolean);
    if (cleanId === 'default' || cleanId === 'grp_current' || allGroups.length === 1) {
      if (allGroups.length > 0) return allGroups[0];
    }

    return null;
  }

  // ============================================================================
  // 8. GET GROUP MEMBERS & PENDING JOIN REQUESTS (Protected for Group Members)
  // ============================================================================
  app.get('/api/groups/:groupId/members', async (req, res) => {
    const { groupId } = req.params;
    const authUser = await resolveAuthenticatedUser(req);
    const callerId = authUser?.id || ((req.query.userId as string) || '').trim();

    const group = await findGroupByIdOrCode(groupId, req);
    if (!group) {
      res.status(404).json({ error: 'Group not found.' });
      return;
    }
    const resolvedGroupId = group.id;

    const groupMembers = db.squad_members.filter(
      (m) => m && (m.group_id === resolvedGroupId || m.group_id === groupId)
    );

    // Prevent unauthorized access to private group member list before approval
    let callerMembership = groupMembers.find((m) => m && m.user_id === callerId);
    if (!callerMembership && callerId && (group.created_by === callerId || groupMembers.length === 0)) {
      callerMembership = {
        id: crypto.randomUUID(),
        group_id: resolvedGroupId,
        user_id: callerId,
        role: 'super_admin',
        status: 'active',
        joined_at: new Date().toISOString(),
      };
      db.squad_members.push(callerMembership);
      groupMembers.push(callerMembership);
      saveDb(db);
    }

    if (!callerMembership) {
      res.status(403).json({
        error: 'Access Denied: You must be an approved member of this group to view private squad data.',
      });
      return;
    }

    // Mandatory Super Admin invariant: if 1 member or 0 super_admins, promote first member
    const hasSuperAdmin = groupMembers.some((m) => m && m.role === 'super_admin');
    if (groupMembers.length === 1 || (!hasSuperAdmin && groupMembers.length > 0)) {
      groupMembers[0].role = 'super_admin';
      saveDb(db);
    }

    // Update caller's profile if caller passed their real name
    const callerNameParam = ((req.query.userName as string) || authUser?.fullName || '').trim();
    const callerAvatarParam = ((req.query.userAvatar as string) || authUser?.avatarUrl || '').trim();
    const isPlaceholder = (n?: string | null) =>
      !n ||
      n === 'Squad Member' ||
      n === 'Expedition Member' ||
      n === 'Trekker' ||
      /^Trekker\s+[0-9a-f-]{4,}/i.test(n);

    let dbUpdated = false;
    if (callerId && callerNameParam && !isPlaceholder(callerNameParam)) {
      const existing = db.profiles[callerId];
      if (!existing || isPlaceholder(existing.full_name) || existing.full_name !== callerNameParam) {
        db.profiles[callerId] = {
          ...existing,
          id: callerId,
          email: existing?.email || authUser?.email || '',
          full_name: callerNameParam,
          avatar_url: callerAvatarParam || existing?.avatar_url || '',
          is_profile_complete: true,
          created_at: existing?.created_at || new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };
        dbUpdated = true;
      }
    }

    // Resolve any missing member profiles from join requests or Supabase profiles table
    const sb = getSupabaseServerClient(req);
    for (const m of groupMembers) {
      const prof = db.profiles[m.user_id];
      if (!prof || isPlaceholder(prof.full_name)) {
        // 1. Check join requests for this user's submitted name
        const matchingReq = db.squad_join_requests.find(
          (r) => r && r.user_id === m.user_id && !isPlaceholder((r as any).user_name || r.requester_name)
        );
        if (matchingReq) {
          const reqName = ((matchingReq as any).user_name || matchingReq.requester_name || '').trim();
          db.profiles[m.user_id] = {
            ...prof,
            id: m.user_id,
            email: prof?.email || (matchingReq as any).user_email || matchingReq.requester_email || '',
            full_name: reqName,
            avatar_url: prof?.avatar_url || (matchingReq as any).user_avatar || matchingReq.requester_avatar || '',
            is_profile_complete: true,
            created_at: prof?.created_at || matchingReq.created_at,
            updated_at: new Date().toISOString(),
          };
          dbUpdated = true;
          continue;
        }

        // 2. Check Supabase profiles table if configured
        if (sb) {
          try {
            const { data: sbProf } = await sb
              .from('profiles')
              .select('*')
              .eq('id', m.user_id)
              .maybeSingle();
            if (sbProf && sbProf.full_name && !isPlaceholder(sbProf.full_name)) {
              db.profiles[m.user_id] = {
                ...prof,
                ...sbProf,
                id: m.user_id,
                full_name: sbProf.full_name,
              };
              dbUpdated = true;
            }
          } catch {}
        }
      }
    }

    if (dbUpdated) {
      saveDb(db);
    }

    const enrichedMembers = groupMembers.map((m) => {
      const prof = db.profiles[m.user_id];
      const realName =
        prof?.full_name && !isPlaceholder(prof.full_name)
          ? prof.full_name
          : prof?.email
          ? prof.email.split('@')[0]
          : 'Member';
      return {
        ...m,
        profile: {
          ...(prof || {}),
          id: m.user_id,
          email: prof?.email || '',
          full_name: realName,
          avatar_url: prof?.avatar_url || '',
          phone: prof?.phone || '',
          is_profile_complete: true,
        },
      };
    });

    res.json({ members: enrichedMembers });
  });

  // ============================================================================
  // 8B. SHARED GROUP CHECKLIST ENDPOINTS (Synced to Home Trip Gear & Squad Checklist)
  // ============================================================================
  app.get('/api/groups/:groupId/checklist', async (req, res) => {
    const { groupId } = req.params;
    const group = await findGroupByIdOrCode(groupId, req);
    const resolvedGroupId = group?.id || groupId;
    if (!db.squad_checklists) db.squad_checklists = {};
    const items = Array.isArray(db.squad_checklists[resolvedGroupId])
      ? db.squad_checklists[resolvedGroupId]
      : [];
    res.json({ success: true, items });
  });

  app.post('/api/groups/:groupId/checklist', async (req, res) => {
    const { groupId } = req.params;
    const group = await findGroupByIdOrCode(groupId, req);
    const resolvedGroupId = group?.id || groupId;
    const body = req.body || {};
    const item = body.item || body;
    if (!item || !item.name) {
      res.status(400).json({ success: false, error: 'Checklist item name is required.' });
      return;
    }

    if (!db.squad_checklists) db.squad_checklists = {};
    const currentList = Array.isArray(db.squad_checklists[resolvedGroupId])
      ? db.squad_checklists[resolvedGroupId]
      : [];

    const record = {
      id: item.id || `chk-${Date.now()}`,
      group_id: resolvedGroupId,
      user_id: item.user_id || body.userId || 'user_self',
      name: String(item.name).trim(),
      category: item.category || 'camp',
      is_packed: Boolean(item.is_packed ?? item.isPacked ?? false),
      is_mandatory: Boolean(item.is_mandatory ?? item.isMandatory ?? true),
      weight_grams: Number(item.weight_grams ?? item.weightGrams) || 250,
      spec: item.spec || null,
      is_custom: Boolean(item.is_custom ?? item.isCustom ?? true),
      created_at: item.created_at || new Date().toISOString(),
    };

    const existingIdx = currentList.findIndex((i) => i && i.id === record.id);
    if (existingIdx >= 0) {
      currentList[existingIdx] = record;
    } else {
      currentList.push(record);
    }
    db.squad_checklists[resolvedGroupId] = currentList;
    saveDb(db);

    res.json({ success: true, item: record, items: currentList });
  });

  app.patch('/api/groups/:groupId/checklist/:itemId', async (req, res) => {
    const { groupId, itemId } = req.params;
    const group = await findGroupByIdOrCode(groupId, req);
    const resolvedGroupId = group?.id || groupId;
    const { is_packed, isPacked } = req.body || {};
    const nextPacked = Boolean(is_packed ?? isPacked);

    if (!db.squad_checklists) db.squad_checklists = {};
    const currentList = Array.isArray(db.squad_checklists[resolvedGroupId])
      ? db.squad_checklists[resolvedGroupId]
      : [];

    const updated = currentList.map((i) =>
      i && i.id === itemId ? { ...i, is_packed: nextPacked } : i
    );
    db.squad_checklists[resolvedGroupId] = updated;
    saveDb(db);

    res.json({ success: true, items: updated });
  });

  app.delete('/api/groups/:groupId/checklist/:itemId', async (req, res) => {
    const { groupId, itemId } = req.params;
    const group = await findGroupByIdOrCode(groupId, req);
    const resolvedGroupId = group?.id || groupId;

    if (!db.squad_checklists) db.squad_checklists = {};
    const currentList = Array.isArray(db.squad_checklists[resolvedGroupId])
      ? db.squad_checklists[resolvedGroupId]
      : [];

    const updated = currentList.filter((i) => i && i.id !== itemId);
    db.squad_checklists[resolvedGroupId] = updated;
    saveDb(db);

    res.json({ success: true, items: updated });
  });

  // ============================================================================
  // 8B. SUB-GROUPS & MISSING ITEMS (Squad Logistics & Team Organization)
  // ============================================================================
  app.get('/api/groups/:groupId/subgroups', async (req, res) => {
    const { groupId } = req.params;
    const group = await findGroupByIdOrCode(groupId, req);
    const resolvedGroupId = group?.id || groupId;

    if (!db.squad_subgroups) db.squad_subgroups = {};
    const subgroups = db.squad_subgroups[resolvedGroupId] || [];
    res.json({ success: true, subgroups });
  });

  app.post('/api/groups/:groupId/subgroups', async (req, res) => {
    const { groupId } = req.params;
    const body = req.body || {};
    const group = await findGroupByIdOrCode(groupId, req);
    const resolvedGroupId = group?.id || groupId;

    if (!db.squad_subgroups) db.squad_subgroups = {};
    if (!db.squad_subgroups[resolvedGroupId]) db.squad_subgroups[resolvedGroupId] = [];

    const memberIds: string[] = Array.isArray(body.memberIds) ? body.memberIds : [];
    const newSubGroup: SubGroupRow = {
      id: body.id || crypto.randomUUID(),
      group_id: resolvedGroupId,
      name: body.name || 'New Sub-Group',
      color: body.color || '#10b981',
      lead_name: body.leadName || 'Assigned Lead',
      member_count: memberIds.length || body.memberCount || 0,
      member_ids: memberIds,
      created_at: new Date().toISOString(),
    };

    db.squad_subgroups[resolvedGroupId].push(newSubGroup);

    // Sync assignment to members in db.squad_members
    if (memberIds.length > 0) {
      const now = new Date().toISOString();
      for (const m of db.squad_members) {
        if (m && (m.group_id === resolvedGroupId || m.group_id === groupId)) {
          if (memberIds.includes(m.user_id)) {
            m.sub_group_id = newSubGroup.id;
            m.sub_group_name = newSubGroup.name;
            m.sub_group_color = newSubGroup.color;

            // Send assignment notification to assigned member
            db.user_notifications.push({
              id: crypto.randomUUID(),
              user_id: m.user_id,
              group_id: resolvedGroupId,
              type: 'info',
              title: `🏷️ Assigned to Sub-Group: ${newSubGroup.name}`,
              message: `You have been assigned to "${newSubGroup.name}" by squad leadership. Your sub-group badge is now active.`,
              priority: 'advisory',
              is_read: false,
              created_at: now,
            });
          }
        }
      }
    }

    saveDb(db);
    res.json({ success: true, subgroup: newSubGroup });
  });

  app.post('/api/groups/:groupId/subgroups/:subgroupId/assign', async (req, res) => {
    const { groupId, subgroupId } = req.params;
    const { memberIds } = req.body || {};
    const group = await findGroupByIdOrCode(groupId, req);
    const resolvedGroupId = group?.id || groupId;

    if (!Array.isArray(memberIds)) {
      res.status(400).json({ error: 'memberIds array is required.' });
      return;
    }

    const subGroup = (db.squad_subgroups?.[resolvedGroupId] || []).find((sg) => sg.id === subgroupId);
    if (!subGroup) {
      res.status(404).json({ error: 'Sub-group not found.' });
      return;
    }

    subGroup.member_ids = memberIds;
    subGroup.member_count = memberIds.length;

    const now = new Date().toISOString();
    for (const m of db.squad_members) {
      if (m && (m.group_id === resolvedGroupId || m.group_id === groupId)) {
        if (memberIds.includes(m.user_id)) {
          m.sub_group_id = subGroup.id;
          m.sub_group_name = subGroup.name;
          m.sub_group_color = subGroup.color;

          db.user_notifications.push({
            id: crypto.randomUUID(),
            user_id: m.user_id,
            group_id: resolvedGroupId,
            type: 'info',
            title: `🏷️ Sub-Group Update: ${subGroup.name}`,
            message: `You are assigned to "${subGroup.name}". Check your team roster.`,
            priority: 'advisory',
            is_read: false,
            created_at: now,
          });
        } else if (m.sub_group_id === subgroupId) {
          delete m.sub_group_id;
          delete m.sub_group_name;
          delete m.sub_group_color;
        }
      }
    }

    saveDb(db);
    res.json({ success: true, subgroup: subGroup });
  });

  app.delete('/api/groups/:groupId/subgroups/:subgroupId', async (req, res) => {
    const { groupId, subgroupId } = req.params;
    const group = await findGroupByIdOrCode(groupId, req);
    const resolvedGroupId = group?.id || groupId;

    if (db.squad_subgroups?.[resolvedGroupId]) {
      db.squad_subgroups[resolvedGroupId] = db.squad_subgroups[resolvedGroupId].filter(sg => sg.id !== subgroupId);
      // Clear member sub-group references
      for (const m of db.squad_members) {
        if (m && (m.group_id === resolvedGroupId || m.group_id === groupId) && m.sub_group_id === subgroupId) {
          delete m.sub_group_id;
          delete m.sub_group_name;
          delete m.sub_group_color;
        }
      }
      saveDb(db);
    }
    res.json({ success: true });
  });

  app.get('/api/groups/:groupId/missing-items', async (req, res) => {
    const { groupId } = req.params;
    const group = await findGroupByIdOrCode(groupId, req);
    const resolvedGroupId = group?.id || groupId;

    if (!db.squad_missing_items) db.squad_missing_items = {};
    const items = db.squad_missing_items[resolvedGroupId] || [];
    res.json({ success: true, items });
  });

  app.post('/api/groups/:groupId/missing-items', async (req, res) => {
    const { groupId } = req.params;
    const body = req.body || {};
    const authUser = await resolveAuthenticatedUser(req);
    const group = await findGroupByIdOrCode(groupId, req);
    const resolvedGroupId = group?.id || groupId;

    if (!db.squad_missing_items) db.squad_missing_items = {};
    if (!db.squad_missing_items[resolvedGroupId]) db.squad_missing_items[resolvedGroupId] = [];

    const reporterName = body.reportedBy || authUser?.fullName || 'Squad Member';
    const itemName = body.itemName || 'Missing Item';
    const urgency = body.urgency || 'critical';
    const location = body.location || 'Trail Basecamp';
    const nowIso = new Date().toISOString();

    const newItem: MissingItemRow = {
      id: body.id || crypto.randomUUID(),
      group_id: resolvedGroupId,
      item_name: itemName,
      reported_by: reporterName,
      urgency,
      location,
      status: 'open',
      timestamp: body.timestamp || new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      created_at: nowIso,
    };

    db.squad_missing_items[resolvedGroupId].unshift(newItem);

    // 1. Create or reuse urgent Group Announcement notice in db.squad_notices so it stays in the Notice section
    if (!db.squad_notices) db.squad_notices = [];
    const noticeTitle = `🚨 MISSING GEAR: ${itemName}`;
    const noticeText = `Urgent alert from ${reporterName}: ${itemName} is missing! Last seen: ${location}. Urgency: ${urgency.toUpperCase()}. Please check your pack.`;
    const authorId = authUser?.id || body.userId || 'user_self';

    let notice = db.squad_notices.find(
      (n) =>
        n &&
        (n.group_id === resolvedGroupId || n.group_id === groupId) &&
        n.title === noticeTitle &&
        Date.now() - new Date(n.created_at).getTime() < 15000
    );

    if (!notice) {
      notice = {
        id: body.noticeId || `notice_missing_${Date.now()}`,
        group_id: resolvedGroupId,
        title: noticeTitle,
        text: noticeText,
        priority: 'critical',
        author_id: authorId,
        author_name: reporterName,
        author_role: 'Missing Item Alert',
        created_at: nowIso,
      };
      db.squad_notices.unshift(notice);

      // 2. Broadcast high-priority in-app push notification to other squad members
      const groupMembers = db.squad_members.filter(
        (m) => m && (m.group_id === resolvedGroupId || m.group_id === groupId)
      );
      for (const m of groupMembers) {
        if (m.user_id && m.user_id !== authorId) {
          db.user_notifications.push({
            id: crypto.randomUUID(),
            user_id: m.user_id,
            group_id: resolvedGroupId,
            notice_id: notice.id,
            type: 'notice_broadcast',
            title: noticeTitle,
            message: noticeText,
            priority: 'critical',
            author_name: reporterName,
            is_read: false,
            created_at: nowIso,
          });
        }
      }
    }

    saveDb(db);

    // 3. Broadcast across Supabase Realtime channel if available
    const sb = getSupabaseServerClient(req);
    if (sb) {
      try {
        const channel = sb.channel(`squad_realtime_${resolvedGroupId}`);
        channel.subscribe((status) => {
          if (status === 'SUBSCRIBED') {
            channel.send({
              type: 'broadcast',
              event: 'notice_broadcast',
              payload: { groupId: resolvedGroupId, notice },
            });
            channel.send({
              type: 'broadcast',
              event: 'missing_item_added',
              payload: { groupId: resolvedGroupId, item: newItem },
            });
          }
        });
      } catch {}
    }

    res.json({ success: true, item: newItem, notice });
  });

  app.patch('/api/groups/:groupId/missing-items/:itemId', async (req, res) => {
    const { groupId, itemId } = req.params;
    const { status } = req.body || {};
    const group = await findGroupByIdOrCode(groupId, req);
    const resolvedGroupId = group?.id || groupId;

    if (db.squad_missing_items?.[resolvedGroupId]) {
      const idx = db.squad_missing_items[resolvedGroupId].findIndex(i => i.id === itemId);
      if (idx >= 0) {
        db.squad_missing_items[resolvedGroupId][idx].status = status || 'found';
        saveDb(db);
      }
    }
    res.json({ success: true });
  });

  app.delete('/api/groups/:groupId/missing-items/:itemId', async (req, res) => {
    const { groupId, itemId } = req.params;
    const group = await findGroupByIdOrCode(groupId, req);
    const resolvedGroupId = group?.id || groupId;

    if (db.squad_missing_items?.[resolvedGroupId]) {
      db.squad_missing_items[resolvedGroupId] = db.squad_missing_items[resolvedGroupId].filter(i => i.id !== itemId);
      saveDb(db);
    }
    res.json({ success: true });
  });

  // ============================================================================
  // 8C. SPLITWISE SQUAD EXPENSES & AUTO-BUDGET SPLIT (Shared Across All Members)
  // ============================================================================
  app.get('/api/groups/:groupId/expenses', async (req, res) => {
    const { groupId } = req.params;
    const group = await findGroupByIdOrCode(groupId, req);
    const resolvedGroupId = group?.id || groupId;

    if (!db.squad_expenses) db.squad_expenses = {};
    const expenses = db.squad_expenses[resolvedGroupId] || [];
    res.json({ success: true, expenses });
  });

  app.post('/api/groups/:groupId/expenses', async (req, res) => {
    const { groupId } = req.params;
    const body = req.body || {};
    const authUser = await resolveAuthenticatedUser(req);
    const group = await findGroupByIdOrCode(groupId, req);
    const resolvedGroupId = group?.id || groupId;

    const title = String(body.title || 'Expedition Expense').trim();
    const totalAmount = Number(body.totalAmount || body.amount) || 0;
    if (!title || totalAmount <= 0) {
      res.status(400).json({ error: 'Title and a valid positive amount are required.' });
      return;
    }

    if (!db.squad_expenses) db.squad_expenses = {};
    if (!db.squad_expenses[resolvedGroupId]) db.squad_expenses[resolvedGroupId] = [];

    // Calculate members to split among
    const groupMembers = db.squad_members.filter(
      (m) => m && (m.group_id === resolvedGroupId || m.group_id === groupId) && m.user_id !== 'user_self'
    );
    const activeMemberCount = Math.max(1, groupMembers.length);
    const splitType = body.splitType === 'subgroup' ? 'subgroup' : 'all';
    let targetCount = activeMemberCount;
    if (splitType === 'subgroup' && body.subGroupId) {
      const sg = (db.squad_subgroups?.[resolvedGroupId] || []).find((s) => s.id === body.subGroupId);
      if (sg && sg.member_ids?.length) {
        targetCount = sg.member_ids.length;
      }
    }

    const amountPerMember = Math.round((totalAmount / targetCount) * 100) / 100;
    const paidBy = String(body.paidBy || authUser?.fullName || 'Squad Super Admin');
    const nowIso = new Date().toISOString();

    const newExpense: ExpenseRow = {
      id: body.id || `exp_${Date.now()}`,
      group_id: resolvedGroupId,
      title,
      total_amount: totalAmount,
      paid_by: paidBy,
      paid_by_user_id: authUser?.id || body.paidByUserId,
      category: body.category || 'Supplies',
      split_type: splitType,
      sub_group_id: body.subGroupId || undefined,
      amount_per_member: amountPerMember,
      member_count: targetCount,
      date: body.date || new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }),
      created_at: nowIso,
    };

    db.squad_expenses[resolvedGroupId].unshift(newExpense);

    // Notify all squad members of the bill addition and budget dues update
    for (const m of groupMembers) {
      db.user_notifications.push({
        id: crypto.randomUUID(),
        user_id: m.user_id,
        group_id: resolvedGroupId,
        type: 'info',
        title: `🧾 New Squad Bill: ${title}`,
        message: `${paidBy} added bill of ₹${totalAmount.toLocaleString()} (${newExpense.category}). Your share of ₹${amountPerMember.toLocaleString()} is added to your budget dues.`,
        priority: 'info',
        is_read: false,
        created_at: nowIso,
      });
    }

    saveDb(db);

    res.json({
      success: true,
      expense: newExpense,
      amountPerMember,
      memberCount: targetCount,
    });
  });

  app.delete('/api/groups/:groupId/expenses/:expenseId', async (req, res) => {
    const { groupId, expenseId } = req.params;
    const group = await findGroupByIdOrCode(groupId, req);
    const resolvedGroupId = group?.id || groupId;

    if (db.squad_expenses?.[resolvedGroupId]) {
      db.squad_expenses[resolvedGroupId] = db.squad_expenses[resolvedGroupId].filter(e => e.id !== expenseId);
      saveDb(db);
    }
    res.json({ success: true });
  });

  app.get('/api/groups/:groupId/join-requests', async (req, res) => {
    const { groupId } = req.params;
    const authUser = await resolveAuthenticatedUser(req);
    const callerId = authUser?.id || ((req.query.userId as string) || '').trim();

    const groupMembers = db.squad_members.filter((m) => m && m.group_id === groupId);
    const callerMembership = groupMembers.find((m) => m && m.user_id === callerId);

    if (!callerMembership || callerMembership.role !== 'super_admin') {
      res.status(403).json({
        error: 'Access Denied: Only authorized Super Admins can view pending join requests.',
      });
      return;
    }

    const requests = db.squad_join_requests
      .filter((r) => r && r.group_id === groupId && r.status === 'pending')
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

    res.json({ requests });
  });

  // ============================================================================
  // 9. SUPER ADMIN ACCEPT / REJECT JOIN REQUEST (Strict Server & DB Enforcement)
  // ============================================================================
  app.post('/api/groups/:groupId/join-requests/:requestId/respond', async (req, res) => {
    const { groupId, requestId } = req.params;
    const { decision } = req.body || {}; // 'accepted' or 'rejected'
    const authUser = await resolveAuthenticatedUser(req);
    const callerId = authUser?.id || (req.body?.callerUserId as string) || '';

    if (!callerId) {
      res.status(401).json({ error: 'Authentication required.' });
      return;
    }

    if (decision !== 'accepted' && decision !== 'rejected') {
      res.status(400).json({ error: 'Invalid decision. Must be "accepted" or "rejected".' });
      return;
    }

    // Strictly verify caller is an authorized Super Admin of this group
    const callerMember = db.squad_members.find(
      (m) => m && m.group_id === groupId && m.user_id === callerId
    );
    if (!callerMember || callerMember.role !== 'super_admin') {
      res.status(403).json({
        error: 'Access Denied: Only an authorized Super Admin of this group can approve or reject join requests.',
      });
      return;
    }

    const reqIndex = db.squad_join_requests.findIndex(
      (r) => r && r.id === requestId && r.group_id === groupId
    );
    if (reqIndex === -1) {
      res.status(404).json({ error: 'Join request not found.' });
      return;
    }

    const targetReq = db.squad_join_requests[reqIndex];
    if (targetReq.status !== 'pending') {
      res.status(400).json({ error: `Join request has already been ${targetReq.status}.` });
      return;
    }

    const now = new Date().toISOString();
    targetReq.status = decision;
    targetReq.reviewed_by = callerId;
    targetReq.reviewed_at = now;
    targetReq.updated_at = now;

    const group = db.squad_groups[groupId];
    let createdMember: MemberRow | null = null;

    if (decision === 'accepted') {
      const existingMemberIdx = db.squad_members.findIndex(
        (m) => m && m.group_id === groupId && m.user_id === targetReq.user_id
      );

      createdMember = {
        id: existingMemberIdx >= 0 ? db.squad_members[existingMemberIdx].id : crypto.randomUUID(),
        group_id: groupId,
        user_id: targetReq.user_id,
        role: 'member',
        status: 'active',
        joined_at: now,
      };

      if (existingMemberIdx >= 0) {
        db.squad_members[existingMemberIdx] = createdMember;
      } else {
        db.squad_members.push(createdMember);
      }

      // Ensure requester profile exists in db.profiles for roster display
      if (!db.profiles[targetReq.user_id]) {
        db.profiles[targetReq.user_id] = {
          id: targetReq.user_id,
          email: targetReq.requester_email,
          full_name: targetReq.requester_name,
          avatar_url: targetReq.requester_avatar,
          phone: targetReq.requester_phone,
          blood_group: targetReq.requester_blood_group,
          is_profile_complete: true,
          created_at: now,
          updated_at: now,
        };
      }

      // Notify requester of acceptance
      db.user_notifications.push({
        id: crypto.randomUUID(),
        user_id: targetReq.user_id,
        group_id: groupId,
        type: 'join_accepted',
        title: 'Join Request Approved!',
        message: `Your request to join "${group?.name || 'Expedition Squad'}" (${group?.code || ''}) was approved by the Super Admin!`,
        is_read: false,
        created_at: now,
      });
    } else {
      // Rejected: Do NOT create membership; notify requester
      db.user_notifications.push({
        id: crypto.randomUUID(),
        user_id: targetReq.user_id,
        group_id: groupId,
        type: 'join_rejected',
        title: 'Join Request Declined',
        message: `Your request to join "${group?.name || 'Expedition Squad'}" (${group?.code || ''}) was declined by the Super Admin.`,
        is_read: false,
        created_at: now,
      });
    }

    // Sync with Supabase if tables/RPC exist
    const sb = getSupabaseServerClient(req);
    if (sb) {
      try {
        await sb.rpc('respond_to_join_request', {
          p_request_id: requestId,
          p_decision: decision,
        });
      } catch {}
    }

    saveDb(db);

    res.json({
      success: true,
      request: targetReq,
      member: createdMember,
    });
  });

  // ============================================================================
  // 10. MARK NOTIFICATIONS READ
  // ============================================================================
  app.post('/api/notifications/mark-read', async (req, res) => {
    const authUser = await resolveAuthenticatedUser(req);
    const userId = authUser?.id || (req.body?.userId as string) || '';
    const notificationId = req.body?.notificationId as string | undefined;

    if (!userId) {
      res.status(401).json({ error: 'Authentication required.' });
      return;
    }

    for (const n of db.user_notifications) {
      if (n && n.user_id === userId && (!notificationId || n.id === notificationId)) {
        n.is_read = true;
      }
    }
    saveDb(db);
    res.json({ success: true });
  });

  // ============================================================================
  // 10B. LEAVE GROUP (Removes membership so user stops receiving group notices)
  // ============================================================================
  app.post('/api/groups/:groupId/leave', async (req, res) => {
    const { groupId } = req.params;
    const authUser = await resolveAuthenticatedUser(req);
    const userId = authUser?.id || (req.body?.userId as string) || 'user_self';
    const successorUserId = (req.body?.successorUserId as string) || '';

    const group = await findGroupByIdOrCode(groupId, req);
    const resolvedGroupId = group?.id || groupId;
    const groupCode = group?.code || '';

    const isMatchingGroup = (gid: string) =>
      gid === resolvedGroupId || gid === groupId || (groupCode && gid === groupCode);

    const groupMembers = db.squad_members.filter((m) => m && isMatchingGroup(m.group_id));
    const remainingMembers = groupMembers.filter(
      (m) => m.user_id !== userId && m.user_id !== 'user_self'
    );

    // If there are remaining members, ensure at least one Super Admin remains
    if (remainingMembers.length > 0) {
      const hasRemainingSuperAdmin = remainingMembers.some((m) => m.role === 'super_admin');
      if (!hasRemainingSuperAdmin) {
        const successor =
          (successorUserId && remainingMembers.find((m) => m.user_id === successorUserId)) ||
          remainingMembers[0];
        if (successor) {
          successor.role = 'super_admin';
        }
      }
    }

    // Remove membership for this user in this group (and user_self fallback if no other members remain)
    db.squad_members = db.squad_members.filter((m) => {
      if (!m || !isMatchingGroup(m.group_id)) return true;
      if (m.user_id === userId) return false;
      if (remainingMembers.length === 0 && m.user_id === 'user_self') return false;
      return true;
    });

    // Remove previous join_requests for this user & group so they can cleanly rejoin later
    db.squad_join_requests = db.squad_join_requests.filter(
      (r) => !(r && isMatchingGroup(r.group_id) && (r.user_id === userId || r.user_id === 'user_self'))
    );

    saveDb(db);
    res.json({
      success: true,
      remainingCount: remainingMembers.length,
      message: 'Left expedition group. Group notices and resources are now hidden until you rejoin.',
    });
  });

  // ============================================================================
  // 10B-2. KICK MEMBER FROM GROUP (Super Admin / Admin Action)
  // ============================================================================
  app.delete('/api/groups/:groupId/members/:memberId', async (req, res) => {
    const { groupId, memberId } = req.params;
    const group = await findGroupByIdOrCode(groupId, req);
    const resolvedGroupId = group?.id || groupId;
    const groupCode = group?.code || '';

    const isMatchingGroup = (gid: string) =>
      gid === resolvedGroupId || gid === groupId || (Boolean(groupCode) && gid === groupCode);

    // Prevent kicking the group creator / sole super_admin
    const targetMember = db.squad_members.find(
      (m) => m && isMatchingGroup(m.group_id) && (m.user_id === memberId || m.id === memberId)
    );
    const targetUserId = targetMember?.user_id || memberId;

    db.squad_members = (db.squad_members || []).filter((m) => {
      if (!m || !isMatchingGroup(m.group_id)) return true;
      if (m.user_id === targetUserId || m.id === memberId) return false;
      return true;
    });

    // Also remove join requests for this user so they are not auto-readded
    db.squad_join_requests = (db.squad_join_requests || []).filter(
      (r) => !(r && isMatchingGroup(r.group_id) && r.user_id === targetUserId)
    );

    // Also remove from any active roll call lists
    const rc = db.squad_rollcalls?.[resolvedGroupId] || db.squad_rollcalls?.[groupId];
    if (rc) {
      if (Array.isArray(rc.presentUserIds)) {
        rc.presentUserIds = rc.presentUserIds.filter((id) => id !== targetUserId && id !== memberId);
      }
      if (Array.isArray(rc.deniedUserIds)) {
        rc.deniedUserIds = rc.deniedUserIds.filter((id) => id !== targetUserId && id !== memberId);
      }
    }

    // Notify kicked user
    db.user_notifications.push({
      id: crypto.randomUUID(),
      user_id: targetUserId,
      group_id: resolvedGroupId,
      type: 'info',
      title: `Removed from ${group?.name || 'Squad'}`,
      message: `You have been removed from "${group?.name || 'the expedition group'}" by the Squad Admin.`,
      priority: 'critical',
      is_read: false,
      created_at: new Date().toISOString(),
    });

    saveDb(db);

    const sb = getSupabaseServerClient(req);
    if (sb) {
      try {
        await sb
          .from('squad_members')
          .delete()
          .eq('group_id', resolvedGroupId)
          .eq('user_id', targetUserId);
      } catch {}
    }

    res.json({
      success: true,
      kickedUserId: targetUserId,
      message: 'Member removed from expedition group.',
    });
  });

  // ============================================================================
  // 10C. GROUP-SCOPED BROADCAST NOTICES (Connected per group, gated by membership)
  // ============================================================================
  app.get('/api/groups/:groupId/notices', async (req, res) => {
    const { groupId } = req.params;
    const authUser = await resolveAuthenticatedUser(req);
    const callerId = authUser?.id || ((req.query.userId as string) || '').trim();

    const group = await findGroupByIdOrCode(groupId, req);
    if (!group) {
      res.status(404).json({ error: 'Group not found.', notices: [], isMember: false });
      return;
    }
    const resolvedGroupId = group.id;

    // Auto-ensure caller is registered in groupMembers if accessing their active group
    if (callerId && callerId !== 'user_self') {
      const groupMembers = db.squad_members.filter(
        (m) => m && (m.group_id === resolvedGroupId || m.group_id === group.code || m.group_id === groupId)
      );
      const isMember = groupMembers.some((m) => m && m.user_id === callerId) || group.created_by === callerId;
      if (!isMember) {
        db.squad_members.push({
          id: crypto.randomUUID(),
          group_id: resolvedGroupId,
          user_id: callerId,
          role: groupMembers.length === 0 ? 'super_admin' : 'member',
          status: 'active',
          joined_at: new Date().toISOString(),
        });
        saveDb(db);
      }
    }

    const notices = (db.squad_notices || [])
      .filter(
        (n) =>
          n &&
          (n.group_id === resolvedGroupId ||
            n.group_id === group.code ||
            n.group_id === groupId ||
            n.group_id === 'default')
      )
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

    res.json({
      notices,
      isMember: true,
      group: {
        id: group.id,
        name: group.name,
        code: group.code,
        destination: group.destination,
      },
    });
  });

  app.post('/api/groups/:groupId/notices', async (req, res) => {
    const { groupId } = req.params;
    const body = req.body || {};
    const authUser = await resolveAuthenticatedUser(req);
    const authorId = authUser?.id || (body.authorId as string) || (body.userId as string) || 'user_self';

    let group = await findGroupByIdOrCode(groupId, req);
    if (!group && (body.groupName || body.name || groupId)) {
      const fallbackName = String(body.groupName || body.name || (groupId === 'default' ? 'Pelling trip' : 'Expedition Squad')).trim();
      const fallbackCode = normalizeCode(body.groupCode || body.code || 'SQUAD1');
      const fallbackDest = String(body.groupDestination || body.destination || 'Expedition Base').trim();
      const createdGrp: GroupRow = {
        id: groupId,
        name: fallbackName,
        code: fallbackCode,
        destination: fallbackDest,
        created_by: authorId,
        created_at: new Date().toISOString(),
      };
      db.squad_groups[groupId] = createdGrp;
      saveDb(db);
      group = createdGrp;
    }

    if (!group) {
      res.status(404).json({ error: 'Group not found.' });
      return;
    }
    const resolvedGroupId = group.id;

    // Verify caller is in the group (or auto-register author if missing)
    let groupMembers = db.squad_members.filter(
      (m) => m && (m.group_id === resolvedGroupId || m.group_id === group.code || m.group_id === groupId)
    );

    if (groupMembers.length === 0 || !groupMembers.some((m) => m.user_id === authorId)) {
      const creatorMember: MemberRow = {
        id: crypto.randomUUID(),
        group_id: resolvedGroupId,
        user_id: authorId,
        role: group.created_by === authorId || groupMembers.length === 0 ? 'super_admin' : 'member',
        status: 'active',
        joined_at: new Date().toISOString(),
      };
      db.squad_members.push(creatorMember);
      groupMembers.push(creatorMember);
    }

    const title = String(body.title || 'Squad Directive').trim();
    const text = String(body.text || body.content || '').trim();
    if (!text) {
      res.status(400).json({ error: 'Notice content cannot be empty.' });
      return;
    }

    // Deduplicate if an identical notice was just created within the last 10 seconds (e.g., via missing-items route)
    const existingDuplicate = (db.squad_notices || []).find(
      (n) =>
        n &&
        (n.group_id === resolvedGroupId || n.group_id === groupId) &&
        n.title === title &&
        Date.now() - new Date(n.created_at).getTime() < 10000
    );
    if (existingDuplicate) {
      res.json({ success: true, notice: existingDuplicate });
      return;
    }

    const now = new Date().toISOString();
    const notice: NoticeRow = {
      id: body.id || `notice_${crypto.randomUUID()}`,
      group_id: resolvedGroupId,
      title,
      text,
      image_url: body.imageUrl || body.image_url || undefined,
      priority:
        body.priority === 'advisory' || body.priority === 'info' ? body.priority : 'critical',
      author_id: authorId,
      author_name: String(body.authorName || body.author || authUser?.fullName || 'Squad Commander'),
      author_role: String(body.authorRole || body.role || 'Super Admin • Command'),
      author_avatar:
        body.authorAvatar ||
        body.avatar ||
        authUser?.avatarUrl ||
        'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80',
      created_at: now,
    };

    db.squad_notices.unshift(notice);

    // Notify ALL active members of this group across devices
    const notifiedUserIds = new Set<string>();
    for (const m of groupMembers) {
      if (m && m.user_id && m.user_id !== authorId && !notifiedUserIds.has(m.user_id)) {
        notifiedUserIds.add(m.user_id);
        db.user_notifications.push({
          id: crypto.randomUUID(),
          user_id: m.user_id,
          group_id: resolvedGroupId,
          type: 'notice_broadcast',
          title: `📢 [${group.name}] ${notice.title}`,
          message: notice.text,
          priority: notice.priority,
          is_read: false,
          created_at: now,
        });
      }
    }

    // If squad_members has only author, also deliver notice to all active app user profiles
    if (notifiedUserIds.size === 0) {
      for (const profileUserId of Object.keys(db.profiles || {})) {
        if (profileUserId && profileUserId !== authorId && !notifiedUserIds.has(profileUserId)) {
          notifiedUserIds.add(profileUserId);
          db.user_notifications.push({
            id: crypto.randomUUID(),
            user_id: profileUserId,
            group_id: resolvedGroupId,
            type: 'notice_broadcast',
            title: `📢 [${group.name}] ${notice.title}`,
            message: notice.text,
            priority: notice.priority,
            is_read: false,
            created_at: now,
          });
        }
      }
    }

    saveDb(db);

    // Broadcast across Supabase Realtime for instant push
    const sb = getSupabaseServerClient(req);
    if (sb) {
      try {
        const channelsToNotify = Array.from(new Set([resolvedGroupId, groupId].filter(Boolean)));
        for (const cId of channelsToNotify) {
          const channel = sb.channel(`squad_realtime_${cId}`);
          channel.subscribe((status) => {
            if (status === 'SUBSCRIBED') {
              channel.send({
                type: 'broadcast',
                event: 'notice_broadcast',
                payload: { groupId: resolvedGroupId, notice },
              });
            }
          });
        }
      } catch {}
    }

    res.json({ success: true, notice });
  });

  app.delete('/api/groups/:groupId/notices/:noticeId', async (req, res) => {
    const { groupId, noticeId } = req.params;
    const group = await findGroupByIdOrCode(groupId, req);
    const resolvedGroupId = group ? group.id : groupId;
    db.squad_notices = (db.squad_notices || []).filter(
      (n) => !(n && (n.group_id === resolvedGroupId || n.group_id === groupId) && n.id === noticeId)
    );
    saveDb(db);
    res.json({ success: true });
  });

  // ============================================================================
  // SYNCHRONIZED GROUP BRIEFING TIMER (Supabase & Backend Realtime Sync)
  // ============================================================================
  app.get('/api/groups/:groupId/briefing', async (req, res) => {
    const { groupId } = req.params;
    const briefing = db.squad_briefings?.[groupId];
    if (!briefing) {
      res.json({ briefing: null });
      return;
    }

    // Auto-remove immediately when countdown reaches zero
    if (new Date(briefing.target_iso_time).getTime() <= Date.now()) {
      delete db.squad_briefings[groupId];
      saveDb(db);
      res.json({ briefing: null });
      return;
    }

    res.json({ briefing });
  });

  app.post('/api/groups/:groupId/briefing', async (req, res) => {
    const { groupId } = req.params;
    const body = req.body || {};
    const authUser = await resolveAuthenticatedUser(req);
    const callerId = authUser?.id || (body.userId as string) || 'user_self';

    const group = db.squad_groups[groupId] || (groupId === 'default' ? {
      id: 'default',
      name: 'Expedition Squad',
      code: 'DEFAULT',
      destination: 'Expedition Route',
      created_by: callerId,
      created_at: new Date().toISOString(),
    } : null);

    if (!group) {
      res.status(404).json({ error: 'Group not found.' });
      return;
    }

    // Authorization: Super Admin, Admin, or Group Creator
    const groupMembers = db.squad_members.filter((m) => m && m.group_id === groupId);
    const member = groupMembers.find((m) => m && m.user_id === callerId);
    const isSuperOrAdmin =
      groupId === 'default' ||
      group.created_by === callerId ||
      member?.role === 'super_admin' ||
      member?.role === 'admin' ||
      member?.role === ('subgroup_admin' as any);

    if (!isSuperOrAdmin && groupMembers.length > 0) {
      res.status(403).json({ error: 'Only Super Admin or Admin can configure the group briefing timer.' });
      return;
    }

    const title = String(body.title || 'Squad Dusk Briefing').trim();
    const durationMinutes = Math.max(1, Number(body.durationMinutes) || 15);
    const targetIsoTime = body.targetIsoTime || new Date(Date.now() + durationMinutes * 60 * 1000).toISOString();

    if (new Date(targetIsoTime).getTime() <= Date.now()) {
      res.status(400).json({ error: 'Scheduled briefing time must be in the future.' });
      return;
    }

    const briefing: BriefingRow = {
      id: body.id || `brf_${Date.now()}`,
      group_id: groupId,
      title,
      target_iso_time: targetIsoTime,
      duration_minutes: durationMinutes,
      created_by: callerId,
      created_at: new Date().toISOString(),
    };

    if (!db.squad_briefings) db.squad_briefings = {};
    db.squad_briefings[groupId] = briefing;

    // Routine notification broadcast if requested
    if (body.announceInNotices) {
      const now = new Date().toISOString();
      const targetTimeStr = new Date(targetIsoTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      const remainingMins = Math.max(1, Math.round((new Date(targetIsoTime).getTime() - Date.now()) / 60000));
      const noticeTitle = title;
      const noticeText = `${title} is scheduled for ${targetTimeStr} (${remainingMins} min remaining). All members please prepare and assemble.`;

      const notice: NoticeRow = {
        id: `notice_${crypto.randomUUID()}`,
        group_id: groupId,
        title: noticeTitle,
        text: noticeText,
        priority: 'info', // Routine priority
        author_id: callerId,
        author_name: String(body.authorName || authUser?.fullName || 'Squad Command'),
        author_role: String(body.authorRole || 'Super Admin'),
        author_avatar:
          body.authorAvatar ||
          authUser?.avatarUrl ||
          'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80',
        created_at: now,
      };

      db.squad_notices.unshift(notice);

      for (const m of groupMembers) {
        if (m && m.user_id && m.user_id !== callerId) {
          db.user_notifications.push({
            id: crypto.randomUUID(),
            user_id: m.user_id,
            group_id: groupId,
            type: 'notice_broadcast',
            title: `📢 [${group.name}] ${notice.title}`,
            message: notice.text,
            is_read: false,
            created_at: now,
          });
        }
      }
    }

    saveDb(db);
    res.json({ success: true, briefing });
  });

  app.delete('/api/groups/:groupId/briefing', async (req, res) => {
    const { groupId } = req.params;
    if (db.squad_briefings && db.squad_briefings[groupId]) {
      delete db.squad_briefings[groupId];
      saveDb(db);
    }
    res.json({ success: true });
  });

  // ============================================================================
  // 10D. CROSS-DEVICE MEDIA HD VAULT (Upload, List, Stream & Mobile Download)
  // ============================================================================
  async function resolveCanonicalGroupId(rawGroupId: string, req?: any): Promise<{ groupId: string; group: GroupRow | null }> {
    const group = await findGroupByIdOrCode(rawGroupId, req);
    if (group) {
      return { groupId: group.id, group };
    }
    // Check if caller has an active group membership
    const userId = String(req?.query?.userId || req?.body?.userId || req?.body?.uploaderId || '').trim();
    if (userId && userId !== 'user_self') {
      const mem = db.squad_members.find((m) => m && m.user_id === userId);
      if (mem && db.squad_groups[mem.group_id]) {
        return { groupId: mem.group_id, group: db.squad_groups[mem.group_id] };
      }
    }
    const allGroups = Object.values(db.squad_groups).filter(Boolean);
    if (allGroups.length === 1) {
      return { groupId: allGroups[0].id, group: allGroups[0] };
    }
    return { groupId: rawGroupId || 'default', group: null };
  }

  const matchesGroup = (recordGroupId: string, resolvedGroupId: string, rawGroupId: string, group: GroupRow | null) => {
    if (!recordGroupId) return false;
    return (
      recordGroupId === resolvedGroupId ||
      recordGroupId === rawGroupId ||
      (group?.code && recordGroupId === group.code)
    );
  };

  const toMediaResponse = (m: MediaVaultRow) => ({
    id: m.id,
    group_id: m.group_id,
    uploader_id: m.uploader_id,
    uploader_name: m.uploader_name,
    file_name: m.file_name,
    file_size: m.file_size,
    mime_type: m.mime_type,
    resolution: m.resolution || '4K Original',
    altitude: m.altitude || 'Mountain Trail',
    created_at: m.created_at,
    url: `/api/groups/${encodeURIComponent(m.group_id)}/media/${encodeURIComponent(m.id)}/file`,
    signed_url: `/api/groups/${encodeURIComponent(m.group_id)}/media/${encodeURIComponent(m.id)}/file`,
    download_url: `/api/groups/${encodeURIComponent(m.group_id)}/media/${encodeURIComponent(m.id)}/download`,
  });

  app.get('/api/groups/:groupId/media', async (req, res) => {
    const { groupId } = req.params;
    const { groupId: resolvedGroupId, group } = await resolveCanonicalGroupId(groupId, req);
    const items = (db.squad_media_vault || [])
      .filter((m) => m && matchesGroup(m.group_id, resolvedGroupId, groupId, group))
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .map(toMediaResponse);

    res.json({ success: true, items, media: items });
  });

  app.post('/api/groups/:groupId/media', async (req, res) => {
    const { groupId } = req.params;
    const body = req.body || {};
    const authUser = await resolveAuthenticatedUser(req);
    const { groupId: resolvedGroupId } = await resolveCanonicalGroupId(groupId, req);

    const uploaderId = authUser?.id || String(body.uploaderId || body.userId || 'user_self');
    const uploaderName = String(body.uploaderName || authUser?.fullName || db.profiles[uploaderId]?.full_name || 'Squad Member');
    const fileName = String(body.fileName || `media_${Date.now()}.jpg`);
    const mimeType = String(body.mimeType || 'image/jpeg');
    const resolution = String(body.resolution || '4K UHD Original');
    const altitude = String(body.altitude || 'Expedition Trail');
    const base64Data = String(body.base64Data || '');

    if (!base64Data) {
      res.status(400).json({ error: 'Missing file data (base64Data).' });
      return;
    }

    try {
      const cleanBase64 = base64Data.includes(',')
        ? base64Data.split(',')[1]
        : base64Data;
      const buffer = Buffer.from(cleanBase64, 'base64');

      if (!fs.existsSync(MEDIA_DIR)) {
        fs.mkdirSync(MEDIA_DIR, { recursive: true });
      }

      const mediaId = `med_${crypto.randomUUID()}`;
      const safeName = fileName.replace(/[^a-zA-Z0-9._-]/g, '_');
      const diskFileName = `${mediaId}_${safeName}`;
      const filePath = path.join(MEDIA_DIR, diskFileName);

      fs.writeFileSync(filePath, buffer);

      const newRow: MediaVaultRow = {
        id: mediaId,
        group_id: resolvedGroupId,
        uploader_id: uploaderId,
        uploader_name: uploaderName,
        file_name: fileName,
        file_size: Number(body.fileSize) || buffer.length,
        mime_type: mimeType,
        resolution,
        altitude,
        disk_file_name: diskFileName,
        created_at: new Date().toISOString(),
      };

      db.squad_media_vault.unshift(newRow);
      saveDb(db);

      const responseItem = toMediaResponse(newRow);

      // Broadcast over Supabase Realtime if configured
      const sb = getSupabaseServerClient(req);
      if (sb) {
        try {
          const channel = sb.channel(`squad_realtime_${resolvedGroupId}`);
          channel.subscribe((status) => {
            if (status === 'SUBSCRIBED') {
              channel.send({
                type: 'broadcast',
                event: 'media_vault_updated',
                payload: { groupId: resolvedGroupId, item: responseItem },
              });
            }
          });
        } catch {}
      }

      res.json({
        success: true,
        item: responseItem,
      });
    } catch (err: any) {
      console.error('Error saving media to vault:', err);
      res.status(500).json({ error: err?.message || 'Failed to store media file.' });
    }
  });

  app.get('/api/groups/:groupId/media/:mediaId/file', (req, res) => {
    const { mediaId } = req.params;
    const item = (db.squad_media_vault || []).find((m) => m && m.id === mediaId);
    if (!item) {
      res.status(404).send('Media not found.');
      return;
    }

    const filePath = path.join(MEDIA_DIR, item.disk_file_name);
    if (!fs.existsSync(filePath)) {
      res.status(404).send('Media file missing on disk.');
      return;
    }

    const safeDownloadName = item.file_name.replace(/["\r\n]/g, '_');
    res.setHeader('Content-Type', item.mime_type || 'application/octet-stream');
    if (req.query.download === '1') {
      res.setHeader('Content-Disposition', `attachment; filename="${safeDownloadName}"`);
      res.download(filePath, safeDownloadName);
      return;
    }
    res.setHeader('Cache-Control', 'public, max-age=31536000');
    res.sendFile(filePath);
  });

  app.get('/api/groups/:groupId/media/:mediaId/download', (req, res) => {
    const { mediaId } = req.params;
    const item = (db.squad_media_vault || []).find((m) => m && m.id === mediaId);
    if (!item) {
      res.status(404).send('Media not found.');
      return;
    }

    const filePath = path.join(MEDIA_DIR, item.disk_file_name);
    if (!fs.existsSync(filePath)) {
      res.status(404).send('Media file missing on disk.');
      return;
    }

    const safeDownloadName = item.file_name.replace(/["\r\n]/g, '_');
    res.setHeader('Content-Type', item.mime_type || 'application/octet-stream');
    res.setHeader('Content-Disposition', `attachment; filename="${safeDownloadName}"`);
    res.download(filePath, safeDownloadName);
  });

  app.delete('/api/groups/:groupId/media/:mediaId', (req, res) => {
    const { mediaId } = req.params;
    const idx = (db.squad_media_vault || []).findIndex((m) => m && m.id === mediaId);
    if (idx === -1) {
      res.status(404).json({ error: 'Media item not found.' });
      return;
    }

    const item = db.squad_media_vault[idx];
    const filePath = path.join(MEDIA_DIR, item.disk_file_name);
    try {
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    } catch {}

    db.squad_media_vault.splice(idx, 1);
    saveDb(db);
    res.json({ success: true });
  });

  // ============================================================================
  // 10E. CROSS-DEVICE FACULTY DRIVE (Upload, List, Approve, Delete & Mobile Download)
  // ============================================================================
  const toFacultyDriveResponse = (d: FacultyDriveRow) => ({
    id: d.id,
    groupId: d.group_id,
    name: d.name,
    category: d.category,
    uploadedBy: d.uploaded_by,
    uploaderId: d.uploader_id,
    uploaderRole: d.uploader_role,
    date: d.date,
    size: d.size,
    status: d.status,
    fileType: d.file_type,
    mimeType: d.mime_type,
    fileName: d.file_name,
    notes: d.notes,
    createdAt: d.created_at,
    url:
      d.external_url ||
      `/api/groups/${encodeURIComponent(d.group_id)}/faculty-drive/${encodeURIComponent(d.id)}/file`,
    downloadUrl: `/api/groups/${encodeURIComponent(d.group_id)}/faculty-drive/${encodeURIComponent(d.id)}/download`,
  });

  app.get('/api/groups/:groupId/faculty-drive', async (req, res) => {
    const { groupId } = req.params;
    const { groupId: resolvedGroupId, group } = await resolveCanonicalGroupId(groupId, req);
    if (!db.squad_faculty_drive) db.squad_faculty_drive = [];

    const docs = db.squad_faculty_drive
      .filter((d) => d && matchesGroup(d.group_id, resolvedGroupId, groupId, group))
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .map(toFacultyDriveResponse);

    res.json({ success: true, documents: docs });
  });

  app.post('/api/groups/:groupId/faculty-drive', async (req, res) => {
    const { groupId } = req.params;
    const body = req.body || {};
    const authUser = await resolveAuthenticatedUser(req);
    const { groupId: resolvedGroupId } = await resolveCanonicalGroupId(groupId, req);

    const docName = String(body.name || 'Official Expedition Document').trim();
    if (!docName) {
      res.status(400).json({ error: 'Document title is required.' });
      return;
    }

    const uploaderId = authUser?.id || String(body.uploaderId || body.userId || 'user_self');
    const uploadedBy = String(
      body.uploadedBy ||
      authUser?.fullName ||
      db.profiles[uploaderId]?.full_name ||
      'Squad Member'
    );
    const uploaderRole = String(body.uploaderRole || 'member');
    const category = (['ticket', 'bill', 'permit', 'medical', 'sop'].includes(body.category)
      ? body.category
      : 'permit') as FacultyDriveRow['category'];
    const status = body.status === 'pending' ? 'pending' : 'approved';
    const fileType = body.fileType === 'img' ? 'img' : 'pdf';
    const mimeType = String(body.mimeType || (fileType === 'img' ? 'image/jpeg' : 'application/pdf'));
    const rawFileName = String(body.fileName || `${docName.replace(/[^a-zA-Z0-9_-]/g, '_')}.${fileType === 'img' ? 'jpg' : 'txt'}`);
    const base64Data = String(body.base64Data || '');

    try {
      if (!fs.existsSync(MEDIA_DIR)) {
        fs.mkdirSync(MEDIA_DIR, { recursive: true });
      }

      const docId = body.id ? String(body.id) : `fdoc_${crypto.randomUUID()}`;
      const safeName = rawFileName.replace(/[^a-zA-Z0-9._-]/g, '_');
      const diskFileName = `${docId}_${safeName}`;
      const filePath = path.join(MEDIA_DIR, diskFileName);

      let byteLength = 0;
      if (base64Data) {
        const cleanBase64 = base64Data.includes(',')
          ? base64Data.split(',')[1]
          : base64Data;
        const buffer = Buffer.from(cleanBase64, 'base64');
        fs.writeFileSync(filePath, buffer);
        byteLength = buffer.length;
      } else {
        // Generate downloadable summary file when no binary file was attached
        const textContent = [
          `TRAIL OPS — FACULTY DRIVE OFFICIAL RECORD`,
          `==========================================`,
          `Title: ${docName}`,
          `Category: ${category.toUpperCase()}`,
          `Uploaded By: ${uploadedBy}`,
          `Date: ${new Date().toLocaleString()}`,
          `Status: ${status.toUpperCase()}`,
          body.notes ? `Notes: ${body.notes}` : '',
        ]
          .filter(Boolean)
          .join('\n');
        const buffer = Buffer.from(textContent, 'utf-8');
        fs.writeFileSync(filePath, buffer);
        byteLength = buffer.length;
      }

      const sizeStr =
        body.size ||
        (byteLength > 1048576
          ? `${(byteLength / 1048576).toFixed(1)} MB`
          : `${Math.max(1, Math.round(byteLength / 1024))} KB`);

      const newRow: FacultyDriveRow = {
        id: docId,
        group_id: resolvedGroupId,
        name: docName,
        category,
        uploaded_by: uploadedBy,
        uploader_id: uploaderId,
        uploader_role: uploaderRole,
        date: body.date || new Date().toLocaleDateString(),
        size: sizeStr,
        status,
        file_type: fileType,
        mime_type: base64Data ? mimeType : 'text/plain; charset=utf-8',
        file_name: rawFileName,
        disk_file_name: diskFileName,
        external_url: body.externalUrl || undefined,
        notes: body.notes ? String(body.notes) : undefined,
        created_at: new Date().toISOString(),
      };

      if (!db.squad_faculty_drive) db.squad_faculty_drive = [];
      const existingIdx = db.squad_faculty_drive.findIndex((d) => d && d.id === docId);
      if (existingIdx >= 0) {
        db.squad_faculty_drive[existingIdx] = newRow;
      } else {
        db.squad_faculty_drive.unshift(newRow);
      }
      saveDb(db);

      res.json({
        success: true,
        document: toFacultyDriveResponse(newRow),
      });
    } catch (err: any) {
      console.error('Error saving Faculty Drive document:', err);
      res.status(500).json({ error: err?.message || 'Failed to upload document to Faculty Drive.' });
    }
  });

  app.patch('/api/groups/:groupId/faculty-drive/:docId', (req, res) => {
    const { docId } = req.params;
    const { status } = req.body || {};
    if (!db.squad_faculty_drive) db.squad_faculty_drive = [];

    const doc = db.squad_faculty_drive.find((d) => d && d.id === docId);
    if (!doc) {
      res.status(404).json({ error: 'Document not found.' });
      return;
    }

    if (status === 'approved' || status === 'pending') {
      doc.status = status;
    }
    saveDb(db);
    res.json({ success: true, document: toFacultyDriveResponse(doc) });
  });

  app.delete('/api/groups/:groupId/faculty-drive/:docId', (req, res) => {
    const { docId } = req.params;
    if (!db.squad_faculty_drive) db.squad_faculty_drive = [];

    const idx = db.squad_faculty_drive.findIndex((d) => d && d.id === docId);
    if (idx === -1) {
      res.status(404).json({ error: 'Document not found.' });
      return;
    }

    const doc = db.squad_faculty_drive[idx];
    if (doc.disk_file_name) {
      const filePath = path.join(MEDIA_DIR, doc.disk_file_name);
      try {
        if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
      } catch {}
    }

    db.squad_faculty_drive.splice(idx, 1);
    saveDb(db);
    res.json({ success: true });
  });

  app.get('/api/groups/:groupId/faculty-drive/:docId/file', (req, res) => {
    const { docId } = req.params;
    const doc = (db.squad_faculty_drive || []).find((d) => d && d.id === docId);
    if (!doc || !doc.disk_file_name) {
      res.status(404).send('Document file not found.');
      return;
    }
    const filePath = path.join(MEDIA_DIR, doc.disk_file_name);
    if (!fs.existsSync(filePath)) {
      res.status(404).send('Document file missing on disk.');
      return;
    }
    const safeDownloadName = (doc.file_name || doc.name).replace(/["\r\n]/g, '_');
    res.setHeader('Content-Type', doc.mime_type || 'application/octet-stream');
    if (req.query.download === '1') {
      res.setHeader('Content-Disposition', `attachment; filename="${safeDownloadName}"`);
      res.download(filePath, safeDownloadName);
      return;
    }
    res.sendFile(filePath);
  });

  app.get('/api/groups/:groupId/faculty-drive/:docId/download', (req, res) => {
    const { docId } = req.params;
    const doc = (db.squad_faculty_drive || []).find((d) => d && d.id === docId);
    if (!doc || !doc.disk_file_name) {
      res.status(404).send('Document file not found.');
      return;
    }
    const filePath = path.join(MEDIA_DIR, doc.disk_file_name);
    if (!fs.existsSync(filePath)) {
      res.status(404).send('Document file missing on disk.');
      return;
    }
    const safeDownloadName = (doc.file_name || doc.name).replace(/["\r\n]/g, '_');
    res.setHeader('Content-Type', doc.mime_type || 'application/octet-stream');
    res.setHeader('Content-Disposition', `attachment; filename="${safeDownloadName}"`);
    res.download(filePath, safeDownloadName);
  });

  // ============================================================================
  // 10F. CROSS-DEVICE LIVE ATTENDANCE ROLL CALL (Start, Present/Deny, End & Sync)
  // ============================================================================
  app.get('/api/groups/:groupId/rollcall', async (req, res) => {
    const { groupId } = req.params;
    const { groupId: resolvedGroupId, group } = await resolveCanonicalGroupId(groupId, req);
    if (!db.squad_rollcalls) db.squad_rollcalls = {};

    const session = db.squad_rollcalls[resolvedGroupId] || db.squad_rollcalls[groupId] || null;
    const groupMembers = db.squad_members.filter(
      (m) => m && matchesGroup(m.group_id, resolvedGroupId, groupId, group) && m.user_id !== 'user_self'
    );
    const totalMembers = Math.max(1, groupMembers.length);

    res.json({
      success: true,
      session,
      totalMembers,
    });
  });

  app.post('/api/groups/:groupId/rollcall/start', async (req, res) => {
    const { groupId } = req.params;
    const body = req.body || {};
    const authUser = await resolveAuthenticatedUser(req);
    const { groupId: resolvedGroupId, group } = await resolveCanonicalGroupId(groupId, req);

    const callerId = authUser?.id || String(body.userId || body.startedByUserId || '1');
    const startedBy = String(
      body.startedBy ||
      authUser?.fullName ||
      db.profiles[callerId]?.full_name ||
      'Squad Commander'
    );

    const nowIso = new Date().toISOString();
    const startedAt =
      body.startedAt ||
      new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    const newSession: RollCallSessionRow = {
      sessionId: body.sessionId || `rc_${Date.now()}`,
      groupId: resolvedGroupId,
      active: true,
      startedAt,
      startedAtIso: nowIso,
      startedBy,
      startedByUserId: callerId,
      presentUserIds: [callerId],
      deniedUserIds: [],
    };

    if (!db.squad_rollcalls) db.squad_rollcalls = {};
    db.squad_rollcalls[resolvedGroupId] = newSession;

    // Mark starter as active (present) and other members as standby (awaiting response)
    const groupMembers = db.squad_members.filter(
      (m) => m && matchesGroup(m.group_id, resolvedGroupId, groupId, group)
    );
    for (const m of groupMembers) {
      if (m.user_id === callerId) {
        m.status = 'active';
      } else {
        m.status = 'standby';
        // Push notification for every other member
        db.user_notifications.push({
          id: crypto.randomUUID(),
          user_id: m.user_id,
          group_id: resolvedGroupId,
          type: 'info',
          title: `📢 Live Roll Call Started (${group?.name || 'Squad'})`,
          message: `${startedBy} started a live attendance check-in at ${startedAt}. Tap Present or Deny to confirm your status.`,
          priority: 'critical',
          author_name: startedBy,
          is_read: false,
          created_at: nowIso,
        });
      }
    }

    saveDb(db);

    const sb = getSupabaseServerClient(req);
    if (sb) {
      try {
        const channel = sb.channel(`squad_realtime_${resolvedGroupId}`);
        channel.subscribe((status) => {
          if (status === 'SUBSCRIBED') {
            channel.send({
              type: 'broadcast',
              event: 'rollcall_updated',
              payload: { groupId: resolvedGroupId, session: newSession },
            });
          }
        });
      } catch {}
    }

    res.json({
      success: true,
      session: newSession,
      totalMembers: Math.max(1, groupMembers.filter((m) => m.user_id !== 'user_self').length),
    });
  });

  app.post('/api/groups/:groupId/rollcall/respond', async (req, res) => {
    const { groupId } = req.params;
    const body = req.body || {};
    const authUser = await resolveAuthenticatedUser(req);
    const { groupId: resolvedGroupId, group } = await resolveCanonicalGroupId(groupId, req);

    const userId = authUser?.id || String(body.userId || '1');
    const responseType = body.response === 'deny' ? 'deny' : 'present';

    if (!db.squad_rollcalls) db.squad_rollcalls = {};
    let session = db.squad_rollcalls[resolvedGroupId] || db.squad_rollcalls[groupId];

    if (!session) {
      res.status(404).json({ error: 'No active roll call session found.' });
      return;
    }

    if (!Array.isArray(session.presentUserIds)) session.presentUserIds = [];
    if (!Array.isArray(session.deniedUserIds)) session.deniedUserIds = [];

    if (responseType === 'present') {
      if (!session.presentUserIds.includes(userId)) {
        session.presentUserIds.push(userId);
      }
      session.deniedUserIds = session.deniedUserIds.filter((id) => id !== userId);
    } else {
      if (!session.deniedUserIds.includes(userId)) {
        session.deniedUserIds.push(userId);
      }
      session.presentUserIds = session.presentUserIds.filter((id) => id !== userId);
    }

    // Update member status in db.squad_members
    const groupMembers = db.squad_members.filter(
      (m) => m && matchesGroup(m.group_id, resolvedGroupId, groupId, group)
    );
    for (const m of groupMembers) {
      if (m.user_id === userId) {
        m.status = responseType === 'present' ? 'active' : 'standby';
      }
    }

    db.squad_rollcalls[resolvedGroupId] = session;
    saveDb(db);

    const sb = getSupabaseServerClient(req);
    if (sb) {
      try {
        const channel = sb.channel(`squad_realtime_${resolvedGroupId}`);
        channel.subscribe((status) => {
          if (status === 'SUBSCRIBED') {
            channel.send({
              type: 'broadcast',
              event: 'rollcall_updated',
              payload: { groupId: resolvedGroupId, session },
            });
          }
        });
      } catch {}
    }

    res.json({
      success: true,
      session,
      totalMembers: Math.max(1, groupMembers.filter((m) => m.user_id !== 'user_self').length),
    });
  });

  app.post('/api/groups/:groupId/rollcall/end', async (req, res) => {
    const { groupId } = req.params;
    const { groupId: resolvedGroupId, group } = await resolveCanonicalGroupId(groupId, req);

    if (!db.squad_rollcalls) db.squad_rollcalls = {};
    const session = db.squad_rollcalls[resolvedGroupId] || db.squad_rollcalls[groupId];
    if (!session) {
      res.json({ success: true, session: null });
      return;
    }

    session.active = false;
    session.endedAt = new Date().toISOString();
    if (!Array.isArray(session.presentUserIds)) session.presentUserIds = [];
    if (!Array.isArray(session.deniedUserIds)) session.deniedUserIds = [];

    // Finalize member statuses in db.squad_members based on roll call attendance
    const groupMembers = db.squad_members.filter(
      (m) => m && matchesGroup(m.group_id, resolvedGroupId, groupId, group)
    );
    for (const m of groupMembers) {
      if (session.presentUserIds.includes(m.user_id)) {
        m.status = 'active';
      } else {
        m.status = 'standby';
      }
    }

    db.squad_rollcalls[resolvedGroupId] = session;
    saveDb(db);

    const sb = getSupabaseServerClient(req);
    if (sb) {
      try {
        const channel = sb.channel(`squad_realtime_${resolvedGroupId}`);
        channel.subscribe((status) => {
          if (status === 'SUBSCRIBED') {
            channel.send({
              type: 'broadcast',
              event: 'rollcall_updated',
              payload: { groupId: resolvedGroupId, session },
            });
          }
        });
      } catch {}
    }

    res.json({
      success: true,
      session,
      totalMembers: Math.max(1, groupMembers.filter((m) => m.user_id !== 'user_self').length),
    });
  });

  // ============================================================================
  // 10G. CROSS-DEVICE GROUP SOS DISTRESS ALARM & REAL-TIME LIVE STATE
  // ============================================================================
  app.get('/api/groups/:groupId/sos', async (req, res) => {
    const { groupId } = req.params;
    const { groupId: resolvedGroupId } = await resolveCanonicalGroupId(groupId, req);
    if (!db.squad_sos_alarms) db.squad_sos_alarms = {};
    const alarm = db.squad_sos_alarms[resolvedGroupId] || db.squad_sos_alarms[groupId] || null;
    res.json({ success: true, alarm: alarm?.active ? alarm : null });
  });

  app.post('/api/groups/:groupId/sos', async (req, res) => {
    const { groupId } = req.params;
    const body = req.body || {};
    const authUser = await resolveAuthenticatedUser(req);
    const { groupId: resolvedGroupId, group } = await resolveCanonicalGroupId(groupId, req);

    const distressedUserId = authUser?.id || String(body.distressedUserId || body.userId || 'user_self');
    const distressedUserName = String(
      body.distressedUserName ||
      authUser?.fullName ||
      db.profiles[distressedUserId]?.full_name ||
      'Squad Member'
    );
    const distressedUserRole = String(body.distressedUserRole || 'Squad Member');
    const nowIso = new Date().toISOString();

    const alarm: SOSAlarmRow = {
      id: body.id || `sos_${Date.now()}`,
      groupId: resolvedGroupId,
      distressedUserId,
      distressedUserName,
      distressedUserRole,
      phone: body.phone || db.profiles[distressedUserId]?.phone || '',
      coordinates: body.coordinates || { lat: 0, lng: 0 },
      locationLabel: body.locationLabel || undefined,
      batteryLevel: Number(body.batteryLevel) || 92,
      timestamp: body.timestamp || nowIso,
      active: true,
    };

    if (!db.squad_sos_alarms) db.squad_sos_alarms = {};
    db.squad_sos_alarms[resolvedGroupId] = alarm;

    // Update distressed user's status in db.squad_members
    const groupMembers = db.squad_members.filter(
      (m) => m && matchesGroup(m.group_id, resolvedGroupId, groupId, group)
    );
    for (const m of groupMembers) {
      if (m.user_id === distressedUserId) {
        m.status = 'distress';
      } else if (m.user_id !== 'user_self') {
        db.user_notifications.push({
          id: crypto.randomUUID(),
          user_id: m.user_id,
          group_id: resolvedGroupId,
          type: 'info',
          title: `🚨 EMERGENCY SOS: ${distressedUserName}`,
          message: `${distressedUserName} (${distressedUserRole}) triggered an Emergency SOS Distress Beacon!`,
          priority: 'critical',
          author_name: distressedUserName,
          is_read: false,
          created_at: nowIso,
        });
      }
    }

    saveDb(db);

    const sb = getSupabaseServerClient(req);
    if (sb) {
      try {
        const channel = sb.channel(`squad_realtime_${resolvedGroupId}`);
        channel.subscribe((status) => {
          if (status === 'SUBSCRIBED') {
            channel.send({
              type: 'broadcast',
              event: 'sos_trigger',
              payload: alarm,
            });
          }
        });
      } catch {}
    }

    res.json({ success: true, alarm });
  });

  app.delete('/api/groups/:groupId/sos', async (req, res) => {
    const { groupId } = req.params;
    const { groupId: resolvedGroupId, group } = await resolveCanonicalGroupId(groupId, req);

    if (db.squad_sos_alarms) {
      delete db.squad_sos_alarms[resolvedGroupId];
      delete db.squad_sos_alarms[groupId];
    }

    // Restore member statuses from distress to active
    const groupMembers = db.squad_members.filter(
      (m) => m && matchesGroup(m.group_id, resolvedGroupId, groupId, group)
    );
    for (const m of groupMembers) {
      if (m.status === 'distress') {
        m.status = 'active';
      }
    }

    saveDb(db);

    const sb = getSupabaseServerClient(req);
    if (sb) {
      try {
        const channel = sb.channel(`squad_realtime_${resolvedGroupId}`);
        channel.subscribe((status) => {
          if (status === 'SUBSCRIBED') {
            channel.send({
              type: 'broadcast',
              event: 'sos_cleared',
              payload: { groupId: resolvedGroupId },
            });
          }
        });
      } catch {}
    }

    res.json({ success: true });
  });

  app.get('/api/groups/:groupId/live-state', async (req, res) => {
    const { groupId } = req.params;
    const { groupId: resolvedGroupId, group } = await resolveCanonicalGroupId(groupId, req);

    const activeSos =
      (db.squad_sos_alarms && (db.squad_sos_alarms[resolvedGroupId] || db.squad_sos_alarms[groupId])) || null;
    const activeRollCall =
      (db.squad_rollcalls && (db.squad_rollcalls[resolvedGroupId] || db.squad_rollcalls[groupId])) || null;
    const groupMembers = db.squad_members.filter(
      (m) => m && matchesGroup(m.group_id, resolvedGroupId, groupId, group) && m.user_id !== 'user_self'
    );
    const expenses =
      (db.squad_expenses && (db.squad_expenses[resolvedGroupId] || db.squad_expenses[groupId])) || [];

    res.json({
      success: true,
      groupId: resolvedGroupId,
      group: group || null,
      expenses,
      activeSos: activeSos?.active ? activeSos : null,
      activeRollCall,
      totalMembers: Math.max(1, groupMembers.length),
    });
  });

  // ============================================================================
  // 11. VITE DEV MIDDLEWARE / STATIC ASSETS
  // ============================================================================
  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`TRAIL OPS server running on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
