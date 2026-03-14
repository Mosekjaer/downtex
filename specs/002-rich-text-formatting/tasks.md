# Tasks: Rich Text Formatting & Tables

**Input**: Design documents from `/specs/002-rich-text-formatting/`
**Prerequisites**: plan.md (required), spec.md (required for user stories), research.md, data-model.md

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Install dependencies and prepare shared assets

- [ ] T001 Install new Tiptap extension packages: `npm install @tiptap/extension-text-style @tiptap/extension-color @tiptap/extension-text-align @tiptap/extension-superscript @tiptap/extension-subscript @tiptap/extension-highlight`
- [ ] T002 [P] Download WOFF2 font files (Inter, Merriweather, Open Sans, Roboto, Playfair Display, Lora, JetBrains Mono, Fira Code) with regular/bold/italic weights into `public/fonts/` subdirectories
- [ ] T003 [P] Create `@font-face` declarations for all self-hosted fonts in `app/styles/fonts.css` and import it in `app/app.css`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure that MUST be complete before ANY user story can be implemented

**CRITICAL**: No user story work can begin until this phase is complete

- [ ] T004 Create reusable `ColorPicker.tsx` component in `app/components/editor/toolbar/ColorPicker.tsx` — a dropdown with preset academic colors (black, dark gray, blue, red, green, orange, purple) and a custom hex color input. Used by text color (US1), cell background (US2), and highlight (US4).
- [ ] T005 Restructure `app/components/editor/toolbar/Toolbar.tsx` into collapsible groups by modifying `app/components/editor/toolbar/ToolbarGroup.tsx` to support a `collapsible` prop with label and expand/collapse toggle. Organize existing toolbar buttons into four groups: Text, Paragraph, Insert, Math. Each group renders its label and has a chevron to collapse/expand. All groups default to expanded.

**Checkpoint**: Foundation ready — user story implementation can now begin

---

## Phase 3: User Story 1 — Text Formatting Controls (Priority: P1) MVP

**Goal**: Users can control font family, font size, text color, alignment, line/paragraph spacing, indentation, letter spacing, and superscript/subscript via the toolbar.

**Independent Test**: Open a document, select text, apply each formatting option — changes appear immediately and persist after reload.

### Implementation for User Story 1

**Tiptap extensions (can run in parallel):**

- [ ] T006 [P] [US1] Configure `TextStyle`, `FontFamily`, `FontSize`, `LineHeight` extensions from `@tiptap/extension-text-style` and `Color` from `@tiptap/extension-color` in the extensions array in `app/components/editor/Editor.tsx`. FontFamily should use the curated font list. FontSize should accept pt values.
- [ ] T007 [P] [US1] Configure `TextAlign` extension from `@tiptap/extension-text-align` in `app/components/editor/Editor.tsx` with `types: ['heading', 'paragraph']` and all four alignments (left, center, right, justify).
- [ ] T008 [P] [US1] Configure `Superscript` and `Subscript` extensions from `@tiptap/extension-superscript` and `@tiptap/extension-subscript` in `app/components/editor/Editor.tsx`.
- [ ] T009 [P] [US1] Create custom `ParagraphSpacing` extension in `app/components/editor/extensions/paragraph-spacing.ts` — extends Paragraph and Heading nodes with `marginTop` and `marginBottom` attributes (string|null, default null), rendered as inline `style` attributes. Include commands `setParagraphSpacing({ top, bottom })` and `unsetParagraphSpacing()`.
- [ ] T010 [P] [US1] Create custom `Indent` extension in `app/components/editor/extensions/indent.ts` — extends Paragraph and Heading nodes with `indent` attribute (number, default 0, range 0-8), rendered as `padding-left: {indent * 2}em` inline style. Include commands `increaseIndent()`, `decreaseIndent()`, and `unsetIndent()`.
- [ ] T011 [P] [US1] Create custom `LetterSpacing` extension in `app/components/editor/extensions/letter-spacing.ts` — extends TextStyle mark with `letterSpacing` attribute (string|null, default null), rendered as inline `letter-spacing` style. Include commands `setLetterSpacing(value)` and `unsetLetterSpacing()`.

**Toolbar components (can run in parallel, depend on T004/T005):**

