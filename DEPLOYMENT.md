# Deploying TaskFlow

This guide deploys the two halves of the project:

| Part | What it is | Where it goes |
| --- | --- | --- |
| Frontend | React + Vite static site (repo root) | Vercel |
| Backend | Express API + SQLite + reminder scheduler (`server/`) | Render (persistent Node service) |

The frontend is a plain static site, so Vercel is a perfect fit. The backend
**cannot** run on Vercel: it keeps a SQLite file on disk and runs a `node-cron`
scheduler that must stay alive between requests. It needs a host that gives you a
long-running process and a persistent disk.

> Deploy the backend **first**, so you have its URL for the frontend's
> `VITE_API_URL`.

---

## 1. Backend on Render

### Option A — Blueprint (recommended)

A ready-made blueprint lives in `render.yaml`.

1. Create a free account at <https://render.com> and sign in with GitHub.
2. Click **New +** → **Blueprint**.
3. Pick the `To--do-` repository and click **Connect**.
4. Render reads `render.yaml` and shows a service called `taskflow-api`. It will
   attach a **1 GB persistent disk** mounted at `/var/data`.
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
3. Choose a plan that supports **Disks** (Starter or higher), then add a disk:
   - **Name:** `taskflow-data`
   - **Mount Path:** `/var/data`
   - **Size:** 1 GB
4. Add the environment variables from the table below.

### Backend environment variables

Set these in **Render → your service → Environment**. Values marked *secret*
should be entered only here (never in Git).

| Variable | Example value | Notes |
| --- | --- | --- |
| `NODE_ENV` | `production` | Enables secure HTTPS cookies. |
| `NODE_VERSION` | `22` | Any current LTS works. |
| `PORT` | *(leave unset)* | Render sets `PORT` automatically; the app already reads it. |
| `DB_PATH` | `/var/data/todo.db` | Must point inside the mounted disk. |
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

## 4. Database persistence

- The app uses SQLite via `better-sqlite3`.
- With `DB_PATH=/var/data/todo.db` and the persistent disk mounted at
  `/var/data`, user accounts and tasks survive restarts and redeploys.
- Existing data is never deleted automatically. The table schema is created with
  `CREATE TABLE IF NOT EXISTS`, and older databases are upgraded in place.
- Tasks are always filtered by `userId` on the server, so one account can never
  read or change another account's tasks, even by guessing an id.

No code change or schema migration is required. Only move to a managed
PostgreSQL database if you later outgrow a single SQLite file.

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
