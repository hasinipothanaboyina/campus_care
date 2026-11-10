-- ==============================================================================
-- Migration: 20261023000000_phase1_security_and_auth_hardening.sql
-- Purpose: Complete Phase 1 Database Repair, Core Tables & Security Hardening
-- ==============================================================================

-- 1. EXTENSIONS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. PROFILES SCHEMA ALIGNMENT
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS student_id TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS roll_number TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_approved BOOLEAN DEFAULT FALSE;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS last_login TIMESTAMPTZ;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS approval_status TEXT DEFAULT 'PENDING'
    CHECK (approval_status IN ('PENDING', 'APPROVED', 'REJECTED'));

-- Synchronize legacy data
UPDATE public.profiles
SET approval_status = 'APPROVED'
WHERE is_approved = TRUE AND (approval_status IS NULL OR approval_status = 'PENDING');

UPDATE public.profiles
SET approval_status = 'PENDING'
WHERE (is_approved = FALSE OR is_approved IS NULL) AND approval_status IS NULL;

UPDATE public.profiles
SET roll_number = student_id
WHERE roll_number IS NULL AND student_id IS NOT NULL;

UPDATE public.profiles
SET student_id = roll_number
WHERE student_id IS NULL AND roll_number IS NOT NULL;

-- 3. ENSURE SUPPORTING CORE TABLES EXIST
CREATE TABLE IF NOT EXISTS public.assignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    submission_id TEXT NOT NULL REFERENCES public.submissions(id) ON DELETE CASCADE,
    assigned_to TEXT NOT NULL,
    assigned_team TEXT NOT NULL,
    assigned_by UUID REFERENCES public.profiles(id),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.status_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    submission_id TEXT NOT NULL REFERENCES public.submissions(id) ON DELETE CASCADE,
    old_status TEXT NOT NULL,
    new_status TEXT NOT NULL,
    changed_by UUID REFERENCES public.profiles(id),
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT UNIQUE NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('issue', 'suggestion', 'improvement_request')),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.locations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    building TEXT NOT NULL,
    room TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT unique_building_room UNIQUE (building, room)
);

-- Seed core categories and locations if missing
INSERT INTO public.categories (name, type) VALUES
('Classroom', 'issue'), ('Electrical', 'issue'), ('Water', 'issue'),
('Cleanliness', 'issue'), ('Internet / Network', 'issue'), ('Equipment', 'issue'),
('Infrastructure', 'issue'), ('Safety', 'issue'), ('Transport', 'issue'),
('Library', 'suggestion'), ('Study spaces', 'suggestion'), ('Sustainability', 'suggestion'),
('Water Facility', 'improvement_request'), ('Lighting & Power', 'improvement_request')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.locations (building, room) VALUES
('Block B', 'Room 204'),
('Central Library', '2nd Floor Quiet Zone'),
('Science Block', 'Room 102'),
('Main Administration', 'Lobby'),
('West Campus Walkway', 'Gate 2')
ON CONFLICT DO NOTHING;

-- 4. REPAIRED AUTOMATIC USER CREATION TRIGGER
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
    v_student_id TEXT;
    v_role TEXT;
BEGIN
    v_student_id := COALESCE(
        NEW.raw_user_meta_data->>'student_id',
        NEW.raw_user_meta_data->>'roll_number',
        ''
    );
    v_role := COALESCE(NEW.raw_user_meta_data->>'role', 'STUDENT');

    INSERT INTO public.profiles (
        id,
        email,
        full_name,
        student_id,
        roll_number,
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
        v_role,
        NEW.raw_user_meta_data->>'department',
        NEW.raw_user_meta_data->>'year',
        NEW.raw_user_meta_data->>'section',
        CASE WHEN v_role IN ('ADMIN', 'CMC', 'admin', 'cmc') THEN TRUE ELSE FALSE END,
        CASE WHEN v_role IN ('ADMIN', 'CMC', 'admin', 'cmc') THEN 'APPROVED' ELSE 'PENDING' END
    )
    ON CONFLICT (id) DO UPDATE SET
        full_name = EXCLUDED.full_name,
        student_id = COALESCE(EXCLUDED.student_id, profiles.student_id),
        roll_number = COALESCE(EXCLUDED.roll_number, profiles.roll_number),
        department = COALESCE(EXCLUDED.department, profiles.department),
        year = COALESCE(EXCLUDED.year, profiles.year),
        section = COALESCE(EXCLUDED.section, profiles.section);

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 5. DATABASE-LEVEL PRIVILEGE ESCALATION GUARD
CREATE OR REPLACE FUNCTION public.protect_profile_privileged_fields()
RETURNS TRIGGER AS $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = auth.uid() AND role IN ('ADMIN', 'CMC', 'admin', 'cmc')
    ) THEN
        NEW.role := OLD.role;
        NEW.is_approved := OLD.is_approved;
        NEW.approval_status := OLD.approval_status;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_protect_profile_privileged_fields ON public.profiles;
CREATE TRIGGER trg_protect_profile_privileged_fields
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW EXECUTE FUNCTION public.protect_profile_privileged_fields();

