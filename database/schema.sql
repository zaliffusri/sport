-- MSC & CTSB SPORTS - Supabase (PostgreSQL) schema
-- Run this in Supabase Dashboard → SQL Editor → New query
--
-- First time: run this entire file.
-- If you already have tables and only need slideshow: run update-add-slideshow.sql instead.

-- ========== COLLEAGUES (people / users) ==========
CREATE TABLE IF NOT EXISTS colleagues (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('member', 'finance', 'admin')),
  branch TEXT NOT NULL DEFAULT 'Johor',
  points INTEGER NOT NULL DEFAULT 0,
  active BOOLEAN NOT NULL DEFAULT true,
  amount_paid DECIMAL(12,2) NOT NULL DEFAULT 0,
  game_history JSONB NOT NULL DEFAULT '[]',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_colleagues_email ON colleagues(LOWER(email));
CREATE INDEX IF NOT EXISTS idx_colleagues_active ON colleagues(active);

-- ========== PASSWORDS (hashed; one row per email) ==========
CREATE TABLE IF NOT EXISTS passwords (
  email TEXT PRIMARY KEY,
  password_hash TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ========== GAMES ==========
CREATE TABLE IF NOT EXISTS games (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'standard' CHECK (type IN ('standard', 'guess', 'culling')),
  active BOOLEAN NOT NULL DEFAULT true,
  description TEXT DEFAULT '',
  date TEXT DEFAULT '',
  participants JSONB NOT NULL DEFAULT '[]',
  points_per_join INTEGER,
  points_per_scan INTEGER DEFAULT 10,
  scanned_by JSONB NOT NULL DEFAULT '[]',
  guess_question TEXT DEFAULT '',
  guess_answers JSONB NOT NULL DEFAULT '{}',
  guess_correct_answer TEXT DEFAULT '',
  guess_points_join INTEGER DEFAULT 1,
  guess_points_correct INTEGER DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ========== SPENDINGS ==========
CREATE TABLE IF NOT EXISTS spendings (
  id TEXT PRIMARY KEY,
  description TEXT NOT NULL,
  amount DECIMAL(12,2) NOT NULL,
  branch TEXT DEFAULT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ========== AUDIT LOG ==========
CREATE TABLE IF NOT EXISTS audit_log (
  id TEXT PRIMARY KEY,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  message TEXT NOT NULL,
  user_email TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_log_created_at ON audit_log(created_at DESC);

-- ========== APP SETTINGS (key-value: opening_balance, admin_email) ==========
CREATE TABLE IF NOT EXISTS app_settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL DEFAULT '',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Seed admin email (change password in app or via API after first login)
INSERT INTO app_settings (key, value, updated_at) VALUES
  ('admin_email', 'admin@cybersolution.com.my', NOW()),
  ('opening_balance', '0', NOW())
ON CONFLICT (key) DO NOTHING;

-- Seed default admin password hash (bcrypt for 'P@ssw0rd' - run after first deploy or set via API)
-- You will set this via the API or Supabase dashboard after first run; placeholder comment:
-- INSERT INTO passwords (email, password_hash) VALUES ('admin@cybersolution.com.my', '$2a$10$...') ON CONFLICT (email) DO NOTHING;

-- ========== MOMENTS (posts: each post = one segment, 1–3 images per post) ==========
-- Create a Storage bucket named "slideshow" in Supabase Dashboard (Storage → New bucket) and set it to Public.
CREATE TABLE IF NOT EXISTS slideshow (
  id TEXT PRIMARY KEY,
  post_id TEXT NOT NULL,
  image_order INTEGER NOT NULL DEFAULT 0,
  image_url TEXT NOT NULL,
  title TEXT NOT NULL DEFAULT '',
  description TEXT NOT NULL DEFAULT '',
  display_date TEXT NOT NULL DEFAULT '',
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_slideshow_sort ON slideshow(sort_order ASC, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_slideshow_post ON slideshow(post_id, image_order);

-- ========== FEEDBACK (suggestions: activity/sport ideas; anonymous to users, admin sees who) ==========
CREATE TABLE IF NOT EXISTS feedback (
  id TEXT PRIMARY KEY,
  user_email TEXT NOT NULL,
  message TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_feedback_created_at ON feedback(created_at DESC);

