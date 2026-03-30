-- Migration 007: add final_video_url to vision_projects
ALTER TABLE public.vision_projects
  ADD COLUMN IF NOT EXISTS final_video_url text;
