# Deploy MSC & CTSB SPORTS to Vercel (via GitHub)

## 1. Prepare GitHub repository

### Option A: Create a new repo on GitHub

1. Go to [github.com/new](https://github.com/new).
2. Repository name: e.g. `msc-ctsb-sports` or `company-leaderboard`.
3. Choose **Private** or **Public**. Do **not** initialize with README (you already have one).
4. Click **Create repository**.

### Option B: Use an existing repo

Use your existing repo URL for the steps below.

---

## 2. Push your code to GitHub

In the project folder (`company-leaderboard`), run:

```bash
cd company-leaderboard

# Initialize Git (if not already)
git init

# Add all files
git add .

# First commit
git commit -m "Prepare for Vercel deploy"

# Add GitHub as remote (replace YOUR_USERNAME and YOUR_REPO with your repo)
git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO.git

# Push (main branch)
git branch -M main
git push -u origin main
```

If the repo already has a remote and history, use:

```bash
git add .
git commit -m "Prepare for Vercel deploy"
git push origin main
```

---

## 3. Deploy on Vercel

1. Go to [vercel.com](https://vercel.com) and sign in (use **Continue with GitHub**).
2. Click **Add New…** → **Project**.
3. **Import** your GitHub repository (e.g. `msc-ctsb-sports`).
4. Vercel will detect **Vite** and use:
   - **Build Command:** `npm run build`
   - **Output Directory:** `dist`
   - **Install Command:** `npm install`
5. (Optional) Add **Environment Variables** if you add an API or database later (e.g. `VITE_API_URL`).
6. Click **Deploy**. Wait for the build to finish.
7. Your app will be live at `https://your-project.vercel.app`.

### Custom domain (optional)

In the Vercel project: **Settings** → **Domains** → add your domain and follow the DNS instructions.

---

## 4. Data and database (important)

**Current behaviour:** The app stores all data in the **browser (localStorage)**. There is no server or database. So:

- Each device/browser has its **own** data.
- Clearing site data or using another device means no shared data.
- Deploying to Vercel only hosts the **frontend**; it does not add a shared database.

**If you want shared data (one set of data for all users):**

You will need:

1. A **database** (e.g. Vercel Postgres, Supabase, or PlanetScale).
2. A **backend API** (e.g. Vercel Serverless Functions or a small Node/Express API) that reads/writes that database.
3. **Code changes** in the app: replace `localStorage` reads/writes with `fetch()` calls to your API.

See **README.md** (section “Database and production”) for options and next steps.

---

## 5. After deploy

- **Admin login:** Use the same credentials as in code (change default admin password in production; consider env vars).
- **Hash routing:** The app uses `#leaderboard`, `#games`, etc., so links work on Vercel without extra config.
- **Updates:** Push to `main` on GitHub; Vercel will redeploy automatically if the project is connected.
