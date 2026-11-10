-- CAMPUSCARE DATABASE CLEANUP SCRIPT
-- This script deletes ALL student data, submissions, and history,
-- leaving ONLY the admin account (student_id = '24481A67383').

-- 1. Truncate all application data tables
-- CASCADE will also delete related records like resolution_records and assignments
TRUNCATE TABLE public.submissions CASCADE;
TRUNCATE TABLE public.notifications CASCADE;
TRUNCATE TABLE public.supports CASCADE;
TRUNCATE TABLE public.status_history CASCADE;
TRUNCATE TABLE public.resolution_records CASCADE;
TRUNCATE TABLE public.assignments CASCADE;
TRUNCATE TABLE public.attachments CASCADE;

-- 2. Delete all user accounts EXCEPT the master admin
DELETE FROM auth.users 
WHERE id IN (
    SELECT id FROM public.profiles 
    WHERE student_id != '24481A67383' OR student_id IS NULL
);

-- Note: Because public.profiles has ON DELETE CASCADE linked to auth.users,
-- deleting from auth.users automatically deletes their profile rows too!

-- Your database is now completely empty of fake/student data!
