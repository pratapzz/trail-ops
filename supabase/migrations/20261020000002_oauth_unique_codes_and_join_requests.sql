-- ==============================================================================
-- TRAIL OPS — UNIQUE DATABASE GROUP CODES, JOIN REQUESTS & NOTIFICATIONS MIGRATION
-- Migration: 20261020000002_oauth_unique_codes_and_join_requests.sql
-- ==============================================================================

-- 1. DATABASE-GENERATED UNIQUE 6-CHARACTER GROUP INVITATION CODE
CREATE OR REPLACE FUNCTION public.generate_unique_squad_code()
RETURNS TEXT AS $$
DECLARE
  v_chars TEXT := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  v_code TEXT;
  v_exists BOOLEAN;
  v_i INTEGER;
BEGIN
  LOOP
    v_code := 'TR';
    FOR v_i IN 1..4 LOOP
      v_code := v_code || substr(v_chars, floor(random() * length(v_chars) + 1)::int, 1);
    END LOOP;

    SELECT EXISTS (
      SELECT 1 FROM public.squad_groups WHERE upper(code) = v_code
    ) INTO v_exists;

    IF NOT v_exists THEN
      RETURN v_code;
    END IF;
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to ensure every newly created group receives a unique, normalized 6-char code
CREATE OR REPLACE FUNCTION public.ensure_unique_squad_code()
RETURNS TRIGGER AS $$
DECLARE
  v_clean TEXT;
  v_exists BOOLEAN;
BEGIN
  v_clean := upper(regexp_replace(coalesce(NEW.code, ''), '[^A-Za-z0-9]', '', 'g'));
  IF length(v_clean) = 6 THEN
    SELECT EXISTS (
      SELECT 1 FROM public.squad_groups WHERE upper(code) = v_clean AND id != coalesce(NEW.id, uuid_nil())
    ) INTO v_exists;
    IF NOT v_exists THEN
      NEW.code := v_clean;
      RETURN NEW;
    END IF;
  END IF;

  NEW.code := public.generate_unique_squad_code();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS tr_ensure_unique_squad_code ON public.squad_groups;
CREATE TRIGGER tr_ensure_unique_squad_code
  BEFORE INSERT ON public.squad_groups
  FOR EACH ROW
  EXECUTE FUNCTION public.ensure_unique_squad_code();

-- 2. TABLE: public.squad_join_requests
-- Stores pending, accepted, and rejected group join requests
CREATE TABLE IF NOT EXISTS public.squad_join_requests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  group_id UUID NOT NULL REFERENCES public.squad_groups(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  requester_name TEXT NOT NULL DEFAULT '',
  requester_email TEXT NOT NULL DEFAULT '',
  requester_phone TEXT DEFAULT '',
  requester_avatar TEXT DEFAULT '',
  requester_blood_group TEXT DEFAULT '',
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected')),
  reviewed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_join_requests_group_status ON public.squad_join_requests(group_id, status);
CREATE INDEX IF NOT EXISTS idx_join_requests_user ON public.squad_join_requests(user_id);

-- Prevent duplicate pending requests per (group_id, user_id) at the database level
CREATE UNIQUE INDEX IF NOT EXISTS idx_unique_pending_join_request
  ON public.squad_join_requests(group_id, user_id)
  WHERE status = 'pending';

ALTER TABLE public.squad_join_requests ENABLE ROW LEVEL SECURITY;

-- Requesters can view their own join requests; Super Admins of the group can view all requests for their group
DROP POLICY IF EXISTS "Users can view own join requests or Super Admin can view group requests" ON public.squad_join_requests;
CREATE POLICY "Users can view own join requests or Super Admin can view group requests"
  ON public.squad_join_requests FOR SELECT
  USING (
    auth.uid() = user_id OR
    EXISTS (
      SELECT 1 FROM public.squad_members sm
      WHERE sm.group_id = squad_join_requests.group_id
        AND sm.user_id = auth.uid()
        AND sm.role = 'super_admin'
    )
  );

-- Authenticated users can submit a pending join request for themselves if not already a member
DROP POLICY IF EXISTS "Authenticated users can submit pending join requests" ON public.squad_join_requests;
CREATE POLICY "Authenticated users can submit pending join requests"
  ON public.squad_join_requests FOR INSERT
  WITH CHECK (
    auth.uid() = user_id AND
    status = 'pending' AND
    NOT EXISTS (
      SELECT 1 FROM public.squad_members sm
      WHERE sm.group_id = squad_join_requests.group_id
        AND sm.user_id = auth.uid()
    )
  );

-- Only Super Admins of that group can approve or reject join requests
DROP POLICY IF EXISTS "Only Super Admins can update join requests" ON public.squad_join_requests;
CREATE POLICY "Only Super Admins can update join requests"
  ON public.squad_join_requests FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.squad_members sm
      WHERE sm.group_id = squad_join_requests.group_id
        AND sm.user_id = auth.uid()
        AND sm.role = 'super_admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.squad_members sm
      WHERE sm.group_id = squad_join_requests.group_id
        AND sm.user_id = auth.uid()
        AND sm.role = 'super_admin'
    )
  );

