# AppEx — Backend Architecture & API Contract

> This document defines the backend architecture, database schema, API endpoints, and data contracts between the frontend and backend. It serves as the single source of truth for both teams.

---

## Table of Contents

- [1. Stack Overview](#1-stack-overview)
- [2. Directory Structure](#2-directory-structure)
- [3. Database Schema](#3-database-schema)
- [4. API Endpoints](#4-api-endpoints)
- [5. Authentication](#5-authentication)
- [6. Data Types & Contracts](#6-data-types--contracts)
- [7. Business Logic](#7-business-logic)
- [8. Frontend ↔ Backend Mapping](#8-frontend--backend-mapping)
- [9. Environment Variables](#9-environment-variables)
- [10. Error Handling](#10-error-handling)

---

## 1. Stack Overview

| Layer | Technology |
|-------|-----------|
| Runtime | Node.js (ES modules) |
| Framework | Express.js v5 |
| Language | TypeScript 5.x (strict mode) |
| Database | PostgreSQL via Supabase |
| Auth | Supabase Auth (JWT) |
| Validation | Zod |
| AI Proxy | OpenAI, Anthropic, DeepSeek SDKs |
| Monorepo | npm workspaces (`frontend/`, `backend/`) |

### Currently Implemented

- `POST /api/auth/login` — Supabase sign-in
- `POST /api/users` — Supabase sign-up + user record creation
- `GET /api/users/me` — Fetch authenticated user
- `PUT /api/users/me` — Update profile name
- `GET /api/users/:id` — Public user lookup
- Auth middleware (Bearer JWT verification via Supabase)
- Error handling middleware (AppError + ZodError)
- Zod env validation

---

## 2. Directory Structure

```
backend/src/
├── index.ts                          # Express app, middleware chain
├── config/
│   └── env.ts                        # Zod env validation
├── db/
│   └── supabase.ts                   # Supabase public + admin clients
├── middleware/
│   ├── auth.middleware.ts            # requireAuth (JWT → userId)
│   └── validate.middleware.ts        # Zod request body/params validation
├── types/
│   └── index.ts                      # Shared types
├── utils/
│   └── error-handler.ts             # AppError class + error middleware
│
├── api/
│   ├── auth/
│   │   ├── auth.route.ts
│   │   ├── auth.controller.ts
│   │   └── auth.schema.ts
│   ├── user/
│   │   ├── user.route.ts
│   │   ├── user.controller.ts
│   │   └── user.schema.ts
│   ├── skill/                        # NEW
│   │   ├── skill.route.ts
│   │   ├── skill.controller.ts
│   │   └── skill.schema.ts
│   ├── lesson/                       # NEW
│   │   ├── lesson.route.ts
│   │   ├── lesson.controller.ts
│   │   └── lesson.schema.ts
│   ├── chat/                         # NEW
│   │   ├── chat.route.ts
│   │   ├── chat.controller.ts
│   │   └── chat.schema.ts
│   ├── streak/                       # NEW
│   │   ├── streak.route.ts
│   │   ├── streak.controller.ts
│   │   └── streak.schema.ts
│   ├── prompt/                       # NEW
│   │   ├── prompt.route.ts
│   │   ├── prompt.controller.ts
│   │   └── prompt.schema.ts
│   ├── subscription/                 # NEW
│   │   ├── subscription.route.ts
│   │   ├── subscription.controller.ts
│   │   └── subscription.schema.ts
│   └── contact/                      # NEW
│       ├── contact.route.ts
│       └── contact.controller.ts
│
└── services/                         # NEW — Business logic
    ├── ai.service.ts                # Multi-model AI proxy
    ├── streak.service.ts            # Streak calculation logic
    └── credit.service.ts            # Credit balance tracking
```

---

## 3. Database Schema

### 3.1 Existing Tables

#### `users`

| Column | Type | Constraints |
|--------|------|-------------|
| `id` | uuid | PK, default `gen_random_uuid()` |
| `email` | text | UNIQUE, NOT NULL |
| `name` | text | NOT NULL |
| `avatar_url` | text | NULLABLE |
| `created_at` | timestamptz | DEFAULT `now()` |
| `updated_at` | timestamptz | DEFAULT `now()` |

---

### 3.2 New Tables

#### `skills`

| Column | Type | Constraints |
|--------|------|-------------|
| `id` | serial | PK |
| `title` | text | NOT NULL |
| `description` | text | NOT NULL |
| `about` | text | NOT NULL |
| `emoji` | text | NOT NULL |
| `category` | text | NOT NULL, CHECK(`ai_automations`, `freelancing`, `marketing`, `ai_content`) |
| `duration` | text | NOT NULL |
| `order` | int | DEFAULT 0 |
| `created_at` | timestamptz | DEFAULT `now()` |

#### `modules`

| Column | Type | Constraints |
|--------|------|-------------|
| `id` | serial | PK |
| `skill_id` | int | FK → `skills.id` ON DELETE CASCADE |
| `title` | text | NOT NULL |
| `order` | int | DEFAULT 0 |

#### `lessons`

| Column | Type | Constraints |
|--------|------|-------------|
| `id` | serial | PK |
| `module_id` | int | FK → `modules.id` ON DELETE CASCADE |
| `label` | text | NOT NULL (e.g. "Lesson 1") |
| `title` | text | NOT NULL |
| `emoji` | text | NOT NULL |
| `content` | jsonb | NOT NULL — array of `LessonStep` |
| `order` | int | DEFAULT 0 |

> `content` stores the full step-by-step lesson body as JSONB. See [Section 6.3](#63-lesson-content-jsonb-schema) for the schema.

#### `skill_progress`

| Column | Type | Constraints |
|--------|------|-------------|
| `id` | uuid | PK, default `gen_random_uuid()` |
| `user_id` | uuid | FK → `users.id` ON DELETE CASCADE |
| `skill_id` | int | FK → `skills.id` ON DELETE CASCADE |
| `progress` | int | DEFAULT 0, CHECK(0–100) |
| `status` | text | DEFAULT `'not_started'`, CHECK(`not_started`, `in_progress`, `completed`) |
| `updated_at` | timestamptz | DEFAULT `now()` |

> UNIQUE constraint on `(user_id, skill_id)`.

#### `lesson_progress`

| Column | Type | Constraints |
|--------|------|-------------|
| `id` | uuid | PK, default `gen_random_uuid()` |
| `user_id` | uuid | FK → `users.id` ON DELETE CASCADE |
| `lesson_id` | int | FK → `lessons.id` ON DELETE CASCADE |
| `step_index` | int | DEFAULT 0 |
| `completed` | boolean | DEFAULT false |
| `rating` | int | NULLABLE, CHECK(1–5) |
| `feedback` | text | NULLABLE |
| `completed_at` | timestamptz | NULLABLE |

> UNIQUE constraint on `(user_id, lesson_id)`.

#### `streaks`

| Column | Type | Constraints |
|--------|------|-------------|
| `user_id` | uuid | PK, FK → `users.id` ON DELETE CASCADE |
| `current` | int | DEFAULT 0 |
| `best` | int | DEFAULT 0 |
| `milestone` | int | DEFAULT 28 |
| `last_active_date` | date | NULLABLE |
| `updated_at` | timestamptz | DEFAULT `now()` |

#### `streak_days`

| Column | Type | Constraints |
|--------|------|-------------|
| `id` | uuid | PK, default `gen_random_uuid()` |
| `user_id` | uuid | FK → `users.id` ON DELETE CASCADE |
| `date` | date | NOT NULL |

> UNIQUE constraint on `(user_id, date)`.

#### `chat_sessions`

| Column | Type | Constraints |
|--------|------|-------------|
| `id` | uuid | PK, default `gen_random_uuid()` |
| `user_id` | uuid | FK → `users.id` ON DELETE CASCADE |
| `title` | text | NOT NULL |
| `model_id` | text | NOT NULL |
| `created_at` | timestamptz | DEFAULT `now()` |
| `updated_at` | timestamptz | DEFAULT `now()` |

#### `chat_messages`

| Column | Type | Constraints |
|--------|------|-------------|
| `id` | uuid | PK, default `gen_random_uuid()` |
| `session_id` | uuid | FK → `chat_sessions.id` ON DELETE CASCADE |
| `role` | text | NOT NULL, CHECK(`user`, `assistant`) |
| `content` | text | NOT NULL |
| `created_at` | timestamptz | DEFAULT `now()` |

#### `user_credits`

| Column | Type | Constraints |
|--------|------|-------------|
| `user_id` | uuid | PK, FK → `users.id` ON DELETE CASCADE |
| `balance` | int | DEFAULT 5, CHECK(≥ 0) |
| `updated_at` | timestamptz | DEFAULT `now()` |

#### `prompts`

| Column | Type | Constraints |
|--------|------|-------------|
| `id` | serial | PK |
| `title` | text | NOT NULL |
| `category` | text | NOT NULL |
| `content` | text | NOT NULL |
| `order` | int | DEFAULT 0 |

#### `subscriptions`

| Column | Type | Constraints |
|--------|------|-------------|
| `id` | uuid | PK, default `gen_random_uuid()` |
| `user_id` | uuid | FK → `users.id` ON DELETE CASCADE, UNIQUE |
| `plan_name` | text | NOT NULL |
| `status` | text | DEFAULT `'active'`, CHECK(`active`, `paused`, `cancelled`) |
| `intro_price` | numeric(10,2) | NULLABLE |
| `price` | numeric(10,2) | NOT NULL |
| `renewal_date` | date | NOT NULL |
| `paused_at` | timestamptz | NULLABLE |
| `created_at` | timestamptz | DEFAULT `now()` |

#### `billing_history`

| Column | Type | Constraints |
|--------|------|-------------|
| `id` | uuid | PK, default `gen_random_uuid()` |
| `user_id` | uuid | FK → `users.id` ON DELETE CASCADE |
| `amount` | numeric(10,2) | NOT NULL |
| `description` | text | NOT NULL |
| `paid_at` | timestamptz | NOT NULL |
| `created_at` | timestamptz | DEFAULT `now()` |

#### `contact_messages`

| Column | Type | Constraints |
|--------|------|-------------|
| `id` | uuid | PK, default `gen_random_uuid()` |
| `user_id` | uuid | FK → `users.id` ON DELETE CASCADE |
| `subject` | text | NOT NULL |
| `message` | text | NOT NULL |
| `created_at` | timestamptz | DEFAULT `now()` |

---

### 3.3 Row-Level Security (RLS)

All user-specific tables must have RLS enabled:

```sql
-- Example for skill_progress
ALTER TABLE skill_progress ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own progress"
  ON skill_progress FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update own progress"
  ON skill_progress FOR ALL
  USING (auth.uid() = user_id);
```

Apply similar policies to: `lesson_progress`, `streaks`, `streak_days`, `chat_sessions`, `chat_messages`, `user_credits`, `subscriptions`, `billing_history`, `contact_messages`.

Read-only public tables (no RLS needed): `skills`, `modules`, `lessons`, `prompts`.

---

## 4. API Endpoints

### 4.1 Auth (`/api/auth`)

| Method | Path | Auth | Description | Request Body | Response |
|--------|------|------|-------------|-------------|----------|
| `POST` | `/auth/login` | Public | Sign in | `LoginDto` | `AuthResponse` |
| `POST` | `/auth/signup` | Public | Create account | `CreateUserDto` | `AuthResponse` |
| `POST` | `/auth/refresh` | Public | Refresh token | `{ refreshToken: string }` | `AuthResponse` |

### 4.2 User (`/api/users`)

| Method | Path | Auth | Description | Request Body | Response |
|--------|------|------|-------------|-------------|----------|
| `GET` | `/users/me` | Required | Get current user | — | `User` |
| `PUT` | `/users/me` | Required | Update profile | `{ name: string, email?: string }` | `User` |
| `PATCH` | `/users/me/password` | Required | Change password | `{ currentPassword, newPassword }` | `{ success: true }` |

### 4.3 Skills (`/api/skills`)

| Method | Path | Auth | Description | Query Params | Response |
|--------|------|------|-------------|-------------|----------|
| `GET` | `/skills` | Required | List all skills with user progress | `?category=ai_automations` | `SkillWithProgress[]` |
| `GET` | `/skills/:id` | Required | Skill detail with modules + user progress | — | `SkillDetail` |

### 4.4 Lessons (`/api/lessons`)

| Method | Path | Auth | Description | Request Body | Response |
|--------|------|------|-------------|-------------|----------|
| `GET` | `/lessons/:id` | Required | Get lesson content + user progress | — | `LessonWithProgress` |
| `PATCH` | `/lessons/:id/progress` | Required | Update step progress | `{ stepIndex: number }` | `LessonProgress` |
| `POST` | `/lessons/:id/complete` | Required | Mark lesson complete | `{ rating?: number, feedback?: string }` | `LessonProgress` |

### 4.5 Chat (`/api/chat`)

| Method | Path | Auth | Description | Request Body | Response |
|--------|------|------|-------------|-------------|----------|
| `GET` | `/chat/models` | Required | List available AI models | — | `AIModel[]` |
| `POST` | `/chat/messages` | Required | Send message, get AI response | `SendMessageDto` | `ChatMessageResponse` |
| `GET` | `/chat/sessions` | Required | List chat history | `?type=chat\|assistant` | `ChatSession[]` |
| `GET` | `/chat/sessions/:id` | Required | Get session with messages | — | `ChatSessionDetail` |
| `DELETE` | `/chat/sessions/:id` | Required | Delete chat session | — | `{ success: true }` |

### 4.6 Streaks (`/api/streaks`)

| Method | Path | Auth | Description | Response |
|--------|------|------|-------------|----------|
| `GET` | `/streaks` | Required | Get current streak data | `StreakData` |
| `POST` | `/streaks/check-in` | Required | Record today's activity | `StreakData` |
| `GET` | `/streaks/calendar` | Required | Get active days for a month | `{ activeDays: string[] }` |

### 4.7 Prompts (`/api/prompts`)

| Method | Path | Auth | Description | Query Params | Response |
|--------|------|------|-------------|-------------|----------|
| `GET` | `/prompts` | Required | List all prompts | `?search=&category=` | `Prompt[]` |
| `GET` | `/prompts/categories` | Required | List categories | — | `string[]` |

### 4.8 Subscription (`/api/subscription`)

| Method | Path | Auth | Description | Response |
|--------|------|------|-------------|----------|
| `GET` | `/subscription` | Required | Get user's subscription | `Subscription` |
| `PATCH` | `/subscription/pause` | Required | Pause subscription | `Subscription` |
| `GET` | `/billing/history` | Required | Get billing records | `BillingRecord[]` |

### 4.9 Credits (`/api/credits`)

| Method | Path | Auth | Description | Response |
|--------|------|------|-------------|----------|
| `GET` | `/credits` | Required | Get credit balance | `{ balance: number }` |

### 4.10 Contact (`/api/contact`)

| Method | Path | Auth | Description | Request Body | Response |
|--------|------|------|-------------|-------------|----------|
| `POST` | `/contact` | Required | Submit support message | `{ subject, message }` | `{ success: true }` |

---

## 5. Authentication

### Flow

```
1. Client POST /auth/login  →  { email, password }
2. Server verifies via Supabase Auth  →  { accessToken, refreshToken, user }
3. Client stores tokens in localStorage:
   - appex_access_token
   - appex_refresh_token
4. All subsequent requests include:
   Authorization: Bearer <accessToken>
5. Server middleware verifies token via supabase.auth.getUser(token)
6. On 401, client calls POST /auth/refresh  →  new tokens
7. On logout, client removes tokens from localStorage
```

### Token Storage (Frontend)

```typescript
localStorage.getItem('appex_access_token')   // Access token
localStorage.getItem('appex_refresh_token')   // Refresh token
```

### Protected Route Guard (Frontend)

The `ProtectedRoute` component reads `isAuthenticated` from the Zustand auth store and redirects to `/auth` if false.

---

## 6. Data Types & Contracts

### 6.1 Auth Types

```typescript
interface LoginDto {
  email: string       // valid email
  password: string    // min 1 char
}

interface CreateUserDto {
  email: string       // valid email
  name: string        // min 2 chars
  password: string    // min 8 chars, uppercase + lowercase + number
}

interface AuthResponse {
  accessToken: string
  refreshToken: string
  user: User
}

interface User {
  id: string
  email: string
  name: string
  avatarUrl: string | null
  createdAt: string   // ISO 8601
}
```

### 6.2 Skill Types

```typescript
interface SkillWithProgress {
  id: number
  title: string
  description: string
  emoji: string
  category: 'ai_automations' | 'freelancing' | 'marketing' | 'ai_content'
  duration: string
  progress: number     // 0–100, from skill_progress table
  status: 'not_started' | 'in_progress' | 'completed'
}

interface SkillDetail extends SkillWithProgress {
  about: string
  modules: Module[]
}

interface Module {
  id: number
  title: string
  lessonCount: number
  lessons: LessonSummary[]
}

interface LessonSummary {
  id: number
  label: string       // "Lesson 1"
  title: string
  emoji: string
  locked: boolean     // derived: true if previous lesson not completed
}
```

### 6.3 Lesson Content (JSONB Schema)

The `lessons.content` column stores an array of steps. Each step is an array of blocks:

```typescript
interface LessonWithProgress {
  id: number
  label: string
  title: string
  steps: LessonStep[]
  progress: {
    stepIndex: number
    completed: boolean
  }
}

interface LessonStep {
  blocks: LessonBlock[]
}

type LessonBlock =
  | { type: 'text'; content: string }
  | { type: 'bold-text'; content: string }
  | { type: 'heading'; content: string }
  | { type: 'image'; src: string; alt?: string }
  | { type: 'list'; items: string[] }
  | { type: 'user-message'; name: string; text: string }
  | { type: 'mentor-message'; text: string }
```

### 6.4 Chat Types

```typescript
interface AIModel {
  id: string           // 'chatgpt', 'claude', etc.
  name: string
  icon: string         // emoji
}

interface SendMessageDto {
  sessionId?: string   // null = create new session
  modelId: string
  content: string
}

interface ChatMessageResponse {
  sessionId: string
  userMessage: ChatMessage
  assistantMessage: ChatMessage
  creditsRemaining: number
}

interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  createdAt: string
}

interface ChatSession {
  id: string
  title: string
  modelId: string
  createdAt: string
}

interface ChatSessionDetail extends ChatSession {
  messages: ChatMessage[]
}
```

### 6.5 Streak Types

```typescript
interface StreakData {
  current: number
  best: number
  milestone: number
  lastActiveDate: string | null  // ISO date
}

// GET /streaks/calendar?month=2026-02
interface StreakCalendar {
  activeDays: string[]  // ['2026-02-01', '2026-02-03', ...]
}
```

### 6.6 Prompt Types

```typescript
interface Prompt {
  id: number
  title: string
  category: string
  content: string
}
```

### 6.7 Subscription & Billing Types

```typescript
interface Subscription {
  id: string
  planName: string
  status: 'active' | 'paused' | 'cancelled'
  introPrice: number | null
  price: number
  renewalDate: string   // ISO date
  pausedAt: string | null
}

interface BillingRecord {
  id: string
  amount: number
  description: string
  paidAt: string        // ISO 8601
}
```

---

## 7. Business Logic

### 7.1 Lesson Locking

A lesson is **locked** if the previous lesson in the same module (by `order`) has not been completed by the user. The first lesson in every module is always unlocked.

```
locked = previousLesson != null
       && lesson_progress.completed == false for previousLesson
```

### 7.2 Skill Progress Calculation

Skill progress is calculated as the percentage of completed lessons across all modules:

```
progress = (completedLessons / totalLessons) * 100
```

Skill status is derived:
- `not_started` — progress == 0
- `in_progress` — 0 < progress < 100
- `completed` — progress == 100

### 7.3 Streak Logic

On `POST /streaks/check-in`:

1. Insert today's date into `streak_days` (ignore if already exists).
2. Calculate `current` streak by counting consecutive days backwards from today.
3. Update `best` if `current > best`.
4. Update `last_active_date` to today.

If the user misses a day (today - last_active_date > 1 day), `current` resets to 0 on next read.

### 7.4 AI Chat Credits

- New users start with **5 credits** (inserted on signup).
- Each `POST /chat/messages` decrements balance by 1.
- If `balance == 0`, return `403 { error: 'Insufficient credits' }`.
- Credits can be added via subscription upgrades (future).

### 7.5 Chat Session Title

Auto-generated from the first user message:
- Take the first 50 characters of the first user message.
- Trim at the last word boundary.

---

## 8. Frontend ↔ Backend Mapping

### Page → API Calls

| Frontend Page | Route | API Calls |
|---------------|-------|-----------|
| Auth | `/auth` | `POST /auth/login`, `POST /auth/signup` |
| Home | `/home` | `GET /users/me`, `GET /streaks`, `GET /skills` (enrolled) |
| Skills | `/skills` | `GET /skills?category=` |
| Skill Detail | `/skills/:id` | `GET /skills/:id` |
| Skill Lesson | `/skills/:skillId/lessons/:lessonId` | `GET /lessons/:id`, `PATCH /lessons/:id/progress`, `POST /lessons/:id/complete`, `POST /streaks/check-in` |
| Academy Course | `/academy/courses/:id` | `GET /skills/:id` (reuse skill detail) |
| Academy Lesson | `/academy/.../lessons/:id` | Same as Skill Lesson |
| AI Chat | `/ai-tools/chat` | `GET /chat/models`, `POST /chat/messages`, `GET /chat/sessions`, `GET /credits` |
| Prompts Library | `/resources/prompts` | `GET /prompts?search=&category=` |
| Settings — Account | `/settings` | `GET /users/me`, `PUT /users/me` |
| Settings — Password | `/settings` | `PATCH /users/me/password` |
| Settings — Billing | `/settings` | `GET /billing/history` |
| Settings — Plan | `/settings` | `GET /subscription`, `PATCH /subscription/pause` |
| Settings — Contact | `/settings` | `POST /contact` |
| Streak Sheet | (sidebar popup) | `GET /streaks`, `GET /streaks/calendar?month=` |

### Frontend State → Backend Source

| Frontend State | Current Source | Backend Source |
|----------------|---------------|----------------|
| `useAuthStore.user` | Zustand + localStorage | `GET /users/me` |
| `useAuthStore.token` | localStorage | `POST /auth/login` response |
| Skill list + progress | `mock-data.ts` | `GET /skills` |
| Lesson content + steps | `mock-content.ts` | `GET /lessons/:id` |
| Chat messages | Component state | `GET /chat/sessions/:id` |
| Chat history | `mock-data.ts` | `GET /chat/sessions` |
| Credits balance | Hardcoded `5` | `GET /credits` |
| Streak data | `MOCK_STREAK` | `GET /streaks` |
| Streak calendar | `activeDays Set` | `GET /streaks/calendar` |
| Prompts | Inline array | `GET /prompts` |
| Subscription | Hardcoded | `GET /subscription` |
| Billing history | Hardcoded | `GET /billing/history` |

---

## 9. Environment Variables

### Backend (`.env`)

```env
PORT=3000
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# AI Provider Keys (for chat proxy)
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-ant-...
DEEPSEEK_API_KEY=sk-...
```

### Frontend (`.env`)

```env
VITE_API_URL=http://localhost:3000/api
```

---

## 10. Error Handling

### Error Response Format

All errors return a consistent JSON shape:

```json
{
  "error": "Human-readable error message",
  "code": "ERROR_CODE",
  "statusCode": 400
}
```

### Standard Error Codes

| HTTP Status | Code | Usage |
|-------------|------|-------|
| `400` | `VALIDATION_ERROR` | Zod validation failure |
| `401` | `UNAUTHORIZED` | Missing or invalid token |
| `403` | `FORBIDDEN` | Insufficient credits, wrong owner |
| `404` | `NOT_FOUND` | Resource does not exist |
| `409` | `CONFLICT` | Duplicate entry (e.g. email exists) |
| `500` | `INTERNAL_ERROR` | Unexpected server error |

### Validation Errors (Zod)

```json
{
  "error": "Validation failed",
  "code": "VALIDATION_ERROR",
  "statusCode": 400,
  "details": [
    { "field": "email", "message": "Invalid email format" },
    { "field": "password", "message": "Must be at least 8 characters" }
  ]
}
```

---

## Appendix: Supabase Table Creation SQL

```sql
-- Skills catalog
CREATE TABLE skills (
  id SERIAL PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  about TEXT NOT NULL,
  emoji TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('ai_automations','freelancing','marketing','ai_content')),
  duration TEXT NOT NULL,
  "order" INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Modules
CREATE TABLE modules (
  id SERIAL PRIMARY KEY,
  skill_id INT NOT NULL REFERENCES skills(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  "order" INT DEFAULT 0
);

-- Lessons
CREATE TABLE lessons (
  id SERIAL PRIMARY KEY,
  module_id INT NOT NULL REFERENCES modules(id) ON DELETE CASCADE,
  label TEXT NOT NULL,
  title TEXT NOT NULL,
  emoji TEXT NOT NULL,
  content JSONB NOT NULL DEFAULT '[]',
  "order" INT DEFAULT 0
);

-- Skill progress per user
CREATE TABLE skill_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  skill_id INT NOT NULL REFERENCES skills(id) ON DELETE CASCADE,
  progress INT DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
  status TEXT DEFAULT 'not_started' CHECK (status IN ('not_started','in_progress','completed')),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (user_id, skill_id)
);

-- Lesson progress per user
CREATE TABLE lesson_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  lesson_id INT NOT NULL REFERENCES lessons(id) ON DELETE CASCADE,
  step_index INT DEFAULT 0,
  completed BOOLEAN DEFAULT false,
  rating INT CHECK (rating >= 1 AND rating <= 5),
  feedback TEXT,
  completed_at TIMESTAMPTZ,
  UNIQUE (user_id, lesson_id)
);

-- Streak summary
CREATE TABLE streaks (
  user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  current INT DEFAULT 0,
  best INT DEFAULT 0,
  milestone INT DEFAULT 28,
  last_active_date DATE,
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Daily streak check-ins
CREATE TABLE streak_days (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  UNIQUE (user_id, date)
);

-- Chat sessions
CREATE TABLE chat_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  model_id TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Chat messages
CREATE TABLE chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES chat_sessions(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user','assistant')),
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- User AI credits
CREATE TABLE user_credits (
  user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  balance INT DEFAULT 5 CHECK (balance >= 0),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Prompt library
CREATE TABLE prompts (
  id SERIAL PRIMARY KEY,
  title TEXT NOT NULL,
  category TEXT NOT NULL,
  content TEXT NOT NULL,
  "order" INT DEFAULT 0
);

-- Subscriptions
CREATE TABLE subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE UNIQUE,
  plan_name TEXT NOT NULL,
  status TEXT DEFAULT 'active' CHECK (status IN ('active','paused','cancelled')),
  intro_price NUMERIC(10,2),
  price NUMERIC(10,2) NOT NULL,
  renewal_date DATE NOT NULL,
  paused_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Billing history
CREATE TABLE billing_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  amount NUMERIC(10,2) NOT NULL,
  description TEXT NOT NULL,
  paid_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Contact messages
CREATE TABLE contact_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  subject TEXT NOT NULL,
  message TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS on user-specific tables
ALTER TABLE skill_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE lesson_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE streaks ENABLE ROW LEVEL SECURITY;
ALTER TABLE streak_days ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_credits ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE billing_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE contact_messages ENABLE ROW LEVEL SECURITY;
```
