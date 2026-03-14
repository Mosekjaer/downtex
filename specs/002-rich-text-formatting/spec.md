# Feature Specification: Rich Text Formatting & Tables

**Feature Branch**: `002-rich-text-formatting`
**Created**: 2026-03-14
**Status**: Draft
**Input**: User description: "Feature for more tools like word has. Need font type, font size and so much more. Different table designs that look very good, latex support so they can write latex inline and centered and stuff like that."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Text Formatting Controls (Priority: P1)

A user writing an academic document needs to control the visual presentation of their text. They select a paragraph or word and change the font family (e.g., from the default Georgia serif to a sans-serif like Arial), adjust the font size (e.g., make a title larger or a footnote smaller), change the text color for emphasis, and set text alignment (left, center, right, or justified). They can also adjust line spacing, paragraph spacing, indentation, letter spacing, and apply superscript or subscript formatting. These controls are accessible from a toolbar, similar to how word processors work.

**Why this priority**: Font and text formatting are the most fundamental features users expect from any document editor. Without them, Downtex feels incomplete compared to alternatives like Google Docs or Word.

**Independent Test**: Can be fully tested by opening a document, selecting text, and applying font family, size, color, alignment, spacing, and indentation changes — each change should be immediately visible in the editor and persist after save.

**Acceptance Scenarios**:

1. **Given** a document with text, **When** the user selects a word and picks a different font family from the toolbar, **Then** the selected text renders in the chosen font immediately.
2. **Given** a document with text, **When** the user selects a paragraph and changes the font size, **Then** the text resizes accordingly and surrounding content reflows.
3. **Given** a document with text, **When** the user selects text and picks a text color, **Then** the text displays in the chosen color.
4. **Given** a paragraph, **When** the user sets alignment to "center," **Then** the paragraph aligns to the center of the page.
5. **Given** formatted text, **When** another collaborator opens the same document, **Then** they see the same formatting applied in real time.

---

### User Story 2 - Enhanced Table Designs (Priority: P2)

A user creating an academic paper needs to insert professional-looking tables. They select from several pre-designed table styles (e.g., striped rows, bordered, minimal/academic, colorful header). They can also merge and split cells, toggle header rows, and apply background colors to individual cells. Tables should look polished both in the editor and in PDF exports.

**Why this priority**: Tables are critical for academic documents (data presentation, comparison tables, results). The current basic table styling looks plain and doesn't match the quality expected in published papers.

**Independent Test**: Can be fully tested by inserting a table, applying different style presets, merging/splitting cells, and verifying the table looks correct in both the editor and PDF export.

**Acceptance Scenarios**:

1. **Given** the editor toolbar, **When** the user inserts a table, **Then** they can choose from at least 4 distinct table style presets.
2. **Given** an existing table, **When** the user selects a different style preset, **Then** the table appearance updates immediately.
3. **Given** a table with multiple cells, **When** the user selects two adjacent cells and merges them, **Then** the cells combine into one spanning cell.
4. **Given** a merged cell, **When** the user splits it, **Then** it returns to the original number of cells.
5. **Given** a styled table, **When** the document is exported to PDF, **Then** the table retains its styling and looks professional.

---

### User Story 3 - Live LaTeX Math Rendering (Priority: P3)

A user writing a math-heavy paper types LaTeX expressions inline (e.g., `$E = mc^2$`) or as centered display equations (e.g., `$$\int_0^\infty e^{-x} dx = 1$$`). Currently, math expressions only render in the PDF export. Users need to see rendered math directly in the editor while typing, with a way to click on rendered math to edit the raw LaTeX source. For users less familiar with LaTeX syntax, a symbol palette in the Math toolbar group provides clickable categories (Greek letters, operators, fractions, integrals, matrices, arrows, accents) that insert the corresponding LaTeX snippet.

**Why this priority**: Math rendering in the editor is a core expectation for an academic document tool. Seeing rendered output while writing dramatically improves the authoring experience and reduces errors.

**Independent Test**: Can be fully tested by typing inline and block LaTeX expressions and verifying they render as formatted math in the editor without needing to export to PDF.

**Acceptance Scenarios**:

1. **Given** the editor, **When** the user types `$x^2$` and moves the cursor away, **Then** the expression renders as formatted math inline with surrounding text.
2. **Given** the editor, **When** the user types `$$` at the start of a line followed by a LaTeX expression and `$$`, **Then** the expression renders as a centered display equation.
3. **Given** a rendered math expression, **When** the user clicks on it, **Then** the raw LaTeX source becomes editable in place.
4. **Given** an invalid LaTeX expression (e.g., `$\frac{$`), **When** the user moves away, **Then** the editor shows a clear error indicator rather than crashing or showing nothing.
5. **Given** a document with rendered math, **When** exported to PDF, **Then** the math renders identically to how it appears in the editor.

---

### User Story 4 - Highlight and Background Color (Priority: P4)

A user wants to highlight text with a background color for emphasis or annotation purposes (e.g., yellow highlight for review items, colored backgrounds for table cells or text blocks). They select text and pick a highlight/background color from a color picker in the toolbar.

**Why this priority**: Highlighting is commonly used for collaboration and review workflows, but is less critical than core text formatting and tables.

**Independent Test**: Can be fully tested by selecting text, applying a highlight color, and verifying it displays correctly and persists.

**Acceptance Scenarios**:

