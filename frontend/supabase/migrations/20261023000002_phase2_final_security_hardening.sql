-- ==============================================================================
-- Migration: 20261023000002_phase2_final_security_hardening.sql
-- Purpose: Phase 2 Final Security Hardening: Notifications RLS, Resolution Records
--          Isolation, Supports Protection, and SECURITY DEFINER search_path Hardening
-- ==============================================================================

-- 1. HARDEN SECURITY DEFINER FUNCTIONS WITH EXPLICIT SEARCH_PATH (CWE-426 MITIGATION)

CREATE OR REPLACE FUNCTION public.get_auth_email_by_identifier(p_identifier TEXT)
RETURNS TEXT AS $$
DECLARE
    v_clean TEXT := UPPER(TRIM(p_identifier));
    v_email TEXT;
BEGIN
    -- Check by Roll Number / Student ID / Phone / Admin ID
    SELECT email INTO v_email
    FROM public.profiles
    WHERE UPPER(student_id) = v_clean
       OR UPPER(roll_number) = v_clean
       OR phone = TRIM(p_identifier)
    LIMIT 1;

    RETURN v_email;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE SET search_path = public, pg_temp;

GRANT EXECUTE ON FUNCTION public.get_auth_email_by_identifier(TEXT) TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.is_admin_or_cmc()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = auth.uid() AND role IN ('ADMIN', 'CMC', 'admin', 'cmc')
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE SET search_path = public, pg_temp;

CREATE OR REPLACE FUNCTION public.is_verified_parent_of(target_student_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.parent_student_links
        WHERE parent_id = auth.uid()
          AND student_id = target_student_id
          AND verification_status = 'VERIFIED'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE SET search_path = public, pg_temp;

CREATE OR REPLACE FUNCTION public.protect_profile_privileged_fields()
RETURNS TRIGGER AS $$
BEGIN
    IF NOT public.is_admin_or_cmc() THEN
        NEW.role := OLD.role;
        NEW.is_approved := OLD.is_approved;
        NEW.approval_status := OLD.approval_status;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

CREATE OR REPLACE FUNCTION public.protect_parent_student_link_fields()
RETURNS TRIGGER AS $$
BEGIN
    -- Only Admin/CMC can alter verification_status, verified_by, or verified_at
    IF NOT public.is_admin_or_cmc() THEN
        IF NEW.verification_status <> OLD.verification_status
           OR NEW.verified_by IS DISTINCT FROM OLD.verified_by
           OR NEW.verified_at IS DISTINCT FROM OLD.verified_at
           OR NEW.parent_id <> OLD.parent_id
           OR NEW.student_id <> OLD.student_id THEN
            RAISE EXCEPTION 'Unauthorized: Only college administrators can verify or modify parent-student links.';
        END IF;
    END IF;

    -- Automatically set audit fields on verification change by admin
    IF NEW.verification_status <> OLD.verification_status AND public.is_admin_or_cmc() THEN
        NEW.verified_by := auth.uid();
        NEW.verified_at := NOW();
        NEW.updated_at := NOW();
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

-- 2. NOTIFICATIONS RLS HARDENING: ADMIN INSERT & RECIPIENT PRIVACY
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users Read Own Notifications" ON public.notifications;
DROP POLICY IF EXISTS "Users Update Read Notifications" ON public.notifications;
DROP POLICY IF EXISTS "Admins Insert Notifications" ON public.notifications;

-- Only recipient user or authorized admin can read notifications
CREATE POLICY "Users Read Own Notifications" ON public.notifications
    FOR SELECT USING (
        auth.uid() = user_id
        OR public.is_admin_or_cmc()
    );

-- Only recipient can mark notifications as read
CREATE POLICY "Users Update Read Notifications" ON public.notifications
    FOR UPDATE USING (
        auth.uid() = user_id
    ) WITH CHECK (
        auth.uid() = user_id
    );

-- Only authorized Admin/CMC can insert notifications into the system
CREATE POLICY "Admins Insert Notifications" ON public.notifications
    FOR INSERT WITH CHECK (
        public.is_admin_or_cmc()
    );

-- 3. RESOLUTION RECORDS RLS HARDENING: PREVENT LEAKAGE OF PRIVATE ISSUE RESOLUTIONS
ALTER TABLE public.resolution_records ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Read Resolutions Access" ON public.resolution_records;
DROP POLICY IF EXISTS "Authenticated Read Resolutions" ON public.resolution_records;
DROP POLICY IF EXISTS "Admins Manage Resolutions" ON public.resolution_records;

-- Only submitter, verified parent, Admin/CMC, or viewers of public suggestions can read resolutions
CREATE POLICY "Read Resolutions Access" ON public.resolution_records
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.submissions s
            WHERE s.id = resolution_records.submission_id
              AND (
                  s.student_id = auth.uid()
                  OR public.is_verified_parent_of(s.student_id)
                  OR s.type IN ('suggestion', 'improvement_request')
              )
        )
        OR public.is_admin_or_cmc()
    );

-- Only Admin/CMC can create, modify, or delete resolution records
CREATE POLICY "Admins Manage Resolutions" ON public.resolution_records
    FOR ALL
    USING (public.is_admin_or_cmc())
    WITH CHECK (public.is_admin_or_cmc());

-- 4. SUPPORTS (UPVOTES) RLS HARDENING: RESTRICT VISIBILITY & VOTING TO VISIBLE ISSUES
ALTER TABLE public.supports ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated Read Supports" ON public.supports;
DROP POLICY IF EXISTS "Supports Read Access" ON public.supports;
DROP POLICY IF EXISTS "Users Insert Own Support" ON public.supports;
DROP POLICY IF EXISTS "Users Delete Own Support" ON public.supports;

CREATE POLICY "Supports Read Access" ON public.supports
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.submissions s
            WHERE s.id = supports.submission_id
              AND (
                  s.student_id = auth.uid()
                  OR s.type IN ('suggestion', 'improvement_request')
                  OR public.is_admin_or_cmc()
                  OR public.is_verified_parent_of(s.student_id)
              )
        )
        OR public.is_admin_or_cmc()
    );

CREATE POLICY "Users Insert Own Support" ON public.supports
    FOR INSERT WITH CHECK (
        auth.uid() = user_id
        AND EXISTS (
            SELECT 1 FROM public.submissions s
            WHERE s.id = supports.submission_id
              AND (
                  s.student_id = auth.uid()
                  OR s.type IN ('suggestion', 'improvement_request')
                  OR public.is_admin_or_cmc()
                  OR public.is_verified_parent_of(s.student_id)
              )
        )
    );

CREATE POLICY "Users Delete Own Support" ON public.supports
    FOR DELETE USING (
        auth.uid() = user_id
    );
