-- ============================================================
-- Migration 005: Add order_num and is_redo to media_generations
-- ============================================================

ALTER TABLE public.media_generations
  ADD COLUMN IF NOT EXISTS order_num  INT NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS is_redo    BOOLEAN NOT NULL DEFAULT FALSE;
