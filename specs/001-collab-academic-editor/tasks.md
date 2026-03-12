# Tasks: Downtex — Collaborative Academic Document Editor

**Input**: Design documents from `/specs/001-collab-academic-editor/`
**Prerequisites**: plan.md (required), spec.md (required for user stories), research.md, data-model.md, contracts/

**Tests**: Not explicitly requested in spec. Test tasks are omitted. E2E tests are included in the Polish phase per the testing strategy (Vitest unit + Playwright E2E).

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Path Conventions

- **Single Remix project**: `app/` at repository root
- **Supabase**: `supabase/migrations/`, `supabase/functions/`
- **Tests**: `tests/unit/`, `tests/e2e/`

---

## Phase 1: Setup

**Purpose**: Project initialization, tooling, and dependency installation

- [ ] T001 Initialize Remix v2 project with TypeScript strict mode in project root (`package.json`, `tsconfig.json`, `remix.config.ts`)
- [ ] T002 Install core dependencies: `@tiptap/react`, `@tiptap/starter-kit`, `@tiptap/extension-collaboration`, `@tiptap/extension-collaboration-cursor`, `@tiptap/extension-table`, `@tiptap/extension-underline`, `yjs`, `@supabase/supabase-js`, `katex`, `lowlight`, `@tiptap/extension-code-block-lowlight`, `zod`
- [ ] T003 [P] Configure Tailwind CSS with custom design tokens in `tailwind.config.ts` (Inter + Georgia fonts, zinc color scale, indigo-600 accent, border radius tokens 4/6/12px, shadow tokens)
- [ ] T004 [P] Configure ESLint and Prettier with TypeScript strict rules (no `any`, no `console.log`) in `.eslintrc.cjs` and `.prettierrc`
- [ ] T005 [P] Create `Dockerfile` with multi-stage build (node:20-alpine builder → runner with Chromium for Puppeteer)
- [ ] T006 [P] Create `docker-compose.yml` for local development (Remix app + local Supabase reference)
- [ ] T007 [P] Create `.github/workflows/ci.yml` with jobs: typecheck, lint, test, build Docker image, push to registry
- [ ] T008 [P] Create `.env.example` with all required environment variables documented

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure that MUST be complete before ANY user story can be implemented

**CRITICAL**: No user story work can begin until this phase is complete

