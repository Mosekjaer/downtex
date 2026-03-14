# Feature Specification: GitHub Repository Figure Sync & Auto-Numbering

**Feature Branch**: `003-github-figure-sync`
**Created**: 2026-03-14
**Status**: Draft
**Input**: User description: "A feature that makes it possible to users to connect their github repositories to a workspace and add images, drawio files etc (drawio files need to be exported to image I suppose somehow) and then keep them synced and up to date if there is any changes to the github repository. Then all images will always be up to date with the latest version and it also needs to support automatic figure numbers if that is not present in the code already. The figure numbers should Figur {number}: description"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Connect a GitHub Repository to a Workspace (Priority: P1)

A workspace owner or editor connects a GitHub repository to their workspace so that all collaborators can browse and insert figures from that repository. The user navigates to workspace settings, adds a repository by providing the GitHub repository URL (or selecting from their accessible repos), and the system validates access and stores the connection.

**Why this priority**: Without a workspace-level repository connection, users cannot browse or insert figures from GitHub. This is the foundational capability all other stories depend on.

**Independent Test**: Can be fully tested by connecting a repo in workspace settings and verifying it appears in the connected repositories list.

**Acceptance Scenarios**:

1. **Given** a user with editor or owner role in a workspace, **When** they navigate to workspace settings and add a GitHub repository URL, **Then** the system validates access to the repository and stores the connection, displaying it in the list of connected repositories.
2. **Given** a user with viewer or commenter role, **When** they attempt to add a repository connection, **Then** the system denies the action and shows an appropriate message.
3. **Given** a user adds a repository they don't have access to, **When** the system validates the connection, **Then** it shows an error explaining the repository is inaccessible.
4. **Given** a workspace with a connected repository, **When** an editor removes the connection, **Then** the repository is disconnected but existing figures already inserted into documents remain visible (with a warning if the source becomes unavailable).

---

### User Story 2 - Browse and Insert Figures from Connected Repositories (Priority: P1)

An editor working on a document opens the figure picker, browses connected repositories, navigates folders, and selects an image file (PNG, JPG, SVG) or a .drawio file to insert as a figure. The system renders it in the document with a caption field.

**Why this priority**: This is the core user interaction — inserting figures from GitHub into documents. Currently users must manually paste URLs; browsing makes the feature usable for non-technical collaborators.

**Independent Test**: Can be fully tested by connecting a repo, opening the figure picker, browsing to an image or .drawio file, inserting it, and verifying it renders in the document.

**Acceptance Scenarios**:

1. **Given** a workspace with connected repositories and a user editing a document, **When** they click the figure insert button, **Then** the figure picker shows a "Browse repos" tab listing all connected repositories.
2. **Given** the user selects a connected repository, **When** they navigate the file tree, **Then** only supported file types are shown as selectable (PNG, JPG, JPEG, GIF, SVG, .drawio, .drawio.svg, .drawio.png).
3. **Given** the user selects a .drawio file, **When** they confirm the selection, **Then** the system exports the .drawio file to a rendered image and inserts it as a figure in the document.
4. **Given** the user selects a standard image file (PNG, JPG, SVG), **When** they confirm the selection, **Then** the system inserts it directly as a figure with the image rendered inline.
5. **Given** a figure is inserted, **When** viewing the document, **Then** the figure displays with an editable caption field below it.

---

### User Story 3 - Automatic Figure Sync on Repository Changes (Priority: P1)

When a file in a connected GitHub repository changes (new commit), the system detects the change and updates all figures referencing that file across all documents in the workspace. Users always see the latest version of every figure without manual intervention.

**Why this priority**: Keeping figures in sync with the source repository is the central value proposition — ensuring documents always reflect the latest diagrams and images.

**Independent Test**: Can be fully tested by inserting a figure, changing the source file in GitHub, waiting for the sync cycle, and verifying the figure updates in the document.

**Acceptance Scenarios**:

1. **Given** a document contains a figure linked to a GitHub file, **When** the file is updated in GitHub (new SHA detected), **Then** the figure in the document updates to reflect the latest version within 5 minutes.
2. **Given** a .drawio file is updated in GitHub, **When** the sync detects the change, **Then** the system re-exports the .drawio file to an image and updates the rendered figure.
3. **Given** a linked file is deleted from the repository, **When** the sync detects the deletion, **Then** the figure shows a clear error state indicating the source file is no longer available, while preserving the last known version.
4. **Given** the GitHub API is temporarily unavailable, **When** the sync cycle runs, **Then** existing figures continue to display their last known version and the system retries on the next cycle.

---

### User Story 4 - Automatic Figure Numbering (Priority: P2)

All figures in a document are automatically numbered sequentially in the format "Figur {number}: {caption}". Numbers update dynamically when figures are added, removed, or reordered. The numbering is consistent across the editor view and PDF export.

**Why this priority**: Automatic numbering improves document quality and saves time, but is not blocking for the core GitHub sync functionality.

**Independent Test**: Can be fully tested by inserting three figures with captions, verifying they display "Figur 1:", "Figur 2:", "Figur 3:", then removing the second and verifying renumbering to "Figur 1:", "Figur 2:".

**Acceptance Scenarios**:

1. **Given** a document with no figures, **When** a user inserts a figure with caption "Architecture overview", **Then** it displays as "Figur 1: Architecture overview".
2. **Given** a document with three figures, **When** the user removes the second figure, **Then** the remaining figures renumber to "Figur 1" and "Figur 2".
3. **Given** a document with numbered figures, **When** the user inserts a new figure between existing ones, **Then** all subsequent figures renumber accordingly.
4. **Given** a document with numbered figures, **When** the document is exported to PDF, **Then** the figure numbers in the PDF match the editor exactly.
5. **Given** multiple users are editing the same document simultaneously, **When** one user inserts a figure, **Then** all collaborators see consistent figure numbering after sync.

