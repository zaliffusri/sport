-- MSC & CTSB SPORTS - Add feedback table (suggestions: anonymous to users, admin sees who)
-- Run in Supabase Dashboard → SQL Editor → New query.

CREATE TABLE IF NOT EXISTS feedback (
  id TEXT PRIMARY KEY,
  user_email TEXT NOT NULL,
  message TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_feedback_created_at ON feedback(created_at DESC);
