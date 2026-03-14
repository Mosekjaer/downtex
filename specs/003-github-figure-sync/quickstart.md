# Quickstart: GitHub Figure Sync & Auto-Numbering

**Branch**: `003-github-figure-sync` | **Date**: 2026-03-14

## Prerequisites

- Local Supabase running (`make supabase-start`)
- Dev server (`make dev`)
- GitHub OAuth app configured (existing `GITHUB_CLIENT_ID` / `GITHUB_CLIENT_SECRET`)
- `GITHUB_SERVICE_TOKEN` env var set (personal access token for background polling)

## Implementation Order

### Phase A: Foundation (Database + Auth Token Capture)

1. **Migration: workspace_repositories table**
   - New table + RLS policies + index on workspace_id
   - File: `supabase/migrations/009_workspace_repositories.sql`

2. **Migration: figures table extensions**
   - Add columns: `workspace_repository_id`, `cached_image_path`, `cached_image_format`, `file_type`
   - File: `supabase/migrations/010_figures_caching.sql`

3. **Migration: figures storage bucket**
   - Create `figures` bucket with RLS
   - File: `supabase/migrations/011_figures_storage.sql`

4. **Auth callback: capture GitHub token**
   - Update `_auth.callback.tsx` to extract `provider_token` and encrypt/store
   - Add `getUserGitHubToken()` utility to `github.server.ts`

**Verify**: `make db-reset && make check`

### Phase B: Workspace Repository Connection UI

5. **Workspace settings: connect/disconnect repos**
   - Add "Connected Repositories" section to `_app.workspace.$wid.settings.tsx`
   - Actions: `connect-repo`, `disconnect-repo`
   - Validate repo access using user's GitHub token

6. **API route: repository file browser**
   - New route: `api.github-tree.$repoId.tsx`
   - Returns directory listing filtered to supported file types

**Verify**: Connect a repo in workspace settings, browse via API route

### Phase C: Figure Insertion from Browser

7. **FigurePicker: enable "Browse repos" tab**
   - List connected repos, navigate file tree, select files
   - Pass `fileType` and `workspaceRepositoryId` on insert

8. **Figure extension: static image rendering**
   - Replace iframe with `<img src={svgUrl || imageUrl}>` when available
   - Keep placeholder/loading state while image is being cached

**Verify**: Insert a .drawio and a .png figure, both render in editor

### Phase D: Server-Side Rendering + Caching

9. **Render API route: `api.render-figure.$figureId.tsx`**
   - Fetch file from GitHub
   - .drawio: convert to SVG using Puppeteer + mxGraph viewer
   - Images: download and store directly
   - Upload to Supabase Storage `figures/` bucket
   - Update `figures.cached_image_path`

10. **Trigger rendering on insert**
    - After `insert-figure` action, call render endpoint asynchronously

11. **Supabase Realtime subscription**
    - Editor subscribes to `figures` table changes for current document
    - Updates figure node attributes when `cached_image_path` changes

**Verify**: Insert figure → see loading state → image appears after render completes

### Phase E: Sync Polling

12. **Extend poll-figures edge function**
    - Query workspace_repositories for active connections
    - On SHA change: call render API to re-cache
    - Update repo status on access errors

**Verify**: Change file in GitHub → wait ≤5 min → figure updates in editor

### Phase F: Auto-Numbering

13. **Tiptap plugin: figure numbering**
    - ProseMirror plugin that walks document, assigns sequential numbers
    - Figure NodeView reads decoration to display "Figur N: caption"

14. **PDF export: figure numbering**
    - Update `pdf-template.server.ts` to maintain figure counter
    - Prefix each figure caption with "Figur N:"

**Verify**: Insert 3 figures → numbers are 1, 2, 3 → remove middle → renumbers to 1, 2

### Phase G: Cross-References (P3)

15. **figure-reference extension**
    - Inline node: `targetFigureId`, `targetCaption`
    - Renders as "Figur N" with dynamic number resolution
    - Picker UI to select from document's figures

16. **PDF export: figure references**
    - Resolve figure references to correct numbers in HTML output

**Verify**: Insert reference → shows correct number → reorder figures → reference updates

## Key Files to Modify

| File | Changes |
|------|---------|
| `supabase/migrations/009-011` | New tables, columns, storage bucket |
| `app/routes/_auth.callback.tsx` | Capture GitHub provider_token |
| `app/lib/github.server.ts` | Add `getUserGitHubToken()`, repo tree listing |
| `app/routes/_app.workspace.$wid.settings.tsx` | Repository connection UI |
| `app/routes/api.github-tree.$repoId.tsx` | New: file browser API |
| `app/routes/api.render-figure.$figureId.tsx` | New: figure rendering API |
| `app/components/modals/FigurePicker.tsx` | Enable repo browsing tab |
| `app/components/editor/extensions/figure.ts` | Static image rendering, numbering |
| `app/components/editor/extensions/figure-reference.ts` | New: cross-reference node |
| `app/lib/pdf-template.server.ts` | Figure numbering + reference resolution |
| `supabase/functions/poll-figures/index.ts` | Extend for workspace repos + re-render trigger |
