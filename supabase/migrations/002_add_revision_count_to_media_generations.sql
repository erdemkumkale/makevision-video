-- ============================================================
-- Migration 002: Add revision_count to media_generations
-- ============================================================

ALTER TABLE public.media_generations
  ADD COLUMN IF NOT EXISTS revision_count INT NOT NULL DEFAULT 0;
