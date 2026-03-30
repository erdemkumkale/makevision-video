-- ============================================================
-- Migration 006: video_jobs table for async full-video pipeline
-- ============================================================

CREATE TABLE IF NOT EXISTS public.video_jobs (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vision_project_id uuid NOT NULL REFERENCES public.vision_projects(id) ON DELETE CASCADE,
  user_id           uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status            text NOT NULL DEFAULT 'processing',  -- processing | completed | failed
  video_url         text,
  error             text,
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now()
);

-- Index for fast lookup by project
CREATE INDEX IF NOT EXISTS video_jobs_project_idx ON public.video_jobs(vision_project_id);

-- RLS
ALTER TABLE public.video_jobs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own video jobs"
  ON public.video_jobs FOR SELECT
  USING (auth.uid() = user_id);

-- updated_at trigger
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

DROP TRIGGER IF EXISTS video_jobs_updated_at ON public.video_jobs;
CREATE TRIGGER video_jobs_updated_at
  BEFORE UPDATE ON public.video_jobs
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
