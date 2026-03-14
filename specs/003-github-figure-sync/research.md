# Research: GitHub Figure Sync & Auto-Numbering

**Branch**: `003-github-figure-sync` | **Date**: 2026-03-14

## R1: .drawio to SVG/PNG Conversion

**Decision**: Use draw.io's export API via HTTP request from the server (Node.js API route), with Puppeteer as fallback for complex diagrams.

**Rationale**: The project already has Puppeteer in the Docker image for PDF export. However, draw.io provides a headless export endpoint that can convert `.drawio` XML to SVG/PNG without running a full browser. For self-hosted scenarios, `drawio-export` (Docker image) or the `@jgraph/mxgraph` library can parse the XML directly. The simplest MVP approach: fetch the `.drawio` XML from GitHub, load it into a Puppeteer page using the mxGraph renderer, and export as SVG.

**Alternatives considered**:
- Pure SVG generation from XML parsing: Too complex — `.drawio` format has hundreds of shape types and style properties. Would require reimplementing mxGraph rendering.
- draw.io desktop CLI (`drawio --export`): Requires installing draw.io desktop in Docker — heavy dependency (~400MB).
- Client-side conversion: Violates the clarification decision (server-side caching). Would also block PDF export.
- **draw.io embed + screenshot**: Load `viewer.diagrams.net` in Puppeteer, screenshot the rendered diagram. Simple but depends on external service.

**Chosen approach for MVP**: Load `.drawio` XML into a Puppeteer page using the open-source mxGraph/draw.io viewer HTML, then export the rendered SVG element. This keeps everything self-contained and reuses the existing Puppeteer infrastructure.

## R2: GitHub OAuth Token Flow

**Decision**: Capture and store the GitHub OAuth access token during the callback flow, encrypted in the existing `users.github_token_encrypted` column.

**Rationale**: The database schema already has a `github_token_encrypted` (bytea) column on the `users` table and the `crypto.server.ts` module provides AES-256-GCM encryption. The current OAuth callback (`_auth.callback.tsx`) exchanges the code for a Supabase session but does **not** yet capture the GitHub access token. This needs to be added by accessing `session.provider_token` from the Supabase auth response.

**Current state**:
- `users.github_token_encrypted` column exists but is never populated
- `crypto.server.ts` has `encrypt()` and `decrypt()` ready
- `github.server.ts` functions accept a `token` parameter but no code retrieves it from DB
- `GITHUB_SERVICE_TOKEN` env var exists for background polling (separate from user tokens)

**What needs to change**:
- Auth callback: capture `provider_token` and encrypt/store it
- New server utility: `getUserGitHubToken(supabase, userId)` to decrypt and return token
- Figure picker: use user's token for repo browsing; fall back to service token if expired

## R3: Supabase Storage for Cached Images

**Decision**: Create a `figures` Supabase Storage bucket for caching rendered figure images (SVG/PNG).

**Rationale**: No storage buckets are currently configured. Supabase Storage is enabled in `config.toml` with a 50MiB default file size limit. The cached images need to be accessible by all workspace members who can view the document.

**Storage design**:
- Bucket name: `figures`
- Path pattern: `{workspace_id}/{figure_id}.{ext}` (SVG or PNG)
- Access: RLS policy allowing read access to workspace members, write access via service role only (server-side upload)
- Cleanup: Delete cached image when figure row is deleted (cascade or trigger)

## R4: Figure Node Extension Refactor

**Decision**: Replace the current iframe-based rendering with a static `<img>` tag pointing to the cached Supabase Storage URL.

**Rationale**: The current `figure.ts` extension renders an iframe embedding `viewer.diagrams.net`. Per clarification, all figures (including .drawio) should render as cached static images. The extension already has an unused `svgUrl` attribute — this will become the primary render source.

**What changes**:
- `figure.ts`: Render `<img src={svgUrl}>` instead of iframe when `svgUrl` is set
- Keep iframe as temporary fallback only during the transition (until first sync populates `svgUrl`)
- Add `imageUrl` attribute alongside `svgUrl` for standard images (PNG/JPG/GIF)
- Subscribe to Supabase Realtime on `figures` table to update `svgUrl` when sync completes (existing TODO T076)

## R5: Figure Auto-Numbering Strategy

**Decision**: Compute figure numbers dynamically in the editor via a Tiptap plugin that traverses the document, and in PDF export via the HTML renderer.

**Rationale**: Figure numbers must not be stored in the document (they're derived from position). A ProseMirror plugin can decorate each figure node with its sequential number. This is the same pattern used by academic typesetting systems — numbers are computed at render time.

**Implementation**:
- Editor: Tiptap plugin that listens to document changes, walks all figure nodes in order, and sets a decoration with the computed number. The figure NodeView reads the decoration to display "Figur N: caption".
- PDF: The `pdf-template.server.ts` renderer walks nodes sequentially and maintains a counter, prefixing each figure caption with "Figur N:".
- Collaborative: Yjs CRDT ensures all clients see the same document order, so numbering is deterministic.

## R6: Figure Cross-Reference Extension

**Decision**: Create a `figure-reference` inline node extension modeled on the existing `section-reference` extension.

**Rationale**: The `section-reference.ts` extension is a proven pattern — inline node with `targetId`, display text, and link behavior. A `figure-reference` would store `targetFigureId` (the `figureId` attribute of the target figure node) and dynamically resolve to "Figur N" based on the current numbering.

**Attributes**: `targetFigureId`, `targetCaption` (for display in picker), computed display text "Figur N".

## R7: Workspace Repository Connection

**Decision**: New `workspace_repositories` database table linking workspaces to GitHub repositories.

**Rationale**: Currently, figures are inserted per-document with manual URL pasting. The spec requires workspace-level repository connections that all documents can browse. This is a new entity not covered by the existing `figures` table.

**Design**: See data-model.md for full schema.
