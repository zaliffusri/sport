# MSC & CTSB SPORTS

A React app for the sport committee: leaderboard, games (standard / guess / culling), finance (contributions and spending), and audit log.

## Features

- **Leaderboard** – Rankings by points; roles: admin, finance, member.
- **People** – Manage users (admin); add/edit, set inactive, search.
- **Collection** – Per-person contributions, opening balance, spendings, finance report by branch (admin/finance).
- **Games** – Create games (standard / guess / culling); QR codes for joining; guess answers; filter by type; pagination.
- **Profile** – Change password, change email.
- **Audit log** – Activity log (admin).
- **Data** – Stored in the browser (localStorage). No server or database by default.

## Run locally

```bash
cd company-leaderboard
npm install
npm run dev
```

Open the URL shown (e.g. http://localhost:5173).

## Build for production

```bash
npm run build
npm run preview
```

Output is in the `dist` folder.

---

## Deploy to Vercel (via GitHub)

1. **Push the app to GitHub**  
   Create a repo, then from the project folder:
   ```bash
   git init
   git add .
   git commit -m "Prepare for Vercel deploy"
   git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO.git
   git branch -M main
   git push -u origin main
   ```

2. **Deploy on Vercel**  
   - Go to [vercel.com](https://vercel.com) → **Add New** → **Project**.  
   - Import your GitHub repo.  
   - Vercel will use the repo’s `vercel.json` (Vite, `npm run build`, output `dist`).  
   - Click **Deploy**. The app will be live at `https://your-project.vercel.app`.

Full step-by-step (custom domain, env vars): see **[DEPLOY.md](./DEPLOY.md)**.  
Staging vs production (branches, env vars, banner): see **[STAGING.md](./STAGING.md)**.

---

## Database and production data

**Current setup:** All data is kept in **localStorage** in the browser. There is no backend or database. Each device has its own data; it is not shared across users or devices.

**If you want one shared dataset for everyone (e.g. for production):**

1. **Add a database**, for example:
   - [Vercel Postgres](https://vercel.com/docs/storage/vercel-postgres)
   - [Supabase](https://supabase.com) (Postgres + optional auth)
   - [PlanetScale](https://planetscale.com) (MySQL)

2. **Add a backend API** that:
   - Reads/writes the database (colleagues, games, auth, spendings, audit log, etc.).
   - Can be [Vercel Serverless Functions](https://vercel.com/docs/functions) in the same repo or a separate backend.

3. **Change the app** so it uses this API instead of localStorage (e.g. `fetch('/api/colleagues')` and similar), and optionally use env vars (e.g. `VITE_API_URL`) for the API base URL.

An **.env.example** file is included for future API URL or other env vars. For now the app runs without any env vars.

---

## Tech

- **React** + **Vite**
- **lucide-react** (icons), **qrcode.react** (QR codes)
- Hash routing; no backend required for current localStorage-only setup
