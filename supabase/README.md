# TRAIL OPS — Supabase Production Database Setup Guide

This guide provides step-by-step instructions to configure and verify your Supabase project for TRAIL OPS.

---

## 1. Apply Database Migrations in Supabase

1. Open your [Supabase Dashboard](https://supabase.com/dashboard).
2. Select your project.
3. In the left navigation, click **SQL Editor**.
4. Click **New query**.
5. Copy and paste the entire contents of `supabase/migrations/20261018000001_trailops_production_schema.sql` into the SQL Editor.
6. Click **Run** (or press Ctrl+Enter / Cmd+Enter).
7. Confirm that the query returns `Success. No rows returned` or creates:
   - `public.profiles`
   - `public.squad_groups`
   - `public.squad_members`
   - `public.train_journeys`
   - `public.train_seat_assignments`
   - `public.media_vault_items`
   - Storage bucket `trailops-media` (Private, 50MB per file limit)
   - Function & Trigger `tr_check_role_change` preventing self-promotion
   - Realtime enabled for `squad_members`, `media_vault_items`, `train_journeys`, and `train_seat_assignments`

---

## 2. Retrieve Project URL & Anon Key

1. In your Supabase Dashboard, click **Project Settings** (gear icon at bottom left).
2. Under Configuration, click **API**.
3. Copy:
   - **Project URL** (e.g. `https://xyzproject.supabase.co`)
   - **Project API Keys** -> `anon` / `public` key (e.g. `eyJhbGciOi...`)

---

## 3. Configure in TRAIL OPS

### Option A: Via Environment Variables
Add to your `.env` or deployment environment:
```env
VITE_SUPABASE_URL="https://xyzproject.supabase.co"
VITE_SUPABASE_ANON_KEY="eyJhbGciOi..."
```

### Option B: Via In-App Setup Modal
Launch TRAIL OPS. If credentials are not detected in environment variables, an in-app **Supabase Connection Modal** will prompt you to enter the Project URL and Anon Key directly, testing connectivity instantly.

---

## 4. Verification Checklist

1. **Sign-up Test**: Create Account A (`leader@example.com`). Confirm profile is inserted into `public.profiles`.
2. **Squad Creation**: Create a squad. Confirm record in `public.squad_groups` and membership in `public.squad_members` with role `super_admin`.
3. **Multi-User Isolation**: Sign in with Account B (`member@example.com`). Confirm empty squad list (zero demo records).
4. **WhatsApp/Deep Link Join**: Open `/?join=CODE` with Account B, confirm and join. Confirm membership in `public.squad_members` with role `member`.
5. **Role Escalation Prevention**: Test role update from member account. Confirm trigger blocks self-promotion.
6. **Private 4K Media Vault**: Upload a high-res photo. Confirm file in `trailops-media` private storage bucket and accessible via signed URLs.