- [ ] T009 Implement Zod environment validation in `app/lib/env.server.ts` — validate all 10 env vars at startup, fail fast on missing/invalid
- [ ] T010 Implement server-side Supabase client factory in `app/lib/supabase.server.ts` — create authenticated client from request cookies, expose service-role client for server-only operations
- [ ] T011 [P] Implement browser-side Supabase client in `app/lib/supabase.client.ts` — singleton client using anon key, session from cookie
- [ ] T012 Create Supabase migration `supabase/migrations/001_users.sql` — `users` table (id, display_name, avatar_url, github_token_encrypted, notification_email_comments, created_at, updated_at) with trigger `on_auth_user_created` that inserts user row
- [ ] T013 Create Supabase migration `supabase/migrations/002_workspaces.sql` — `workspaces` table (id, name, avatar_url, owner_id, type, created_at) and `workspace_members` table (workspace_id, user_id, role, created_at) with composite PK; extend `on_auth_user_created` trigger to also create personal workspace and owner membership row
- [ ] T014 Create Supabase migration `supabase/migrations/003_folders_documents.sql` — `folders` table (id, workspace_id, parent_folder_id, name, sort_order, created_by, created_at) with index on (workspace_id, parent_folder_id); `documents` table (id, folder_id, workspace_id, title, yjs_state bytea, created_by, created_at, updated_at) with denormalized workspace_id
- [ ] T015 [P] Create Supabase migration `supabase/migrations/004_collaborators_sharing.sql` — `document_collaborators` table (document_id, user_id, role, created_at) with composite PK; `document_public_links` table (document_id PK, token uuid unique, created_at)
- [ ] T016 [P] Create Supabase migration `supabase/migrations/005_comments.sql` — `comments` table (id, document_id, user_id, anchor_yjs_relative bytea, anchor_text_preview, body, resolved_at, resolved_by, created_at); `comment_replies` table (id, comment_id, user_id, body, created_at)
- [ ] T017 [P] Create Supabase migration `supabase/migrations/006_figures.sql` — `figures` table (id, document_id, block_id, github_repo, github_path, last_sha, caption, status, error_message, updated_at)
- [ ] T018 [P] Create Supabase migration `supabase/migrations/007_snapshots.sql` — `document_snapshots` table (id, document_id, label, content_json jsonb, type, created_by, created_at) with index on (document_id, created_at DESC)
- [ ] T019 Create Supabase migration `supabase/migrations/008_rls_policies.sql` — RLS helper functions (`get_workspace_role`, `get_document_role`, `is_public_document`) and enable RLS + policies on ALL tables: users (own row only), workspaces (members only), workspace_members (same workspace members), folders (workspace members), documents (workspace members or document collaborators or public link), document_collaborators (document access), document_public_links (document owner/editor), comments (document access), comment_replies (comment access), figures (document access), document_snapshots (document access)
- [ ] T020 Implement OAuth sign-in flow: create `app/routes/_auth.login.tsx` with GitHub and Google OAuth buttons using Supabase Auth `signInWithOAuth`
- [ ] T021 Implement OAuth callback handler in `app/routes/_auth.callback.tsx` — exchange code for session, store encrypted GitHub token if GitHub provider, redirect to app index
- [ ] T022 Implement GitHub token encryption/decryption utilities in `app/lib/crypto.server.ts` — AES-256-GCM encrypt/decrypt using ENCRYPTION_KEY env var
- [ ] T023 Implement permissions helper in `app/lib/permissions.server.ts` — `getUserWorkspaceRole(supabase, workspaceId)`, `getUserDocumentRole(supabase, documentId)`, `requireRole(role, minimumRole)` that throws 403 on insufficient access
- [ ] T024 Implement authenticated app layout in `app/routes/_app.tsx` — loader validates session (redirect to login if unauthenticated), renders sidebar + top bar shell with `<Outlet />`
- [ ] T025 Implement app index redirect in `app/routes/_app._index.tsx` — loader fetches user's personal workspace ID and redirects to `/workspace/{id}`
- [ ] T026 [P] Create design system primitive components in `app/components/ui/`: `Button.tsx` (variants: primary/secondary/ghost/danger, sizes: sm/md/lg), `Input.tsx` (text input with label and error state), `Modal.tsx` (centered overlay with backdrop blur, close on Escape), `Dropdown.tsx` (trigger + floating menu with keyboard nav), `Avatar.tsx` (image with fallback initials, sizes: sm/md/lg)
- [ ] T027 [P] Create `supabase/seed.sql` with test data: 2 users, 1 personal workspace each, 1 team workspace with both users, sample folders and documents

**Checkpoint**: Foundation ready — authentication works, database schema deployed, RLS enforced, design system primitives available. User story implementation can now begin.

---

## Phase 3: User Story 1 — Solo Academic Writing (Priority: P1) MVP

**Goal**: A single user can sign in, create folders and documents, write with all academic block types, auto-save, and export to PDF.

**Independent Test**: Sign in → create folder → create document → write content with every block type → export PDF → verify formatting.

### Implementation for User Story 1

