# Feature Specification: Downtex — Collaborative Academic Document Editor

**Feature Branch**: `001-collab-academic-editor`
**Created**: 2026-03-12
**Status**: Draft
**Input**: User description: "Build Downtex — a collaborative academic document editor for university students"

## User Scenarios & Testing *(mandatory)*

### User Story 1 — Solo Academic Writing (Priority: P1)

A university student signs in with GitHub or Google, lands in their personal workspace, creates a new document inside a folder, and writes an academic report using rich text formatting — headings, paragraphs, lists, math equations, code blocks, and footnotes. When finished, the student exports the document as a university-style PDF with auto-numbered sections, figures, tables, and a table of contents. The PDF is ready to submit.

**Why this priority**: This is the core value proposition. A single user must be able to write and export a complete academic document before any collaboration features matter.

**Independent Test**: Create an account, create a folder and document, write content using every block type, export to PDF, and verify the output matches university report formatting.

**Acceptance Scenarios**:

1. **Given** a new user, **When** they sign in via GitHub OAuth, **Then** they are redirected to their personal workspace with an empty folder tree.
2. **Given** an authenticated user in their workspace, **When** they create a folder and a new document inside it, **Then** the document appears in the sidebar under the correct folder.
3. **Given** a document open in the editor, **When** the user types paragraphs, headings (H1–H4), bold/italic/underline text, bullet lists, numbered lists, blockquotes, horizontal rules, inline code, footnote references, inline math (LaTeX), math blocks, code blocks with syntax highlighting, and tables, **Then** each block type renders correctly in the editor.
4. **Given** a document with headings, figures, tables, footnotes, and math blocks, **When** the user exports to PDF, **Then** the output is A4, includes a front page (title, author, workspace, date), a table of contents with correct page numbers, hierarchical section numbering, auto-numbered figures/tables/equations, per-page footnotes, running headers and footers, and serif body text.
5. **Given** a document, **When** the user makes edits, **Then** changes are auto-saved within 2 seconds with no manual save action required.

---

### User Story 2 — Real-Time Collaborative Editing (Priority: P2)

Two or more students open the same document simultaneously. Each sees the others' cursors with colored labels. All edits sync instantly with no conflicts. Presence indicators (avatars) appear in the editor top bar. When a user closes the tab, their cursor and avatar disappear.

**Why this priority**: Real-time collaboration is the second pillar of the product. It requires the editor from P1 to exist first, but fundamentally differentiates Downtex from offline tools.

**Independent Test**: Two browser sessions open the same document, both type simultaneously, and verify changes appear in both sessions within 1 second with no data loss.

**Acceptance Scenarios**:

1. **Given** two users with Editor access to the same document, **When** both open the document simultaneously, **Then** each user sees the other's cursor with a colored label showing their display name.
2. **Given** two users editing the same document, **When** User A types a paragraph, **Then** User B sees the change appear in real time without refreshing.
3. **Given** two users editing the same paragraph simultaneously, **When** both type at different positions, **Then** both edits are preserved without conflict or data loss.
4. **Given** three users viewing a document, **When** User C closes the tab, **Then** User C's cursor and avatar disappear from the other users' views within 5 seconds.

---

### User Story 3 — Workspace and Folder Organization (Priority: P3)

A student organizes their documents into folders and subfolders within their personal workspace. They can also create a team workspace, invite classmates, and organize shared documents. The sidebar shows the full folder tree with drag-and-drop reordering, search, and workspace switching.

**Why this priority**: Organization is essential for daily use but can be minimal (flat list) in an MVP. Full folder hierarchy and team workspaces are needed before the product feels complete.

**Independent Test**: Create nested folders, move documents between them via drag-and-drop, create a team workspace, invite a member, and verify the sidebar reflects all changes correctly.

**Acceptance Scenarios**:

