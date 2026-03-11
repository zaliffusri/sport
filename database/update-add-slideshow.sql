-- MSC & CTSB SPORTS - Database UPDATE script
-- Use this if you already ran schema.sql before and only need to add the slideshow table.
-- Run in Supabase Dashboard → SQL Editor → New query

-- ========== SLIDESHOW (homepage carousel) ==========
-- Create a Storage bucket named "slideshow" (Public) in Supabase Storage first.
CREATE TABLE IF NOT EXISTS slideshow (
  id TEXT PRIMARY KEY,
  image_url TEXT NOT NULL,
  title TEXT NOT NULL DEFAULT '',
  description TEXT NOT NULL DEFAULT '',
  display_date TEXT NOT NULL DEFAULT '',
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_slideshow_sort ON slideshow(sort_order ASC, created_at DESC);