- [ ] T028 [US1] Implement workspace route loader in `app/routes/_app.workspace.$wid.tsx` — fetch workspace details, full folder tree (recursive query), and documents list; verify workspace membership via RLS
- [ ] T029 [US1] Implement workspace route actions in `app/routes/_app.workspace.$wid.tsx` — intents: `create-folder`, `rename-folder`, `delete-folder`, `create-document`, `rename-document`, `delete-document` with role checks (editor+)
- [ ] T030 [P] [US1] Implement sidebar folder tree component in `app/components/sidebar/FolderTree.tsx` — recursive tree rendering, collapse/expand state, context menu (rename, delete), "New folder" and "New document" buttons per folder
- [ ] T031 [P] [US1] Implement workspace switcher component in `app/components/sidebar/WorkspaceSwitcher.tsx` — dropdown listing personal + team workspaces, navigate on select
- [ ] T032 [US1] Implement document editor route loader in `app/routes/_app.workspace.$wid.$docId.tsx` — fetch document metadata (title, collaborators), user's effective role, initial Yjs binary state (base64 encoded for hydration)
- [ ] T033 [US1] Create Tiptap editor component in `app/components/editor/Editor.tsx` — initialize Tiptap with StarterKit (paragraph, headings H1-H4, bold, italic, strike, code, blockquote, horizontal rule, bullet list, ordered list), Underline extension, CodeBlockLowlight extension, Table + TableRow + TableCell + TableHeader extensions; centered content column max-w-[680px] with academic styling
- [ ] T034 [P] [US1] Create custom Tiptap MathInline extension in `app/components/editor/extensions/math-inline.ts` — inline mark that renders LaTeX via KaTeX; input rule: `$...$` wraps in math inline; editor shows rendered math inline
- [ ] T035 [P] [US1] Create custom Tiptap MathBlock extension in `app/components/editor/extensions/math-block.ts` — block node that renders centered LaTeX equation via KaTeX; input rule: `$$` on empty line opens math block; renders full-width centered
- [ ] T036 [P] [US1] Create custom Tiptap Footnote extension in `app/components/editor/extensions/footnote.ts` — inline mark that renders as superscript number in editor; stores footnote text as attribute; numbers assigned in document order
- [ ] T037 [US1] Implement editor toolbar in `app/components/editor/toolbar/Toolbar.tsx` — formatting buttons (bold, italic, underline, strike, code), block type dropdown (paragraph, H1-H4, blockquote, code block, math block), list buttons (bullet, ordered), table insert button, horizontal rule button
- [ ] T038 [US1] Implement Yjs document setup in `app/lib/yjs.ts` — create Yjs `Doc`, initialize from binary state vector (from loader data), export state vector for persistence
- [ ] T039 [US1] Implement auto-save via debounced Yjs state persistence — in the editor component, after 2 seconds of no edits, POST the Yjs binary state to a Remix action on the document route (`intent: "save-yjs-state"`); add the action handler in `app/routes/_app.workspace.$wid.$docId.tsx`
- [ ] T040 [US1] Implement PDF export HTML template route in `app/routes/render.$docId.tsx` — loader accepts one-time token query param (valid 60s), decodes Yjs state to document JSON, renders full HTML page with: front page (title, author, workspace, date), table of contents from headings, all content blocks, CSS `@page` rules for A4, running headers/footers, CSS counters for section/figure/table/equation numbering, KaTeX CSS inline, Georgia serif body font, monospace code blocks
- [ ] T041 [US1] Implement PDF export styles in `app/styles/pdf-export.css` — A4 page size, margins (2.5cm top/bottom, 2cm left/right), `@page` header (doc title left, workspace right) and footer (page number centered), hierarchical heading numbering via CSS counters, figure/table/equation auto-numbering, footnote collection at page bottom, serif font stack, code block background
- [ ] T042 [US1] Implement Puppeteer PDF generation in `app/lib/pdf.server.ts` — launch Chromium (from Docker-installed path), navigate to render route with one-time token, `page.pdf()` with A4 format and header/footer templates, return PDF buffer
- [ ] T043 [US1] Implement PDF template helper in `app/lib/pdf-template.server.ts` — convert Yjs JSON document to HTML blocks: paragraphs, headings with numbering anchors, lists, code blocks with syntax highlighting markup, math (KaTeX `renderToString`), tables, blockquotes, horizontal rules, footnotes (collect and append per-page)
- [ ] T044 [US1] Implement PDF export action route in `app/routes/api.export.$docId.tsx` — POST action: verify editor+ role, generate one-time token, call `pdf.server.ts` to generate PDF, stream response as `application/pdf` with `Content-Disposition: attachment; filename="{title}.pdf"`
- [ ] T045 [US1] Add export PDF button to editor top bar in `app/routes/_app.workspace.$wid.$docId.tsx` — "Export PDF" button that POSTs to `/api/export/{docId}` and triggers browser download
- [ ] T046 [US1] Implement inline document title editing in the editor top bar — clicking the title makes it editable; on blur or Enter, submit `intent: "update-title"` action

**Checkpoint**: User Story 1 complete. A user can sign in, create folders/documents, write with all block types, auto-save, and export a correctly formatted PDF.

---

## Phase 4: User Story 2 — Real-Time Collaborative Editing (Priority: P2)

**Goal**: Multiple users can edit the same document simultaneously with live cursors, presence avatars, and conflict-free sync.

**Independent Test**: Open same document in two browser sessions → both type → verify changes appear in both → verify cursors visible → close one tab → verify cursor disappears.

### Implementation for User Story 2

