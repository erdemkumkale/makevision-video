-- Migration 009: Add reference_images to vision_projects
-- Stores optional inspiration images uploaded by the user
-- Format: [{ "label": "Dream Home", "url": "https://..." }, ...]

ALTER TABLE public.vision_projects
  ADD COLUMN IF NOT EXISTS reference_images JSONB DEFAULT '[]'::jsonb;
