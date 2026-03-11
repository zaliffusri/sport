# Staging and Production Setup (Vercel)

Follow these steps in the **Vercel dashboard** to finish staging vs production.

---

## 1. Set the production branch

1. Open your project on [vercel.com](https://vercel.com).
2. Go to **Settings** → **Git**.
3. Under **Production Branch**, set it to **main**.
4. Save.

**Result:** Pushes to `main` deploy as **Production**. Your main URL (e.g. `sport.vercel.app`) will always show the latest from `main`.

---

## 2. Use `zaliff` as staging

- **Staging** = Preview deployments from the **zaliff** branch.
1. Push (or merge) to **zaliff**:
   ```bash
   git checkout zaliff
   git add .
   git commit -m "Your message"
   git push origin zaliff
   ```
2. Vercel will build and give you a **Preview** URL, e.g.  
   `sport-git-zaliff-yourname.vercel.app`
3. That URL is your **staging** site. Use it for testing before merging to `main`.

No extra Vercel setting is required; any non‑production branch gets a preview (staging) URL.

---

## 3. Environment variable (staging banner)

So the app can show a “Staging” banner only on preview (zaliff) and not on production:

1. In Vercel: **Settings** → **Environment Variables**.
2. Add a variable:
   - **Name:** `VITE_APP_ENV`
   - **Value:** `production`
   - **Environments:** tick only **Production**.
3. Add another row:
   - **Name:** `VITE_APP_ENV`
   - **Value:** `preview`
   - **Environments:** tick only **Preview**.
4. Save.

**Result:** Production deployments get `VITE_APP_ENV=production` (no banner). Preview deployments (e.g. zaliff) get `VITE_APP_ENV=preview` and show the “Staging environment — for testing only” banner.

Redeploy after changing env vars (Deployments → … on latest → Redeploy).

---

## Summary

| Environment | Branch  | URL type   | Banner      |
|-------------|---------|------------|-------------|
| Production  | `main`  | Main domain| None        |
| Staging     | `zaliff`| Preview URL| “Staging…”  |

- **Production:** work on `main` or merge from `zaliff` when ready; production URL updates from `main`.
- **Staging:** work on `zaliff`, push to `zaliff`; use the preview URL for testing.