1. **Given** a personal workspace, **When** the user creates a folder, a subfolder inside it, and a document inside the subfolder, **Then** the sidebar shows the correct nested hierarchy.
2. **Given** multiple documents and folders, **When** the user drags a document from one folder to another, **Then** the document moves and the sidebar updates immediately.
3. **Given** a user, **When** they create a team workspace with a name and avatar, **Then** the workspace appears in the workspace switcher at the top of the sidebar.
4. **Given** a team workspace, **When** the owner invites a classmate by email, **Then** the classmate receives an invitation and can access the workspace after accepting.
5. **Given** a workspace with many documents, **When** the user types in the search bar, **Then** matching documents and folders appear as results across the entire workspace.

---

### User Story 4 — Permissions and Sharing (Priority: P4)

A team workspace owner assigns roles (Owner, Editor, Commenter, Viewer) to members. Any document can also be shared individually with role overrides or via a public read-only link. Permissions are enforced — a Viewer cannot edit, a Commenter can only comment.

**Why this priority**: Permissions are critical for trust and security in shared academic work, but require workspaces and collaboration to exist first.

**Independent Test**: Assign different roles to team members, verify each role can only perform their allowed actions, share a document via public link, and verify anonymous read-only access.

**Acceptance Scenarios**:

1. **Given** a team workspace with an Owner and an Editor, **When** the Editor tries to delete the workspace, **Then** the action is denied.
2. **Given** a document shared with a user as Commenter, **When** the Commenter tries to edit document content, **Then** the editor is read-only and only comment actions are available.
3. **Given** a document shared with a user as Viewer, **When** the Viewer opens the document, **Then** they see the content in read-only mode with no comment or edit options.
4. **Given** a document with a public link enabled, **When** an anonymous user opens the link, **Then** they see the document content in read-only mode without needing to log in.
5. **Given** a document-level share set to Editor, **When** the user's workspace role is Viewer, **Then** the document-level Editor role takes precedence and the user can edit that document.

---

### User Story 5 — Inline Comments and Review (Priority: P5)

A user with Commenter or higher role selects a text range and leaves a comment. A comment thread opens in a sidebar panel anchored to the selected text. Other users can reply. Threads can be resolved and viewed in a "Resolved comments" panel.

**Why this priority**: Comments enable academic review workflows (peer review, advisor feedback) but require the editor and permissions to be in place.

**Independent Test**: Select text, create a comment, reply to it from another account, resolve the thread, and verify it appears in the resolved panel.

**Acceptance Scenarios**:

1. **Given** a user with Editor role, **When** they select a text range and click "Comment", **Then** a comment input appears anchored to that text range in a sidebar panel.
2. **Given** an existing comment thread, **When** another user replies, **Then** the reply appears in the thread for all viewers in real time.
3. **Given** a comment thread, **When** the document author or comment author clicks "Resolve", **Then** the thread is hidden from the main view but remains accessible in the "Resolved comments" panel.
4. **Given** a user with Viewer role, **When** they view a document with comments, **Then** they can see existing comments but cannot create new ones or reply.

---

### User Story 6 — Draw.io Figure Integration (Priority: P6)

A user inserts a "Figure" block, selects a `.drawio` file from a GitHub repository (by pasting a URL or browsing their repos), and the figure renders as an SVG preview with a caption. Downtex polls GitHub every 5 minutes and updates the figure when the source file changes. In the PDF export, figures are auto-numbered.

**Why this priority**: Draw.io integration is a differentiating feature for technical/engineering students but is additive — the editor works fully without it.

**Independent Test**: Insert a figure block, connect it to a `.drawio` file on GitHub, verify the SVG preview renders, modify the file on GitHub, wait for the poll interval, and verify the figure updates.

**Acceptance Scenarios**:

1. **Given** a document in the editor, **When** the user inserts a "Figure" block and pastes a GitHub URL to a `.drawio` file, **Then** the block displays an SVG preview of the diagram with a caption field below it.
2. **Given** a figure block linked to a `.drawio` file, **When** the file is updated on GitHub via a new commit, **Then** the figure updates automatically within 5 minutes for all users viewing the document.
3. **Given** a figure block linked to a private GitHub repository, **When** the user has authenticated via GitHub OAuth, **Then** the figure loads successfully using the user's GitHub access token.
4. **Given** a document with three figure blocks, **When** exported to PDF, **Then** each figure is labeled "Figure 1", "Figure 2", "Figure 3" in order of appearance, with captions displayed below.

