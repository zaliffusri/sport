-- MSC & CTSB SPORTS - Migrate slideshow to "posts" (one post = one segment, 1–3 images per post)
-- Run in Supabase Dashboard → SQL Editor if you already have the slideshow table without post_id/image_order.

-- Add columns for post grouping (each post = one segment, max 3 images per post)
ALTER TABLE slideshow ADD COLUMN IF NOT EXISTS post_id TEXT;
ALTER TABLE slideshow ADD COLUMN IF NOT EXISTS image_order INTEGER NOT NULL DEFAULT 0;

-- Backfill: existing rows become one post each (one image per post)
UPDATE slideshow SET post_id = id WHERE post_id IS NULL OR post_id = '';

ALTER TABLE slideshow ALTER COLUMN post_id SET NOT NULL;

CREATE INDEX IF NOT EXISTS idx_slideshow_post ON slideshow(post_id, image_order);
