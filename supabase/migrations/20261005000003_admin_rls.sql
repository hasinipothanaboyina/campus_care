-- 1. Add policy to allow Admins to update ANY profile (needed to approve students)
CREATE POLICY "Admins Update Profiles" ON public.profiles 
FOR UPDATE USING (
  EXISTS (
    SELECT 1 FROM public.profiles p 
    WHERE p.id = auth.uid() AND p.role = 'ADMIN'
  )
);
