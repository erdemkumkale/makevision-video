-- Add Videos_Ready to vision_project_status enum
-- This allows generate-video to set an intermediate status between Processing and Completed

ALTER TYPE vision_project_status ADD VALUE IF NOT EXISTS 'Videos_Ready' AFTER 'Processing';
