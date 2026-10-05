-- CampusCare Full PostgreSQL Database & Security Migration
-- Product: CampusCare - Student Voice & Campus Improvement Platform

-- 1. Enable Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. Create PROFILES Table
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    roll_number TEXT,
    full_name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    role TEXT NOT NULL DEFAULT 'STUDENT' CHECK (role IN ('STUDENT', 'ADMIN', 'CMC', 'student', 'admin', 'cmc')),
    department TEXT,
    year TEXT,
    section TEXT,
    avatar_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Create CATEGORIES Table
CREATE TABLE IF NOT EXISTS public.categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT UNIQUE NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('issue', 'suggestion', 'improvement_request')),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Create LOCATIONS Table
CREATE TABLE IF NOT EXISTS public.locations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    building TEXT NOT NULL,
    room TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT unique_building_room UNIQUE (building, room)
);

-- 5. Create SUBMISSIONS Table
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

-- 6. Create SUPPORTS Table (Upvotes)
CREATE TABLE IF NOT EXISTS public.supports (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    submission_id TEXT NOT NULL REFERENCES public.submissions(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT unique_user_submission_support UNIQUE (submission_id, user_id)
);

-- 7. Create ASSIGNMENTS Table
CREATE TABLE IF NOT EXISTS public.assignments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    submission_id TEXT NOT NULL REFERENCES public.submissions(id) ON DELETE CASCADE,
    assigned_to TEXT NOT NULL,
    assigned_team TEXT NOT NULL,
    assigned_by UUID REFERENCES public.profiles(id),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 8. Create STATUS_HISTORY Table
CREATE TABLE IF NOT EXISTS public.status_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    submission_id TEXT NOT NULL REFERENCES public.submissions(id) ON DELETE CASCADE,
    old_status TEXT NOT NULL,
    new_status TEXT NOT NULL,
    changed_by UUID REFERENCES public.profiles(id),
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 9. Create NOTIFICATIONS Table
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

-- 10. Create RESOLUTION_RECORDS Table
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

-- 11. Create ATTACHMENTS Table
CREATE TABLE IF NOT EXISTS public.attachments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    submission_id TEXT NOT NULL REFERENCES public.submissions(id) ON DELETE CASCADE,
    file_name TEXT NOT NULL,
    file_url TEXT NOT NULL,
    file_type TEXT,
    uploaded_by UUID REFERENCES public.profiles(id),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 12. SEED INITIAL CATEGORIES AND LOCATIONS
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

-- 13. AUTOMATIC PROFILE CREATION TRIGGER ON SIGNUP
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, email, full_name, roll_number, role)
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'full_name', SPLIT_PART(NEW.email, '@', 1)),
        COALESCE(NEW.raw_user_meta_data->>'student_id', NEW.raw_user_meta_data->>'roll_number', ''),
        COALESCE(NEW.raw_user_meta_data->>'role', 'STUDENT')
    )
    ON CONFLICT (id) DO UPDATE SET
        full_name = EXCLUDED.full_name,
        roll_number = EXCLUDED.roll_number;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 14. ROW LEVEL SECURITY (RLS) POLICIES
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.supports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.status_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.resolution_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attachments ENABLE ROW LEVEL SECURITY;

-- Profiles Policies
CREATE POLICY "Public Profiles Read Access" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Users Update Own Profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);

-- Categories & Locations Policies
CREATE POLICY "Authenticated Read Categories" ON public.categories FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Authenticated Read Locations" ON public.locations FOR SELECT USING (auth.role() = 'authenticated');

-- Submissions Policies
CREATE POLICY "Authenticated Read Submissions" ON public.submissions FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Students Insert Own Submissions" ON public.submissions FOR INSERT WITH CHECK (auth.uid() = student_id);
CREATE POLICY "Submitter Or Admin Update Submissions" ON public.submissions FOR UPDATE USING (
    auth.uid() = student_id OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('ADMIN', 'CMC', 'admin', 'cmc'))
);

-- Supports Policies
CREATE POLICY "Authenticated Read Supports" ON public.supports FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Users Insert Own Support" ON public.supports FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users Delete Own Support" ON public.supports FOR DELETE USING (auth.uid() = user_id);

-- Assignments & Status History Policies
CREATE POLICY "Authenticated Read Assignments" ON public.assignments FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Admins Insert Assignments" ON public.assignments FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('ADMIN', 'CMC', 'admin', 'cmc'))
);

CREATE POLICY "Authenticated Read Status History" ON public.status_history FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Admins Insert Status History" ON public.status_history FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('ADMIN', 'CMC', 'admin', 'cmc'))
);

-- Notifications Policies
CREATE POLICY "Users Read Own Notifications" ON public.notifications FOR SELECT USING (
    auth.uid() = user_id OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('ADMIN', 'CMC', 'admin', 'cmc'))
);
CREATE POLICY "Users Update Read Notifications" ON public.notifications FOR UPDATE USING (auth.uid() = user_id);

-- Resolution Records Policies
CREATE POLICY "Authenticated Read Resolutions" ON public.resolution_records FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Admins Manage Resolutions" ON public.resolution_records FOR ALL USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('ADMIN', 'CMC', 'admin', 'cmc'))
);

-- Attachments Policies
CREATE POLICY "Authenticated Read Attachments" ON public.attachments FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Users Insert Attachments" ON public.attachments FOR INSERT WITH CHECK (auth.uid() = uploaded_by);
