# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What is Downtex?

Collaborative academic document editor with real-time co-editing, LaTeX math, PDF export, and GitHub integration. Built on React Router 7 (SSR), Tiptap/ProseMirror, Yjs CRDTs, and Supabase.

## Commands

```bash
# Development
make dev              # Dev server with HMR on :3000
make install          # Install dependencies

# Quality checks
make check            # typecheck + lint (runs: react-router typegen && tsc, then eslint)
npm test              # Unit tests (Vitest)
npm run test:e2e      # E2E tests (Playwright)
npx vitest run tests/unit/crypto.test.ts  # Run a single test file

# Database
make supabase-start   # Start local Supabase stack
make db-reset         # Reset DB (migrations + seed)
make db-migrate       # Run pending migrations

# Docker
make docker-up        # Start app + postgres
```

## Architecture

**React Router 7 with SSR** — routes live in `app/routes/`. Uses file-based routing with layout nesting (`_app.tsx` is the authenticated shell, `_auth.*.tsx` for login/callback).

**Key path alias:** `~/*` maps to `./app/*`

### Core Layers

- **`app/routes/`** — Loaders fetch data server-side, actions handle mutations. API routes (`api.export.$docId.tsx`, `api.search-documents.tsx`, `api.snapshot.$docId.tsx`) serve JSON/binary responses.
- **`app/components/editor/`** — Tiptap editor with custom extensions in `extensions/` (math-inline, math-block, footnote, figure, document-mention, section-reference). Renderers in `renderers/` handle HTML export.
- **`app/components/presence/`** — Real-time cursor tracking and avatar bar.
- **`app/components/comments/`** — Comments anchored to Yjs relative positions.
- **`app/lib/`** — Server utilities (Supabase clients, PDF generation, permissions, encryption, GitHub API).

### Real-time Collaboration

Yjs CRDT documents sync via a custom `SupabaseYjsProvider` (`app/lib/yjs-supabase-provider.ts`) over Supabase Realtime channels. Protocol: sync-step-1 (state vector) → sync-step-2 (missing updates) → yjs-update (incremental). First-joined user becomes persistence leader. Document state stored as `yjs_state` bytea column.

### Auth

OAuth (GitHub/Google) via Supabase Auth. Cookie-based sessions using `@supabase/ssr`. Server-side: `createSupabaseClient()` returns `{client, headers}` — headers must be merged into responses for Set-Cookie. `requireAuth()` redirects unauthenticated users.

### Permissions

Role hierarchy: owner > editor > commenter > viewer. Enforced at both workspace-member and document-collaborator levels. RLS policies in Postgres. Server-side checks in `app/lib/permissions.server.ts`.

### PDF Export

`app/lib/pdf.server.ts` uses Puppeteer + Chromium. Renders Yjs XML → HTML (`pdf-template.server.ts`) → PDF (A4). Docker image includes Chromium and fonts.

## Database

Supabase PostgreSQL. Migrations in `supabase/migrations/` (ordered 001–008 + RLS fixes). Edge functions in `supabase/functions/` (daily-snapshots, poll-figures). Seed data: `supabase/seed.sql`.

Key tables: `users`, `workspaces`, `workspace_members`, `documents`, `folders`, `document_collaborators`, `document_public_links`, `comments`, `comment_replies`, `figures`, `snapshots`.

## Code Style

- TypeScript strict mode, path alias `~/`
- ESLint: no `console`, no `any`, no non-null assertions, consistent type imports
- Prettier: double quotes, 2-space indent, trailing commas, 100-char lines
- Tailwind CSS with custom OKLCH color theme in `app/app.css`

## Environment Variables

See `.env.example`. Required: `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `ENCRYPTION_KEY` (32-byte hex for AES-256-GCM), `SESSION_SECRET`, `APP_URL`, plus OAuth client IDs/secrets.

## Active Technologies
- TypeScript 5.x (strict mode), React 18+ + Tiptap 3.20.1 (+ TextStyle, Color, TextAlign, Superscript, Subscript, Highlight extensions), KaTeX 0.16.38, Yjs (002-rich-text-formatting)
- Supabase PostgreSQL — no new tables; formatting stored in existing `yjs_state` bytea column via ProseMirror marks/attributes (002-rich-text-formatting)

## Recent Changes
- 002-rich-text-formatting: Added TypeScript 5.x (strict mode), React 18+ + Tiptap 3.20.1 (+ TextStyle, Color, TextAlign, Superscript, Subscript, Highlight extensions), KaTeX 0.16.38, Yjs
