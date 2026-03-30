-- ============================================================
-- MakeVision.video — Initial Database Schema
-- ============================================================

-- Enable pgcrypto for gen_random_uuid() — available by default in Supabase
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================
-- ENUMS
-- ============================================================

CREATE TYPE vision_project_status AS ENUM (
  'Draft',
  'Images_Ready',
  'Payment_Pending',
  'Processing',
  'Completed'
);

CREATE TYPE media_type AS ENUM (
  'Image',
  'Video'
);

CREATE TYPE payment_status AS ENUM (
  'Pending',
  'Success',
  'Failed'
);

-- ============================================================
-- USERS
-- Mirror of auth.users — populated via trigger on signup
-- ============================================================

CREATE TABLE public.users (
  id             UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email          TEXT NOT NULL UNIQUE,
  name           TEXT,
  profile_picture TEXT,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- VISION PROJECTS
-- ============================================================

CREATE TABLE public.vision_projects (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  status          vision_project_status NOT NULL DEFAULT 'Draft',
  revision_count  INT NOT NULL DEFAULT 0,
  final_video_url TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_vision_projects_user_id ON public.vision_projects(user_id);

-- ============================================================
-- MEDIA GENERATIONS
-- ============================================================

CREATE TABLE public.media_generations (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vision_project_id   UUID NOT NULL REFERENCES public.vision_projects(id) ON DELETE CASCADE,
  media_type          media_type NOT NULL,
  prompt_text         TEXT NOT NULL,
  negative_prompt     TEXT NOT NULL DEFAULT '',
  media_url           TEXT NOT NULL,
  is_selected         BOOLEAN NOT NULL DEFAULT FALSE,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_media_generations_project_id ON public.media_generations(vision_project_id);

-- ============================================================
-- PAYMENTS
-- ============================================================

CREATE TABLE public.payments (
  id                          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                     UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  vision_project_id           UUID NOT NULL REFERENCES public.vision_projects(id) ON DELETE CASCADE,
  amount                      NUMERIC(10, 2) NOT NULL,
  status                      payment_status NOT NULL DEFAULT 'Pending',
  lemon_squeezy_transaction_id TEXT NOT NULL,
  created_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_payments_user_id ON public.payments(user_id);
CREATE INDEX idx_payments_project_id ON public.payments(vision_project_id);

-- ============================================================
-- AUTO-UPDATE updated_at TRIGGER
-- ============================================================

CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_users_updated_at
  BEFORE UPDATE ON public.users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_vision_projects_updated_at
  BEFORE UPDATE ON public.vision_projects
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================
-- AUTH TRIGGER — Auto-create user record on signup
-- Fires for both Google OAuth and Apple OAuth
-- ============================================================

CREATE OR REPLACE FUNCTION public.handle_new_auth_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, email, name, profile_picture)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(
      NEW.raw_user_meta_data->>'full_name',
      NEW.raw_user_meta_data->>'name'
    ),
    COALESCE(
      NEW.raw_user_meta_data->>'avatar_url',
      NEW.raw_user_meta_data->>'picture'
    )
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trg_on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_auth_user();

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vision_projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.media_generations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

-- Users: can only read/update their own record
CREATE POLICY "users_select_own" ON public.users
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "users_update_own" ON public.users
  FOR UPDATE USING (auth.uid() = id);

-- Vision Projects: full CRUD for owner
CREATE POLICY "vision_projects_select" ON public.vision_projects
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "vision_projects_insert" ON public.vision_projects
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "vision_projects_update" ON public.vision_projects
  FOR UPDATE USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "vision_projects_delete" ON public.vision_projects
  FOR DELETE USING (auth.uid() = user_id);

-- Media Generations: accessible if user owns the parent project
CREATE POLICY "media_generations_select" ON public.media_generations
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.vision_projects vp
      WHERE vp.id = vision_project_id AND vp.user_id = auth.uid()
    )
  );

CREATE POLICY "media_generations_insert" ON public.media_generations
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.vision_projects vp
      WHERE vp.id = vision_project_id AND vp.user_id = auth.uid()
    )
  );

CREATE POLICY "media_generations_update" ON public.media_generations
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.vision_projects vp
      WHERE vp.id = vision_project_id AND vp.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.vision_projects vp
      WHERE vp.id = vision_project_id AND vp.user_id = auth.uid()
    )
  );

-- Payments: readable by owner only
CREATE POLICY "payments_owner" ON public.payments
  FOR SELECT USING (auth.uid() = user_id);
