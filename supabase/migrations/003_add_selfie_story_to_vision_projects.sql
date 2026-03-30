-- ============================================================
-- Migration 003: Add selfie_url and story_inputs to vision_projects
-- ============================================================

ALTER TABLE public.vision_projects
  ADD COLUMN IF NOT EXISTS selfie_url   TEXT,
  ADD COLUMN IF NOT EXISTS story_inputs JSONB;
