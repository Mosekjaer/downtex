# Tasks: GitHub Figure Sync & Auto-Numbering

**Input**: Design documents from `/specs/003-github-figure-sync/`
**Prerequisites**: plan.md (required), spec.md (required), research.md, data-model.md, contracts/

**Tests**: Not explicitly requested — test tasks omitted. Add via `/speckit.tasks` with TDD flag if needed.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Database migrations and auth token capture — required before any user story work.

- [x] T001 [P] Create workspace_repositories table with RLS policies and indexes in supabase/migrations/009_workspace_repositories.sql — schema per data-model.md: id, workspace_id (FK), github_repo, display_name, connected_by (FK), status CHECK ('active','error','disconnected'), error_message, created_at, updated_at; UNIQUE(workspace_id, github_repo); RLS: SELECT for workspace members, INSERT/UPDATE/DELETE for editors+owners using get_workspace_role() RPC
- [x] T002 [P] Add caching columns to figures table in supabase/migrations/010_figures_caching.sql — ALTER TABLE figures ADD: workspace_repository_id (uuid FK → workspace_repositories ON DELETE SET NULL), cached_image_path (text), cached_image_format (text CHECK 'svg','png'), file_type (text NOT NULL DEFAULT 'drawio' CHECK 'drawio','png','jpg','jpeg','gif','svg')
- [x] T003 [P] Create figures storage bucket with RLS in supabase/migrations/011_figures_storage.sql — INSERT INTO storage.buckets (id, name, public) VALUES ('figures', 'figures', false); storage RLS: SELECT for workspace members (join through figures→documents→workspace), INSERT/UPDATE/DELETE for service_role only; 10MB file size limit
- [x] T004 Update auth callback to capture GitHub OAuth token in app/routes/_auth.callback.tsx — after exchangeCodeForSession(), extract session.provider_token; if present, encrypt via encrypt() from app/lib/crypto.server.ts and UPDATE users SET github_token_encrypted WHERE id = user.id using service-role client
- [x] T005 Add getUserGitHubToken() utility in app/lib/github.server.ts — new async function that takes (supabase, userId): queries users.github_token_encrypted, decrypts via decrypt() from crypto.server.ts, returns token string or null; add getRepoTree(token, repo, path?) function that calls GitHub Contents API for directory listing, filters to supported extensions (png,jpg,jpeg,gif,svg,drawio), returns {name, type, path, sha}[]

**Checkpoint**: Run `make db-reset && make check` — all migrations apply, types pass

---

## Phase 2: User Story 1 — Connect a GitHub Repository to a Workspace (Priority: P1) MVP

**Goal**: Workspace owners/editors can connect and disconnect GitHub repositories via workspace settings.

**Independent Test**: Navigate to workspace settings, add a GitHub repo URL, verify it appears in the connected repos list. Disconnect it, verify it's marked disconnected.

### Implementation for User Story 1

- [x] T006 [US1] Add loader data for workspace repositories in app/routes/_app.workspace.$wid.settings.tsx — in the existing loader, query workspace_repositories WHERE workspace_id = wid AND status != 'disconnected', return as connectedRepos alongside existing data
- [x] T007 [US1] Add connect-repo action in app/routes/_app.workspace.$wid.settings.tsx — new case "connect-repo": requireRole(role, "editor"); parse githubRepo from formData; validate owner/repo format with regex; call getUserGitHubToken() then getFileSha(token, repo, "README.md") or similar to validate access (404 = inaccessible); INSERT into workspace_repositories (workspace_id, github_repo, display_name = repo name portion, connected_by = user.id); handle unique constraint violation (repo already connected)
- [x] T008 [US1] Add disconnect-repo action in app/routes/_app.workspace.$wid.settings.tsx — new case "disconnect-repo": requireRole(role, "editor"); parse repoId from formData; UPDATE workspace_repositories SET status = 'disconnected', updated_at = now() WHERE id = repoId AND workspace_id = wid; verify row exists (404 if not)
- [x] T009 [US1] Add Connected Repositories UI section in app/routes/_app.workspace.$wid.settings.tsx — render between Members and Danger Zone sections; show list of connectedRepos with display_name, github_repo, status badge, disconnect button (useFetcher); add form with text input for GitHub repo URL (owner/repo format), submit button "Connect Repository"; show validation errors and success states; hide entire section for non-editor/owner roles

**Checkpoint**: User Story 1 fully functional — connect/disconnect repos in workspace settings