- [ ] T047 [US2] Implement custom Yjs Supabase Realtime provider in `app/lib/yjs-supabase-provider.ts` — class `SupabaseYjsProvider` that subscribes to Supabase Realtime channel `doc:{documentId}`, broadcasts `yjs-update` events, handles `yjs-sync-step-1` / `yjs-sync-step-2` for initial sync with existing clients, implements reconnection logic with exponential backoff
- [ ] T048 [US2] Integrate Yjs provider with Tiptap editor in `app/components/editor/Editor.tsx` — add `Collaboration` extension bound to Yjs doc, add `CollaborationCursor` extension for remote cursors, connect `SupabaseYjsProvider` on mount, disconnect on unmount
- [ ] T049 [US2] Implement presence tracking in `app/components/editor/Editor.tsx` — on editor mount, call `channel.track()` with user ID, display name, avatar URL, cursor color (deterministic from user ID hash); on selection change (50ms debounce), update presence with new cursor position
- [ ] T050 [P] [US2] Implement remote cursor rendering in `app/components/presence/Cursors.tsx` — render colored cursor lines and name labels for each remote user using `CollaborationCursor` extension's decoration output
- [ ] T051 [P] [US2] Implement presence avatar bar in `app/components/presence/AvatarBar.tsx` — display small avatars of all online users in the editor top bar, sourced from Supabase Realtime presence state; show tooltip with display name on hover
- [ ] T052 [US2] Implement persistence leader election in `app/lib/yjs-supabase-provider.ts` — track `isPersistenceLeader` in presence; first joiner becomes leader; on leader leave, next client by `online_at` assumes leadership; only leader triggers auto-save writes

**Checkpoint**: User Story 2 complete. Multiple users can edit simultaneously with visible cursors and avatars.

---

## Phase 5: User Story 3 — Workspace and Folder Organization (Priority: P3)

**Goal**: Full folder hierarchy with drag-and-drop, team workspace creation, member invites, sidebar search, workspace switching.

**Independent Test**: Create nested folders → drag document between folders → create team workspace → invite member → search for documents.

### Implementation for User Story 3

- [ ] T053 [US3] Add drag-and-drop support to `app/components/sidebar/FolderTree.tsx` — implement drag handlers for documents and folders, visual drop indicators, POST `intent: "move-document"` / `intent: "reorder"` action on drop
- [ ] T054 [US3] Add workspace creation flow — "New workspace" button in `app/components/sidebar/WorkspaceSwitcher.tsx` that opens a modal to enter workspace name and avatar; POST action to create workspace and redirect
- [ ] T055 [US3] Implement workspace creation action in `app/routes/_app.workspace.$wid.tsx` — `intent: "create-workspace"` that inserts into `workspaces` (type=team) and `workspace_members` (role=owner), returns new workspace ID
- [ ] T056 [US3] Implement member invitation action in `app/routes/_app.workspace.$wid.settings.tsx` — `intent: "invite-member"` that looks up user by email, inserts `workspace_members` row with specified role; if user not found, store pending invite (add `workspace_invites` table or handle via email)
- [ ] T057 [P] [US3] Implement sidebar search in `app/components/sidebar/SearchBar.tsx` — text input at top of sidebar, filters folder tree to show matching document titles and folder names across the entire workspace, debounced 300ms
- [ ] T058 [US3] Add subfolder creation support — in `app/components/sidebar/FolderTree.tsx`, each folder's context menu includes "New subfolder" which creates a folder with `parent_folder_id` set to the current folder

**Checkpoint**: User Story 3 complete. Full folder organization, team workspaces, and search working.

---

## Phase 6: User Story 4 — Permissions and Sharing (Priority: P4)

**Goal**: Role enforcement on all resources, document-level sharing with role overrides, public read-only links.

**Independent Test**: Assign Viewer role → verify cannot edit → share document as Editor → verify can now edit → enable public link → open in incognito → verify read-only.

### Implementation for User Story 4

- [ ] T059 [US4] Implement share modal in `app/components/modals/ShareModal.tsx` — list current collaborators with role dropdowns, "Add people" input (search by email), role selector (Editor/Commenter/Viewer), "Copy public link" toggle, remove collaborator button
- [ ] T060 [US4] Implement document sharing actions in `app/routes/_app.workspace.$wid.$docId.tsx` — intents: `share-user` (insert/update `document_collaborators`), `remove-share` (delete row), `enable-public-link` (insert `document_public_links`), `disable-public-link` (delete row); all with owner/editor role check
- [ ] T061 [US4] Implement public document view route in `app/routes/share.$token.tsx` — loader validates token against `document_public_links` using service-role client, fetches document content (Yjs decoded to HTML), renders read-only server-rendered HTML with academic styling; works without JavaScript (progressive enhancement per Constitution VIII)
- [ ] T062 [US4] Enforce role-based UI restrictions in `app/components/editor/Editor.tsx` — if user role is `viewer`, set Tiptap `editable: false`; if role is `commenter`, set `editable: false` but enable comment selection; hide toolbar for viewers; hide export button for viewers/commenters
- [ ] T063 [US4] Implement workspace settings page in `app/routes/_app.workspace.$wid.settings.tsx` — loader: fetch workspace details and member list (owner only); render: workspace name/avatar form, member list with role dropdowns, invite form, danger zone with delete workspace button; actions: `update-workspace`, `update-member-role`, `remove-member` (prevent self-removal if owner), `delete-workspace` (cascade)