- [ ] T012 [P] [US1] Create `FontFamilyPicker.tsx` in `app/components/editor/toolbar/FontFamilyPicker.tsx` — dropdown listing 8+ fonts grouped by category (Serif: Georgia, Merriweather, Playfair Display, Lora; Sans-serif: Inter, Open Sans, Roboto; Monospace: JetBrains Mono, Fira Code). Each option previewed in its own font. Calls `editor.chain().focus().setFontFamily(font).run()`. Shows current font family from editor state.
- [ ] T013 [P] [US1] Create `FontSizePicker.tsx` in `app/components/editor/toolbar/FontSizePicker.tsx` — dropdown with preset sizes (8, 9, 10, 11, 12, 14, 16, 18, 20, 24, 28, 32, 36, 48, 72) plus a custom input field. Values displayed in pt. Calls `editor.chain().focus().setFontSize(size + 'pt').run()`. Shows current size from editor state.
- [ ] T014 [P] [US1] Create `AlignmentControls.tsx` in `app/components/editor/toolbar/AlignmentControls.tsx` — four ToolbarButton components for left/center/right/justify alignment using icons. Active state reflects current paragraph alignment. Calls `editor.chain().focus().setTextAlign(align).run()`.
- [ ] T015 [P] [US1] Create `SpacingControls.tsx` in `app/components/editor/toolbar/SpacingControls.tsx` — a dropdown panel with: (a) line spacing presets (Single/1.0, 1.15, 1.5, Double/2.0, custom input), (b) paragraph spacing before/after inputs in px, (c) indentation increase/decrease buttons, (d) letter spacing input in px. Each control calls the corresponding editor command.

**Wire up toolbar (depends on T006–T015):**

- [ ] T016 [US1] Integrate all US1 toolbar components into the restructured `app/components/editor/toolbar/Toolbar.tsx` — add FontFamilyPicker, FontSizePicker, text color ColorPicker, superscript/subscript ToolbarButtons to the Text group; add AlignmentControls and SpacingControls to the Paragraph group. Add text color button using ColorPicker with `editor.chain().focus().setColor(color).run()`.

**Checkpoint**: Text formatting is fully functional — font family, size, color, alignment, spacing, indentation, letter spacing, superscript, subscript all work and sync via CRDT

---

## Phase 4: User Story 2 — Enhanced Table Designs (Priority: P2)

**Goal**: Users can apply table style presets, merge/split cells, and set cell background colors.

**Independent Test**: Insert a table, apply each of the 4+ style presets, merge/split cells, set cell backgrounds — all render correctly in editor.

### Implementation for User Story 2

- [ ] T017 [P] [US2] Create custom `TableStyle` extension in `app/components/editor/extensions/table-style.ts` — extends Table node with `tableStyle` attribute (string, default "default"). Renders as CSS class `table-style-{value}` on the `<table>` element. Available values: "default", "academic", "striped", "bordered", "modern".
- [ ] T018 [P] [US2] Create custom `TableCellBackground` extension in `app/components/editor/extensions/table-cell-bg.ts` — extends TableCell and TableHeader nodes with `backgroundColor` attribute (string|null, default null), rendered as inline `background-color` style. Include command `setCellBackground(color)` and `unsetCellBackground()`.
- [ ] T019 [P] [US2] Add CSS styles for the 5 table style presets in `app/app.css`: (a) `.table-style-default` — current styling; (b) `.table-style-academic` — booktabs-style with thick top/bottom borders, thin internal rules, no vertical borders; (c) `.table-style-striped` — alternating row backgrounds using `nth-child(even)`; (d) `.table-style-bordered` — full grid borders on all cells; (e) `.table-style-modern` — colored header row with accent background, clean body with subtle dividers.
- [ ] T020 [US2] Create `TableStylePicker.tsx` in `app/components/editor/toolbar/TableStylePicker.tsx` — a dropdown shown when cursor is inside a table, displaying visual previews (small CSS-styled mini-tables) for each preset. Clicking a preset calls `editor.chain().focus().updateAttributes('table', { tableStyle: preset }).run()`. Also include merge/split cell buttons calling `editor.chain().focus().mergeOrSplit().run()` and a cell background color button using the shared `ColorPicker` component with `setCellBackground(color)`.
- [ ] T021 [US2] Register `TableStyle` and `TableCellBackground` extensions in `app/components/editor/Editor.tsx` and add `TableStylePicker` to the Table/Insert group in `app/components/editor/toolbar/Toolbar.tsx` (shown conditionally when cursor is inside a table).

**Checkpoint**: Tables support 5 style presets, cell merge/split, and cell background colors

---

## Phase 5: User Story 3 — Live LaTeX Math Rendering (Priority: P3)

**Goal**: Inline and block LaTeX math renders live in the editor using KaTeX, with click-to-edit and a symbol palette.

**Independent Test**: Type `$x^2$` inline and `$$\int_0^1 x dx$$` as block — both render as formatted math in the editor. Click to edit. Invalid LaTeX shows error state.

### Implementation for User Story 3

