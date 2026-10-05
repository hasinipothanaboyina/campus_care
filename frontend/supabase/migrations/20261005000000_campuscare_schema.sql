-- CampusCare PostgreSQL Database Schema & Security Migration
-- Product: CampusCare - Student Voice & Campus Improvement Platform

-- 1. Enable UUID Extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. Create PROFILES Table
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    full_name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    role TEXT NOT NULL DEFAULT 'STUDENT' CHECK (role IN ('STUDENT', 'ADMIN', 'CMC')),
    student_id TEXT,
    department TEXT,
    year TEXT,
    section TEXT,
    avatar_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Create SUBMISSIONS Table
CREATE TABLE IF NOT EXISTS public.submissions (
    id TEXT PRIMARY KEY, -- e.g. CC-2026-101
    type TEXT NOT NULL CHECK (type IN ('issue', 'suggestion', 'improvement_request')),
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    category TEXT NOT NULL,
    building TEXT,
    room TEXT,
    location TEXT NOT NULL,
    urgency TEXT NOT NULL DEFAULT 'Medium' CHECK (urgency IN ('Low', 'Medium', 'High', 'Critical')),
    priority TEXT NOT NULL DEFAULT 'Medium' CHECK (priority IN ('Low', 'Medium', 'High', 'Critical')),
    priority_score INT DEFAULT 30,
    status TEXT NOT NULL DEFAULT 'Submitted' CHECK (status IN ('Submitted', 'Under Review', 'Verified', 'Assigned', 'In Progress', 'Resolved', 'Approved', 'Rejected', 'Closed')),
    image_url TEXT,
    student_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    student_name TEXT NOT NULL,
    student_roll_number TEXT,
    student_department TEXT,
    support_count INT DEFAULT 1,
    assigned_to TEXT,
    assigned_team TEXT,
    internal_notes TEXT,
    verified_by TEXT,
    verified_at TIMESTAMPTZ,
    reason TEXT,
    expected_benefit TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Create SUPPORTS Table (Upvotes)
CREATE TABLE IF NOT EXISTS public.supports (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    submission_id TEXT NOT NULL REFERENCES public.submissions(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT unique_user_submission_support UNIQUE (submission_id, user_id)
);

-- 5. Create NOTIFICATIONS Table
CREATE TABLE IF NOT EXISTS public.notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    type TEXT NOT NULL DEFAULT 'info' CHECK (type IN ('info', 'success', 'warning', 'status_change')),
    submission_id TEXT,
    read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. Create RESOLUTION_RECORDS Table
CREATE TABLE IF NOT EXISTS public.resolution_records (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    submission_id TEXT UNIQUE NOT NULL REFERENCES public.submissions(id) ON DELETE CASCADE,
    action_taken TEXT NOT NULL,
    responsible_person TEXT NOT NULL,
    resolved_date TIMESTAMPTZ DEFAULT NOW(),
    notes TEXT,
    before_image_url TEXT,
    after_image_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. ENABLE ROW LEVEL SECURITY (RLS)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.supports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.resolution_records ENABLE ROW LEVEL SECURITY;

-- 8. RLS POLICIES FOR PROFILES
CREATE POLICY "Public Profiles Read Access" ON public.profiles
    FOR SELECT USING (true);

CREATE POLICY "Users Update Own Profile" ON public.profiles
    FOR UPDATE USING (auth.uid() = id);

-- 9. RLS POLICIES FOR SUBMISSIONS
CREATE POLICY "All Authenticated Users Read Submissions" ON public.submissions
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Students Create Submissions" ON public.submissions
    FOR INSERT WITH CHECK (auth.uid() = student_id);

CREATE POLICY "Admins & Submitter Update Submissions" ON public.submissions
    FOR UPDATE USING (
        auth.uid() = student_id OR 
        EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('ADMIN', 'CMC'))
    );

-- 10. RLS POLICIES FOR SUPPORTS
CREATE POLICY "All Authenticated Users Read Supports" ON public.supports
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Users Toggle Own Support" ON public.supports
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users Delete Own Support" ON public.supports
    FOR DELETE USING (auth.uid() = user_id);

-- 11. RLS POLICIES FOR NOTIFICATIONS
CREATE POLICY "Users Read Own Notifications" ON public.notifications
    FOR SELECT USING (auth.uid() = user_id OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('ADMIN', 'CMC')));

CREATE POLICY "Users Update Own Notifications Read State" ON public.notifications
    FOR UPDATE USING (auth.uid() = user_id);

-- 12. RLS POLICIES FOR RESOLUTION RECORDS
CREATE POLICY "Authenticated Users Read Resolutions" ON public.resolution_records
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Admins Modify Resolutions" ON public.resolution_records
    FOR ALL USING (
        EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('ADMIN', 'CMC'))
    );
