# Quickstart: Downtex

**Branch**: `001-collab-academic-editor`
**Date**: 2026-03-12

## Prerequisites

- Node.js 20 LTS
- Docker and Docker Compose (for local Supabase and Puppeteer)
- Supabase CLI (`npx supabase`)
- A GitHub OAuth app (for GitHub sign-in and draw.io integration)
- A Google OAuth app (for Google sign-in)

## 1. Clone and Install

```bash
git clone <repo-url> downtex
cd downtex
npm install
```

## 2. Start Local Supabase

```bash
npx supabase start
```

This starts local PostgreSQL, Auth, Realtime, Storage, and Edge Functions. Note the output — it prints the local `SUPABASE_URL` and `SUPABASE_ANON_KEY`.

## 3. Configure Environment

Copy the example env file and fill in values:

```bash
cp .env.example .env
```

Required variables:

```env
SUPABASE_URL=http://127.0.0.1:54321
SUPABASE_ANON_KEY=<from supabase start output>
SUPABASE_SERVICE_ROLE_KEY=<from supabase start output>
GITHUB_CLIENT_ID=<your GitHub OAuth app client ID>
GITHUB_CLIENT_SECRET=<your GitHub OAuth app client secret>
GOOGLE_CLIENT_ID=<your Google OAuth app client ID>
GOOGLE_CLIENT_SECRET=<your Google OAuth app client secret>
ENCRYPTION_KEY=<32-byte hex string, generate with: openssl rand -hex 32>
SESSION_SECRET=<any random string, generate with: openssl rand -hex 32>
APP_URL=http://localhost:3000
```

## 4. Run Migrations

```bash
npx supabase db reset
```

This applies all migrations from `supabase/migrations/` and runs `supabase/seed.sql`.

## 5. Start Development Server

```bash
npm run dev
```

The app runs at `http://localhost:3000`.

## 6. Sign In

1. Navigate to `http://localhost:3000`
2. Click "Sign in with GitHub" or "Sign in with Google"
3. Complete the OAuth flow
4. You land in your personal workspace

## 7. Create Your First Document

1. Click "New Folder" in the sidebar → name it "My Reports"
2. Click the "+" button inside the folder → a new "Untitled" document opens
3. Start typing — the editor auto-saves as you type

## 8. Test Collaboration (Two Browser Tabs)

1. Open the same document URL in a second browser tab (or incognito)
2. Sign in as a different user (or the same user — presence still works)
3. Both tabs show each other's cursors
4. Type in one tab → changes appear in the other instantly

## 9. Export to PDF

1. Click the "Export PDF" button in the top bar
2. A PDF downloads with front page, table of contents, and formatted content

## 10. Run Tests

```bash
# Unit tests
npm run test

# E2E tests (requires the dev server to be running)
npx playwright test
```

## Docker (Production Build)

```bash
docker build -t downtex .
docker run -p 3000:3000 --env-file .env downtex
```

## Project Structure Overview

| Path | Purpose |
|------|---------|
| `app/routes/` | Remix file-based routes (pages + API) |
| `app/components/` | React components (editor, sidebar, modals, UI) |
| `app/lib/` | Server utilities (Supabase, PDF, GitHub, crypto) |
| `supabase/migrations/` | Database schema and RLS policies |
| `supabase/functions/` | Edge functions (daily snapshots, figure polling) |
| `tests/unit/` | Vitest unit tests |
| `tests/e2e/` | Playwright E2E tests |

## Useful Commands

| Command | Description |
|---------|-------------|
| `npm run dev` | Start Remix dev server |
| `npm run build` | Build for production |
| `npm run test` | Run Vitest unit tests |
| `npx playwright test` | Run E2E tests |
| `npx supabase start` | Start local Supabase |
| `npx supabase db reset` | Reset DB and apply migrations |
| `npx supabase functions serve` | Serve edge functions locally |
| `npm run typecheck` | Run TypeScript type checking |
| `npm run lint` | Run ESLint |
