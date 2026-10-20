-- ==============================================================================
-- TRAIL OPS — MANDATORY SUPER ADMIN, ROLE GOVERNANCE & SQUAD DELETION MIGRATION
-- Migration: 20261020000001_super_admin_and_group_deletion.sql
-- ==============================================================================

-- 1. TABLE: public.squad_emergency_contacts
-- Stores emergency contacts (Faculty, Super Admin, Admin) for direct dialer connection
CREATE TABLE IF NOT EXISTS public.squad_emergency_contacts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  group_id UUID NOT NULL REFERENCES public.squad_groups(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'faculty', -- 'faculty', 'super_admin', 'admin'
  phone TEXT NOT NULL,
  designation TEXT DEFAULT '',
  added_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_emergency_contacts_group ON public.squad_emergency_contacts(group_id);

ALTER TABLE public.squad_emergency_contacts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Squad members can view emergency contacts"
  ON public.squad_emergency_contacts FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.squad_members
      WHERE squad_members.group_id = squad_emergency_contacts.group_id
        AND squad_members.user_id = auth.uid()
    )
  );

CREATE POLICY "Admins and Faculty can manage emergency contacts"
  ON public.squad_emergency_contacts FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.squad_members
      WHERE squad_members.group_id = squad_emergency_contacts.group_id
        AND squad_members.user_id = auth.uid()
        AND squad_members.role IN ('super_admin', 'admin', 'faculty')
    )
  );

-- 2. TABLE: public.squad_audit_logs
-- Immutable audit log for role changes, emergency broadcasts, and squad deletions
CREATE TABLE IF NOT EXISTS public.squad_audit_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  group_id UUID,
  actor_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  details JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_squad_audit_logs_group ON public.squad_audit_logs(group_id);

ALTER TABLE public.squad_audit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Super admins can view audit logs"
  ON public.squad_audit_logs FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.squad_members
      WHERE squad_members.group_id = squad_audit_logs.group_id
        AND squad_members.user_id = auth.uid()
        AND squad_members.role = 'super_admin'
    )
  );

-- 3. TRIGGER FUNCTION: Enforce Mandatory Super Admin Invariant
CREATE OR REPLACE FUNCTION public.enforce_mandatory_super_admin()
RETURNS TRIGGER AS $$
DECLARE
  v_remaining_super_admins INTEGER;
  v_group_id UUID;
BEGIN
  IF TG_OP = 'DELETE' THEN
    v_group_id := OLD.group_id;
    IF OLD.role = 'super_admin' THEN
      SELECT COUNT(*) INTO v_remaining_super_admins
      FROM public.squad_members
      WHERE group_id = v_group_id
        AND role = 'super_admin'
        AND id != OLD.id;

      IF v_remaining_super_admins = 0 THEN
        RAISE EXCEPTION 'Constraint Violation: Every squad must maintain at least one Super Admin. Transfer leadership before leaving or removing.';
      END IF;
    END IF;
    RETURN OLD;

  ELSIF TG_OP = 'UPDATE' THEN
    v_group_id := NEW.group_id;
    -- If demoting an existing super_admin
    IF OLD.role = 'super_admin' AND NEW.role != 'super_admin' THEN
      SELECT COUNT(*) INTO v_remaining_super_admins
      FROM public.squad_members
      WHERE group_id = v_group_id
        AND role = 'super_admin'
        AND id != OLD.id;

      IF v_remaining_super_admins = 0 THEN
        RAISE EXCEPTION 'Constraint Violation: Cannot demote the sole remaining Super Admin. Appoint another Super Admin first.';
      END IF;
    END IF;
    RETURN NEW;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS tr_enforce_mandatory_super_admin ON public.squad_members;
CREATE TRIGGER tr_enforce_mandatory_super_admin
  BEFORE UPDATE OR DELETE ON public.squad_members
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_mandatory_super_admin();

-- 4. RPC: manage_member_role
CREATE OR REPLACE FUNCTION public.manage_member_role(
  p_group_id UUID,
  p_target_user_id UUID,
  p_new_role member_role
)
RETURNS JSONB AS $$
DECLARE
  v_caller_role member_role;
  v_target_old_role member_role;
  v_super_admin_count INTEGER;
BEGIN
  -- Verify caller role
  SELECT role INTO v_caller_role
  FROM public.squad_members
  WHERE group_id = p_group_id AND user_id = auth.uid()
  FOR UPDATE;

  IF v_caller_role != 'super_admin' THEN
    RAISE EXCEPTION 'Access Denied: Only an authorized Super Admin can change member roles.';
  END IF;

  -- Lock target row
  SELECT role INTO v_target_old_role
  FROM public.squad_members
  WHERE group_id = p_group_id AND user_id = p_target_user_id
  FOR UPDATE;

  IF v_target_old_role IS NULL THEN
    RAISE EXCEPTION 'Member not found in squad.';
  END IF;

  -- If demoting a super_admin, verify at least one other remains
  IF v_target_old_role = 'super_admin' AND p_new_role != 'super_admin' THEN
    SELECT COUNT(*) INTO v_super_admin_count
    FROM public.squad_members
    WHERE group_id = p_group_id AND role = 'super_admin' AND user_id != p_target_user_id;

    IF v_super_admin_count < 1 THEN
      RAISE EXCEPTION 'Cannot demote: At least one Super Admin must remain in the squad.';
    END IF;
  END IF;

  -- Update role
  UPDATE public.squad_members
  SET role = p_new_role
  WHERE group_id = p_group_id AND user_id = p_target_user_id;

  -- Audit log
  INSERT INTO public.squad_audit_logs (group_id, actor_id, action, details)
  VALUES (
    p_group_id,
    auth.uid(),
    'ROLE_CHANGE',
    jsonb_build_object(
      'target_user_id', p_target_user_id,
      'old_role', v_target_old_role,
      'new_role', p_new_role
    )
  );

  RETURN jsonb_build_object('success', true, 'new_role', p_new_role);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. RPC: transfer_and_leave_squad