- [ ] T022 [P] [US3] Create `MathInlineView.tsx` React NodeView component in `app/components/editor/node-views/MathInlineView.tsx` — renders KaTeX inline via `katex.renderToString(latex, { displayMode: false, throwOnError: false })`. States: (a) rendered — shows KaTeX HTML output, (b) editing — shows an inline `<input>` with the raw LaTeX, activated on click, saved on Enter/blur, (c) error — shows red-bordered span with raw LaTeX and error icon when KaTeX throws. Import KaTeX CSS.
- [ ] T023 [P] [US3] Create `MathBlockView.tsx` React NodeView component in `app/components/editor/node-views/MathBlockView.tsx` — renders KaTeX centered via `katex.renderToString(latex, { displayMode: true, throwOnError: false })`. States: (a) rendered — shows centered KaTeX display equation, (b) editing — shows a `<textarea>` overlay for multi-line LaTeX input, activated on click, saved on Ctrl+Enter/blur, (c) error — shows error indicator with raw LaTeX, (d) empty — shows placeholder "Enter LaTeX equation...". Import KaTeX CSS.
- [ ] T024 [US3] Update `app/components/editor/extensions/math-inline.ts` to register the `MathInlineView` React NodeView via `addNodeView()` using `ReactNodeViewRenderer`. Keep existing `parseHTML`, `renderHTML`, `addInputRules`, and `addAttributes` intact.
- [ ] T025 [US3] Update `app/components/editor/extensions/math-block.ts` to register the `MathBlockView` React NodeView via `addNodeView()` using `ReactNodeViewRenderer`. Keep existing `parseHTML`, `renderHTML`, `addInputRules`, and `addAttributes` intact.
- [ ] T026 [P] [US3] Add KaTeX CSS styles to `app/app.css` for the editor: import `katex/dist/katex.min.css` (or inline critical styles), style `.math-inline` and `.math-block` containers, style the editing state (input/textarea), style the error state (red border, error icon).
- [ ] T027 [US3] Create `MathSymbolPalette.tsx` in `app/components/editor/toolbar/MathSymbolPalette.tsx` — a tabbed dropdown panel with categories: Greek letters (α β γ δ ε → `\alpha \beta \gamma \delta \epsilon`), Operators (± × ÷ ≤ ≥ ≠ ≈ → `\pm \times \div \leq \geq \neq \approx`), Fractions/Roots (`\frac{}{} \sqrt{} \sqrt[n]{}`), Integrals/Sums (`\int \sum \prod \lim`), Matrices (`\begin{pmatrix}...\end{pmatrix}`), Arrows (← → ↔ ⇒ → `\leftarrow \rightarrow \leftrightarrow \Rightarrow`), Accents (`\hat{} \bar{} \vec{} \dot{} \tilde{}`). Each symbol click inserts the LaTeX command into the current math node or creates a new inline math node.
- [ ] T028 [US3] Add `MathSymbolPalette` to the Math group in `app/components/editor/toolbar/Toolbar.tsx`, alongside buttons for inserting inline math (`$...$`) and block math (`$$...$$`).

**Checkpoint**: Math renders live in the editor with click-to-edit, error states, and symbol palette

---

## Phase 6: User Story 4 — Highlight and Background Color (Priority: P4)

**Goal**: Users can highlight text with background colors for emphasis and review annotations.

**Independent Test**: Select text, apply a highlight color from the picker — text background changes. Remove highlight — returns to normal.

### Implementation for User Story 4

- [ ] T029 [P] [US4] Configure `Highlight` extension from `@tiptap/extension-highlight` with `multicolor: true` in `app/components/editor/Editor.tsx`.
- [ ] T030 [US4] Add highlight button to the Text group in `app/components/editor/toolbar/Toolbar.tsx` — uses the shared `ColorPicker` component with a highlight icon. Calls `editor.chain().focus().toggleHighlight({ color }).run()`. Include a "Remove highlight" option that calls `editor.chain().focus().unsetHighlight().run()`.

**Checkpoint**: Text highlighting with custom colors works and syncs via CRDT

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: PDF export, paste handling, accessibility, and final integration