**Checkpoint**: User Story 4 complete. Permissions enforced at database and UI level, sharing and public links working.

---

## Phase 7: User Story 5 — Inline Comments and Review (Priority: P5)

**Goal**: Text selection–based comment threads with replies, resolve/unresolve, and a resolved comments panel.

**Independent Test**: Select text → create comment → reply from another user → resolve thread → find it in Resolved panel.

### Implementation for User Story 5

- [ ] T064 [US5] Implement comment creation flow in `app/components/editor/Editor.tsx` — on text selection, show a "Comment" button in a floating toolbar; on click, open comment input in the comments sidebar anchored to the selection; on submit, POST `intent: "create-comment"` with Yjs relative position of anchor and comment body
- [ ] T065 [US5] Implement comment thread component in `app/components/comments/CommentThread.tsx` — display anchor text preview, comment body, author avatar + name, timestamp; reply input at bottom; resolve button (visible to document author and comment author)
- [ ] T066 [US5] Implement comments sidebar in `app/components/comments/CommentsSidebar.tsx` — slides in from right (300px), lists all open comment threads sorted by document position, each thread links to its anchor position in the editor (scroll to and highlight on click)
- [ ] T067 [US5] Implement resolved comments panel in `app/components/comments/ResolvedPanel.tsx` — toggle between "Open" and "Resolved" tabs in the comments sidebar; resolved panel lists resolved threads with resolved-by and resolved-at info
- [ ] T068 [US5] Implement comment actions in `app/routes/_app.workspace.$wid.$docId.tsx` — intents: `create-comment` (insert `comments` row with anchor_yjs_relative and body, require commenter+ role), `reply-comment` (insert `comment_replies`, require commenter+), `resolve-comment` (set `resolved_at` and `resolved_by`, require comment author or document owner)
- [ ] T069 [US5] Load comments in document route loader — fetch all comments and replies for the document, include in loader data; render comment decorations (highlight anchored text ranges) using ProseMirror decorations resolved from Yjs relative positions

**Checkpoint**: User Story 5 complete. Inline comments with threads, replies, and resolve/unresolve working.

---

## Phase 8: User Story 6 — Draw.io Figure Integration (Priority: P6)

**Goal**: Insert figure blocks linked to GitHub `.drawio` files, SVG preview in editor, auto-polling for updates, auto-numbered figures in PDF.

**Independent Test**: Insert figure → paste GitHub URL → verify preview renders → update file on GitHub → verify figure updates → export PDF → verify "Figure N" numbering.

### Implementation for User Story 6

- [ ] T070 [US6] Create custom Tiptap Figure extension in `app/components/editor/extensions/figure.ts` — block Node with attributes: `figureId`, `githubRepo`, `githubPath`, `caption`; renders as non-editable SVG/iframe preview area + editable caption text field below; shows placeholder "Insert figure" when empty
- [ ] T071 [US6] Implement figure picker modal in `app/components/modals/FigurePicker.tsx` — two modes: (1) paste GitHub file URL directly (parse owner/repo/path from URL), (2) browse connected GitHub repos (list repos, navigate directories, filter `.drawio` files); on select, POST `intent: "insert-figure"` with blockId, githubRepo, githubPath
- [ ] T072 [US6] Implement GitHub API client in `app/lib/github.server.ts` — functions: `listUserRepos(token)`, `listRepoContents(token, repo, path)`, `getFileContent(token, repo, path)`, `getFileSha(token, repo, path)`; all using GitHub REST API with decrypted user token
- [ ] T073 [US6] Implement draw.io rendering utilities in `app/lib/drawio.server.ts` — function to generate draw.io embed URL from repo/path for iframe preview in editor; function to render `.drawio` content as image for PDF export (via Puppeteer screenshot of draw.io viewer)
- [ ] T074 [US6] Implement figure insert action in `app/routes/_app.workspace.$wid.$docId.tsx` — `intent: "insert-figure"` that creates `figures` row (document_id, block_id, github_repo, github_path), fetches initial file SHA from GitHub, stores in `last_sha`
- [ ] T075 [US6] Create draw.io polling edge function in `supabase/functions/poll-figures/index.ts` — cron every 5 minutes; query distinct `github_repo + github_path` pairs from `figures` table; for each, call GitHub API to check latest SHA; if changed, update `last_sha` and `updated_at`; on error (file not found), set `status = 'error'` and `error_message`
- [ ] T076 [US6] Implement real-time figure update subscription in editor — subscribe to Supabase Realtime `postgres_changes` on `figures` table filtered by `document_id`; on UPDATE event, re-render affected figure block with new data or error state
- [ ] T077 [US6] Add figure rendering to PDF template in `app/lib/pdf-template.server.ts` — for each figure node, render the draw.io diagram as an image (via Puppeteer screenshot of embed URL), wrap in `<figure>` with `<figcaption>Figure N: {caption}</figcaption>`, increment figure counter

