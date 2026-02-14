# Downtex

A collaborative academic document editor for university students. Real-time co-editing, draw.io figure integration via GitHub, and clean PDF export in university report style.

**Stack:** React Router 7 (SSR) · Supabase · Yjs · Tiptap · Tailwind CSS · Puppeteer · Docker · Coolify

---

## Getting Started

### Prerequisites

- [Node.js 20+](https://nodejs.org/)
- [Docker](https://www.docker.com/) (for local Supabase and deployment)
- A Supabase project (free tier works)

### Local Setup

```bash
# Install dependencies
make install

# Copy environment variables and fill them in
cp .env.example .env

# Start local Supabase (optional, or use hosted)
make supabase-start

# Run the dev server
make dev

# Run quality checks
make check            # typecheck + lint
npm test              # unit tests (Vitest)
npm run test:e2e      # E2E tests (Playwright)

# Database management
make db-reset         # Reset DB (drop + recreate + migrate + seed)
make db-migrate       # Run pending migrations
make db-push          # Push migrations to remote database
```

### Environment Variables

| Variable | Description |
|---|---|
| `SUPABASE_URL` | Your Supabase project URL |
| `SUPABASE_ANON_KEY` | Supabase anon/public key |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key (server only) |
| `GITHUB_CLIENT_ID` | GitHub OAuth app client ID |
| `GITHUB_CLIENT_SECRET` | GitHub OAuth app client secret |
| `GOOGLE_CLIENT_ID` | Google OAuth client ID |
| `GOOGLE_CLIENT_SECRET` | Google OAuth client secret |
| `ENCRYPTION_KEY` | 32-byte hex key for encrypting GitHub tokens |
| `SESSION_SECRET` | Session cookie secret |
| `APP_URL` | Public URL, e.g. `https://downtex.yourdomain.com` |

---

## Project Structure

```
downtex/
├── app/
│   ├── routes/               # React Router 7 file-based routes
│   ├── components/
│   │   ├── editor/           # Tiptap extensions and editor UI
│   │   ├── sidebar/          # Folder tree, workspace switcher
│   │   ├── presence/         # Live cursors and online avatars
│   │   ├── comments/         # Inline comment threads
│   │   ├── modals/           # Figure picker, share, version history
│   │   └── ui/               # Design system primitives
│   └── lib/
│       ├── supabase.server.ts
│       ├── supabase.client.ts
│       ├── yjs.ts
│       ├── yjs-supabase-provider.ts
│       ├── pdf.server.ts
│       ├── pdf-template.server.ts
│       ├── github.server.ts
│       ├── drawio.server.ts
│       ├── crypto.server.ts
│       ├── permissions.server.ts
│       └── env.server.ts
├── supabase/
│   └── migrations/           # Database migrations
├── tests/
│   ├── unit/                 # Vitest unit tests
│   └── e2e/                  # Playwright E2E tests
├── Makefile                  # Common tasks (make dev, make check, etc.)
├── Dockerfile
├── docker-compose.yml
└── README.md
```

---

## Architecture

### Real-time Collaboration

Documents use Yjs CRDTs for real-time collaboration, synced via Supabase Realtime channels. The `SupabaseYjsProvider` handles the sync protocol: sync-step-1 (state vector) → sync-step-2 (missing updates) → yjs-update (incremental). The first-joined user becomes the persistence leader.

### Authentication

OAuth (GitHub/Google) via Supabase Auth. Cookie-based sessions using `@supabase/ssr`. Server-side: `createSupabaseClient()` returns `{client, headers}` — headers must be merged into responses for Set-Cookie.

### Permissions

Role hierarchy: owner > editor > commenter > viewer. Enforced at both workspace-member and document-collaborator levels with Row-Level Security policies in Postgres.

### PDF Export

Server-side PDF generation via Puppeteer + Chromium. Renders editor content as HTML → PDF (A4). Docker image includes Chromium and fonts.

---

## Deployment

Downtex self-hosts on a VPS via [Coolify](https://coolify.io/). CI runs typecheck, lint, and tests in parallel on every push. On `main`, the pipeline builds the Docker image.

```bash
# Build the Docker image locally
make docker-build

# Start all services locally (app + postgres)
make docker-up

# Tail logs
make docker-logs
```

See `.github/workflows/ci.yml` for the full CI pipeline.

---

## Contributing

1. Open an issue describing the feature or bug
2. Create a feature branch from `main`
3. Implement and test the changes
4. Open a PR from your feature branch to `main`
