# Database: Table details (all tables)

Single reference for every table, column, type, and usage. Use this for Supabase Table Editor, SQL, or API work.

---

## 1. colleagues (all users / people)

Stores every person in the system: name, email, role, branch, points, and game history.

| Column        | Type         | Nullable | Default | Description |
|---------------|--------------|----------|---------|-------------|
| **id**        | TEXT         | NO       | —       | Primary key. Use a unique string (e.g. UUID or `"1"`, `"2"`). |
| **name**      | TEXT         | NO       | —       | Full name. |
| **email**     | TEXT         | NO       | —       | Unique, lowercase. Used for login and game participants. |
| **role**      | TEXT         | NO       | `'member'` | One of: `'member'`, `'finance'`, `'admin'`. |
| **branch**    | TEXT         | NO       | `'Johor'` | e.g. `'Johor'`, `'Kuala Lumpur'`, `'Kuantan'`. |
| **points**    | INTEGER      | NO       | `0`     | Leaderboard points. |
| **active**    | BOOLEAN      | NO       | `true`  | `false` = inactive (cannot log in). |
| **amount_paid** | DECIMAL(12,2) | NO | `0`     | Contribution amount (RM). |
| **game_history** | JSONB      | NO       | `'[]'`  | Array of `{ "gameId", "gameName", "points" }`. |
| **created_at** | TIMESTAMPTZ  | NO       | NOW()   | Row created time. |
| **updated_at** | TIMESTAMPTZ  | NO       | NOW()   | Row last updated time. |

**Constraints:** `role` IN (`'member'`, `'finance'`, `'admin'`); `email` UNIQUE.  
**Indexes:** `LOWER(email)`, `active`.

---

## 2. passwords (login – one row per user)

One row per email: hashed password for login. Links to `colleagues.email` (and admin email in `app_settings`).

| Column          | Type        | Nullable | Default | Description |
|-----------------|-------------|----------|---------|-------------|
| **email**       | TEXT        | NO       | —       | Primary key. Same as user email (or admin email). |
| **password_hash** | TEXT      | NO       | —       | Bcrypt hash of the password. |
| **created_at**  | TIMESTAMPTZ | NO       | NOW()   | Row created time. |

**Constraints:** None besides primary key.  
**Indexes:** None.

---

## 3. games

All games: standard (join for points), guess (submit answer), culling (scan for points).

| Column                | Type        | Nullable | Default     | Description |
|-----------------------|-------------|----------|-------------|-------------|
| **id**                | TEXT        | NO       | —           | Primary key. |
| **name**              | TEXT        | NO       | —           | Game name. |
| **type**              | TEXT        | NO       | `'standard'`| One of: `'standard'`, `'guess'`, `'culling'`. |
| **active**            | BOOLEAN     | NO       | `true`      | `false` = no one can join. |
| **description**       | TEXT        | YES      | `''`        | Optional description. |
| **date**              | TEXT        | YES      | `''`        | Optional date string. |
| **participants**      | JSONB       | NO       | `'[]'`      | Array of participant emails. |
| **points_per_join**   | INTEGER     | YES      | —           | Points for joining (standard games). |
| **points_per_scan**   | INTEGER     | YES      | `10`        | Points per scan (culling). |
| **scanned_by**        | JSONB       | NO       | `'[]'`      | Emails who have scanned (guess/culling). |
| **guess_question**    | TEXT        | YES      | `''`        | Question text (guess games). |
| **guess_answers**     | JSONB       | NO       | `'{}'`      | Object: email → answer (guess games). |
| **guess_correct_answer** | TEXT     | YES      | `''`        | Correct answer (guess games). |
| **guess_points_join**   | INTEGER   | YES      | `1`         | Points for joining (guess). |
| **guess_points_correct** | INTEGER   | YES      | `1`         | Points for correct answer (guess). |
| **created_at**        | TIMESTAMPTZ | NO      | NOW()       | Row created time. |
| **updated_at**        | TIMESTAMPTZ | NO      | NOW()       | Row last updated time. |

**Constraints:** `type` IN (`'standard'`, `'guess'`, `'culling'`).  
**Indexes:** None.

---

## 4. spendings

Money spent (e.g. events, equipment). Used with opening balance for collection/spending view.

| Column        | Type         | Nullable | Default | Description |
|---------------|--------------|----------|---------|-------------|
| **id**        | TEXT         | NO       | —       | Primary key. |
| **description** | TEXT       | NO       | —       | What was spent. |
| **amount**    | DECIMAL(12,2)| NO       | —       | Amount (RM). |
| **branch**    | TEXT         | YES      | NULL    | Optional branch. |
| **created_at**| TIMESTAMPTZ  | NO       | NOW()   | Row created time. |

**Constraints:** None.  
**Indexes:** None.

---

## 5. audit_log

Log of actions: who did what and when. For all users’ actions (login, join game, edit, etc.).

| Column       | Type        | Nullable | Default | Description |
|--------------|-------------|----------|---------|-------------|
| **id**       | TEXT        | NO       | —       | Primary key. |
| **timestamp**| TIMESTAMPTZ | NO       | NOW()   | When the action happened. |
| **message**  | TEXT        | NO       | —       | Action description (e.g. "Member logged in"). |
| **user_email** | TEXT      | NO       | —       | Email of who did the action (or "System"). |
| **created_at** | TIMESTAMPTZ | NO     | NOW()   | Row created time. |

**Constraints:** None.  
**Indexes:** `created_at DESC` (for recent-first listing).

---

## 6. app_settings (key–value config)

Global settings. Used for admin email and opening balance.

| Column        | Type        | Nullable | Default | Description |
|---------------|-------------|----------|---------|-------------|
| **key**       | TEXT        | NO       | —       | Primary key. e.g. `'admin_email'`, `'opening_balance'`. |
| **value**     | TEXT        | NO       | `''`    | Value (e.g. admin email address or balance number as text). |
| **updated_at**| TIMESTAMPTZ | NO       | NOW()   | Last updated time. |

**Constraints:** None.  
**Indexes:** None.

**Seeded rows:**
- `key = 'admin_email'`, `value = 'admin@cybersolution.com.my'` (change as needed).
- `key = 'opening_balance'`, `value = '0'`.

---

## Summary

| Table         | Purpose |
|---------------|---------|
| **colleagues**| All users/people: profile, role, branch, points, amount_paid, game_history. |
| **passwords** | One hashed password per email (login). |
| **games**     | All games (standard / guess / culling) and their participants/answers. |
| **spendings** | Spending records (description, amount, branch). |
| **audit_log** | Action log: message + user_email + timestamp. |
| **app_settings** | Config: admin_email, opening_balance. |

For setup and env vars, see `README.md` and `../VERCEL-SUPABASE-SETUP.md`.