-- 3. TABLE: public.user_notifications
-- Stores notifications for join request approvals, rejections, and admin alerts
CREATE TABLE IF NOT EXISTS public.user_notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  group_id UUID REFERENCES public.squad_groups(id) ON DELETE CASCADE,
  type TEXT NOT NULL DEFAULT 'info', -- 'join_accepted', 'join_rejected', 'join_requested', 'broadcast'
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  is_read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_user_notifications_user ON public.user_notifications(user_id, is_read);

ALTER TABLE public.user_notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view and update their own notifications" ON public.user_notifications;
CREATE POLICY "Users can view and update their own notifications"
  ON public.user_notifications FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- 4. TIGHTEN SQUAD_MEMBERS INSERT POLICY (Require Creator or Super Admin Approval)
DROP POLICY IF EXISTS "Users can join a squad as member" ON public.squad_members;
DROP POLICY IF EXISTS "Only creator or Super Admin can insert squad members" ON public.squad_members;
CREATE POLICY "Only creator or Super Admin can insert squad members"
  ON public.squad_members FOR INSERT
  WITH CHECK (
    -- Creator adding themselves as super_admin when creating the group
    EXISTS (
      SELECT 1 FROM public.squad_groups sg
      WHERE sg.id = squad_members.group_id
        AND sg.created_by = auth.uid()
        AND squad_members.user_id = auth.uid()
    )
    OR
    -- Authorized Super Admin of the group approving a member
    EXISTS (
      SELECT 1 FROM public.squad_members sm
      WHERE sm.group_id = squad_members.group_id
        AND sm.user_id = auth.uid()
        AND sm.role = 'super_admin'
    )
  );

-- 5. RPC: lookup_squad_by_code (Safe public preview metadata without leaking private member data)
CREATE OR REPLACE FUNCTION public.lookup_squad_by_code(p_code TEXT)
RETURNS JSONB AS $$
DECLARE
  v_clean TEXT;
  v_group RECORD;
  v_creator_name TEXT;
  v_member_count INTEGER;
  v_is_member BOOLEAN := false;
  v_my_role TEXT := null;
  v_pending_request_id UUID := null;
  v_latest_request_status TEXT := null;
