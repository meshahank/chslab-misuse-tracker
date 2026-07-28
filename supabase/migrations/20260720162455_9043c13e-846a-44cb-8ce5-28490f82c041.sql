
-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Roles
DO $$ BEGIN
  CREATE TYPE public.app_role AS ENUM ('super_admin', 'lab_admin');
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- Profiles
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username TEXT NOT NULL UNIQUE,
  full_name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- User roles
CREATE TABLE IF NOT EXISTS public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Security-definer role checker
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  );
$$;

-- Reports
CREATE TABLE IF NOT EXISTS public.misuse_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_name TEXT NOT NULL,
  student_class TEXT NOT NULL,
  description TEXT NOT NULL,
  incident_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  important BOOLEAN NOT NULL DEFAULT false,
  status TEXT NOT NULL DEFAULT 'active', -- 'active' | 'punished'
  is_deleted BOOLEAN NOT NULL DEFAULT false,
  reported_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  reported_by_name TEXT NOT NULL,
  punished_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.misuse_reports TO authenticated;
GRANT ALL ON public.misuse_reports TO service_role;
ALTER TABLE public.misuse_reports ENABLE ROW LEVEL SECURITY;

-- Policies: profiles
DROP POLICY IF EXISTS "profiles_select_all_authed" ON public.profiles;
CREATE POLICY "profiles_select_all_authed" ON public.profiles
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "profiles_update_own_or_super" ON public.profiles;
CREATE POLICY "profiles_update_own_or_super" ON public.profiles
  FOR UPDATE TO authenticated
  USING (auth.uid() = id OR public.has_role(auth.uid(), 'super_admin'))
  WITH CHECK (auth.uid() = id OR public.has_role(auth.uid(), 'super_admin'));

DROP POLICY IF EXISTS "profiles_insert_self_or_super" ON public.profiles;
CREATE POLICY "profiles_insert_self_or_super" ON public.profiles
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = id OR public.has_role(auth.uid(), 'super_admin'));

-- Policies: user_roles (read-only for authed; writes via service role)
DROP POLICY IF EXISTS "user_roles_select_all_authed" ON public.user_roles;
CREATE POLICY "user_roles_select_all_authed" ON public.user_roles
  FOR SELECT TO authenticated USING (true);

-- Policies: reports
DROP POLICY IF EXISTS "reports_select_all_authed" ON public.misuse_reports;
CREATE POLICY "reports_select_all_authed" ON public.misuse_reports
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "reports_insert_authed" ON public.misuse_reports;
CREATE POLICY "reports_insert_authed" ON public.misuse_reports
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = reported_by);

DROP POLICY IF EXISTS "reports_update_owner_or_super" ON public.misuse_reports;
CREATE POLICY "reports_update_owner_or_super" ON public.misuse_reports
  FOR UPDATE TO authenticated
  USING (auth.uid() = reported_by OR public.has_role(auth.uid(), 'super_admin'))
  WITH CHECK (auth.uid() = reported_by OR public.has_role(auth.uid(), 'super_admin'));

DROP POLICY IF EXISTS "reports_delete_owner_or_super" ON public.misuse_reports;
CREATE POLICY "reports_delete_owner_or_super" ON public.misuse_reports
  FOR DELETE TO authenticated
  USING (auth.uid() = reported_by OR public.has_role(auth.uid(), 'super_admin'));

-- updated_at trigger
CREATE OR REPLACE FUNCTION public.tg_set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END $$;

DROP TRIGGER IF EXISTS trg_reports_updated_at ON public.misuse_reports;
CREATE TRIGGER trg_reports_updated_at BEFORE UPDATE ON public.misuse_reports
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

DROP TRIGGER IF EXISTS trg_profiles_updated_at ON public.profiles;
CREATE TRIGGER trg_profiles_updated_at BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

-- Seed the initial Super Admin (username "admin", password "admin123")
DO $$
DECLARE
  admin_id UUID;
  admin_email TEXT := 'admin@lab.local';
BEGIN
  SELECT id INTO admin_id FROM auth.users WHERE email = admin_email;
  IF admin_id IS NULL THEN
    admin_id := gen_random_uuid();
    INSERT INTO auth.users (
      instance_id, id, aud, role, email, encrypted_password,
      email_confirmed_at, created_at, updated_at,
      raw_app_meta_data, raw_user_meta_data, is_super_admin,
      confirmation_token, email_change, email_change_token_new, recovery_token
    ) VALUES (
      '00000000-0000-0000-0000-000000000000', admin_id, 'authenticated', 'authenticated',
      admin_email, crypt('admin123', gen_salt('bf')),
      now(), now(), now(),
      '{"provider":"email","providers":["email"]}'::jsonb,
      '{"username":"admin","full_name":"Super Admin"}'::jsonb,
      false, '', '', '', ''
    );
    INSERT INTO auth.identities (
      id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at
    ) VALUES (
      gen_random_uuid(), admin_id, admin_id::text,
      jsonb_build_object('sub', admin_id::text, 'email', admin_email, 'email_verified', true),
      'email', now(), now(), now()
    );
  END IF;

  INSERT INTO public.profiles (id, username, full_name)
    VALUES (admin_id, 'admin', 'Super Admin')
    ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.user_roles (user_id, role)
    VALUES (admin_id, 'super_admin')
    ON CONFLICT (user_id, role) DO NOTHING;
END $$;