- [ ] T031 Update `app/lib/pdf-template.server.ts` to render all new marks and attributes in HTML output: TextStyle attributes (fontFamily, fontSize, color, letterSpacing, lineHeight) as inline styles on `<span>`, Superscript as `<sup>`, Subscript as `<sub>`, Highlight as `<mark>` with background-color, TextAlign as `style="text-align: ..."` on `<p>` and `<h*>`, ParagraphSpacing as margin styles, Indent as padding-left, table `tableStyle` attribute as CSS class, TableCell `backgroundColor` as inline style. Ensure self-hosted font `@font-face` declarations are included in the PDF HTML template.
- [ ] T032 [P] Add paste handling rules to `app/components/editor/Editor.tsx` — configure `editorProps.transformPastedHTML` to preserve supported formatting (font weight, font style, text color, font size) and strip unsupported attributes when pasting from external sources (Word, Google Docs).
- [ ] T033 [P] Add ARIA labels and keyboard accessibility to all new toolbar components: `FontFamilyPicker`, `FontSizePicker`, `ColorPicker`, `AlignmentControls`, `SpacingControls`, `TableStylePicker`, `MathSymbolPalette`. Ensure all dropdowns are navigable with arrow keys and Escape closes them. Collapsible toolbar groups toggle with Enter/Space.
- [ ] T034 Run `make check` (typecheck + lint) and fix any TypeScript or ESLint errors across all modified and new files.
- [ ] T035 Manually verify all formatting options persist across page reload and between two collaborator sessions using `make dev` with two browser windows.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — can start immediately
- **Foundational (Phase 2)**: Depends on T001 completion (packages installed) — BLOCKS all user stories
- **User Stories (Phase 3–6)**: All depend on Foundational phase completion
  - User stories can proceed in parallel (if staffed) or sequentially in priority order
- **Polish (Phase 7)**: Depends on all user stories being complete

### User Story Dependencies

- **User Story 1 (P1)**: Can start after Foundational (Phase 2) — No dependencies on other stories
- **User Story 2 (P2)**: Can start after Foundational (Phase 2) — No dependencies on US1
- **User Story 3 (P3)**: Can start after Foundational (Phase 2) — No dependencies on US1/US2
- **User Story 4 (P4)**: Can start after Foundational (Phase 2) — No dependencies on other stories

### Within Each User Story

- Extensions before toolbar components
- Toolbar components before toolbar integration
- Core implementation before integration wiring

### Parallel Opportunities

- T002, T003 can run in parallel (fonts vs font CSS)
- T004, T005 can run in parallel (ColorPicker vs toolbar restructure)
- T006–T011 can all run in parallel (independent extension files)
- T012–T015 can all run in parallel (independent toolbar component files)
- T017–T019 can all run in parallel (independent table extension + CSS files)
- T022, T023, T026 can all run in parallel (independent math NodeView + CSS files)
- All user stories can run in parallel after Phase 2

---

## Parallel Example: User Story 1

```bash
# Launch all extensions for US1 together:
Task: "Configure TextStyle/FontFamily/FontSize/LineHeight/Color in Editor.tsx"  # T006
Task: "Configure TextAlign in Editor.tsx"                                       # T007
Task: "Configure Superscript/Subscript in Editor.tsx"                           # T008
Task: "Create ParagraphSpacing extension"                                       # T009
Task: "Create Indent extension"                                                 # T010
Task: "Create LetterSpacing extension"                                          # T011

# Then launch all toolbar components together:
Task: "Create FontFamilyPicker.tsx"                                             # T012
Task: "Create FontSizePicker.tsx"                                               # T013
Task: "Create AlignmentControls.tsx"                                            # T014
Task: "Create SpacingControls.tsx"                                              # T015
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup (install deps, download fonts)
2. Complete Phase 2: Foundational (ColorPicker, toolbar restructure)
3. Complete Phase 3: User Story 1 (text formatting controls)
4. **STOP and VALIDATE**: Test all formatting options independently
5. Deploy/demo if ready

### Incremental Delivery

1. Complete Setup + Foundational → Foundation ready
2. Add User Story 1 → Test independently → Deploy/Demo (MVP!)
3. Add User Story 2 → Test table presets independently → Deploy/Demo
4. Add User Story 3 → Test math rendering independently → Deploy/Demo
5. Add User Story 4 → Test highlighting independently → Deploy/Demo
6. Complete Polish phase → Final integration testing

### Parallel Team Strategy

With multiple developers:

1. Team completes Setup + Foundational together
2. Once Foundational is done:
   - Developer A: User Story 1 (text formatting)
   - Developer B: User Story 2 (tables)
   - Developer C: User Story 3 (math rendering)
   - Developer D: User Story 4 (highlight)
3. All developers contribute to Polish phase

---

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps task to specific user story for traceability
- Each user story is independently completable and testable
- Inline styles in editor content are justified (Constitution VII exception — see plan.md Complexity Tracking)
- No new database migrations needed — all data stored in Yjs CRDT document
- Self-hosted fonts ensure GDPR compliance — no external CDN requests
- Commit after each task or logical group
- Stop at any checkpoint to validate story independently
