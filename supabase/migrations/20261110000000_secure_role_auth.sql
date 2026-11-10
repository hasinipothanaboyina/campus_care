-- ==============================================================================
-- Migration: 20261110000000_secure_role_auth.sql
-- Purpose: Secure Role-Based Authentication & Non-Destructive Account Resolution
-- ==============================================================================

-- 1. HARDEN IDENTIFIER TO AUTH EMAIL RESOLUTION
CREATE OR REPLACE FUNCTION public.get_auth_email_by_identifier(p_identifier TEXT)
RETURNS TEXT AS $$
DECLARE
    v_clean TEXT := UPPER(TRIM(p_identifier));
    v_digits TEXT := REGEXP_REPLACE(TRIM(p_identifier), '[^0-9]', '', 'g');
    v_email TEXT;
BEGIN
    -- Check by Student ID / Roll Number / Phone Number
    -- Prioritize records with active logins and recent updates to deterministically resolve duplicate profiles
    SELECT email INTO v_email
    FROM public.profiles
    WHERE UPPER(student_id) = v_clean
       OR UPPER(roll_number) = v_clean
       OR phone = TRIM(p_identifier)
       OR (v_digits <> '' AND phone = v_digits)
    ORDER BY 
       (last_login IS NOT NULL) DESC,
       last_login DESC NULLS LAST,
       updated_at DESC
    LIMIT 1;

    RETURN v_email;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE SET search_path = public, pg_temp;

GRANT EXECUTE ON FUNCTION public.get_auth_email_by_identifier(TEXT) TO anon, authenticated;

-- 2. SECURE PASSWORD CONFIGURATION RPC (ADMIN/SERVICE_ROLE AUTHORIZED ONLY)
CREATE OR REPLACE FUNCTION public.admin_set_account_password(p_identifier TEXT, p_new_password TEXT)
RETURNS jsonb AS $$
DECLARE
    v_clean TEXT := UPPER(TRIM(p_identifier));
    v_digits TEXT := REGEXP_REPLACE(TRIM(p_identifier), '[^0-9]', '', 'g');
    v_user_id UUID;
    v_role TEXT;
    v_email TEXT;
BEGIN
    -- Authorization guard: caller must be service_role or an authenticated Admin/CMC
    IF auth.role() <> 'service_role' AND NOT public.is_admin_or_cmc() THEN
        RETURN jsonb_build_object('success', false, 'error', 'Unauthorized. Only college administrators can set account passwords.');
    END IF;

    -- Validate minimum password strength
    IF length(p_new_password) < 8 THEN
        RETURN jsonb_build_object('success', false, 'error', 'Password must be at least 8 characters long.');
    END IF;

    -- Resolve user profile deterministically
    SELECT id, role, email INTO v_user_id, v_role, v_email
    FROM public.profiles
    WHERE UPPER(student_id) = v_clean
       OR UPPER(roll_number) = v_clean
       OR phone = TRIM(p_identifier)
       OR (v_digits <> '' AND phone = v_digits)
       OR id::text = TRIM(p_identifier)
    ORDER BY 
       (last_login IS NOT NULL) DESC,
       last_login DESC NULLS LAST,
       updated_at DESC
    LIMIT 1;

    IF v_user_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'Target account not found for identifier: ' || p_identifier);
    END IF;

    -- Update password in auth.users using Supabase native bcrypt hashing
    UPDATE auth.users
    SET encrypted_password = extensions.crypt(p_new_password, extensions.gen_salt('bf')),
        email_confirmed_at = COALESCE(email_confirmed_at, NOW()),
        updated_at = NOW()
    WHERE id = v_user_id;

    RETURN jsonb_build_object(
        'success', true, 
        'user_id', v_user_id, 
        'role', v_role, 
        'email', v_email, 
        'message', 'Password updated successfully via Supabase Auth bcrypt hashing.'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, auth, extensions, pg_temp;

GRANT EXECUTE ON FUNCTION public.admin_set_account_password(TEXT, TEXT) TO authenticated, service_role;
