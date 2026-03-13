# Downtex

A collaborative academic document editor for university students. Real-time co-editing, draw.io figure integration via GitHub, and clean PDF export in university report style.

**Stack:** React Router 7 (SSR) · Supabase · Yjs · Tiptap · Tailwind CSS · Puppeteer · Docker · Coolify

---

## Getting Started

### Prerequisites

- [Node.js 20+](https://nodejs.org/)
- [uv](https://docs.astral.sh/uv/) (Python package manager, used by speckit)
- [Claude Code](https://www.anthropic.com/claude-code)
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
├── .specify/                 # Speckit workspace (see below)
│   ├── memory/
│   │   └── constitution.md   # Project principles — do not edit manually
│   ├── templates/
│   └── specs/                # Feature specs go here (0001-…, 0002-…, etc.)
├── supabase/
│   └── migrations/           # Database migrations
├── Makefile                  # Common tasks (make dev, make check, etc.)
├── Dockerfile
└── README.md
```

---

## How We Add New Features (Spec-Driven Development)

Downtex uses **[GitHub Spec Kit](https://github.com/github/spec-kit)** for all feature development. Every feature goes through the same structured pipeline: spec → plan → tasks → implement. This keeps the codebase consistent and makes it easy to onboard new contributors.

New features start from `0001` onwards.

### Step 0 — Install Spec Kit (once)

```bash
uv tool install specify-cli --from git+https://github.com/github/spec-kit.git
```

Verify it worked:

```bash
specify check
```

### Step 1 — Open Claude Code in the project root

```bash
claude
```

You should see `/speckit.constitution`, `/speckit.specify`, `/speckit.plan`, `/speckit.tasks`, and `/speckit.implement` available as slash commands.

### Step 2 — Write the spec

Use `/speckit.specify` to describe **what** you want to build and **why**. Do not talk about the tech stack here — just the user-facing behaviour.

```
/speckit.specify
Add a document version history panel. Users with Editor or Owner role can
open a side panel that lists all snapshots of the document — both auto-snapshots
and manual ones. Clicking a snapshot shows a read-only preview of the document
at that point in time. Users can restore from any snapshot, which replaces the
current document content after a confirmation dialog. They can also name or
rename a snapshot from this panel.
```

Speckit will create a new directory under `.specify/specs/` with an auto-incremented number, e.g. `.specify/specs/0002-version-history/spec.md`.

> Always check the generated `spec.md` before moving on. Push back on Claude Code if anything is missing or over-specified.

### Step 3 — Clarify before planning

Run the structured clarification pass to surface ambiguities before they become code problems:

```
/speckit.clarify
```

Claude Code will ask targeted questions about the spec. Answer them in the chat — the answers get saved into a Clarifications section in `spec.md`.

### Step 4 — Create the technical plan

Now describe the tech approach. Reference the existing stack and patterns:

```
/speckit.plan
Use the existing Supabase `snapshots` table. The side panel should use
a React Router fetcher to load snapshots without a full page reload.
Preview mode should render the Yjs snapshot JSON in a read-only Tiptap
instance. Restore action is a React Router action that writes a new Yjs
state to the live document. Follow existing patterns in
app/components/modals and app/lib/supabase.server.ts.
```

This produces `plan.md`, `research.md`, and any API contracts under the feature directory.

Check `research.md` if the feature involves any third-party library or pattern you haven't used before. Ask Claude Code to research specific unknowns before planning.

### Step 5 — Generate the task list

```
/speckit.tasks
```

This produces `tasks.md` — a sequenced list of atomic implementation tasks with file paths, dependency ordering, and parallel execution markers (`[P]`). Review it and ask Claude Code to adjust scope if tasks look too large or too granular.

### Step 6 — Implement

```
/speckit.implement
```

Claude Code works through `tasks.md` top to bottom. It will run `npm run typecheck` and any existing tests as checkpoints. Watch the output and intervene if it goes off-track.

After implementation, run:

```bash
make check           # typecheck + lint
npm test             # unit tests (Vitest)
npm run test:e2e     # E2E tests (Playwright)
```

Fix any errors before opening a PR.

---

## Conventions to Follow When Speccing New Features

These come from `constitution.md` and must be respected in every spec and plan:

- **No new npm dependencies without justification.** If a feature needs a library not already in `package.json`, the plan must explain why and what was ruled out.
- **RLS first.** Every new database table needs a Row-Level Security policy defined in the plan before any application code is written.
- **React Router loaders and actions for all data fetching.** No client-side `fetch` calls to Supabase except for the Yjs real-time channel.
- **Tailwind only.** No inline styles, no new CSS files, no styled-components. Custom OKLCH color theme defined in `app/app.css`.
- **TypeScript strict.** No `any`, no non-null assertions (`!`) without a comment explaining why.
- **English only.** All code, comments, database columns, and spec documents are in English.

---

## Feature Spec Index

| # | Feature | Status |
|---|---|---|
| — | _No specs yet — use `/speckit.specify` to create the first one_ | — |

Update this table when you add a new spec.

---

## Deployment

Downtex self-hosts on a VPS via [Coolify](https://coolify.io/). Pushes to `main` trigger a GitHub Actions pipeline that builds the Docker image and signals Coolify to redeploy.

```bash
# Build the Docker image locally to check for issues
docker build -t downtex .

# Run locally against your .env
docker run --env-file .env -p 3000:3000 downtex
```

See `.github/workflows/ci.yml` for the full CI pipeline.

---

## Contributing

1. Open an issue describing the feature or bug
2. Follow the speckit workflow above — every feature needs a spec before code
3. Open a PR from your feature branch (`0002-feature-name`) to `main`
4. Include a link to the spec directory in the PR description
