-- MSC & CTSB SPORTS - Migrate slideshow to "posts" (one post = one segment, 1–3 images per post)
-- Run this in Supabase Dashboard → SQL Editor → New query → paste all → Run.
-- Then refresh your app or redeploy; Supabase may take a few seconds to update the schema cache.

-- Add post_id if missing
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'slideshow' AND column_name = 'post_id'
  ) THEN
    ALTER TABLE slideshow ADD COLUMN post_id TEXT;
  END IF;
END $$;

-- Add image_order if missing
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'slideshow' AND column_name = 'image_order'
  ) THEN
    ALTER TABLE slideshow ADD COLUMN image_order INTEGER NOT NULL DEFAULT 0;
  END IF;
END $$;

-- Backfill: existing rows become one post each (one image per post)
UPDATE slideshow SET post_id = id WHERE post_id IS NULL OR post_id = '';

-- Make post_id non-nullable (safe after backfill)
ALTER TABLE slideshow ALTER COLUMN post_id SET NOT NULL;

-- Index for grouping by post
CREATE INDEX IF NOT EXISTS idx_slideshow_post ON slideshow(post_id, image_order);
