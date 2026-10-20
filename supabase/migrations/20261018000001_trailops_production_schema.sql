-- ==============================================================================
-- TRAIL OPS — PRODUCTION DATABASE SCHEMA & ROW LEVEL SECURITY (RLS) MIGRATION
-- Migration: 20261018000001_trailops_production_schema.sql
-- ==============================================================================

-- 1. EXTENSIONS & CUSTOM TYPES
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

DO $$ BEGIN
  CREATE TYPE member_role AS ENUM ('super_admin', 'admin', 'member', 'faculty');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE member_status AS ENUM ('active', 'standby', 'distress');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE journey_direction AS ENUM ('onward', 'return');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- 2. TABLE: public.profiles
-- Stores individual user profiles isolated by authenticated user ID (auth.users.id)
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT NOT NULL DEFAULT '',
  avatar_url TEXT DEFAULT '',
  phone TEXT DEFAULT '',
  date_of_birth TEXT DEFAULT '',
  age INTEGER DEFAULT 0,
  gender TEXT DEFAULT '',
  blood_group TEXT DEFAULT '',
  medical_conditions TEXT DEFAULT '',
  emergency_contact_name TEXT DEFAULT '',
  emergency_contact_phone TEXT DEFAULT '',
  gear_checklist JSONB DEFAULT '[]'::jsonb,
  is_profile_complete BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Profiles Policies
CREATE POLICY "Users can insert their own profile"
  ON public.profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Authenticated users can view public profile details of members"
  ON public.profiles FOR SELECT
  USING (auth.role() = 'authenticated');

-- 3. TABLE: public.squad_groups
-- Stores expedition squads with unique 6-character invitation codes
CREATE TABLE IF NOT EXISTS public.squad_groups (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  code TEXT NOT NULL UNIQUE,
  destination TEXT NOT NULL DEFAULT '',
  start_date DATE,
  end_date DATE,
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_squad_groups_code ON public.squad_groups(code);
CREATE INDEX IF NOT EXISTS idx_squad_groups_created_by ON public.squad_groups(created_by);

ALTER TABLE public.squad_groups ENABLE ROW LEVEL SECURITY;

-- Squad Groups Policies
CREATE POLICY "Authenticated users can view squad groups they belong to or during join verification"
  ON public.squad_groups FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can create squad groups"
  ON public.squad_groups FOR INSERT
  WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Squad super_admin can update squad groups"
  ON public.squad_groups FOR UPDATE
  USING (
    auth.uid() = created_by OR
    EXISTS (
      SELECT 1 FROM public.squad_members
      WHERE squad_members.group_id = squad_groups.id
        AND squad_members.user_id = auth.uid()
        AND squad_members.role = 'super_admin'
    )
  );

CREATE POLICY "Squad creator can delete squad group"
  ON public.squad_groups FOR DELETE
  USING (auth.uid() = created_by);

-- 4. TABLE: public.squad_members
-- Maps users to squads with role and real-time status telemetry
CREATE TABLE IF NOT EXISTS public.squad_members (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  group_id UUID NOT NULL REFERENCES public.squad_groups(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role member_role NOT NULL DEFAULT 'member',
  status member_status NOT NULL DEFAULT 'active',
  joined_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  CONSTRAINT unique_group_user UNIQUE (group_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_squad_members_group_id ON public.squad_members(group_id);
CREATE INDEX IF NOT EXISTS idx_squad_members_user_id ON public.squad_members(user_id);

ALTER TABLE public.squad_members ENABLE ROW LEVEL SECURITY;

-- Anti-Self Promotion Trigger Function
CREATE OR REPLACE FUNCTION public.check_role_change()
RETURNS TRIGGER AS $$
BEGIN
  -- Prevent regular members from promoting themselves or others
  IF NEW.role != OLD.role THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.squad_members
      WHERE group_id = OLD.group_id
        AND user_id = auth.uid()
        AND role IN ('super_admin', 'admin')
    ) THEN
      RAISE EXCEPTION 'Access Denied: Only squad administrators can modify member roles.';
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS tr_check_role_change ON public.squad_members;
CREATE TRIGGER tr_check_role_change
  BEFORE UPDATE ON public.squad_members
  FOR EACH ROW
  EXECUTE FUNCTION public.check_role_change();

-- Squad Members Policies
CREATE POLICY "Squad members can view members of their groups"
  ON public.squad_members FOR SELECT
  USING (
    auth.role() = 'authenticated' AND (
      user_id = auth.uid() OR
      EXISTS (
        SELECT 1 FROM public.squad_members sm2
        WHERE sm2.group_id = squad_members.group_id
          AND sm2.user_id = auth.uid()
      )
    )
  );

CREATE POLICY "Users can join a squad as member"
  ON public.squad_members FOR INSERT
  WITH CHECK (
    auth.uid() = user_id
  );

CREATE POLICY "Members can update their own status or admins can update roles"
  ON public.squad_members FOR UPDATE
  USING (
    user_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM public.squad_members sm2
      WHERE sm2.group_id = squad_members.group_id
        AND sm2.user_id = auth.uid()
        AND sm2.role IN ('super_admin', 'admin')
    )
  );

CREATE POLICY "Super admin or user themselves can leave/remove from squad"
  ON public.squad_members FOR DELETE
  USING (
    user_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM public.squad_members sm2
      WHERE sm2.group_id = squad_members.group_id
        AND sm2.user_id = auth.uid()
        AND sm2.role = 'super_admin'
    )
  );

-- 5. TABLE: public.train_journeys
-- Manages railway itinerary for onward and return journeys
CREATE TABLE IF NOT EXISTS public.train_journeys (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  group_id UUID NOT NULL REFERENCES public.squad_groups(id) ON DELETE CASCADE,
  direction journey_direction NOT NULL DEFAULT 'onward',
  train_name TEXT NOT NULL,
  train_number TEXT NOT NULL,
  boarding_station TEXT NOT NULL,
  destination_station TEXT NOT NULL,
  departure_time TIMESTAMPTZ NOT NULL,
  arrival_time TIMESTAMPTZ,
  intermediate_halts JSONB DEFAULT '[]'::jsonb,
  coaches TEXT[] DEFAULT ARRAY[]::text[],
  notes TEXT DEFAULT '',
  created_by UUID REFERENCES auth.users(id),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  CONSTRAINT unique_group_direction UNIQUE (group_id, direction)
);

CREATE INDEX IF NOT EXISTS idx_train_journeys_group ON public.train_journeys(group_id);

ALTER TABLE public.train_journeys ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Squad members can view train journeys"
  ON public.train_journeys FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.squad_members
      WHERE squad_members.group_id = train_journeys.group_id
        AND squad_members.user_id = auth.uid()
    )
  );

