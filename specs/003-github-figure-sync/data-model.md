# Data Model: GitHub Figure Sync & Auto-Numbering

**Branch**: `003-github-figure-sync` | **Date**: 2026-03-14

## New Entities

### workspace_repositories

Links a workspace to a GitHub repository for figure browsing and sync.

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| id | uuid | PK, default gen_random_uuid() | Unique identifier |
| workspace_id | uuid | FK → workspaces(id) ON DELETE CASCADE, NOT NULL | Owning workspace |
| github_repo | text | NOT NULL | Repository in `owner/repo` format |
| display_name | text | NOT NULL | Human-readable repo name (e.g., "my-diagrams") |
| connected_by | uuid | FK → users(id), NOT NULL | User who added the connection |
| status | text | NOT NULL, default 'active', CHECK IN ('active', 'error', 'disconnected') | Connection health |
| error_message | text | | Last error if status is 'error' |
| created_at | timestamptz | NOT NULL, default now() | When connected |
| updated_at | timestamptz | NOT NULL, default now() | Last status change |

**Uniqueness**: UNIQUE(workspace_id, github_repo) — a repo can only be connected once per workspace.

**RLS Policies**:
- SELECT: workspace members (any role)
- INSERT: workspace editors and owners
- UPDATE: workspace editors and owners
- DELETE: workspace editors and owners

---

## Modified Entities

### figures (existing — extended)

New columns added to the existing `figures` table from migration 006.

| New Field | Type | Constraints | Description |
|-----------|------|-------------|-------------|
| workspace_repository_id | uuid | FK → workspace_repositories(id) ON DELETE SET NULL | Link to workspace-level repo connection (nullable for backwards compat with existing figures) |
| cached_image_path | text | | Path in Supabase Storage bucket `figures/` (e.g., `{workspace_id}/{figure_id}.svg`) |
| cached_image_format | text | CHECK IN ('svg', 'png') | Format of the cached image |
| file_type | text | NOT NULL, default 'drawio', CHECK IN ('drawio', 'png', 'jpg', 'jpeg', 'gif', 'svg') | Source file type |

**Existing columns** (unchanged):
- id, document_id, block_id, github_repo, github_path, last_sha, caption, status, error_message, updated_at

---

### users (existing — no schema change)

The `github_token_encrypted` (bytea) column already exists but is not currently populated. The auth callback will be updated to capture and encrypt the GitHub OAuth access token into this field.

---

## New Storage

### Supabase Storage Bucket: `figures`

- **Purpose**: Cache rendered figure images (SVG/PNG) for fast loading and PDF export
- **Path pattern**: `{workspace_id}/{figure_id}.{svg|png}`
- **Max file size**: 10MB (configured in bucket settings)
- **Public access**: No — accessed via signed URLs or RLS-protected download
- **RLS**: Read access for workspace members; write access via service role only

---

## Editor Node Attributes

### figure node (existing — extended)

New/changed Tiptap node attributes:

| Attribute | Type | Description |
|-----------|------|-------------|
| figureId | string | Unique ID (existing) |
| githubRepo | string | owner/repo (existing) |
| githubPath | string | File path in repo (existing) |
| caption | string | User-editable caption text (existing) |
| svgUrl | string | URL to cached SVG in Supabase Storage (existing attribute, now populated) |
| imageUrl | string | URL to cached image for non-drawio files (new) |
| fileType | string | Source file type: drawio, png, jpg, etc. (new) |

### figure-reference node (new)

Inline node for cross-referencing figures within document text.

| Attribute | Type | Description |
|-----------|------|-------------|
| targetFigureId | string | The `figureId` of the referenced figure node |
| targetCaption | string | Snapshot of caption for display in reference picker |

**Rendered text**: Dynamically computed as "Figur N" where N is the target figure's current sequential number.

---

## State Transitions

### workspace_repositories.status

```
active ──[GitHub access revoked/repo deleted]──→ error
active ──[user disconnects]──→ disconnected
error  ──[access restored + next poll]──→ active
disconnected ──[user reconnects same repo]──→ active
```

### figures.status (existing, unchanged)

```
active ──[file not found / API error]──→ error
error  ──[file restored / next successful poll]──→ active
```

---

## Entity Relationships

```
workspaces 1──* workspace_repositories
workspace_repositories 1──* figures (via workspace_repository_id, optional)
documents 1──* figures (via document_id, existing)
figures *──* figure-reference nodes (via figureId ↔ targetFigureId, in-document)
users 1──* workspace_repositories (via connected_by)
```
