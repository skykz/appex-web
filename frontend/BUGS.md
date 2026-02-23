# Bugs & Issues

## Critical (breaks functionality)

### 1. Routes don't match sidebar navigation
- Sidebar links to `/ai-tools/chat`, `/ai-tools/assistants`, `/ai-tools/automation` — but router has no such routes. Clicking sub-items = blank page / 404.
- `/chat-assistants` and `/automation` exist as separate routes but sidebar puts them under `/ai-tools/*`.

### 2. Mobile sidebar hardcoded to white
`src/shared/ui/sidebar.tsx:286` — `bg-white` breaks dark mode.

### 3. Auth token is a placeholder
`src/shared/api/http-client.ts:108-111` — `getAuthToken()` always returns `null`. All API requests go without auth.

## Medium

### 4. ProgressCard ignores dark mode
`src/shared/ui/progress-card.tsx:84` — `bg-[#ededed]` hardcoded.

### 5. Signup has no redirect
`src/pages/auth/index.tsx:18` — `onSuccess` only does `console.log`.

### 6. No auth guards
All pages accessible without login. No `ProtectedRoute`.

### 7. Hardcoded courseId in HomePage
`src/pages/home/index.tsx:137` — courseId `33` hardcoded in template.

## Low / Tech Debt

### 8. `useUiStore` unused
`src/shared/lib/ui-store.ts` — Zustand store created but never imported.

### 9. i18n configured but unused
`en.json` / `ru.json` exist but no page uses `useTranslation()`.

### 10. Hardcoded user data in sidebar
`src/widgets/app-sidebar.tsx:239-248` — name "Yera" and email hardcoded.

### 11. ESLint warning
`src/shared/ui/sidebar.tsx` exports `useSidebar` hook alongside components, breaking React Fast Refresh.
