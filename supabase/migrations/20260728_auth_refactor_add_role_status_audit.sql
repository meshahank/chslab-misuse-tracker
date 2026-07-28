-- Add role and status columns to profiles table
ALTER TABLE public.profiles ADD COLUMN role TEXT NOT NULL DEFAULT 'lab_admin' CHECK (role IN ('super_admin', 'lab_admin'));
ALTER TABLE public.profiles ADD COLUMN status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'disabled'));

-- Create audit_logs table to track all permission changes
CREATE TABLE public.audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  target_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  action TEXT NOT NULL CHECK (action IN ('promote', 'demote', 'disable', 'enable')),
  old_value TEXT,
  new_value TEXT,
  reason TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS on audit_logs
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- RLS policies for audit_logs
-- Super admins can view all audit logs
CREATE POLICY "super_admin_view_all_audit_logs" ON public.audit_logs
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role = 'super_admin' 
      AND profiles.status = 'active'
    )
  );

-- Lab admins can view logs related to their own changes
CREATE POLICY "lab_admin_view_own_audit_logs" ON public.audit_logs
  FOR SELECT USING (
    auth.uid() = target_user_id 
    OR (
      EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE profiles.id = auth.uid() 
        AND profiles.role = 'super_admin' 
        AND profiles.status = 'active'
      )
    )
  );

-- Only authenticated users can insert audit logs (via server functions)
CREATE POLICY "authenticated_insert_audit_logs" ON public.audit_logs
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- Update profiles RLS policies
-- First drop old policies if they exist
DROP POLICY IF EXISTS "users_can_select_own_profile" ON public.profiles;
DROP POLICY IF EXISTS "super_admin_select_all_profiles" ON public.profiles;
DROP POLICY IF EXISTS "super_admin_update_all_profiles" ON public.profiles;
DROP POLICY IF EXISTS "users_can_update_own_profile" ON public.profiles;

-- Authenticated users can select their own profile
CREATE POLICY "users_can_select_own_profile" ON public.profiles
  FOR SELECT USING (auth.uid() = id);

-- Super admins can select all profiles
CREATE POLICY "super_admin_select_all_profiles" ON public.profiles
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.profiles p 
      WHERE p.id = auth.uid() 
      AND p.role = 'super_admin' 
      AND p.status = 'active'
    )
  );

-- Super admins can update all profiles
CREATE POLICY "super_admin_update_all_profiles" ON public.profiles
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.profiles p 
      WHERE p.id = auth.uid() 
      AND p.role = 'super_admin' 
      AND p.status = 'active'
    )
  ) WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles p 
      WHERE p.id = auth.uid() 
      AND p.role = 'super_admin' 
      AND p.status = 'active'
    )
  );

-- Users can update their own profile (non-role/status fields)
CREATE POLICY "users_can_update_own_profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = id AND status = 'active')
  WITH CHECK (auth.uid() = id AND role = (SELECT role FROM public.profiles WHERE id = auth.uid()) AND status = 'active');

-- Disabled users cannot select any profiles (except own, implicitly blocked by active requirement)
-- This is handled by checking status = 'active' in the policies above