---

## Phase 3: User Story 2 — Browse and Insert Figures from Connected Repos (Priority: P1)

**Goal**: Editors can browse connected repositories in the figure picker, navigate folders, select files (images + .drawio), and insert them as figures.

**Independent Test**: Open figure picker in a document, switch to "Browse repos" tab, navigate a connected repo's file tree, select a .drawio file and a .png file, both insert into the document.

### Implementation for User Story 2

- [ ] T010 [US2] Create repository file browser API route in app/routes/api.github-tree.$repoId.tsx — GET loader: requireAuth; query workspace_repositories by repoId to get github_repo and workspace_id; verify user is workspace member; call getUserGitHubToken() with fallback to GITHUB_SERVICE_TOKEN; call getRepoTree(token, repo, path from searchParams); return JSON {items: [{name, type, path, sha}]}
- [ ] T011 [US2] Enable repo browsing tab in app/components/modals/FigurePicker.tsx — replace "coming soon" in Browse repos tab with: fetch connectedRepos from parent (pass as prop from Editor); show repo list; on repo select, fetch api.github-tree.$repoId; render file tree with folder navigation (clicking dir re-fetches with path param); filter to show only supported file types as selectable; on file select, call onSelect(repo, path, fileType) with the selected file's details
- [ ] T012 [US2] Add new attributes to figure extension in app/components/editor/extensions/figure.ts — add fileType (string, default 'drawio'), imageUrl (string, default null) to addAttributes(); update parseHTML and renderHTML to include new attributes; keep svgUrl (existing, will be populated by render pipeline)
- [ ] T013 [US2] Replace iframe rendering with static image in app/components/editor/extensions/figure.ts — in addNodeView() or the NodeView: if svgUrl or imageUrl is set, render <img src={svgUrl || imageUrl} alt={caption}> instead of iframe; if neither is set, show loading placeholder with spinner and "Rendering figure..." text; keep editable figcaption below the image; ensure image has max-width: 100% and proper sizing
- [ ] T014 [US2] Extend insert-figure action in app/routes/_app.workspace.$wid.$docId.tsx — in case "insert-figure": add formData parsing for fileType (string) and workspaceRepositoryId (string, optional); INSERT into figures with new fields: file_type, workspace_repository_id; after insert, trigger async render by fetching api.render-figure.$figureId (fire-and-forget, don't await in the action)
- [ ] T015 [US2] Pass workspace repos to FigurePicker from Editor in app/components/editor/Editor.tsx — fetch connectedRepos via loader data (from workspace route); pass as prop to FigurePicker; update handleInsertFigure to accept and forward fileType and workspaceRepositoryId to the form submission

**Checkpoint**: User Story 2 fully functional — browse repos, insert figures, images render (after Phase 4 caching pipeline)

---

## Phase 4: User Story 3 — Automatic Figure Sync on Repository Changes (Priority: P1)

**Goal**: When source files change in GitHub, the system automatically detects changes and updates cached figure images.

**Independent Test**: Insert a figure, change the source file in GitHub, wait for poll cycle (≤5 min), verify the figure updates in the editor without manual intervention.

### Implementation for User Story 3

- [ ] T016 [US3] Create .drawio to SVG conversion utility in app/lib/drawio.server.ts — add convertDrawioToSvg(drawioXml: string): Promise<Buffer> function; launch Puppeteer, create page, load a minimal HTML with mxGraph client library (from CDN or bundled), inject .drawio XML, call mxGraph render, extract SVG element innerHTML, return as Buffer; handle render errors gracefully (return error status); add convertImageToBuffer(url: string, token: string): Promise<Buffer> for fetching standard images from GitHub raw URLs
- [ ] T017 [US3] Create figure render API route in app/routes/api.render-figure.$figureId.tsx — POST action: validate service-role auth or workspace editor; query figures row by figureId; fetch file from GitHub using getFileContent(); if fileType is 'drawio': call convertDrawioToSvg(); else: use raw image buffer; upload to Supabase Storage figures/ bucket at path {workspaceId}/{figureId}.{svg|png}; UPDATE figures SET cached_image_path, cached_image_format, status = 'active'; return JSON with cachedImagePath and publicUrl
- [ ] T018 [US3] Add Supabase Realtime subscription for figures in app/components/editor/Editor.tsx — subscribe to postgres_changes on figures table filtered by document_id; on UPDATE event where cached_image_path changes: find the corresponding figure node in editor by matching block_id/figureId; update the node's svgUrl or imageUrl attribute via editor.commands; on status='error': update node to show error state; unsubscribe on component unmount
- [ ] T019 [US3] Extend poll-figures edge function in supabase/functions/poll-figures/index.ts — query workspace_repositories WHERE status = 'active'; for each repo, query figures WHERE github_repo matches; check SHA changes via GitHub API (existing logic); on SHA change: call api.render-figure.$figureId endpoint with POST to trigger re-render and cache update; on repo access error: UPDATE workspace_repositories SET status = 'error', error_message; handle rate limiting gracefully
- [ ] T020 [US3] Add error state rendering to figure extension in app/components/editor/extensions/figure.ts — when figure status is 'error': render a warning overlay on the figure showing "Source file unavailable" with the last cached image still visible underneath (dimmed); if no cached image exists: show a placeholder with error icon and message; style with red/amber border to indicate issue

**Checkpoint**: User Story 3 fully functional — figures auto-sync when GitHub files change, errors handled gracefully

---

## Phase 5: User Story 4 — Automatic Figure Numbering (Priority: P2)

**Goal**: All figures in a document display sequential "Figur N: caption" labels that update dynamically.

**Independent Test**: Insert 3 figures with captions → display "Figur 1:", "Figur 2:", "Figur 3:" → remove the second → renumbers to "Figur 1:", "Figur 2:".

### Implementation for User Story 4

- [ ] T021 [US4] Create ProseMirror figure numbering plugin in app/components/editor/extensions/figure.ts — add a Tiptap plugin (via addProseMirrorPlugins()) that: on every document change (appendTransaction or new state), walks all nodes of type 'figure' in document order, assigns sequential number (1-based) as a decoration or node metadata; store the mapping {figureId → number} in plugin state so it's accessible to NodeViews and other plugins; ensure the plugin re-runs on any node insert/delete/move
- [ ] T022 [US4] Update figure NodeView to display "Figur N: caption" in app/components/editor/extensions/figure.ts — read the figure number from the numbering plugin state; prepend "Figur {number}: " before the user's caption text in the figcaption display; ensure the "Figur N:" prefix is NOT editable (render as a styled span outside the editable content area); update on every transaction when numbers change
- [ ] T023 [US4] Add figure numbering to PDF export in app/lib/pdf-template.server.ts — in the renderNode function's "figure" case: maintain a figureCounter variable (initialized to 0 at document render start); increment for each figure node; prepend "Figur {figureCounter}: " to the figcaption HTML output; ensure counter resets per document export

**Checkpoint**: User Story 4 fully functional — figures are auto-numbered in editor and PDF

---

## Phase 6: User Story 5 — Cross-Reference Figures by Number (Priority: P3)

**Goal**: Users can insert inline references to figures that display "Figur N" and update automatically when numbers change.

**Independent Test**: Insert a figure reference in text → shows "Figur 1" → insert a new figure above → reference updates to "Figur 2".

### Implementation for User Story 5

- [ ] T024 [P] [US5] Create figure-reference extension in app/components/editor/extensions/figure-reference.ts — inline node modeled on section-reference.ts; attributes: targetFigureId (string), targetCaption (string); renderHTML: span with class 'figure-ref' and data-figure-id; parseHTML: span[data-figure-id]; addCommands: insertFigureReference(attrs); render display text by reading the figure numbering plugin state to resolve targetFigureId → "Figur N"; style: text-accent-600 underline decoration-accent-300 cursor-pointer (matching section-reference)
- [ ] T025 [US5] Create figure reference picker UI in app/components/modals/FigureReferencePicker.tsx — modal that lists all figure nodes in the current document with their current number and caption; user clicks a figure to insert a reference; pass targetFigureId and targetCaption to the insertFigureReference command; show "No figures in this document" state if empty
- [ ] T026 [US5] Add figure reference button to toolbar in app/components/editor/toolbar/Toolbar.tsx — add "Fig Ref" button in the Insert tab (near existing "Fig" button); onClick: set showFigureReferencePicker state; pass editor instance to picker for reading figure nodes
- [ ] T027 [US5] Add figure reference rendering to PDF export in app/lib/pdf-template.server.ts — in renderNode, add case for "figureReference" node type; read targetFigureId attribute; look up current figure number from the figureCounter map (built during figure rendering); output <span class="figure-ref">Figur {number}</span>; handle missing figure (reference to deleted figure): output "Figur ?" with warning class
- [ ] T028 [US5] Register figure-reference extension in editor configuration in app/components/editor/Editor.tsx — import FigureReference from extensions/figure-reference.ts; add to Tiptap extensions array; import and render FigureReferencePicker modal; wire up toolbar callback

**Checkpoint**: User Story 5 fully functional — figure cross-references work in editor and PDF

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Error handling, type safety, and validation across all stories.

- [ ] T029 Add error handling for expired/revoked GitHub tokens in app/lib/github.server.ts — in getUserGitHubToken(), if decrypted token is invalid (401 from GitHub), set github_token_encrypted to NULL; in API routes using user tokens, return user-friendly error prompting re-authentication via GitHub OAuth
- [ ] T030 Add file size validation in app/routes/api.render-figure.$figureId.tsx — before uploading to storage, check buffer size; reject files >10MB with descriptive error; update figure status to 'error' with size limit message
- [ ] T031 Run make check (typecheck + lint) and fix any type errors or lint violations across all modified files
- [ ] T032 Verify make db-reset applies all migrations cleanly and seed data still works

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 (Setup)**: No dependencies — T001, T002, T003 can run in parallel; T004 and T005 can run in parallel with migrations
- **Phase 2 (US1)**: Depends on Phase 1 completion (needs workspace_repositories table)
- **Phase 3 (US2)**: Depends on Phase 1 (needs figures columns + storage) and Phase 2 (needs connected repos to browse)
- **Phase 4 (US3)**: Depends on Phase 3 (needs figure insertion + render API working)
- **Phase 5 (US4)**: Depends on Phase 1 only (numbering works on any figure node, independent of sync)
- **Phase 6 (US5)**: Depends on Phase 5 (needs numbering plugin to resolve references)
- **Phase 7 (Polish)**: Depends on all desired user stories being complete

### User Story Dependencies

- **US1 (Connect Repo)**: Foundational — required by US2 and US3
- **US2 (Browse & Insert)**: Depends on US1 (needs connected repos)
- **US3 (Auto Sync)**: Depends on US2 (needs render pipeline and cached images)
- **US4 (Auto Numbering)**: Independent — can run after Phase 1, in parallel with US2/US3
- **US5 (Cross-References)**: Depends on US4 (needs numbering plugin)

### Parallel Opportunities

- T001, T002, T003 (migrations) can all run in parallel
- T004, T005 (auth + utility) can run in parallel with migrations
- US4 can be developed in parallel with US2 and US3
- T024 (figure-reference extension) can run in parallel with T025 (picker UI)

---

## Parallel Example: Phase 1 Setup

```bash
# Launch all migrations in parallel:
Task T001: "Create workspace_repositories table in supabase/migrations/009_workspace_repositories.sql"
Task T002: "Add caching columns to figures in supabase/migrations/010_figures_caching.sql"
Task T003: "Create figures storage bucket in supabase/migrations/011_figures_storage.sql"

# Launch auth + utility in parallel:
Task T004: "Update auth callback in app/routes/_auth.callback.tsx"
Task T005: "Add getUserGitHubToken() in app/lib/github.server.ts"
```

## Parallel Example: US4 alongside US2/US3

```bash
# While US2/US3 work on sync pipeline, US4 can independently develop:
Task T021: "Create ProseMirror figure numbering plugin"
Task T022: "Update figure NodeView for Figur N display"
Task T023: "Add figure numbering to PDF export"
```

---

## Implementation Strategy

### MVP First (User Stories 1 + 2)

1. Complete Phase 1: Setup (migrations + auth token)
2. Complete Phase 2: US1 (connect/disconnect repos)
3. Complete Phase 3: US2 (browse + insert figures)
4. **STOP and VALIDATE**: Connect a repo, browse files, insert figures
5. Deploy/demo if ready — users can already insert figures from GitHub

### Incremental Delivery

1. Setup + US1 → repo connections work
2. + US2 → figure insertion from browser works
3. + US3 → figures auto-sync on GitHub changes
4. + US4 → figures auto-numbered "Figur N:"
5. + US5 → cross-references work
6. Each story adds value without breaking previous stories

---

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps task to specific user story for traceability
- Each user story should be independently completable and testable
- Commit after each task or logical group
- Stop at any checkpoint to validate story independently
- The .drawio SVG conversion (T016) is the highest-risk task — prototype early