**Checkpoint**: User Story 6 complete. Draw.io figures integrated with auto-polling and PDF numbering.

---

## Phase 9: User Story 7 — Snapshots and Version History (Priority: P7)

**Goal**: Automatic daily snapshots, manual named snapshots, version history panel with preview and restore.

**Independent Test**: Edit document → create manual snapshot → edit more → open Version History → preview snapshot → restore → verify content reverted.

### Implementation for User Story 7

- [ ] T078 [US7] Implement manual snapshot action in `app/routes/api.snapshot.$docId.tsx` — POST action: verify editor+ role, read current Yjs state from `documents.yjs_state`, decode to JSON, insert `document_snapshots` row with `type = 'manual'`, user-provided label, and `created_by`; return snapshot metadata
- [ ] T079 [US7] Create daily snapshot edge function in `supabase/functions/daily-snapshots/index.ts` — cron daily at 03:00 UTC; query all documents with `updated_at > now() - interval '24 hours'`; for each, read `yjs_state`, decode to JSON, insert `document_snapshots` row with `type = 'automatic'` and label `"Auto-snapshot · {date}"`
- [ ] T080 [US7] Implement version history modal in `app/components/modals/VersionHistory.tsx` — list all snapshots for the document (newest first), showing label, type badge (auto/manual), created_at, created_by; "Preview" button opens read-only rendered view of snapshot content; "Restore" button with confirmation dialog
- [ ] T081 [US7] Implement snapshot preview — in `app/components/modals/VersionHistory.tsx`, "Preview" renders the snapshot `content_json` as read-only HTML in a side panel or overlay using the same block renderers as the editor
- [ ] T082 [US7] Implement snapshot restore action in `app/routes/_app.workspace.$wid.$docId.tsx` — `intent: "restore-snapshot"` that reads snapshot `content_json`, re-encodes to Yjs binary state, replaces `documents.yjs_state`, broadcasts `force-reload` message on the Realtime channel `doc:{documentId}`; all connected clients reload Yjs state
- [ ] T083 [US7] Handle `force-reload` event in `app/lib/yjs-supabase-provider.ts` — on receiving `force-reload` broadcast, destroy current Yjs doc, re-fetch state from database, reinitialize editor with new state

**Checkpoint**: User Story 7 complete. Snapshots (auto + manual) with preview and restore working.

---

## Phase 10: User Story 8 — Cross-Document References (Priority: P8)

**Goal**: `@document` mentions and `@section` references with autocomplete in editor and resolved numbering in PDF.

**Independent Test**: Create two documents → insert `@document` mention → insert `@section` reference → verify links in editor → export PDF → verify "Section X.Y" resolved correctly.

### Implementation for User Story 8

- [ ] T084 [US8] Create custom Tiptap DocumentMention extension in `app/components/editor/extensions/document-mention.ts` — Node extension using Tiptap Suggestion utility; on `@` trigger, query documents in current workspace via Remix fetcher; render as clickable link with document title; store document ID as attribute
- [ ] T085 [US8] Create custom Tiptap SectionReference extension in `app/components/editor/extensions/section-reference.ts` — Node extension using Suggestion; after selecting a document, show heading list from that document; store target document ID + heading ID as attributes; render as "Section {number}" in editor (resolved at render time)
- [ ] T086 [US8] Implement document search endpoint for mention autocomplete — add a loader or resource route that accepts a search query and workspace ID, returns matching document titles and IDs; used by the Suggestion popup in DocumentMention extension
- [ ] T087 [US8] Implement cross-reference resolution in PDF template in `app/lib/pdf-template.server.ts` — for `@document` mentions, render as hyperlinks with document title; for `@section` references, resolve the target heading's hierarchical number (e.g., "3.2") by loading the target document's heading structure and counting
- [ ] T088 [US8] Implement document navigation from mentions in editor — clicking a `@document` mention in the editor navigates to that document (`/workspace/{wid}/{docId}`); clicking a `@section` reference navigates to the document and scrolls to the heading