---

### User Story 7 — Snapshots and Version History (Priority: P7)

The system creates a daily automatic snapshot of each document. Users can also create manual named snapshots. From a Version History panel, users can preview any snapshot and restore the document to that state.

**Why this priority**: Version history is a safety net. Auto-save (P1) handles continuous persistence, but named snapshots provide peace of mind for major changes.

**Independent Test**: Edit a document, create a manual snapshot, edit further, open Version History, preview the snapshot, restore it, and verify the document reverts.

**Acceptance Scenarios**:

1. **Given** a document that has existed for more than 24 hours, **When** the user opens the Version History panel, **Then** at least one automatic snapshot is listed with a timestamp label.
2. **Given** a document, **When** the user clicks "Create snapshot" and enters the name "Before major restructure", **Then** a snapshot appears in the Version History panel with that name and the current timestamp.
3. **Given** a snapshot in the Version History, **When** the user clicks "Preview", **Then** the document content at that point in time is displayed in a read-only view.
4. **Given** a previewed snapshot, **When** the user clicks "Restore", **Then** the document content reverts to the snapshot state and a new auto-save occurs immediately.

---

### User Story 8 — Cross-Document References (Priority: P8)

While editing, a user types `@` to search and link to another document in the same workspace. They can also reference a specific heading within any document. In the editor these render as clickable links. In the PDF export, document mentions render as hyperlinks and section references resolve to "Section 3.2" with the correct auto-numbered heading.

**Why this priority**: Cross-references are valuable for multi-document academic projects (thesis chapters, lab reports) but are an advanced feature on top of a working editor and export pipeline.

**Independent Test**: Create two documents with headings, insert an `@document` mention and an `@section` reference in one, verify they render as links in the editor, export to PDF, and verify the section reference resolves to the correct number.

**Acceptance Scenarios**:

1. **Given** a workspace with multiple documents, **When** the user types `@` in the editor, **Then** a search dropdown appears listing documents in the workspace, filterable by name.
2. **Given** a selected `@document` mention, **When** the user clicks it in the editor, **Then** the linked document opens.
3. **Given** a `@section` reference to "Introduction" (which is heading 3.2 in the target document), **When** the document is exported to PDF, **Then** the reference renders as "Section 3.2".
4. **Given** a referenced heading that is later moved or renumbered, **When** the referencing document is exported, **Then** the section number updates automatically to reflect the current numbering.

---

### User Story 9 — User and Workspace Settings (Priority: P9)

Users can update their display name, avatar, and notification preferences. Workspace owners can rename the workspace, manage members (invite, change roles, remove), and delete the workspace. Document settings allow changing the title, managing share settings, and deleting the document.

**Why this priority**: Settings are necessary for a complete product but are low-risk and can use simple forms.

**Independent Test**: Change display name, update notification preferences, invite a member to a team workspace, change their role, and verify all changes persist.

**Acceptance Scenarios**:

1. **Given** a signed-in user, **When** they navigate to user settings and change their display name, **Then** the new name appears across all workspaces and documents they participate in.
2. **Given** a workspace owner, **When** they invite a user by email with the Editor role, **Then** the invited user receives a notification and appears in the member list as Editor after accepting.
3. **Given** a workspace owner, **When** they click "Delete workspace" and confirm, **Then** the workspace and all its documents are permanently deleted.
4. **Given** a document, **When** the owner opens document settings and enables a public link, **Then** a shareable URL is generated that grants read-only access to anyone.

---

### Edge Cases

