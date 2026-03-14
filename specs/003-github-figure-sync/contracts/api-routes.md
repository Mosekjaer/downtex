# API Route Contracts: GitHub Figure Sync

**Branch**: `003-github-figure-sync` | **Date**: 2026-03-14

## Workspace Repository Management

### POST _app.workspace.$wid.settings (action: connect-repo)

Connect a GitHub repository to a workspace.

**Request** (FormData):
```
intent: "connect-repo"
githubRepo: "owner/repo"  // e.g., "frederik/my-diagrams"
```

**Response**:
- 200: Repository connected, redirects back to settings
- 400: Invalid repository format
- 403: User lacks editor/owner role
- 422: Repository not accessible with user's GitHub token

**Side effects**: Creates `workspace_repositories` row, validates repo access via GitHub API.

---

### POST _app.workspace.$wid.settings (action: disconnect-repo)

Disconnect a GitHub repository from a workspace.

**Request** (FormData):
```
intent: "disconnect-repo"
repoId: "<uuid>"  // workspace_repositories.id
```

**Response**:
- 200: Repository disconnected
- 403: User lacks editor/owner role
- 404: Repository connection not found

**Side effects**: Sets `workspace_repositories.status` to `disconnected`. Existing figures retain their cached images.

---

## Repository Browsing

### GET api.github-tree.$repoId

List the file tree of a connected repository (filtered to supported file types).

**URL params**:
- `repoId`: workspace_repositories.id

**Query params**:
- `path` (optional): Directory path to browse, defaults to root

**Response** (JSON):
```json
{
  "items": [
    { "name": "diagrams", "type": "dir", "path": "diagrams" },
    { "name": "arch.drawio", "type": "file", "path": "diagrams/arch.drawio", "sha": "abc123" },
    { "name": "logo.png", "type": "file", "path": "images/logo.png", "sha": "def456" }
  ]
}
```

**Filters**: Only returns directories and files matching supported extensions (png, jpg, jpeg, gif, svg, drawio).

**Auth**: Requires workspace membership. Uses the requesting user's GitHub token; falls back to service token.

---

## Figure Operations

### POST _app.workspace.$wid.$docId (action: insert-figure) — EXISTING, EXTENDED

Insert a figure from a connected repository.

**Request** (FormData):
```
intent: "insert-figure"
blockId: "<generated-uuid>"
githubRepo: "owner/repo"
githubPath: "path/to/file.drawio"
fileType: "drawio"  // NEW: drawio | png | jpg | jpeg | gif | svg
workspaceRepositoryId: "<uuid>"  // NEW: optional link to workspace_repositories
```

**Response**: 200 on success.

**Side effects**:
- Creates `figures` row with new `file_type` and `workspace_repository_id` fields
- Triggers async image caching (fetches file, converts if .drawio, uploads to Storage)

---

### POST api.render-figure.$figureId

Trigger server-side rendering/caching of a figure image. Called by the poll-figures edge function when a SHA change is detected, or on initial figure insertion.

**URL params**:
- `figureId`: figures.id

**Request** (JSON, service-role auth):
```json
{
  "githubRepo": "owner/repo",
  "githubPath": "path/to/file.drawio",
  "fileType": "drawio",
  "workspaceId": "<uuid>"
}
```

**Response**:
```json
{
  "cachedImagePath": "workspace-id/figure-id.svg",
  "cachedImageFormat": "svg",
  "publicUrl": "https://...supabase.co/storage/v1/object/figures/..."
}
```

**Side effects**:
- Fetches file from GitHub
- For .drawio: converts to SVG via Puppeteer + mxGraph renderer
- For images: downloads and stores as-is
- Uploads to Supabase Storage `figures/` bucket
- Updates `figures.cached_image_path` and `cached_image_format`

---

## Supabase Realtime

### figures table changes

The editor subscribes to Postgres changes on the `figures` table filtered by `document_id`. When `cached_image_path` or `status` changes (after sync), the client updates the figure node's `svgUrl`/`imageUrl` attribute.

**Channel**: `figures:document_id=eq.{docId}`
**Events**: UPDATE (columns: cached_image_path, cached_image_format, status, error_message)

---

## Edge Function Extensions

### poll-figures (existing — extended)

**New behavior**:
- Query `workspace_repositories` for active connections
- For each active repo, check all figures linked to that repo
- When SHA change detected: call `api.render-figure.$figureId` to re-render and cache
- Update `workspace_repositories.status` to 'error' if repo becomes inaccessible
