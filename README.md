# TaskFlow - To-Do list with email reminders

A glassmorphism to-do app. You create tasks with a deadline and a reminder lead
time, and an Express backend emails you through Gmail before the deadline
arrives. Each account only ever sees its own tasks.

## What is in this repository

| Folder    | What it is                                                            |
| --------- | --------------------------------------------------------------------- |
| `/` (root) | React 19 + Vite frontend. Builds to `dist/`.                         |
| `server/` | Express + SQLite backend with authentication and the reminder scheduler. |

The frontend and backend are separate apps with their own `package.json`.
See `server/README.md` for the full backend reference.

```
React app  --HTTP-->  Express API  --SMTP-->  Gmail  --email-->  your inbox
(browser)             (server/)                (your account)
```

## Requirements

- Node.js 18 or newer (Node 22+ recommended)
- A Gmail account with 2-Step Verification for reminders (optional for dev)

## 1. Backend

```bash
cd server
npm install
copy .env.example .env      # Windows (use `cp` on macOS/Linux)
npm start                   # or: npm run dev
```

Fill in `server/.env` (it is git-ignored - never commit it):

| Variable             | Purpose                                             |
| -------------------- | --------------------------------------------------- |
| `PORT`               | Port the API listens on (default `5000`)            |
| `CLIENT_URL`         | Allowed frontend origin(s) for CORS, comma separated |
| `NODE_ENV`           | `production` turns on the secure cookie flag        |
| `EMAIL_USER`         | Gmail account used to send reminders                |
| `EMAIL_APP_PASSWORD` | Gmail **App Password** (not your normal password)   |
| `EMAIL_FROM`         | Sender address shown in the email                   |
| `JWT_SECRET`         | Signs the login cookie                              |

Generate a `JWT_SECRET` with:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Health check: <http://localhost:5000/api/health>

## 2. Frontend

```bash
npm install
npm run dev        # http://localhost:5173
npm run build      # production build into dist/
npm run preview    # serve the built output locally
```

The frontend reads its API address from the `VITE_API_URL` environment variable
and falls back to `http://localhost:5000` when it is not set. Put real URLs in a
local `.env` (git-ignored) or in the host's dashboard - never commit secrets.

```bash
# .env (optional, local only)
VITE_API_URL=http://localhost:5000
```

## 3. Tests and checks

There is no test runner configured. The available check is the production build:

```bash
npm run build          # frontend
cd server && npm start # boots the API (needs a valid .env for email)
```

## 4. Deployment

### Frontend - Vercel

- Root directory: the repository root (`/`).
- Framework preset: Vite.
- Build command: `npm run build`. Output directory: `dist`.
- Set `VITE_API_URL` to the public HTTPS address of the deployed backend.
- Anything in `VITE_API_URL` is visible in the browser bundle, so it must only
  ever contain the API URL - never a secret.

### Backend - needs a persistent host

The current backend cannot run on Vercel's serverless functions, because it:

- uses a **SQLite file** that must live on persistent storage,
- runs a **continuously running `node-cron` scheduler** for reminders,
- needs long-lived processes rather than per-request functions.

Deploy `server/` to a host that keeps a process running and offers a persistent
disk (for example Render, Railway, Fly.io, or a small VPS). Then:

1. Set the same environment variables as `server/.env` there (including the real
   `JWT_SECRET` and Gmail App Password), and `NODE_ENV=production`.
2. Set `CLIENT_URL` to the deployed Vercel URL so CORS and cookies work.
3. Point the frontend's `VITE_API_URL` at that backend's HTTPS URL.

SQLite persistence, the scheduler, and Gmail delivery must all be verified on
the chosen host before reminders can be trusted in production.

## 5. Security notes

- `server/.env`, `server/data/*.db`, logs, `node_modules` and `dist` are
  git-ignored. If a secret was ever committed, rotate it - removing it from the
  latest commit does not remove it from Git history.
- The login token lives in an HTTP-only cookie; it is never stored in
  `localStorage` and never returned in a JSON body.
