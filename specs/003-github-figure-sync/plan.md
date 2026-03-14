# Implementation Plan: GitHub Figure Sync & Auto-Numbering

**Branch**: `003-github-figure-sync` | **Date**: 2026-03-14 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `/specs/003-github-figure-sync/spec.md`

## Summary

Enable workspace-level GitHub repository connections so users can browse, insert, and auto-sync figures (images + .drawio diagrams) from GitHub into documents. All figures are cached as static images in Supabase Storage for fast rendering and reliable PDF export. Figures are automatically numbered "Figur N: caption" with dynamic renumbering and cross-references.

The feature builds on existing infrastructure: GitHub API utilities, the `figures` table with SHA polling, the Tiptap figure extension, and the section-reference extension pattern.

## Technical Context

**Language/Version**: TypeScript 5.x (strict mode)
**Primary Dependencies**: React 18, React Router 7 (SSR), Tiptap 3.20.1, Yjs, Supabase JS client, Puppeteer 24.x
**Storage**: Supabase PostgreSQL + Supabase Storage (new `figures` bucket)
**Testing**: Vitest (unit), Playwright (E2E)
**Target Platform**: Linux server (Docker), web browser clients
**Project Type**: Web application (SSR + real-time collaboration)
**Performance Goals**: Figure sync within 5 minutes of GitHub change; editor maintains 60fps with figures; figure rendering <10s per figure
**Constraints**: All data access via Remix loaders/actions; RLS on all tables; no client-side data fetching except Yjs sync; TypeScript strict mode
**Scale/Scope**: ~10 workspace repos, ~100 figures per workspace, ~50 concurrent users

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Notes |
|-----------|--------|-------|
| I. Simplicity Over Features | PASS | Figures are essential for academic documents. Repo connection eliminates manual URL pasting. Auto-numbering is a university report requirement. |
| II. Real-Time First | PASS | Figure updates flow through Yjs (node attributes) and Supabase Realtime (cache status). Numbering computed from CRDT document order. |
| III. Reliability and Data Safety | PASS | Cached images provide resilience against GitHub downtime. Last known version preserved on errors. No destructive operations. |
| IV. Performance | PASS | Static cached images load faster than iframe embeds. Rendering happens server-side asynchronously. Numbering plugin is lightweight document traversal. |
| V. Academic Export Quality | PASS | Figure numbering ("Figur N:") matches the spec. PDF uses cached static images. Numbering is deterministic and consistent. |
| VI. Security and Privacy | PASS | GitHub tokens encrypted with AES-256-GCM. RLS on all new tables. Storage bucket secured via RLS. Service token used for background ops. |
| VII. Code Quality Standards | PASS | All server logic in loaders/actions. RLS policies on workspace_repositories + figures storage. Zod validation on new env vars. |
| VIII. Accessibility | PASS | Figures render as `<img>` with alt text (caption). Figure references are semantic links. File browser is keyboard-navigable. |
| IX. English Only | PASS | All code/UI in English. "Figur" is the user-facing label (spec requirement for Danish academic format), not a code convention. |
| X. Design System Consistency | PASS | Figure picker follows existing modal pattern. Settings section follows existing workspace settings layout. |

**Pre-design gate: PASS** — no violations.

### Post-Phase 1 Re-check

| Principle | Status | Notes |
|-----------|--------|-------|
| VI. Security | PASS | RLS policies defined for workspace_repositories, figures storage bucket. Token encryption reuses existing crypto module. |
| VII. Code Quality | PASS | New API routes follow existing patterns. No client-side fetching — render API called server-side. |
| II. Real-Time | PASS | Supabase Realtime subscription on figures table updates editor nodes when cached images change. |

**Post-design gate: PASS** — no violations.

## Project Structure

### Documentation (this feature)

```text
specs/003-github-figure-sync/
├── plan.md              # This file
├── research.md          # Phase 0: technical decisions
├── data-model.md        # Phase 1: entity schemas
├── quickstart.md        # Phase 1: implementation guide
├── contracts/           # Phase 1: API route contracts
│   └── api-routes.md
├── checklists/
│   └── requirements.md  # Spec quality checklist
└── tasks.md             # Phase 2 output (/speckit.tasks)
```

### Source Code (repository root)

```text
supabase/
├── migrations/
│   ├── 009_workspace_repositories.sql    # New table + RLS
│   ├── 010_figures_caching.sql           # Extend figures table
│   └── 011_figures_storage.sql           # Storage bucket + RLS
└── functions/
    └── poll-figures/index.ts             # Extended: workspace repos + render trigger

app/
├── routes/
│   ├── _auth.callback.tsx                # Modified: capture GitHub token
│   ├── _app.workspace.$wid.settings.tsx  # Modified: repo connection UI
│   ├── _app.workspace.$wid.$docId.tsx    # Modified: extended insert-figure action
│   ├── api.github-tree.$repoId.tsx       # New: repo file browser
│   └── api.render-figure.$figureId.tsx   # New: figure rendering endpoint
├── components/
│   ├── modals/
│   │   └── FigurePicker.tsx              # Modified: repo browsing tab
│   └── editor/
│       ├── extensions/
│       │   ├── figure.ts                 # Modified: static image rendering
│       │   └── figure-reference.ts       # New: cross-reference node
│       ├── node-views/
│       │   └── FigureView.tsx            # New: React NodeView for figures
│       └── renderers/                    # Modified: figure numbering in export
├── lib/
│   ├── github.server.ts                  # Modified: token retrieval, tree listing
│   ├── drawio.server.ts                  # Modified: SVG conversion via Puppeteer
│   └── pdf-template.server.ts            # Modified: figure numbering + references

tests/
├── unit/
│   ├── figure-numbering.test.ts          # New
│   └── drawio.test.ts                    # Extended
└── e2e/
    └── figures.spec.ts                   # New
```

**Structure Decision**: Follows the existing React Router 7 web application structure. All new files integrate into existing directories. No new top-level directories needed.

## Complexity Tracking

> No constitution violations — this section is empty.
