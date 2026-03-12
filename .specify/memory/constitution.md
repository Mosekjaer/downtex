<!--
  Sync Impact Report
  ===================
  Version change: [TEMPLATE] → 1.0.0
  Modified principles: N/A (initial adoption)
  Added sections:
    - 10 Core Principles (I–X)
    - Technology & Constraints
    - Development Workflow
    - Governance
  Removed sections: None
  Templates requiring updates:
    - .specify/templates/plan-template.md — ✅ no update needed (Constitution Check is dynamic)
    - .specify/templates/spec-template.md — ✅ no update needed (generic structure)
    - .specify/templates/tasks-template.md — ✅ no update needed (generic structure)
  Follow-up TODOs: None
-->

# Downtex Constitution

## Core Principles

### I. Simplicity Over Features

Only include what university students actually need for academic writing.
Every feature MUST justify its existence before implementation.
No feature bloat — if a capability is not directly useful for writing,
formatting, collaborating on, or exporting academic documents, it does
not belong in the product.

The UI MUST feel calmer and more focused than Notion or Google Docs.
When in doubt, leave it out.

### II. Real-Time First

The entire architecture is designed around real-time collaboration.
Conflict-free editing via CRDT (Yjs) is not a feature — it is the
foundation. Every data model, API design, and UI decision MUST account
for multiple simultaneous users editing the same document.

- All document state MUST flow through Yjs.
- Optimistic UI updates are the default; server round-trips MUST NOT
  block the editing experience.
- Offline edits MUST sync cleanly when connectivity resumes.

### III. Reliability and Data Safety

Student work MUST never be lost.

- Auto-save is continuous and silent — no manual save action exists.
- Daily named snapshots are created automatically.
- Backup and restore flows MUST be simple, discoverable, and
  trustworthy.
- Any operation that could destroy data MUST require explicit
  confirmation.

### IV. Performance

- Document loading MUST be fast even for large documents with embedded
  figures.
- Real-time sync latency MUST be imperceptible (<100ms under normal
  conditions).
- The editor MUST never feel sluggish — rendering, scrolling, and
  typing MUST maintain 60fps.
- Bundle size MUST be monitored and kept minimal.

### V. Academic Export Quality

The PDF export is the final deliverable. It MUST look like a
professional university report.

- Automatic numbering of figures, tables, footnotes, headings, and
  pages MUST be correct and deterministic.
- The export engine MUST produce pixel-perfect, reproducible output
  given the same document content.
- Export MUST work reliably regardless of document length or figure
  count.

### VI. Security and Privacy

Documents may contain unpublished research. Security is non-negotiable.

- Row-level security (RLS) via Supabase MUST be enforced on every
  database table. No exceptions.
- No document content is ever exposed to unauthorized users — including
  via public API routes, error messages, or logs.
- GitHub tokens MUST be stored encrypted and MUST never appear in logs,
  error messages, or client-side code.
- All API endpoints MUST validate authorization before accessing data.
  Application-level checks alone are insufficient — RLS is the security
  boundary.

### VII. Code Quality Standards

- TypeScript strict mode everywhere — no `any`, no type assertions
  without written justification in a comment.
- All server-side logic goes in Remix loaders and actions — no
  client-side data fetching except for real-time Yjs sync.
- Supabase RLS policies are the security boundary — MUST NOT rely
  solely on application-level checks.
- All environment variables MUST be validated at startup using Zod.
  The app MUST fail fast on missing or invalid config.
- No inline styles — Tailwind utility classes only.
- Components MUST be small, single-responsibility, and composable.
- No `console.log` in committed code — use structured logging.

### VIII. Accessibility

- The editor MUST be fully keyboard-navigable.
- Color contrast MUST meet WCAG AA (minimum 4.5:1 for normal text).
- Focus states MUST be visible on all interactive elements.
- The app MUST work without JavaScript for read-only document views
  (progressive enhancement).
- ARIA labels MUST be present on all non-text interactive elements.

### IX. English Only

- The UI is in English.
- All code, comments, variable names, database column names, commit
  messages, and documentation MUST be in English.
- No i18n infrastructure is required unless explicitly scoped in a
  future amendment.

### X. Design System Consistency

All UI components MUST follow a single, cohesive design system.

- No one-off styles. Every visual decision MUST reference defined
  design tokens.
- Spacing, typography, color, and motion MUST follow the token system.
- The visual language is inspired by Linear, Vercel, and Notion —
  minimal, precise, intentional.
- New components MUST be reviewed for design system compliance before
  merge.

## Technology & Constraints

- **Framework**: Remix (React) with TypeScript in strict mode
- **Real-Time**: Yjs CRDT for collaborative editing
- **Database**: Supabase (PostgreSQL) with mandatory RLS on all tables
- **Styling**: Tailwind CSS — no inline styles, no CSS modules
- **Auth**: Supabase Auth
- **Storage**: Supabase Storage for document assets; GitHub integration
  for draw.io figures
- **Export**: Server-side PDF generation producing university report
  format
- **Validation**: Zod for environment variables and all external input
- **Deployment**: Target platform to be determined per feature spec

## Development Workflow

- All server-side data access goes through Remix loaders/actions.
- Client-side fetching is prohibited except for Yjs real-time sync.
- Every database table MUST have RLS policies before any application
  code references it.
- Environment variables MUST be validated via Zod at application
  startup.
- Components MUST be small and single-responsibility. If a component
  exceeds ~150 lines, it SHOULD be decomposed.
- Pull requests MUST pass linting, type-checking, and tests before
  merge.
- Commit messages follow Conventional Commits format.

## Governance

This constitution is the highest-authority document for the Downtex
project. All design decisions, code reviews, and feature proposals
MUST be evaluated against these principles.

**Amendment procedure**:

1. Propose the change with rationale in a pull request modifying this
   file.
2. The change MUST include a Sync Impact Report (HTML comment at top)
   documenting version bump, affected principles, and template updates.
3. Version increments follow semantic versioning:
   - MAJOR: Principle removal or backward-incompatible redefinition.
   - MINOR: New principle added or existing principle materially
     expanded.
   - PATCH: Clarifications, wording fixes, non-semantic refinements.

**Compliance review**:

- Every pull request MUST be checked against applicable principles.
- The plan template's "Constitution Check" gate MUST reference the
  current version of this document.
- Violations MUST be documented and justified in the Complexity
  Tracking table (see plan template) or resolved before merge.

**Version**: 1.0.0 | **Ratified**: 2026-03-12 | **Last Amended**: 2026-03-12
