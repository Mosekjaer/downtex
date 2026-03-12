# Research: Downtex — Collaborative Academic Document Editor

**Branch**: `001-collab-academic-editor`
**Date**: 2026-03-12

## R1: Yjs + Supabase Realtime Integration

**Decision**: Use a custom Yjs provider built on Supabase Realtime channels (not y-supabase).

**Rationale**: The `y-supabase` library is community-maintained and may not keep pace with Supabase Realtime API changes. A custom provider gives full control over the sync protocol, error recovery, and presence handling. The implementation wraps Supabase Realtime's broadcast channel to send/receive Yjs update messages, and uses Supabase Realtime presence for cursor and avatar state.

**Alternatives considered**:
- `y-supabase`: Simpler setup but limited control over reconnection logic and presence integration. No guarantee of maintenance.
- `y-websocket` + separate WebSocket server: Would require deploying and maintaining a separate Yjs WebSocket server alongside the Remix app. Adds operational complexity that violates Principle I (Simplicity).
- `y-indexeddb` for persistence only: Insufficient for multi-user sync — only handles local offline persistence.

**Implementation approach**:
1. Client creates a Yjs `Doc` and a custom `SupabaseProvider` class
2. Provider subscribes to Supabase Realtime channel `doc:{documentId}`
3. On local Yjs update → broadcast via channel
4. On channel message → apply update to local Yjs doc
5. On connect → fetch full Yjs state vector from database (stored as binary in `documents.yjs_state`)
6. Presence: use `channel.track()` for cursor position and user identity

## R2: Tiptap Extension Architecture

**Decision**: Use Tiptap v2 with custom extensions for academic-specific block types.

**Rationale**: Tiptap's extension system is ProseMirror-based and well-documented. It supports Yjs collaboration natively via `@tiptap/extension-collaboration` and `@tiptap/extension-collaboration-cursor`. Custom extensions for math (KaTeX), footnotes, figures, and cross-references can be built as standard Tiptap Node/Mark extensions.