1. **Given** selected text, **When** the user picks a highlight color, **Then** the text background changes to that color.
2. **Given** highlighted text, **When** the user removes the highlight, **Then** the text returns to its default background.
3. **Given** highlighted text, **When** exported to PDF, **Then** the highlight color appears in the output.

---

### Edge Cases

- What happens when a user applies a font family that is not available on another collaborator's device? The system should use a fallback font from the same font category (serif, sans-serif, monospace).
- What happens when a user pastes content from an external source (e.g., Word, Google Docs) with rich formatting? The system should preserve supported formatting (bold, italic, font size, color) and gracefully strip unsupported attributes.
- What happens when a user merges cells that contain content in both cells? The content from all merged cells should be combined into the merged cell.
- What happens when LaTeX rendering fails due to an invalid expression? An error indicator should appear in place of the rendered math, and the raw LaTeX should remain accessible for editing.
- What happens when a table style preset is applied to a table with merged cells? The style should apply correctly, respecting the merged cell spans.
- What happens when multiple collaborators simultaneously format the same text? The CRDT conflict resolution should handle concurrent formatting changes gracefully without data loss.

## Clarifications

### Session 2026-03-14

- Q: Should the feature include line spacing, paragraph spacing, indentation, superscript/subscript, and letter spacing beyond what's already specified? → A: Yes, full scope — include all of them.
- Q: How should the new formatting controls be organized in the toolbar? → A: Grouped toolbar with collapsible sections (Text, Paragraph, Table, Math).
- Q: Should math editing include a symbol palette or only raw LaTeX input? → A: Symbol palette — clickable palette of common math symbols/templates that insert LaTeX snippets.
- Q: Should fonts be self-hosted or loaded from Google Fonts CDN? → A: Self-hosted — bundle selected fonts with the application for reliability and GDPR compliance.

## Requirements *(mandatory)*

### Functional Requirements

**Text Formatting**

- **FR-001**: Users MUST be able to select a font family from a curated list of at least 8 fonts (including serif, sans-serif, and monospace options).
- **FR-002**: Users MUST be able to set font size from a predefined range (8pt to 72pt) via a dropdown or input field.
- **FR-003**: Users MUST be able to set text color using a color picker with preset academic colors and a custom color option.
- **FR-004**: Users MUST be able to set text alignment per paragraph (left, center, right, justified).
- **FR-005**: Users MUST be able to apply text highlight/background color using a color picker.
- **FR-006**: Users MUST be able to adjust line spacing (e.g., single, 1.15, 1.5, double, custom) per paragraph.
- **FR-007**: Users MUST be able to adjust paragraph spacing (space before and after paragraphs).
- **FR-008**: Users MUST be able to set paragraph indentation (first-line indent, left indent, right indent).
- **FR-009**: Users MUST be able to adjust letter spacing (tracking) on selected text.
- **FR-010**: Users MUST be able to apply superscript and subscript formatting to selected text.
- **FR-011**: All text formatting changes MUST sync in real time across collaborators via the existing CRDT system.
- **FR-012**: The toolbar MUST organize controls into logical collapsible groups (Text, Paragraph, Table, Math) so users can expand only the controls they need.
- **FR-013**: All text formatting MUST be preserved in PDF exports.

**Tables**

- **FR-014**: Users MUST be able to choose from at least 4 pre-designed table style presets when inserting or restyling a table.
- **FR-015**: Users MUST be able to merge selected adjacent cells (horizontal and vertical).
- **FR-016**: Users MUST be able to split previously merged cells back to their original configuration.
- **FR-017**: Users MUST be able to apply background colors to individual table cells.
- **FR-018**: Table style presets MUST render correctly in PDF exports.

**LaTeX Math**

- **FR-019**: Inline math expressions (`$...$`) MUST render as formatted math directly in the editor.
- **FR-020**: Block/display math expressions (`$$...$$`) MUST render as centered equations in the editor.
- **FR-021**: Users MUST be able to click on rendered math to edit the raw LaTeX source.
- **FR-022**: Invalid LaTeX expressions MUST show a visible error indicator without breaking the editor.
- **FR-023**: Math rendering in the editor MUST match the PDF export output.
- **FR-024**: The Math toolbar group MUST include a symbol palette with clickable categories (Greek letters, operators, fractions, integrals, matrices, arrows, accents) that insert the corresponding LaTeX snippet at the cursor position.

### Assumptions

- The curated font list will use self-hosted fonts bundled with the application for reliability and GDPR compliance. No external font CDN dependencies. Specific font selection will be determined during implementation.
- Table style presets will follow academic publishing conventions (APA-style tables, booktabs-style minimal tables, etc.).
- LaTeX rendering in the editor will use the same rendering engine already used for PDF export (KaTeX).
- Color picker presets will follow an academic/professional palette suitable for published documents.
- Font size units displayed to users will be in points (pt), consistent with word processor conventions.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Users can change font family, font size, text color, and alignment of selected text within 2 clicks from the toolbar.
- **SC-002**: All 4+ table style presets render correctly in both the editor and PDF export with no visual discrepancies.
- **SC-003**: Inline and block LaTeX expressions render in the editor within 500ms of the user moving their cursor away from the expression.
- **SC-004**: 100% of supported formatting options (font, size, color, alignment, highlight) persist correctly across page reloads and between collaborators.
- **SC-005**: Pasting rich text from external sources preserves at least font weight, font style, and text color without corrupting the document.
- **SC-006**: Users can apply a table style preset to an existing table in a single action.
- **SC-007**: Invalid LaTeX expressions display a clear error state rather than blank space or broken layout.
