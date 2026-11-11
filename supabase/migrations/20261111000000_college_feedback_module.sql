-- ==============================================================================
-- Migration: 20261111000000_college_feedback_module.sql
-- Purpose: Dynamic College Feedback Module for Administration and Parents
-- Preserves: All existing tables, profiles, submissions, links, notifications
-- ==============================================================================

-- 1. Create FEEDBACK_FORMS Table
CREATE TABLE IF NOT EXISTS public.feedback_forms (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    description TEXT,
    target_audience TEXT NOT NULL DEFAULT 'ALL_PARENTS',
    status TEXT NOT NULL DEFAULT 'DRAFT' CHECK (status IN ('DRAFT', 'PUBLISHED', 'CLOSED', 'ARCHIVED')),
    deadline TIMESTAMPTZ,
    created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    published_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Create FEEDBACK_QUESTIONS Table
CREATE TABLE IF NOT EXISTS public.feedback_questions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    form_id UUID NOT NULL REFERENCES public.feedback_forms(id) ON DELETE CASCADE,
    question_text TEXT NOT NULL,
    question_type TEXT NOT NULL CHECK (question_type IN ('rating', 'multiple_choice', 'text')),
    options JSONB DEFAULT '[]'::jsonb,
    is_required BOOLEAN NOT NULL DEFAULT true,
    order_index INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Create FEEDBACK_RESPONSES Table
CREATE TABLE IF NOT EXISTS public.feedback_responses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    form_id UUID NOT NULL REFERENCES public.feedback_forms(id) ON DELETE CASCADE,
    parent_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    submitted_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT unique_parent_form_response UNIQUE (form_id, parent_id)
);

-- 4. Create FEEDBACK_ANSWERS Table
CREATE TABLE IF NOT EXISTS public.feedback_answers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    response_id UUID NOT NULL REFERENCES public.feedback_responses(id) ON DELETE CASCADE,
    question_id UUID NOT NULL REFERENCES public.feedback_questions(id) ON DELETE CASCADE,
    rating_value INTEGER CHECK (rating_value BETWEEN 1 AND 5),
    selected_option TEXT,
    text_response TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Indexes for High-Performance Queries
CREATE INDEX IF NOT EXISTS idx_feedback_forms_status ON public.feedback_forms(status);
CREATE INDEX IF NOT EXISTS idx_feedback_questions_form_id ON public.feedback_questions(form_id);
CREATE INDEX IF NOT EXISTS idx_feedback_responses_form_id ON public.feedback_responses(form_id);
CREATE INDEX IF NOT EXISTS idx_feedback_responses_parent_id ON public.feedback_responses(parent_id);
CREATE INDEX IF NOT EXISTS idx_feedback_answers_response_id ON public.feedback_answers(response_id);

-- 6. Enable Row Level Security (RLS)
ALTER TABLE public.feedback_forms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.feedback_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.feedback_responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.feedback_answers ENABLE ROW LEVEL SECURITY;

-- 7. RLS Policies for feedback_forms
DROP POLICY IF EXISTS "admins_manage_feedback_forms" ON public.feedback_forms;
CREATE POLICY "admins_manage_feedback_forms" ON public.feedback_forms
    FOR ALL TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE id = auth.uid() AND role IN ('ADMIN', 'CMC', 'admin', 'cmc')
        )
    );

DROP POLICY IF EXISTS "parents_view_published_forms" ON public.feedback_forms;
CREATE POLICY "parents_view_published_forms" ON public.feedback_forms
    FOR SELECT TO authenticated
    USING (
        status = 'PUBLISHED' OR status = 'CLOSED'
    );

-- 8. RLS Policies for feedback_questions
DROP POLICY IF EXISTS "admins_manage_feedback_questions" ON public.feedback_questions;
CREATE POLICY "admins_manage_feedback_questions" ON public.feedback_questions
    FOR ALL TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE id = auth.uid() AND role IN ('ADMIN', 'CMC', 'admin', 'cmc')
        )
    );

DROP POLICY IF EXISTS "parents_view_published_questions" ON public.feedback_questions;
CREATE POLICY "parents_view_published_questions" ON public.feedback_questions
    FOR SELECT TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.feedback_forms 
            WHERE id = feedback_questions.form_id AND status IN ('PUBLISHED', 'CLOSED')
        )
    );

-- 9. RLS Policies for feedback_responses
DROP POLICY IF EXISTS "admins_view_all_responses" ON public.feedback_responses;
CREATE POLICY "admins_view_all_responses" ON public.feedback_responses
    FOR ALL TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE id = auth.uid() AND role IN ('ADMIN', 'CMC', 'admin', 'cmc')
        )
    );

DROP POLICY IF EXISTS "parents_manage_own_responses" ON public.feedback_responses;
CREATE POLICY "parents_manage_own_responses" ON public.feedback_responses
    FOR SELECT TO authenticated
    USING (parent_id = auth.uid());

DROP POLICY IF EXISTS "parents_insert_own_response" ON public.feedback_responses;
CREATE POLICY "parents_insert_own_response" ON public.feedback_responses
    FOR INSERT TO authenticated
    WITH CHECK (parent_id = auth.uid());

-- 10. RLS Policies for feedback_answers
DROP POLICY IF EXISTS "admins_view_all_answers" ON public.feedback_answers;
CREATE POLICY "admins_view_all_answers" ON public.feedback_answers
    FOR ALL TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE id = auth.uid() AND role IN ('ADMIN', 'CMC', 'admin', 'cmc')
        )
    );

DROP POLICY IF EXISTS "parents_view_own_answers" ON public.feedback_answers;
CREATE POLICY "parents_view_own_answers" ON public.feedback_answers
    FOR SELECT TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.feedback_responses 
            WHERE id = feedback_answers.response_id AND parent_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "parents_insert_own_answers" ON public.feedback_answers;
CREATE POLICY "parents_insert_own_answers" ON public.feedback_answers
    FOR INSERT TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.feedback_responses 
            WHERE id = feedback_answers.response_id AND parent_id = auth.uid()
        )
    );

-- 11. Helper Function: Broadcast Feedback Form Notification to Parents
CREATE OR REPLACE FUNCTION public.broadcast_feedback_notification(p_form_id UUID)
RETURNS INTEGER AS $$
DECLARE
    v_form RECORD;
    v_parent RECORD;
    v_count INTEGER := 0;
BEGIN
    SELECT * INTO v_form FROM public.feedback_forms WHERE id = p_form_id;
    IF v_form.id IS NULL THEN
        RETURN 0;
    END IF;

    FOR v_parent IN 
        SELECT id FROM public.profiles WHERE role = 'PARENT'
    LOOP
        INSERT INTO public.notifications (
            user_id,
            title,
            message,
            type,
            submission_id,
            read,
            created_at
        ) VALUES (
            v_parent.id,
            'New College Feedback: ' || v_form.title,
            'College administration has published a new feedback form on "' || v_form.title || '". Please review and submit your feedback.',
            'info',
            'FB-' || v_form.id::text,
            false,
            NOW()
        );
        v_count := v_count + 1;
    END LOOP;

    RETURN v_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

GRANT EXECUTE ON FUNCTION public.broadcast_feedback_notification(UUID) TO authenticated;