**Custom extensions required**:
- `MathInline` — inline KaTeX rendering (Mark extension)
- `MathBlock` — block-level centered equation (Node extension)
- `Footnote` — superscript reference with collection at export time (Mark extension)
- `Figure` — draw.io SVG preview with caption (Node extension, non-editable content + editable caption)
- `DocumentMention` — `@document` autocomplete and link (Node extension using Tiptap's Suggestion utility)
- `SectionReference` — `@section` autocomplete resolving to heading numbers (Node extension using Suggestion)

**Built-in extensions to include**:
- `StarterKit` (paragraphs, headings, bold, italic, strike, code, blockquote, horizontal rule, lists)
- `Underline`
- `CodeBlockLowlight` (syntax highlighting via lowlight/highlight.js)
- `Table`, `TableRow`, `TableCell`, `TableHeader`
- `Collaboration` (Yjs binding)
- `CollaborationCursor` (remote cursors)

## R3: PDF Export with Puppeteer

**Decision**: Server-side PDF generation using Puppeteer rendering an internal HTML page.

**Rationale**: Puppeteer provides the highest fidelity for converting rich HTML/CSS to PDF. Running it as a Remix action on the VPS (not serverless) avoids cold start issues and allows Chromium to be pre-installed in the Docker image. The approach renders the document to a styled HTML template at an internal route (`/render/$docId?token=...`), which Puppeteer then prints to PDF.

**Alternatives considered**:
- `react-pdf` / `@react-pdf/renderer`: Does not support arbitrary HTML/CSS rendering. Would require reimplementing all editor block types as react-pdf components — enormous effort and maintenance burden.
- `pdfmake`: Same issue — proprietary document model, cannot reuse editor styles.
- `wkhtmltopdf`: Legacy, less reliable than Puppeteer, fewer CSS features supported.
- `Playwright` instead of Puppeteer: Both are viable. Puppeteer is lighter (Chromium only) and has better PDF generation APIs (`page.pdf()` with header/footer template support).

**PDF template structure**:
1. Front page: title, authors, workspace, date (full page, centered)
2. Table of contents: auto-generated from headings with `page` CSS counter
3. Body: all content with running headers (document title left, workspace right) and footers (page number centered)
4. CSS `@page` rules for A4 sizing, margins, header/footer
5. CSS counters for section numbering, figure numbering, table numbering, equation numbering
6. KaTeX CSS included inline for math rendering

## R4: Supabase RLS Strategy

**Decision**: RLS policies on every table, with helper functions for role resolution.

**Rationale**: Per Constitution Principle VI, RLS is the security boundary. Application-level checks are supplementary but never sufficient alone. The RLS policies use PostgreSQL functions to resolve a user's effective role (workspace role merged with document-level override).

**Key patterns**:
- `get_user_workspace_role(workspace_id, user_id)` — returns the user's role in a workspace
- `get_user_document_role(document_id, user_id)` — returns the higher of workspace role and document-level override
- `is_public_document(document_id)` — checks if a public link exists
- SELECT policies: user must be a workspace member or document collaborator, OR document has a public link (for read-only)
- INSERT/UPDATE/DELETE policies: user must have appropriate role (editor+ for content, owner for destructive operations)

**Public link access**: Handled via a service-role edge function proxy. The client calls a public edge function with the token, which validates the token and returns document content using the service role. The service role key never reaches the client.

## R5: Auto-Save and Snapshot Architecture

**Decision**: Yjs state persisted to `documents.yjs_state` (binary column) via debounced writes; snapshots stored as separate rows with full document JSON.

**Rationale**: The Yjs binary state is compact and contains the full CRDT history needed for sync. Storing it in a binary column on the `documents` table allows efficient load on document open. Snapshots are stored separately as decoded JSON (human-readable) for preview and restore. The debounced auto-save (2s after last edit) writes the Yjs binary state. The daily snapshot edge function decodes the binary state to JSON for the snapshot row.

**Auto-save flow**:
1. User types → Yjs doc updates locally
2. Custom provider broadcasts update to Supabase Realtime channel
3. After 2s of no edits, provider writes full Yjs state vector to `documents.yjs_state` via a Remix action
4. Only one client per document is the "persistence leader" (elected via presence) to avoid write conflicts

**Snapshot restore flow**:
1. User selects a snapshot in Version History
2. Remix action decodes snapshot JSON back to Yjs binary state
3. Replaces `documents.yjs_state` in database
4. Broadcasts a "force-reload" message on the Realtime channel
5. All connected clients reload the Yjs doc from the new state

## R6: Draw.io SVG Conversion

**Decision**: Parse `.drawio` XML to SVG using `@xmldom/xmldom` in a Supabase Edge Function.

**Rationale**: `.drawio` files are XML-based (mxGraph format). The conversion to SVG requires parsing the XML, extracting cell geometries, and rendering them as SVG elements. The `@xmldom/xmldom` library handles XML parsing in Deno (edge function runtime). The converted SVG is stored in the `figures.svg_content` column and served directly to the editor.

**Alternatives considered**:
- draw.io's own export API: draw.io does not provide a public API for server-side SVG export. The desktop app and web app handle rendering client-side.
- Headless browser rendering: Could load draw.io's viewer in Puppeteer and screenshot — but this is heavyweight for a cron job processing many figures.
- Client-side rendering: Would require loading the draw.io JavaScript library in the browser. Increases bundle size (violates Principle IV) and complicates caching.

**Note**: The `.drawio` XML to SVG conversion is non-trivial. The mxGraph format encodes cells, edges, styles, and geometries. A simpler initial approach: use draw.io's embed URL format to render an `<iframe>` in the editor, and for PDF export, use Puppeteer to screenshot the iframe. This avoids parsing mxGraph XML entirely. The edge function would only need to detect file changes (SHA comparison) and invalidate the client cache.

**Revised decision**: Use draw.io's embed viewer for editor preview (iframe), and Puppeteer screenshot for PDF export. The edge function polls GitHub for SHA changes and updates the `figures.last_sha` column. The client re-fetches the embed when `last_sha` changes.

## R7: OAuth Account Linking

**Decision**: Use Supabase Auth's built-in identity linking feature.

**Rationale**: Supabase Auth supports linking multiple OAuth identities to a single user account via `supabase.auth.linkIdentity()`. When a user signs in with GitHub first and later signs in with Google using the same email, Supabase can auto-link the identities. For different emails, the user can manually link from settings using `linkIdentity()`. This avoids building custom account merging logic.

## R8: Comment Anchoring

**Decision**: Store comment anchors as ProseMirror decoration marks mapped to document positions, with fallback to text content matching.

**Rationale**: Tiptap/ProseMirror positions are integers that can shift as the document is edited. Storing raw positions would break anchoring after edits. Instead:
1. Comments store the anchor as a Yjs relative position (`Y.createRelativePositionFromTypeIndex`)
2. Yjs relative positions survive concurrent edits because they reference the CRDT structure, not absolute offsets
3. On render, the relative position is resolved to an absolute position and a ProseMirror decoration is applied
4. If resolution fails (text was deleted), the comment is shown as "orphaned" in the comments panel

This approach integrates naturally with the Yjs CRDT layer and handles concurrent edits correctly.
