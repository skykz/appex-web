# AppEx Admin Panel

Admin dashboard for managing courses, categories, lessons, and users.

Runs on **http://localhost:5174** alongside the user frontend (5173) and backend (3000).

## Setup

### 1. Apply the migration

Run the new migration on your Supabase project:

```sql
-- File: backend/supabase/migrations/002_admin_and_categories.sql
-- Copy its contents into the Supabase SQL editor and run.
```

This adds:
- `users.role` column (`user` | `admin`)
- `categories` table (slug, label, order)
- Seeds the 4 default categories
- Drops the hardcoded `skills.category` CHECK so admins can add new categories

### 2. Install dependencies

From the repo root:

```bash
npm install
```

### 3. Promote yourself to admin

Sign up in the user app at `http://localhost:5173/auth`, then run:

```bash
npx tsx backend/scripts/make-admin.ts your@email.com
```

### 4. Start the dev server

```bash
npm run dev
```

All three services start concurrently. Open **http://localhost:5174** and sign in.

## Environment

The admin uses the same API as the user app.

- **Local:** copy `.env.example` to `.env` or set `VITE_API_URL` in `admin/.env` if the backend is not on `http://localhost:3000/api`.
- **Vercel / production:** you **must** set `VITE_API_URL` in the project’s **Environment Variables** (Production and Preview) to your deployed API base, e.g. `https://your-backend.vercel.app/api`, then **redeploy**. If it is missing, production builds fail on purpose so the bundle never embeds `localhost`. Also add your admin site origin to the backend `CORS_ORIGINS`.

## Features

- **Dashboard** — live totals from Supabase: users, courses, lessons, chat activity, revenue, subscriptions, support inbox, 14-day signup chart, recent signups, recent lesson completions.
- **Categories** — create, edit, reorder, delete. Cannot delete a category that still has courses.
- **Courses** — full CRUD with all fields (title, description, about, emoji, category, duration, order). Filter by category, search by title.
- **Course detail** — add/edit/delete modules and lessons. The lesson editor supports multi-step lessons with typed blocks (heading, text, bold-text, list, image, user-message, mentor-message) — the same format the user app renders.
- **Users** — list of all users with credits, streak, and join date.

## Security

- The admin UI stores its own JWT under `appex_admin_access_token` — separate from the user app's `appex_access_token`, so signing in to the user app does not give you admin access.
- The backend `/api/admin/*` routes run `requireAuth` + `requireAdmin` — any token lacking `role = 'admin'` gets 403.
- Admin login itself verifies the role before returning a token. If a non-admin tries to sign in, Supabase signs out again and returns 403.
