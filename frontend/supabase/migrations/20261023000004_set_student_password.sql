-- ==============================================================================
-- Migration: 20261023000004_set_student_password.sql
-- Purpose: Set credentials for Student Roll Number 24481A54E9 (AIDS Dept)
-- ==============================================================================

-- 1. Update password in auth.users for hasinipothanaboyina0@gmail.com
UPDATE auth.users
SET encrypted_password = crypt('Password123!', gen_salt('bf')),
    email_confirmed_at = COALESCE(email_confirmed_at, NOW()),
    updated_at = NOW()
WHERE email = 'hasinipothanaboyina0@gmail.com';

-- 2. Ensure profile has department AIDS, approved status, and matching roll number
UPDATE public.profiles
SET department = 'AIDS',
    student_id = '24481A54E9',
    roll_number = '24481A54E9',
    is_approved = TRUE,
    approval_status = 'APPROVED',
    updated_at = NOW()
WHERE email = 'hasinipothanaboyina0@gmail.com' OR student_id = '24481A54E9';
