# Vercel + Supabase: Create Tables & Connect Project

Follow these steps after you’ve created a Supabase project (e.g. via Vercel’s Supabase integration or at [supabase.com](https://supabase.com)).

---

## Step 1: Create the tables in Supabase

1. Open your **Supabase** project:
   - If you used **Vercel → Storage → Supabase**: open the linked Supabase project from Vercel, or go to [supabase.com](https://supabase.com) and select the same project.
   - If you created the project on Supabase directly: go to [supabase.com](https://supabase.com) → your project.

2. In the left sidebar click **SQL Editor**.

3. Click **New query**.

4. Copy the **entire contents** of `database/schema.sql` from this repo and paste into the editor.

5. Click **Run** (or press Ctrl+Enter).

6. You should see “Success. No rows returned.” The tables `colleagues`, `passwords`, `games`, `spendings`, `audit_log`, and `app_settings` are now created, and `app_settings` is seeded with `admin_email` and `opening_balance`.

7. (Optional) In Supabase go to **Table Editor** and confirm the tables exist and `app_settings` has 2 rows.

---

## Step 2: Get Supabase credentials

You need two values from Supabase:

1. In Supabase, go to **Project Settings** (gear icon) → **API**.
2. Copy:
   - **Project URL** (e.g. `https://xxxxx.supabase.co`) → this is `SUPABASE_URL`.
   - **service_role** key (under “Project API keys”, label “service_role”) → this is `SUPABASE_SERVICE_ROLE_KEY`.  
   Keep this secret; only use it on the server (Vercel), never in the browser.

If you connected Supabase to Vercel via the integration, some of these may already be in Vercel. Check **Step 3** and add any that are missing.

---

## Step 3: Add environment variables in Vercel

1. Open your **Vercel** project → **Settings** → **Environment Variables**.

2. Add (or confirm) these for **Production** (and **Preview** if you use preview deployments):

   | Name                         | Value                    | Notes                          |
   |-----------------------------|--------------------------|--------------------------------|
   | `SUPABASE_URL`              | Your Supabase Project URL | From Step 2                    |
   | `SUPABASE_SERVICE_ROLE_KEY` | Your service_role key     | From Step 2                    |
   | `ADMIN_PASSWORD`            | Your chosen admin password | Used when logging in as admin (email from `app_settings`) |
   | `VITE_USE_API`              | `true`                   | So the frontend uses the API   |

3. **Optional:** If your frontend is on a different origin than the API (e.g. `myapp.vercel.app` and API at `myapp-api.vercel.app`), add:
   - `VITE_API_URL` = full URL to the Vercel deployment that serves the API (e.g. `https://myapp.vercel.app`).

4. Save. **Redeploy** the project so the new variables are applied (Deployments → ⋮ on latest → Redeploy).

---

## Step 4: Set admin email (if needed)

The schema seeds `app_settings` with:

- `admin_email` = `admin@cybersolution.com.my`
- `opening_balance` = `0`

To use a different admin email:

1. In Supabase → **Table Editor** → **app_settings**.
2. Edit the row where `key` = `admin_email` and set `value` to your admin email.

Admin login is: **this email** + the password you set in `ADMIN_PASSWORD` on Vercel.

---

## Step 5: Confirm the project is connected

1. Redeploy the app on Vercel (if you added or changed env vars).
2. Open the deployed app URL.
3. Log in with the admin email (from `app_settings`) and `ADMIN_PASSWORD`.
4. Add a person or a game and check in Supabase **Table Editor** that rows appear in `colleagues` or `games`.

If that works, the database is created and the project is connected.

---

## Quick checklist

- [ ] Run `database/schema.sql` in Supabase **SQL Editor**.
- [ ] Add `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` in Vercel.
- [ ] Add `ADMIN_PASSWORD` in Vercel.
- [ ] Add `VITE_USE_API` = `true` in Vercel.
- [ ] (Optional) Set `VITE_API_URL` if frontend and API are on different origins.
- [ ] (Optional) Change `admin_email` in `app_settings` in Supabase.
- [ ] Redeploy and test login and creating data.
