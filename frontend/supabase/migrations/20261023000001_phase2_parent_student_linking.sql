-- ==============================================================================
-- Migration: 20261023000001_phase2_parent_student_linking.sql
-- Purpose: Phase 2 Parent Accounts, Parent-Student Links & Verification RLS
-- ==============================================================================

-- 1. ADD PHONE COLUMN AND EXPAND ROLES ON PROFILES
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS phone TEXT;

-- Update role check constraint to include PARENT / parent
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
ALTER TABLE public.profiles ADD CONSTRAINT profiles_role_check
    CHECK (role IN ('STUDENT', 'ADMIN', 'CMC', 'PARENT', 'student', 'admin', 'cmc', 'parent'));

-- 2. CREATE PARENT-STUDENT LINKS TABLE
CREATE TABLE IF NOT EXISTS public.parent_student_links (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    parent_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    student_roll_number TEXT NOT NULL,
    verification_status TEXT NOT NULL DEFAULT 'PENDING_VERIFICATION'
        CHECK (verification_status IN ('PENDING_VERIFICATION', 'VERIFIED', 'REJECTED')),
    verified_by UUID REFERENCES public.profiles(id),
    verified_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT unique_parent_student_link UNIQUE (parent_id, student_id)
);

-- 3. REPAIR USER CREATION TRIGGER FOR PARENT ACCOUNTS
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
    v_student_id TEXT;
    v_role TEXT;
    v_phone TEXT;
BEGIN
    v_student_id := COALESCE(
        NEW.raw_user_meta_data->>'student_id',
        NEW.raw_user_meta_data->>'roll_number',
        ''
    );
    v_role := UPPER(COALESCE(NEW.raw_user_meta_data->>'role', 'STUDENT'));
    v_phone := NEW.raw_user_meta_data->>'phone';

    INSERT INTO public.profiles (
        id,
        email,
        full_name,
        student_id,
        roll_number,
        phone,
        role,
        department,
        year,
        section,
        is_approved,
        approval_status
    )
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'full_name', SPLIT_PART(NEW.email, '@', 1)),
        v_student_id,
        v_student_id,
        v_phone,
        v_role,
        NEW.raw_user_meta_data->>'department',
        NEW.raw_user_meta_data->>'year',
        NEW.raw_user_meta_data->>'section',
        -- Parents and Admins are approved accounts; Parent access to student data is gated by parent_student_links
        CASE WHEN v_role IN ('ADMIN', 'CMC', 'PARENT') THEN TRUE ELSE FALSE END,
        CASE WHEN v_role IN ('ADMIN', 'CMC', 'PARENT') THEN 'APPROVED' ELSE 'PENDING' END
    )
    ON CONFLICT (id) DO UPDATE SET
        full_name = EXCLUDED.full_name,
        student_id = COALESCE(EXCLUDED.student_id, profiles.student_id),
        roll_number = COALESCE(EXCLUDED.roll_number, profiles.roll_number),
        phone = COALESCE(EXCLUDED.phone, profiles.phone),
        department = COALESCE(EXCLUDED.department, profiles.department),
        year = COALESCE(EXCLUDED.year, profiles.year),
        section = COALESCE(EXCLUDED.section, profiles.section);

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. PRIVILEGE ESCALATION PREVENTION ON PARENT_STUDENT_LINKS
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_protect_parent_student_link_fields ON public.parent_student_links;
CREATE TRIGGER trg_protect_parent_student_link_fields
    BEFORE UPDATE ON public.parent_student_links
    FOR EACH ROW EXECUTE FUNCTION public.protect_parent_student_link_fields();

-- 5. SECURITY HELPER: VERIFY IF CALLER IS A VERIFIED PARENT OF TARGET STUDENT
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
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- 6. ROW LEVEL SECURITY ON PARENT_STUDENT_LINKS
ALTER TABLE public.parent_student_links ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Parent Read Own Links" ON public.parent_student_links;
DROP POLICY IF EXISTS "Parent Insert Link Request" ON public.parent_student_links;
DROP POLICY IF EXISTS "Admin Update Link Request" ON public.parent_student_links;
DROP POLICY IF EXISTS "Parent Or Admin Delete Link" ON public.parent_student_links;

-- Parents read own links; Admin/CMC reads all
CREATE POLICY "Parent Read Own Links" ON public.parent_student_links
    FOR SELECT USING (
        auth.uid() = parent_id
        OR public.is_admin_or_cmc()
    );

-- Parents can submit a link request for themselves only with PENDING_VERIFICATION
CREATE POLICY "Parent Insert Link Request" ON public.parent_student_links
    FOR INSERT WITH CHECK (
        auth.uid() = parent_id
        AND verification_status = 'PENDING_VERIFICATION'
        AND verified_by IS NULL
        AND verified_at IS NULL
    );

-- Only Admin/CMC can update link requests (Verify or Reject)
CREATE POLICY "Admin Update Link Request" ON public.parent_student_links
    FOR UPDATE USING (
        public.is_admin_or_cmc()
    );

-- Parents can delete their own pending request; Admin can delete any
CREATE POLICY "Parent Or Admin Delete Link" ON public.parent_student_links
    FOR DELETE USING (
        (auth.uid() = parent_id AND verification_status = 'PENDING_VERIFICATION')
        OR public.is_admin_or_cmc()
    );

-- 7. UPDATE POLICIES ON PROFILES AND SUBMISSIONS FOR VERIFIED PARENTS

-- Verified parents can read their ward's profile
DROP POLICY IF EXISTS "Profiles Read Access" ON public.profiles;
CREATE POLICY "Profiles Read Access" ON public.profiles
    FOR SELECT USING (
        auth.uid() = id
        OR public.is_admin_or_cmc()
        OR public.is_verified_parent_of(id)
    );

-- Verified parents can read their ward's submissions
DROP POLICY IF EXISTS "Submissions Read Access" ON public.submissions;
CREATE POLICY "Submissions Read Access" ON public.submissions
    FOR SELECT USING (
        auth.uid() = student_id
        OR type IN ('suggestion', 'improvement_request')
        OR public.is_admin_or_cmc()
        OR public.is_verified_parent_of(student_id)
    );

-- Verified parents can read their ward's submission status history
DROP POLICY IF EXISTS "Read Status History Access" ON public.status_history;
CREATE POLICY "Read Status History Access" ON public.status_history
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.submissions s
            WHERE s.id = status_history.submission_id
              AND (s.student_id = auth.uid() OR public.is_verified_parent_of(s.student_id))
        )
        OR public.is_admin_or_cmc()
    );

-- Verified parents can read their ward's submission assignments
DROP POLICY IF EXISTS "Read Assignments Access" ON public.assignments;
CREATE POLICY "Read Assignments Access" ON public.assignments
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.submissions s
            WHERE s.id = assignments.submission_id
              AND (s.student_id = auth.uid() OR public.is_verified_parent_of(s.student_id))
        )
        OR public.is_admin_or_cmc()
    );

