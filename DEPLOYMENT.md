# Deploying TaskFlow

This guide deploys the two halves of the project:

| Part | What it is | Where it goes |
| --- | --- | --- |
| Frontend | React + Vite static site (repo root) | Vercel |
| Backend | Express API + reminder scheduler (`server/`) | Render + Supabase (PostgreSQL) |

The frontend is a plain static site, so Vercel is a perfect fit. The backend
**cannot** run on Vercel: it runs a `node-cron` scheduler that must stay alive
between requests, so it needs a long-running process (Render). Its data lives in
a managed PostgreSQL database on Supabase (free tier), which is reliable and
needs no disk to babysit.

> Deploy the backend **first**, so you have its URL for the frontend's
> `VITE_API_URL`.

---

## 1. Backend on Render

> Before deploying, create the tables in Supabase and copy the connection string
> (see [section 4](#4-database-supabase-postgresql)).

### Option A — Blueprint (recommended)

A ready-made blueprint lives in `render.yaml`.

1. Create a free account at <https://render.com> and sign in with GitHub.
2. Click **New +** → **Blueprint**.
3. Pick the `To--do-` repository and click **Connect**.
4. Render reads `render.yaml` and shows a service called `taskflow-api`. No
   disk is needed: the database lives on Supabase (see [section 4](#4-database-supabase-postgresql)).
5. Fill in the prompted secret values when asked (see the table below).
6. Click **Apply** / **Create Resources** and wait for the first deploy.

### Option B — Manual web service

If you prefer to click through the dashboard instead of the blueprint:

1. **New +** → **Web Service** → connect the repository.
2. Settings:
   - **Root Directory:** `server`
   - **Runtime:** Node
   - **Build Command:** `npm ci`
   - **Start Command:** `npm start`
   - **Health Check Path:** `/api/health`
3. The **free plan** is fine — no disk is needed because the database lives on
   Supabase.
4. Add the environment variables from the table below.

### Backend environment variables

Set these in **Render → your service → Environment**. Values marked *secret*
should be entered only here (never in Git).

| Variable | Example value | Notes |
| --- | --- | --- |
| `NODE_ENV` | `production` | Enables secure HTTPS cookies. |
| `NODE_VERSION` | `22` | Any current LTS works. |
| `PORT` | *(leave unset)* | Render sets `PORT` automatically; the app already reads it. |
| `DATABASE_URL` | *(secret)* | Supabase connection string (session-mode pooler). See §4. |
| `CLIENT_URL` | `https://your-app.vercel.app` | The exact frontend origin allowed by CORS. No trailing slash. |
| `JWT_SECRET` | *(secret)* | 64-char random hex. Blueprint generates it for you; otherwise run `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`. |
| `EMAIL_USER` | `you@gmail.com` | Gmail address that sends reminders. |
| `EMAIL_APP_PASSWORD` | *(secret)* | Gmail **App Password** (not your normal password). |
| `EMAIL_FROM` | `you@gmail.com` | Optional; defaults to `EMAIL_USER`. |
| `TZ` | `Africa/Lagos` | Your timezone, so reminders fire at the correct local time. |
| `COOKIE_SAMESITE` | *(leave unset)* | Defaults to `none` in production, which is correct when the frontend and API are on different domains. |

When the deploy finishes, copy the service URL, e.g.
`https://taskflow-api.onrender.com`. Confirm it works by opening:

```
https://taskflow-api.onrender.com/api/health
```

You should see `{"status":"ok",...}`.

---

## 2. Frontend on Vercel

1. Go to <https://vercel.com> and sign in with GitHub.
2. **Add New…** → **Project** → **Import** the `To--do-` repository.
3. Configure the project:
   - **Framework Preset:** Vite
   - **Root Directory:** `./` (the repo root)
   - **Build Command:** `npm run build`
   - **Output Directory:** `dist`
   - **Install Command:** `npm install`
4. Add an **Environment Variable**:
   - **Name:** `VITE_API_URL`
   - **Value:** your Render backend URL, e.g. `https://taskflow-api.onrender.com`
   - **Environment:** Production
5. Click **Deploy**.
6. Once deployed, copy the frontend URL, e.g. `https://your-app.vercel.app`.
7. Go back to **Render → Environment**, set `CLIENT_URL` to that exact frontend
   URL, and let the backend redeploy. This is required — the API only accepts
   credentialed requests from that origin.

> `VITE_API_URL` is read at **build** time. If you change it later, you must
> trigger a **new Vercel deployment** (Deployments → ⋯ → Redeploy). Setting the
> variable alone does not rebuild the site.

---

## 3. How authentication works across domains

The login is stored in an `httpOnly` cookie. When the frontend and API are on
different domains (Vercel + Render), the browser only sends that cookie on
cross-site requests if it is marked `SameSite=None` **and** `Secure`. This repo
now does that automatically in production:

- `NODE_ENV=production` → cookie is `SameSite=None; Secure`.
- Both requests and responses use credentials (`fetch(..., { credentials: 'include' })`
  on the client, CORS `credentials: true` on the server).
- CORS uses an explicit allow-list (`CLIENT_URL`), never a wildcard.

If you later host the frontend and backend on the **same** registrable domain
(for example `app.example.com` + `api.example.com`), set `COOKIE_SAMESITE=lax`
on the backend for a slightly stricter cookie.

---

## 4. Database (Supabase PostgreSQL)

The backend now uses PostgreSQL (`pg` package) connected with `DATABASE_URL`,
hosted for free by Supabase.

1. In the Supabase dashboard, open **Project Settings → Database →
   Connection string → Connection pooling** and copy the **Session mode** URI
   (`postgresql://postgres.<ref>:<password>@...pooler.supabase.com:5432/postgres`).
   Keep it in Render's `DATABASE_URL` and in a local `server/.env` — never in Git.
2. Create the tables once: open the **SQL Editor** in Supabase, paste the
   contents of `server/db/schema.sql`, and click **Run**. The Table Editor then
   shows `users` and `tasks`. (The backend also creates the tables automatically
   on first start, but running the SQL yourself is clearer.)
3. The database survives restarts and redeploys. Existing data is never deleted
   automatically.
4. Task ownership is enforced on the server — every query filters on `user_id` —
   and passwords stay hashed (bcrypt), so the API is the only door into the data.
5. **Optional — copy existing SQLite data** (accounts + tasks) into Supabase:
   ```
   cd server
   node scripts/copy-sqlite-to-postgres.mjs
   ```
   The script only **reads** `server/data/todo.db`; it never modifies it. Run it
   after the schema exists and `DATABASE_URL` is set.

---

## 5. Email reminders

- The scheduler runs continuously inside the backend process via `node-cron`.
- It only marks a task's reminder as sent after a successful send, so failures
  are retried on the next run instead of being lost.
- Tasks that are already completed or already emailed are skipped, so reminders
  are not sent twice.
- Keep the backend on **one instance**. Multiple instances would each run their
  own scheduler; Render runs a single instance by default.
- If `EMAIL_USER` / `EMAIL_APP_PASSWORD` are missing, the app logs a clear error
  and keeps running — it never crashes because email is not configured.

**Gmail note:** you need 2-Step Verification enabled on the Google account and a
generated **App Password** (Google Account → Security → App passwords). A normal
Gmail password will not work.

A real reminder can only be confirmed once a task's reminder time passes on the
deployed backend.

---

## 6. Post-deploy checklist

- [ ] `GET https://<backend>/api/health` returns `{"status":"ok",...}`.
- [ ] Frontend opens over HTTPS.
- [ ] Register a new account.
- [ ] Log in, then refresh the page — you stay logged in.
- [ ] Create, edit, complete, and delete a task.
- [ ] Log out; protected pages redirect back to login.
- [ ] Create a second account and confirm it cannot see the first account's tasks.
- [ ] Deadline countdown and reminder status display correctly.
- [ ] Light/dark mode and background themes work.
- [ ] Browser console and Render logs show no critical errors.
- [ ] (Optional) Create a task due in a few minutes and confirm the reminder email.
