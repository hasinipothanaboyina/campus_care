-- ==============================================================================
-- Migration: 20261023000003_phase3_parent_link_rpc.sql
-- Purpose: Phase 3 Module 1 - Secure Parent-Student Link Request RPC (CWE-426 compliant)
-- ==============================================================================

CREATE OR REPLACE FUNCTION public.request_student_link(p_roll_number TEXT)
RETURNS JSONB AS $$
DECLARE
    v_clean TEXT := UPPER(TRIM(p_roll_number));
    v_student_id UUID;
    v_existing_status TEXT;
    v_link_id UUID;
BEGIN
    -- 1. Ensure caller is authenticated
    IF auth.uid() IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'Authentication required.');
    END IF;

    -- 2. Find student by roll number
    SELECT id INTO v_student_id
    FROM public.profiles
    WHERE (UPPER(student_id) = v_clean OR UPPER(roll_number) = v_clean)
      AND role IN ('STUDENT', 'student')
    LIMIT 1;

    IF v_student_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'Student with Roll Number "' || v_clean || '" was not found in college records.');
    END IF;

    -- 3. Check for existing link
    SELECT verification_status INTO v_existing_status
    FROM public.parent_student_links
    WHERE parent_id = auth.uid() AND student_id = v_student_id
    LIMIT 1;

    IF v_existing_status IS NOT NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'A link request for Roll Number "' || v_clean || '" is already ' || LOWER(v_existing_status) || '.');
    END IF;

    -- 4. Insert pending link request
    INSERT INTO public.parent_student_links (
        parent_id,
        student_id,
        student_roll_number,
        verification_status
    ) VALUES (
        auth.uid(),
        v_student_id,
        v_clean,
        'PENDING_VERIFICATION'
    ) RETURNING id INTO v_link_id;

    RETURN jsonb_build_object('success', true, 'link_id', v_link_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

GRANT EXECUTE ON FUNCTION public.request_student_link(TEXT) TO authenticated;
