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
│   └── lib/                  # Server utilities
├── supabase/
│   └── migrations/           # Database migrations
├── Makefile
├── Dockerfile
├── docker-compose.yml
└── README.md
```

---

## Deployment

Downtex self-hosts on a VPS via [Coolify](https://coolify.io/).

```bash
# Build the Docker image locally
make docker-build

# Start all services locally (app + postgres)
make docker-up
```
