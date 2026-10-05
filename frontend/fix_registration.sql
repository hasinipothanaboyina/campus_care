-- 1. Drop the old trigger to be safe
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- 2. Create the fixed function that uses student_id instead of roll_number
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, email, full_name, student_id, role, is_approved)
    VALUES (
        NEW.id,
        NEW.email,
        NEW.raw_user_meta_data->>'full_name',
        COALESCE(NEW.raw_user_meta_data->>'student_id', NEW.raw_user_meta_data->>'roll_number', ''),
        COALESCE(NEW.raw_user_meta_data->>'role', 'STUDENT'),
        false
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Re-attach the trigger
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 4. Clean up any broken registration attempts so you don't get "User already registered"
DELETE FROM auth.users 
WHERE id NOT IN (SELECT id FROM public.profiles);
