# Implementation Plan: Downtex — Collaborative Academic Document Editor

**Branch**: `001-collab-academic-editor` | **Date**: 2026-03-12 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/001-collab-academic-editor/spec.md`

## Summary

Build a web-based collaborative academic document editor using Remix, Tiptap, Yjs, and Supabase. The application provides real-time multi-user editing with CRDT conflict resolution, a rich text editor with academic block types (math, code, tables, draw.io figures), and server-side PDF export producing university report–style output with auto-numbered sections, figures, tables, and footnotes. Supabase handles auth (GitHub/Google OAuth), PostgreSQL storage with RLS, real-time WebSocket channels, file storage, and edge functions for scheduled jobs.

## Technical Context

**Language/Version**: TypeScript 5.x (strict mode), Node.js 20 LTS
**Primary Dependencies**: Remix v2, Tiptap (ProseMirror), Yjs, Supabase JS SDK, KaTeX, Tailwind CSS, Puppeteer
**Storage**: Supabase PostgreSQL (RLS on all tables), Supabase Storage (snapshots, PDFs)
**Testing**: Vitest (unit), Playwright (E2E)
**Target Platform**: Self-hosted Linux VPS via Coolify (Docker), Nginx reverse proxy
**Project Type**: Web application (full-stack, single Remix project)
**Performance Goals**: <100ms real-time sync latency, <3s editor load, 60fps typing/scrolling, deterministic PDF export
**Constraints**: All data access server-side via Remix loaders/actions (except Yjs sync), RLS on every table, no inline styles, no `any` types
**Scale/Scope**: University student teams (1–20 concurrent editors per document), documents up to 100 pages with 50 figures

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| # | Principle | Status | Notes |
|---|-----------|--------|-------|
| I | Simplicity Over Features | PASS | All features directly serve academic writing, formatting, collaboration, or export |
| II | Real-Time First | PASS | Yjs CRDT is the document state foundation; all data models account for multi-user |
| III | Reliability and Data Safety | PASS | Continuous auto-save (<2s debounce), daily automatic snapshots, manual snapshots, restore flow |
| IV | Performance | PASS | Targets defined: <100ms sync, <3s load, 60fps, bundle monitoring |
| V | Academic Export Quality | PASS | Server-side Puppeteer PDF with auto-numbered sections/figures/tables/footnotes/equations, deterministic output |
| VI | Security and Privacy | PASS | RLS on every table, GitHub tokens encrypted, service role key server-only, authorization checked at DB layer |
| VII | Code Quality Standards | PASS | TypeScript strict, Remix loaders/actions for server logic, Zod env validation, Tailwind only, no console.log |
| VIII | Accessibility | PASS | Keyboard-navigable editor (Tiptap supports this), WCAG AA contrast, visible focus states, progressive enhancement for public views |
| IX | English Only | PASS | All UI, code, comments, DB columns, and docs in English |
| X | Design System Consistency | PASS | Custom design token system via Tailwind config, Inter + Georgia fonts, consistent spacing/color/radius tokens |

All gates pass. No violations to track.

## Project Structure

### Documentation (this feature)

```text
specs/001-collab-academic-editor/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/           # Phase 1 output
│   ├── api-routes.md
│   └── realtime-channels.md
└── tasks.md             # Phase 2 output (/speckit.tasks command)
```

### Source Code (repository root)

```text
app/
├── routes/
│   ├── _auth.login.tsx
│   ├── _auth.callback.tsx
│   ├── _app.tsx
│   ├── _app._index.tsx
│   ├── _app.workspace.$wid.tsx
│   ├── _app.workspace.$wid.$docId.tsx
│   ├── _app.workspace.$wid.settings.tsx
│   ├── _app.settings.tsx
│   ├── share.$token.tsx
│   ├── render.$docId.tsx
│   ├── api.export.$docId.tsx
│   ├── api.snapshot.$docId.tsx
│   └── api.figures.poll.tsx
├── components/
│   ├── editor/
│   │   ├── Editor.tsx
│   │   ├── extensions/
│   │   │   ├── math-inline.ts
│   │   │   ├── math-block.ts
│   │   │   ├── footnote.ts
│   │   │   ├── figure.ts
│   │   │   ├── document-mention.ts
│   │   │   └── section-reference.ts
│   │   ├── toolbar/
│   │   └── renderers/
│   ├── sidebar/
│   │   ├── FolderTree.tsx
│   │   ├── WorkspaceSwitcher.tsx
│   │   └── SearchBar.tsx
│   ├── presence/
│   │   ├── Cursors.tsx
│   │   └── AvatarBar.tsx
│   ├── comments/
│   │   ├── CommentsSidebar.tsx
│   │   ├── CommentThread.tsx
│   │   └── ResolvedPanel.tsx
│   ├── modals/
│   │   ├── FigurePicker.tsx
│   │   ├── ShareModal.tsx
│   │   └── VersionHistory.tsx
│   └── ui/
│       ├── Button.tsx
│       ├── Input.tsx
│       ├── Modal.tsx
│       ├── Dropdown.tsx
│       └── Avatar.tsx
├── lib/
│   ├── env.server.ts
│   ├── supabase.server.ts
│   ├── supabase.client.ts
│   ├── yjs.ts
│   ├── yjs-supabase-provider.ts
│   ├── pdf.server.ts
│   ├── pdf-template.server.ts
│   ├── github.server.ts
│   ├── crypto.server.ts
│   ├── permissions.server.ts
│   └── drawio.server.ts
├── styles/
│   └── pdf-export.css
└── root.tsx

supabase/
├── migrations/
│   ├── 001_users.sql
│   ├── 002_workspaces.sql
│   ├── 003_folders_documents.sql
│   ├── 004_collaborators_sharing.sql
│   ├── 005_comments.sql
│   ├── 006_figures.sql
│   ├── 007_snapshots.sql
│   └── 008_rls_policies.sql
├── functions/
│   ├── daily-snapshots/
│   │   └── index.ts
│   └── poll-figures/
│       └── index.ts
└── seed.sql

tests/
├── unit/
│   ├── crypto.test.ts
│   ├── drawio.test.ts
│   ├── pdf-template.test.ts
│   └── permissions.test.ts
└── e2e/
    ├── auth.spec.ts
    ├── editor.spec.ts
    ├── collaboration.spec.ts
    └── export.spec.ts

tailwind.config.ts
tsconfig.json
Dockerfile
docker-compose.yml
.github/workflows/ci.yml
```

**Structure Decision**: Single Remix project (not a monorepo). The app is a full-stack web application where Remix handles both server and client. Supabase edge functions live in `supabase/functions/` as a separate deploy target. This keeps complexity minimal per Constitution Principle I.

## Complexity Tracking

> No violations detected. All gates pass.

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| — | — | — |