**Checkpoint**: User Story 8 complete. Cross-document references with autocomplete and PDF resolution working.

---

## Phase 11: User Story 9 — User and Workspace Settings (Priority: P9)

**Goal**: User profile settings, workspace management, document settings.

**Independent Test**: Change display name → verify updated everywhere → update notification prefs → invite member → change role → delete test workspace.

### Implementation for User Story 9

- [ ] T089 [US9] Implement user settings page in `app/routes/_app.settings.tsx` — loader: fetch user profile; render: display name input, avatar upload/URL, connected OAuth providers list (with "Link" button for unlinked provider), notification toggle (email on new comment); action intents: `update-profile`, `update-notifications`, `link-provider`
- [ ] T090 [US9] Implement `link-provider` action in `app/routes/_app.settings.tsx` — call `supabase.auth.linkIdentity()` with the selected provider, handle redirect flow and return
- [ ] T091 [US9] Implement document settings in the editor page — add a settings dropdown/panel in the editor top bar with: document title edit, share settings (opens ShareModal from US4), version history (opens VersionHistory from US7), "Delete document" with confirmation (owner only, redirects to workspace on success)

**Checkpoint**: User Story 9 complete. All settings pages functional.

---

## Phase 12: Polish & Cross-Cutting Concerns

**Purpose**: Testing, performance, security hardening, and documentation

- [ ] T092 [P] Write Vitest unit tests in `tests/unit/crypto.test.ts` — test AES-256-GCM encrypt/decrypt round-trip, test with invalid key, test with tampered ciphertext
- [ ] T093 [P] Write Vitest unit tests in `tests/unit/pdf-template.test.ts` — test heading numbering (hierarchical counters), test figure/table numbering, test footnote collection, test cross-reference resolution
- [ ] T094 [P] Write Vitest unit tests in `tests/unit/permissions.test.ts` — test role hierarchy (owner > editor > commenter > viewer), test `requireRole` throws on insufficient access, test document-level override logic
- [ ] T095 [P] Write Vitest unit tests in `tests/unit/drawio.test.ts` — test embed URL generation from repo/path, test error handling for invalid paths
- [ ] T096 Write Playwright E2E test in `tests/e2e/auth.spec.ts` — test GitHub OAuth sign-in flow (mock provider), verify redirect to personal workspace, verify user profile created
- [ ] T097 Write Playwright E2E test in `tests/e2e/editor.spec.ts` — create document, type paragraphs and headings, apply bold/italic formatting, insert code block, verify content persists after page reload (auto-save)
- [ ] T098 Write Playwright E2E test in `tests/e2e/collaboration.spec.ts` — open same document in two browser contexts, type in both, verify changes appear in both, verify cursor visibility
- [ ] T099 Write Playwright E2E test in `tests/e2e/export.spec.ts` — create document with headings and content, export PDF, verify PDF is downloaded (check response headers)
- [ ] T100 [P] Performance: audit and optimize Tiptap editor bundle — ensure code-splitting for KaTeX, lowlight, and table extensions; verify bundle size stays under target; add dynamic imports where possible
- [ ] T101 [P] Accessibility audit — verify all interactive elements have visible focus states, ARIA labels on non-text elements, color contrast WCAG AA, keyboard navigation through sidebar and editor toolbar
- [ ] T102 [P] Security review — verify no `console.log` in committed code, no `any` types without justification, no inline styles, GitHub tokens never in logs or client code, service role key never exposed
- [ ] T103 Run quickstart.md validation — follow quickstart.md step by step on a clean environment, verify all steps work, fix any discrepancies

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — can start immediately
- **Foundational (Phase 2)**: Depends on Phase 1 completion — BLOCKS all user stories
- **US1 (Phase 3)**: Depends on Phase 2 — delivers MVP
- **US2 (Phase 4)**: Depends on Phase 2 + US1 (needs editor to exist)
- **US3 (Phase 5)**: Depends on Phase 2 — folder tree basics exist from US1 but full drag-drop/teams are additive
- **US4 (Phase 6)**: Depends on Phase 2 + US1 (needs editor for role-based UI restrictions)
- **US5 (Phase 7)**: Depends on Phase 2 + US1 + US2 (needs editor + Yjs for comment anchoring)
- **US6 (Phase 8)**: Depends on Phase 2 + US1 (needs editor for figure blocks)
- **US7 (Phase 9)**: Depends on Phase 2 + US1 (needs auto-save/Yjs state to snapshot)
- **US8 (Phase 10)**: Depends on Phase 2 + US1 (needs editor + PDF export for reference resolution)
- **US9 (Phase 11)**: Depends on Phase 2 (uses existing actions from other stories)
- **Polish (Phase 12)**: Depends on all desired user stories being complete