- What happens when a user loses internet connectivity while editing? The editor MUST continue to work offline, queuing changes locally, and sync when connectivity resumes without data loss.
- What happens when two users delete the same paragraph simultaneously? The CRDT MUST resolve this deterministically — the paragraph is deleted once, with no duplicate or ghost content.
- What happens when a `.drawio` file is deleted from GitHub? The figure block MUST display a clear error state ("Source file not found") instead of crashing or showing a blank space.
- What happens when a user tries to restore a snapshot while another user is actively editing? The restore MUST apply to all connected users, and the CRDT state MUST reset to the snapshot content for everyone.
- What happens when a public link document is exported to PDF by the anonymous viewer? Public link viewers MUST NOT be able to export — export is restricted to users with Editor or higher role.
- What happens when a workspace owner removes themselves? The system MUST prevent this — an owner cannot remove themselves without first transferring ownership.
- What happens when a folder is deleted that contains documents? The system MUST prompt for confirmation and delete all contained documents and subfolders recursively.
- What happens when the same user signs in with both GitHub and Google? The system MUST allow linking multiple OAuth providers to a single account so the user does not end up with duplicate accounts.

## Requirements *(mandatory)*

### Functional Requirements

**Authentication & Identity**

- **FR-001**: System MUST support sign-in via GitHub OAuth and Google OAuth. No email/password authentication.
- **FR-002**: On first sign-in, the system MUST create a user profile with display name and avatar pulled from the OAuth provider.
- **FR-003**: Users MUST be able to link multiple OAuth providers to a single account.

**Workspaces**

- **FR-004**: Every user MUST have exactly one personal workspace, created automatically on first sign-in.
- **FR-005**: Users MUST be able to create team workspaces with a name, avatar, and member list.
- **FR-006**: Team workspaces MUST support four roles: Owner, Editor, Commenter, Viewer.
- **FR-007**: The workspace switcher MUST allow instant switching between personal and team workspaces.

**Folders & Documents**

- **FR-008**: Workspaces MUST support folders and subfolders with unlimited nesting depth.
- **FR-009**: Every document MUST belong to exactly one folder.
- **FR-010**: Users MUST be able to create, rename, move (via drag-and-drop), and delete documents and folders.
- **FR-011**: The sidebar MUST display the full folder tree with collapse/expand and search.

**Editor**

- **FR-012**: The editor MUST support the following block types: paragraph, heading 1–4, blockquote, horizontal rule, bullet list (nested), numbered list (nested), code block with syntax highlighting, math block (LaTeX, centered), table (header row, resizable columns, add/remove rows and columns), and draw.io figure.
- **FR-013**: The editor MUST support the following inline formatting: bold, italic, underline, strikethrough, inline code, inline math (LaTeX via KaTeX), and footnote reference.
- **FR-014**: The editor MUST support `@document` mentions and `@section` references within the same workspace.

**Real-Time Collaboration**

- **FR-015**: Multiple users MUST be able to edit the same document simultaneously with conflict-free resolution via CRDT.
- **FR-016**: Each online user's cursor MUST be visible to others with a colored label showing their display name.
- **FR-017**: The editor top bar MUST show avatars of all users currently viewing or editing the document.
- **FR-018**: Presence MUST be ephemeral — when a user closes the tab, their cursor and avatar MUST disappear.

**Comments**

- **FR-019**: Users with Commenter or higher role MUST be able to select a text range and create a comment thread.
- **FR-020**: Comment threads MUST support replies from any user with Commenter or higher role.
- **FR-021**: The document author or comment author MUST be able to resolve a thread. Resolved threads MUST remain accessible in a "Resolved comments" panel.

**Draw.io Integration**

- **FR-022**: Users MUST be able to insert a figure block and link it to a `.drawio` file in a GitHub repository by pasting a URL or browsing connected repos.
- **FR-023**: The system MUST poll the GitHub API every 5 minutes for changes to linked `.drawio` files and update the figure automatically.
- **FR-024**: Figures MUST render as SVG previews in the editor with a caption field below.

**Permissions & Sharing**

