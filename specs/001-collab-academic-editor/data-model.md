# Data Model: Downtex

**Branch**: `001-collab-academic-editor`
**Date**: 2026-03-12

## Entity Relationship Overview

```text
User 1──* WorkspaceMember *──1 Workspace
User 1──1 Workspace (personal)
Workspace 1──* Folder
Folder 1──* Folder (self-referencing, parent)
Folder 1──* Document
Document 1──* DocumentCollaborator *──1 User
Document 1──0..1 DocumentPublicLink
Document 1──* CommentThread
CommentThread 1──* Comment
Document 1──* Figure
Document 1──* DocumentSnapshot
```

## Tables

### users

Synced from Supabase Auth. Extended with application-specific fields.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | uuid | PK, FK → auth.users.id | Supabase Auth user ID |
| display_name | text | NOT NULL | From OAuth provider, user-editable |
| avatar_url | text | | From OAuth provider, user-editable |
| github_token_encrypted | bytea | | AES-256-GCM encrypted GitHub access token |
| notification_email_comments | boolean | NOT NULL DEFAULT true | Email on new comment |
| created_at | timestamptz | NOT NULL DEFAULT now() | |
| updated_at | timestamptz | NOT NULL DEFAULT now() | |

**Trigger**: `on_auth_user_created` — inserts a row in `users` and creates a personal workspace when a new auth user is created.

### workspaces

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | uuid | PK DEFAULT gen_random_uuid() | |
| name | text | NOT NULL | Workspace display name |
| avatar_url | text | | |
| owner_id | uuid | NOT NULL, FK → users.id | Creator / primary owner |
| type | text | NOT NULL CHECK (type IN ('personal', 'team')) | |
| created_at | timestamptz | NOT NULL DEFAULT now() | |

**Invariant**: Each user has exactly one workspace where `type = 'personal'` and `owner_id = user.id`.

### workspace_members

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| workspace_id | uuid | PK (composite), FK → workspaces.id ON DELETE CASCADE | |
| user_id | uuid | PK (composite), FK → users.id ON DELETE CASCADE | |
| role | text | NOT NULL CHECK (role IN ('owner', 'editor', 'commenter', 'viewer')) | |
| created_at | timestamptz | NOT NULL DEFAULT now() | |

**Invariant**: The workspace owner always has a member row with `role = 'owner'`. Personal workspaces have exactly one member (the owner).

### folders

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | uuid | PK DEFAULT gen_random_uuid() | |
| workspace_id | uuid | NOT NULL, FK → workspaces.id ON DELETE CASCADE | |
| parent_folder_id | uuid | FK → folders.id ON DELETE CASCADE, nullable | NULL = root-level folder |
| name | text | NOT NULL | |
| sort_order | integer | NOT NULL DEFAULT 0 | For drag-and-drop ordering |
| created_by | uuid | NOT NULL, FK → users.id | |
| created_at | timestamptz | NOT NULL DEFAULT now() | |

**Index**: `(workspace_id, parent_folder_id)` for folder tree queries.

### documents

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | uuid | PK DEFAULT gen_random_uuid() | |
| folder_id | uuid | NOT NULL, FK → folders.id ON DELETE CASCADE | |
| workspace_id | uuid | NOT NULL, FK → workspaces.id ON DELETE CASCADE | Denormalized for RLS performance |
| title | text | NOT NULL DEFAULT 'Untitled' | |
| yjs_state | bytea | | Full Yjs binary state vector |
| created_by | uuid | NOT NULL, FK → users.id | |
| created_at | timestamptz | NOT NULL DEFAULT now() | |
| updated_at | timestamptz | NOT NULL DEFAULT now() | |

**Note**: `workspace_id` is denormalized (derivable from `folder.workspace_id`) to avoid joins in RLS policies, which must be fast.

### document_collaborators

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| document_id | uuid | PK (composite), FK → documents.id ON DELETE CASCADE | |
| user_id | uuid | PK (composite), FK → users.id ON DELETE CASCADE | |
| role | text | NOT NULL CHECK (role IN ('owner', 'editor', 'commenter', 'viewer')) | |
| created_at | timestamptz | NOT NULL DEFAULT now() | |

**Behavior**: Document-level role overrides workspace-level role. The effective role is `MAX(workspace_role, document_role)` where owner > editor > commenter > viewer.

### document_public_links

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| document_id | uuid | PK, FK → documents.id ON DELETE CASCADE | One link per document |
| token | uuid | NOT NULL UNIQUE DEFAULT gen_random_uuid() | URL-safe token |
| created_at | timestamptz | NOT NULL DEFAULT now() | |