CREATE OR REPLACE FUNCTION public.transfer_and_leave_squad(
  p_group_id UUID,
  p_successor_user_id UUID,
  p_action TEXT DEFAULT 'leave' -- 'leave' or 'demote_to_member'
)
RETURNS JSONB AS $$
DECLARE
  v_caller_role member_role;
  v_successor_exists BOOLEAN;
BEGIN
  -- Verify caller is super_admin
  SELECT role INTO v_caller_role
  FROM public.squad_members
  WHERE group_id = p_group_id AND user_id = auth.uid()
  FOR UPDATE;

  IF v_caller_role != 'super_admin' THEN
    RAISE EXCEPTION 'Access Denied: Only a Super Admin can transfer squad leadership.';
  END IF;

  -- Verify successor is an active member
  SELECT EXISTS (
    SELECT 1 FROM public.squad_members
    WHERE group_id = p_group_id AND user_id = p_successor_user_id
  ) INTO v_successor_exists;

  IF NOT v_successor_exists THEN
    RAISE EXCEPTION 'Successor is not an active squad member.';
  END IF;

  -- Promote successor
  UPDATE public.squad_members
  SET role = 'super_admin'
  WHERE group_id = p_group_id AND user_id = p_successor_user_id;

  -- Execute caller action
  IF p_action = 'leave' THEN
    DELETE FROM public.squad_members
    WHERE group_id = p_group_id AND user_id = auth.uid();
  ELSE
    UPDATE public.squad_members
    SET role = 'member'
    WHERE group_id = p_group_id AND user_id = auth.uid();
  END IF;

  -- Audit log
  INSERT INTO public.squad_audit_logs (group_id, actor_id, action, details)
  VALUES (
    p_group_id,
    auth.uid(),
    'TRANSFER_LEADERSHIP',
    jsonb_build_object(
      'successor_user_id', p_successor_user_id,
      'caller_action', p_action
    )
  );

  RETURN jsonb_build_object('success', true);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. RPC: delete_squad_group_cascade
CREATE OR REPLACE FUNCTION public.delete_squad_group_cascade(
  p_group_id UUID
)
RETURNS JSONB AS $$
DECLARE
  v_caller_role member_role;
  v_group_name TEXT;
BEGIN
  -- Verify caller is super_admin of this group
  SELECT role INTO v_caller_role
  FROM public.squad_members
  WHERE group_id = p_group_id AND user_id = auth.uid();

  IF v_caller_role != 'super_admin' THEN
    RAISE EXCEPTION 'Access Denied: Only an authorized Super Admin can permanently delete the squad group.';
  END IF;

  SELECT name INTO v_group_name FROM public.squad_groups WHERE id = p_group_id;

  -- Record audit log before cascade delete
  INSERT INTO public.squad_audit_logs (group_id, actor_id, action, details)
  VALUES (
    p_group_id,
    auth.uid(),
    'GROUP_DELETED',
    jsonb_build_object('group_name', v_group_name, 'deleted_by', auth.uid())
  );

  -- Delete the squad group (Cascades foreign keys to members, journeys, seat assignments, vault items)
  DELETE FROM public.squad_groups WHERE id = p_group_id;

  RETURN jsonb_build_object('success', true, 'deleted_group_id', p_group_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 7. RPC: recover_group_super_admin (Emergency Platform Recovery)
CREATE OR REPLACE FUNCTION public.recover_group_super_admin(
  p_group_id UUID,
  p_new_admin_user_id UUID,
  p_recovery_key TEXT
)
RETURNS JSONB AS $$
DECLARE
  v_current_super_admins INTEGER;
BEGIN
  -- Verify master recovery key
  IF p_recovery_key != 'TRAIL-OPS-MASTER-2026' THEN
    RAISE EXCEPTION 'Invalid platform recovery authorization key.';
  END IF;

  -- Check current super admins count
  SELECT COUNT(*) INTO v_current_super_admins
  FROM public.squad_members
  WHERE group_id = p_group_id AND role = 'super_admin';

  IF v_current_super_admins > 0 THEN
    RAISE EXCEPTION 'Squad already has active Super Admins. Recovery is only permitted for squads with zero Super Admins.';
  END IF;

  -- Promote specified user or insert if not present
  UPDATE public.squad_members
  SET role = 'super_admin'
  WHERE group_id = p_group_id AND user_id = p_new_admin_user_id;

  -- Record recovery in audit log
  INSERT INTO public.squad_audit_logs (group_id, actor_id, action, details)
  VALUES (
    p_group_id,
    auth.uid(),
    'EMERGENCY_RECOVERY',
    jsonb_build_object('restored_admin_user_id', p_new_admin_user_id)
  );

  RETURN jsonb_build_object('success', true);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 8. Add realtime publication for emergency contacts
ALTER PUBLICATION supabase_realtime ADD TABLE public.squad_emergency_contacts;