BEGIN
  v_clean := upper(regexp_replace(coalesce(p_code, ''), '[^A-Za-z0-9]', '', 'g'));
  IF length(v_clean) < 4 THEN
    RETURN NULL;
  END IF;

  SELECT * INTO v_group
  FROM public.squad_groups
  WHERE upper(regexp_replace(code, '[^A-Za-z0-9]', '', 'g')) = v_clean
  LIMIT 1;

  IF v_group.id IS NULL THEN
    RETURN NULL;
  END IF;

  SELECT coalesce(full_name, email, 'Squad Commander') INTO v_creator_name
  FROM public.profiles
  WHERE id = v_group.created_by;

  SELECT count(*) INTO v_member_count
  FROM public.squad_members
  WHERE group_id = v_group.id;

  IF auth.uid() IS NOT NULL THEN
    SELECT true, role::text INTO v_is_member, v_my_role
    FROM public.squad_members
    WHERE group_id = v_group.id AND user_id = auth.uid()
    LIMIT 1;

    SELECT id, status INTO v_pending_request_id, v_latest_request_status
    FROM public.squad_join_requests
    WHERE group_id = v_group.id AND user_id = auth.uid()
    ORDER BY created_at DESC
    LIMIT 1;
  END IF;

  RETURN jsonb_build_object(
    'id', v_group.id,
    'name', v_group.name,
    'code', v_group.code,
    'destination', v_group.destination,
    'start_date', v_group.start_date,
    'end_date', v_group.end_date,
    'created_by', v_group.created_by,
    'created_at', v_group.created_at,
    'creator_name', coalesce(v_creator_name, 'Squad Commander'),
    'member_count', coalesce(v_member_count, 1),
    'is_member', coalesce(v_is_member, false),
    'my_role', v_my_role,
    'latest_request_id', v_pending_request_id,
    'latest_request_status', v_latest_request_status
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. RPC: submit_squad_join_request
CREATE OR REPLACE FUNCTION public.submit_squad_join_request(
  p_group_id UUID,
  p_requester_name TEXT DEFAULT '',
  p_requester_email TEXT DEFAULT '',
  p_requester_phone TEXT DEFAULT '',
  p_requester_avatar TEXT DEFAULT '',
  p_requester_blood_group TEXT DEFAULT ''
)
RETURNS JSONB AS $$
DECLARE
  v_user_id UUID;
  v_group RECORD;
  v_existing_member RECORD;
  v_existing_pending RECORD;
  v_new_request RECORD;
  v_profile RECORD;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required to submit a join request.';
  END IF;

  SELECT * INTO v_group FROM public.squad_groups WHERE id = p_group_id;
  IF v_group.id IS NULL THEN
    RAISE EXCEPTION 'Target expedition group does not exist.';
  END IF;

  -- Check if already an active member
  SELECT * INTO v_existing_member
  FROM public.squad_members
  WHERE group_id = p_group_id AND user_id = v_user_id;

  IF v_existing_member.id IS NOT NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'already_member', true,
      'error', 'You are already an approved member of this group.'
    );
  END IF;

  -- Check for duplicate pending request
  SELECT * INTO v_existing_pending
  FROM public.squad_join_requests
  WHERE group_id = p_group_id AND user_id = v_user_id AND status = 'pending'
  LIMIT 1;

  IF v_existing_pending.id IS NOT NULL THEN
    RETURN jsonb_build_object(
      'success', true,
      'duplicate', true,
      'request_id', v_existing_pending.id,
      'status', 'pending',
      'message', 'Request Sent — Awaiting Approval'
    );
  END IF;

  SELECT * INTO v_profile FROM public.profiles WHERE id = v_user_id;

  INSERT INTO public.squad_join_requests (
    group_id,
    user_id,
    requester_name,
    requester_email,
    requester_phone,
    requester_avatar,
    requester_blood_group,
    status
  ) VALUES (
    p_group_id,
    v_user_id,
    coalesce(nullif(p_requester_name, ''), v_profile.full_name, 'Expedition Explorer'),
    coalesce(nullif(p_requester_email, ''), v_profile.email, ''),
    coalesce(nullif(p_requester_phone, ''), v_profile.phone, ''),
    coalesce(nullif(p_requester_avatar, ''), v_profile.avatar_url, ''),
    coalesce(nullif(p_requester_blood_group, ''), v_profile.blood_group, ''),
    'pending'
  )
  RETURNING * INTO v_new_request;

  -- Notify all Super Admins of this group
  INSERT INTO public.user_notifications (user_id, group_id, type, title, message)
  SELECT
    sm.user_id,
    p_group_id,
    'join_requested',
    'New Squad Join Request',
    coalesce(v_new_request.requester_name, 'A user') || ' requested to join "' || v_group.name || '" (' || v_group.code || ').'
  FROM public.squad_members sm
  WHERE sm.group_id = p_group_id AND sm.role = 'super_admin';

  RETURN jsonb_build_object(
    'success', true,
    'duplicate', false,
    'request_id', v_new_request.id,
    'status', 'pending',
    'message', 'Request Sent — Awaiting Approval'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 7. RPC: respond_to_join_request (Strictly restricted to Super Admins of the group)
CREATE OR REPLACE FUNCTION public.respond_to_join_request(
  p_request_id UUID,
  p_decision TEXT -- 'accepted' or 'rejected'
)
RETURNS JSONB AS $$
DECLARE
  v_caller_id UUID;
  v_req RECORD;
  v_caller_role member_role;
  v_group RECORD;
BEGIN
  v_caller_id := auth.uid();
  IF v_caller_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required.';
  END IF;

  IF p_decision NOT IN ('accepted', 'rejected') THEN
    RAISE EXCEPTION 'Invalid decision. Must be accepted or rejected.';
  END IF;

  SELECT * INTO v_req
  FROM public.squad_join_requests
  WHERE id = p_request_id
  FOR UPDATE;

  IF v_req.id IS NULL THEN
    RAISE EXCEPTION 'Join request not found.';
  END IF;

  -- Verify caller is an authorized Super Admin of this group
  SELECT role INTO v_caller_role
  FROM public.squad_members
  WHERE group_id = v_req.group_id AND user_id = v_caller_id;

  IF v_caller_role IS DISTINCT FROM 'super_admin' THEN
    RAISE EXCEPTION 'Access Denied: Only an authorized Super Admin of this group can approve or reject join requests.';
  END IF;

  IF v_req.status != 'pending' THEN
    RAISE EXCEPTION 'This join request has already been %. ', v_req.status;
  END IF;

  SELECT * INTO v_group FROM public.squad_groups WHERE id = v_req.group_id;

  -- Update request status
  UPDATE public.squad_join_requests
  SET
    status = p_decision,
    reviewed_by = v_caller_id,
    reviewed_at = timezone('utc'::text, now()),
    updated_at = timezone('utc'::text, now())
  WHERE id = p_request_id;

  IF p_decision = 'accepted' THEN
    -- Create actual group membership
    INSERT INTO public.squad_members (group_id, user_id, role, status)
    VALUES (v_req.group_id, v_req.user_id, 'member', 'active')
    ON CONFLICT (group_id, user_id)
    DO UPDATE SET status = 'active', joined_at = timezone('utc'::text, now());

    -- Notify requester of approval
    INSERT INTO public.user_notifications (user_id, group_id, type, title, message)
    VALUES (
      v_req.user_id,
      v_req.group_id,
      'join_accepted',
      'Squad Join Request Approved!',
      'Your request to join "' || coalesce(v_group.name, 'Expedition Squad') || '" (' || coalesce(v_group.code, '') || ') was approved by the Super Admin.'
    );
  ELSE
    -- Notify requester of rejection (do NOT create membership)
    INSERT INTO public.user_notifications (user_id, group_id, type, title, message)
    VALUES (
      v_req.user_id,
      v_req.group_id,
      'join_rejected',
      'Squad Join Request Declined',
      'Your request to join "' || coalesce(v_group.name, 'Expedition Squad') || '" (' || coalesce(v_group.code, '') || ') was declined by the Super Admin.'
    );
  END IF;

  -- Audit log
  INSERT INTO public.squad_audit_logs (group_id, actor_id, action, details)
  VALUES (
    v_req.group_id,
    v_caller_id,
    CASE WHEN p_decision = 'accepted' THEN 'JOIN_REQUEST_APPROVED' ELSE 'JOIN_REQUEST_REJECTED' END,
    jsonb_build_object(
      'request_id', p_request_id,
      'requester_user_id', v_req.user_id,
      'requester_name', v_req.requester_name,
      'decision', p_decision
    )
  );

  RETURN jsonb_build_object(
    'success', true,
    'request_id', p_request_id,
    'group_id', v_req.group_id,
    'user_id', v_req.user_id,
    'status', p_decision
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