-- 6. SECURITY HELPER FUNCTION TO PREVENT RLS INFINITE RECURSION
CREATE OR REPLACE FUNCTION public.is_admin_or_cmc()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = auth.uid() AND role IN ('ADMIN', 'CMC', 'admin', 'cmc')
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- 7. LEAST-PRIVILEGE ROW LEVEL SECURITY (RLS) POLICIES
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.supports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.status_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.resolution_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.locations ENABLE ROW LEVEL SECURITY;

-- Profiles Policies
DROP POLICY IF EXISTS "Public Profiles Read Access" ON public.profiles;
DROP POLICY IF EXISTS "Users Update Own Profile" ON public.profiles;
DROP POLICY IF EXISTS "Admins Update Profiles" ON public.profiles;
DROP POLICY IF EXISTS "Profiles Read Access" ON public.profiles;
DROP POLICY IF EXISTS "Profiles Update Access" ON public.profiles;

CREATE POLICY "Profiles Read Access" ON public.profiles
    FOR SELECT USING (
        auth.uid() = id
        OR public.is_admin_or_cmc()
    );

CREATE POLICY "Profiles Update Access" ON public.profiles
    FOR UPDATE USING (
        auth.uid() = id
        OR public.is_admin_or_cmc()
    );

-- Submissions Policies
DROP POLICY IF EXISTS "Authenticated Read Submissions" ON public.submissions;
DROP POLICY IF EXISTS "Students Insert Own Submissions" ON public.submissions;
DROP POLICY IF EXISTS "Submitter Or Admin Update Submissions" ON public.submissions;
DROP POLICY IF EXISTS "Submissions Read Access" ON public.submissions;
DROP POLICY IF EXISTS "Submissions Insert Access" ON public.submissions;
DROP POLICY IF EXISTS "Submissions Update Access" ON public.submissions;

CREATE POLICY "Submissions Read Access" ON public.submissions
    FOR SELECT USING (
        auth.uid() = student_id
        OR type IN ('suggestion', 'improvement_request')
        OR public.is_admin_or_cmc()
    );

CREATE POLICY "Submissions Insert Access" ON public.submissions
    FOR INSERT WITH CHECK (
        auth.uid() = student_id
        AND EXISTS (
            SELECT 1 FROM public.profiles p
            WHERE p.id = auth.uid() AND (p.is_approved = TRUE OR p.approval_status = 'APPROVED')
        )
    );

CREATE POLICY "Submissions Update Access" ON public.submissions
    FOR UPDATE USING (
        (auth.uid() = student_id AND status = 'Submitted')
        OR public.is_admin_or_cmc()
    );

-- Categories & Locations Policies
DROP POLICY IF EXISTS "Authenticated Read Categories" ON public.categories;
DROP POLICY IF EXISTS "Authenticated Read Locations" ON public.locations;

CREATE POLICY "Authenticated Read Categories" ON public.categories
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated Read Locations" ON public.locations
    FOR SELECT USING (auth.role() = 'authenticated');

-- Notifications Policies
DROP POLICY IF EXISTS "Users Read Own Notifications" ON public.notifications;
DROP POLICY IF EXISTS "Users Update Read Notifications" ON public.notifications;

CREATE POLICY "Users Read Own Notifications" ON public.notifications
    FOR SELECT USING (
        auth.uid() = user_id
        OR public.is_admin_or_cmc()
    );

CREATE POLICY "Users Update Read Notifications" ON public.notifications
    FOR UPDATE USING (auth.uid() = user_id);

-- Assignments & Status History Policies
DROP POLICY IF EXISTS "Authenticated Read Assignments" ON public.assignments;
DROP POLICY IF EXISTS "Admins Insert Assignments" ON public.assignments;
DROP POLICY IF EXISTS "Authenticated Read Status History" ON public.status_history;
DROP POLICY IF EXISTS "Admins Insert Status History" ON public.status_history;
DROP POLICY IF EXISTS "Read Assignments Access" ON public.assignments;
DROP POLICY IF EXISTS "Read Status History Access" ON public.status_history;

CREATE POLICY "Read Assignments Access" ON public.assignments
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.submissions s
            WHERE s.id = assignments.submission_id AND s.student_id = auth.uid()
        )
        OR public.is_admin_or_cmc()
    );

CREATE POLICY "Admins Insert Assignments" ON public.assignments
    FOR INSERT WITH CHECK (public.is_admin_or_cmc());

CREATE POLICY "Read Status History Access" ON public.status_history
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.submissions s
            WHERE s.id = status_history.submission_id AND s.student_id = auth.uid()
        )
        OR public.is_admin_or_cmc()
    );

CREATE POLICY "Admins Insert Status History" ON public.status_history
    FOR INSERT WITH CHECK (public.is_admin_or_cmc());

-- Resolution Records Policies
DROP POLICY IF EXISTS "Authenticated Read Resolutions" ON public.resolution_records;
DROP POLICY IF EXISTS "Admins Manage Resolutions" ON public.resolution_records;
DROP POLICY IF EXISTS "Read Resolutions Access" ON public.resolution_records;

CREATE POLICY "Read Resolutions Access" ON public.resolution_records
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Admins Manage Resolutions" ON public.resolution_records
    FOR ALL USING (public.is_admin_or_cmc());

-- 8. ENSURE ADMIN PROFILE RECORD
UPDATE public.profiles
SET role = 'ADMIN', is_approved = TRUE, approval_status = 'APPROVED'
WHERE email = 'admin@srgec.edu';