CREATE POLICY "Admins can manage train journeys"
  ON public.train_journeys FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.squad_members
      WHERE squad_members.group_id = train_journeys.group_id
        AND squad_members.user_id = auth.uid()
        AND squad_members.role IN ('super_admin', 'admin')
    )
  );

-- 6. TABLE: public.train_seat_assignments
-- Coach and Berth assignment per squad member
CREATE TABLE IF NOT EXISTS public.train_seat_assignments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  journey_id UUID NOT NULL REFERENCES public.train_journeys(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  coach TEXT NOT NULL,
  berth_number TEXT NOT NULL,
  berth_type TEXT NOT NULL DEFAULT 'LB',
  notes TEXT DEFAULT '',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  CONSTRAINT unique_journey_user UNIQUE (journey_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_seat_assignments_journey ON public.train_seat_assignments(journey_id);

ALTER TABLE public.train_seat_assignments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Squad members can view seat assignments"
  ON public.train_seat_assignments FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.train_journeys tj
      JOIN public.squad_members sm ON sm.group_id = tj.group_id
      WHERE tj.id = train_seat_assignments.journey_id
        AND sm.user_id = auth.uid()
    )
  );

CREATE POLICY "Admins can manage seat assignments"
  ON public.train_seat_assignments FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.train_journeys tj
      JOIN public.squad_members sm ON sm.group_id = tj.group_id
      WHERE tj.id = train_seat_assignments.journey_id
        AND sm.user_id = auth.uid()
        AND sm.role IN ('super_admin', 'admin')
    )
  );

-- 7. TABLE: public.media_vault_items
-- Metadata for original-resolution 4K photos and expedition videos
CREATE TABLE IF NOT EXISTS public.media_vault_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  group_id UUID NOT NULL REFERENCES public.squad_groups(id) ON DELETE CASCADE,
  uploader_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  uploader_name TEXT NOT NULL,
  file_name TEXT NOT NULL,
  storage_path TEXT NOT NULL,
  file_size BIGINT NOT NULL DEFAULT 0,
  mime_type TEXT NOT NULL DEFAULT 'image/jpeg',
  resolution TEXT DEFAULT '4K UHD',
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_media_vault_group ON public.media_vault_items(group_id);

ALTER TABLE public.media_vault_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Squad members can view media items of their group"
  ON public.media_vault_items FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.squad_members
      WHERE squad_members.group_id = media_vault_items.group_id
        AND squad_members.user_id = auth.uid()
    )
  );

CREATE POLICY "Squad members can insert media items into their group"
  ON public.media_vault_items FOR INSERT
  WITH CHECK (
    auth.uid() = uploader_id AND
    EXISTS (
      SELECT 1 FROM public.squad_members
      WHERE squad_members.group_id = media_vault_items.group_id
        AND squad_members.user_id = auth.uid()
    )
  );

CREATE POLICY "Uploader or squad admin can delete media items"
  ON public.media_vault_items FOR DELETE
  USING (
    auth.uid() = uploader_id OR
    EXISTS (
      SELECT 1 FROM public.squad_members
      WHERE squad_members.group_id = media_vault_items.group_id
        AND squad_members.user_id = auth.uid()
        AND squad_members.role IN ('super_admin', 'admin')
    )
  );

-- 8. STORAGE BUCKET CONFIGURATION (Private Bucket)
-- Run in Supabase SQL editor:
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'trailops-media',
  'trailops-media',
  false,
  52428800, -- 50 MB
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'video/mp4', 'video/quicktime']
)
ON CONFLICT (id) DO UPDATE SET
  public = false,
  file_size_limit = 52428800;

-- Storage Policies for 'trailops-media'
CREATE POLICY "Authorized squad members can upload to trailops-media"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'trailops-media' AND
    auth.role() = 'authenticated'
  );

CREATE POLICY "Authorized squad members can download from trailops-media"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'trailops-media' AND
    auth.role() = 'authenticated'
  );

CREATE POLICY "Uploader or admin can delete from trailops-media"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'trailops-media' AND
    auth.role() = 'authenticated'
  );

-- 9. REALTIME PUBLICATIONS
ALTER PUBLICATION supabase_realtime ADD TABLE public.squad_members;
ALTER PUBLICATION supabase_realtime ADD TABLE public.media_vault_items;
ALTER PUBLICATION supabase_realtime ADD TABLE public.train_journeys;
ALTER PUBLICATION supabase_realtime ADD TABLE public.train_seat_assignments;