---

### User Story 5 - Cross-Reference Figures by Number (Priority: P3)

Users can reference figures by their automatic number elsewhere in the document text (e.g., "as shown in Figur 3"). When figure numbers change due to reordering, these references update automatically.

**Why this priority**: Cross-references add significant value for academic documents but are an enhancement on top of the core numbering system.

**Independent Test**: Can be fully tested by inserting a figure reference in text, then reordering figures and verifying the reference updates.

**Acceptance Scenarios**:

1. **Given** a document with numbered figures, **When** a user inserts a figure reference, **Then** they can select from a list of available figures showing their number and caption.
2. **Given** a document with figure references, **When** a figure is removed or reordered causing numbers to change, **Then** all references to that figure update to reflect the new number.
3. **Given** a document with figure references, **When** exported to PDF, **Then** the references display the correct figure numbers.

---

### Edge Cases

- What happens when a connected repository is made private after connection? The system should detect the access error and mark affected figures with a warning.
- What happens when the same file is used as a figure in multiple documents? Each document's figure should update independently when the source changes.
- What happens when a .drawio file contains multiple pages? The system should export the first page by default, with an option to select a specific page.
- What happens when a user's GitHub token expires? The system should prompt re-authentication and continue using the service-level token for background polling.
- What happens when a very large image file (>10MB) is selected? The system should warn the user and either reject or compress the image.
- What happens when figure numbering conflicts during simultaneous editing? Yjs CRDT ordering should deterministically resolve numbering.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST allow workspace owners and editors to connect GitHub repositories to a workspace.
- **FR-002**: System MUST validate that the user has read access to a repository before establishing the connection.
- **FR-003**: System MUST allow users to disconnect a repository from a workspace.
- **FR-004**: System MUST provide a file browser within the figure picker that shows the contents of connected repositories.
- **FR-005**: System MUST support inserting the following file types as figures: PNG, JPG, JPEG, GIF, SVG, .drawio, .drawio.svg, .drawio.png.
- **FR-006**: System MUST convert .drawio files to a static rendered image (SVG preferred, PNG fallback) and cache the result. No iframe embeds — .drawio figures display as static images in both editor and PDF export.
- **FR-007**: System MUST periodically check connected repositories for file changes using SHA comparison.
- **FR-008**: System MUST automatically update cached rendered images when their source files change in GitHub.
- **FR-009**: System MUST display figures with automatic sequential numbering in the format "Figur {number}: {caption}".
- **FR-010**: System MUST dynamically renumber all figures when figures are added, removed, or reordered in a document.
- **FR-011**: System MUST render figure numbers consistently between the editor view and PDF export.
- **FR-012**: System MUST show an error state on figures when the source file becomes unavailable, while preserving the last known rendered version.
- **FR-013**: System MUST enforce workspace role permissions — only editors and owners can connect repositories and insert figures.
- **FR-014**: System MUST support figure cross-references that update automatically when figure numbers change.

### Key Entities

- **Workspace Repository Connection**: Represents the link between a workspace and a GitHub repository. Stores the repository identifier, connection status, and the user who connected it. Always tracks the repository's default branch.
- **Figure**: A visual element in a document sourced from a connected GitHub repository. Tracks the source file (repo + path), the last known content hash (SHA), a cached rendered image stored in own storage, caption, and sync status.
- **Figure Reference**: An inline reference within document text that points to a specific figure by its identity, displaying the current figure number.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Users can connect a GitHub repository to a workspace and browse its contents within 30 seconds.
- **SC-002**: Figures inserted from GitHub repositories update to reflect source changes within 5 minutes of the change being pushed.
- **SC-003**: All figures in a document display correct sequential numbering ("Figur 1:", "Figur 2:", etc.) at all times, including after insertions, deletions, and reordering.
- **SC-004**: Figure numbering in PDF exports matches the editor view exactly.
- **SC-005**: .drawio files render as clear, readable images in both the editor and PDF export.
- **SC-006**: 95% of figure sync operations complete without requiring user intervention.
- **SC-007**: Users can insert a figure from a connected repository in 3 clicks or fewer (open picker, select repo, select file).

## Clarifications

### Session 2026-03-14

- Q: Should repo connections track a specific branch or always use the default branch? → A: Always track the default branch (e.g., `main`). No branch selection UI.
- Q: Should rendered figure images be cached in own storage or fetched from GitHub on each load? → A: Cache all rendered images in own storage for fast loads, offline resilience, and reliable PDF export.
- Q: Should .drawio files be converted to static images or keep the current iframe embed approach? → A: Convert .drawio to static SVG/PNG. No iframe embeds — all figures render as cached static images consistently.

## Assumptions

- Users authenticate with GitHub via OAuth, and the existing GitHub token flow is reused for repository access validation.
- The background polling mechanism (Supabase Edge Function) already in place will be extended to support the new workspace-level repository connections.
- .drawio to image conversion will use a server-side rendering approach, producing static SVG/PNG. The current iframe embed approach will be replaced with cached static images.
- Figure numbering uses the Danish/Norwegian "Figur" label as specified, not "Figure" (English).
- The existing figures database table will be extended to accommodate workspace-level repository connections and image caching.
- A service-level GitHub token is available for background polling, separate from individual user tokens.