### User Story Dependencies

- **US1 (P1)**: Foundation only — no story dependencies. **MVP.**
- **US2 (P2)**: Requires US1 editor to exist (adds collaboration layer on top)
- **US3 (P3)**: Foundation only — extends sidebar from US1 with full tree + teams
- **US4 (P4)**: Requires US1 editor (for role-based UI), otherwise independent
- **US5 (P5)**: Requires US1 editor + US2 Yjs provider (for real-time comment sync and Yjs relative positions)
- **US6 (P6)**: Requires US1 editor (for figure block type)
- **US7 (P7)**: Requires US1 auto-save (for Yjs state to snapshot)
- **US8 (P8)**: Requires US1 editor + PDF export (for reference resolution)
- **US9 (P9)**: Foundation only — settings are standalone forms

### Within Each User Story

- Models/migrations before services
- Services/lib before routes
- Routes/loaders before UI components
- Core implementation before integration points
- Story complete before moving to next priority

### Parallel Opportunities

- Phase 1: T003, T004, T005, T006, T007, T008 can all run in parallel
- Phase 2: T015, T016, T017, T018 can run in parallel (independent migrations); T010, T011 in parallel; T026, T027 in parallel
- US1: T030 + T031 in parallel (sidebar components); T034 + T035 + T036 in parallel (Tiptap extensions)
- US2: T050 + T051 in parallel (presence UI components)
- US5: T065 + T066 + T067 in parallel (comment UI components)
- US6: T070 + T071 in parallel (figure extension + picker modal)
- US9: T089 + T091 in parallel (user settings + document settings)
- Polish: T092 + T093 + T094 + T095 in parallel (all unit tests); T100 + T101 + T102 in parallel (audits)

---

## Parallel Example: User Story 1

```bash
# Launch sidebar components in parallel:
Task: T030 "Implement sidebar folder tree in app/components/sidebar/FolderTree.tsx"
Task: T031 "Implement workspace switcher in app/components/sidebar/WorkspaceSwitcher.tsx"

# Launch Tiptap extensions in parallel:
Task: T034 "Create MathInline extension in app/components/editor/extensions/math-inline.ts"
Task: T035 "Create MathBlock extension in app/components/editor/extensions/math-block.ts"
Task: T036 "Create Footnote extension in app/components/editor/extensions/footnote.ts"
```

## Parallel Example: User Story 2

```bash
# Launch presence UI in parallel:
Task: T050 "Implement remote cursor rendering in app/components/presence/Cursors.tsx"
Task: T051 "Implement presence avatar bar in app/components/presence/AvatarBar.tsx"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational (CRITICAL — blocks all stories)
3. Complete Phase 3: User Story 1 — Solo Academic Writing
4. **STOP and VALIDATE**: Sign in, create document, write with all block types, export PDF
5. Deploy/demo if ready

### Incremental Delivery

1. Setup + Foundational → Foundation ready
2. US1 (Solo Writing + Export) → **MVP!** Deploy
3. US2 (Real-Time Collab) → Multi-user editing live → Deploy
4. US3 (Workspaces + Folders) → Full organization → Deploy
5. US4 (Permissions) → Secure sharing → Deploy
6. US5 (Comments) → Academic review workflow → Deploy
7. US6 (Draw.io) → Figure integration → Deploy
8. US7 (Snapshots) → Version history → Deploy
9. US8 (Cross-Refs) → Multi-document projects → Deploy
10. US9 (Settings) → Full product → Deploy
11. Polish → Tests, performance, accessibility → Production-ready

### Parallel Team Strategy

With multiple developers after Foundational is complete:

- **Developer A**: US1 (MVP) → US2 (adds collab to editor)
- **Developer B**: US3 (workspaces) → US4 (permissions) → US9 (settings)
- **Developer C**: US6 (draw.io) → US7 (snapshots)
- **After US1+US2 complete**: US5 (comments, needs collab), US8 (cross-refs, needs editor)

---

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps task to specific user story for traceability
- Each user story should be independently completable and testable
- Commit after each task or logical group
- Stop at any checkpoint to validate story independently
- Avoid: vague tasks, same file conflicts, cross-story dependencies that break independence
- No test tasks in story phases — tests are consolidated in Polish phase per project testing strategy