- **FR-025**: Team workspace roles (Owner, Editor, Commenter, Viewer) MUST be enforced on all workspace resources.
- **FR-026**: Documents MUST support individual sharing with role assignment that overrides the workspace-level role.
- **FR-027**: Documents MUST support a public link option granting read-only access without authentication.

**Auto-Save & Snapshots**

- **FR-028**: Document changes MUST be auto-saved to the database within 2 seconds of the last edit (debounced).
- **FR-029**: The system MUST create an automatic daily snapshot of each document with a timestamp label.
- **FR-030**: Users MUST be able to create manual named snapshots at any time.
- **FR-031**: From the Version History panel, users MUST be able to preview any snapshot and restore the document to that state.

**PDF Export**

- **FR-032**: The system MUST export documents as A4 PDFs with a front page (title, authors, workspace name, date), table of contents, running headers and footers, and auto-numbered headings, figures, tables, footnotes, and equations.
- **FR-033**: The PDF MUST use a serif font for body text, monospace for code blocks, and render math via KaTeX.
- **FR-034**: The export MUST be deterministic — the same document content MUST produce identical PDF output.

**Settings**

- **FR-035**: Users MUST be able to update their display name, avatar, connected OAuth accounts, and notification preferences.
- **FR-036**: Workspace owners MUST be able to manage workspace name, avatar, member roles, and delete the workspace.
- **FR-037**: Document owners MUST be able to manage document title, share settings, version history, and delete the document.

### Key Entities

- **User**: Represents an authenticated person. Attributes: display name, avatar URL, linked OAuth providers, notification preferences.
- **Workspace**: A container for documents. Can be personal (one per user) or team (shared). Attributes: name, avatar, type (personal/team).
- **Workspace Member**: Links a user to a team workspace with a role. Attributes: user reference, workspace reference, role (Owner/Editor/Commenter/Viewer).
- **Folder**: Organizes documents within a workspace. Supports unlimited nesting. Attributes: name, parent folder reference, workspace reference, sort order.
- **Document**: An academic document within a folder. Attributes: title, folder reference, created/updated timestamps, CRDT state.
- **Document Share**: Grants a specific user a role on a specific document, overriding workspace role. Attributes: document reference, user reference, role, public link flag.
- **Comment Thread**: A comment anchored to a text range in a document. Attributes: document reference, text range anchor, resolved status, created by, created at.
- **Comment**: A single message within a thread. Attributes: thread reference, author, body text, created at.
- **Figure Reference**: Links a document figure block to a GitHub `.drawio` file. Attributes: document reference, block ID, GitHub repo, file path, last synced commit SHA, caption.
- **Snapshot**: A point-in-time copy of a document. Attributes: document reference, name (auto-generated or user-provided), document content, created at, type (automatic/manual).

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A new user can sign in, create a document, write content using all supported block types, and export a correctly formatted PDF within 10 minutes on first use.
- **SC-002**: Two users editing the same document simultaneously experience sync latency of less than 1 second under normal network conditions, with zero data loss.
- **SC-003**: Document auto-save completes within 2 seconds of the last keystroke, verified by no unsaved changes persisting after a browser crash.
- **SC-004**: PDF export produces deterministic output — exporting the same document twice yields byte-identical PDFs.
- **SC-005**: The editor maintains smooth typing and scrolling performance (no perceptible lag) for documents up to 100 pages with 50 embedded figures.
- **SC-006**: Permission enforcement has zero bypass paths — a Viewer cannot edit, a Commenter cannot delete, and an anonymous public link user cannot access any write operation.
- **SC-007**: Draw.io figures update within 6 minutes of a source file change on GitHub (5-minute poll interval + 1-minute processing).
- **SC-008**: Daily automatic snapshots are created for 100% of active documents with zero missed days.
- **SC-009**: 90% of first-time users can create a team workspace, invite a member, and collaboratively edit a document without consulting help documentation.
- **SC-010**: The application loads the editor view (document ready for typing) in under 3 seconds on a standard broadband connection.
