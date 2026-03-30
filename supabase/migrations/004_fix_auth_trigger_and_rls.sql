-- ============================================================
-- Migration 004: Fix auth trigger for email signup + fix RLS
-- ============================================================

-- ── 1. Fix trigger: handle email signup (no metadata) ────────────────────────
CREATE OR REPLACE FUNCTION public.handle_new_auth_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.users (id, email, name, profile_picture)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(
      NEW.raw_user_meta_data->>'full_name',
      NEW.raw_user_meta_data->>'name',
      split_part(NEW.email, '@', 1)   -- fallback for email/password signup
    ),
    COALESCE(
      NEW.raw_user_meta_data->>'avatar_url',
      NEW.raw_user_meta_data->>'picture'
    )
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    name  = COALESCE(EXCLUDED.name, public.users.name);
  RETURN NEW;
END;
$$;

-- ── 2. Fix RLS: drop old incomplete policies, add WITH CHECK ─────────────────

-- vision_projects
DROP POLICY IF EXISTS "vision_projects_owner"  ON public.vision_projects;
DROP POLICY IF EXISTS "vision_projects_select" ON public.vision_projects;
DROP POLICY IF EXISTS "vision_projects_insert" ON public.vision_projects;
DROP POLICY IF EXISTS "vision_projects_update" ON public.vision_projects;
DROP POLICY IF EXISTS "vision_projects_delete" ON public.vision_projects;

CREATE POLICY "vision_projects_select" ON public.vision_projects
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "vision_projects_insert" ON public.vision_projects
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "vision_projects_update" ON public.vision_projects
  FOR UPDATE USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "vision_projects_delete" ON public.vision_projects
  FOR DELETE USING (auth.uid() = user_id);

-- media_generations
DROP POLICY IF EXISTS "media_generations_owner"  ON public.media_generations;
DROP POLICY IF EXISTS "media_generations_select" ON public.media_generations;
DROP POLICY IF EXISTS "media_generations_insert" ON public.media_generations;
DROP POLICY IF EXISTS "media_generations_update" ON public.media_generations;

CREATE POLICY "media_generations_select" ON public.media_generations
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.vision_projects vp
            WHERE vp.id = vision_project_id AND vp.user_id = auth.uid())
  );

CREATE POLICY "media_generations_insert" ON public.media_generations
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM public.vision_projects vp
            WHERE vp.id = vision_project_id AND vp.user_id = auth.uid())
  );

CREATE POLICY "media_generations_update" ON public.media_generations
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM public.vision_projects vp
            WHERE vp.id = vision_project_id AND vp.user_id = auth.uid())
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.vision_projects vp
            WHERE vp.id = vision_project_id AND vp.user_id = auth.uid())
  );

-- users: add insert policy for direct client upserts
DROP POLICY IF EXISTS "users_select_own" ON public.users;
DROP POLICY IF EXISTS "users_insert_own" ON public.users;
DROP POLICY IF EXISTS "users_update_own" ON public.users;

CREATE POLICY "users_select_own" ON public.users
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "users_insert_own" ON public.users
  FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "users_update_own" ON public.users
  FOR UPDATE USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);
