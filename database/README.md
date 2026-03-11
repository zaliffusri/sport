# Database setup (Supabase)

The app uses **Supabase** (PostgreSQL) for production data. Tables and usage:

---

## Tables

| Table | Purpose |
|-------|--------|
| **colleagues** | People: id, name, email, role, branch, points, active, amount_paid, game_history (JSON). |
| **passwords** | Hashed passwords per email (login). One row per user. |
| **games** | Games: id, name, type, active, description, date, participants (JSON), points_per_join, points_per_scan, scanned_by (JSON), guess_question, guess_answers (JSON), guess_correct_answer, guess_points_join, guess_points_correct. |
| **spendings** | Spending records: id, description, amount, branch. |
| **audit_log** | Audit entries: id, timestamp, message, user_email. |
| **app_settings** | Key-value: `opening_balance`, `admin_email`. |

---

## Column details

### colleagues
| Column | Type | Notes |
|--------|------|--------|
| id | TEXT | Primary key (e.g. uuid or '1', '2') |
| name | TEXT | Full name |
| email | TEXT | Unique, lowercase |
| role | TEXT | 'member', 'finance', 'admin' |
| branch | TEXT | e.g. 'Johor', 'Kuala Lumpur', 'Kuantan' |
| points | INTEGER | Leaderboard points |
| active | BOOLEAN | false = inactive user |
| amount_paid | DECIMAL(12,2) | Contribution (RM) |
| game_history | JSONB | Array of { gameId, gameName, points } |
| created_at, updated_at | TIMESTAMPTZ | Auto |

### passwords
| Column | Type | Notes |
|--------|------|--------|
| email | TEXT | Primary key (same as colleagues.email) |
| password_hash | TEXT | Bcrypt hash |

### games
| Column | Type | Notes |
|--------|------|--------|
| id | TEXT | Primary key |
| name | TEXT | Game name |
| type | TEXT | 'standard', 'guess', 'culling' |
| active | BOOLEAN | false = no join |
| description | TEXT | Optional |
| date | TEXT | Optional date string |
| participants | JSONB | Array of email strings |
| points_per_join | INTEGER | For standard games |
| points_per_scan | INTEGER | For culling |
| scanned_by | JSONB | Array of emails (guess/culling) |
| guess_question | TEXT | Guess game question |
| guess_answers | JSONB | Object: email → answer |
| guess_correct_answer | TEXT | Correct answer |
| guess_points_join | INTEGER | Guess: join points |
| guess_points_correct | INTEGER | Guess: correct-answer points |
| created_at, updated_at | TIMESTAMPTZ | Auto |

### spendings
| Column | Type | Notes |
|--------|------|--------|
| id | TEXT | Primary key |
| description | TEXT | What was spent |
| amount | DECIMAL(12,2) | RM |
| branch | TEXT | Optional |
| created_at | TIMESTAMPTZ | Auto |

### audit_log
| Column | Type | Notes |
|--------|------|--------|
| id | TEXT | Primary key |
| timestamp | TIMESTAMPTZ | When |
| message | TEXT | Action description |
| user_email | TEXT | Who did it |
| created_at | TIMESTAMPTZ | Auto |

### app_settings
| Column | Type | Notes |
|--------|------|--------|
| key | TEXT | Primary key ('opening_balance', 'admin_email') |
| value | TEXT | Value |
| updated_at | TIMESTAMPTZ | Auto |

---

## Setup steps

1. **Create a Supabase project** at [supabase.com](https://supabase.com) → New project.
2. **Run the schema:** Dashboard → SQL Editor → New query → paste contents of `schema.sql` → Run.
3. **Get credentials:** Project Settings → API: copy **Project URL** and **service_role** key (secret).
4. **Add to Vercel:** Project → Settings → Environment Variables:
   - `SUPABASE_URL` = Project URL
   - `SUPABASE_SERVICE_ROLE_KEY` = service_role key
   (Add for Production and Preview if you use both.)
5. **Set admin password:** After first deploy, use the app’s login (admin email + default password) or call the API to set the hashed password in `passwords` for the admin email in `app_settings`.