### document_snapshots

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | uuid | PK DEFAULT gen_random_uuid() | |
| document_id | uuid | NOT NULL, FK → documents.id ON DELETE CASCADE | |
| label | text | NOT NULL | e.g. "Auto-snapshot · 2026-03-12, 03:00" or user-provided name |
| content_json | jsonb | NOT NULL | Full document content as JSON (decoded from Yjs) |
| type | text | NOT NULL CHECK (type IN ('automatic', 'manual')) | |
| created_by | uuid | FK → users.id | NULL for automatic snapshots |
| created_at | timestamptz | NOT NULL DEFAULT now() | |

**Index**: `(document_id, created_at DESC)` for version history listing.

### comments

Comment threads anchored to text ranges.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | uuid | PK DEFAULT gen_random_uuid() | |
| document_id | uuid | NOT NULL, FK → documents.id ON DELETE CASCADE | |
| user_id | uuid | NOT NULL, FK → users.id | Thread creator |
| anchor_yjs_relative | bytea | NOT NULL | Yjs relative position (start of anchor) |
| anchor_text_preview | text | NOT NULL | First 100 chars of anchored text (for display if anchor breaks) |
| body | text | NOT NULL | Initial comment text |
| resolved_at | timestamptz | | NULL = unresolved |
| resolved_by | uuid | FK → users.id | |
| created_at | timestamptz | NOT NULL DEFAULT now() | |

### comment_replies

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | uuid | PK DEFAULT gen_random_uuid() | |
| comment_id | uuid | NOT NULL, FK → comments.id ON DELETE CASCADE | |
| user_id | uuid | NOT NULL, FK → users.id | |
| body | text | NOT NULL | |
| created_at | timestamptz | NOT NULL DEFAULT now() | |

### figures

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | uuid | PK DEFAULT gen_random_uuid() | |
| document_id | uuid | NOT NULL, FK → documents.id ON DELETE CASCADE | |
| block_id | text | NOT NULL | Tiptap node ID in the document |
| github_repo | text | NOT NULL | e.g. "user/repo" |
| github_path | text | NOT NULL | e.g. "diagrams/arch.drawio" |
| last_sha | text | | Last known commit SHA for this file |
| caption | text | NOT NULL DEFAULT '' | User-provided figure caption |
| status | text | NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'error')) | |
| error_message | text | | e.g. "Source file not found" |
| updated_at | timestamptz | NOT NULL DEFAULT now() | |

## RLS Helper Functions

```sql
-- Returns the user's role in a workspace (NULL if not a member)
CREATE FUNCTION get_workspace_role(ws_id uuid, uid uuid)
RETURNS text AS $$
  SELECT role FROM workspace_members
  WHERE workspace_id = ws_id AND user_id = uid
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Returns the user's effective role for a document
-- (higher of workspace role and document-level role)
CREATE FUNCTION get_document_role(doc_id uuid, uid uuid)
RETURNS text AS $$
  SELECT CASE
    WHEN MAX(role_rank) IS NULL THEN NULL
    WHEN MAX(role_rank) = 4 THEN 'owner'
    WHEN MAX(role_rank) = 3 THEN 'editor'
    WHEN MAX(role_rank) = 2 THEN 'commenter'
    WHEN MAX(role_rank) = 1 THEN 'viewer'
  END
  FROM (
    SELECT CASE role
      WHEN 'owner' THEN 4
      WHEN 'editor' THEN 3
      WHEN 'commenter' THEN 2
      WHEN 'viewer' THEN 1
    END AS role_rank
    FROM workspace_members wm
    JOIN documents d ON d.workspace_id = wm.workspace_id
    WHERE d.id = doc_id AND wm.user_id = uid
    UNION ALL
    SELECT CASE role
      WHEN 'owner' THEN 4
      WHEN 'editor' THEN 3
      WHEN 'commenter' THEN 2
      WHEN 'viewer' THEN 1
    END AS role_rank
    FROM document_collaborators
    WHERE document_id = doc_id AND user_id = uid
  ) roles
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Check if document has a public link
CREATE FUNCTION is_public_document(doc_id uuid)
RETURNS boolean AS $$
  SELECT EXISTS(
    SELECT 1 FROM document_public_links WHERE document_id = doc_id
  )
$$ LANGUAGE sql SECURITY DEFINER STABLE;
```

## State Transitions

### Document Lifecycle
```
Created → Active (editing, auto-saving) → Snapshot taken → ... → Deleted
                                        ↕
                                    Restored from snapshot
```

### Comment Thread Lifecycle
```
Created (open) → Replied → ... → Resolved → (viewable in Resolved panel)
```

### Figure Lifecycle
```
Inserted → Linked (GitHub ref set) → Active (polling) → Updated (SHA changed)
                                                       → Error (file not found)
```
